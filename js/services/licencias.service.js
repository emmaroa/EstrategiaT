(function (global) {
  'use strict';
  const DURACION = 15 * 60 * 1000;
  function esSuperAdmin(usuario) {
    return Boolean(usuario && usuario.id && String(usuario.rol || '').toLowerCase().replace(/[ _-]/g, '') === 'superadmin');
  }
  function esPropietario(usuario) {
    return esSuperAdmin(usuario) && String(usuario.usuario || '').trim().toLowerCase() === 'emma';
  }
  function fechaVencimiento(valor) {
    if (!valor) return '';
    // La vigencia termina en un instante exclusivo; mostrar el último día incluido.
    const fecha = new Date(new Date(valor).getTime() - 1);
    if (!Number.isFinite(fecha.getTime())) return '';
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Hermosillo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(fecha);
    const dato = tipo => partes.find(parte => parte.type === tipo).value;
    return dato('year') + '-' + dato('month') + '-' + dato('day');
  }
  function validar(datos) {
    const salida = {
      codigo: String(datos.codigo || '').trim().toUpperCase(),
      cliente: String(datos.cliente || '').trim(),
      inicia_el: datos.inicia_el || null,
      vence_el: datos.vence_el || null,
      notas: String(datos.notas || '').trim()
    };
    const fechaValida = valor => !valor || (/^\d{4}-\d{2}-\d{2}$/.test(valor) &&
      Number.isFinite(Date.parse(valor)) && new Date(valor).toISOString().slice(0, 10) === valor);
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(salida.codigo)) throw new Error('Usa un código de 3 a 40 letras, números, guiones o guiones bajos.');
    if (!salida.cliente || salida.cliente.length > 200) throw new Error('El nombre del cliente es obligatorio y admite hasta 200 caracteres.');
    if (!fechaValida(salida.inicia_el) || !fechaValida(salida.vence_el) ||
      (salida.inicia_el && salida.vence_el && salida.vence_el < salida.inicia_el)) throw new Error('Revisa las fechas: el vencimiento no puede ser anterior al inicio.');
    if (salida.notas.length > 2000) throw new Error('Las notas admiten hasta 2,000 caracteres.');
    return salida;
  }
  function crear(db, obtenerUsuario, reloj) {
    const ahora = reloj || Date.now;
    let clave = '', propietario = null, expira = 0, generacion = 0;
    function bloquear() { clave = ''; propietario = null; expira = 0; generacion++; }
    function vigente() {
      const usuario = obtenerUsuario();
      return Boolean(clave && propietario && ahora() < expira && esPropietario(usuario) &&
        usuario.id === propietario && Number(usuario.sesion_expira_en) > ahora());
    }
    function denegado() { const error = new Error('Desbloquea el módulo con tu clave privada.'); error.code = '42501'; return error; }
    async function peticion(nombre, argumentos) {
      const turno = generacion;
      const resultado = await db.rpc(nombre, argumentos);
      if (turno !== generacion) throw denegado();
      if (resultado.error) {
        if (resultado.error.code === '42501') { bloquear(); throw denegado(); }
        if (resultado.error.code === '23505') throw new Error('Ese código de licencia ya existe.');
        if (resultado.error.code === '40001') throw new Error('Otra sesión modificó la licencia. Actualiza la lista y vuelve a abrirla.');
        if (resultado.error.code === 'PGRST202') throw new Error('El módulo no está habilitado en el servidor. Aplica la migración 050.');
        throw new Error('No se pudo completar la operación. Verifica la conexión y actualiza la lista antes de reintentar.');
      }
      return resultado.data;
    }
    async function desbloquear(valor) {
      bloquear();
      const usuario = obtenerUsuario();
      if (!esPropietario(usuario) || Number(usuario.sesion_expira_en) <= ahora() ||
        !Number.isFinite(Number(usuario.sesion_expira_en))) throw denegado();
      if (typeof valor !== 'string' || valor.length < 32 || valor.length > 256) throw new Error('Introduce tu clave privada de administración (32 a 256 caracteres).');
      const datos = await peticion('admin_listar_licencias', { p_usuario_id: usuario.id, p_clave: valor });
      const actual = obtenerUsuario();
      if (!esPropietario(actual) || actual.id !== usuario.id || !Number.isFinite(Number(actual.sesion_expira_en)) || Number(actual.sesion_expira_en) <= ahora()) throw denegado();
      clave = valor; propietario = usuario.id; expira = Math.min(ahora() + DURACION, Number(actual.sesion_expira_en));
      return datos;
    }
    function credenciales() {
      if (!vigente()) { bloquear(); throw denegado(); }
      return { p_usuario_id: propietario, p_clave: clave };
    }
    function listar() { return peticion('admin_listar_licencias', credenciales()); }
    function guardar(licencia) {
      const datos = validar(licencia);
      return peticion('admin_guardar_licencia', Object.assign(credenciales(), {
        p_id: licencia.id || null, p_revision: licencia.revision || null,
        p_codigo: datos.codigo, p_cliente: datos.cliente, p_inicia_el: datos.inicia_el,
        p_vence_el: datos.vence_el, p_notas: datos.notas
      }));
    }
    return { desbloquear, bloquear, vigente, listar, guardar };
  }
  global.ETLicencias = { crear, esSuperAdmin, esPropietario, fechaVencimiento, validar };
})(window);
