/**
 * Control de acceso basado en roles — ERP Talleres
 * Roles nuevos + compatibilidad con roles legacy del sistema v1
 */
(function (global) {
  const MODULOS = {
    DASHBOARD: "Dashboard",
    PARQUE: "Parque Vehicular",
    PETICIONES: "Peticiones",
    REQUISICIONES: "Requisiciones",
    ACUERDOS: "Acuerdos",
    VALES: "Vales",
    USUARIOS: "Usuarios",
    AUDITORIA: "Auditoría",
    ORDENES_TRABAJO: "Órdenes de Trabajo",
    INVENTARIO: "Inventario",
    COMPRAS: "Compras",
    PROVEEDORES: "Proveedores",
    REPORTES: "Reportes",
    NOTIFICACIONES: "Notificaciones",
    DOCUMENTOS: "Documentos",
    BI: "Inteligencia de Negocio"
  };

  const RUTAS = {
    [MODULOS.DASHBOARD]: "dashboard.html",
    [MODULOS.PARQUE]: "../EstrategiaT/modulos/parque-vehicular.html",
    [MODULOS.PETICIONES]: "../EstrategiaT/modulos/peticiones.html",
    [MODULOS.REQUISICIONES]: "../EstrategiaT/modulos/requisiciones.html",
    [MODULOS.ACUERDOS]: "../EstrategiaT/modulos/acuerdos.html",
    [MODULOS.VALES]: "../EstrategiaT/modulos/vales.html",
    [MODULOS.USUARIOS]: "../EstrategiaT/modulos/usuarios.html",
    [MODULOS.AUDITORIA]: "../EstrategiaT/modulos/auditoria.html",
    [MODULOS.ORDENES_TRABAJO]: "../EstrategiaT/modulos/ordenes-trabajo.html",
    [MODULOS.INVENTARIO]: "../EstrategiaT/modulos/inventario.html",
    [MODULOS.COMPRAS]: "../EstrategiaT/modulos/compras.html",
    [MODULOS.PROVEEDORES]: "../EstrategiaT/modulos/proveedores.html",
    [MODULOS.REPORTES]: "../EstrategiaT/modulos/reportes.html",
    [MODULOS.NOTIFICACIONES]: "../EstrategiaT/modulos/notificaciones.html",
    [MODULOS.DOCUMENTOS]: "../EstrategiaT/modulos/documentos.html",
    [MODULOS.BI]: "../EstrategiaT/modulos/bi.html"
  };

  const DESCRIPCIONES = {
    [MODULOS.DASHBOARD]: "Indicadores ejecutivos y KPIs operativos.",
    [MODULOS.PARQUE]: "Expediente digital de unidades y seguimiento de flota.",
    [MODULOS.PETICIONES]: "Solicitudes de refacciones al almacén.",
    [MODULOS.REQUISICIONES]: "Requisiciones, órdenes de compra y pagos.",
    [MODULOS.ACUERDOS]: "Seguimiento de acuerdos, compromisos y plazos.",
    [MODULOS.VALES]: "Vales de salida con folio, firma y trazabilidad.",
    [MODULOS.USUARIOS]: "Administración de usuarios, roles y permisos.",
    [MODULOS.AUDITORIA]: "Registro de actividad y trazabilidad del sistema.",
    [MODULOS.ORDENES_TRABAJO]: "Órdenes de trabajo, diagnóstico y reparación.",
    [MODULOS.INVENTARIO]: "Almacén, kardex, stock mínimo y movimientos.",
    [MODULOS.COMPRAS]: "Cotizaciones, órdenes de compra y aprobaciones.",
    [MODULOS.PROVEEDORES]: "Perfiles, contratos y evaluación de proveedores.",
    [MODULOS.REPORTES]: "Reportes personalizados con exportación.",
    [MODULOS.NOTIFICACIONES]: "Alertas, recordatorios y aprobaciones.",
    [MODULOS.DOCUMENTOS]: "Gestión documental centralizada.",
    [MODULOS.BI]: "Análisis avanzado y mantenimiento predictivo."
  };

  const PERMISOS = {
    "Administrador del Sistema": Object.values(MODULOS),
    "Director": [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.ACUERDOS, MODULOS.VALES, MODULOS.ORDENES_TRABAJO,
      MODULOS.INVENTARIO, MODULOS.COMPRAS, MODULOS.PROVEEDORES,
      MODULOS.REPORTES, MODULOS.NOTIFICACIONES, MODULOS.DOCUMENTOS, MODULOS.BI
    ],
    "Coordinador": [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.ACUERDOS, MODULOS.VALES, MODULOS.ORDENES_TRABAJO,
      MODULOS.INVENTARIO, MODULOS.COMPRAS, MODULOS.REPORTES, MODULOS.NOTIFICACIONES
    ],
    "Encargado de Almacén": [
      MODULOS.DASHBOARD, MODULOS.ACUERDOS, MODULOS.PETICIONES, MODULOS.VALES,
      MODULOS.INVENTARIO, MODULOS.NOTIFICACIONES
    ],
    "Técnico": [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES, MODULOS.ACUERDOS,  
      MODULOS.ORDENES_TRABAJO, MODULOS.NOTIFICACIONES
    ],
    "Solo Lectura": [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.VALES, MODULOS.REPORTES
    ],
    SuperAdmin: Object.values(MODULOS),
    Admin: [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES, MODULOS.ACUERDOS,
      MODULOS.REQUISICIONES, MODULOS.VALES, MODULOS.AUDITORIA,
      MODULOS.ORDENES_TRABAJO
    ],
    Compras: [MODULOS.DASHBOARD, MODULOS.PETICIONES, MODULOS.REQUISICIONES, MODULOS.COMPRAS],
    Almacen: [MODULOS.DASHBOARD, MODULOS.PETICIONES, MODULOS.VALES, MODULOS.INVENTARIO],
    Consulta: [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.VALES, MODULOS.REPORTES
    ],
    CapturistaPV: [MODULOS.DASHBOARD, MODULOS.PARQUE]
  };

  const ACCIONES_LECTURA = ["ver", "consultar", "exportar", "imprimir"];

  function puedeAcceder(rol, modulo) {
    const modulos = PERMISOS[rol] || [];
    return modulos.includes(modulo);
  }

  function esSoloLectura(rol) {
    return rol === "Solo Lectura" || rol === "Consulta";
  }

  function obtenerRutaModulo(modulo, desdeModulo) {
    const ruta = RUTAS[modulo] || "#";
    if (!desdeModulo) return ruta;
    return ruta.startsWith("modulos/") ? ruta.replace("modulos/", "") : "../" + ruta;
  }

  global.ETPermissions = {
    MODULOS,
    RUTAS,
    DESCRIPCIONES,
    PERMISOS,
    puedeAcceder,
    esSoloLectura,
    obtenerRutaModulo,
    ACCIONES_LECTURA
  };
})(window);
