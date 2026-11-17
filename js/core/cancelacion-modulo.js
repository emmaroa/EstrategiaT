(function(global){
 'use strict';
 const tablas={
  'Parque Vehicular':['parque_vehicular'],'Peticiones':['peticiones'],'Peticiones de Coordinadores':['peticiones'],
  'Gestión de Cotizaciones':['cotizaciones_almacen'],'Cotizaciones Proveedor':['cotizaciones_almacen'],'Peticiones de almacén':['peticiones'],
  'Requisiciones SIIF':['requis_siif','requisiciones_siif'],'Órdenes de Compra SIIF':['oc_siif'],'Solicitudes de Pago SIIF':['sp_siif'],
  'Acuerdos':['acuerdos'],'Calendario':['eventos_calendario'],'Control de Taller':['ingresos_taller','ingresos_taller_pendientes','ordenes_trabajo'],
  'Vales':['vales'],'Tramites Administrativos':['tramites_administrativos'],'Tiempo Extra':['periodos_tiempo_extra','empleados']
 };
 const nombres={ordenes_trabajo:'Ordenes de trabajo',requis_siif:'Requisiciones SIIF',requisiciones_siif:'Requisiciones',ingresos_taller:'Ingresos al taller',ingresos_taller_pendientes:'Ingresos pendientes',periodos_tiempo_extra:'Periodos',empleados:'Empleados'};
 const usuario=()=>JSON.parse(localStorage.getItem('usuarioActivo')||'null');
 function texto(f){return [f.folio||f.numero_solicitud||f.numero_economico||f.nombre||f.titulo||f.id,f.peticion||f.descripcion||f.concepto||f.fecha||''].filter(Boolean).join(' · ');}
 async function cancelar(tabla,fila,motivo){
  const result=await global.supabaseClient.rpc('cancelar_registro_modulo',{p_tabla:tabla,p_registro:fila.id,p_motivo:motivo});
  if(result.error)throw new Error(result.error.code==='PGRST202'?'Instala la actualización de cancelación por módulo.':result.error.message);
  global.dispatchEvent(new Event('et-data-changed'));
 }
 function inicializar(modulo){
  const fuentes=tablas[modulo];if(!fuentes||!global.ETRbac?.puede(usuario(),modulo,'ver')||document.getElementById('cancelacionEnModulo'))return;
  const header=document.querySelector('.et-header-actions,.topbar,.et-module-header');if(!header)return;
  const boton=document.createElement('button');boton.type='button';boton.className='btn-secondary';boton.id='cancelacionEnModulo';boton.textContent='Cancelación de registros';header.append(boton);
  boton.onclick=()=>abrir(modulo,fuentes);
 }
 function abrir(modulo,fuentes){
  const dialog=document.createElement('dialog');dialog.style.cssText='width:min(700px,94vw);max-height:90vh;overflow:auto;padding:24px;border-radius:14px;border:1px solid #64748b;background:var(--bg-secondary,#172033);color:inherit';
  dialog.innerHTML='<form method="dialog"><button type="submit" aria-label="Cerrar" style="float:right">Cerrar</button></form><h2>Cancelar registro</h2><p>La cancelación conserva el registro y bloquea su edición.</p><label>Registros<select data-tabla></select></label><label>Mostrar<select data-estado><option value="false">Sin cancelar</option><option value="true">Cancelados</option></select></label><label>Buscar en esta página<input type="search" data-buscar></label><label>Registro<select data-registro size="7" style="width:100%;max-width:100%"></select></label><div><button type="button" data-anterior>Anterior</button><span data-pagina></span><button type="button" data-siguiente>Siguiente</button></div><p data-detalle></p><label data-motivo-label>Motivo<textarea data-motivo minlength="5" maxlength="1000" style="width:100%"></textarea></label><button type="button" data-confirmar>Cancelar registro seleccionado</button><p role="status" data-mensaje></p>';
  document.body.append(dialog);const $=q=>dialog.querySelector(q);let pagina=0,filas=[],ocupado=false,generacion=0;
  fuentes.forEach(t=>$('[data-tabla]').add(new Option(nombres[t]||modulo,t)));
  function render(){
   const buscado=$('[data-buscar]').value.trim().toLocaleLowerCase();$('[data-registro]').replaceChildren();
   filas.filter(f=>texto(f).toLocaleLowerCase().includes(buscado)).forEach(f=>$('[data-registro]').add(new Option(texto(f),f.id)));
   if($('[data-registro]').options.length)$('[data-registro]').selectedIndex=0;detalle();
  }
  function detalle(){const fila=filas.find(f=>f.id===$('[data-registro]').value),cancelado=$('[data-estado]').value==='true';
   $('[data-confirmar]').hidden=cancelado;$('[data-motivo-label]').hidden=cancelado;
   $('[data-confirmar]').disabled=ocupado||!fila||!ETRbac.puede(usuario(),modulo,'solicitar_cancelacion',fila);
   $('[data-detalle]').textContent=cancelado&&fila?'Cancelado: '+(fila.rbac_cancelado_en?new Date(fila.rbac_cancelado_en).toLocaleString():'fecha histórica')+' · '+(fila.rbac_motivo_cancelacion||'Sin motivo disponible'):(!cancelado&&fila&&!ETRbac.puede(usuario(),modulo,'solicitar_cancelacion',fila)?'No tienes permiso para cancelar este registro.':'');
  }
  async function cargar(){const turno=++generacion;ocupado=true;detalle();$('[data-mensaje]').textContent='Cargando…';
   try{let q=global.supabaseClient.from($('[data-tabla]').value).select('*').eq('rbac_cancelado',$('[data-estado]').value==='true');
    if($('[data-tabla]').value==='peticiones')q=modulo==='Peticiones de Coordinadores'?q.eq('origen_peticion','coordinador'):q.or('origen_peticion.is.null,origen_peticion.neq.coordinador');
    const r=await q.order('id').range(pagina*50,pagina*50+49);if(turno!==generacion)return;if(r.error)throw r.error;filas=r.data||[];
    $('[data-anterior]').disabled=pagina===0;$('[data-siguiente]').disabled=filas.length<50;$('[data-pagina]').textContent=' Página '+(pagina+1)+' ';$('[data-mensaje]').textContent=filas.length?'':'No hay registros en esta página.';render();
   }catch(e){if(turno!==generacion)return;filas=[];render();$('[data-mensaje]').textContent=e.message||'No se pudieron cargar los registros.';}finally{if(turno===generacion){ocupado=false;detalle();}}
  }
  $('[data-buscar]').oninput=render;$('[data-registro]').onchange=detalle;
  for(const selector of ['[data-tabla]','[data-estado]'])$(selector).onchange=()=>{pagina=0;cargar();};
  $('[data-anterior]').onclick=()=>{if(!ocupado&&pagina>0){pagina--;cargar();}};$('[data-siguiente]').onclick=()=>{if(!ocupado){pagina++;cargar();}};
  $('[data-confirmar]').onclick=async()=>{if(ocupado)return;const fila=filas.find(f=>f.id===$('[data-registro]').value),motivo=$('[data-motivo]').value.trim();
   if(!fila||!ETRbac.puede(usuario(),modulo,'solicitar_cancelacion',fila))return;
   if(motivo.length<5){$('[data-mensaje]').textContent='Escribe un motivo de al menos 5 caracteres.';return;}
   if(!global.confirm('¿Cancelar '+texto(fila)+'?'))return;ocupado=true;detalle();
   try{await cancelar($('[data-tabla]').value,fila,motivo);global.location.reload();}catch(e){$('[data-mensaje]').textContent=e.message;ocupado=false;detalle();}
  };
  dialog.addEventListener('close',()=>{generacion++;dialog.remove();});dialog.showModal();cargar();
 }
 global.ETCancelacionModulo={inicializar,cancelar};
})(window);
