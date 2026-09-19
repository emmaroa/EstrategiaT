const fs = require('node:fs'), path = require('node:path');
const catalogo = require('../js/services/dependencias-cotizaciones.js');
const root = path.resolve(__dirname, '..');
const normal = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const config = fs.readFileSync(path.join(root, 'js/core/supabase.js'), 'utf8');
const url = config.match(/const SUPABASE_URL = "([^"]+)"/)[1];
const key = config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
async function request(table, query, options = {}) {
  const response = await fetch(url + '/rest/v1/' + table + '?' + new URLSearchParams(query), {
    ...options, headers: {apikey:key, 'Content-Type':'application/json', Prefer:'return=representation'}, signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + await response.text());
  return response.json();
}
async function all(table) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await request(table, {select:'*',order:'id',limit:'1000',offset:String(offset)});
    rows.push(...page); if (page.length < 1000) return rows;
  }
}
async function main() {
  const [cotizaciones, unidades] = await Promise.all([all('cotizaciones_almacen'), all('parque_vehicular')]);
  const dir = path.join(root, 'imports', 'cotizaciones-clasificacion-' + new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(dir, {recursive:true});
  const save = (name, value) => fs.writeFileSync(path.join(dir,name + '.json'), JSON.stringify(value,null,2));
  save('antes-cotizaciones', cotizaciones); save('antes-unidades', unidades);
  const plan = [], revision = [];
  const deducir = process.argv.includes('--deducir') ? require('./deducir-dependencias-cotizaciones.js').prepararDeduccion(cotizaciones, unidades) : null;
  for (const cotizacion of cotizaciones) {
    if (process.argv.includes('--dependencia-economico')) {
      const clave = normal(cotizacion.unidad);
      const stock = /^(0|stock)$/i.test(String(cotizacion.unidad ?? '').trim());
      let matches = !stock && clave ? unidades.filter(u => normal(u.numero_economico) === clave) : [];
      if (!matches.length && !stock && clave) matches = unidades.filter(u => [u.numero_inventario,u.unidad_patrulla].some(v => normal(v) === clave));
      const unidad = matches.length === 1 ? matches[0] : null;
      const nombre = String(unidad?.dependencia || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
      const equivalencias = {'SEGURIDAD PUBLICA':'09', 'DIRECCION GRAL DE ORDENAMIENTO Y DESARROLLO URBANO':'46'};
      const dependencia = stock ? catalogo.clasificarCompleta(cotizacion, null).dependencia : unidad ? catalogo.resolver(equivalencias[nombre] || unidad.dependencia) : '';
      if (!dependencia) revision.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,dependencia:cotizacion.dependencia,motivos:[matches.length > 1 ? 'Número económico ambiguo' : unidad ? 'Dependencia sin equivalencia en catálogo' : 'Número económico no encontrado']});
      else if (cotizacion.dependencia !== dependencia) plan.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,cambios:{dependencia},motivo:stock ? 'Criterio 11/09 para stock' : 'Dependencia por número económico'});
      continue;
    }
    if (process.argv.includes('--completar-todas')) {
      const clave = normal(cotizacion.unidad);
      const matches = !['','stock','0','sn'].includes(clave) ? unidades.filter(u=>[u.numero_economico,u.numero_inventario,u.unidad_patrulla].some(v=>normal(v)===clave)) : [];
      const resultado = catalogo.clasificarCompleta(cotizacion, matches.length===1 ? matches[0] : null);
      const cambios = {};
      if (resultado.dependencia && cotizacion.dependencia !== resultado.dependencia) cambios.dependencia = resultado.dependencia;
      if (!resultado.dependencia) revision.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,motivos:['Verificar número económico y dependencia del parque vehicular']});
      if (cotizacion.partida !== resultado.partida) cambios.partida = resultado.partida;
      if (Object.keys(cambios).length) plan.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,cambios,motivo:resultado.motivo,inferenciaGeneral:resultado.inferenciaGeneral});
      continue;
    }
    if (deducir) {
      const resultado = deducir(cotizacion);
      if (resultado.dependencia) plan.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,cambios:{dependencia:resultado.dependencia},motivo:resultado.motivo});
      else if (!resultado.omitir) revision.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,dependencia:cotizacion.dependencia,partida:cotizacion.partida,motivos:[resultado.motivo]});
      continue;
    }
    const regla = catalogo.reglaServiciosPublicos(cotizacion);
    if (regla) {
      const cambios = {};
      if (cotizacion.dependencia !== regla.dependencia) cambios.dependencia = regla.dependencia;
      if (cotizacion.partida !== regla.partida) cambios.partida = regla.partida;
      if (Object.keys(cambios).length) plan.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,cambios,motivo:regla.motivo});
      continue;
    }
    if (process.argv.includes('--solo-regla11')) continue;
    const clave = normal(cotizacion.unidad);
    const claves = u => [u.numero_economico,u.numero_inventario,u.unidad_patrulla].map(normal).filter(Boolean);
    let coincidencias = clave && !['0','stock'].includes(clave) ? unidades.filter(u => claves(u).includes(clave)) : [];
    if (!coincidencias.length && clave.length >= 2 && !['0','stock'].includes(clave)) coincidencias = unidades.filter(u => claves(u).some(c => c.endsWith(clave)));
    const unidad = coincidencias.length === 1 ? coincidencias[0] : null;
    const cambios = {}, motivos = [];
    if (unidad) {
      const dependencia = catalogo.resolver(unidad.dependencia);
      if (!dependencia) motivos.push('Dependencia de la unidad sin equivalencia en el listado: ' + (unidad.dependencia || 'vacía'));
      else if (dependencia !== cotizacion.dependencia) cambios.dependencia = dependencia;
    } else motivos.push(coincidencias.length > 1 ? 'Unidad ambigua' : 'Unidad no encontrada');
    const resultado = catalogo.clasificarPartida(unidad, cotizacion.materiales);
    if (resultado.partida) { if (resultado.partida !== cotizacion.partida) cambios.partida = resultado.partida; }
    else motivos.push(resultado.motivo);
    if (Object.keys(cambios).length) plan.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,cambios});
    if (motivos.length) revision.push({id:cotizacion.id,folio:cotizacion.folio,unidad:cotizacion.unidad,dependencia:cotizacion.dependencia,partida:cotizacion.partida,motivos});
  }
  save('plan',plan); save('revision',revision);
  const resumen = {registros:cotizaciones.length,porActualizar:plan.length,dependencias:plan.filter(p=>p.cambios.dependencia).length,partidas:plan.filter(p=>p.cambios.partida).length,porRevisar:revision.length,directorio:dir};
  console.log(JSON.stringify(resumen)); save('resumen',resumen);
  if (process.argv.includes('--diagnose')) {
    const original = cotizaciones.find(c=>c.id === plan[0].id);
    for (const campo of ['unidad','dependencia','partida','updated_at','materiales','observaciones']) {
      const valor = original[campo];
      const filtro = valor == null ? 'is.null' : 'eq.' + (typeof valor === 'object' ? JSON.stringify(valor) : String(valor));
      const rows = await request('cotizaciones_almacen',{select:'id',id:'eq.'+original.id,[campo]:filtro});
      console.log(JSON.stringify({campo,coincidencias:rows.length}));
    }
    return;
  }
  if (!process.argv.includes('--apply')) return;
  const aplicados = [], conflictos = [];
  for (const cambio of plan) {
    const original = cotizaciones.find(c=>c.id === cambio.id);
    const query = {id:'eq.' + cambio.id};
    // Comparar los datos de origen para no sobrescribir ediciones concurrentes.
    for (const campo of ['unidad','dependencia','partida','updated_at','materiales','observaciones']) {
      const valor = original[campo];
      query[campo] = valor == null ? 'is.null' : 'eq.' + (typeof valor === 'object' ? JSON.stringify(valor) : String(valor));
    }
    const rows = await request('cotizaciones_almacen',query,{method:'PATCH',body:JSON.stringify(cambio.cambios)});
    if (rows.length !== 1) conflictos.push(cambio.id);
    else aplicados.push(cambio);
    save('aplicados',aplicados); save('conflictos',conflictos);
  }
  const despues = await all('cotizaciones_almacen'); save('despues-cotizaciones',despues);
  for (const cambio of aplicados) {
    const actual = despues.find(c=>c.id === cambio.id);
    for (const [campo,valor] of Object.entries(cambio.cambios)) if (actual?.[campo] !== valor) throw new Error('No se verificó ' + cambio.id + ': ' + campo);
  }
  console.log(JSON.stringify({actualizados:aplicados.length,conflictos:conflictos.length,verificados:true}));
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
