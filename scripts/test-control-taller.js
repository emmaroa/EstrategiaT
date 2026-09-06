const fs=require("fs"),path=require("path"),assert=require("assert"),root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"modulos/control-taller.html"),"utf8"),service=fs.readFileSync(path.join(root,"js/services/control-taller.js"),"utf8"),migration=fs.readFileSync(path.join(root,"supabase/migrations/038_control_ingresos_taller.sql"),"utf8"),reportes=fs.readFileSync(path.join(root,"supabase/migrations/039_reportes_derivados_control_area.sql"),"utf8"),permissions=fs.readFileSync(path.join(root,"js/core/permissions.js"),"utf8");
assert.match(html,/id="tituloControlArea">Control Área/);assert.match(html,/Refacciones necesarias/);assert.match(html,/Reporte Director/);
assert.match(html,/<input id="unidadTaller" type="text"/);assert.doesNotMatch(html,/<select id="unidadTaller"/);
assert.match(service,/cargarTodosTaller\("ingresos_taller"/);assert.match(service,/cargarTodosTaller\("parque_vehicular"/);assert.match(service,/resumenDependencias/);assert.match(service,/exportarDependencias/);assert.match(service,/exportarDetalle/);
assert.match(migration,/idx_ingresos_taller_unidad_abierta/);assert.match(migration,/sincronizar_disponibilidad_taller/);assert.match(permissions,/CONTROL_TALLER: "Control de Taller"/);
assert.match(service,/obtenerAreasControl/);assert.match(service,/areaDeUnidad/);assert.match(service,/unidadesTaller=accesoGlobalControl\?todasUnidades:todasUnidades\.filter/);assert.match(service,/rolGlobalControl/);
assert.match(service,/function buscarUnidadEscrita/);assert.match(service,/La unidad todavía no coincide con Parque Vehicular/);
assert.match(service,/function cargarTodosTaller/);assert.match(service,/\.range\(desde,desde\+999\)/);assert.match(service,/cargarTodosTaller\("parque_vehicular"/);assert.match(service,/combustible==="electrico"\|\|combustible==="hibrido"/);
assert.match(reportes,/reporte_control_area_dependencias/);assert.match(reportes,/reporte_control_area_talleres/);assert.match(reportes,/reporte_control_area_modelos/);assert.match(reportes,/FROM public\.parque_vehicular p[\s\S]*LEFT JOIN public\.ingresos_taller i/);
const pendientes=fs.readFileSync(path.join(root,"supabase/migrations/040_ingresos_taller_pendientes.sql"),"utf8");
assert.match(html,/tablaPendientesTaller/);assert.match(service,/cargarTodosTaller\("ingresos_taller_pendientes"/);assert.match(service,/renderizarPendientesTaller/);assert.match(service,/fila-pendiente/);assert.match(pendientes,/electricas:E-449/);assert.match(pendientes,/electricas:E-4422/);
const vm = require("vm");
const ctx = vm.createContext({window:{},document:{addEventListener(){}}});
vm.runInContext(service, ctx);
assert.strictEqual(ctx.areaDeUnidad({combustible:"Eléctrico",descripcion:"Patrulla"}), "Electricas");
assert.strictEqual(ctx.areaDeUnidad({combustible:"Eléctrico",descripcion:"Camión recolector"}), "Colectores");
assert.strictEqual(ctx.areaDeUnidad({combustible:"Eléctrico",grupo:"Barredoras",descripcion:"Unidad"}), "Barredoras");
assert.strictEqual(ctx.areaDeUnidad({combustible:"Diesel",descripcion:"Recolector"}), "Colectores");
assert.strictEqual(ctx.areaPendienteControl({area:"Electricas",unidad_descripcion:"Barredora eléctrica"},[]), "Barredoras");
assert.strictEqual(ctx.areaPendienteControl({area:"Electricas",numero_economico:"E-1"},[{numero_economico:"E1",combustible:"Eléctrico",descripcion:"Recolector"}]), "Colectores");
vm.runInContext(`
  const todasUnidades = [
    {id:"patrulla",combustible:"Eléctrico",descripcion:"Patrulla",dependencia:"Seguridad"},
    {id:"barredora",combustible:"Eléctrico",descripcion:"Barredora",dependencia:"Limpia"},
    {id:"colector",combustible:"Eléctrico",descripcion:"Recolector",dependencia:"Limpia"}
  ];
  areasControl=["Electricas"];
  unidadesTaller=todasUnidades.filter(u=>areasControl.includes(areaDeUnidad(u)));
  ingresosTaller=[
    {vehiculo_id:"patrulla",estatus:"En curso",dependencia:"Dependencia anterior"},
    {vehiculo_id:"patrulla",estatus:"En curso"},
    {vehiculo_id:"barredora",estatus:"En curso"}
  ];
`, ctx);
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.resumenDependencias())), [{dependencia:"Seguridad",total:1,taller:1,activas:0}]);
assert.match(html, /<select id="tipoMovimiento"[^>]*>[\s\S]*?<option value="Ambos">Preventivo y correctivo<\/option><\/select>/);
console.log("Control de Taller: áreas por coordinador, resumen y menú de movimientos verificados.");
