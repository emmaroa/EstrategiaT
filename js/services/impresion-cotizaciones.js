(function(root) {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dinero = n => (n/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const celda = n => '<td class="importe">'+dinero(n)+'</td>';
  function generar(r, f, actualizado, omitidos) {
    const claves = r.claves.filter(c=>c!=='Otras / sin clave' || r.detalle.some(d=>!['26102','29601','29801'].includes(d.partida)));
    const filtros = [['Periodo',(f.desde || 'Sin fecha inicial')+' al '+(f.hasta || 'Sin fecha final')],['Proveedor',f.proveedor || 'Todos los proveedores'],['Dependencia',f.dependencia || 'Todas las dependencias'],['Partida',f.partida || 'Todas las partidas']];
    return '<header class="imp-cabecera"><p class="imp-marca">ESTRATEGIAT · ADMINISTRACIÓN DE TALLERES</p><h1>Reporte de cotizaciones pendientes</h1><p class="imp-fecha">Datos actualizados: '+esc(actualizado)+' · Moneda: MXN</p></header>'+
      '<table class="imp-filtros"><tbody>'+filtros.map(([k,v])=>'<tr><th>'+k+'</th><td>'+esc(v)+'</td></tr>').join('')+'</tbody></table>'+
      '<section class="imp-resumen"><div><span>DEUDA TOTAL</span><strong>'+dinero(r.total)+'</strong></div><p>'+r.detalle.length+' cotizaciones <span> / </span> '+r.proveedores.length+' proveedores <span> / </span> '+r.dependencias.length+' dependencias</p></section>'+
      '<section class="imp-seccion"><h2>01 <span>Deuda por dependencia y partida</span></h2><table class="imp-tabla imp-dependencias"><colgroup><col style="width:35%">'+claves.map(()=>'<col>').join('')+'<col></colgroup><thead><tr><th>Dependencia</th>'+claves.map(c=>'<th class="importe">'+esc(c)+'</th>').join('')+'<th class="importe">Total</th></tr></thead><tbody>'+r.dependencias.map(d=>'<tr><th scope="row">'+esc(d.nombre)+'</th>'+claves.map(c=>celda(d.claves[c])).join('')+celda(d.total)+'</tr>').join('')+(r.dependencias.length?'':'<tr><td colspan="'+(claves.length+2)+'">Sin cotizaciones para los filtros seleccionados.</td></tr>')+'</tbody><tfoot><tr><th>Total general</th>'+claves.map(c=>celda(r.totales[c])).join('')+celda(r.total)+'</tr></tfoot></table><p class="imp-leyenda">26102 · Aceites y aditivos &nbsp; | &nbsp; 29601 · Vehículos pequeños &nbsp; | &nbsp; 29801 · Camiones, maquinaria y material eléctrico</p></section>'+
      '<section class="imp-seccion"><h2>02 <span>Deuda por proveedor</span></h2><table class="imp-tabla"><colgroup><col style="width:65%"><col style="width:15%"><col style="width:20%"></colgroup><thead><tr><th>Proveedor</th><th class="importe">Cotizaciones</th><th class="importe">Total</th></tr></thead><tbody>'+r.proveedores.map(p=>'<tr><th scope="row">'+esc(p.nombre)+'</th><td class="importe">'+p.cantidad+'</td>'+celda(p.total)+'</tr>').join('')+(r.proveedores.length?'':'<tr><td colspan="3">Sin proveedores para los filtros seleccionados.</td></tr>')+'</tbody><tfoot><tr><th>Total general</th><td class="importe">'+r.detalle.length+'</td>'+celda(r.total)+'</tr></tfoot></table></section>'+
      '<footer class="imp-notas"><strong>Criterio del reporte.</strong> Cotizaciones sin requisición; se excluyen las rechazadas y las que tienen estatus Requisición generada. Se usa la fecha de cotización o, si falta, la de entrega. El importe no representa un saldo conciliado de pagos.'+(omitidos?' Se omitieron '+omitidos+' registros con importe inválido.':'')+'</footer>';
  }
  root.ETImpresionCotizaciones = {generar};
  if(typeof module!=='undefined')module.exports=root.ETImpresionCotizaciones;
})(typeof window!=='undefined'?window:globalThis);
