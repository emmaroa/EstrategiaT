const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let user={id:'autor',rol:'Coordinador',activo:true}, permiso=true, writes=[], row={id:'peticion',origen_peticion:'coordinador',creada_por_id:'autor',updated_at:'2026-10-23',estado_autorizacion:'autorizada'};
const client={from(){let op='read',payload,filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},update(p){op='update';payload=p;return q;},delete(){op='delete';return q;},single(){if(op!=='read')writes.push({op,payload,filters});return Promise.resolve({data:{...row},error:null});}};return q;}};
const context={window:{supabaseClient:client,ETPermissions:{puedeEditarModulo:()=>permiso}},localStorage:{getItem:()=>JSON.stringify(user)}};
vm.runInNewContext(fs.readFileSync('js/services/peticiones.service.js','utf8'),context);
const api=context.window.ETPeticiones;
(async()=>{
  for(const rol of ['Coordinador','Coordinador Infraestructura','SuperAdmin','Jefe de Almacén','Jefe de Almacen']) {
    user.rol=rol;assert.equal(api.puedeGestionarCoordinador(row),true,rol);
    assert.equal(api.puedeGestionarCoordinador({...row,creada_por_id:'otro'}),!rol.startsWith('Coordinador'),rol);
  }
  for(const rol of ['Admin','Compras','Director','Proveedor','Técnico']) {user.rol=rol;assert.equal(api.puedeGestionarCoordinador(row),false);}
  user.rol='Coordinador';permiso=false;assert.ok((await api.eliminarCoordinador(row.id)).error);assert.equal(writes.length,0);
  permiso=true;user.activo=false;assert.equal(api.puedeGestionarCoordinador(row),false);user.activo=true;
  row.creada_por_id='otro';assert.ok((await api.actualizarCoordinador(row.id,{unidad:'1',peticion:'Cambio'})).error);assert.equal(writes.length,0);
  row.creada_por_id='autor';
  await api.actualizarCoordinador(row.id,{unidad:' 123 ',peticion:'Cambio',creada_por_id:'otro',estado_autorizacion:'rechazada',area:'Otra'});
  assert.equal(writes[0].payload.unidad,'123');assert.equal(writes[0].payload.creada_por_id,undefined);assert.equal(writes[0].payload.estado_autorizacion,undefined);assert.equal(writes[0].payload.area,undefined);
  assert.ok(writes[0].filters.some(([k,v])=>k==='creada_por_id'&&v==='autor'));
  await api.eliminarCoordinador(row.id);assert.equal(writes[1].op,'delete');assert.ok(writes[1].filters.some(([k,v])=>k==='origen_peticion'&&v==='coordinador'));
  row.origen_peticion='normal';assert.ok((await api.eliminarCoordinador(row.id)).error);assert.equal(writes.length,2);
  const html=fs.readFileSync('modulos/peticiones-coordinadores.html','utf8');
  for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(script[1]);
  assert.ok(html.includes('data-editar'));assert.ok(html.includes('data-borrar'));assert.ok(html.includes('if (!confirm('));
  console.log('Coordinadores: edición propia, roles, permisos de módulo, borrado, autoría y autorización preservadas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
