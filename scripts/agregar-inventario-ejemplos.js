const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ejemplos = [
  ['Filtro de aceite', 'PZA'], ['Filtro de aire', 'PZA'],
  ['Filtro de combustible', 'PZA'], ['Aceite de motor 15W-40', 'L'],
  ['Anticongelante', 'L'], ['Líquido de frenos DOT 4', 'L'],
  ['Balatas delanteras', 'JGO'], ['Bujía de encendido', 'PZA'],
  ['Banda de accesorios', 'PZA'], ['Batería automotriz 12 V', 'PZA'],
  ['Foco automotriz H4', 'PZA'], ['Fusible automotriz 15 A', 'PZA'],
  ['Limpiaparabrisas', 'JGO'], ['Grasa multipropósito', 'KG'],
  ['Guantes de trabajo', 'PAR']
].map(([nombre, unidad_medida], index) => ({
  codigo: `EJEMPLO-${String(index + 1).padStart(3, '0')}`,
  nombre: `[EJEMPLO] ${nombre}`, unidad_medida,
  stock_actual: 0, stock_minimo: 0, stock_maximo: 0,
  costo_unitario: 0, activo: true
}));

async function main() {
  const config = fs.readFileSync(path.join(root, 'js/core/supabase.js'), 'utf8');
  const url = config.match(/const SUPABASE_URL = "([^"]+)"/)[1];
  const key = config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const query = '?select=id,codigo,nombre,stock_actual&codigo=in.(' + ejemplos.map(e => e.codigo).join(',') + ')';
  async function request(suffix, options = {}) {
    const response = await fetch(url + '/rest/v1/inventario' + suffix, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    return response.json();
  }
  const antes = await request(query);
  for (const existente of antes) {
    if (existente.nombre !== ejemplos.find(e => e.codigo === existente.codigo).nombre) {
      throw new Error(`El código ${existente.codigo} ya pertenece a otro artículo. No se modificó.`);
    }
  }
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ existentes: antes.length, porAgregar: ejemplos.filter(e => !antes.some(a => a.codigo === e.codigo)) }, null, 2));
    return;
  }
  const nuevos = await request('?on_conflict=codigo&select=id,codigo,nombre', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(ejemplos)
  });
  const despues = await request(query);
  if (despues.length !== 15) throw new Error(`Verificación incompleta: ${despues.length}/15 artículos.`);
  const dir = path.join(root, 'imports/inventario-ejemplos');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify({ fecha: new Date().toISOString(), agregados: nuevos, verificados: despues }, null, 2));
  console.log(`Agregados: ${nuevos.length}. Artículos de ejemplo verificados: ${despues.length}.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
