const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const calculo = require('../js/modules/calculo-tiempo-extra.js');
const cabecera = 'ID de Empleado,Nombre,Apellido,Fecha,Primera Checada,Última Checada';
const csv = cabecera + '\r\n001,"Nombre, compuesto",Apellido,2026-09-04,06:54,14:00\r\n002,A,B,2026-09-04,07:00,14:00\r\n003,C,D,2026-09-04,07:00,13:59';
const registros = calculo.analizar('\uFEFF' + csv);
assert.equal(registros[0].numero, '001');
assert.equal(registros[0].nombre, 'Nombre, compuesto Apellido');
assert.equal(registros[0].extra, 0);
assert.equal(registros[0].entradaExtra, '13:54');
assert.equal(registros[1].extra, 0);
assert.equal(registros[2].extra, 0);
for (const horarios of ['07:00,07:00', '22:00,06:00', ',14:00', '25:00,14:00']) {
  assert.ok(calculo.analizar(cabecera + '\n1,A,B,2026-09-04,' + horarios)[0].error);
}
assert.ok(calculo.analizar(cabecera + '\n1,A,B,2026-02-30,07:00,15:00')[0].error);
assert.ok(calculo.analizar(cabecera + '\n1,A,B,2026-09-04,07:00,15:00\n1,A,B,2026-09-04,07:00,15:00').every(r => r.error));
assert.throws(() => calculo.analizar('Nombre,Fecha\nA,2026-09-04'));
assert.throws(() => calculo.analizar(cabecera + '\n"abierto'));
assert.equal(calculo.analizar(csv.replaceAll(',', ';').replace('"Nombre; compuesto"', 'Nombre'))[0].extra, 0);

for (const [salida, esperado] of [['13:50', 0], ['14:00', 0], ['14:49', 0], ['14:50', 1], ['14:59', 1], ['15:00', 1], ['15:49', 1], ['15:50', 2], ['16:00', 2]]) {
  const r = calculo.analizar(cabecera + '\n1,A,B,2026-09-04,07:00,' + salida)[0];
  assert.equal(r.extra / 60, esperado, salida);
}
const importables = calculo.analizar(cabecera + '\n001,A,B,2026-09-04,06:54,14:44');

const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { value: '', textContent: '', innerHTML: '', dataset: {}, classList: { add() {}, remove() {} }, querySelectorAll() { return []; } });
  return nodes.get(id);
}
const ctx = vm.createContext({ window: {}, document: { getElementById: node, addEventListener() {}, querySelectorAll() { return []; } }, alert() {}, ETCalculoTiempoExtra: calculo });
let source = fs.readFileSync(path.join(__dirname, '../js/modules/tiempo-extra.js'), 'utf8');
source = source.replace('window.TiempoExtra = {', 'window.test = { anexarAsistenciaCSV, calcularHorasEntre, obtenerTotalHoras, set: r => asistenciaCSV = r, get: () => empleadosAgregados }; window.TiempoExtra = {');
vm.runInContext(source, ctx);
const api = ctx.window.test;
node('periodoInicio').value = '2026-09-04'; node('periodoFin').value = '2026-09-10';
const seleccion = { dataset: { asistencia: '0' }, checked: true };
node('tablaAsistencia').querySelectorAll = () => [seleccion];
api.set(registros); api.anexarAsistenciaCSV();
assert.equal(api.get().length, 0, 'No anexar fracciones que no alcanzan la tolerancia');
api.set(importables); api.anexarAsistenciaCSV();
assert.equal(api.get().length, 1);
assert.equal(api.get()[0].totalHoras, 1);
assert.equal(api.get()[0].detalleDias[0].justificacion, '');
assert.equal(api.get()[0].detalleDias[0].entrada, '13:54');
api.get()[0].detalleDias[0].justificacion = 'Trabajo realizado';
api.anexarAsistenciaCSV();
assert.equal(api.get()[0].detalleDias.length, 1);
assert.equal(api.get()[0].detalleDias[0].justificacion, 'Trabajo realizado');
api.set([{ ...importables[0], numero: '004', fecha: '2026-09-11' }]); api.anexarAsistenciaCSV();
assert.equal(api.get().length, 1);
assert.equal(api.calcularHorasEntre('13:54', '14:00'), 0);
assert.equal(api.calcularHorasEntre('13:54', '14:43'), 0);
assert.equal(api.calcularHorasEntre('13:54', '14:44'), 1);
assert.equal(api.calcularHorasEntre('13:54', '15:44'), 2);
assert.equal(api.calcularHorasEntre(api.get()[0].detalleDias[0].entrada, api.get()[0].detalleDias[0].salida), api.get()[0].totalHoras, 'Editar conserva las horas importadas');
console.log('Tiempo extra CSV: horas enteras, tolerancia de 10 minutos, validación, anexado, periodo, duplicados y justificaciones verificados.');
