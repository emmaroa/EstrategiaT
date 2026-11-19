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
  for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'ESTRATEGIAT_USUARIO', 'ESTRATEGIAT_PASSWORD']) {
    if (!config[key]) throw new Error('Falta ' + key + ' en el archivo de credenciales.');
  }
  return config;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isStock(row) {
  return normalize(row.unidad).split(' ').includes('stock');
}

function newestFile(prefix) {
  const candidates = fs.readdirSync(outputRoot).filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => ({name, full: path.join(outputRoot, name), time: fs.statSync(path.join(outputRoot, name)).mtimeMs}))
    .sort((a, b) => b.time - a.time);
  if (!candidates.length) throw new Error('No se encontró el archivo ' + prefix + '*.json.');
  return candidates[0].full;
}

function baseHeaders(config, token) {
  return {
    apikey: config.SUPABASE_SECRET_KEY,
    Authorization: 'Bearer ' + config.SUPABASE_SECRET_KEY,
    ...(token ? {'x-et-session-token': token} : {}),
    'Content-Type': 'application/json',
    'User-Agent': 'EstrategiaT-admin-maintenance/2.0'
  };
}

async function request(config, pathname, options = {}) {
  const response = await fetch(config.SUPABASE_URL.replace(/\/$/, '') + pathname, {
    ...options,
    headers: {...baseHeaders(config, options.token), ...(options.headers || {})}
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (!response.ok) {
    const detail = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : data;
    throw new Error((options.label || pathname) + ': HTTP ' + response.status + ' - ' + detail);
  }
  return data;
}

async function login(config) {
  const session = await request(config, '/rest/v1/rpc/iniciar_sesion_aplicacion', {
    method: 'POST',
    body: JSON.stringify({p_usuario: config.ESTRATEGIAT_USUARIO, p_password: config.ESTRATEGIAT_PASSWORD}),
    label: 'Inicio de sesión'
  });
  if (!session?.token) throw new Error('El inicio de sesión no devolvió un token de aplicación.');
  const role = normalize(session.usuario?.rol);
  if (!['superadmin', 'jefedealmacen'].includes(role.replace(/\s/g, ''))) {
    throw new Error('La cuenta debe ser SuperAdmin o Jefe de Almacén; rol recibido: ' + (session.usuario?.rol || 'sin rol'));
  }
  return session;
}

async function fetchRows(config, ids, token) {
  const query = new URLSearchParams({
    select: 'id,unidad,peticion,observaciones,estatus,created_at,origen_peticion,rbac_cancelado,rbac_motivo_cancelacion',
    id: 'in.(' + ids.join(',') + ')'
  });
  return request(config, '/rest/v1/peticiones?' + query, {token, label: 'Lectura de precondiciones'});
}

async function patchRequest(config, id, values, token, label) {
  const query = new URLSearchParams({id: 'eq.' + id});
  const rows = await request(config, '/rest/v1/peticiones?' + query, {
    method: 'PATCH', token, body: JSON.stringify(values),
    headers: {Prefer: 'return=representation'}, label
  });
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(label + ': no se actualizó exactamente un registro.');
  return rows[0];
}

async function cancelRequest(config, change, token) {
  await request(config, '/rest/v1/rpc/cancelar_registro_modulo', {
    method: 'POST', token,
    body: JSON.stringify({p_tabla: 'peticiones', p_registro: change.id, p_motivo: change.note}),
    label: 'Cancelación ' + change.id
  });
}

function same(a, b) {
  return String(a ?? '') === String(b ?? '');
}

async function main() {
  const config = readConfig();
  const planPath = newestFile('plan-peticiones-revisadas-');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const stamp = path.basename(planPath).slice('plan-peticiones-revisadas-'.length, -'.json'.length);
  const backupPath = path.join(outputRoot, 'peticiones-revisadas-' + stamp + '.json');
  if (!fs.existsSync(backupPath)) throw new Error('No se encontró el respaldo correspondiente al plan.');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (plan.blocked?.length) throw new Error('El plan tiene grupos bloqueados y no se puede aplicar.');
  const changedIds = plan.changes.map(change => change.id);
  if (new Set(changedIds).size !== changedIds.length) throw new Error('El plan contiene identificadores repetidos.');
  const backupById = new Map(backup.reviewed.map(row => [row.id, row]));
  for (const id of changedIds) {
    const before = backupById.get(id);
    if (!before) throw new Error('El registro ' + id + ' no está en el respaldo.');
    if (isStock(before)) throw new Error('Protección STOCK: el plan intentó incluir ' + id + '.');
  }

  const session = await login(config);
  const currentRows = await fetchRows(config, changedIds, session.token);
  const currentById = new Map(currentRows.map(row => [row.id, row]));
  if (currentRows.length !== changedIds.length) throw new Error('Uno o más registros del plan ya no existen o no son visibles.');
  for (const change of plan.changes) {
    const before = backupById.get(change.id);
    const current = currentById.get(change.id);
    if (normalize(current.estatus) !== 'revisado por almacen' || current.rbac_cancelado) {
      throw new Error('Precondición inválida en ' + change.id + ': el estado cambió desde el respaldo.');
    }
    if (!same(current.peticion, before.peticion) || !same(current.observaciones, before.observaciones) || !same(current.unidad, before.unidad)) {
      throw new Error('Precondición inválida en ' + change.id + ': el contenido cambió desde el respaldo.');
    }
  }

  const result = {started: new Date().toISOString(), planPath, backupPath, actor: {
    id: session.usuario?.id, usuario: session.usuario?.usuario, rol: session.usuario?.rol
  }, completed: [], failed: null};
  const resultPath = path.join(outputRoot, 'resultado-peticiones-revisadas-' + stamp + '.json');
  const saveResult = () => fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  saveResult();

  try {
    for (const group of plan.groups) {
      const groupChanges = plan.changes.filter(change => normalize(change.unidad) === normalize(group.unidad));
      const target = groupChanges.find(change => change.action === 'keep_and_merge');
      if (!target) throw new Error('No se encontró el registro a conservar para la unidad ' + group.unidad + '.');
      await patchRequest(config, target.id, {
        peticion: target.peticionAfter,
        observaciones: target.observacionesAfter
      }, session.token, 'Unificación de unidad ' + group.unidad);
      result.completed.push({id: target.id, action: target.action, unidad: group.unidad});
      saveResult();

      for (const change of groupChanges.filter(item => item.action.startsWith('cancel'))) {
        await patchRequest(config, change.id, {observaciones: change.observacionesAfter}, session.token,
          'Nota de cancelación ' + change.id);
        await cancelRequest(config, change, session.token);
        result.completed.push({id: change.id, action: change.action, unidad: group.unidad});
        saveResult();
      }
    }
  } catch (error) {
    result.failed = {at: new Date().toISOString(), message: error.message};
    saveResult();
    throw error;
  }

  const verified = await fetchRows(config, changedIds, session.token);
  const verifiedById = new Map(verified.map(row => [row.id, row]));
  const errors = [];
  for (const change of plan.changes) {
    const row = verifiedById.get(change.id);
    if (!row) { errors.push(change.id + ': no visible'); continue; }
    if (change.action === 'keep_and_merge') {
      if (normalize(row.estatus) !== 'revisado por almacen' || row.rbac_cancelado || !same(row.peticion, change.peticionAfter) || !same(row.observaciones, change.observacionesAfter)) {
        errors.push(change.id + ': unificación no coincide');
      }
    } else if ((normalize(row.origen_peticion) !== 'coordinador' && normalize(row.estatus) !== 'cancelado') || row.rbac_cancelado !== true || !same(row.observaciones, change.observacionesAfter) || !same(row.rbac_motivo_cancelacion, change.note)) {
      errors.push(change.id + ': cancelación no coincide');
    }
  }
  const reviewedNow = await request(config,
    '/rest/v1/peticiones?' + new URLSearchParams({select: 'id,unidad,estatus,rbac_cancelado', estatus: 'ilike.Revisado por almacen'}),
    {token: session.token, label: 'Verificación global'});
  const counts = new Map();
  for (const row of reviewedNow.filter(row => !isStock(row) && row.rbac_cancelado !== true)) {
    const key = normalize(row.unidad);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const remainingMultiUnit = [...counts.entries()].filter(([, count]) => count > 1);
  if (remainingMultiUnit.length) errors.push('Persisten unidades no STOCK con varias peticiones revisadas: ' + remainingMultiUnit.length);

  result.finished = new Date().toISOString();
  result.verification = {
    ok: errors.length === 0,
    errors,
    targetsUnified: plan.changes.filter(change => change.action === 'keep_and_merge').length,
    requestsCanceled: plan.changes.filter(change => change.action.startsWith('cancel')).length,
    stockExcluded: plan.summary.stockExcluded,
    remainingMultiUnit: remainingMultiUnit.length
  };
  saveResult();
  if (errors.length) throw new Error('La verificación final encontró: ' + errors.join('; '));
  console.log(JSON.stringify({ok: true, ...result.verification, resultPath}, null, 2));
}

main().catch(error => { console.error(error.message); process.exit(1); });
