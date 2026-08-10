/**
 * Servicio de cotizaciones de artículos entregados al almacén.
 */
(function (global) {
  function getClient() {
    return global.supabaseClient || null;
  }

  function sinConexion() {
    return { data: null, error: { message: "Sin conexión" } };
  }

  async function listar() {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexión" } };

    return client
      .from("cotizaciones_almacen")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async function listarPorProveedor(proveedor) {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexión" } };

    return client
      .from("cotizaciones_almacen")
      .select("*")
      .eq("proveedor", String(proveedor || "").trim())
      .order("created_at", { ascending: false });
  }

  async function listarPorPeticiones(ids) {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexión" } };
    const peticiones = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!peticiones.length) return { data: [], error: null };

    return client
      .from("cotizaciones_almacen")
      .select("id,peticion_id,estatus,origen")
      .in("peticion_id", peticiones);
  }

  async function crear(payload) {
    const client = getClient();
    if (!client) return sinConexion();

    return client
      .from("cotizaciones_almacen")
      .insert(payload)
      .select()
      .single();
  }

  async function actualizar(id, payload, proveedor) {
    const client = getClient();
    if (!client) return sinConexion();

    return client
      .from("cotizaciones_almacen")
      .update(payload)
      .eq("id", id)
      .eq("proveedor", String(proveedor || "").trim())
      .select()
      .single();
  }

  async function crearDesdePeticion(peticion) {
    const unidadParque = await buscarUnidadParque(peticion.unidad);
    return crear({
      peticion_id: peticion.id,
      proveedor: String(peticion.proveedor || "").trim(),
      fecha_entrega: new Date().toISOString().slice(0, 10),
      unidad: String(peticion.unidad || "").trim(),
      unidad_id: unidadParque?.id || null,
      numero_serie: unidadParque?.serie || unidadParque?.vin || null,
      dependencia: unidadParque?.dependencia || peticion.dependencia || null,
      materiales: [{
        cantidad: 1,
        item: String(peticion.peticion || "").trim(),
        precio_unitario: 0
      }],
      observaciones: "Generada desde la petición de " + String(peticion.solicitante || "").trim(),
      origen: "Desde petición",
      estatus: "Pendiente de revisión"
    });
  }

  function normalizarClaveUnidad(valor) {
    return String(valor || "")
      .trim()
      .toLocaleLowerCase("es")
      .replace(/[^a-z0-9]/g, "");
  }

  async function buscarUnidadesParque(valor) {
    const client = getClient();
    const buscado = String(valor || "").trim();
    if (!client || !buscado || /^(0|stock)$/i.test(buscado)) return [];

    const { data, error } = await client
      .from("parque_vehicular")
      .select("id,numero_economico,numero_inventario,unidad_patrulla,serie,vin,dependencia,descripcion");

    if (error) return [];
    const clave = normalizarClaveUnidad(buscado);
    if (!clave) return [];

    const coincidenciasExactas = (data || []).filter(function (unidad) {
      return [unidad.numero_economico, unidad.numero_inventario, unidad.unidad_patrulla]
        .some(function (campo) { return normalizarClaveUnidad(campo) === clave; });
    });
    if (coincidenciasExactas.length) return coincidenciasExactas;

    // Dos o más caracteres permiten buscar por los últimos dígitos sin
    // convertir una sola tecla en una consulta ambigua de toda la flotilla.
    if (clave.length < 2) return [];
    return (data || []).filter(function (unidad) {
      return [unidad.numero_economico, unidad.numero_inventario, unidad.unidad_patrulla]
        .some(function (campo) { return normalizarClaveUnidad(campo).endsWith(clave); });
    });
  }

  async function buscarUnidadParque(valor) {
    const coincidencias = await buscarUnidadesParque(valor);
    return coincidencias.length === 1 ? coincidencias[0] : null;
  }

  async function actualizarDatosInternos(id, payload) {
    const client = getClient();
    if (!client) return sinConexion();

    return client
      .from("cotizaciones_almacen")
      .update({
        partida: payload.partida || null,
        requisicion: payload.requisicion || null,
        estatus: payload.requisicion
          ? "Requisición generada"
          : (payload.estatus === "Requisición generada" ? "Validada" : payload.estatus)
      })
      .eq("id", id)
      .select()
      .single();
  }

  async function actualizarInterna(id, payload) {
    const client = getClient();
    if (!client) return sinConexion();

    return client
      .from("cotizaciones_almacen")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  }

  global.ETCotizacionesAlmacen = {
    listar,
    listarPorProveedor,
    listarPorPeticiones,
    crear,
    actualizar,
    crearDesdePeticion,
    buscarUnidadesParque,
    buscarUnidadParque,
    actualizarDatosInternos,
    actualizarInterna
  };
})(window);
