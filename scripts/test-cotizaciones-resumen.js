const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const filas = Array.from({ length: 1001 }, (_, indice) => ({
  id: String(indice + 1),
  total: 0,
  estatus: "Pendiente",
  requisicion: null
}));
filas.push(
  { id: "1002", total: 0.1, estatus: "Pendiente" },
  { id: "1003", total: 0.2, estatus: "En cotización" },
  { id: "1004", total: 999, estatus: "Rechazada" },
  { id: "1005", total: 999, estatus: "Pendiente", requisicion: "REQ-1" },
  { id: "1006", total: 999, estatus: "Requisición generada automáticamente" },
  { id: "1007", total: "inválido", estatus: "Pendiente" }
);

const rangos = [];
const cliente = {
  from(tabla) {
    assert.equal(tabla, "cotizaciones_almacen");
    const consulta = {
      select() { return consulta; },
      order() { return consulta; },
      range(desde, hasta) {
        rangos.push(desde);
        return Promise.resolve({ data: filas.slice(desde, hasta + 1), error: null });
      }
    };
    return consulta;
  }
};

const contexto = { window: { supabaseClient: cliente } };
vm.runInNewContext(fs.readFileSync("js/services/cotizaciones-almacen.service.js", "utf8"), contexto);
const servicio = contexto.window.ETCotizacionesAlmacen;

(async function verificar() {
  const resultado = await servicio.listarResumen();
  assert.equal(resultado.error, null);
  assert.equal(resultado.data.length, filas.length);
  assert.deepEqual(rangos, [0, 1000]);

  const resumen = servicio.resumirPendientesVincular(resultado.data);
  assert.equal(resumen.cantidad, 1004);
  assert.equal(resumen.totalCentavos, 30);
  assert.equal(resumen.total, 0.3);
  assert.equal(resumen.importesOmitidos, 1);
  assert.equal(servicio.tieneRequisicion({ estatus: "REQUISICIÓN GENERADA por sistema" }), true);
  assert.equal(servicio.estaPendienteVincular({ estatus: "Rechazada", total: 500 }), false);

  const dashboard = fs.readFileSync("dashboard.html", "utf8");
  const peticiones = fs.readFileSync("modulos/peticiones.html", "utf8");
  assert.match(dashboard, /ETCotizacionesAlmacen\.listarResumen\(\)/);
  assert.match(dashboard, /ETCotizacionesAlmacen\.resumirPendientesVincular\(cotizaciones\)/);
  assert.match(peticiones, /ETCotizacionesAlmacen\.resumirPendientesVincular\(cotizacionesFiltradas\)/);

  console.log("Cotizaciones: dashboard y módulo usan paginación completa, el mismo criterio y suma en centavos.");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
