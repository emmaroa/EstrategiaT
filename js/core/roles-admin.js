(function(global){
  'use strict';
  let catalogo=[];
  const modulos=()=>global.ETRbac.modulos.filter(m=>!['Inventario','Cancelaciones'].includes(m));
  async function rpc(nombre,args){
    const r=await global.supabaseClient.rpc(nombre,args||{});
    if(r.error)throw new Error(r.error.code==='PGRST202'?'Instala la actualización de Roles en Supabase.':r.error.message);
    return r.data;
  }
  async function cargar(){catalogo=await rpc('admin_listar_roles');return catalogo;}
  function obtener(clave){return catalogo.find(r=>r.clave===global.ETRbac.normal(clave));}
  async function poblar(select){
    const valor=select.value;
    const antiguos=new Map(Array.from(select.options).map(o=>[global.ETRbac.normal(o.value),o.value]));
    await cargar();select.replaceChildren(new Option('Selecciona rol',''));
    catalogo.forEach(r=>select.add(new Option(r.nombre,antiguos.get(r.clave)||r.clave)));
    select.value=Array.from(select.options).find(o=>global.ETRbac.normal(o.value)===global.ETRbac.normal(valor))?.value||'';
  }
  function permisosUsuario(container,usuario,rol){
    container.replaceChildren();
    const barra=document.createElement('div');barra.className='filters';
    const buscar=document.createElement('input');buscar.type='search';buscar.placeholder='Buscar módulo';buscar.setAttribute('aria-label','Buscar módulo');
    const usar=document.createElement('button');usar.type='button';usar.className='btn-secondary';usar.textContent='Usar módulos del rol';
    barra.append(buscar,usar);container.append(barra);
    const ayuda=document.createElement('p');ayuda.textContent='Elige los módulos de esta cuenta. Las acciones también respetan los permisos del rol.';container.append(ayuda);
    for(const modulo of modulos().filter(m=>m!=='Roles')){
      const bloque=document.createElement('fieldset');bloque.dataset.permissionRow=modulo;
      const titulo=document.createElement('legend');titulo.textContent=modulo;
      const acceso=document.createElement('select');acceso.dataset.rbacAccess=modulo;acceso.setAttribute('aria-label','Acceso a '+modulo);
      for(const [v,t] of [['none','Sin acceso'],['ver','Solo lectura'],['editar','Lectura y edición']])acceso.add(new Option(t,v));
      acceso.value=ETRbac.limiteAnterior(usuario,modulo,'editar')?'editar':ETRbac.limiteAnterior(usuario,modulo,'ver')?'ver':'none';
      const avanzado=document.createElement('details');const resumen=document.createElement('summary');resumen.textContent='Excepciones por acción';avanzado.append(resumen);
      for(const accion of ETRbac.acciones.filter(a=>a!=='aprobar_cancelacion')){
        const label=document.createElement('label');label.style.margin='8px';label.textContent=(accion==='solicitar_cancelacion'?'Cancelar registros':accion.replaceAll('_',' '))+' ';
        const select=document.createElement('select');select.dataset.rbacModulo=modulo;select.dataset.rbacAccion=accion;
        for(const [v,t] of [['','Según el rol'],['true','Permitir'],['false','Denegar']])select.add(new Option(t,v));
        const valor=usuario?.permisos_excepciones?.[modulo]?.[accion];select.value=typeof valor==='boolean'?String(valor):'';
        label.append(select);avanzado.append(label);
      }
      bloque.append(titulo,acceso,avanzado);container.append(bloque);
    }
    buscar.oninput=()=>container.querySelectorAll('[data-permission-row]').forEach(row=>row.hidden=!row.dataset.permissionRow.toLocaleLowerCase().includes(buscar.value.trim().toLocaleLowerCase()));
    usar.onclick=()=>{
      const r=obtener(rol());if(!r){global.alert('Selecciona un rol y espera a que cargue el catálogo.');return;}
      if(!global.confirm('¿Reemplazar la selección y las excepciones por los módulos de este rol?'))return;
      container.querySelectorAll('[data-rbac-access]').forEach(s=>{const a=r.permisos[s.dataset.rbacAccess]||[];s.value=a.includes('ver')?(a.includes('editar')?'editar':'ver'):'none';});
      container.querySelectorAll('[data-rbac-accion]').forEach(s=>s.value='');
    };
  }
  global.ETRolesAdmin={rpc,cargar,obtener,poblar,permisosUsuario,modulos};
})(window);
