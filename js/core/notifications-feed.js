(function (global) {
  'use strict';
  const categories = [
    ['calendario','Eventos del calendario'], ['recordatorios','Recordatorios de eventos'],
    ['peticiones','Peticiones de almacén y coordinadores'], ['cotizaciones','Cotizaciones'],
    ['siif','Requisiciones, compras y trámites SIIF'], ['tickets','Tickets y acuerdos'],
    ['taller','Taller y parque vehicular'], ['inventario','Inventario y vales'],
    ['personal','Personal, tiempo extra y trámites administrativos'],
    ['cuenta','Cambios en mi cuenta'], ['otros','Otros avisos']
  ];
  const preferenceKey = user => 'etNotificationPreferences:v1:' + user.id;
  function normalizePreferences(value) {
    return {enabled:value?.enabled !== false, popups:value?.popups !== false,
      categories:Object.fromEntries(categories.map(([key])=>[key,value?.categories?.[key] !== false]))};
  }
  function preferences(user) {
    try { return normalizePreferences(JSON.parse(localStorage.getItem(preferenceKey(user)) || '{}')); }
    catch (_) { return normalizePreferences({}); }
  }
  function savePreferences(user, value) {
    if (!user?.id) throw new Error('Inicia sesión para guardar tus preferencias.');
    const result = normalizePreferences(value);
    localStorage.setItem(preferenceKey(user), JSON.stringify(result));
    if (typeof global.dispatchEvent === 'function') global.dispatchEvent(new Event('et-notification-preferences-changed'));
    return result;
  }
  function category(item) {
    const type = String(item.tipo || '').toLowerCase();
    if (type === 'calendario_recordatorio') return 'recordatorios';
    if (/calendario/.test(type)) return 'calendario';
    if (/cotizaci/.test(type)) return 'cotizaciones';
    if (/peticion/.test(type)) return 'peticiones';
    if (/siif|requisici|ordenes_compra|solicitudes_pago/.test(type)) return 'siif';
    if (/acuerdo|ticket/.test(type)) return 'tickets';
    if (/taller|parque|vehiculo/.test(type)) return 'taller';
    if (/inventario|vale/.test(type)) return 'inventario';
    if (/empleado|tiempo_extra|tramites_administrativos/.test(type)) return 'personal';
    if (/usuarios|cuenta/.test(type)) return 'cuenta';
    return 'otros';
  }
  function allows(item, settings) { return settings.enabled && settings.categories[category(item)] !== false; }
  function create(client, user) {
    const key = 'etNotificationsSeen:v1:' + user.id;
    let seen;
    try { seen = new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (_) { seen = new Set(); }
    async function load() {
      const rows = [], ids = new Set();
      // Include every unread notice, even when many newer notices were read.
      for (let offset = 0; ; offset += 500) {
        const result = await client.from('notificaciones')
          .select('id,tipo,titulo,mensaje,leida,enlace,created_at')
          .eq('usuario_id', user.id).order('leida', {ascending:true})
          .order('created_at', {ascending:false}).order('id', {ascending:false})
          .range(offset, offset + 499);
        if (result.error) throw result.error;
        for (const item of result.data || []) {
          if (!ids.has(item.id)) { ids.add(item.id); rows.push(item); }
        }
        if ((result.data || []).length < 500) break;
      }
      const fresh = rows.filter(item => !item.leida && !seen.has(item.id));
      seen = ids;
      try { localStorage.setItem(key, JSON.stringify([...seen])); } catch (_) {}
      return {items:rows, fresh};
    }
    return {load};
  }
  global.ETNotificationsFeed = {create,categories,preferences,savePreferences,category,allows};
})(typeof window !== 'undefined' ? window : globalThis);
