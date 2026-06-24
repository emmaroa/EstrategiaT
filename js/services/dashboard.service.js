/**
 * Servicio de analítica para Dashboard ejecutivo
 */
(function (global) {
  function obtenerAnio(fecha) {
    if (!fecha) return "";
    return new Date(fecha + "T00:00:00").getFullYear().toString();
  }

  function obtenerMes(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha + "T00:00:00");
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function filtrarPorAnio(datos, anio) {
    if (!anio) return datos;
    return datos.filter(function (item) {
      return obtenerAnio(item.fecha) === anio;
    });
  }

  function filtrarPorRango(datos, desde, hasta) {
    if (!desde && !hasta) return datos;
    return datos.filter(function (item) {
      if (!item.fecha) return false;
      if (desde && item.fecha < desde) return false;
      if (hasta && item.fecha > hasta) return false;
      return true;
    });
  }

  function sumarMontos(datos) {
    return datos.reduce(function (suma, item) {
      return suma + Number(item.monto || 0);
    }, 0);
  }

  function agruparSuma(datos, campo) {
    const acumulado = {};
    datos.forEach(function (item) {
      const llave = item[campo] || "Sin dato";
      const monto = Number(item.monto || 0);
      acumulado[llave] = (acumulado[llave] || 0) + monto;
    });
    return acumulado;
  }

  function agruparConteo(datos, campo) {
    const acumulado = {};
    datos.forEach(function (item) {
      const llave = item[campo] || "Sin dato";
      acumulado[llave] = (acumulado[llave] || 0) + 1;
    });
    return acumulado;
  }

  function topN(objeto, limite) {
    limite = limite || 10;
    return Object.entries(objeto)
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, limite);
  }

  function calcularKPIs(datos) {
    const ahora = new Date();
    const anioActual = ahora.getFullYear().toString();
    const mesActual = anioActual + "-" + String(ahora.getMonth() + 1).padStart(2, "0");

    const requisiciones = datos.requisiciones || [];
    const requisicionesOperativas = datos.requisicionesOperativas || requisiciones;
    const vales = datos.vales || [];
    const valesOperativos = datos.valesOperativos || vales;
    const peticiones = datos.peticiones || [];
    const parque = datos.parque || [];
    const usuarios = datos.usuarios || [];

    const aniosEnDatos = {};
    requisiciones.forEach(function (r) {
      const anio = obtenerAnio(r.fecha);
      if (anio) aniosEnDatos[anio] = true;
    });
    const unSoloAnio = Object.keys(aniosEnDatos).length === 1
      ? Object.keys(aniosEnDatos)[0]
      : null;

    const costoAnual = unSoloAnio
      ? sumarMontos(requisiciones)
      : sumarMontos(requisiciones.filter(function (r) {
          return obtenerAnio(r.fecha) === anioActual;
        }));

    const costoMensual = sumarMontos(
      requisiciones.filter(function (r) { return obtenerMes(r.fecha) === mesActual; })
    );

    const partesFrecuentes = topN(agruparConteo(vales, "refaccion"), 5);
    const serviciosFrecuentes = topN(agruparConteo(peticiones, "peticion"), 5);
    const reparacionesCostosas = requisiciones
      .slice()
      .sort(function (a, b) { return Number(b.monto || 0) - Number(a.monto || 0); })
      .slice(0, 5);

    return {
      unidades: parque.length,
      unidadesActivas: parque.filter(function (u) { return u.estatus === "ACTIVO"; }).length,
      unidadesTaller: parque.filter(function (u) { return u.estatus === "TALLER"; }).length,
      peticionesPendientes: peticiones.filter(function (p) { return p.estatus === "Pendiente"; }).length,
      requisicionesActivas: requisicionesOperativas.filter(function (r) { return r.estatus !== "Enviado"; }).length,
      valesEmitidos: vales.length,
      valesPendientes: valesOperativos.filter(function (v) { return v.estatus === "Pendiente"; }).length,
      usuariosActivos: usuarios.filter(function (u) { return u.activo === true; }).length,
      costoAnual: costoAnual,
      costoMensual: costoMensual,
      reqSinOC: requisiciones.filter(function (r) { return !r.oc; }).length,
      facturasPendientes: requisiciones.filter(function (r) { return !r.factura; }).length,
      partesFrecuentes: partesFrecuentes,
      serviciosFrecuentes: serviciosFrecuentes,
      reparacionesCostosas: reparacionesCostosas,
      gastoPorMes: agruparSuma(requisiciones, "fecha"),
      gastoPorDependencia: agruparSuma(requisiciones, "dependencia"),
      gastoPorProveedor: agruparSuma(requisiciones, "proveedor"),
      gastoPorUnidad: agruparSuma(requisiciones, "unidad")
    };
  }

  global.ETDashboard = {
    obtenerAnio,
    obtenerMes,
    filtrarPorAnio,
    filtrarPorRango,
    sumarMontos,
    agruparSuma,
    agruparConteo,
    topN,
    calcularKPIs
  };
})(window);
