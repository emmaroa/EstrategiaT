const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../js/services/control-taller-kpis.js'),'utf8'),ctx);
const units=[{id:'a'},{id:'b'},{id:'c'}];
const base={vehiculo_id:'a',tipo_movimiento:'Correctivo',taller_nombre:'Taller A'};
const rows=[
 {...base,id:'1',estatus:'Terminado',fecha_ingreso:'2026-08-20',fecha_salida:'2026-08-22'},
 {...base,id:'2',estatus:'En curso',fecha_ingreso:'2026-09-01'},
 {...base,vehiculo_id:'b',estatus:'Terminado',fecha_ingreso:'2026-08-25',fecha_salida:'2026-09-04'},
 {...base,vehiculo_id:'c',estatus:'Terminado',fecha_ingreso:'2026-08-25',fecha_salida:null},
 {...base,vehiculo_id:'fuera',estatus:'En curso',fecha_ingreso:'2026-09-01'}
];
const now=new Date(2026,8,6);
const k=ctx.calcularIndicadoresTaller(units,rows,[{}],now);
assert.equal(k.total,3);assert.equal(k.disponibles,2);assert.equal(k.ingresosMes,1);
assert.equal(k.salidasMes,1);assert.equal(k.reingresos,1);assert.equal(k.omitidos,1);
assert.equal(k.proveedores[0].mediana,6);assert.equal(k.proveedores[0].servicios,2);
assert.deepEqual(Array.from(k.rangos),[1,0,0,0]);assert.equal(k.pendientes,1);
const limites=[7,8,15,16,30,31].map((dias,index)=>({vehiculo_id:String(index),estatus:'En curso',fecha_ingreso:new Date(Date.UTC(2026,8,6)-dias*86400000).toISOString().slice(0,10)}));
const l=ctx.calcularIndicadoresTaller(limites.map(i=>({id:i.vehiculo_id})),limites,[],now);
assert.deepEqual(Array.from(l.rangos),[1,2,2,1]);
for(const salida of ['2026-09-01','2026-08-02']) {
 const r=ctx.calcularIndicadoresTaller(units,[{...base,estatus:'Terminado',fecha_ingreso:'2026-08-01',fecha_salida:salida},rows[1]],[],now);
 assert.equal(r.reingresos,0,'No contar el mismo día ni 30 días');
}
assert.equal(ctx.calcularIndicadoresTaller([],[],[],now).total,0);
console.log('KPI Taller: áreas, fechas, mediana, permanencia y reingresos verificados.');
