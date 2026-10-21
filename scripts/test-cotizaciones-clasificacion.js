const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const catalogo = require('../js/services/dependencias-cotizaciones.js');
assert.equal(catalogo.listado.length, 41);
assert.equal(catalogo.resolver('Servicios Públicos'), catalogo.resolver('11'));
assert.equal(catalogo.resolver('11 - Servicios Públicos'), catalogo.resolver('11'));
assert.equal(catalogo.resolver('01'), '01-H. Ayuntamiento');
assert.equal(catalogo.resolver('Municipal'), '');
const clasificar = (unidad, ...items) => catalogo.clasificarPartida(unidad, items.map(item => ({item}))).partida;
assert.equal(clasificar({combustible:'Gasolina'}, 'Bateria'), '29601');
assert.equal(clasificar({combustible:'Diesel',descripcion:'Pickup'}, 'Bateria'), '29801');
assert.equal(clasificar({grupo:'Motocicletas'}, 'Faro'), '29601');
assert.equal(clasificar({grupo:'Colectores'}, 'Filtro'), '29801');
assert.equal(clasificar({grupo:'Maquinaria Pesada'}, 'Filtro'), '29801');
assert.equal(clasificar({combustible:'Diesel'}, 'Aceite para diesel'), '26102');
assert.equal(clasificar({combustible:'Gasolina'}, 'Filtro de aceite'), '29601');
assert.equal(clasificar({combustible:'Gasolina'}, 'Aceite', 'Filtro'), '');
assert.equal(clasificar({descripcion:'Pickup'}, 'Filtro'), '');
for (const dependencia of ['09','10','11']) {
 const resultado = catalogo.clasificarCompleta({unidad:'123',materiales:[{item:'Faro international'}]}, {combustible:'Gasolina',dependencia});
 assert.equal(resultado.dependencia,catalogo.resolver(dependencia));
 assert.equal(resultado.partida,'29601');
}
for (const unidad of ['0','STOCK','stock']) {
 const resultado = catalogo.clasificarCompleta({unidad,materiales:[{item:'Bujias'}]}, {dependencia:'09',combustible:'Gasolina'});
 assert.equal(resultado.dependencia,'');
 assert.equal(resultado.partida,'');
}
assert.equal(catalogo.clasificarCompleta({unidad:'123',materiales:[{item:'International'}]}).dependencia,'');
const html = fs.readFileSync(path.join(__dirname, '../modulos/peticiones.html'), 'utf8');
for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(script[1]);
let rol = 'SuperAdmin', permiso = true;
const permisos = {puedeEditarModulo: () => permiso};
const manual = {checked:true};
const contexto = vm.createContext({window:{ETPermissions:permisos},ETPermissions:permisos,
  obtenerUsuarioActivoPeticion: () => ({rol}), normalizarRolPeticion: s => s.toLowerCase().replace(/[\s_-]+/g,''),
  document:{getElementById: () => manual}
});
function cargarFuncion(nombre, siguiente) {
  vm.runInContext(html.slice(html.indexOf('    function '+nombre+'('),html.indexOf('    function '+siguiente+'(')),contexto);
}
cargarFuncion('puedeEditarGestionCotizaciones','puedeVerDetalleGestionCotizaciones');
cargarFuncion('esCorreccionManualCotizacion','actualizarPartidaAutomaticaCotizacion');
for (rol of ['SuperAdmin','Admin','Compras','Administrador del Sistema']) {
  assert.equal(contexto.puedeEditarGestionCotizaciones(),true);
  assert.equal(contexto.esCorreccionManualCotizacion(),true);
}
for (rol of ['Director','Proveedor','Tecnico']) assert.equal(contexto.puedeEditarGestionCotizaciones(),false);
rol='Compras';permiso=false;assert.equal(contexto.esCorreccionManualCotizacion(),false);
permiso=true;manual.checked=false;assert.equal(contexto.esCorreccionManualCotizacion(),false);
const consultas = [];
const primeras = Array.from({length:1000}, (_,i) => ({id:i, numero_economico:'U'+i}));
const query = { select() { return this; }, order() { return this; }, async range(desde, hasta) { consultas.push([desde,hasta]); return {data: desde === 0 ? primeras : [{id:1001,numero_economico:'9999',grupo:'Maquinaria Pesada',combustible:'Diesel'}],error:null}; } };
const window = {supabaseClient: {from() { return query; }}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/services/cotizaciones-almacen.service.js'),'utf8'),{window});
(async () => {
  const encontrados = await window.ETCotizacionesAlmacen.buscarUnidadesParque('9999');
  assert.equal(encontrados.length,1);
  assert.equal(encontrados[0].grupo,'Maquinaria Pesada');
  assert.deepEqual(consultas, [[0,999],[1000,1999]]);
  console.log('Cotizaciones: catálogo, tres partidas, conceptos mixtos y búsqueda paginada verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
