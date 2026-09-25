(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const controles = ['reporteProveedor','reporteDependencia','reportePartida','reporteDesde','reporteHasta'];
  let registros = [], resultado = null, cargando = false, omitidos = 0, actualizado = '';
  const dinero = centavos => (centavos/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const monto = n => '<td class="monto">'+dinero(n)+'</td>';
  function itemsCotizados(cotizacion) {
    return (Array.isArray(cotizacion.materiales) ? cotizacion.materiales : []).map(material => {
      const precio = material?.precio_unitario ?? material?.precio;
      const numero = Number(precio);
      const importe = precio != null && String(precio).trim() !== '' && Number.isFinite(numero) && numero >= 0
        ? dinero(Math.round(numero * 100)) : 'Sin precio';
      return (material?.cantidad ?? '') + ' × ' + (material?.item || 'Sin descripción') + ' — ' + importe + ' c/u';
    });
  }
  function filtros() { return {proveedor:$('reporteProveedor').value,dependencia:$('reporteDependencia').value,partida:$('reportePartida').value,desde:$('reporteDesde').value,hasta:$('reporteHasta').value}; }
  function contexto() {
    const f = filtros();
    return `Proveedor: ${f.proveedor || 'Todos'} · Dependencia: ${f.dependencia || 'Todas'} · Clave: ${f.partida || 'Todas'} · Desde: ${f.desde || 'Sin límite'} · Hasta: ${f.hasta || 'Sin límite'} · Actualizado: ${actualizado}`;
  }
  function renderizar() {
    if (cargando) return;
    try { resultado = ETReportesCotizaciones.calcular(registros,filtros()); }
    catch (error) { resultado=null; $('reporteImpresion').innerHTML=''; $('contenidoReporte').hidden=true; $('imprimirReporte').disabled=true; $('estadoReporte').textContent=error.message; return; }
    const r = resultado;
    $('contenidoReporte').hidden=false; $('imprimirReporte').disabled=false;
    $('filtrosReporte').textContent=contexto();
    const f = filtros();
    $('reporteImpresion').innerHTML=ETImpresionCotizaciones.generar(r,f,actualizado,omitidos);
    $('resumenFiltrosImpresion').innerHTML = [
      ['Proveedor', f.proveedor || 'Todos'], ['Dependencia', f.dependencia || 'Todas'],
      ['Clave', f.partida || 'Todas'], ['Periodo', (f.desde || 'Sin límite inicial') + ' — ' + (f.hasta || 'Sin límite final')],
      ['Datos actualizados', actualizado]
    ].map(([titulo,valor])=>'<div><dt>'+escape(titulo)+'</dt><dd>'+escape(valor)+'</dd></div>').join('');
    $('estadoReporte').textContent = `${r.detalle.length} cotizaciones incluidas.${omitidos ? ' '+omitidos+' cotizaciones omitidas por importe inválido.' : ''}${registros.some(r=>!r.fecha) ? ' Los registros sin fecha solo se incluyen al dejar ambas fechas vacías.' : ''}`;
    $('reporteTotal').textContent=dinero(r.total); $('reporteCantidad').textContent=r.detalle.length;
    $('reporteNumeroProveedores').textContent=r.proveedores.length; $('reporteNumeroDependencias').textContent=r.dependencias.length;
    $('reporteTablaDependencias').innerHTML=r.dependencias.map(d=>'<tr><th scope="row">'+escape(d.nombre)+'</th>'+r.claves.map(c=>monto(d.claves[c])).join('')+monto(d.total)+'</tr>').join('') || '<tr><td colspan="6">Sin deuda con estos filtros.</td></tr>';
    $('reporteTotalesDependencias').innerHTML='<tr><th scope="row">Total general</th>'+r.claves.map(c=>monto(r.totales[c])).join('')+monto(r.total)+'</tr>';
    $('reporteTablaProveedores').innerHTML=r.proveedores.map(p=>'<tr><th scope="row">'+escape(p.nombre)+'</th><td>'+p.cantidad+'</td>'+monto(p.total)+'</tr>').join('') || '<tr><td colspan="3">Sin proveedores con estos filtros.</td></tr>';
    $('reporteTotalesProveedores').innerHTML='<tr><th scope="row">Total general</th><td>'+r.detalle.length+'</td>'+monto(r.total)+'</tr>';
    $('reporteTablaDetalle').innerHTML=r.detalle.map(d=>'<tr>'+[d.folio,d.fecha || 'Sin fecha',d.proveedor,d.dependencia,d.partida,d.unidad].map(v=>'<td>'+escape(v)+'</td>').join('')+'<td>'+(itemsCotizados(d).map(escape).join('<br>') || 'Sin ítems registrados')+'</td>'+monto(d.centavos)+'</tr>').join('') || '<tr><td colspan="8">Sin cotizaciones con estos filtros.</td></tr>';
    $('reporteTotalesDetalle').innerHTML='<tr><th colspan="7" scope="row">Total general</th>'+monto(r.total)+'</tr>';
  }
  function opciones(id,campo,titulo) {
    const actual=$(id).value; $(id).replaceChildren(new Option(titulo,''));
    [...new Set(registros.map(r=>r[campo]))].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>$(id).add(new Option(v,v)));
    if ([...$(id).options].some(o=>o.value===actual)) $(id).value=actual;
  }
  async function cargar() {
    if(cargando)return;
    cargando=true;resultado=null; $('reporteImpresion').innerHTML=''; $('contenidoReporte').hidden=true;$('imprimirReporte').disabled=true;$('actualizarReporte').disabled=true;
    $('estadoReporte').textContent='Cargando todas las cotizaciones…';
    try {
      const rows=[];
      for(let desde=0;;desde+=1000) {
        const {data,error}=await window.supabaseClient.from('cotizaciones_almacen').select('id,folio,proveedor,dependencia,partida,fecha_cotizacion,fecha_entrega,unidad,total,materiales,requisicion,estatus').order('id',{ascending:true}).range(desde,desde+999);
        if(error)throw error;
        rows.push(...(data || []));if((data || []).length<1000)break;
      }
      const datos=ETReportesCotizaciones.preparar(rows,ETDependenciasCotizaciones.resolver);
      registros=datos.registros;omitidos=datos.omitidos;actualizado=new Date().toLocaleString('es-MX');
      opciones('reporteProveedor','proveedor','Todos los proveedores');opciones('reporteDependencia','dependencia','Todas las dependencias');opciones('reportePartida','partida','Todas las claves');
      cargando=false;renderizar();
    } catch(error) {
      registros=[];$('estadoReporte').textContent='No se pudo cargar el reporte. Pulsa Actualizar datos para intentar de nuevo.';console.error('Reportes Cotizaciones:',error);
    } finally {cargando=false;$('actualizarReporte').disabled=false;}
  }
  function exportar(tipo) {
    if(!resultado || cargando)return;
    const r=resultado;let filas;
    if(tipo==='dependencias') filas=[['Dependencia',...r.claves,'Total'],...r.dependencias.map(d=>[d.nombre,...r.claves.map(c=>d.claves[c]/100),d.total/100]),['Total general',...r.claves.map(c=>r.totales[c]/100),r.total/100]];
    else if(tipo==='proveedores') filas=[['Proveedor','Cotizaciones','Total'],...r.proveedores.map(p=>[p.nombre,p.cantidad,p.total/100]),['Total general',r.detalle.length,r.total/100]];
    else filas=[['Folio','Fecha','Proveedor','Dependencia','Clave','Unidad','Ítems cotizados (cantidad × descripción — precio unitario MXN)','Total'],...r.detalle.map(d=>[d.folio,d.fecha,d.proveedor,d.dependencia,d.partida,d.unidad,itemsCotizados(d).join('\n') || 'Sin ítems registrados',d.centavos/100]),['Total general','','','','','','',r.total/100]];
    const celda=v=>{let s=String(v??'');if(typeof v==='string'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const contenido=[['Reportes Cotizaciones'],[$('criterioReporte').textContent],[contexto()],['Importes en MXN'],[],...filas].map(f=>f.map(celda).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+contenido],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='reporte-cotizaciones-'+tipo+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let usuario=null;try{usuario=JSON.parse(localStorage.getItem('usuarioActivo')||'null');}catch(_){}
  validarPermiso('Gestión de Cotizaciones');
  if(!usuario || !window.ETPermissions?.puedeAcceder(usuario,'Gestión de Cotizaciones'))return;
  ETLayout.inicializar('Gestión de Cotizaciones');$('etModuleName').textContent='Reportes Cotizaciones';
  controles.forEach(id=>$(id).addEventListener('change',renderizar));
  $('limpiarReporte').addEventListener('click',()=>{controles.forEach(id=>$(id).value='');renderizar();});
  $('actualizarReporte').addEventListener('click',cargar);$('imprimirReporte').addEventListener('click',()=>{if(resultado&&!cargando)window.print();});
  document.querySelectorAll('[data-exportar]').forEach(btn=>btn.addEventListener('click',()=>exportar(btn.dataset.exportar)));
  cargar();
})();
