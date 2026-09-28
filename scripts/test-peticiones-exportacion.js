const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('modulos/peticiones.html', 'utf8');
for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (script[1].trim()) new vm.Script(script[1]);
}
const source = html.slice(html.indexOf('    function obtenerPeticionesFiltradas()'), html.indexOf('    function renderizarPeticiones()'));
let tecnico = false, proveedorVisible = true, autorizado = true, blob, clicks = 0;
const context = {
  buscarPeticion: { value: '' }, filtroUnidadPeticion: { value: '' },
  filtroEstatus: { value: '' }, filtroProveedor: { value: '' }, filtroArea: { value: '' },
  peticiones: Array.from({ length: 35 }, (_, i) => ({
    id: i, fecha: '2026-09-28', unidad: i % 2 ? '123' : '1234', peticion: 'Filtro, "aceite"',
    solicitante: 'José', area: 'Taller', dependencia: 'Servicios', proveedor: 'Proveedor Uno',
    estatus: 'Pendiente', observaciones: ' =SUM(A1)'
  })),
  cotizacionesPorPeticion: new Map([[34, {}]]),
  esRolTecnicoPeticion: () => tecnico,
  puedeVerProveedoresPeticion: () => proveedorVisible,
  puedeAccionPeticion: () => autorizado,
  obtenerValorCanonicoEstatusPeticion: value => value,
  normalizarTextoPeticion: value => String(value).toLowerCase(),
  obtenerFechaOrdenPeticion: p => p.id,
  Blob, URL: { createObjectURL(value) { blob = value; return 'blob:test'; }, revokeObjectURL() {} },
  document: { body: { appendChild() {} }, createElement() { return { click() { clicks++; }, remove() {} }; } },
  setTimeout: callback => callback(), alert() {}
};
vm.createContext(context);
vm.runInContext(source, context);
(async () => {
  context.exportarPeticiones();
  let csv = await blob.text();
  assert.equal(csv.split('\r\n').length, 36, 'Export includes every page');
  assert.ok(csv.includes('"Filtro, ""aceite"""'));
  assert.ok(csv.includes('"\' =SUM(A1)"'), 'Spreadsheet formulas are escaped');
  assert.ok(csv.includes('José'));
  assert.ok(csv.includes('"Sí"'));
  context.buscarPeticion.value = 'aceite';
  context.filtroUnidadPeticion.value = '123';
  context.filtroEstatus.value = 'Pendiente';
  context.filtroProveedor.value = ' proveedor   uno ';
  context.filtroArea.value = 'Taller';
  assert.equal(context.obtenerPeticionesFiltradas().length, 17, 'Combined filters and exact unit');
  context.exportarPeticiones();
  assert.equal((await blob.text()).split('\r\n').length, 18);
  context.filtroArea.value = 'Otra';
  const before = clicks;
  context.exportarPeticiones();
  assert.equal(clicks, before, 'No download for empty results');
  context.filtroArea.value = 'Taller';
  tecnico = true;
  proveedorVisible = false;
  context.exportarPeticiones();
  csv = await blob.text();
  assert.equal(csv.split('\r\n').length, 11, 'Preserves technician visibility limit');
  assert.ok(!csv.includes('Proveedor Uno') && !csv.includes('"Proveedor"'));
  autorizado = false;
  const authorizedClicks = clicks;
  context.exportarPeticiones();
  assert.equal(clicks, authorizedClicks, 'Export permission is enforced');
  console.log('Peticiones: filtros combinados, paginación, permisos, CSV y datos especiales verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
