(function (global) {
  'use strict';
  if (!global.validarPermiso('Licencias')) return;
  function usuarioActual() {
    try { return JSON.parse(localStorage.getItem('usuarioActivo') || 'null'); } catch (_) { return null; }
  }
  if (!global.ETLicencias.esPropietario(usuarioActual())) return;
  global.ETLayout.inicializar('Licencias');
  const api = global.ETLicencias.crear(global.supabaseClient, usuarioActual);
  const el = id => document.getElementById(id);
  const dialogo = el('dialogoLicencia');
  const form = el('formLicencia');
  let registros = [], editando = null, guardando = false, cargando = false;
  function estado(mensaje) { el('estadoLicencias').textContent = mensaje; }
  function bloquear(mensaje) {
    api.bloquear(); registros = []; editando = null;
    dialogo.close(); form.reset(); el('claveAdministracion').value = '';
    el('contenidoLicencias').hidden = true; el('bloquearLicencias').hidden = true;
    el('accesoLicencias').hidden = false; el('tablaLicencias').replaceChildren();
    estado(mensaje || 'El módulo está bloqueado.');
  }
  function manejarError(error) {
    if (error.code === '42501' || !api.vigente()) bloquear(error.message);
    else estado(error.message);
  }
  function fecha(valor) {
    if (!valor) return 'Pendiente';
    const partes = valor.split('-');
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }
  function renderizar() {
    el('licenciasTotal').textContent = registros.length;
    el('licenciasVigentes').textContent = registros.filter(x => x.estado === 'Vigente').length;
    el('licenciasVencidas').textContent = registros.filter(x => x.estado === 'Vencida').length;
    el('licenciasPorVencer').textContent = registros.filter(x => x.estado === 'Vigente' && x.dias_restantes <= 30).length;
    const busqueda = el('buscarLicencia').value.trim().toLocaleLowerCase('es');
    const filtro = el('filtroLicencia').value;
    const visibles = registros.filter(x => (!filtro || x.estado === filtro) &&
      (x.cliente + ' ' + x.codigo).toLocaleLowerCase('es').includes(busqueda));
    const cuerpo = el('tablaLicencias'); cuerpo.replaceChildren();
    if (!visibles.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 7; td.textContent = registros.length ? 'No hay licencias que coincidan con los filtros.' : 'Aún no hay licencias registradas.';
      tr.appendChild(td); cuerpo.appendChild(tr); return;
    }
    visibles.forEach(registro => {
      const tr = document.createElement('tr');
      [registro.codigo, registro.cliente, fecha(registro.inicia_el),
        fecha(global.ETLicencias.fechaVencimiento(registro.valida_hasta)),
        registro.dias_restantes == null ? 'Sin fecha' : registro.dias_restantes,
        registro.estado].forEach(valor => {
        const td = document.createElement('td'); td.textContent = valor; tr.appendChild(td);
      });
      if (registro.es_actual) {
        const marca = document.createElement('small'); marca.className = 'licencias-actual';
        marca.textContent = 'Instalación actual'; tr.children[1].appendChild(marca);
      }
      const acciones = document.createElement('td'), grupo = document.createElement('div');
      grupo.className = 'licencias-acciones';
      ['Editar', 'Renovar'].forEach(texto => {
        const boton = document.createElement('button'); boton.type = 'button'; boton.className = 'btn-secondary';
        boton.textContent = texto; boton.setAttribute('aria-label', texto + ' licencia de ' + registro.cliente);
        boton.onclick = () => abrir(registro, texto === 'Renovar'); grupo.appendChild(boton);
      });
      acciones.appendChild(grupo); tr.appendChild(acciones); cuerpo.appendChild(tr);
    });
  }
  function abrir(registro, renovar) {
    if (!api.vigente()) { bloquear('El acceso expiró. Introduce nuevamente tu clave privada.'); return; }
    editando = registro || null; form.reset(); el('errorLicencia').textContent = '';
    el('tituloLicencia').textContent = renovar ? 'Renovar licencia' : registro ? 'Editar licencia' : 'Nueva licencia';
    el('guardarLicencia').textContent = renovar ? 'Guardar renovación' : 'Guardar licencia';
    el('codigoLicencia').value = registro ? registro.codigo : '';
    el('clienteLicencia').value = registro ? registro.cliente : '';
    el('inicioLicencia').value = registro ? registro.inicia_el || '' : '';
    el('finLicencia').value = registro ? global.ETLicencias.fechaVencimiento(registro.valida_hasta) : '';
    el('notasLicencia').value = registro ? registro.notas : '';
    el('finLicencia').min = registro && registro.inicia_el ? registro.inicia_el : '';
    // Una renovación siempre debe establecer una fecha posterior a la anterior.
    el('finLicencia').required = Boolean(renovar);
    form.dataset.renovar = renovar ? 'true' : 'false';
    dialogo.showModal(); (renovar ? el('finLicencia') : el('codigoLicencia')).focus();
  }
  async function actualizar() {
    if (cargando) return;
    cargando = true; el('actualizarLicencias').disabled = true;
    try {
      const datos = await api.listar();
      if (!api.vigente()) { bloquear(); return; }
      registros = datos; renderizar(); estado('Licencias actualizadas.');
    } catch (error) { manejarError(error); }
    finally { cargando = false; el('actualizarLicencias').disabled = false; }
  }
  el('formAccesoLicencias').onsubmit = async event => {
    event.preventDefault();
    const boton = event.submitter || el('formAccesoLicencias').querySelector('button');
    if (boton.disabled) return;
    boton.disabled = true; estado('Verificando acceso…');
    const clave = el('claveAdministracion').value;
    el('claveAdministracion').value = '';
    try {
      registros = await api.desbloquear(clave);
      el('accesoLicencias').hidden = true; el('contenidoLicencias').hidden = false;
      el('bloquearLicencias').hidden = false; renderizar(); estado('Acceso privado habilitado por 15 minutos.');
    } catch (error) {
      bloquear(error.code === '42501' ? 'Acceso denegado. Verifica que esta sea tu cuenta propietaria y que la clave sea correcta.' : error.message);
    } finally { boton.disabled = false; }
  };
  form.onsubmit = async event => {
    event.preventDefault(); if (guardando) return;
    const datos = {
      id: editando && editando.id, revision: editando && editando.revision,
      codigo: el('codigoLicencia').value, cliente: el('clienteLicencia').value,
      inicia_el: el('inicioLicencia').value, vence_el: el('finLicencia').value, notas: el('notasLicencia').value
    };
    const anterior = editando && global.ETLicencias.fechaVencimiento(editando.valida_hasta);
    if (form.dataset.renovar === 'true' && anterior && datos.vence_el <= anterior) {
      el('errorLicencia').textContent = 'Elige una fecha posterior al vencimiento anterior.'; return;
    }
    guardando = true; el('guardarLicencia').disabled = true; el('cancelarLicencia').disabled = true;
    el('errorLicencia').textContent = '';
    try {
      await api.guardar(datos);
      dialogo.close(); estado('Licencia guardada.');
      const aviso = document.querySelector('[data-licencia-actualizar]');
      if (aviso) aviso.click();
      try { registros = await api.listar(); renderizar(); estado('Licencia guardada y listado actualizado.'); }
      catch (error) { manejarError(error); if (api.vigente()) estado('La licencia se guardó, pero no se pudo actualizar el listado. Pulsa Actualizar.'); }
    } catch (error) {
      if (error.code === '42501' || !api.vigente()) manejarError(error);
      else el('errorLicencia').textContent = error.message;
    } finally { guardando = false; el('guardarLicencia').disabled = false; el('cancelarLicencia').disabled = false; }
  };
  dialogo.addEventListener('cancel', event => { if (guardando) event.preventDefault(); });
  el('cancelarLicencia').onclick = () => dialogo.close();
  el('inicioLicencia').onchange = () => { el('finLicencia').min = el('inicioLicencia').value; };
  el('nuevaLicencia').onclick = () => abrir(null, false);
  el('actualizarLicencias').onclick = actualizar;
  el('buscarLicencia').oninput = renderizar;
  el('filtroLicencia').onchange = renderizar;
  el('bloquearLicencias').onclick = () => bloquear();
  function comprobar() {
    if (!el('contenidoLicencias').hidden && !api.vigente()) bloquear('El acceso expiró. Introduce nuevamente tu clave privada.');
  }
  setInterval(comprobar, 1000);
  document.addEventListener('visibilitychange', comprobar);
  global.addEventListener('storage', comprobar);
  global.addEventListener('pagehide', () => bloquear());
})(window);
