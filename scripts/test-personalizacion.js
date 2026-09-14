const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dashboard = fs.readFileSync(path.resolve(__dirname, "../dashboard.html"), "utf8");
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
assert.strictEqual(window.ETTheme.getTheme(), "dark");
assert.strictEqual(window.ETTheme.getCustomColors().primary, "#fc712b");
localStorage.setItem("usuarioActivo", JSON.stringify({id: "uno"}));
assert.strictEqual(window.ETTheme.getTheme(), "light");
window.ETTheme.applyPalette("oceano");
assert.strictEqual(estilos.size, 0, "Cambiar de paleta debe retirar los colores propios");
assert.strictEqual(atributos.get("data-palette"), "oceano");
console.log("Personalizacion: seleccion vacia, colores propios, validacion y preferencias por usuario verificadas.");
