// Los argumentos ya están limitados a las áreas autorizadas del coordinador.
function calcularIndicadoresTaller(unidades, ingresos, pendientes, hoy = new Date()) {
  const fecha = valor => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) return null;
    const n = Date.parse(valor + 'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0,10) === valor ? n : null;
  };
  const corteTexto = [hoy.getFullYear(), String(hoy.getMonth()+1).padStart(2,'0'), String(hoy.getDate()).padStart(2,'0')].join('-');
  const corte = fecha(corteTexto), mes = corteTexto.slice(0,7);
  const ids = new Set(unidades.map(u=>u.id));
  const vigentes = new Set(unidades.filter(u=>String(u.estatus||" ").trim().toUpperCase()!=="BAJA").map(u=>u.id));
  const registros = ingresos.filter(i=>ids.has(i.vehiculo_id));
  const abiertos = registros.filter(i=>i.estatus !== 'Terminado' && vigentes.has(i.vehiculo_id));
  const ocupadas = new Set(abiertos.map(i=>i.vehiculo_id));
  const rangos = [0,0,0,0];
  let sinFecha = 0;
  const inicios = new Map();
  abiertos.forEach(i=>{
    const n = fecha(i.fecha_ingreso);
    if (!inicios.has(i.vehiculo_id)) inicios.set(i.vehiculo_id,null);
    if (n !== null && n <= corte && (inicios.get(i.vehiculo_id) === null || n < inicios.get(i.vehiculo_id))) inicios.set(i.vehiculo_id,n);
  });
  inicios.forEach(n=>{if(n===null){sinFecha++;return;}const dias=(corte-n)/86400000;rangos[dias<=7?0:dias<=15?1:dias<=30?2:3]++;});
  const validos = registros.filter(i=>{
    const a=fecha(i.fecha_ingreso),b=fecha(i.fecha_salida);
    return i.estatus==='Terminado' && a!==null && b!==null && b>=a && b<=corte;
  });
  const grupos=new Map();
  validos.forEach(i=>{
    const nombre=(i.taller_nombre||'Sin proveedor').trim();
    const key=nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()+'|'+i.tipo_movimiento;
    if(!grupos.has(key))grupos.set(key,{proveedor:nombre,tipo:i.tipo_movimiento,dias:[]});
    grupos.get(key).dias.push((fecha(i.fecha_salida)-fecha(i.fecha_ingreso))/86400000);
  });
  const proveedores=Array.from(grupos.values()).map(g=>{
    g.dias.sort((a,b)=>a-b);const n=g.dias.length,m=Math.floor(n/2);
    return {proveedor:g.proveedor,tipo:g.tipo,servicios:n,mediana:n%2?g.dias[m]:(g.dias[m-1]+g.dias[m])/2};
  }).sort((a,b)=>a.proveedor.localeCompare(b.proveedor,'es')||a.tipo.localeCompare(b.tipo));
  const ingresosMes=registros.filter(i=>{const n=fecha(i.fecha_ingreso);return n!==null&&n<=corte&&i.fecha_ingreso.startsWith(mes);});
  const reingresos=new Set();
  ingresosMes.forEach(i=>{
    const inicio=fecha(i.fecha_ingreso);
    // Mismo día no permite distinguir una nueva visita de trabajos simultáneos.
    if(validos.some(p=>p.vehiculo_id===i.vehiculo_id&&fecha(p.fecha_ingreso)<inicio&&fecha(p.fecha_salida)<inicio&&inicio-fecha(p.fecha_salida)<30*86400000)) reingresos.add(i.vehiculo_id);
  });
  return {total:vigentes.size,disponibles:vigentes.size-ocupadas.size,ingresosMes:ingresosMes.length,
    salidasMes:validos.filter(i=>i.fecha_salida.startsWith(mes)).length,rangos,sinFecha,proveedores,
    omitidos:registros.filter(i=>i.estatus==='Terminado').length-validos.length,
    reingresos:reingresos.size,pendientes:pendientes.length};
}

function renderizarIndicadoresTaller() {
  const k=calcularIndicadoresTaller(unidadesTaller,ingresosTaller,pendientesTaller);
  const texto=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  texto('kpiDisponibilidadArea',k.total?(100*k.disponibles/k.total).toFixed(1)+'%':'Sin unidades');
  texto('detalleDisponibilidadArea',`${k.disponibles} de ${k.total} unidades sin ingreso abierto`);
  texto('kpiIngresosMes',k.ingresosMes);texto('kpiSalidasMes',k.salidasMes);
  texto('kpiReingresosMes',k.reingresos);texto('kpiPendientesArea',k.pendientes);
  k.rangos.forEach((n,i)=>texto('permanenciaRango'+i,n));
  texto('permanenciaSinFecha',k.sinFecha?`${k.sinFecha} unidades sin fecha de ingreso válida.`:'');
  texto('reparacionesOmitidas',`${k.omitidos} servicios terminados excluidos por fechas faltantes, inválidas o futuras.`);
  const tabla=document.getElementById('tablaTiempoProveedor');
  if(tabla)tabla.innerHTML=k.proveedores.length?k.proveedores.map(p=>`<tr><td>${escTaller(p.proveedor)}</td><td>${escTaller(nombreMovimientoTaller(p.tipo))}</td><td>${p.servicios}</td><td>${p.mediana.toLocaleString('es-MX')} días</td></tr>`).join(''):'<tr><td colspan="4">Sin servicios concluidos con fechas válidas.</td></tr>';
}
