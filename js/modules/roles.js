(async function(){
 'use strict';if(!validarPermiso('Roles'))return;ETLayout.inicializar('Roles');
 const el=id=>document.getElementById(id);let actual=null,ocupado=false;
 function mensaje(texto){el('estadoRoles').textContent=texto;}
 function render(rol){
  actual=rol;el('editorRol').hidden=false;el('nombreRol').value=rol?.nombre||'';el('claveRol').value=rol?.clave||'';el('claveRol').readOnly=!!rol;
  el('usuariosRol').textContent=rol?rol.usuarios+' usuarios asignados. Los nuevos módulos también deben autorizarse en cada cuenta.':'Los permisos se aplicarán cuando asignes este rol a un usuario.';
  el('eliminarRol').disabled=!rol||rol.clave==='superadmin'||rol.usuarios>0;
  el('modulosRol').replaceChildren();
  for(const m of ETRolesAdmin.modulos()){
   const bloque=document.createElement('fieldset');bloque.dataset.modulo=m;const title=document.createElement('legend');title.textContent=m;
   const nivel=document.createElement('select');nivel.dataset.nivel=m;nivel.setAttribute('aria-label','Permiso de '+m);
   for(const [v,t] of [['none','Sin acceso'],['ver','Solo lectura'],['editar','Lectura y edición']])nivel.add(new Option(t,v));
   const acciones=rol?.permisos[m]||[];nivel.value=acciones.includes('editar')?'editar':acciones.includes('ver')?'ver':'none';
   const reservado=['Usuarios','Roles','Licencias'].includes(m)&&rol?.clave!=='superadmin';
   if(reservado){nivel.disabled=true;nivel.value='none';}
   const detalles=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Acciones detalladas';detalles.append(summary);
   for(const a of ETRbac.acciones){const label=document.createElement('label');label.style.margin='8px';const check=document.createElement('input');check.type='checkbox';check.dataset.accion=a;
    check.disabled=reservado||(a==='eliminar'&&!['superadmin','administradordelsistema'].includes(rol?.clave))||(a==='aprobar_cancelacion'&&!['superadmin','administradordelsistema','jefedealmacen'].includes(rol?.clave));
    check.checked=!check.disabled&&acciones.includes(a);label.append(check,document.createTextNode(' '+a.replaceAll('_',' ')));detalles.append(label);}
   nivel.onchange=()=>{const defaults=nivel.value==='editar'?['ver','crear','editar','cambiar_estatus','exportar','imprimir','solicitar_cancelacion']:nivel.value==='ver'?['ver','exportar','imprimir']:[];bloque.querySelectorAll('[data-accion]').forEach(c=>c.checked=defaults.includes(c.dataset.accion));};
   detalles.onchange=()=>{const a=Array.from(detalles.querySelectorAll('input:checked')).map(c=>c.dataset.accion);nivel.value=a.includes('editar')?'editar':a.includes('ver')?'ver':'none';};
   bloque.append(title,nivel,detalles);el('modulosRol').append(bloque);
  }
 }
 async function cargar(seleccion){const roles=await ETRolesAdmin.cargar();el('rolEditar').replaceChildren(new Option('Selecciona un rol',''));roles.forEach(r=>el('rolEditar').add(new Option(r.nombre,r.clave)));if(seleccion){el('rolEditar').value=seleccion;render(ETRolesAdmin.obtener(seleccion));}}
 async function ejecutar(fn){if(ocupado)return;ocupado=true;el('guardarRol').disabled=true;try{await fn();}catch(e){mensaje(e.message);}finally{ocupado=false;el('guardarRol').disabled=false;}}
 el('nuevoRol').onclick=()=>{el('rolEditar').value='';render(null);mensaje('');el('nombreRol').focus();};
 el('rolEditar').onchange=()=>{const r=ETRolesAdmin.obtener(el('rolEditar').value);el('editorRol').hidden=!r;if(r)render(r);};
 el('recargarRoles').onclick=()=>ejecutar(()=>cargar(el('rolEditar').value));
 el('buscarModuloRol').oninput=()=>el('modulosRol').querySelectorAll('fieldset').forEach(f=>f.hidden=!f.dataset.modulo.toLocaleLowerCase().includes(el('buscarModuloRol').value.trim().toLocaleLowerCase()));
 el('formRol').onsubmit=e=>{e.preventDefault();ejecutar(async()=>{
  const permisos={};el('modulosRol').querySelectorAll('fieldset').forEach(f=>{const a=Array.from(f.querySelectorAll('input:checked')).map(c=>c.dataset.accion);if(a.length)permisos[f.dataset.modulo]=a;});
  const clave=actual?.clave||ETRbac.normal(el('nombreRol').value).replace(/[^a-z0-9]/g,'').slice(0,60);await ETRolesAdmin.rpc('admin_guardar_rol',{p_clave:clave,p_nombre:el('nombreRol').value.trim(),p_permisos:permisos,p_revision:actual?.revision||0});
  await cargar(clave);mensaje('Rol guardado. Los usuarios recibirán sus permisos actualizados al volver a la aplicación.');
 });};
 el('eliminarRol').onclick=()=>{if(!actual||!confirm('¿Eliminar el rol '+actual.nombre+'?'))return;ejecutar(async()=>{await ETRolesAdmin.rpc('admin_eliminar_rol',{p_clave:actual.clave,p_revision:actual.revision});actual=null;el('editorRol').hidden=true;await cargar();mensaje('Rol eliminado.');});};
 await ejecutar(()=>cargar());
})();
