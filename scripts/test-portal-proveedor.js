const assert = require("assert");
const fs = require("fs");
const path = require("path");

const portal = fs.readFileSync(
  path.join(__dirname, "..", "modulos", "portal-proveedor.html"),
  "utf8"
);

assert.match(portal, /function cargarRegistrosSiifParaProveedor\(/);
assert.match(portal, /\.range\(desde, desde \+ tamanoBloque - 1\)/);
assert.doesNotMatch(portal, /\.contains\("proveedores", \[proveedorVinculado\]\)/);
assert.match(portal, /cargarRegistrosSiifParaProveedor\(\s*"requis_siif"/);
assert.match(portal, /\.replace\(\/\\s\+\/g, " "\)/);
assert.match(
  portal,
  /requisicionesInicialesResultado\.data \|\| \[\]\)\.map\(normalizarRequisicionInicialSiif\)\.concat\(\s*requisicionesResultado\.data \|\| \[\]/
);

console.log("Portal proveedor: coincidencia normalizada, carga paginada y prioridad del seguimiento unificado verificadas.");

// Regresion: ROMAA tiene registros con uno y dos espacios en el nombre.
(async () => {
  const vm = require('node:vm');
  const nombre = 'ROMA ROMO-MARQUEZ S.A. DE C.V.';
  const rows = Array.from({length:1001}, (_,i) => ({id:String(i),proveedor:i%2 ? nombre : 'ROMA ROMO-MARQUEZ  S.A. DE C.V.',requisicion:i===1000?'3939':null}));
  rows.push({id:'ajeno',proveedor:'ROMA OTRO ROMO-MARQUEZ S.A. DE C.V.',requisicion:'3939'});
  const rangos=[];let fallo=false;
  const client={from(){const q={select(){return q;},ilike(campo,patron){assert.equal(campo,'proveedor');assert.equal(patron,'ROMA%ROMO-MARQUEZ%S.A.%DE%C.V.');return q;},order(){return q;},range(a,b){rangos.push(a);return Promise.resolve({data:rows.slice(a,b+1),error:fallo?{message:'offline'}:null});}};return q;}};
  const context={window:{supabaseClient:client}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/services/cotizaciones-almacen.service.js'),'utf8'),context);
  const api=context.window.ETCotizacionesAlmacen;
  const result=await api.listarPorProveedor(nombre);
  assert.equal(result.data.length,1001);assert.deepEqual(rangos,[0,1000]);
  assert.equal(result.data.find(r=>r.requisicion==='3939').id,'1000');
  const scope=vm.createContext({buscarCotizacionesAlmacen:{value:'3939'},filtroEstatusCotizacionesAlmacen:{value:''},fechaDesdeCotizacionesAlmacen:{value:''},fechaHastaCotizacionesAlmacen:{value:''},cotizacionesAlmacenProveedor:result.data,proveedorVinculado:nombre,proveedoresVinculados:[nombre],importePortal:v=>String(v||'')});
  for(const [start,end] of [['normalizarPortal','cotizacionPerteneceAlUsuario'],['cotizacionPerteneceAlUsuario','requisicionPerteneceAlUsuario'],['obtenerCotizacionesFiltradasProveedor','importePortal']]) {
    vm.runInContext(portal.slice(portal.indexOf('    function '+start+'('),portal.indexOf('    function '+end+'(')),scope);
  }
  assert.equal(scope.obtenerCotizacionesFiltradasProveedor().length,1);
  scope.filtroEstatusCotizacionesAlmacen.value='Rechazada';assert.equal(scope.obtenerCotizacionesFiltradasProveedor().length,0);
  fallo=true;assert.ok((await api.listarPorProveedor(nombre)).error);
  assert.equal((await api.listarPorProveedor('')).data.length,0);
  console.log('ROMAA: espacios equivalentes, requisicion 3939, paginacion y exclusion de otros proveedores verificados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
