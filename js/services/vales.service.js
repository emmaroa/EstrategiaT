(function (global) {
  async function listar(client = global.supabaseClient) {
    const registros = [];
    let ultimoId = null;
    try {
      if (!client) throw new Error('Supabase no está disponible.');
      while (true) {
        let consulta = client.from('vales').select('*').order('id', { ascending: true }).limit(500);
        if (ultimoId !== null) consulta = consulta.gt('id', ultimoId);
        const { data, error } = await consulta;
        if (error) return { data: null, error };
        if (!data?.length) break;
        const siguienteId = data[data.length - 1].id;
        if (!siguienteId || siguienteId === ultimoId) throw new Error('No se pudo avanzar en la consulta de vales.');
        registros.push(...data);
        ultimoId = siguienteId;
      }
      registros.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)));
      return { data: registros, error: null, count: registros.length };
    } catch (error) {
      return { data: null, error };
    }
  }
  global.ETVales = { listar };
})(window);
