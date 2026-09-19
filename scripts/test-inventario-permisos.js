const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let usuario = { id: 'prueba', rol: 'Admin', sesion_expira_en: Date.now() + 60000, modulos_permitidos: [{ modulo: 'Inventario', permiso: 'ver' }] };
let llamadas = 0;
const contexto = {
  window: { supabaseClient: { from() { llamadas++; throw new Error('No debe consultar para escribir'); }, rpc() { llamadas++; throw new Error('No debe escribir'); } } },
  localStorage: { getItem: () => JSON.stringify(usuario) }, Date
};
vm.runInNewContext(fs.readFileSync('js/core/permissions.js', 'utf8'), contexto);
vm.runInNewContext(fs.readFileSync('js/services/inventario.service.js', 'utf8'), contexto);
(async () => {
  const p = contexto.window.ETPermissions;
  const servicio = contexto.window.ETInventario;
  assert.ok(p.obtenerModulosUsuario(usuario).includes('Inventario'));
  assert.equal(servicio.puedeEditar(), false);
  for (const operacion of ['guardarItem', 'guardarUbicacion', 'registrarMovimiento']) {
    assert.ok((await servicio[operacion]({})).error);
  }
  assert.equal(llamadas, 0);
  usuario.modulos_permitidos[0].permiso = 'editar';
  assert.equal(servicio.puedeEditar(), true);
  usuario.modulos_permitidos[0].permiso = 'none';
  assert.equal(servicio.puedeEditar(), false);
  assert.equal(p.obtenerModulosUsuario(usuario).includes('Inventario'), false);
  usuario.modulos_permitidos[0].permiso = 'editar'; usuario.sesion_expira_en = 0;
  assert.equal(servicio.puedeEditar(), false);
  console.log('Inventario: asignación, solo vista, edición, sin acceso y sesión expirada verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
