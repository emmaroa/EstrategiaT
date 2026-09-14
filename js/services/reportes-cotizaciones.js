(function(root) {
  'use strict';
  const normal = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const proveedor = v => String(v || '').trim().replace(/\s+/g,' ').toUpperCase() || 'SIN PROVEEDOR';
  function preparar(rows, resolver) {
    const ids = new Set(); let omitidos = 0;
    const registros = [];
    for (const row of rows) {
      if (row.id && ids.has(row.id)) continue;
      if (row.id) ids.add(row.id);
      if (normal(row.estatus) === 'rechazada' || String(row.requisicion || '').trim() || normal(row.estatus).includes('requisicion generada')) continue;
      const monto = Number(row.total);
      if (row.total == null || row.total === '' || !Number.isFinite(monto) || monto < 0) { omitidos++; continue; }
      registros.push({...row, proveedor:proveedor(row.proveedor), dependencia:resolver(row.dependencia) || String(row.dependencia || '').trim() || 'Sin dependencia', partida:String(row.partida || '').trim() || 'Sin clave', fecha:String(row.fecha_cotizacion || row.fecha_entrega || '').slice(0,10), centavos:Math.round(monto*100)});
    }
    return {registros, omitidos};
  }
  function calcular(registros, filtros = {}) {
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) throw new Error('La fecha Desde debe ser anterior o igual a Hasta.');
    const detalle = registros.filter(r => (!filtros.proveedor || r.proveedor === filtros.proveedor) && (!filtros.dependencia || r.dependencia === filtros.dependencia) && (!filtros.partida || r.partida === filtros.partida) && (!filtros.desde || r.fecha >= filtros.desde) && (!filtros.hasta || (r.fecha && r.fecha <= filtros.hasta)));
    const dependencias = new Map(), proveedores = new Map();
    const claves = ['26102','29601','29801','Otras / sin clave'];
    const totales = Object.fromEntries(claves.map(c=>[c,0])); let total = 0;
    for (const r of detalle) {
      const clave = claves.includes(r.partida) ? r.partida : 'Otras / sin clave';
      if (!dependencias.has(r.dependencia)) dependencias.set(r.dependencia,{nombre:r.dependencia,total:0,cantidad:0,claves:Object.fromEntries(claves.map(c=>[c,0]))});
      const d = dependencias.get(r.dependencia); d.claves[clave]+=r.centavos; d.total+=r.centavos; d.cantidad++;
      if (!proveedores.has(r.proveedor)) proveedores.set(r.proveedor,{nombre:r.proveedor,total:0,cantidad:0});
      const p = proveedores.get(r.proveedor); p.total+=r.centavos; p.cantidad++;
      totales[clave]+=r.centavos; total+=r.centavos;
    }
    return {detalle,dependencias:[...dependencias.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')),proveedores:[...proveedores.values()].sort((a,b)=>b.total-a.total || a.nombre.localeCompare(b.nombre,'es')),claves,totales,total};
  }
  root.ETReportesCotizaciones = {preparar,calcular};
  if (typeof module !== 'undefined') module.exports = root.ETReportesCotizaciones;
})(typeof window !== 'undefined' ? window : globalThis);
