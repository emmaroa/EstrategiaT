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
