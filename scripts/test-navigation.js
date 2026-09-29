const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const layout = fs.readFileSync(path.resolve(__dirname, "../js/core/layout.js"), "utf8");

assert.match(layout, /prepararBuscadorNavegacion/, "Debe existir el buscador de modulos");
assert.match(layout, /permitidos\.includes\(modulo\)/, "El menu debe respetar permisos");

const permissionsSource = fs.readFileSync(path.resolve(__dirname, "../js/core/permissions.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(permissionsSource, context);
const permisosGdavis = [
  { modulo: "Dashboard", permiso: "editar" },
  { modulo: "Tramites Administrativos", permiso: "none" },
  { modulo: "Generar Textos", permiso: "none" },
  { modulo: "Control de Taller", permiso: "editar" }
];
const gdavis = { id: "gdavis", rol: "Coordinador", modulos_permitidos: permisosGdavis };
assert.deepStrictEqual(Array.from(context.window.ETPermissions.obtenerModulosUsuario(gdavis)), ["Dashboard", "Control de Taller"], "La asignacion explicita debe prevalecer sobre el rol");
assert.strictEqual(context.window.ETPermissions.obtenerPermisoModuloUsuario(gdavis, "Tramites Administrativos"), "none", "Sin acceso debe bloquear tramites");
assert.strictEqual(context.window.ETPermissions.obtenerPermisoModuloUsuario(gdavis, "Generar Textos"), "none", "Sin acceso debe bloquear generar textos");

console.log("Navegacion: buscador y permisos verificados.");

for (const rol of ['SuperAdmin', 'Compras']) {
  const usuario = { rol, modulos_permitidos: [{ modulo: 'Dashboard', permiso: 'editar' }] };
  const api = context.window.ETPermissions;
  assert.ok(api.obtenerModulosUsuario(usuario).includes('Crear cotización'), 'El módulo nuevo debe aparecer con listas antiguas para ' + rol);
  assert.equal(api.obtenerPermisoModuloUsuario(usuario, 'Crear cotización'), 'editar');
  usuario.modulos_permitidos.push({ modulo: 'Crear cotización', permiso: 'none' });
  assert.ok(!api.obtenerModulosUsuario(usuario).includes('Crear cotización'), 'Una denegación explícita debe respetarse');
  assert.equal(api.obtenerPermisoModuloUsuario(usuario, 'Crear cotización'), 'none');
}
