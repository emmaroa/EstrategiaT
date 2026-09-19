(function (global) {
  'use strict';
  async function cargar(client, usuarioId, progreso) {
    const registros = [], vistos = new Set();
    let cursor = null;
    while (true) {
      let consulta = client.from('auditoria')
        .select('id,usuario_id,usuario_nombre,usuario_rol,modulo,accion,detalle,entidad_tipo,entidad_id,metadata,created_at')
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(500);
      if (usuarioId) consulta = consulta.eq('usuario_id', usuarioId);
      if (cursor) consulta = consulta.or('created_at.lt.' + cursor.created_at +
        ',and(created_at.eq.' + cursor.created_at + ',id.lt.' + cursor.id + ')');
      const { data, error } = await consulta;
      if (error) throw new Error('No se pudo consultar el historial central. Verifica la conexión y vuelve a actualizar.');
      if (!Array.isArray(data)) throw new Error('El servidor no devolvió un historial válido.');
      if (!data.length) break;
      for (const registro of data) {
        if (!vistos.has(registro.id)) { registros.push(registro); vistos.add(registro.id); }
      }
      const siguiente = data[data.length - 1];
      if (!siguiente.created_at || !siguiente.id || (cursor && siguiente.id === cursor.id)) {
        throw new Error('No se pudo avanzar en el historial. Actualiza para reintentar.');
      }
      cursor = siguiente;
      if (progreso) progreso(registros.length);
      // Consultar hasta recibir una página vacía; el servidor puede limitar el lote
      // a menos de 500 registros según su configuración.
    }
    return registros;
  }
  global.ETAuditoria = { cargar };
})(window);
