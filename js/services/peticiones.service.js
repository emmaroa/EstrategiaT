/**
 * Servicio CRUD — Peticiones a Almacén
 */
(function (global) {
  function getClient() {
    return global.supabaseClient || null;
  }

  async function listar() {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexión" } };

    return client
      .from("peticiones")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
  }

  async function crear(payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    return client
      .from("peticiones")
      .insert(payload)
      .select()
      .single();
  }

  async function actualizar(id, payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    return client
      .from("peticiones")
      .update(Object.assign({}, payload, { updated_at: new Date().toISOString() }))
      .eq("id", id)
      .select()
      .single();
  }

  async function eliminar(id) {
    const client = getClient();
    if (!client) return { error: { message: "Sin conexión" } };

    return client.from("peticiones").delete().eq("id", id);
  }

  async function buscarUnidadParque(valorUnidad) {
    const client = getClient();
    if (!client || !valorUnidad) return null;

    const limpio = String(valorUnidad || "").trim();
    const digitos = limpio.replace(/\D/g, "");
    const sufijo = (digitos || limpio).slice(-4);
    const { data, error } = await client.from("parque_vehicular").select("*");

    if (error || !data) return null;

    return data.find(function (u) {
      const inventario = String(u.numero_inventario || "");
      const patrulla = String(u.unidad_patrulla || "");
      return inventario.endsWith(sufijo) || patrulla.endsWith(sufijo);
    }) || null;
  }

  async function migrarDesdeLocalStorage() {
    if (localStorage.getItem("migracion_peticiones_v3")) return { migrados: 0 };

    const local = JSON.parse(localStorage.getItem("peticiones")) || [];
    if (!local.length) {
      localStorage.setItem("migracion_peticiones_v3", "true");
      return { migrados: 0 };
    }

    const client = getClient();
    if (!client) return { migrados: 0, error: "Sin conexión" };

    const registros = local.map(function (p) {
      return {
        fecha: p.fecha || new Date().toISOString().slice(0, 10),
        unidad: p.unidad,
        peticion: p.peticion,
        solicitante: p.solicitante,
        area: p.area,
        dependencia: p.dependencia || null,
        proveedor: p.proveedor || null,
        estatus: p.estatus || "Pendiente",
        observaciones: p.observaciones || null
      };
    });

    const { error } = await client.from("peticiones").insert(registros);
    if (error) return { migrados: 0, error: error.message };

    localStorage.removeItem("peticiones");
    localStorage.setItem("migracion_peticiones_v3", "true");
    return { migrados: registros.length };
  }

  global.ETPeticiones = {
    listar,
    crear,
    actualizar,
    eliminar,
    buscarUnidadParque,
    migrarDesdeLocalStorage
  };
})(window);
