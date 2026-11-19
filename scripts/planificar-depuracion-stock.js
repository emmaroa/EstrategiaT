const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const outputRoot = process.env.ET_BACKUP_DIR || path.join(os.homedir(), 'EstrategiaT-respaldos');

const groups = [
  {category: 'Silicón gris Super Grey', targetId: '54ed242f-982c-4790-8559-0dbec77cfd9b', sources: [
    {id: 'cb598ae9-d8d6-4e6b-96e9-5dffe000367d', action: 'cancel_merged'},
    {id: '4831baaf-39b0-4f59-af7c-aa52d40911d1', action: 'cancel_duplicate'}
  ]},
  {category: 'Repuesto de secador', targetId: 'd8f457e3-29e8-4be2-b7a9-c8b9abe78ec1', sources: [
    {id: '60b87802-3c1c-42e0-b58c-73399b60ea53', action: 'cancel_duplicate'}
  ]},
  {category: 'Cámaras y llantas 120/80 R18', targetId: '3cf3ea86-b84c-4020-a1bb-fbd3deb934c2', sources: [
    {id: '3ec5b364-9048-450d-b6ba-96058f5afb44', action: 'cancel_merged'},
    {id: '8dd36dc9-57c2-4dde-82f2-568f7bf31c95', action: 'cancel_merged'}
  ]},
  {category: 'Empaque de toma de fuerza', targetId: '597b0042-8ab8-49fe-94ec-1169c5375299', sources: [
    {id: '61edd7f7-b8c3-4764-ad38-9f137a7c02f2', action: 'cancel_merged'}
  ]},
  {category: 'Empaque parte 5309255', targetId: 'f42a68e7-4306-409d-898b-21da70eaca76', sources: [
    {id: '81e8adf9-e12f-4390-8c53-a7a9e06d74e1', action: 'cancel_duplicate'}
  ]},
  {category: 'Conectores 5/8', targetId: '46c7a77c-8dec-4cc4-bec3-8637f0431cb7', sources: [
    {id: '4b5bcdba-57e5-464b-8c87-56f5a83ad6f5', action: 'cancel_merged'}
  ]},
  {category: 'Sellador para radiador', targetId: 'fccc10f8-cd29-4fbf-8a60-1e0380b1dcbd', sources: [
    {id: '647ca27c-de5e-4f6f-b5a2-b9e64a9a2711', action: 'cancel_merged'}
  ]},
  {category: 'Balatas y tambores traseros 4515', targetId: '391f47ed-3462-4df6-9a40-3a7e99e9da7f', sources: [
    {id: '81e97581-7e21-4cbe-84bd-b30eab282c75', action: 'cancel_merged'}
  ]},
  {category: 'Filtro GP-149', targetId: '51a5b014-c58a-424d-ab90-e729464837c1', sources: [
    {id: '25977f09-445e-4189-b6f2-45ca195349ab', action: 'cancel_merged'}
  ]}
];

function newestFile(prefix) {
  const files = fs.readdirSync(outputRoot).filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => ({name, time: fs.statSync(path.join(outputRoot, name)).mtimeMs})).sort((a, b) => b.time - a.time);
  if (!files.length) throw new Error('No se encontró respaldo de STOCK.');
  return path.join(outputRoot, files[0].name);
}

function appendNote(current, note) {
  const text = String(current || '').trim();
  return text ? text + '\n' + note : note;
}

function main() {
  const backupPath = newestFile('peticiones-stock-');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const byId = new Map(backup.stock.map(row => [row.id, row]));
  const linked = new Set(backup.links.map(link => link.requestId));
  const changes = [];
  for (const group of groups) {
    const target = byId.get(group.targetId);
    if (!target) throw new Error('No está en el respaldo el destino ' + group.targetId);
    const sourceRows = group.sources.map(source => {
      const row = byId.get(source.id);
      if (!row) throw new Error('No está en el respaldo el origen ' + source.id);
      return {...source, row};
    });
    const rows = [target, ...sourceRows.map(source => source.row)];
    if (rows.some(row => linked.has(row.id))) throw new Error('El grupo ' + group.category + ' tiene registros enlazados.');
    const newest = rows.slice().sort((a, b) => Date.parse(b.created_at || b.fecha) - Date.parse(a.created_at || a.fecha))[0];
    if (newest.id !== target.id) throw new Error('El destino de ' + group.category + ' no es el más reciente.');
    const mergeRows = sourceRows.filter(source => source.action === 'cancel_merged').map(source => source.row);
    const requests = [target, ...mergeRows].map(row => String(row.peticion || '').trim());
    const requestAfter = requests.length > 1
      ? requests.map((text, index) => (index + 1) + '. ' + text).join('\n')
      : target.peticion;
    const targetNote = requests.length > 1
      ? 'Se unificaron ' + requests.length + ' solicitudes de STOCK relacionadas con ' + group.category + '; se conservaron las cantidades originales sin sumarlas.'
      : null;
    changes.push({
      id: target.id, action: 'keep_and_merge', category: group.category,
      peticionBefore: target.peticion, peticionAfter: requestAfter,
      observacionesBefore: target.observaciones,
      observacionesAfter: targetNote ? appendNote(target.observaciones, targetNote) : target.observaciones
    });
    for (const source of sourceRows) {
      const duplicate = source.action === 'cancel_duplicate';
      const note = duplicate
        ? 'Se cancela por estar repetida en STOCK. Se conserva la petición más reciente ' + target.id + '.'
        : 'Se cancela al unificarse en la petición de STOCK más reciente ' + target.id + '.';
      changes.push({
        id: source.id, action: source.action, category: group.category, targetId: target.id,
        note, peticionBefore: source.row.peticion,
        observacionesBefore: source.row.observaciones,
        observacionesAfter: appendNote(source.row.observaciones, note)
      });
    }
  }
  const created = new Date().toISOString();
  const stamp = created.replace(/[:.]/g, '-');
  const planPath = path.join(outputRoot, 'plan-peticiones-stock-' + stamp + '.json');
  const plan = {
    created, backupPath,
    summary: {
      reviewedStock: backup.stock.length, groups: groups.length,
      targets: changes.filter(change => change.action === 'keep_and_merge').length,
      cancel: changes.filter(change => change.action.startsWith('cancel')).length,
      duplicates: changes.filter(change => change.action === 'cancel_duplicate').length,
      merged: changes.filter(change => change.action === 'cancel_merged').length,
      activeAfter: backup.stock.length - changes.filter(change => change.action.startsWith('cancel')).length,
      unchangedRows: backup.stock.length - changes.length
    },
    groups, changes
  };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({...plan.summary, planPath, backupPath, categories: groups.map(group => group.category)}, null, 2));
}

try { main(); } catch (error) { console.error(error.message); process.exit(1); }
