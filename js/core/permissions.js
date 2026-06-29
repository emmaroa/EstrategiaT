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
      TIEMPO_EXTRA: "Tiempo Extra",
      INVENTARIO: "Inventario",
      COMPRAS: "Compras",
      PROVEEDORES: "Proveedores",
      REPORTES: "Reportes",
      NOTIFICACIONES: "Notificaciones",
      DOCUMENTOS: "Documentos",
      BI: "Inteligencia de Negocio"
    };

  const RUTAS = {
    [MODULOS.DASHBOARD]: "../EstrategiaT/dashboard.html",
    [MODULOS.PARQUE]: "../EstrategiaT/modulos/parque-vehicular.html",
    [MODULOS.PETICIONES]: "../EstrategiaT/modulos/peticiones.html",
    [MODULOS.REQUISICIONES]: "../EstrategiaT/modulos/requisiciones.html",
    [MODULOS.ACUERDOS]: "../EstrategiaT/modulos/acuerdos.html",
    [MODULOS.VALES]: "../EstrategiaT/modulos/vales.html",
    [MODULOS.USUARIOS]: "../EstrategiaT/modulos/usuarios.html",
    [MODULOS.AUDITORIA]: "../EstrategiaT/modulos/auditoria.html",
    [MODULOS.ORDENES_TRABAJO]: "../EstrategiaT/modulos/ordenes-trabajo.html",
    [MODULOS.TIEMPO_EXTRA]: "../EstrategiaT/modulos/tiempo-extra.html",
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
    [MODULOS.BI]: "Análisis avanzado y mantenimiento predictivo.",
    [MODULOS.TIEMPO_EXTRA]: "Gestión de solicitudes y autorizaciones de tiempo extra."
  };

  const PERMISOS = {
    "Administrador del Sistema": Object.values(MODULOS),
    jefe: Object.values(MODULOS),
    Jefe: Object.values(MODULOS),
    "Director": [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.ACUERDOS, MODULOS.VALES, MODULOS.ORDENES_TRABAJO,
      MODULOS.INVENTARIO, MODULOS.COMPRAS, MODULOS.PROVEEDORES,
      MODULOS.REPORTES, MODULOS.NOTIFICACIONES, MODULOS.DOCUMENTOS, MODULOS.BI, MODULOS.TIEMPO_EXTRA
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
      MODULOS.ORDENES_TRABAJO, MODULOS.NOTIFICACIONES, MODULOS.TIEMPO_EXTRA
    ],
    "Solo Lectura": [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.VALES, MODULOS.REPORTES, MODULOS.TIEMPO_EXTRA
    ],
    SuperAdmin: Object.values(MODULOS),
    Admin: [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES, MODULOS.ACUERDOS,
      MODULOS.REQUISICIONES, MODULOS.VALES, MODULOS.AUDITORIA,
      MODULOS.ORDENES_TRABAJO, MODULOS.INVENTARIO, MODULOS.COMPRAS, MODULOS.PROVEEDORES,
      MODULOS.REPORTES, MODULOS.NOTIFICACIONES, MODULOS.DOCUMENTOS, MODULOS.BI, MODULOS.TIEMPO_EXTRA
    ],
    Compras: [MODULOS.DASHBOARD, MODULOS.PETICIONES, MODULOS.REQUISICIONES, MODULOS.COMPRAS, MODULOS.PARQUE],
    Almacen: [MODULOS.DASHBOARD, MODULOS.PETICIONES, MODULOS.VALES, MODULOS.INVENTARIO, MODULOS.PARQUE],
    Consulta: [
      MODULOS.DASHBOARD, MODULOS.PARQUE, MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, MODULOS.VALES, MODULOS.REPORTES
    ],
    CapturistaPV: [MODULOS.DASHBOARD, MODULOS.PARQUE]
  };

  const ACCIONES_LECTURA = ["ver", "consultar", "exportar", "imprimir"];

  function normalizarRol(rol) {
    if (!rol) return "";
    const valor = String(rol).trim();
    const clave = valor.toLowerCase();
    if (clave === "superadmin") return "SuperAdmin";
    if (clave === "admin") return "Admin";
    if (clave === "jefe") return "jefe";
    return valor;
  }

  function obtenerPermisosModulosDesdeValor(valor) {
    if (!valor) return [];

    if (Array.isArray(valor)) {
      return valor
        .map(function (item) {
          if (!item) return null;
          if (typeof item === "string") {
            return { modulo: item.trim(), permiso: "editar" };
          }
          if (typeof item === "object") {
            const modulo = String(item.modulo || item.nombre || item.module || "").trim();
            if (!modulo) return null;
            const permiso = String(item.permiso || item.acceso || item.nivel || "").trim().toLowerCase();
            let permisoFinal = "none";
            if (permiso === "ver" || permiso === "vista" || permiso === "view" || permiso === "solo vista") {
              permisoFinal = "ver";
            } else if (permiso === "editar" || permiso === "edit" || permiso === "write" || permiso === "modificar") {
              permisoFinal = "editar";
            }
            return { modulo, permiso: permisoFinal };
          }
          return null;
        })
        .filter(Boolean);
    }

    if (typeof valor === "string") {
      const texto = valor.trim();
      if (!texto) return [];

      try {
        const parseado = JSON.parse(texto);
        if (Array.isArray(parseado)) {
          return obtenerPermisosModulosDesdeValor(parseado);
        }
      } catch (_) {}

      return texto.split(",").map(function (item) {
        return { modulo: item.trim(), permiso: "editar" };
      }).filter(function (item) {
        return item.modulo;
      });
    }

    return [];
  }

  function obtenerPermisosModulosUsuario(usuario) {
    const datos = usuario || {};
    return obtenerPermisosModulosDesdeValor(
      datos.modulos_permitidos ?? datos.modulos ?? datos.permisos_modulos ?? datos.permisos ?? datos.accesos
    );
  }

  function obtenerModulosUsuario(usuario) {
    const permisosModulos = obtenerPermisosModulosUsuario(usuario);

    if (permisosModulos.length) {
      return permisosModulos
        .filter(function (item) { return item.permiso !== "none"; })
        .map(function (item) { return item.modulo; })
        .filter(function (modulo) {
          return Object.values(MODULOS).includes(modulo);
        });
    }

    const rol = normalizarRol((usuario || {}).rol || (usuario || {}).cargo || (usuario || {}).tipo || "");
    return PERMISOS[rol] || [];
  }

  function obtenerPermisoModuloUsuario(usuario, modulo) {
    const permisosModulos = obtenerPermisosModulosUsuario(usuario);
    const encontrado = permisosModulos.find(function (item) {
      return item.modulo === modulo;
    });

    if (encontrado) {
      return encontrado.permiso;
    }

    const rol = normalizarRol((usuario || {}).rol || (usuario || {}).cargo || (usuario || {}).tipo || "");
    if (["super_admin", "SuperAdmin", "Administrador del Sistema", "Admin", "admin", "jefe", "Jefe"].includes(rol)) {
      return "editar";
    }

    return (PERMISOS[rol] || []).includes(modulo) ? "editar" : "none";
  }

  function puedeAcceder(rolOUsuario, modulo) {
    const modulos = typeof rolOUsuario === "object"
      ? obtenerModulosUsuario(rolOUsuario)
      : (PERMISOS[normalizarRol(rolOUsuario)] || []);
    return modulos.includes(modulo);
  }

  function puedeVerModulo(usuario, modulo) {
    const permiso = obtenerPermisoModuloUsuario(usuario, modulo);
    return permiso === "ver" || permiso === "editar";
  }

  function puedeEditarModulo(usuario, modulo) {
    return obtenerPermisoModuloUsuario(usuario, modulo) === "editar";
  }

  function esSoloLectura(rolOUsuario) {
    const rol = typeof rolOUsuario === "object" ? (rolOUsuario.rol || "") : rolOUsuario;
    return normalizarRol(rol) === "Solo Lectura" || normalizarRol(rol) === "Consulta";
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
    obtenerModulosUsuario,
    obtenerPermisosModulosUsuario,
    obtenerPermisoModuloUsuario,
    puedeAcceder,
    puedeVerModulo,
    puedeEditarModulo,
    esSoloLectura,
    obtenerRutaModulo,
    ACCIONES_LECTURA
  };
})(window);
