/**
 * Servicio CRUD - Tramites Administrativos
 */
(function (global) {
  function getClient() {
    return global.supabaseClient || null;
  }

  function texto(valor) {
    return String(valor == null ? "" : valor).trim();
  }

  function fechaISO(date) {
    return date.toISOString().slice(0, 10);
  }

  function obtenerAnio(fecha) {
    if (!fecha) return new Date().getFullYear();
    return new Date(fecha + "T00:00:00").getFullYear();
  }

  async function buscarEmpleado(numEmpleado) {
    const client = getClient();
    if (!client || !numEmpleado) return { data: null, error: { message: "Sin conexion" } };

    return client
      .from("empleados")
      .select("*")
      .eq("num_empleado", texto(numEmpleado))
      .maybeSingle();
  }

  async function listarEmpleados() {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexion" } };

    return client
      .from("empleados")
      .select("*")
      .order("nombre_completo", { ascending: true });
  }

  async function listarTramites() {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexion" } };

    return client
      .from("tramites_administrativos")
      .select("*")
      .order("fecha_inicio", { ascending: false });
  }

  async function crearTramite(payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexion" } };

    return client
      .from("tramites_administrativos")
      .insert(payload)
      .select()
      .single();
  }

  async function actualizarTramite(id, payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexion" } };

    return client
      .from("tramites_administrativos")
      .update(Object.assign({}, payload, { updated_at: new Date().toISOString() }))
      .eq("id", id)
      .select()
      .single();
  }

  async function eliminarTramite(id) {
    const client = getClient();
    if (!client) return { error: { message: "Sin conexion" } };

    return client
      .from("tramites_administrativos")
      .delete()
      .eq("id", id);
  }

  async function listarFeriados() {
    const client = getClient();
    if (!client) return { data: [], error: { message: "Sin conexion" } };

    return client
      .from("feriados_administrativos")
      .select("*")
      .order("fecha", { ascending: true });
  }

  async function crearFeriado(payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexion" } };

    return client
      .from("feriados_administrativos")
      .insert(payload)
      .select()
      .single();
  }

  async function eliminarFeriado(id) {
    const client = getClient();
    if (!client) return { error: { message: "Sin conexion" } };

    return client
      .from("feriados_administrativos")
      .delete()
      .eq("id", id);
  }

  function calcularDiasHabiles(inicio, fin, feriados) {
    if (!inicio || !fin) return 0;

    const start = new Date(inicio + "T00:00:00");
    const end = new Date(fin + "T00:00:00");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

    const feriadosActivos = new Set((feriados || [])
      .filter(function (f) { return f.activo !== false; })
      .map(function (f) { return String(f.fecha || "").slice(0, 10); }));

    let total = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const dia = cursor.getDay();
      const iso = fechaISO(cursor);
      if (dia !== 0 && dia !== 6 && !feriadosActivos.has(iso)) total += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return total;
  }

  function obtenerSaldoDiasEconomicos(tramites, numEmpleado, anio) {
    const usados = (tramites || []).reduce(function (total, tramite) {
      if (tramite.tipo_tramite !== "Dias economicos") return total;
      if (String(tramite.num_empleado || "") !== String(numEmpleado || "")) return total;
      if (Number(tramite.periodo_anio || 0) !== Number(anio || 0)) return total;
      return total + Number(tramite.dias_habiles || 0);
    }, 0);

    return {
      autorizados: 10,
      usados,
      disponibles: Math.max(0, 10 - usados)
    };
  }

  global.ETTramitesAdministrativos = {
    buscarEmpleado,
    listarEmpleados,
    listarTramites,
    crearTramite,
    actualizarTramite,
    eliminarTramite,
    listarFeriados,
    crearFeriado,
    eliminarFeriado,
    calcularDiasHabiles,
    obtenerSaldoDiasEconomicos,
    obtenerAnio
  };
})(window);
