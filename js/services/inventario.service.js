(function (global) {
  const db = global.supabaseClient;
  const state = { items: [], locations: [] };

  function usuario() {
    try { return JSON.parse(localStorage.getItem("usuarioActivo") || "null"); } catch (_) { return null; }
  }

  function puedeEditar() {
    const activo = usuario();
    return Boolean(activo && Number(activo.sesion_expira_en) > Date.now() &&
      global.ETPermissions && global.ETPermissions.puedeEditarModulo(activo, 'Inventario'));
  }

  function sinPermiso() { return { error: new Error('Tu acceso a Inventario es de solo vista o tu sesión expiró.') }; }

  async function cargar() {
    if (!db) return { error: new Error("Supabase no está disponible") };
    const [items, locations] = await Promise.all([
      db.from("inventario").select("*, categoria:categorias_inventario(nombre), ubicacion_ref:ubicaciones_inventario(id,codigo,nombre,pasillo,estante,nivel)").order("nombre"),
      db.from("ubicaciones_inventario").select("*").eq("activo", true).order("codigo")
    ]);
    if (items.error) return { error: items.error };
    if (locations.error) return { error: locations.error };
    state.items = items.data || [];
    state.locations = locations.data || [];
    return { data: state.items, locations: state.locations, error: null };
  }

  async function guardarItem(payload) {
    if (!puedeEditar()) return sinPermiso();
    const data = {
      codigo: payload.codigo.trim(),
      codigo_barras: payload.codigo_barras.trim() || null,
      codigo_qr: payload.codigo_qr.trim() || payload.codigo.trim(),
      tipo_codigo: payload.tipo_codigo || "CODE128",
      nombre: payload.nombre.trim(),
      categoria_id: payload.categoria_id || null,
      unidad_medida: payload.unidad_medida || "PZA",
      stock_minimo: Number(payload.stock_minimo || 0),
      stock_maximo: Number(payload.stock_maximo || 0),
      costo_unitario: Number(payload.costo_unitario || 0),
      ubicacion: payload.ubicacion || null,
      ubicacion_id: payload.ubicacion_id || null,
      activo: payload.activo !== false
    };
    const query = payload.id
      ? db.from("inventario").update(data).eq("id", payload.id).select().single()
      : db.from("inventario").insert(data).select().single();
    return query;
  }

  async function guardarUbicacion(payload) {
    if (!puedeEditar()) return sinPermiso();
    return db.from("ubicaciones_inventario").insert({
      codigo: payload.codigo.trim().toUpperCase(),
      nombre: payload.nombre.trim(),
      pasillo: payload.pasillo.trim() || null,
      estante: payload.estante.trim() || null,
      nivel: payload.nivel.trim() || null
    }).select().single();
  }

  async function registrarMovimiento(payload) {
    if (!puedeEditar()) return sinPermiso();
    return db.rpc("registrar_movimiento_inventario", {
      p_inventario_id: payload.inventario_id,
      p_tipo: payload.tipo,
      p_cantidad: Number(payload.cantidad),
      p_referencia: payload.referencia || null,
      p_notas: payload.notas || null,
      p_usuario_id: usuario()?.id || null
    });
  }

  async function kardex(inventarioId) {
    return db.from("inventario_movimientos").select("*, inventario:inventario(codigo,nombre)").eq("inventario_id", inventarioId).order("created_at", { ascending: false });
  }

  global.ETInventario = { state, cargar, guardarItem, guardarUbicacion, registrarMovimiento, kardex, puedeEditar };
})(window);
