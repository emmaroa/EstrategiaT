const fs = require('fs'), vm = require('vm'), assert = require('assert');
const service = fs.readFileSync('js/services/control-taller.js', 'utf8');
async function main() {
  let usuario = {id:'autor'}, solo = false, respuesta = 'clave', solicitudes = [], recargas = 0;
  const elementos = new Map();
  const ctx = vm.createContext({
    window: {supabaseClient: {rpc: async (nombre, datos) => {
      solicitudes.push({nombre, datos}); return {data:true};
    }}},
    document: {addEventListener(){}, getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, {value:'', classList:{add(){}}, setAttribute(){}});
      return elementos.get(id);
    }},
    localStorage: {getItem: () => JSON.stringify(usuario)},
    esSoloLectura: () => solo, alert(){},
    ETLayout: {seleccionar: async () => respuesta},
    seleccionarProveedorTaller(){}
  });
  vm.runInContext(service, ctx);
  ctx.cargarControlTaller = async () => {recargas++;};
  const registro = {id:'ingreso', creado_por:'autor', numero_economico:'E-1'};
  assert.equal(ctx.puedeEliminarIngresoTaller(registro), true);
  assert.equal(ctx.puedeEliminarIngresoTaller({...registro,creado_por:null}), false);
  usuario = {id:'otro',rol:'superadmin'};
  await ctx.eliminarIngresoTaller(registro);
  assert.equal(solicitudes.length, 0, 'Un administrador ajeno no puede eliminar');
  usuario = {id:'autor'}; solo = true;
  assert.equal(ctx.puedeEliminarIngresoTaller(registro), false);
  solo = false; respuesta = null;
  await ctx.eliminarIngresoTaller(registro);
  assert.equal(solicitudes.length, 0, 'Cancelar no elimina');
  respuesta = 'clave';
  await ctx.eliminarIngresoTaller(registro);
  assert.equal(solicitudes[0].nombre, 'eliminar_ingreso_taller');
  assert.equal(solicitudes[0].datos.p_usuario_id, 'autor');
  assert.equal(recargas, 1);
  ctx.abrirIngreso(registro);
  assert.equal(elementos.get('unidadTaller').disabled, false);
  vm.runInContext('unidadesTaller=[{id:"nueva",numero_economico:"E-2",unidad_patrulla:"P-2"}]',ctx);
  assert.equal(ctx.buscarUnidadEscrita('p2').id, 'nueva');
  assert.equal(ctx.buscarUnidadEscrita('E2').id, 'nueva');
  let guardado, actualizaciones = 0, cerrado = false;
  const consulta = {
    eq(){return this;},
    async select(){return {data:[{id:'ingreso'}]};}
  };
  ctx.window.supabaseClient.from = () => ({update(datos) {
    actualizaciones++; guardado = datos; return consulta;
  }});
  const el = id => ctx.document.getElementById(id);
  el('dialogoSalidaTaller').showModal = () => {};
  el('dialogoSalidaTaller').close = () => {cerrado = true;};
  el('fechaSalidaTaller').focus = () => {};
  el('formSalidaTaller').reportValidity = () => true;
  ctx.registrarSalida({...registro,estatus:'En curso',fecha_ingreso:'2020-01-01',descripcion:'Trabajo previo'});
  assert.equal(actualizaciones, 0, 'Abrir el diálogo no registra la salida');
  el('fechaSalidaTaller').value = '2019-12-31';
  await ctx.guardarSalidaTaller({preventDefault(){}});
  assert.equal(actualizaciones, 0, 'No permite salida anterior al ingreso');
  el('fechaSalidaTaller').value = '2999-01-01';
  await ctx.guardarSalidaTaller({preventDefault(){}});
  assert.equal(actualizaciones, 0, 'No permite salidas futuras');
  el('fechaSalidaTaller').value = '2020-02-01';
  el('notasSalidaTaller').value = 'Unidad entregada';
  await ctx.guardarSalidaTaller({preventDefault(){}});
  assert.equal(guardado.fecha_salida, '2020-02-01');
  assert.equal(guardado.estatus, 'Terminado');
  assert.equal(guardado.descripcion, 'Trabajo previo\n\nNotas de salida (2020-02-01): Unidad entregada');
  assert.equal(cerrado, true);
  ctx.registrarSalida({...registro,estatus:'En espera',fecha_ingreso:'2020-01-01',descripcion:'Trabajo previo'});
  await ctx.guardarSalidaTaller({preventDefault(){}});
  assert.equal(Object.hasOwn(guardado, 'descripcion'), false, 'Las notas vacías no alteran la descripción');
  console.log('Salida: diálogo, fecha elegida, límites y conservación de notas verificados.');
  console.log('Taller: unidad editable, autor, cancelación y eliminación verificados.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
