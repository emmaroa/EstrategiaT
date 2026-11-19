const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const credentialPath = process.env.ET_CREDENTIAL_FILE || path.join(os.homedir(), '.estrategiat-supabase.env');
const outputRoot = process.env.ET_BACKUP_DIR || path.join(os.homedir(), 'EstrategiaT-respaldos');

function readConfig() {
  const pairs = fs.readFileSync(credentialPath, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(match => [match[1], match[2].replace(/^['"]|['"]$/g, '')]);
  const config = Object.fromEntries(pairs);
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY) throw new Error('Faltan las credenciales de Supabase.');
  return config;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[“”"']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isStock(row) {
  return normalize(row.unidad).split(' ').includes('stock');
}

function timestamp(row) {
  for (const value of [row.created_at, row.fecha, row.updated_at]) {
    const time = Date.parse(value || '');
    if (Number.isFinite(time)) return time;
  }
  return 0;
}

function newestFirst(a, b) {
  return timestamp(b) - timestamp(a) || String(b.id).localeCompare(String(a.id));
}

function appendNote(current, note) {
  const text = String(current || '').trim();
  return text ? text + '\n' + note : note;
}

async function fetchAll(config, table, select = '*') {
  const rows = [];
  const base = config.SUPABASE_URL.replace(/\/$/, '');
  for (let offset = 0; ; offset += 1000) {
    const url = new URL(base + '/rest/v1/' + table);
    url.searchParams.set('select', select);
    url.searchParams.set('order', 'id.asc');
    const response = await fetch(url, {
      headers: {
        apikey: config.SUPABASE_SECRET_KEY,
        Authorization: 'Bearer ' + config.SUPABASE_SECRET_KEY,
        Range: offset + '-' + (offset + 999),
        Prefer: 'count=exact',
        'User-Agent': 'EstrategiaT-admin-maintenance/2.0'
      }
    });
    if (response.status === 404) return [];
    if (!response.ok && response.status !== 206) throw new Error(table + ': ' + response.status + ' ' + await response.text());
    const block = await response.json();
    rows.push(...block);
    if (block.length < 1000) break;
  }
  return rows;
}

async function main() {
  const config = readConfig();
  const [allRequests, quotes, requisitions] = await Promise.all([
    fetchAll(config, 'peticiones'),
    fetchAll(config, 'cotizaciones_almacen', 'id,peticion_id,estatus,origen'),
    fetchAll(config, 'requisiciones', 'id,peticion_id,estatus')
  ]);
  const reviewed = allRequests.filter(row => normalize(row.estatus) === 'revisado por almacen');
  const candidates = reviewed.filter(row => !isStock(row));
  const stock = reviewed.filter(isStock);
  const quoteByRequest = new Map();
  for (const row of quotes) if (row.peticion_id) (quoteByRequest.get(row.peticion_id) || quoteByRequest.set(row.peticion_id, []).get(row.peticion_id)).push(row);
  const requisitionByRequest = new Map();
  for (const row of requisitions) if (row.peticion_id) (requisitionByRequest.get(row.peticion_id) || requisitionByRequest.set(row.peticion_id, []).get(row.peticion_id)).push(row);
  const byUnit = new Map();
  for (const row of candidates) {
    const key = normalize(row.unidad);
    if (!key) continue;
    (byUnit.get(key) || byUnit.set(key, []).get(key)).push(row);
  }
  const groups = [];
  const changes = [];
  const blocked = [];
  for (const [unitKey, unsorted] of byUnit) {
    if (unsorted.length < 2) continue;
    const rows = unsorted.slice().sort(newestFirst);
    const target = rows[0];
    const linked = rows.flatMap(row => [
      ...(quoteByRequest.get(row.id) || []).map(link => ({table:'cotizaciones_almacen', requestId:row.id, id:link.id})),
      ...(requisitionByRequest.get(row.id) || []).map(link => ({table:'requisiciones', requestId:row.id, id:link.id}))
    ]);
    const requests = [];
    const seen = new Set();
    for (const row of rows) {
      const key = normalize(row.peticion);
      if (key && !seen.has(key)) { seen.add(key); requests.push(String(row.peticion || '').trim()); }
    }
    const duplicateCount = rows.length - requests.length;
    const group = {
      unidad: target.unidad,
      targetId: target.id,
      targetDate: target.created_at || target.fecha,
      rows: rows.length,
      distinctRequests: requests.length,
      duplicateRows: duplicateCount,
      linked
    };
    groups.push(group);
    if (linked.length) { blocked.push(group); continue; }
    const mergedRequest = requests.length > 1
      ? requests.map((text, index) => (index + 1) + '. ' + text).join('\n')
      : requests[0];
    changes.push({
      id: target.id,
      action: 'keep_and_merge',
      unidad: target.unidad,
      peticionBefore: target.peticion,
      peticionAfter: mergedRequest,
      observacionesAfter: requests.length > 1
        ? appendNote(target.observaciones, 'Se unificaron ' + rows.length + ' peticiones revisadas de la misma unidad.')
        : target.observaciones
    });
    const newestByRequest = new Map();
    for (const row of rows) {
      const requestKey = normalize(row.peticion);
      if (!newestByRequest.has(requestKey)) newestByRequest.set(requestKey, row.id);
    }
    for (const row of rows.slice(1)) {
      const repeated = newestByRequest.get(normalize(row.peticion)) !== row.id;
      changes.push({
        id: row.id,
        action: repeated ? 'cancel_duplicate' : 'cancel_merged',
        unidad: row.unidad,
        targetId: target.id,
        note: repeated ? 'Se cancela por estar repetida.' : 'Se cancela al unificarse con la petición más reciente de la misma unidad.',
        observacionesAfter: appendNote(row.observaciones, repeated
          ? 'Se cancela por estar repetida.'
          : 'Se cancela al unificarse con la petición ' + target.id + ' de la misma unidad.')
      });
    }
  }
  const created = new Date().toISOString();
  const stamp = created.replace(/[:.]/g, '-');
  fs.mkdirSync(outputRoot, { recursive: true });
  const backupPath = path.join(outputRoot, 'peticiones-revisadas-' + stamp + '.json');
  const planPath = path.join(outputRoot, 'plan-peticiones-revisadas-' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify({created, reviewed, quotes, requisitions}, null, 2));
  fs.writeFileSync(planPath, JSON.stringify({created, summary:{reviewed:reviewed.length,stockExcluded:stock.length,candidates:candidates.length,groups:groups.length,blockedGroups:blocked.length,changes:changes.length,cancel:changes.filter(x=>x.action.startsWith('cancel')).length,targets:changes.filter(x=>x.action==='keep_and_merge').length},groups,blocked,changes}, null, 2));
  console.log(JSON.stringify({
    reviewed: reviewed.length,
    stockExcluded: stock.length,
    candidateRows: candidates.length,
    multiRowUnits: groups.length,
    blockedGroups: blocked.length,
    recordsToCancel: changes.filter(row => row.action.startsWith('cancel')).length,
    recordsToKeepAndMerge: changes.filter(row => row.action === 'keep_and_merge').length,
    exactDuplicateRows: groups.reduce((sum, group) => sum + group.duplicateRows, 0),
    backupPath,
    planPath
  }, null, 2));
}

main().catch(error => { console.error(error.message); process.exit(1); });
