const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const layout = fs.readFileSync(path.resolve(__dirname, "../js/core/layout.js"), "utf8");

assert.match(layout, /prepararBuscadorNavegacion/, "Debe existir el buscador de modulos");
assert.match(layout, /permitidos\.includes\(modulo\)/, "El menu debe respetar permisos");
assert.match(layout, /nombre: "Compras y SIIF"/, "Compras y SIIF deben tener un grupo propio");
assert.match(layout, /nombre: "Colaboración"/, "Las herramientas colaborativas deben estar agrupadas");
assert.match(layout, /nombre: "Sistema", modulos: \["Usuarios", "Roles", "Auditoría"\]/,
  "Licencias no debe permanecer expuesta en la navegación principal");
assert.match(layout, /et-breadcrumb-current/, "El encabezado debe mostrar el módulo actual");
assert.match(layout, /insertAdjacentHTML\("beforeend", "<span>Menú<\/span>"\)/,
  "El botón móvil debe tener una etiqueta visible");
assert.match(layout, /licenciaEnPerfil[\s\S]*mi-perfil/, "El panel de licencia debe cargarse únicamente desde Mi perfil");

const perfilHtml = fs.readFileSync(path.resolve(__dirname, "../modulos/mi-perfil.html"), "utf8");
const perfilJs = fs.readFileSync(path.resolve(__dirname, "../js/modules/mi-perfil.js"), "utf8");
const sobrio = fs.readFileSync(path.resolve(__dirname, "../css/interfaz-sobria.css"), "utf8");
assert.match(perfilHtml, /id="herramientasAdministracion" hidden/, "Las herramientas sensibles deben vivir en Mi perfil");
assert.match(perfilJs, /puedeAcceder\(usuario, "Licencias"\)/, "Licencias debe mostrarse sólo con permiso");
assert.match(sobrio, /Paso 2 — navegación y encabezados/, "Falta la capa visual de navegación");

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
