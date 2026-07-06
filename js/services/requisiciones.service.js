/**
 * Servicio CRUD — Requisiciones
 */
(function (global) {
  function getClient() {
    return global.supabaseClient || null;
  }

  function normalizar(row) {
    if (!row) return row;
    return Object.assign({}, row, {
      solicitudPago: row.solicitud_pago || row.solicitudPago || ""
    });
  }

  async function listar() {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexión" } };

    const result = await client
      .from("requisiciones")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (result.data) {
      result.data = result.data.map(normalizar);
    }
    return result;
  }

  async function crear(payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    const registro = {
      fecha: payload.fecha,
      numero: payload.numero || await generarNumero(),
      unidad: payload.unidad,
      dependencia: payload.dependencia,
      concepto: payload.concepto,
      proveedor: payload.proveedor || null,
      monto: Number(payload.monto || 0),
      estatus: payload.estatus || "Por autorizar",
      oc: payload.oc || null,
      factura: payload.factura || null,
      solicitud_pago: payload.solicitud_pago || payload.solicitudPago || null,
      observaciones: payload.observaciones || null,
      peticion_id: payload.peticion_id || null
    };

    const result = await client.from("requisiciones").insert(registro).select().single();
    if (result.data) result.data = normalizar(result.data);
    return result;
  }

  async function actualizar(id, payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    const registro = Object.assign({}, payload, {
      updated_at: new Date().toISOString()
    });

    if (payload.solicitudPago !== undefined) {
      registro.solicitud_pago = payload.solicitudPago;
      delete registro.solicitudPago;
    }

    const result = await client
      .from("requisiciones")
      .update(registro)
      .eq("id", id)
      .select()
      .single();

    if (result.data) result.data = normalizar(result.data);
    return result;
  }

  async function eliminar(id) {
    const client = getClient();
    if (!client) return { error: { message: "Sin conexión" } };

    return client.from("requisiciones").delete().eq("id", id);
  }

  async function generarNumero() {
    const client = getClient();
    const anio = new Date().getFullYear();
    const prefijo = "REQ-" + anio + "-";

    if (!client) return prefijo + "001";

    const { data } = await client
      .from("requisiciones")
      .select("numero")
      .like("numero", prefijo + "%");

    let max = 0;
    (data || []).forEach(function (r) {
      const parte = parseInt((r.numero || "").replace(prefijo, ""), 10);
      if (!isNaN(parte) && parte > max) max = parte;
    });

    return prefijo + String(max + 1).padStart(3, "0");
  }

  async function buscarUnidadParque(valorUnidad) {
    const client = getClient();
    if (!client || !valorUnidad) return null;

    const { data, error } = await client
      .from("parque_vehicular")
      .select("*")
      .or("unidad_patrulla.ilike.%" + valorUnidad + "%,numero_inventario.ilike.%" + valorUnidad + "%")
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async function obtenerPrefillDesdePeticion(peticionId) {
    const client = getClient();
    if (!client || !peticionId) return null;

    const { data } = await client
      .from("peticiones")
      .select("*")
      .eq("id", peticionId)
      .maybeSingle();

    if (!data) return null;

    return {
      peticion_id: data.id,
      unidad: data.unidad,
      concepto: data.peticion,
      dependencia: data.dependencia || data.area,
      proveedor: data.proveedor,
      observaciones: "Generada desde petición de " + data.solicitante
    };
  }

  async function migrarDesdeLocalStorage() {
    if (localStorage.getItem("migracion_requisiciones_v3")) return { migrados: 0 };

    const local = JSON.parse(localStorage.getItem("requisiciones")) || [];
    if (!local.length) {
      localStorage.setItem("migracion_requisiciones_v3", "true");
      return { migrados: 0 };
    }

    const client = getClient();
    if (!client) return { migrados: 0, error: "Sin conexión" };

    const registros = local.map(function (r) {
      return {
        fecha: r.fecha || new Date().toISOString().slice(0, 10),
        numero: r.numero,
        unidad: r.unidad,
        dependencia: r.dependencia,
        concepto: r.concepto,
        proveedor: r.proveedor || null,
        monto: Number(r.monto || 0),
        estatus: r.estatus || "Por autorizar",
        oc: r.oc || null,
        factura: r.factura || null,
        solicitud_pago: r.solicitud_pago || r.solicitudPago || null,
        observaciones: r.observaciones || null
      };
    });

    const { error } = await client.from("requisiciones").insert(registros);
    if (error) return { migrados: 0, error: error.message };

    localStorage.removeItem("requisiciones");
    localStorage.removeItem("datosParaRequisicion");
    localStorage.setItem("migracion_requisiciones_v3", "true");
    return { migrados: registros.length };
  }

  global.ETRequisiciones = {
    listar,
    crear,
    actualizar,
    eliminar,
    generarNumero,
    buscarUnidadParque,
    obtenerPrefillDesdePeticion,
    migrarDesdeLocalStorage,
    normalizar
  };
})(window);
