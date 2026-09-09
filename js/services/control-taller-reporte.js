function iniciarReporteTaller(){
  const hoy=fechaIsoLocal();
  document.getElementById('reporteDesde').value=hoy.slice(0,7)+'-01';
  document.getElementById('reporteHasta').value=hoy;
  document.getElementById('verReporteTaller').addEventListener('click',generarReporteTaller);
  document.getElementById('imprimirReporteTaller').addEventListener('click',()=>generarReporteTaller(true));
}
function opcionesReporteTaller(){
  for(const [id,campo] of [['reporteProveedor','taller_nombre'],['reporteDependencia','dependencia']]){
    const select=document.getElementById(id),previo=select.value;
    const valores=[...new Set([...ingresosTaller,...pendientesTaller,...(campo==='dependencia'?unidadesTaller:[])].map(i=>i[campo]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    select.innerHTML='<option value="">Todos</option>'+valores.map(v=>`<option value="${escTaller(v)}">${escTaller(v)}</option>`).join('');
    select.value=valores.includes(previo)?previo:'';
  }
}
function datosReporteTaller(unidades,ingresos,pendientes,filtros){
  const ids=new Set(unidades.map(u=>u.id));
  const coincide=i=>(!filtros.proveedor||i.taller_nombre===filtros.proveedor)&&(!filtros.dependencia||i.dependencia===filtros.dependencia);
  const registros=ingresos.filter(i=>ids.has(i.vehiculo_id)&&coincide(i));
  const valida=f=>/^\d{4}-\d{2}-\d{2}$/.test(f||'')&&Number.isFinite(Date.parse(f))&&new Date(f).toISOString().slice(0,10)===f;
  const enPeriodo=f=>valida(f)&&f>=filtros.desde&&f<=filtros.hasta;
  const vigentes=new Set(unidades.filter(u=>String(u.estatus||'').trim().toUpperCase()!=='BAJA').map(u=>u.id));
  const abiertos=registros.filter(i=>i.estatus!=='Terminado'&&vigentes.has(i.vehiculo_id));
  const concluidos=registros.filter(i=>i.estatus==='Terminado'&&enPeriodo(i.fecha_salida)&&valida(i.fecha_ingreso)&&i.fecha_salida>=i.fecha_ingreso);
  const asignadas=unidades.filter(u=>vigentes.has(u.id)&&(!filtros.dependencia||u.dependencia===filtros.dependencia));
  const grupos=new Map();
  abiertos.forEach(i=>{const d=i.dependencia||'Sin dependencia';if(!grupos.has(d))grupos.set(d,new Set());grupos.get(d).add(i.vehiculo_id);});
  return {asignadas:asignadas.length,abiertos,concluidos,entradas:registros.filter(i=>enPeriodo(i.fecha_ingreso)).length,
    sinFechaSalida:registros.filter(i=>i.estatus==='Terminado'&&!i.fecha_salida).length,
    pendientes:pendientes.filter(coincide),dependencias:Array.from(grupos,([nombre,ids])=>({nombre,total:ids.size})).sort((a,b)=>b.total-a.total)};
}
function generarReporteTaller(imprimir=false){
  const filtros={desde:document.getElementById('reporteDesde').value,hasta:document.getElementById('reporteHasta').value,proveedor:document.getElementById('reporteProveedor').value,dependencia:document.getElementById('reporteDependencia').value};
  const error=document.getElementById('errorReporteTaller');
  if(!filtros.desde||!filtros.hasta||filtros.desde>filtros.hasta||filtros.hasta>fechaIsoLocal()){error.textContent='Selecciona fechas válidas: inicio anterior al fin y fin no posterior a hoy.';return;}
  error.textContent='';
  const d=datosReporteTaller(unidadesTaller,ingresosTaller,pendientesTaller,filtros),e=escTaller;
  const prioritarios=d.abiertos.filter(i=>diasEnTaller(i)>30||estadoVisualTaller(i).clase==='baja'||['Pendiente','Solicitada'].includes(i.estatus_cotizacion));
  const bajasPendientes=d.pendientes.filter(i=>estadoVisualTaller(i).clase==='baja');
  const filas=(lista,prioridad=false)=>lista.map(i=>`<tr><td>${e(i.numero_economico)}</td><td>${e(i.dependencia)}</td><td>${e(i.taller_nombre)}</td><td>${e(i.concepto)}</td><td>${e(formatearFechaTaller(i.fecha_ingreso))}</td><td>${e(diasEnTaller(i)??'Sin fecha')}</td><td>${e(estadoVisualTaller(i).etiqueta)}${prioridad?'<br>'+e([diasEnTaller(i)>30?'Más de 30 días':'', ['Pendiente','Solicitada'].includes(i.estatus_cotizacion)?'Cotización '+i.estatus_cotizacion.toLowerCase():''].filter(Boolean).join(' · ')):''}</td><td>${e(formatearFechaTaller(i.fecha_salida))}</td></tr>`).join('');
  const tabla=(titulo,lista,prioridad=false)=>`<h2>${titulo} (${lista.length})</h2>${lista.length?'<table><thead><tr><th>Unidad</th><th>Dependencia</th><th>Proveedor</th><th>Falla / concepto</th><th>Ingreso</th><th>Días</th><th>Estatus / seguimiento</th><th>Salida</th></tr></thead><tbody>'+filas(lista,prioridad)+'</tbody></table>':'<p>Sin registros.</p>'}`;
  const max=Math.max(1,...d.dependencias.map(x=>x.total));
  const usuario=usuarioTaller();
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte de situación del taller</title><style>
  *{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#17212b;margin:24px;background:white}h1{font-size:23px;margin-bottom:8px}h2{font-size:17px;margin:24px 0 10px;break-after:avoid}p{line-height:1.5}small{color:#444}.resumen{display:flex;gap:20px;flex-wrap:wrap;padding:14px;border:1px solid #bbb}.resumen b{display:block;font-size:22px}table{border-collapse:collapse;width:100%;font-size:11px;table-layout:fixed}th,td{border:1px solid #bbb;text-align:left;padding:6px;overflow-wrap:anywhere;vertical-align:top}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid}.grafica{max-width:650px;margin-bottom:12px;break-inside:avoid}.barra{height:8px;background:#c2410c;border:1px solid #333;margin-top:5px}footer{margin-top:24px;border-top:1px solid #aaa;padding-top:8px;font-size:11px}@page{size:A4 landscape;margin:12mm}@media print{body{margin:0}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><h1>Reporte de situación del taller</h1>
  <p><b>Responsable:</b> ${e(usuario?.nombre||usuario?.usuario||'Usuario')} · <b>Áreas:</b> ${e(accesoGlobalControl?'Todas':areasControl.join(', '))}<br><b>Corte actual:</b> ${e(new Date().toLocaleString('es-MX'))}<br><b>Periodo de movimientos:</b> ${e(formatearFechaTaller(filtros.desde))} al ${e(formatearFechaTaller(filtros.hasta))}<br><b>Proveedor:</b> ${e(filtros.proveedor||'Todos')} · <b>Dependencia:</b> ${e(filtros.dependencia||'Todas')}</p>
  <div class="resumen"><div><b>${d.asignadas}</b>Unidades asignadas al área/dependencia</div><div><b>${new Set(d.abiertos.map(i=>i.vehiculo_id)).size}</b>Unidades en taller hoy</div><div><b>${d.entradas}</b>Ingresos del periodo</div><div><b>${d.concluidos.length}</b>Servicios concluidos del periodo</div></div>
  <p><small>El periodo aplica a ingresos y salidas. Las unidades en taller, la gráfica y las prioridades reflejan el estado actual. El total asignado corresponde al parque del área/dependencia y no cambia por proveedor. Los pendientes no se cuentan como ingresos.</small></p>
  <h2>Unidades en taller por dependencia</h2>${d.dependencias.map(x=>`<div class="grafica">${e(x.nombre)}: <b>${x.total}</b><div class="barra" style="width:${100*x.total/max}%"></div></div>`).join('')||'<p>Sin unidades en taller.</p>'}
  ${tabla('Unidades actualmente en taller',d.abiertos)}${tabla('Casos prioritarios',prioritarios,true)}
  <h2>Posibles bajas pendientes de validar (${bajasPendientes.length})</h2>${bajasPendientes.length?'<ul>'+bajasPendientes.map(i=>`<li>${e(i.numero_economico)} · ${e(i.taller_nombre)} · ${e(i.motivo_revision)}</li>`).join('')+'</ul>':'<p>Sin registros.</p>'}
  ${tabla('Servicios concluidos del periodo',d.concluidos)}
  <footer>${d.pendientes.length} registros pendientes de completar. ${d.sinFechaSalida} servicios terminados sin fecha de salida excluidos del periodo. Fuente: Parque Vehicular y Control de Taller.</footer></body></html>`;
  const visor=document.getElementById('vistaReporteTaller');
  visor.hidden=false;
  visor.onload=()=>{if(imprimir===true){visor.contentWindow.focus();visor.contentWindow.print();}};
  visor.srcdoc=html;
}
