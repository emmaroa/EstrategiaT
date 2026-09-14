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
for (const item of ['INTERNATIONAL', 'Retén Stemco', 'Tambor trasero', 'Tambor delantero', 'Para camión', 'Diésel', 'Cepillos', 'Zapata', 'Fibra de acero', 'RETENES STEMCO', 'Tambores delanteros']) {
  const regla = catalogo.reglaServiciosPublicos({materiales:[{item}]});
  assert.equal(regla?.dependencia, catalogo.resolver('11'), item);
  assert.equal(regla?.partida, '29801', item);
}
assert.equal(catalogo.reglaServiciosPublicos({materiales:[{item:'Batería'}]}), null);
assert.equal(catalogo.reglaServiciosPublicos({observaciones:'Para camion'}).partida, '29801');
assert.equal(catalogo.clasificarPartida(null,[{item:'Aceite para diesel'}]).partida,'29801');
for (const [item, partida] of [['Urea','26102'],['Aceite para diesel','26102'],['Foco electrico para Tsuru','29801'],['Filtro de aceite Tsuru','29601'],['Filtro de camion','29801'],['Termostato Tsuru','29601']]) {
  const resultado = catalogo.clasificarCompleta({unidad:'STOCK',materiales:[{item}]});
  assert.equal(resultado.partida,partida,item);
  assert.ok(catalogo.listado.includes(resultado.dependencia));
}
const generico = catalogo.clasificarCompleta({unidad:'STOCK',materiales:[{item:'Abrazadera'}]});
const unidadInfra = {dependencia:catalogo.resolver('10'),combustible:'Gasolina'};
assert.equal(catalogo.clasificarCompleta({unidad:'1234',materiales:[{item:'Faro international'}]},unidadInfra).dependencia,catalogo.resolver('10'));
assert.equal(catalogo.clasificarCompleta({unidad:'1234',materiales:[{item:'Bujias'}]},unidadInfra).dependencia,catalogo.resolver('10'));
assert.equal(catalogo.clasificarCompleta({unidad:'1234',materiales:[{item:'International'}]}).dependencia,'');
assert.equal(catalogo.clasificarCompleta({unidad:'0',materiales:[{item:'International'}]},unidadInfra).dependencia,catalogo.resolver('11'));
assert.equal(catalogo.clasificarCompleta({unidad:'STOCK',materiales:[{item:'Bujias'}]},unidadInfra).dependencia,catalogo.resolver('09'));
assert.equal(generico.dependencia,catalogo.resolver('11'));
assert.equal(generico.inferenciaGeneral,true);
assert.equal(catalogo.clasificarCompleta({unidad:'STOCK',materiales:[{item:'Aceite',cantidad:1,precio_unitario:1000},{item:'Foco',cantidad:1,precio_unitario:10}]}).partida,'26102');
const clasificar = (unidad, ...items) => catalogo.clasificarPartida(unidad, items.map(item => ({item}))).partida;
assert.equal(clasificar({combustible: 'Gasolina'}, 'Balatas'), '29601');
assert.equal(clasificar({combustible: 'Diesel', descripcion: 'Pickup'}, 'Batería'), '29601');
assert.equal(clasificar({combustible: 'Gasolina', grupo: 'Maquinaria Pesada'}, 'Batería'), '29801');
assert.equal(clasificar({descripcion: 'Camión recolector'}, 'Llantas'), '29801');
assert.equal(clasificar({grupo: 'Maquinaria Pesada'}, 'Aceite 15W40', 'Grasa lubricante'), '26102');
assert.equal(clasificar({combustible: 'Gasolina'}, 'Filtro de aceite'), '29601');
assert.equal(clasificar({combustible: 'Gasolina'}, 'Aceite 15W40', 'Filtro de aceite'), '');
assert.equal(clasificar({combustible: 'Diesel'}, 'Batería'), '');
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
