const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const layout = fs.readFileSync(path.resolve(__dirname, "../js/core/layout.js"), "utf8");

assert.match(layout, /prepararBuscadorNavegacion/, "Debe existir el buscador de modulos");
assert.match(layout, /leerListaNavegacion\("Favoritos", usuario\)/, "Los favoritos deben guardarse por usuario");
assert.match(layout, /leerListaNavegacion\("Recientes", usuario\)/, "Los recientes deben guardarse por usuario");
assert.match(layout, /permitidos\.includes\(modulo\)/, "Favoritos y recientes deben respetar permisos");
assert.match(layout, /registrarModuloReciente\(usuario, moduloActivo\)/, "Debe registrarse la navegacion reciente");

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

console.log("Navegacion: buscador, favoritos, recientes y permisos verificados.");
