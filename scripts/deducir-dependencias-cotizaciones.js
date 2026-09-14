const catalogo = require('../js/services/dependencias-cotizaciones.js');
const normal = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
function evidenciaTexto(c) {
  const notas = normal(c.observaciones);
  const presupuesto = notas.match(/carga presupuestal:\s*(\d{2})/);
  if (presupuesto && !['09','11'].includes(presupuesto[1])) return {conflicto:true,motivo:'Carga presupuestal de otra dependencia'};
  const texto = normal((c.materiales || []).map(m=>m.item).join(' ') + ' ' + notas);
  if (/\b(presidencia|infraestructura|bomberos|bomberas|oficialia mayor)\b/.test(notas) && !presupuesto) return {conflicto:true,motivo:'La descripción menciona otra dependencia'};
  const pesado = /\b(colector(?:es)?|recolector(?:es)?|maquinaria pesada|retroexcavadora|excavadora|motoconformadora|barredora|camion(?:es)?|trailer|dompe|toma de fuerza)\b/.test(texto);
  const ligero = /area:\s*gasolina\b|\b(tsuru|tsubame|spark|beat|sonic|sedan|cherokee|frontier|np300|hilux|silverado|cheyenne|suburban|caravan|pick[ -]?up)\b/.test(texto);
  const codigos = new Set([...(pesado?['11']:[]),...(ligero?['09']:[]),...(presupuesto?[presupuesto[1]]:[])]);
  if (codigos.size > 1) return {conflicto:true,motivo:'Indicios de categorías distintas'};
  if (!codigos.size) return null;
  const codigo = [...codigos][0];
  return {codigo,motivo:presupuesto?'Código de carga presupuestal en observaciones':pesado?'Descripción de equipo pesado/colector':'Área de gasolina o modelo de vehículo ligero'};
}
function prepararDeduccion(cotizaciones, unidades) {
  const referencias = new Map();
  for (const c of cotizaciones) {
    const e = evidenciaTexto(c);
    if (!e?.codigo) continue;
    for (const m of c.materiales || []) {
      const item = normal(m.item);
      // Exigir una referencia específica de refacción; excluir consumibles universales.
      if (!/\b(filtro|balero|valvula|llanta|reten)\b/.test(item) || !/\d/.test(item)) continue;
      if (!referencias.has(item)) referencias.set(item,new Set());
      referencias.get(item).add(e.codigo);
    }
  }
  return function deducir(c) {
    if (catalogo.resolver(c.dependencia)) return {omitir:true};
    let evidencia = evidenciaTexto(c);
    if (evidencia?.conflicto) return evidencia;
    if (!evidencia) {
      const clave = normal(c.unidad).replace(/[^a-z0-9]/g,'');
      const matches = !['','0','stock','sn'].includes(clave) ? unidades.filter(u=>[u.numero_economico,u.numero_inventario,u.unidad_patrulla].some(v=>normal(v).replace(/[^a-z0-9]/g,'')===clave)) : [];
      if (matches.length === 1) {
        const partida = catalogo.clasificarPartida(matches[0], []).partida;
        if (partida === '29801' || partida === '29601') evidencia = {codigo:partida==='29801'?'11':'09',motivo:'Tipo de unidad identificado en parque vehicular'};
      }
    }
    if (!evidencia) {
      const codigos = new Set();
      for (const m of c.materiales || []) for (const codigo of referencias.get(normal(m.item)) || []) codigos.add(codigo);
      if (codigos.size===1) evidencia={codigo:[...codigos][0],motivo:'Misma descripción/referencia que otra cotización con categoría identificada'};
      else if(codigos.size>1) return {conflicto:true,motivo:'Refacciones presentes en categorías distintas'};
    }
    return evidencia ? {...evidencia,dependencia:catalogo.resolver(evidencia.codigo)} : {motivo:'Refacción genérica o sin evidencia suficiente'};
  };
}
module.exports = {prepararDeduccion,evidenciaTexto};
