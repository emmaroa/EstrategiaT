(function (global) {
  'use strict';
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
  global.ETNotificationsFeed = {create};
})(typeof window !== 'undefined' ? window : globalThis);
