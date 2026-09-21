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

  function puedeCrearUbicacion() {
    const rol = String(usuario()?.rol || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
    return puedeEditar() && ['admin', 'superadmin', 'jefe de almacen'].includes(rol);
  }

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
    if (!puedeCrearUbicacion()) return { error: new Error('Solo Admin, SuperAdmin y Jefe de Almacén con permiso de edición pueden crear ubicaciones.') };
    const codigo = String(payload.codigo || '').trim();
    const nombre = String(payload.nombre || '').trim();
    if (!codigo || !nombre || codigo.length > 40 || nombre.length > 120) {
      return { error: new Error('Captura el número (máximo 40 caracteres) y la descripción (máximo 120 caracteres) de la ubicación.') };
    }
    return db.from("ubicaciones_inventario").insert({
      codigo: codigo.toUpperCase(),
      nombre,
      pasillo: null,
      estante: null,
      nivel: null
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

  global.ETInventario = { state, cargar, guardarItem, guardarUbicacion, registrarMovimiento, kardex, puedeEditar, puedeCrearUbicacion };
})(window);
