const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('modulos/vales.html', 'utf8');
const funcion = html.slice(html.indexOf('    function imprimirVale('), html.indexOf('    function obtenerClaseEstatusVale('));
let impresiones = 0, ventanas = 0, contenido = '';
let marco;
const ventana = { focus() {}, print() { impresiones++; }, document: {
  open() {}, write(text) { contenido = text; }, close() { marco?.onload?.(); marco?.onload?.(); }
} };
const vale = { id: 'nuevo', folio: '1501-2026-V', unidad: '001', refaccion: 'Filtro', estatus: 'Pendiente' };
const context = { window: { open() { ventanas++; return ventana; } },
  document: { getElementById: () => null, createElement() { marco = { style: {}, contentWindow: ventana }; return marco; }, body: { appendChild() {} } },
  obtenerValePorId: () => vale, obtenerUsuarioVale: () => ({ nombre: 'Emma' }),
  escaparHTMLVale: String, formatearFechaVale: () => '', formatearMaterialVale: String,
  registrarAuditoria() {}, alert() {}
};
vm.runInNewContext(funcion, context);
context.imprimirVale(vale.id, vale);
assert.equal(impresiones, 1, 'Una impresión aunque load se dispare dos veces');
assert.equal(ventanas, 0, 'El alta no depende de ventanas emergentes');
assert.ok(contenido.includes(vale.folio), 'Imprime el folio confirmado');
marco = null;
context.imprimirVale(vale.id);
assert.equal(ventanas, 1, 'Conserva la impresión manual');
assert.equal(impresiones, 1);
assert.ok(html.indexOf('valeParaImprimir = Object.assign') > html.indexOf('if (!valeGuardado?.folio)'));
assert.ok(html.includes('if (!valeParaImprimir) alert("Vale guardado correctamente.")'));
console.log('Vales: impresión automática única con folio confirmado, sin popup, y opción manual conservada.');
