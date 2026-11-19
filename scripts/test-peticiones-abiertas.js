const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadService(validationRows) {
  const calls = [];
  let inserts = 0;
  const client = {
    from(table) {
      assert.equal(table, 'peticiones');
      let inserting = false;
      const builder = {
        select(columns) { calls.push(['select', columns]); return builder; },
        ilike(column, value) { calls.push(['ilike', column, value]); return builder; },
        in(column, value) { calls.push(['in', column, value]); return builder; },
        or(value) { calls.push(['or', value]); return builder; },
        order(column, options) { calls.push(['order', column, options]); return builder; },
        limit(value) { calls.push(['limit', value]); return Promise.resolve({data: validationRows, error: null}); },
        insert(payload) { inserting = true; inserts++; calls.push(['insert', payload]); return builder; },
        single() {
          assert.equal(inserting, true);
          return Promise.resolve({data: {id: 'nueva', unidad: calls.find(call => call[0] === 'insert')[1].unidad}, error: null});
        }
      };
      return builder;
    }
  };
  const window = {supabaseClient: client};
  const context = {window, localStorage: {getItem() { return null; }, setItem() {}, removeItem() {}}, console};
  vm.runInNewContext(fs.readFileSync('js/services/peticiones.service.js', 'utf8'), context);
  return {service: window.ETPeticiones, calls, get inserts() { return inserts; }};
}

(async function () {
  const abierta = {id: 'abierta', unidad: '2761', peticion: 'Balatas delanteras', estatus: 'Revisado por almacen'};
  const conflicto = loadService([abierta]);
  const bloqueada = await conflicto.service.crear({unidad: '2761', peticion: 'Filtro de aire'});
  assert.equal(bloqueada.error.code, 'PETICION_ABIERTA_UNIDAD');
  assert.deepEqual(bloqueada.error.peticionesAbiertas, [abierta]);
  assert.equal(conflicto.inserts, 0, 'no debe insertar cuando existe una petición abierta');
  assert.deepEqual(Array.from(conflicto.calls.find(call => call[0] === 'in')[2]), ['Pendiente', 'Revisado por almacen']);
  assert.match(conflicto.calls.find(call => call[0] === 'or')[1], /rbac_cancelado\.eq\.false/);
  assert.match(conflicto.service.mensajePeticionAbierta('2761', [abierta]), /Balatas delanteras/);
  assert.match(conflicto.service.mensajePeticionAbierta('2761', [abierta]), /agrega los nuevos elementos/i);

  const libre = loadService([]);
  const creada = await libre.service.crear({unidad: '2762', peticion: 'Filtro de aceite'});
  assert.equal(creada.error, null);
  assert.equal(libre.inserts, 1);

  const rechazada = loadService([{...abierta, estado_autorizacion: 'rechazada'}]);
  const creadaTrasRechazo = await rechazada.service.crear({unidad: '2761', peticion: 'Filtro de aire'});
  assert.equal(creadaTrasRechazo.error, null, 'una solicitud rechazada no debe bloquear una nueva');
  assert.equal(rechazada.inserts, 1);

  const stock = loadService([abierta]);
  const creadaStock = await stock.service.crear({unidad: 'STOCK', peticion: 'Consumibles'});
  assert.equal(creadaStock.error, null);
  assert.equal(stock.inserts, 1);
  assert.equal(stock.calls.some(call => call[0] === 'ilike'), false, 'STOCK no debe ejecutar la validación');

  const main = fs.readFileSync('modulos/peticiones.html', 'utf8');
  const coordinadores = fs.readFileSync('modulos/peticiones-coordinadores.html', 'utf8');
  for (const source of [main, coordinadores]) {
    assert.match(source, /PETICION_ABIERTA_UNIDAD/);
    assert.match(source, /mostrarPeticionAbierta/);
  }
  console.log('Peticiones: bloqueo por unidad abierta, detalle y excepción de STOCK verificados.');
})().catch(error => { console.error(error); process.exit(1); });
