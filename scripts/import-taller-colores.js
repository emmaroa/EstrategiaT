const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dir = path.resolve(__dirname, '../imports/taller-colores');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8').replace(/^\uFEFF/, ''));
const write = (name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
const normal = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fecha = v => v && Number(v) > 20000 ? new Date((Number(v) - 25569) * 86400000).toISOString().slice(0, 10) : null;
const uuid = key => {
  const h = crypto.createHash('sha256').update('movimientos-electrico-20260906:' + key).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};

async function main() {
  const rows = read('rows.json').filter(r => r.A);
  const unidades = read('before-parque_vehicular.json');
  const ingresos = [], pendientes = [], audit = [];
  for (const r of rows) {
    const matches = unidades.filter(u => [u.numero_economico, u.numero_inventario, u.unidad_patrulla].some(v => normal(v) === normal(r.A)));
    const verde = r.colors.B?.includes('FF92D050');
    const rojo = r.colors.B?.includes('FFFF0000');
    const estado = verde ? 'Terminado' : 'En curso';
    const inicio = fecha(r.H), salida = fecha(r.K);
    const problemas = [];
    if (matches.length !== 1) problemas.push('Sin coincidencia única en Parque Vehicular');
    if (!inicio) problemas.push('Fecha de ingreso faltante o inválida');
    if (salida && inicio && salida < inicio) problemas.push('Fecha de salida anterior al ingreso');
    if (!['Preventivo', 'Correctivo'].includes(r.D)) problemas.push('Tipo de movimiento inválido: ' + (r.D || 'vacío'));
    if (!r.E || !r.G || !r.B) problemas.push('Faltan datos obligatorios');
    if ([764,768].includes(r.row)) problemas.push('Posible duplicado entre filas 764 y 768, con distinta fecha de salida');
    const notas = [rojo ? 'POSIBLE BAJA (fila roja del Excel; no es baja definitiva).' : '', verde && !salida ? 'Salida confirmada por color verde; fecha de salida no informada.' : '', `Origen: Movimientos taller electrico, Base de Datos, fila ${r.row}.`].filter(Boolean).join(' ');
    if (problemas.length) {
      pendientes.push({id:uuid('pendiente:' + r.row),clave_origen:'movimientos-electrico-20260906:fila:' + r.row,area:'Electricas',numero_economico:r.A.toUpperCase(),unidad_descripcion:r.B || null,dependencia:r.C || null,tipo_movimiento:r.D || null,concepto:r.E || null,descripcion:r.F || null,taller_nombre:r.G?.trim() || null,fecha_ingreso:inicio,estatus:estado,fecha_salida:salida,observaciones:notas,motivo_revision:[rojo ? 'POSIBLE BAJA' : '',...problemas].filter(Boolean).join('; ')});
    } else {
      ingresos.push({id:uuid('ingreso:' + r.row),vehiculo_id:matches[0].id,numero_economico:r.A.toUpperCase(),unidad_descripcion:r.B,dependencia:r.C || matches[0].dependencia || null,tipo_movimiento:r.D,concepto:r.E,descripcion:[r.F,notas].filter(Boolean).join('\n\n'),taller_nombre:r.G.trim(),taller_ambito:normal(r.G).includes('interno')?'Interno':'Foráneo',fecha_ingreso:inicio,fecha_salida:verde?salida:null,estatus:estado,estatus_cotizacion:'No requerida'});
    }
    audit.push({fila:r.row,unidad:r.A,color:verde?'verde':rojo?'rojo':'sin relleno de fila',destino:problemas.length?'pendientes':'ingresos',motivos:problemas});
  }
  const abiertos = ingresos.filter(i => i.estatus !== 'Terminado');
  if (new Set(abiertos.map(i => i.vehiculo_id)).size !== abiertos.length) throw new Error('Más de un ingreso abierto por unidad');
  write('plan-ingresos.json', ingresos); write('plan-pendientes.json', pendientes); write('auditoria.json', audit);
  const summary = {filas:rows.length,ingresos:ingresos.length,terminados:ingresos.length-abiertos.length,en_taller:abiertos.length,pendientes:pendientes.length,posibles_bajas:pendientes.filter(p=>p.motivo_revision.includes('POSIBLE BAJA')).length};
  write('resumen.json', summary); console.log(JSON.stringify(summary));
  if (!process.argv.includes('--apply')) return;
  const config = fs.readFileSync(path.resolve(__dirname, '../js/core/supabase.js'), 'utf8');
  const url = config.match(/const SUPABASE_URL = "([^"]+)"/)[1], key = config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
  const headers = {apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  async function request(table, query = '', options = {}) {
    const res = await fetch(`${url}/rest/v1/${table}${query}`, {headers,...options});
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const text = await res.text();return text ? JSON.parse(text) : null;
  }
  async function all(table) {
    const data=[];for(let n=0;;n+=1000){const page=await request(table,`?select=*&order=id&offset=${n}&limit=1000`);data.push(...page);if(page.length<1000)return data;}
  }
  for (const [table, plan] of [['ingresos_taller', ingresos],['ingresos_taller_pendientes',pendientes]]) {
    const existing = await all(table);
    const ids = new Set(plan.map(i=>i.id));
    if(existing.some(i=>!ids.has(i.id))) throw new Error('Hay registros ajenos al plan; se requiere volver a conciliar antes de importar');
    const existingIds=new Set(existing.map(i=>i.id));
    // Insertar salidas antes que ingresos abiertos para que el trigger deje la disponibilidad actual correcta.
    const pending=plan.filter(i=>!existingIds.has(i.id)).sort((a,b)=>(a.estatus==='Terminado'?0:1)-(b.estatus==='Terminado'?0:1));
    for(let n=0;n<pending.length;n+=100) await request(table,'',{method:'POST',body:JSON.stringify(pending.slice(n,n+100))});
    const after=await all(table);
    if(after.length!==plan.length)throw new Error('Conteo final incorrecto: '+table);
    for(const expected of plan){const actual=after.find(a=>a.id===expected.id);if(!actual||Object.entries(expected).some(([k,v])=>actual[k]!==v))throw new Error('Verificación falló: '+expected.id);}
    write('after-'+table+'.json', after);
    console.log(table+': '+pending.length+' insertados; '+after.length+' verificados');
  }
  const afterUnits=await all('parque_vehicular');
  for(const unitId of new Set(ingresos.map(i=>i.vehiculo_id))){const expected=abiertos.some(i=>i.vehiculo_id===unitId)?'EN TALLER':'DISPONIBLE';if(afterUnits.find(u=>u.id===unitId)?.disponibilidad!==expected)throw new Error('Disponibilidad incorrecta: '+unitId);}
  console.log('Disponibilidad de todas las unidades importadas verificada.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
