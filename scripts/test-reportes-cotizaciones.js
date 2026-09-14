const assert = require('node:assert/strict');
const reportes = require('../js/services/reportes-cotizaciones.js');
const catalogo = require('../js/services/dependencias-cotizaciones.js');
const base = {proveedor:'Proveedor A',dependencia:'11',partida:'29801',fecha_cotizacion:'2026-09-01',estatus:'Pendiente'};
const rows = [
  {...base,id:'1',total:0.1}, {...base,id:'2',total:0.2},
  {...base,id:'3',proveedor:'Proveedor B',dependencia:'09',partida:'29601',total:100,fecha_cotizacion:'2026-09-30'},
  {...base,id:'4',partida:'26102',total:50,fecha_cotizacion:null,fecha_entrega:'2026-09-15'},
  {...base,id:'5',total:999,estatus:'Rechazada'}, {...base,id:'6',total:999,requisicion:'123'},
  {...base,id:'7',total:999,estatus:'Requisición generada'}, {...base,id:'8',total:null},
  {...base,id:'9',total:'inválido'}, {...base,id:'1',total:0.1},
  {...base,id:'10',total:10,partida:null,fecha_cotizacion:null}
];
const {registros,omitidos} = reportes.preparar(rows,catalogo.resolver);
assert.equal(omitidos,2);assert.equal(registros.length,5);
const r=reportes.calcular(registros);
assert.equal(r.total,16030);assert.equal(r.totales['29801'],30);assert.equal(r.totales['Otras / sin clave'],1000);
assert.equal(r.dependencias.reduce((sum,d)=>sum+d.total,0),r.total);
assert.equal(r.proveedores.reduce((sum,p)=>sum+p.total,0),r.total);
assert.equal(r.detalle.reduce((sum,d)=>sum+d.centavos,0),r.total);
assert.equal(reportes.calcular(registros,{desde:'2026-09-01',hasta:'2026-09-30'}).total,15030);
assert.equal(reportes.calcular(registros,{proveedor:'PROVEEDOR A',dependencia:catalogo.resolver('11'),partida:'26102',desde:'2026-09-15',hasta:'2026-09-15'}).total,5000);
assert.equal(reportes.calcular(registros,{proveedor:'No existe'}).total,0);
assert.throws(()=>reportes.calcular(registros,{desde:'2026-09-30',hasta:'2026-09-01'}));
assert.equal(reportes.calcular(registros,{hasta:'2026-09-01'}).detalle.length,2);
console.log('Reportes Cotizaciones: deuda sin requisición, rechazadas, filtros combinados, fechas inclusivas, centavos y totales conciliados.');
