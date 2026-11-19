const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const credentialPath = process.env.ET_CREDENTIAL_FILE || path.join(os.homedir(), '.estrategiat-supabase.env');
const outputRoot = process.env.ET_BACKUP_DIR || path.join(os.homedir(), 'EstrategiaT-respaldos');

function readConfig() {
  const config = Object.fromEntries(fs.readFileSync(credentialPath, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(match => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY) throw new Error('Faltan credenciales de Supabase.');
  return config;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[“”"']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isStock(row) {
  return normalize(row.unidad).split(' ').includes('stock');
}

const stopWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'para', 'por', 'con', 'sin', 'y', 'o', 'un', 'una', 'piezas', 'pieza']);

function tokens(value) {
  return new Set(normalize(value).split(' ').filter(token => token.length > 1 && !stopWords.has(token)));
}

function similarity(left, right) {
  const a = tokens(left), b = tokens(right);
  const intersection = [...a].filter(token => b.has(token)).length;
  return intersection / Math.max(1, Math.min(a.size, b.size));
}

async function fetchAll(config, table, select = '*') {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const url = new URL(config.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table);
    url.searchParams.set('select', select);
    url.searchParams.set('order', 'id.asc');
    const response = await fetch(url, {headers: {
      apikey: config.SUPABASE_SECRET_KEY,
      Authorization: 'Bearer ' + config.SUPABASE_SECRET_KEY,
      Range: offset + '-' + (offset + 999), Prefer: 'count=exact',
      'User-Agent': 'EstrategiaT-stock-maintenance/2.0'
    }});
    if (response.status === 404) return [];
    if (!response.ok && response.status !== 206) throw new Error(table + ': HTTP ' + response.status + ' - ' + await response.text());
    const block = await response.json();
    rows.push(...block);
    if (block.length < 1000) break;
  }
  return rows;
}

async function main() {
  const config = readConfig();
  const [requests, quotes, requisitions] = await Promise.all([
    fetchAll(config, 'peticiones'),
    fetchAll(config, 'cotizaciones_almacen', 'id,peticion_id,estatus,origen'),
    fetchAll(config, 'requisiciones', 'id,peticion_id,estatus')
  ]);
  const stock = requests.filter(row => normalize(row.estatus) === 'revisado por almacen' && row.rbac_cancelado !== true && isStock(row));
  const quoteByRequest = new Map(quotes.filter(row => row.peticion_id).map(row => [row.peticion_id, row]));
  const requisitionByRequest = new Map(requisitions.filter(row => row.peticion_id).map(row => [row.peticion_id, row]));
  const exact = new Map();
  for (const row of stock) {
    const key = normalize(row.peticion);
    (exact.get(key) || exact.set(key, []).get(key)).push(row);
  }
  const exactGroups = [...exact.values()].filter(group => group.length > 1);
  const nearPairs = [];
  for (let i = 0; i < stock.length; i++) {
    for (let j = i + 1; j < stock.length; j++) {
      const score = similarity(stock[i].peticion, stock[j].peticion);
      if (score >= 0.32) nearPairs.push({score: Number(score.toFixed(3)), left: stock[i], right: stock[j]});
    }
  }
  nearPairs.sort((a, b) => b.score - a.score);
  const created = new Date().toISOString();
  const stamp = created.replace(/[:.]/g, '-');
  fs.mkdirSync(outputRoot, {recursive: true});
  const backupPath = path.join(outputRoot, 'peticiones-stock-' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify({
    created, stock,
    links: stock.flatMap(row => [
      ...(quoteByRequest.has(row.id) ? [{table: 'cotizaciones_almacen', requestId: row.id, row: quoteByRequest.get(row.id)}] : []),
      ...(requisitionByRequest.has(row.id) ? [{table: 'requisiciones', requestId: row.id, row: requisitionByRequest.get(row.id)}] : [])
    ])
  }, null, 2));
  console.log(JSON.stringify({
    created, count: stock.length, exactDuplicateGroups: exactGroups.length,
    exactDuplicateRows: exactGroups.reduce((sum, group) => sum + group.length - 1, 0),
    linkedRows: stock.filter(row => quoteByRequest.has(row.id) || requisitionByRequest.has(row.id)).length,
    backupPath,
    nearPairs: nearPairs.map(pair => ({
      score: pair.score,
      left: {id: pair.left.id, date: pair.left.created_at || pair.left.fecha, request: pair.left.peticion},
      right: {id: pair.right.id, date: pair.right.created_at || pair.right.fecha, request: pair.right.peticion}
    })),
    rows: stock.slice().sort((a, b) => Date.parse(b.created_at || b.fecha || 0) - Date.parse(a.created_at || a.fecha || 0)).map(row => ({
      id: row.id, date: row.created_at || row.fecha, request: row.peticion,
      linked: quoteByRequest.has(row.id) || requisitionByRequest.has(row.id)
    }))
  }, null, 2));
}

main().catch(error => { console.error(error.message); process.exit(1); });
