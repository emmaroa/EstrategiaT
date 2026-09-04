/**
 * Control de acceso basado en roles — ERP Talleres
 * Roles nuevos + compatibilidad con roles legacy del sistema v1
 */
(function (global) {
    const MODULOS = {
      DASHBOARD: "Dashboard",
      PARQUE: "Parque Vehicular",
      PETICIONES: "Peticiones",
      GESTION_COTIZACIONES: "Gestión de Cotizaciones",
      COTIZACIONES_PROVEEDOR: "Cotizaciones Proveedor",
      SEGUIMIENTO_SIIF_PROVEEDOR: "Seguimiento de trámites SIIF",
      SEGUIMIENTO_PETICIONES: "Seguimiento Peticiones",
      REQUISICIONES: "Requisiciones",
      SEGUIMIENTO_SIIF: "Seguimiento SIIF",
      IMPORTAR_SIIF: "Importar SIIF",
      REQUISICIONES_SIIF: "Requisiciones SIIF",
      ORDENES_COMPRA_SIIF: "Órdenes de Compra SIIF",
      SOLICITUDES_PAGO_SIIF: "Solicitudes de Pago SIIF",
      ACUERDOS: "Acuerdos",
      CALENDARIO: "Calendario",
      VALES: "Vales",
      USUARIOS: "Usuarios",
      AUDITORIA: "Auditoría",
      TIEMPO_EXTRA: "Tiempo Extra",
      TRAMITES_ADMINISTRATIVOS: "Tramites Administrativos",
      GENERAR_TEXTOS: "Generar Textos",
      PORTAL_PROVEEDOR: "Portal Proveedor",
      PETICIONES_PROVEEDOR: "Peticiones de almacén",
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
    [MODULOS.PARQUE]: "modulos/parque-vehicular.html",
    [MODULOS.PETICIONES]: "modulos/peticiones.html",
    [MODULOS.GESTION_COTIZACIONES]: "modulos/peticiones.html?vista=cotizaciones",
    [MODULOS.COTIZACIONES_PROVEEDOR]: "modulos/portal-proveedor.html?vista=cotizaciones",
    [MODULOS.SEGUIMIENTO_SIIF_PROVEEDOR]: "modulos/portal-proveedor.html?vista=seguimiento-siif#moduloSeguimientoSiif",
    [MODULOS.SEGUIMIENTO_PETICIONES]: "modulos/seguimiento-peticiones.html",
    [MODULOS.REQUISICIONES]: "modulos/seguimiento-siif.html",
    [MODULOS.SEGUIMIENTO_SIIF]: "modulos/seguimiento-siif.html",
    [MODULOS.IMPORTAR_SIIF]: "modulos/importar-siif.html",
    [MODULOS.REQUISICIONES_SIIF]: "modulos/requis-siif.html",
    [MODULOS.ORDENES_COMPRA_SIIF]: "modulos/oc-siif.html",
    [MODULOS.SOLICITUDES_PAGO_SIIF]: "modulos/sp-siif.html",
    [MODULOS.ACUERDOS]: "modulos/acuerdos.html",
    [MODULOS.CALENDARIO]: "modulos/calendario.html",
    [MODULOS.VALES]: "modulos/vales.html",
    [MODULOS.USUARIOS]: "modulos/usuarios.html",
    [MODULOS.AUDITORIA]: "modulos/auditoria.html",
    [MODULOS.TIEMPO_EXTRA]: "modulos/tiempo-extra.html",
    [MODULOS.TRAMITES_ADMINISTRATIVOS]: "modulos/tramites-administrativos.html",
    [MODULOS.GENERAR_TEXTOS]: "modulos/generar-textos.html",
    [MODULOS.PORTAL_PROVEEDOR]: "modulos/portal-proveedor.html?v=20260728-1",
    [MODULOS.PETICIONES_PROVEEDOR]: "modulos/portal-proveedor.html?vista=peticiones",
    [MODULOS.INVENTARIO]: "modulos/inventario.html",
    [MODULOS.COMPRAS]: "modulos/compras.html",
    [MODULOS.PROVEEDORES]: "modulos/proveedores.html",
    [MODULOS.REPORTES]: "modulos/reportes.html",
    [MODULOS.NOTIFICACIONES]: "modulos/notificaciones.html",
    [MODULOS.DOCUMENTOS]: "modulos/documentos.html",
    [MODULOS.BI]: "modulos/bi.html"
  };

  const DESCRIPCIONES = {
    [MODULOS.DASHBOARD]: "Indicadores ejecutivos y KPIs operativos.",
    [MODULOS.PARQUE]: "Expediente digital de unidades y seguimiento de flota.",
    [MODULOS.PETICIONES]: "Solicitudes de refacciones al almacén.",
    [MODULOS.GESTION_COTIZACIONES]: "Gestión interna de partidas, requisiciones y montos de cotizaciones.",
    [MODULOS.COTIZACIONES_PROVEEDOR]: "Gestión privada de cotizaciones del proveedor.",
    [MODULOS.SEGUIMIENTO_SIIF_PROVEEDOR]: "Seguimiento privado de requisiciones, órdenes de compra y solicitudes de pago del proveedor.",
    [MODULOS.SEGUIMIENTO_PETICIONES]: "Consulta de peticiones por area para coordinadores.",
    [MODULOS.REQUISICIONES]: "Requisiciones, órdenes de compra y pagos.",
    [MODULOS.SEGUIMIENTO_SIIF]: "Vista unificada de requisiciones, órdenes de compra y solicitudes de pago.",
    [MODULOS.IMPORTAR_SIIF]: "Carga validada de archivos CSV exportados desde SIIF.",
    [MODULOS.REQUISICIONES_SIIF]: "Captura y actualización de requisiciones SIIF.",
    [MODULOS.ORDENES_COMPRA_SIIF]: "Captura y actualización de órdenes de compra SIIF.",
    [MODULOS.SOLICITUDES_PAGO_SIIF]: "Captura y actualización de solicitudes de pago SIIF.",
    [MODULOS.ACUERDOS]: "Tickets de trabajos por hacer, responsables, prioridades y fechas límite.",
    [MODULOS.CALENDARIO]: "Reuniones, eventos y fechas límite de tickets.",
    [MODULOS.VALES]: "Vales de salida con folio, firma y trazabilidad.",
    [MODULOS.USUARIOS]: "Administración de usuarios, roles y permisos.",
    [MODULOS.AUDITORIA]: "Registro de actividad y trazabilidad del sistema.",
    [MODULOS.INVENTARIO]: "Almacén, kardex, stock mínimo y movimientos.",
    [MODULOS.COMPRAS]: "Cotizaciones, órdenes de compra y aprobaciones.",
    [MODULOS.PROVEEDORES]: "Perfiles, contratos y evaluación de proveedores.",
    [MODULOS.REPORTES]: "Reportes personalizados con exportación.",
    [MODULOS.NOTIFICACIONES]: "Alertas, recordatorios y aprobaciones.",
    [MODULOS.DOCUMENTOS]: "Gestión documental centralizada.",
    [MODULOS.BI]: "Análisis avanzado y mantenimiento predictivo.",
    [MODULOS.TIEMPO_EXTRA]: "Gestión de solicitudes y autorizaciones de tiempo extra.",
    [MODULOS.TRAMITES_ADMINISTRATIVOS]: "Registro y reportes de permisos, vacaciones, dias economicos e incapacidades.",
    [MODULOS.GENERAR_TEXTOS]: "Generador de descripciones para solicitudes de pago."
    ,[MODULOS.PORTAL_PROVEEDOR]: "Consulta y actualización de entregas asignadas al proveedor."
    ,[MODULOS.PETICIONES_PROVEEDOR]: "Peticiones de almacén asignadas al proveedor."
  };

  const PERMISOS = {
    "Administrador del Sistema": Object.values(MODULOS),
    jefe: Object.values(MODULOS),
    Jefe: Object.values(MODULOS),
    "Jefe de Almacen": [
      MODULOS.DASHBOARD,
      MODULOS.PETICIONES,
      MODULOS.VALES
    ],
    "Técnico vales": [
      MODULOS.DASHBOARD,
      MODULOS.VALES
    ],
    Proveedor: [MODULOS.PORTAL_PROVEEDOR, MODULOS.PETICIONES_PROVEEDOR, MODULOS.COTIZACIONES_PROVEEDOR, MODULOS.SEGUIMIENTO_SIIF_PROVEEDOR],
    "Moderador de Acuerdos": [
      MODULOS.DASHBOARD,
      MODULOS.ACUERDOS,
      MODULOS.CALENDARIO
    ],
    "Director": [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE, 
      MODULOS.PETICIONES,
      MODULOS.SEGUIMIENTO_PETICIONES,
      MODULOS.REQUISICIONES, 
      MODULOS.SEGUIMIENTO_SIIF,
      MODULOS.ACUERDOS, 
      MODULOS.VALES, 
      MODULOS.INVENTARIO, 
      MODULOS.COMPRAS, 
      MODULOS.PROVEEDORES,
      MODULOS.REPORTES, 
      MODULOS.NOTIFICACIONES, 
      MODULOS.DOCUMENTOS, 
      MODULOS.BI, 
      MODULOS.TIEMPO_EXTRA,
      MODULOS.TRAMITES_ADMINISTRATIVOS,
      MODULOS.GENERAR_TEXTOS
    ],
    "Coordinador": [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE, 
      MODULOS.PETICIONES,
      MODULOS.SEGUIMIENTO_PETICIONES,
      MODULOS.REQUISICIONES, 
      MODULOS.SEGUIMIENTO_SIIF,
      MODULOS.ACUERDOS, 
      MODULOS.VALES, 
      MODULOS.INVENTARIO, 
      MODULOS.COMPRAS, 
      MODULOS.REPORTES, 
      MODULOS.NOTIFICACIONES,
      MODULOS.TRAMITES_ADMINISTRATIVOS,
      MODULOS.GENERAR_TEXTOS
    ],
    "Encargado de Almacén": [
      MODULOS.DASHBOARD, 
      MODULOS.ACUERDOS, 
      MODULOS.PETICIONES, 
      MODULOS.VALES,
      MODULOS.INVENTARIO, 
      MODULOS.NOTIFICACIONES
    ],
    "Técnico": [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE, 
      MODULOS.PETICIONES, 
      MODULOS.ACUERDOS,  
      MODULOS.NOTIFICACIONES, 
      MODULOS.TIEMPO_EXTRA
    ],
    "Solo Lectura": [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE, 
      MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, 
      MODULOS.SEGUIMIENTO_SIIF,
      MODULOS.VALES, 
      MODULOS.REPORTES, 
      MODULOS.TIEMPO_EXTRA,
      MODULOS.TRAMITES_ADMINISTRATIVOS,
      MODULOS.GENERAR_TEXTOS
    ],
    "Coordinador Infraestructura": [
      MODULOS.DASHBOARD,
      MODULOS.PETICIONES
    ],
    "Capturista Administrativo": [
      MODULOS.DASHBOARD,
      MODULOS.TRAMITES_ADMINISTRATIVOS,
      MODULOS.GENERAR_TEXTOS
    ],
    SuperAdmin: Object.values(MODULOS),
    Admin: [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE, 
      MODULOS.PETICIONES, 
      MODULOS.GESTION_COTIZACIONES,
      MODULOS.SEGUIMIENTO_PETICIONES,
      MODULOS.ACUERDOS,
      MODULOS.REQUISICIONES, 
      MODULOS.SEGUIMIENTO_SIIF,
      MODULOS.IMPORTAR_SIIF,
      MODULOS.REQUISICIONES_SIIF,
      MODULOS.ORDENES_COMPRA_SIIF,
      MODULOS.SOLICITUDES_PAGO_SIIF,
      MODULOS.VALES, 
      MODULOS.AUDITORIA,
      MODULOS.INVENTARIO, 
      MODULOS.COMPRAS, 
      MODULOS.PROVEEDORES,
      MODULOS.REPORTES, 
      MODULOS.NOTIFICACIONES, 
      MODULOS.DOCUMENTOS, 
      MODULOS.BI, 
      MODULOS.TIEMPO_EXTRA,
      MODULOS.TRAMITES_ADMINISTRATIVOS,
      MODULOS.GENERAR_TEXTOS
    ],
    Compras: 
    [
      MODULOS.DASHBOARD, 
      MODULOS.PETICIONES, 
      MODULOS.GESTION_COTIZACIONES,
      MODULOS.REQUISICIONES, 
      MODULOS.SEGUIMIENTO_SIIF,
      MODULOS.IMPORTAR_SIIF,
      MODULOS.REQUISICIONES_SIIF,
      MODULOS.ORDENES_COMPRA_SIIF,
      MODULOS.SOLICITUDES_PAGO_SIIF,
      MODULOS.COMPRAS,
      MODULOS.PROVEEDORES,
      MODULOS.GENERAR_TEXTOS, 
      MODULOS.PARQUE
    ],

    Almacen: 
    [
    MODULOS.DASHBOARD, 
    MODULOS.PETICIONES, 
    MODULOS.VALES, 
    MODULOS.INVENTARIO, 
    MODULOS.PARQUE
  ],

    Consulta: 
    [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE, 
      MODULOS.PETICIONES,
      MODULOS.REQUISICIONES, 
      MODULOS.SEGUIMIENTO_SIIF,
      MODULOS.VALES, 
      MODULOS.REPORTES
    ],


    CapturistaPV: 
    [
      MODULOS.DASHBOARD, 
      MODULOS.PARQUE
      ]
  };

  const ACCIONES_LECTURA = ["ver", "consultar", "exportar", "imprimir"];
  const ACCIONES_POR_ROL = {
    SuperAdmin: ["ver", "crear", "editar", "eliminar", "cambiar_estatus", "generar_requisicion", "auditar", "exportar", "imprimir"],
    Admin: ["ver", "crear", "editar", "eliminar", "cambiar_estatus", "generar_requisicion", "auditar", "exportar", "imprimir"],
    "Capturista Administrativo": ["ver", "crear", "editar", "eliminar", "exportar", "imprimir"],
    Compras: ["ver", "crear", "editar", "cambiar_estatus", "generar_requisicion", "exportar", "imprimir"],
    Almacen: ["ver", "crear", "editar", "cambiar_estatus", "exportar", "imprimir"],
    "Jefe de Almacen": ["ver", "crear", "editar", "eliminar", "cambiar_estatus", "exportar", "imprimir"],
    "Técnico vales": ["ver", "cambiar_estatus", "exportar", "imprimir"],
    Proveedor: ["ver", "editar"],
    Consulta: ["ver", "consultar", "exportar", "imprimir"],
    "Coordinador": ["ver", "crear", "editar", "cambiar_estatus", "exportar", "imprimir"],
    "Coordinador Infraestructura": ["ver", "crear"],
    "Solo Lectura": ["ver", "consultar", "exportar", "imprimir"]
  };

  function normalizarRol(rol) {
    if (!rol) return "";
    const valor = String(rol).trim();
    const clave = valor.toLowerCase();
    if (clave === "superadmin" || clave === "super admin" || clave === "super_admin") return "SuperAdmin";
    if (clave === "admin") return "Admin";
    if (clave === "administrador") return "Administrador del Sistema";
    if (clave === "jefe") return "jefe";
    if (clave === "jefe de almacen" || clave === "jefe de almacén" || clave === "jefe_de_almacen" || clave === "jefe_de_almacén") {
      return "Jefe de Almacen";
    }
    if (clave === "tecnico vales" || clave === "técnico vales" || clave === "tecnico_vales" || clave === "técnico_vales") {
      return "Técnico vales";
    }
    if (clave === "proveedor") return "Proveedor";
    if (clave === "coordinador") return "Coordinador";
    if (clave === "coordinador infraestructura" || clave === "coordinador_infraestructura" || clave === "coordinador-infraestructura") {
      return "Coordinador Infraestructura";
    }
    if (clave === "capturista administrativo" || clave === "capturista_administrativo" || clave === "capturista-administrativo") return "Capturista Administrativo";
    if (clave === "moderador de acuerdos" || clave === "moderador acuerdos" || clave === "moderador_acuerdos" || clave === "moderador-acuerdos") {
      return "Moderador de Acuerdos";
    }
    return valor;
  }

  function rolVeSeguimientoPeticiones(rol) {
    return [
      "SuperAdmin",
      "Administrador del Sistema",
      "Admin",
      "jefe",
      "Jefe",
      "Director",
      "Coordinador"
    ].includes(normalizarRol(rol));
  }

  function rolVeTramitesAdministrativos(rol) {
    return [
      "SuperAdmin",
      "Administrador del Sistema",
      "Admin",
      "jefe",
      "Jefe",
      "Director",
      "Coordinador",
      "Capturista Administrativo",
      "Solo Lectura"
    ].includes(normalizarRol(rol));
  }

  function rolVeGenerarTextos(rol) {
    return [
      "SuperAdmin",
      "Administrador del Sistema",
      "Admin",
      "jefe",
      "Jefe",
      "Director",
      "Coordinador",
      "Compras",
      "Capturista Administrativo",
      "Solo Lectura"
    ].includes(normalizarRol(rol));
  }

  function rolVeCalendario(rol) {
    return Boolean(rol) && normalizarRol(rol) !== "Proveedor";
  }

  function agregarModuloSiFalta(modulos, modulo) {
    const salida = Array.isArray(modulos) ? modulos.slice() : [];
    if (!salida.includes(modulo)) salida.push(modulo);
    return salida;
  }

  function usuarioConSesion(usuario) {
    return Boolean(
      usuario &&
      typeof usuario === "object" &&
      (usuario.id || String(usuario.usuario || "").trim())
    );
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
            } else if (permiso === "moderar" || permiso === "moderador" || permiso === "moderate") {
              permisoFinal = "moderar";
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
    ).map(function (permiso) {
      return permiso.modulo === MODULOS.REQUISICIONES
        ? Object.assign({}, permiso, { modulo: MODULOS.SEGUIMIENTO_SIIF })
        : permiso;
    });
  }

  function obtenerModulosUsuario(usuario) {
    const permisosModulos = obtenerPermisosModulosUsuario(usuario);
    const rol = normalizarRol((usuario || {}).rol || (usuario || {}).cargo || (usuario || {}).tipo || "");
    if (rol === "Proveedor") return [
      MODULOS.PORTAL_PROVEEDOR,
      MODULOS.PETICIONES_PROVEEDOR,
      MODULOS.COTIZACIONES_PROVEEDOR,
      MODULOS.SEGUIMIENTO_SIIF_PROVEEDOR
    ];

    if (permisosModulos.length) {
      const modulos = permisosModulos
        .filter(function (item) { return item.permiso !== "none"; })
        .map(function (item) { return item.modulo; })
        .filter(function (modulo) {
          return Object.values(MODULOS).includes(modulo);
        });
      let modulosFinales = modulos;
      if (rolVeSeguimientoPeticiones(rol)) {
        modulosFinales = agregarModuloSiFalta(modulosFinales, MODULOS.SEGUIMIENTO_PETICIONES);
      }
      if (rolVeTramitesAdministrativos(rol)) {
        modulosFinales = agregarModuloSiFalta(modulosFinales, MODULOS.TRAMITES_ADMINISTRATIVOS);
      }
      if (rolVeGenerarTextos(rol)) {
        modulosFinales = agregarModuloSiFalta(modulosFinales, MODULOS.GENERAR_TEXTOS);
      }
      if (rolVeCalendario(rol)) {
        modulosFinales = agregarModuloSiFalta(modulosFinales, MODULOS.CALENDARIO);
      }
      if (usuarioConSesion(usuario)) {
        modulosFinales = agregarModuloSiFalta(modulosFinales, MODULOS.PETICIONES);
      }
      return modulosFinales.filter(function (modulo, indice, lista) {
        return modulo !== MODULOS.REQUISICIONES && lista.indexOf(modulo) === indice;
      });
    }

    const modulosRol = PERMISOS[rol] || [];
    let modulosFinalesRol = usuarioConSesion(usuario)
      ? agregarModuloSiFalta(modulosRol, MODULOS.PETICIONES)
      : modulosRol;
    if (rolVeCalendario(rol)) modulosFinalesRol = agregarModuloSiFalta(modulosFinalesRol, MODULOS.CALENDARIO);
    return modulosFinalesRol.map(function (modulo) {
      return modulo === MODULOS.REQUISICIONES ? MODULOS.SEGUIMIENTO_SIIF : modulo;
    }).filter(function (modulo, indice, lista) {
      return lista.indexOf(modulo) === indice;
    });
  }

  function obtenerPermisoModuloUsuario(usuario, modulo) {
    const rol = normalizarRol((usuario || {}).rol || (usuario || {}).cargo || (usuario || {}).tipo || "");
    if (rol === "Proveedor") {
      return [MODULOS.PORTAL_PROVEEDOR, MODULOS.PETICIONES_PROVEEDOR, MODULOS.COTIZACIONES_PROVEEDOR, MODULOS.SEGUIMIENTO_SIIF_PROVEEDOR].includes(modulo) ? "editar" : "none";
    }

    const permisosModulos = obtenerPermisosModulosUsuario(usuario);
    const encontrado = permisosModulos.find(function (item) {
      return item.modulo === modulo;
    });

    if (encontrado) {
      if (modulo === MODULOS.PETICIONES && usuarioConSesion(usuario) && encontrado.permiso === "none") {
        return "ver";
      }
      return encontrado.permiso;
    }

    if (modulo === MODULOS.SEGUIMIENTO_PETICIONES && rolVeSeguimientoPeticiones(rol)) {
      return "ver";
    }

    if (modulo === MODULOS.TRAMITES_ADMINISTRATIVOS && rolVeTramitesAdministrativos(rol)) {
      return rol === "Capturista Administrativo" || ["super_admin", "SuperAdmin", "Administrador del Sistema", "Admin", "admin", "jefe", "Jefe"].includes(rol)
        ? "editar"
        : "ver";
    }

    if (modulo === MODULOS.GENERAR_TEXTOS && rolVeGenerarTextos(rol)) {
      return rol === "Solo Lectura" ? "ver" : "editar";
    }

    if (modulo === MODULOS.CALENDARIO && rolVeCalendario(rol)) {
      return rol === "Solo Lectura" || rol === "Consulta" ? "ver" : "editar";
    }

    if (["super_admin", "SuperAdmin", "Administrador del Sistema", "Admin", "admin", "jefe", "Jefe"].includes(rol)) {
      return "editar";
    }

    if (modulo === MODULOS.PETICIONES && usuarioConSesion(usuario)) {
      return (PERMISOS[rol] || []).includes(modulo) ? "editar" : "ver";
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
    return permiso === "ver" || permiso === "editar" || permiso === "moderar";
  }

  function puedeEditarModulo(usuario, modulo) {
    return obtenerPermisoModuloUsuario(usuario, modulo) === "editar";
  }

  function puedeAccion(usuario, modulo, accion) {
    const accionNormalizada = String(accion || "").trim().toLowerCase();
    if (!accionNormalizada) return false;
    if (
      modulo === MODULOS.PETICIONES &&
      accionNormalizada === "crear" &&
      usuarioConSesion(usuario)
    ) {
      return true;
    }
    if (ACCIONES_LECTURA.includes(accionNormalizada)) {
      return puedeVerModulo(usuario, modulo);
    }

    const permisoModulo = obtenerPermisoModuloUsuario(usuario, modulo);
    if (permisoModulo !== "editar" && permisoModulo !== "moderar") return false;

    const rol = normalizarRol((usuario || {}).rol || (usuario || {}).cargo || (usuario || {}).tipo || "");
    if (
      accionNormalizada === "eliminar" &&
      [MODULOS.PARQUE, MODULOS.REQUISICIONES, MODULOS.PETICIONES].includes(modulo)
    ) {
      return [
        "Admin",
        "SuperAdmin",
        "Jefe de Almacen",
        "Director",
        "Administrador del Sistema"
      ].includes(rol);
    }
    const acciones = ACCIONES_POR_ROL[rol] || ["ver", "crear", "editar", "cambiar_estatus", "exportar", "imprimir"];
    return acciones.includes(accionNormalizada);
  }

  function esSoloLectura(rolOUsuario) {
    const rol = typeof rolOUsuario === "object" ? (rolOUsuario.rol || "") : rolOUsuario;
    return normalizarRol(rol) === "Solo Lectura" || normalizarRol(rol) === "Consulta";
  }

  function obtenerRutaModulo(modulo, desdeModulo) {
    const ruta = RUTAS[modulo] || "#";
    if (!desdeModulo) return ruta;
    return ruta.startsWith("modulos/") || ruta.startsWith("modules/")
      ? ruta.replace(/^(modulos|modules)\//, "")
      : "../" + ruta;
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
    puedeAccion,
    esSoloLectura,
    obtenerRutaModulo,
    ACCIONES_LECTURA,
    ACCIONES_POR_ROL
  };
})(window);
