(async function(){
  'use strict';
  if(!validarPermiso('Cancelaciones'))return;
  ETLayout.inicializar('Cancelaciones');
  const usuario=JSON.parse(localStorage.getItem('usuarioActivo')||'{}');
  const tabla=document.getElementById('tablaCancelacion'),registro=document.getElementById('registroCancelacion'),mensaje=document.getElementById('mensajeCancelacion');
  const mostrar=e=>{mensaje.textContent=e.message||String(e);};
  for(const [nombre,modulo] of Object.entries(ETRbac.tablas)){
    if(['usuarios','flujo_tramites_siif','importaciones_siif','inventario_movimientos','tiempo_extra_detalles','tiempo_extra_empleados','feriados_administrativos','ubicaciones_inventario'].includes(nombre)||!ETRbac.puede(usuario,modulo,'solicitar_cancelacion'))continue;
    const opcion=document.createElement('option');opcion.value=nombre;opcion.textContent=modulo+' · '+nombre;tabla.appendChild(opcion);
  }
  if(ETRbac.puede(usuario,'Peticiones de Coordinadores','solicitar_cancelacion')&&!Array.from(tabla.options).some(o=>o.value==='peticiones')){const o=document.createElement('option');o.value='peticiones';o.textContent='Peticiones de Coordinadores';tabla.appendChild(o);}
  async function registros(){
    registro.replaceChildren();if(!tabla.value)return;
    const nombre=tabla.value;const filas=[];
    for(let desde=0;;desde+=500){const r=await supabaseClient.from(nombre).select('*').eq('rbac_cancelado',false).order('id').range(desde,desde+499);if(r.error)throw r.error;filas.push(...r.data);if(r.data.length<500)break;}
    if(tabla.value!==nombre)return;
    for(const fila of filas){const modulo=nombre==='peticiones'&&fila.origen_peticion==='coordinador'?'Peticiones de Coordinadores':ETRbac.tablas[nombre];if(!ETRbac.puede(usuario,modulo,'solicitar_cancelacion',fila))continue;const o=document.createElement('option');o.value=fila.id;o.textContent=[fila.folio||fila.numero_solicitud||fila.numero_economico||fila.nombre||fila.titulo||fila.id,fila.descripcion||fila.concepto||fila.fecha||''].join(' · ');registro.appendChild(o);}
  }
  async function listar(){
    const r=await supabaseClient.from('solicitudes_cancelacion').select('*').order('created_at',{ascending:false}).limit(200);if(r.error)throw r.error;
    const tbody=document.getElementById('listaCancelaciones');tbody.replaceChildren();
    for(const s of r.data){const tr=document.createElement('tr');for(const valor of [new Date(s.created_at).toLocaleString('es-MX'),s.modulo,s.registro_id,s.motivo,s.estado,s.resolucion||'']){const td=document.createElement('td');td.textContent=valor;tr.appendChild(td);}
      const acciones=document.createElement('td');
      if(s.estado==='Pendiente'&&ETRbac.puede(usuario,'Cancelaciones','aprobar_cancelacion'))for(const aprobar of [true,false]){const boton=document.createElement('button');boton.textContent=aprobar?'Aprobar':'Rechazar';boton.addEventListener('click',async()=>{const motivo=prompt('Motivo de la resolución (mínimo 5 caracteres):');if(!motivo||motivo.trim().length<5)return;boton.disabled=true;try{const res=await supabaseClient.rpc('resolver_cancelacion',{p_id:s.id,p_aprobar:aprobar,p_motivo:motivo});if(res.error)throw res.error;await listar();await registros();}catch(e){mostrar(e);boton.disabled=false;}});acciones.appendChild(boton);}
      tr.appendChild(acciones);tbody.appendChild(tr);
    }
  }
  tabla.addEventListener('change',()=>registros().catch(mostrar));
  document.getElementById('recargarCancelaciones').addEventListener('click',()=>listar().catch(mostrar));
  document.getElementById('formCancelacion').addEventListener('submit',async e=>{e.preventDefault();const boton=e.submitter;boton.disabled=true;try{const r=await supabaseClient.rpc('solicitar_cancelacion',{p_tabla:tabla.value,p_registro:registro.value,p_motivo:document.getElementById('motivoCancelacion').value});if(r.error)throw r.error;mensaje.textContent='Solicitud registrada.';await listar();}catch(error){mostrar(error);}finally{boton.disabled=false;}});
  try{await registros();await listar();}catch(e){mostrar(e);}
})();
