(function (global) {
  'use strict';
  const api=global.ETFlujoSiif, seleccion=new Set();
  let conectado=false, ocupado=false, destino=[], lote=[];
  const $=id=>document.getElementById(id);
  const texto=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
  function puedeEditar() {
    const u=JSON.parse(localStorage.getItem('usuarioActivo')||'null');
    return global.ETPermissions.puedeEditarModulo(u,'Seguimiento SIIF') &&
      !(typeof global.esSoloLectura==='function' && global.esSoloLectura());
  }
  function aviso(message) { $('flujoEstado').textContent=message; }
  function estado(fila) {return api.estado(fila);}
  function esperaProveedor() {
    const espera=[3,6].includes(Number($('flujoEtapa').value));
    $('flujoProveedor').required=espera;
    if(espera)$('flujoLugar').value='Compras';
  }
  function opcion(select,value,label) {select.add(new Option(label,value));}
  function limpiar() { seleccion.clear(); actualizarSeleccion(); }
  function actualizarSeleccion() {
    $('flujoSeleccion').textContent=seleccion.size+' seleccionados';
    $('flujoMover').disabled=!conectado || ocupado || !puedeEditar() || !seleccion.size;
    $('flujoTodos').disabled=!conectado || ocupado || !puedeEditar();
    document.querySelectorAll('[data-flujo-check]').forEach(c=>{c.checked=seleccion.has(c.dataset.flujoCheck);});
  }
  async function cargar() {

    try {
      const datos=await api.cargar(seguimientoSiif.map(r=>r.id)),map=new Map(datos.map(r=>[r.requisicion_id,r]));
      seguimientoSiif.forEach(r=>{r.flujo=map.get(r.id);}); conectado=true;
      aviso('Seguimiento actualizado. Selecciona trámites para registrar un movimiento.');
    } catch(e) {
      conectado=false; seguimientoSiif.forEach(r=>{delete r.flujo;}); limpiar();
      aviso(e.message); throw e;
    }
  }
  function coincide(fila) {
    if(!conectado)return true;
    const f=estado(fila);
    return (!$('flujoFiltroLugar').value || f.ubicacion===$('flujoFiltroLugar').value) &&
      (!$('flujoFiltroEtapa').value || String(f.etapa)===$('flujoFiltroEtapa').value) &&
      normalizarSiif(f.responsable).includes(normalizarSiif($('flujoFiltroPersona').value).trim());
  }
  function seleccionCelda(fila) {
    const esc=escaparSiif;
    const check=conectado&&puedeEditar()?'<input type="checkbox" data-flujo-check="'+esc(fila.id)+'" aria-label="Seleccionar requisición '+esc(fila.numero_req)+'"'+(seleccion.has(fila.id)?' checked':'')+'>':'';
    return '<td>'+check+'</td>';
  }
  function celdas(fila) {
    const f=estado(fila),esc=escaparSiif;
    return '<td>'+esc(conectado?api.etapas[f.etapa].nombre:'No consultado')+(conectado&&f.proveedor_espera?'<small class="flujo-espera">En espera de '+esc(f.proveedor_espera)+'</small>':'')+'</td><td>'+esc(conectado?f.ubicacion:'—')+'</td><td>'+esc(conectado?(f.responsable||'Sin asignar'):'—')+'</td><td>'+esc(conectado?(api.dias(f.desde)??'—'):'—')+'</td>';
  }
  function render() {
    const lista=obtenerFiltradosSiif();
    ['Compras','Administrativo','Almacén','Enviado'].forEach((l,i)=>{
      $('flujoCantidad'+i).textContent=conectado?lista.filter(r=>estado(r).ubicacion===l).length:'—';
    });
    $('flujoSinRegistro').textContent=conectado?lista.filter(r=>!estado(r).etapa).length+' trámites filtrados sin seguimiento registrado.':'No se pudo cargar el seguimiento para consultar ubicación y responsable.';
    actualizarSeleccion();
  }
  function abrir(ids) {
    if(!conectado||ocupado||!puedeEditar())return;
    destino=seguimientoSiif.filter(r=>ids.includes(r.id));
    if(!destino.length||destino.length>500){aviso('Selecciona entre 1 y 500 trámites.');return;}
    lote=destino.map(r=>({id:r.id,revision:estado(r).revision}));
    $('flujoFormulario').reset();
    $('flujoLoteTitulo').textContent='Mover '+destino.length+' trámite'+(destino.length===1?'':'s');
    $('flujoLoteLista').textContent=destino.map(r=>'REQ '+r.numero_req).join(', ');
    $('flujoError').textContent='';
    if(destino.length===1) {
      const f=estado(destino[0]);
      $('flujoEtapa').value=f.etapa||1;
      $('flujoLugar').value=f.etapa?f.ubicacion:'Compras';
      $('flujoPersona').value=f.responsable;
      $('flujoAcuse').value=f.acuse;
      $('flujoProveedor').value=f.proveedor_espera||destino[0].proveedor||'';
    }
    esperaProveedor();$('flujoDialogo').showModal();
  }
  async function guardar(event) {
    event.preventDefault();
    if(ocupado||!puedeEditar()||!$('flujoFormulario').reportValidity())return;
    const etapa=Number($('flujoEtapa').value),lugar=$('flujoLugar').value;
    if((etapa===10)!==(lugar==='Enviado')){$('flujoError').textContent='Usa Enviado con la etapa de acuse y envío a Oficialía Mayor.';return;}
    ocupado=true; $('flujoGuardar').disabled=true; $('flujoCancelar').disabled=true;
    let guardado=false;
    try {
      const cantidad=await api.mover(lote,{
        p_etapa:etapa,p_ubicacion:lugar,p_responsable:$('flujoPersona').value.trim(),
        p_nota:$('flujoNota').value.trim(),p_acuse:$('flujoAcuse').value.trim(),p_proveedor:$('flujoProveedor').value.trim()
      });
      guardado=true; $('flujoDialogo').close(); limpiar();
      await cargar(); renderizarSeguimientoSiif();
      aviso(cantidad+' trámites actualizados. El movimiento quedó en su historial.');
    } catch(e) {
      if(guardado)aviso('El movimiento se guardó, pero no se pudo recargar: '+e.message);
      else $('flujoError').textContent=e.message+' Si hubo una interrupción de red, cancela y actualiza antes de reintentar.';
    } finally {ocupado=false;$('flujoGuardar').disabled=false;$('flujoCancelar').disabled=false;actualizarSeleccion();}
  }
  async function detalle(fila,contenedor) {
    const section=document.createElement('section');section.className='flujo-detalle';
    section.append(texto('h3','Ubicación y recorrido del trámite'));contenedor.prepend(section);
    if(!conectado){section.append(texto('p','No se pudo cargar el seguimiento para consultar el recorrido.'));return;}
    const f=estado(fila),paso=api.etapas[f.etapa];
    section.append(texto('p',paso.nombre+' · '+f.ubicacion+' · '+(f.responsable||'Sin responsable asignado')));
    section.append(texto('p','Área a cargo de la etapa: '+(paso.ejecuta||paso.area)+(paso.espera?' · En espera del proveedor':'')+(f.desde?' · Desde '+new Date(f.desde).toLocaleString('es-MX'):'')));
    if(f.acuse)section.append(texto('p','Acuse: '+f.acuse));
    if(f.proveedor_espera)section.append(texto('p','En espera de: '+f.proveedor_espera));
    if(f.nota)section.append(texto('p',f.nota));
    if(puedeEditar()) {
      const editar=texto('button','Registrar movimiento');editar.type='button';editar.className='btn-small';
      editar.addEventListener('click',()=>{cerrarDetalleSiif();abrir([fila.id]);});section.append(editar);
    }
    const lista=document.createElement('ol');lista.className='flujo-historial';section.append(lista);
    const mas=texto('button','Cargar historial');mas.type='button';mas.className='btn-secondary';section.append(mas);
    let antes=null;
    async function cargarHistorial() {
      mas.disabled=true;
      try {
        const rows=await api.historial(fila.id,antes);
        if(!rows.length&&!antes)lista.append(texto('li','Todavía no hay movimientos registrados.'));
        rows.forEach(h=>{
          const li=document.createElement('li'),a=h.antes,d=h.despues;
          li.append(texto('strong',api.etapas[a.etapa].nombre+' → '+api.etapas[d.etapa].nombre));
          li.append(texto('p',a.ubicacion+' / '+(a.responsable||'Sin asignar')+' → '+d.ubicacion+' / '+d.responsable));
          li.append(texto('small',new Date(h.fecha).toLocaleString('es-MX')+' · Registró: '+h.usuario_nombre));
          if(d.nota)li.append(texto('p',d.nota));
          if(d.acuse)li.append(texto('p','Acuse: '+d.acuse));
          if(d.proveedor_espera)li.append(texto('p','En espera de: '+d.proveedor_espera));
          lista.append(li);
        });
        if(rows.length)antes=rows[rows.length-1].id;
        mas.hidden=rows.length<100;mas.textContent='Ver movimientos anteriores';
      } catch(e) {mas.textContent='Reintentar historial';section.append(texto('p',e.message));}
      finally {mas.disabled=false;}
    }
    mas.addEventListener('click',cargarHistorial);await cargarHistorial();
  }
  function init() {
    api.etapas.forEach((p,i)=>{opcion($('flujoFiltroEtapa'),i,p.nombre);if(i)opcion($('flujoEtapa'),i,i+'. '+p.nombre);});
    ['Compras','Administrativo','Almacén','Enviado'].forEach(l=>{opcion($('flujoFiltroLugar'),l,l);opcion($('flujoLugar'),l,l);});
    opcion($('flujoFiltroLugar'),'Sin registrar','Sin registrar');
    $('flujoActualizar').addEventListener('click',async()=>{limpiar();try{await cargar();}catch(_){}renderizarSeguimientoSiif();});
    ['flujoFiltroLugar','flujoFiltroEtapa','flujoFiltroPersona'].forEach(id=>$(id).addEventListener(id==='flujoFiltroPersona'?'input':'change',()=>{limpiar();paginaSiif=1;renderizarSeguimientoSiif();}));
    $('tablaSeguimientoSiif').addEventListener('change',e=>{
      const id=e.target.dataset.flujoCheck;if(!id)return;
      if(e.target.checked&&seleccion.size>=500){e.target.checked=false;aviso('Máximo 500 trámites por movimiento.');return;}
      e.target.checked?seleccion.add(id):seleccion.delete(id);actualizarSeleccion();
    });
    $('tablaSeguimientoSiif').addEventListener('click',e=>{
      if(e.target.closest('button,input,a'))return;
      const id=e.target.closest('tr')?.dataset.tramite;if(id)verDetalleSiif(id);
    });
    $('flujoTodos').addEventListener('click',()=>{
      const filas=obtenerFiltradosSiif();if(filas.length>500){aviso('Hay '+filas.length+' resultados. Reduce los filtros a 500 o menos para seleccionarlos todos.');return;}
      filas.forEach(r=>seleccion.add(r.id));actualizarSeleccion();
    });
    $('flujoLimpiar').addEventListener('click',limpiar);
    $('flujoMover').addEventListener('click',()=>abrir([...seleccion]));
    $('flujoEtapa').addEventListener('change',()=>{$('flujoLugar').value=api.etapas[Number($('flujoEtapa').value)]?.area||'';esperaProveedor();});
    $('flujoFormulario').addEventListener('submit',guardar);
    $('flujoCancelar').addEventListener('click',()=>{if(!ocupado)$('flujoDialogo').close();});
    $('flujoDialogo').addEventListener('cancel',e=>{if(ocupado)e.preventDefault();});
  }
  global.ETFlujoVista={init,cargar,coincide,seleccionCelda,celdas,render,limpiar,detalle,
    exportar(fila) {const f=estado(fila);return conectado?[api.etapas[f.etapa].nombre,f.ubicacion,f.responsable,api.dias(f.desde),f.acuse,f.nota,f.proveedor_espera]:['No consultado','','','','','',''];}
  };
})(window);
