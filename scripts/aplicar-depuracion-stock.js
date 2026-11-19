const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const credentialPath = process.env.ET_CREDENTIAL_FILE || path.join(os.homedir(), '.estrategiat-supabase.env');
const outputRoot = process.env.ET_BACKUP_DIR || path.join(os.homedir(), 'EstrategiaT-respaldos');

function readConfig() {
  const config = Object.fromEntries(fs.readFileSync(credentialPath, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(match => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
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

function same(a, b) {
  return String(a ?? '') === String(b ?? '');
}

function newestFile(prefix) {
  const files = fs.readdirSync(outputRoot).filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => ({name, time: fs.statSync(path.join(outputRoot, name)).mtimeMs})).sort((a, b) => b.time - a.time);
  if (!files.length) throw new Error('No se encontró el plan de STOCK.');
  return path.join(outputRoot, files[0].name);
}

function headers(config, token, extra = {}) {
  return {
    apikey: config.SUPABASE_SECRET_KEY,
    Authorization: 'Bearer ' + config.SUPABASE_SECRET_KEY,
    ...(token ? {'x-et-session-token': token} : {}),
    'Content-Type': 'application/json',
    'User-Agent': 'EstrategiaT-stock-maintenance/2.0',
    ...extra
  };
}

async function request(config, pathname, options = {}) {
  const response = await fetch(config.SUPABASE_URL.replace(/\/$/, '') + pathname, {
    ...options, headers: headers(config, options.token, options.headers)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (response.status === 404 && options.allowMissing) return [];
  if (!response.ok) throw new Error((options.label || pathname) + ': HTTP ' + response.status + ' - ' + (data?.message || data));
  return data;
}

async function login(config) {
  const session = await request(config, '/rest/v1/rpc/iniciar_sesion_aplicacion', {
    method: 'POST', body: JSON.stringify({p_usuario: config.ESTRATEGIAT_USUARIO, p_password: config.ESTRATEGIAT_PASSWORD}),
    label: 'Inicio de sesión'
  });
  const role = normalize(session?.usuario?.rol).replace(/\s/g, '');
  if (!session?.token || !['superadmin', 'jefedealmacen'].includes(role)) {
    throw new Error('Se requiere una sesión válida de SuperAdmin o Jefe de Almacén.');
  }
  return session;
}

async function fetchRequests(config, ids, token) {
  const query = new URLSearchParams({
    select: 'id,unidad,peticion,observaciones,estatus,created_at,origen_peticion,rbac_cancelado,rbac_motivo_cancelacion',
    id: 'in.(' + ids.join(',') + ')'
  });
  return request(config, '/rest/v1/peticiones?' + query, {token, label: 'Lectura de peticiones STOCK'});
}

async function patchRequest(config, id, values, token, label) {
  const query = new URLSearchParams({id: 'eq.' + id, rbac_cancelado: 'eq.false'});
  const rows = await request(config, '/rest/v1/peticiones?' + query, {
    method: 'PATCH', token, body: JSON.stringify(values), headers: {Prefer: 'return=representation'}, label
  });
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(label + ': no se modificó exactamente un registro.');
}

async function cancelRequest(config, change, token) {
  await request(config, '/rest/v1/rpc/cancelar_registro_modulo', {
    method: 'POST', token,
    body: JSON.stringify({p_tabla: 'peticiones', p_registro: change.id, p_motivo: change.note}),
    label: 'Cancelación ' + change.id
  });
}

async function main() {
  const config = readConfig();
  const planPath = newestFile('plan-peticiones-stock-');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const backup = JSON.parse(fs.readFileSync(plan.backupPath, 'utf8'));
  const backupById = new Map(backup.stock.map(row => [row.id, row]));
  const ids = plan.changes.map(change => change.id);
  if (new Set(ids).size !== ids.length) throw new Error('El plan contiene identificadores repetidos.');
  if (plan.changes.some(change => !backupById.has(change.id) || !isStock(backupById.get(change.id)))) {
    throw new Error('El plan contiene un registro ajeno al respaldo activo de STOCK.');
  }

  const session = await login(config);
  const current = await fetchRequests(config, ids, session.token);
  const currentById = new Map(current.map(row => [row.id, row]));
  if (current.length !== ids.length) throw new Error('Uno o más registros del plan ya no existen o no son visibles.');
  for (const change of plan.changes) {
    const before = backupById.get(change.id), row = currentById.get(change.id);
    if (!row || row.rbac_cancelado || normalize(row.estatus) !== 'revisado por almacen' || !isStock(row)) {
      throw new Error('Precondición de estado inválida en ' + change.id + '.');
    }
    if (!same(row.peticion, before.peticion) || !same(row.observaciones, before.observaciones) || !same(row.unidad, before.unidad)) {
      throw new Error('El contenido cambió desde el respaldo en ' + change.id + '.');
    }
  }
  for (const table of ['cotizaciones_almacen', 'requisiciones']) {
    const query = new URLSearchParams({select: 'id,peticion_id', peticion_id: 'in.(' + ids.join(',') + ')'});
    const links = await request(config, '/rest/v1/' + table + '?' + query, {token: session.token, allowMissing: true, label: 'Vínculos de ' + table});
    if (links.length) throw new Error('Se detectaron vínculos nuevos en ' + table + '; no se aplicó el plan.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultPath = path.join(outputRoot, 'resultado-peticiones-stock-' + stamp + '.json');
  const result = {started: new Date().toISOString(), planPath, backupPath: plan.backupPath,
    actor: {id: session.usuario?.id, usuario: session.usuario?.usuario, rol: session.usuario?.rol}, completed: [], failed: null};
  const save = () => fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  save();
  try {
    for (const group of plan.groups) {
      const groupChanges = plan.changes.filter(change => change.category === group.category);
      const target = groupChanges.find(change => change.action === 'keep_and_merge');
      await patchRequest(config, target.id, {peticion: target.peticionAfter, observaciones: target.observacionesAfter},
        session.token, 'Unificación de ' + group.category);
      result.completed.push({id: target.id, action: target.action, category: group.category});
      save();
      for (const change of groupChanges.filter(item => item.action.startsWith('cancel'))) {
        await patchRequest(config, change.id, {observaciones: change.observacionesAfter}, session.token, 'Nota ' + change.id);
        await cancelRequest(config, change, session.token);
        result.completed.push({id: change.id, action: change.action, category: group.category});
        save();
      }
    }
  } catch (error) {
    result.failed = {at: new Date().toISOString(), message: error.message};
    save();
    throw error;
  }

  const verified = await fetchRequests(config, ids, session.token);
  const verifiedById = new Map(verified.map(row => [row.id, row]));
  const errors = [];
  for (const change of plan.changes) {
    const row = verifiedById.get(change.id);
    if (!row) { errors.push(change.id + ': no visible'); continue; }
    if (change.action === 'keep_and_merge') {
      if (row.rbac_cancelado || normalize(row.estatus) !== 'revisado por almacen' || !same(row.peticion, change.peticionAfter) || !same(row.observaciones, change.observacionesAfter)) {
        errors.push(change.id + ': unificación no coincide');
      }
    } else if (row.rbac_cancelado !== true || normalize(row.estatus) !== 'cancelado' || !same(row.observaciones, change.observacionesAfter) || !same(row.rbac_motivo_cancelacion, change.note)) {
      errors.push(change.id + ': cancelación no coincide');
    }
  }
  const activeStock = await request(config, '/rest/v1/peticiones?' + new URLSearchParams({
    select: 'id,unidad,peticion,observaciones,estatus,rbac_cancelado',
    estatus: 'ilike.Revisado por almacen', rbac_cancelado: 'eq.false'
  }), {token: session.token, label: 'Verificación global de STOCK'});
  const activeStockRows = activeStock.filter(isStock);
  if (activeStockRows.length !== plan.summary.activeAfter) {
    errors.push('Cantidad activa esperada ' + plan.summary.activeAfter + ', obtenida ' + activeStockRows.length + '.');
  }
  const changed = new Set(ids);
  const untouchedBefore = backup.stock.filter(row => !changed.has(row.id));
  const activeById = new Map(activeStockRows.map(row => [row.id, row]));
  for (const before of untouchedBefore) {
    const row = activeById.get(before.id);
    if (!row || !same(row.peticion, before.peticion) || !same(row.observaciones, before.observaciones) || !same(row.estatus, before.estatus)) {
      errors.push(before.id + ': registro no relacionado cambió');
    }
  }
  result.finished = new Date().toISOString();
  result.verification = {
    ok: errors.length === 0, errors,
    targetsUnified: plan.summary.targets, requestsCanceled: plan.summary.cancel,
    duplicatesCanceled: plan.summary.duplicates, relatedMerged: plan.summary.merged,
    activeStock: activeStockRows.length, untouchedVerified: untouchedBefore.length
  };
  save();
  if (errors.length) throw new Error('La verificación encontró: ' + errors.join('; '));
  console.log(JSON.stringify({...result.verification, resultPath}, null, 2));
}

main().catch(error => { console.error(error.message); process.exit(1); });
