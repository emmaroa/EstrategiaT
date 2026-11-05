const fs = require('node:fs');
const path = require('node:path');
const config = fs.readFileSync(path.join(__dirname, '../js/core/supabase.js'), 'utf8');
const url = config.match(/const SUPABASE_URL = "([^"]+)"/)[1];
const key = config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
async function request(query, options = {}) {
  const response = await fetch(url + '/rest/v1/importaciones_siif?' + new URLSearchParams(query), {
    ...options, headers: {apikey:key, 'Content-Type':'application/json', Prefer:'return=representation'}, signal:AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + await response.text());
  return response.json();
}
(async () => {
  const pendientes = await request({select:'*',estado:'eq.Procesando',order:'created_at'});
  const dir = path.join(__dirname, '../imports/cancelacion-siif-' + new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir,'antes.json'), JSON.stringify(pendientes,null,2));
  console.log(JSON.stringify({pendientes:pendientes.length,directorio:dir}));
  if (!process.argv.includes('--apply')) return;
  const resultados = [];
  for (const fila of pendientes) {
    const rows = await request({id:'eq.'+fila.id,estado:'eq.Procesando'}, {method:'PATCH',body:JSON.stringify({
      estado:'Fallida', detalle_errores:[...(fila.detalle_errores || []), {error:'Cancelada por solicitud del usuario. Se conservan los datos ya guardados; los contadores históricos pueden no reflejar escrituras anteriores al cierre.',cancelada:true,fecha:new Date().toISOString()}]
    })});
    resultados.push(...rows);
    fs.writeFileSync(path.join(dir,'canceladas.json'),JSON.stringify(resultados,null,2));
  }
  const restantes = await request({select:'id',estado:'eq.Procesando'});
  console.log(JSON.stringify({cerradas:resultados.length,pendientes:restantes.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
