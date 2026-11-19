const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const credentialPath = process.env.ET_CREDENTIAL_FILE || path.join(os.homedir(), '.estrategiat-supabase.env');
const outputRoot = process.env.ET_BACKUP_DIR || path.join(os.homedir(), 'EstrategiaT-respaldos');

function readConfig() {
  return Object.fromEntries(fs.readFileSync(credentialPath, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(match => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isStock(row) {
  return normalize(row.unidad).split(' ').includes('stock');
}

function same(a, b) {
  return String(a ?? '') === String(b ?? '');
}

async function request(config, pathname, options = {}) {
  const response = await fetch(config.SUPABASE_URL.replace(/\/$/, '') + pathname, {
    ...options,
    headers: {
      apikey: config.SUPABASE_SECRET_KEY,
      Authorization: 'Bearer ' + config.SUPABASE_SECRET_KEY,
      ...(options.token ? {'x-et-session-token': options.token} : {}),
      'Content-Type': 'application/json'
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + (data?.message || text));
  return data;
}

async function main() {
  const config = readConfig();
  const resultName = fs.readdirSync(outputRoot).filter(name => name.startsWith('resultado-peticiones-revisadas-'))
    .map(name => ({name, time: fs.statSync(path.join(outputRoot, name)).mtimeMs})).sort((a, b) => b.time - a.time)[0]?.name;
  if (!resultName) throw new Error('No se encontró un resultado para verificar.');
  const resultPath = path.join(outputRoot, resultName);
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  const plan = JSON.parse(fs.readFileSync(result.planPath, 'utf8'));
  const backup = JSON.parse(fs.readFileSync(result.backupPath, 'utf8'));
  const session = await request(config, '/rest/v1/rpc/iniciar_sesion_aplicacion', {
    method: 'POST', body: JSON.stringify({p_usuario: config.ESTRATEGIAT_USUARIO, p_password: config.ESTRATEGIAT_PASSWORD})
  });
  if (!session?.token) throw new Error('No se obtuvo una sesión de aplicación.');

  const ids = plan.changes.map(change => change.id);
  const query = new URLSearchParams({
    select: 'id,unidad,peticion,observaciones,estatus,origen_peticion,rbac_cancelado,rbac_motivo_cancelacion',
    id: 'in.(' + ids.join(',') + ')'
  });
  const rows = await request(config, '/rest/v1/peticiones?' + query, {token: session.token});
  const byId = new Map(rows.map(row => [row.id, row]));
  const errors = [];
  for (const change of plan.changes) {
    const row = byId.get(change.id);
    if (!row) { errors.push(change.id + ': no visible'); continue; }
    if (change.action === 'keep_and_merge') {
      if (row.rbac_cancelado || normalize(row.estatus) !== 'revisado por almacen' || !same(row.peticion, change.peticionAfter) || !same(row.observaciones, change.observacionesAfter)) {
        errors.push(change.id + ': registro conservado no coincide');
      }
      continue;
    }
    if (row.rbac_cancelado !== true || !same(row.observaciones, change.observacionesAfter) || !same(row.rbac_motivo_cancelacion, change.note)) {
      errors.push(change.id + ': marca, nota o motivo de cancelación no coincide');
    }
    if (normalize(row.origen_peticion) !== 'coordinador' && normalize(row.estatus) !== 'cancelado') {
      errors.push(change.id + ': estatus de cancelación no coincide');
    }
  }

  const reviewed = await request(config, '/rest/v1/peticiones?' + new URLSearchParams({
    select: 'id,unidad,estatus,rbac_cancelado', estatus: 'ilike.Revisado por almacen'
  }), {token: session.token});
  const activeCounts = new Map();
  for (const row of reviewed.filter(row => !isStock(row) && row.rbac_cancelado !== true)) {
    const key = normalize(row.unidad);
    activeCounts.set(key, (activeCounts.get(key) || 0) + 1);
  }
  const remaining = [...activeCounts].filter(([, count]) => count > 1);
  if (remaining.length) errors.push('Persisten ' + remaining.length + ' unidades activas con varias peticiones revisadas.');

  const stockBefore = backup.reviewed.filter(isStock);
  if (plan.changes.some(change => isStock(backup.reviewed.find(row => row.id === change.id) || {}))) {
    errors.push('El plan incluyó indebidamente una petición de STOCK.');
  }
  const verification = {
    at: new Date().toISOString(), ok: errors.length === 0, errors,
    targetsUnified: plan.changes.filter(change => change.action === 'keep_and_merge').length,
    requestsCanceled: plan.changes.filter(change => change.action.startsWith('cancel')).length,
    canceledCoordinatorRequests: rows.filter(row => row.rbac_cancelado && normalize(row.origen_peticion) === 'coordinador').length,
    activeReviewedMultiUnit: remaining.length,
    stockExcluded: stockBefore.length
  };
  result.verification = verification;
  result.finished = new Date().toISOString();
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({...verification, resultPath}, null, 2));
  if (errors.length) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exit(1); });
