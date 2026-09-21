const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('js/services/vales.service.js', 'utf8'), context);
const rows = Array.from({ length: 2347 }, (_, i) => ({ id: String(i + 1).padStart(8, '0'), created_at: '2026-09-21', estatus: i % 2 ? 'Solventado' : 'Pendiente' }));
function client(cap, fail = -1, source = rows) {
  let calls = 0;
  return { from(table) {
    assert.equal(table, 'vales');
    let cursor = '', limit;
    return { select() { return this; }, order(field, options) { assert.equal(field, 'id'); assert.equal(options.ascending, true); return this; },
      limit(n) { limit = n; return this; }, gt(field, value) { assert.equal(field, 'id'); cursor = value; return this; },
      then(resolve, reject) { return Promise.resolve(calls++ === fail ? { error: new Error('Error de red') } : { data: source.filter(row => row.id > cursor).slice(0, Math.min(cap, limit)) }).then(resolve, reject); }
    };
  } };
}
(async () => {
  for (const cap of [1000, 500, 137]) {
    const result = await context.window.ETVales.listar(client(cap));
    assert.equal(result.error, null);
    assert.equal(result.count, 2347);
    assert.equal(new Set(result.data.map(row => row.id)).size, 2347);
    assert.equal(result.data.filter(row => row.estatus === 'Solventado').length, 1173);
    assert.equal(result.data[0].id, '00002347');
  }
  assert.equal((await context.window.ETVales.listar(client(500, -1, []))).count, 0);
  assert.equal((await context.window.ETVales.listar(client(500, -1, rows.slice(0, 1000)))).count, 1000);
  const failure = await context.window.ETVales.listar(client(500, 1));
  assert.ok(failure.error);
  assert.equal(failure.data, null, 'No entrega una lista parcial como completa');
  for (const page of ['modulos/vales.html', 'dashboard.html']) assert.ok(fs.readFileSync(page, 'utf8').includes('ETVales.listar('));
  console.log('Vales: 2347 registros completos, topes de servidor variables, estados, vacío y error sin datos parciales verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
