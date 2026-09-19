(function (global) {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const titularSoftware = 'Brote Labs';
  const contactoRenovacion = 'https://wa.me/526629379505?text=Hola%2C%20quiero%20renovar%20la%20licencia%20de%20Administracion%20de%20Talleres.';
  const estilos = document.createElement('link');
  estilos.rel = 'stylesheet'; estilos.href = new URL('../../css/licencia.css', base).href;
  document.head.appendChild(estilos);
  const backupListo = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../services/licencia-backup.js', base).href;
    script.onload = resolve; script.onerror = () => reject(new Error('No se pudo cargar el exportador. Recarga la página.'));
    document.head.appendChild(script);
  });
  backupListo.catch(() => {});

  function usuarioRespaldo() {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
      return usuario && usuario.id && Number(usuario.sesion_expira_en) > Date.now() &&
        global.ETPermissions && global.ETPermissions.puedeDescargarRespaldo(usuario) ? usuario : null;
    } catch (_) { return null; }
  }

  function iniciar() {
    if (!document.querySelector('main') || document.getElementById('etLicencia')) return;
    const panel = document.createElement('section');
    panel.id = 'etLicencia'; panel.className = 'et-licencia';
    panel.setAttribute('aria-label', 'Licencia de uso');
    panel.innerHTML = '<div class="et-licencia-datos"><strong>Licencia de uso</strong>' +
      '<span data-licencia-cliente></span>' +
      '<span data-licencia-estado role="status">Consultando vigencia…</span>' +
      '<span data-licencia-fecha></span></div><div class="et-licencia-acciones">' +
      '<button type="button" data-licencia-renovar>Renovar licencia / Renew license</button>' +
      '<button type="button" data-licencia-respaldo hidden>Respaldo completo / Full backup</button>' +
      '<button type="button" data-licencia-actualizar aria-label="Actualizar estado de licencia">Actualizar</button></div>' +
      '<p data-licencia-copyright></p>';
    document.querySelector('main').appendChild(panel);
    const estado = panel.querySelector('[data-licencia-estado]');
    const fecha = panel.querySelector('[data-licencia-fecha]');
    const cliente = panel.querySelector('[data-licencia-cliente]');
    const copyright = panel.querySelector('[data-licencia-copyright]');
    const actualizar = panel.querySelector('[data-licencia-actualizar]');
    let licencia = null;
    function avisoPropiedad(titular) {
      const propietario = titular || titularSoftware;
      copyright.textContent = 'Copyright © ' + new Date().getFullYear() + ' ' + propietario +
        '. Todos los derechos reservados. Este software es propiedad de ' + propietario +
        '. Queda prohibido su uso, reproducción o distribución sin autorización expresa de ' + propietario + '.';
    }
    avisoPropiedad('');
    async function consultar() {
      if (actualizar.disabled) return;
      actualizar.disabled = true;
      try {
        if (!global.supabaseClient) throw new Error('Sin conexión');
        const { data, error } = await global.supabaseClient.rpc('estado_licencia');
        if (error || !data) throw error || new Error('Sin configuración');
        licencia = data;
        cliente.textContent = data.cliente ? 'Cliente: ' + data.cliente : 'Cliente pendiente de configurar';
        panel.dataset.estado = data.vencida ? 'vencida' : 'vigente';
        estado.textContent = data.valida_hasta
          ? (data.vencida ? 'Licencia vencida · 0 días restantes. Puedes seguir operando. El respaldo está disponible para SuperAdmin, Director y Admin.' : data.dias_restantes + ' días restantes / days remaining')
          : 'Vigencia pendiente de configurar';
        fecha.textContent = data.valida_hasta
          ? 'Válida hasta / Valid until: ' + new Date(data.valida_hasta).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
          : 'Válida hasta / Valid until: sin fecha asignada';
        avisoPropiedad(data.titular);
      } catch (_) {
        licencia = null;
        panel.dataset.estado = 'error';
        estado.textContent = 'No se pudo verificar la licencia. Puedes seguir operando. Reintenta con Actualizar.';
        fecha.textContent = '';
        cliente.textContent = '';
        avisoPropiedad('');
      } finally { actualizar.disabled = false; }
    }
    actualizar.onclick = consultar;
    panel.querySelector('[data-licencia-renovar]').onclick = () => {
      const destino = (licencia && licencia.renovacion_url) || contactoRenovacion;
      if (!destino || !/^(https:\/\/|mailto:)/i.test(destino)) {
        global.alert('El contacto de renovación está pendiente de configurar. Contacta al titular del software.');
        return;
      }
      const enlace = document.createElement('a');
      enlace.href = destino; enlace.target = '_blank'; enlace.rel = 'noopener noreferrer';
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
    };

    const dialogo = document.createElement('dialog');
    dialogo.className = 'et-licencia-dialogo';
    dialogo.innerHTML = '<form><h2>Respaldo completo</h2><p>Descarga un ZIP con un CSV por tabla de datos, incluso si la licencia venció. No incluye archivos adjuntos, contraseñas ni secretos de acceso.</p>' +
      '<label>Clave de respaldo<input type="password" name="clave" minlength="32" required autocomplete="off"></label>' +
      '<label>Confirma tu contraseña de usuario<input type="password" name="password" required autocomplete="current-password"></label>' +
      '<p role="status" data-respaldo-estado></p><div><button type="submit">Descargar ZIP</button> ' +
      '<button type="button" data-respaldo-cerrar>Cerrar</button></div></form>';
    document.body.appendChild(dialogo);
    const form = dialogo.querySelector('form');
    const clave = form.elements.clave;
    const password = form.elements.password;
    const mensaje = dialogo.querySelector('[data-respaldo-estado]');
    const descargar = dialogo.querySelector('[type="submit"]');
    let descargando = false;
    const botonRespaldo = panel.querySelector('[data-licencia-respaldo]');
    function actualizarAccesoRespaldo() {
      botonRespaldo.hidden = !usuarioRespaldo();
      if (botonRespaldo.hidden) { dialogo.close(); clave.value = ''; password.value = ''; }
    }
    actualizarAccesoRespaldo();
    global.addEventListener('storage', actualizarAccesoRespaldo);
    document.addEventListener('visibilitychange', actualizarAccesoRespaldo);
    setInterval(actualizarAccesoRespaldo, 1000);
    botonRespaldo.onclick = () => {
      actualizarAccesoRespaldo();
      if (!usuarioRespaldo()) return;
      mensaje.textContent = ''; dialogo.showModal(); clave.focus();
    };
    dialogo.querySelector('[data-respaldo-cerrar]').onclick = () => dialogo.close();
    dialogo.addEventListener('close', () => { clave.value = ''; password.value = ''; });
    form.onsubmit = async event => {
      event.preventDefault();
      if (descargando) return;
      if (global.Capacitor && global.Capacitor.isNativePlatform()) {
        mensaje.textContent = 'Abre el sistema en tu navegador para descargar el ZIP.';
        return;
      }
      descargando = true; descargar.disabled = true;
      mensaje.textContent = 'Preparando todas las tablas. Mantén esta página abierta…';
      try {
        await backupListo;
        const usuario = usuarioRespaldo();
        if (!usuario) throw new Error('El respaldo está permitido solo para SuperAdmin, Director y Admin con sesión vigente.');
        const peticion = global.supabaseClient.rpc('respaldo_tablas', {
          p_clave: clave.value, p_usuario_id: usuario.id, p_password: password.value
        });
        clave.value = ''; password.value = '';
        const { data, error } = await peticion;
        if (error) throw new Error(error.code === '42501' ? 'Acceso denegado. Verifica tu rol, contraseña y clave de respaldo.' : 'El servidor no pudo completar el respaldo. Reintenta o contacta al administrador.');
        if (!usuarioRespaldo() || usuarioRespaldo().id !== usuario.id) throw new Error('La sesión cambió. Inicia nuevamente el respaldo.');
        const blob = global.ETLicenseBackup.zip(data);
        const url = URL.createObjectURL(blob), enlace = document.createElement('a');
        enlace.href = url; enlace.download = 'respaldo-tablas-' + new Date().toISOString().replace(/[:.]/g, '-') + '.zip';
        document.body.appendChild(enlace); enlace.click(); enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        mensaje.textContent = 'ZIP generado: ' + data.length + ' tablas, ' + data.reduce((total, tabla) => total + tabla.filas.length, 0) + ' registros. Descarga iniciada.';
      } catch (error) {
        clave.value = ''; password.value = ''; mensaje.textContent = error.message || 'No se completó el respaldo. No se descargó un ZIP parcial.';
      } finally { descargando = false; descargar.disabled = false; }
    };
    consultar();
    setInterval(() => { if (!document.hidden) consultar(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) consultar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window);
