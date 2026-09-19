const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const contexto = { window: {}, Intl, Date };
for (const archivo of ['js/core/permissions.js', 'js/services/licencias.service.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(raiz, archivo), 'utf8'), contexto);
}
const permisos = contexto.window.ETPermissions;
const licencias = contexto.window.ETLicencias;

(async () => {
  for (const rol of ['Admin', 'Administrador del Sistema', 'jefe', 'Jefe', 'Director', 'Proveedor', 'Consulta']) {
    for (const modulos of [[], [{ modulo: 'Licencias', permiso: 'editar' }]]) {
      const usuario = { id: 'otro', usuario: 'emma', rol, modulos_permitidos: modulos };
      assert.equal(permisos.obtenerModulosUsuario(usuario).includes('Licencias'), false, rol);
      assert.equal(permisos.obtenerPermisoModuloUsuario(usuario, 'Licencias'), 'none', rol);
      assert.equal(permisos.puedeVerModulo(usuario, 'Licencias'), false, rol);
    }
  }
  for (const rol of ['SuperAdmin', 'super_admin', 'Super Admin']) {
    const usuario = { id: 'propietario', usuario: 'emma', rol, modulos_permitidos: [{ modulo: 'Dashboard', permiso: 'ver' }] };
    assert.ok(permisos.obtenerModulosUsuario(usuario).includes('Licencias'));
    assert.equal(permisos.obtenerPermisoModuloUsuario(usuario, 'Licencias'), 'editar');
  }
  assert.equal(permisos.obtenerRutaModulo('Licencias', true), 'licencias.html');
  for (const rol of ['SuperAdmin', 'super_admin', 'super-admin', 'Director', 'Admin']) {
    assert.equal(permisos.puedeDescargarRespaldo({ rol }), true, rol);
  }
  for (const rol of ['Administrador del Sistema', 'jefe', 'Proveedor', 'Consulta', 'Coordinador', '']) {
    assert.equal(permisos.puedeDescargarRespaldo({ rol }), false, rol);
  }
  assert.equal(permisos.puedeDescargarRespaldo(null), false);
  const otroSuperadmin = { id: 'otro', usuario: 'otro', rol: 'SuperAdmin', modulos_permitidos: [{ modulo: 'Licencias', permiso: 'editar' }] };
  assert.equal(permisos.obtenerModulosUsuario(otroSuperadmin).includes('Licencias'), false);
  assert.equal(permisos.obtenerModulosUsuario({ ...otroSuperadmin, modulos_permitidos: [] }).includes('Licencias'), false);
  assert.equal(permisos.obtenerPermisoModuloUsuario(otroSuperadmin, 'Licencias'), 'none');
  assert.equal(licencias.fechaVencimiento('2026-10-01T07:00:00Z'), '2026-09-30');
  assert.equal(licencias.fechaVencimiento(null), '');
  assert.throws(() => licencias.validar({ codigo: 'ET-1', cliente: 'A', inicia_el: '2026-10-02', vence_el: '2026-10-01' }));
  assert.throws(() => licencias.validar({ codigo: 'ET-1', cliente: 'A', vence_el: '2026-02-30' }));
  assert.equal(licencias.validar({ codigo: ' et-a ', cliente: ' A ' }).codigo, 'ET-A');
  let ahora = 1000;
  let usuario = { id: 'propietario', usuario: 'emma', rol: 'SuperAdmin', sesion_expira_en: 99999999 };
  let llamadas = [];
  const db = { rpc: async (nombre, args) => { llamadas.push({ nombre, args }); return { data: [], error: null }; } };
  const api = licencias.crear(db, () => usuario, () => ahora);
  assert.throws(() => api.listar(), /Desbloquea/);
  assert.equal(llamadas.length, 0);
  const clave = 'a'.repeat(64);
  await api.desbloquear(clave);
  assert.equal(api.vigente(), true);
  await api.guardar({ codigo: 'ET-A', cliente: 'Cliente' });
  assert.equal(llamadas[1].nombre, 'admin_guardar_licencia');
  assert.equal(llamadas[1].args.p_usuario_id, 'propietario');
  assert.equal(llamadas[1].args.p_clave, clave);
  usuario = { ...usuario, id: 'otro' };
  assert.equal(api.vigente(), false);
  assert.throws(() => api.listar(), /Desbloquea/);
  usuario = { ...usuario, id: 'propietario' };
  await api.desbloquear(clave);
  ahora += 15 * 60 * 1000;
  assert.equal(api.vigente(), false);
  assert.throws(() => api.listar(), /Desbloquea/);
  usuario = { ...usuario, rol: 'Admin' };
  await assert.rejects(() => api.desbloquear(clave), /Desbloquea/);
  usuario = { ...usuario, rol: 'SuperAdmin' };
  const rechazado = licencias.crear({ rpc: async () => ({ error: { code: '42501' } }) }, () => usuario, () => ahora);
  await assert.rejects(() => rechazado.desbloquear(clave), /Desbloquea/);
  assert.equal(rechazado.vigente(), false);
  let resolver;
  const pendiente = licencias.crear({ rpc: () => new Promise(resolve => { resolver = resolve; }) }, () => usuario, () => ahora);
  const intento = pendiente.desbloquear(clave);
  pendiente.bloquear(); resolver({ data: [], error: null });
  await assert.rejects(() => intento, /Desbloquea/);
  assert.equal(pendiente.vigente(), false);
  console.log('Licencias Admin: roles, permisos personalizados, fechas, bloqueo, expiración y cambio de usuario correctos.');
})().catch(error => { console.error(error); process.exitCode = 1; });
