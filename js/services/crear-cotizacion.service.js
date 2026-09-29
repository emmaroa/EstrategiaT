(function (global) {
  'use strict';
  let password = '', expires = 0;
  function user() {
    const u = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
    if (!u || Number(u.sesion_expira_en) <= Date.now()) throw Error('La sesión expiró. Inicia sesión de nuevo.');
    return u;
  }
  async function rpc(name, extra = {}) {
    if (!password || Date.now() > expires) { password = ''; throw Error('Confirma tu contraseña en Conectar guardado.'); }
    const { data, error } = await global.supabaseClient.rpc(name, { p_usuario: user().id, p_password: password, ...extra });
    if (error) {
      if (error.code === '42501') password = '';
      if (error.code === '23505') throw Error('Ya existe ese UUID, archivo o folio. Recupera la cotización guardada o usa un folio diferente.');
      if (['PGRST202', '42883'].includes(error.code)) throw Error('El guardado requiere instalar la migración 056_crear_cotizacion_xml.sql en Supabase.');
      throw Error(error.message || 'No fue posible guardar en Supabase.');
    }
    return data;
  }
  global.ETCrearCotizacionAPI = {
    async connect(value) { password = value; expires = Date.now() + 15 * 60000; try { return await rpc('listar_cotizaciones_xml'); } catch (e) { password = ''; throw e; } },
    list: offset => rpc('listar_cotizaciones_xml', { p_offset: offset || 0 }),
    save: data => rpc('guardar_cotizacion_xml', { p_datos: data }),
    lock() { password = ''; expires = 0; }
  };
  global.addEventListener('pagehide', () => global.ETCrearCotizacionAPI.lock());
})(window);
