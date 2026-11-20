const fs = require("fs");
const path = require("path");
const assert = require("assert");

const sobrio = fs.readFileSync(path.resolve(__dirname, "../css/interfaz-sobria.css"), "utf8");
assert.match(sobrio, /--color-primary:\s*#315f50/i, "Falta el color institucional principal");
assert.match(sobrio, /--bg-body:\s*#f3f5f4/i, "Falta la superficie clara institucional");
assert.match(sobrio, /--bg-body:\s*#111714/i, "Falta la superficie oscura institucional");
assert.match(sobrio, /min-height:\s*44px[\s\S]*border-radius:\s*8px/, "Los campos deben compartir altura y radio");
assert.match(sobrio, /border-radius:\s*7px[\s\S]*font-weight:\s*600/, "Los botones deben usar la geometría sobria");

const dashboard = fs.readFileSync(path.resolve(__dirname, "../dashboard.html"), "utf8");
const login = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
const dashboardStyles = fs.readFileSync(path.resolve(__dirname, "../css/dashboard.css"), "utf8");
assert.match(dashboard, /interfaz-sobria\.css\?v=2\.0\.190/, "El dashboard debe cargar la base visual actual");
assert.match(login, /interfaz-sobria\.css\?v=2\.0\.190/, "El acceso debe cargar la base visual actual");
assert.match(dashboard, /dashboard\.css\?v=2\.0\.191/, "El dashboard debe cargar su capa visual actual");
assert.match(sobrio, /Paso 4[^\n]*acceso claro/i, "Falta la capa sobria del acceso");
assert.match(sobrio, /login-security-note[\s\S]*Sesión protegida|login-security-note/, "Falta el indicador visual de acceso protegido");
assert.match(dashboardStyles, /Paso 4[^\n]*dashboard ejecutivo/i, "Falta la capa ejecutiva del dashboard");
assert.match(dashboardStyles, /--dashboard-blue:[\s\S]*--dashboard-green:[\s\S]*--dashboard-amber:/, "Falta color contextual en el dashboard");
assert.match(dashboardStyles, /@media \(max-width: 520px\)[\s\S]*dashboard-kpi-card/, "Falta la adaptación compacta del dashboard");
assert.match(dashboard, /dashboard-kpi-group dashboard-kpi-group-personal/, "El grupo de personal debe permitir el detalle de ausencias");
assert.match(dashboardStyles, /dashboard-kpi-group-personal\s*\{[\s\S]*?overflow:\s*visible/, "El detalle de ausencias no debe quedar recortado");
assert.match(dashboardStyles, /dashboard-kpi-group-personal:has\(\.kpi-ausentes-card:hover\)[\s\S]*?z-index:\s*60/, "El detalle de ausencias debe mostrarse sobre los demás paneles");
const inicio = dashboard.indexOf("function aplicarPreferenciasKpisDashboard()");
const fin = dashboard.indexOf("\nfunction obtenerAnio", inicio);
const cuerpo = dashboard.slice(inicio, fin);
const render = dashboard.slice(dashboard.indexOf("function renderizarDashboard()"), dashboard.indexOf("function renderizarMatrizSolicitudesPago"));

assert.ok(inicio >= 0, "No existe la aplicacion de preferencias de KPIs");
assert.strictEqual((cuerpo.match(/aplicarPreferenciasKpisDashboard\(\)/g) || []).length, 1, "La funcion de preferencias no debe llamarse recursivamente");
assert.match(render, /aplicarPreferenciasKpisDashboard\(\);\s*\}/, "Las preferencias deben aplicarse al terminar de renderizar");

console.log("Personalizacion: preferencias de KPIs aplicadas al finalizar el dashboard.");

const vm = require("vm");
const storage = new Map();
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const ctx = vm.createContext({ localStorage });
vm.runInContext(dashboard.slice(dashboard.indexOf("function leerSeleccionDashboard("), inicio), ctx);
const usuario = { id: "uno", dashboard_kpis: ["legacy"] };
assert.deepStrictEqual(Array.from(ctx.leerSeleccionDashboard("etDashboardKpis_", usuario, "dashboard_kpis")), ["legacy"]);
localStorage.setItem("etDashboardKpis_uno", "[]");
assert.strictEqual(ctx.leerSeleccionDashboard("etDashboardKpis_", usuario, "dashboard_kpis").length, 0, "Ocultar todos debe sobrevivir a una recarga");
assert.strictEqual(ctx.leerSeleccionDashboard("etDashboardKpis_", {id: "dos"}, "dashboard_kpis"), null, "No compartir selecciones entre usuarios");
localStorage.setItem("etDashboardKpis_uno", "invalid");
assert.deepStrictEqual(Array.from(ctx.leerSeleccionDashboard("etDashboardKpis_", usuario, "dashboard_kpis")), ["legacy"]);

const estilos = new Map(), atributos = new Map();
const window = {};
const document = { readyState: "loading", addEventListener() {}, querySelectorAll() { return []; }, documentElement: {
  setAttribute: (key, value) => atributos.set(key, value),
  style: { setProperty: (key, value) => estilos.set(key, value), removeProperty: key => estilos.delete(key) }
} };
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../js/core/theme.js"), "utf8"), { window, document, localStorage });
localStorage.setItem("usuarioActivo", JSON.stringify({id: "uno"}));
window.ETTheme.setCustomColors({primary: "#123456", secondary: "invalid", teal: "#abcdef"});
window.ETTheme.applyPalette("personalizada");
window.ETTheme.applyTheme("light");
assert.strictEqual(estilos.get("--color-primary"), "#123456");
assert.strictEqual(window.ETTheme.getCustomColors().secondary, "#fd9319");
assert.strictEqual(window.ETTheme.getPalette(), "personalizada");
localStorage.setItem("usuarioActivo", JSON.stringify({id: "dos"}));
assert.strictEqual(window.ETTheme.getPalette(), "original");
assert.strictEqual(window.ETTheme.getTheme(), "light");
assert.strictEqual(window.ETTheme.getCustomColors().primary, "#fc712b");
window.ETTheme.applyTheme("dark");
assert.strictEqual(window.ETTheme.getTheme(), "dark", "Conservar el tema oscuro elegido por el usuario");
localStorage.setItem("usuarioActivo", JSON.stringify({id: "uno"}));
assert.strictEqual(window.ETTheme.getTheme(), "light");
window.ETTheme.applyPalette("oceano");
assert.strictEqual(estilos.size, 0, "Cambiar de paleta debe retirar los colores propios");
assert.strictEqual(atributos.get("data-palette"), "oceano");
console.log("Personalizacion: seleccion vacia, colores propios, validacion y preferencias por usuario verificadas.");
