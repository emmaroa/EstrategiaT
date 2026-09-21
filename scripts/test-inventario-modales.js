const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elementos = new Map();
function elemento(id) {
  if (!elementos.has(id)) {
    const clases = new Set();
    elementos.set(id, { value: '', dataset: {}, handlers: {}, attributes: {},
      classList: { add: value => clases.add(value), remove: value => clases.delete(value), contains: value => clases.has(value) },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, callback) { this.handlers[name] = callback; },
      reset() {}, focus() {}, querySelector() { return null; }
    });
  }
  return elementos.get(id);
}
let inicio;
let editar = true;
let ubicaciones = true;
const cerrar = elemento('cerrarArticulo');
cerrar.dataset.close = 'modalInventario';
const context = {
  window: { validarPermiso: () => true, ETInventario: {
    puedeEditar: () => editar, puedeCrearUbicacion: () => ubicaciones,
    cargar: async () => ({ error: { message: 'Prueba sin red' } })
  } },
  document: { getElementById: elemento, addEventListener: (_, callback) => { inicio = callback; },
    querySelectorAll: selector => selector === '[data-close]' ? [cerrar] : [] },
  alert() {}
};
vm.runInNewContext(fs.readFileSync('js/modules/inventario.js', 'utf8'), context);
inicio();
elemento('btnNuevoInventario').handlers.click();
assert.ok(elemento('modalInventario').classList.contains('show'));
assert.equal(elemento('modalInventario').attributes['aria-hidden'], 'false');
cerrar.handlers.click();
assert.ok(!elemento('modalInventario').classList.contains('show'));
editar = false;
elemento('btnNuevoInventario').handlers.click();
assert.ok(!elemento('modalInventario').classList.contains('show'));
ubicaciones = false;
elemento('btnNuevaUbicacion').handlers.click();
assert.ok(!elemento('modalUbicacion').classList.contains('show'));
ubicaciones = true;
elemento('btnNuevaUbicacion').handlers.click();
assert.ok(elemento('modalUbicacion').classList.contains('show'));
assert.match(fs.readFileSync('css/style.css', 'utf8'), /\.modal\.show\s*\{\s*display:\s*flex/);
console.log('Inventario: botones abren y cierran modales con la clase visible; sin permiso no abren.');
