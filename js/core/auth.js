
(function () {
  const LOGIN_SUPABASE_URL = "https://knjuevjxfyohcxrsldpb.supabase.co";
  const LOGIN_SUPABASE_KEY = "sb_publishable_f_1SKtetMWPSNmZ5eSRaOw_RYtHenaR";

  let loginSupabaseClient = null;
  const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
  let temporizadorExpiracionSesion = null;

  if (typeof supabase !== "undefined") {
    loginSupabaseClient = supabase.createClient(LOGIN_SUPABASE_URL, LOGIN_SUPABASE_KEY, {
      auth: { persistSession: false }
    });
  }

  const permisos = window.ETPermissions
    ? window.ETPermissions.PERMISOS
    : {
        SuperAdmin: ["Dashboard", "Parque Vehicular", "Acuerdos", "Calendario", "Peticiones", "Seguimiento SIIF", "Requisiciones SIIF", "Órdenes de Compra SIIF", "Solicitudes de Pago SIIF", "Importar SIIF", "Vales", "Usuarios", "Auditoría", "Tiempo Extra", "Generar Textos"],
        Admin: ["Dashboard", "Parque Vehicular", "Acuerdos", "Calendario", "Peticiones", "Seguimiento SIIF", "Requisiciones SIIF", "Órdenes de Compra SIIF", "Solicitudes de Pago SIIF", "Importar SIIF", "Vales", "Auditoría", "Tiempo Extra", "Generar Textos"],
        "Moderador de Acuerdos": ["Dashboard", "Acuerdos", "Calendario"],
        Compras: ["Dashboard", "Peticiones", "Seguimiento SIIF", "Requisiciones SIIF", "Órdenes de Compra SIIF", "Solicitudes de Pago SIIF", "Importar SIIF", "Generar Textos"],
        Almacen: ["Dashboard", "Peticiones", "Vales"],
        "Jefe de Almacen": ["Dashboard", "Peticiones", "Vales"],
        "Técnico vales": ["Dashboard", "Vales"],
        Proveedor: ["Portal Proveedor", "Peticiones de almacén", "Cotizaciones Proveedor", "Seguimiento de trámites SIIF"],
        Consulta: ["Dashboard", "Parque Vehicular", "Peticiones", "Seguimiento SIIF", "Vales"],
        Coordinador: ["Dashboard", "Seguimiento Peticiones"],
        "Coordinador Infraestructura": ["Dashboard", "Peticiones"],
        "Capturista Administrativo": ["Dashboard", "Tramites Administrativos", "Generar Textos"],
        CapturistaPV: ["Dashboard", "Parque Vehicular"]
      };

  const descripciones = window.ETPermissions
    ? window.ETPermissions.DESCRIPCIONES
    : {
        "Dashboard": "Indicadores generales del sistema.",
        "Parque Vehicular": "Consulta y control de unidades registradas.",
        "Peticiones": "Seguimiento de solicitudes al almacén.",
        "Seguimiento Peticiones": "Consulta de peticiones por area para coordinadores.",
        "Tramites Administrativos": "Registro y reportes de permisos, vacaciones, dias economicos e incapacidades.",
        "Generar Textos": "Generador de descripciones para solicitudes de pago.",
        "Seguimiento SIIF": "Seguimiento unificado de requisiciones, órdenes y solicitudes de pago.",
        "Importar SIIF": "Importación validada de archivos CSV del sistema SIIF.",
        "Requisiciones SIIF": "Captura de requisiciones que alimentan el seguimiento SIIF.",
        "Órdenes de Compra SIIF": "Captura de órdenes relacionadas con requisiciones SIIF.",
        "Solicitudes de Pago SIIF": "Captura de solicitudes de pago relacionadas con requisiciones SIIF.",
        "Vales": "Registro y consulta de vales de salida.",
        "Usuarios": "Administración de usuarios, roles y permisos.",
        "Auditoría": "Historial de movimientos del sistema."
      };

  const btnLogin = document.getElementById("btnLogin");
  const usuarioInput = document.getElementById("usuario");
  const passwordInput = document.getElementById("password");

  if (btnLogin) {
    btnLogin.addEventListener("click", ejecutarInicioSesion);
  }

  [usuarioInput, passwordInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        ejecutarInicioSesion();
      }
    });
  });

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", window.cerrarSesion);
  }

  const etLogout = document.getElementById("etLogout");
  if (etLogout && !etLogout.onclick) {
    etLogout.addEventListener("click", window.cerrarSesion);
  }

  function parseJSON(value) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  function obtenerUsuarioActivoAlmacenado() {
    return parseJSON(localStorage.getItem("usuarioActivo"));
  }

  function esSesionVigente(usuario) {
    const expiraEn = Number(usuario && usuario.sesion_expira_en);
    return Number.isFinite(expiraEn) && expiraEn > Date.now();
  }

  function obtenerUsuarioActivo() {
    const usuario = obtenerUsuarioActivoAlmacenado();
    if (!usuario) return null;
    if (esSesionVigente(usuario)) return usuario;
    localStorage.removeItem("usuarioActivo");
    return null;
  }

  function esPantallaLogin() {
    const ruta = String(window.location.pathname || "").toLowerCase();
    return ruta.endsWith("/index.html") || (!ruta.includes("/modulos/") && !ruta.endsWith("/dashboard.html"));
  }

  function cerrarSesionExpirada() {
    if (temporizadorExpiracionSesion) {
      clearTimeout(temporizadorExpiracionSesion);
      temporizadorExpiracionSesion = null;
    }
    localStorage.removeItem("usuarioActivo");
    if (!esPantallaLogin()) {
      alert("Tu sesión de 8 horas terminó. Inicia sesión nuevamente.");
      window.location.replace(resolverRutaLogin());
    }
  }

  function programarExpiracionSesion(usuario) {
    if (temporizadorExpiracionSesion) clearTimeout(temporizadorExpiracionSesion);
    temporizadorExpiracionSesion = null;
    if (!usuario) return;

    const restante = Number(usuario.sesion_expira_en) - Date.now();
    if (!Number.isFinite(restante) || restante <= 0) {
      cerrarSesionExpirada();
      return;
    }

    temporizadorExpiracionSesion = setTimeout(cerrarSesionExpirada, restante);
  }

  function validarVigenciaSesion() {
    const usuario = obtenerUsuarioActivoAlmacenado();
    if (!usuario) return;
    if (!esSesionVigente(usuario)) {
      cerrarSesionExpirada();
      return;
    }
    programarExpiracionSesion(usuario);
  }

  function formatearFechaHoraAuditoria(fecha) {
    const f = fecha || new Date();
    const dia = String(f.getDate()).padStart(2, "0");
    const mes = String(f.getMonth() + 1).padStart(2, "0");
    const anio = f.getFullYear();
    const hora = String(f.getHours()).padStart(2, "0");
    const minuto = String(f.getMinutes()).padStart(2, "0");
    const segundo = String(f.getSeconds()).padStart(2, "0");
    return dia + "/" + mes + "/" + anio + " " + hora + ":" + minuto + ":" + segundo;
  }

  function mostrarError(mensaje) {
    const mensajeError = document.getElementById("mensajeError");
    if (mensajeError) {
      mensajeError.textContent = mensaje;
    }
  }

  function normalizarRolLogin(rol) {
    const clave = String(rol || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (clave === "superadmin" || clave === "super_admin") return "SuperAdmin";
    if (clave === "admin") return "Admin";
    if (clave === "jefe") return "jefe";
    if (clave === "jefe_de_almacen" || clave === "jefe_de_almacén") return "Jefe de Almacen";
    if (clave === "tecnico_vales" || clave === "técnico_vales") return "Técnico vales";
    if (clave === "proveedor") return "Proveedor";
    if (clave === "coordinador") return "Coordinador";
    if (clave === "coordinador_infraestructura") return "Coordinador Infraestructura";
    if (clave === "capturista_administrativo") return "Capturista Administrativo";
    if (clave === "moderador_de_acuerdos" || clave === "moderador_acuerdos") return "Moderador de Acuerdos";
    return String(rol || "").trim();
  }

  function obtenerModulosUsuario(data) {
    if (normalizarRolLogin(data && data.rol) === "Proveedor") {
      return ["Portal Proveedor", "Peticiones de almacén", "Cotizaciones Proveedor", "Seguimiento de trámites SIIF"];
    }

    if (window.ETPermissions && typeof window.ETPermissions.obtenerModulosUsuario === "function") {
      return window.ETPermissions.obtenerModulosUsuario(data);
    }

    const permisosModulos = data && (data.modulos_permitidos || data.modulos || data.permisos_modulos || data.permisos || data.accesos);
    if (Array.isArray(permisosModulos) && permisosModulos.length) {
      return permisosModulos
        .filter(function (item) {
          return item && item.permiso !== "none";
        })
        .map(function (item) {
          return typeof item === "string" ? item : item.modulo;
        })
        .filter(Boolean);
    }

    return permisos[normalizarRolLogin(data && data.rol ? data.rol : "")] || [];
  }

  async function iniciarSesion() {
    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    const usuario = usuarioInput ? usuarioInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    mostrarError("");

    if (!usuario || !password) {
      mostrarError("Ingresa usuario y contraseña.");
      return;
    }

    if (!loginSupabaseClient) {
      mostrarError("No se pudo conectar con Supabase.");
      return;
    }

    let data, error;
    try {
      ({ data, error } = await loginSupabaseClient
        .from("usuarios")
        .select("*")
        .eq("usuario", usuario)
        .eq("password", password)
        .single());
    } catch (err) {
      console.error("Login error:", err);
      mostrarError("Ocurrió un error al iniciar sesión. Intenta de nuevo.");
      return;
    }

    if (error || !data) {
      mostrarError("Usuario o contraseña incorrectos.");
      return;
    }

    if (!data.activo) {
      mostrarError("Este usuario está inactivo.");
      return;
    }

    const rolNormalizado = normalizarRolLogin(data.rol);
    const inicioSesion = Date.now();
    const usuarioActivo = {
      id: data.id,
      nombre: data.nombre,
      usuario: data.usuario,
      rol: rolNormalizado,
      rol_original: data.rol,
      modulos_permitidos: data.modulos_permitidos || [],
      areas_permitidas: data.areas_permitidas || [],
      proveedor: data.proveedor || "",
      proveedores_permitidos: Array.isArray(data.proveedores_permitidos)
        ? data.proveedores_permitidos
        : (data.proveedor ? [data.proveedor] : []),
      avatar_url: localStorage.getItem("etAvatar_" + data.id) || "",
      dashboard_kpis: parseJSON(localStorage.getItem("etDashboardKpis_" + data.id)) || [],
      modulos: obtenerModulosUsuario(data),
      sesion_iniciada_en: inicioSesion,
      sesion_expira_en: inicioSesion + DURACION_SESION_MS
    };

    localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));
    programarExpiracionSesion(usuarioActivo);

    if (typeof registrarAuditoria === "function") {
      registrarAuditoria("Login", "Inicio de sesión", usuarioActivo.usuario);
    }


    window.location.href = rolNormalizado === "Proveedor"
      ? "modulos/portal-proveedor.html?v=20260728-1"
      : "dashboard.html";
  }

  function ejecutarInicioSesion() {
    const boton = document.getElementById("btnLogin");
    if (!boton || boton.dataset.etLoading === "1") return;
    const contenidoOriginal = boton.innerHTML;
    boton.dataset.etLoading = "1";
    boton.disabled = true;
    boton.setAttribute("aria-busy", "true");
    boton.classList.add("et-button-loading");
    boton.innerHTML = '<span class="et-spinner" aria-hidden="true"></span><span>Ingresando…</span>';

    Promise.resolve(iniciarSesion()).finally(function () {
      boton.innerHTML = contenidoOriginal;
      boton.disabled = false;
      boton.removeAttribute("aria-busy");
      boton.classList.remove("et-button-loading");
      delete boton.dataset.etLoading;
    });
  }

  const menuModulos = document.getElementById("menuModulos");
  const modulosCards = document.getElementById("modulosCards");

  if (menuModulos && modulosCards) {
    cargarDashboard();
  }

  function cargarDashboard() {
    const usuarioActivo = obtenerUsuarioActivo();

    if (!usuarioActivo) {
      window.location.href = "index.html";
      return;
    }

    const bienvenida = document.getElementById("bienvenida");
    const rolUsuario = document.getElementById("rolUsuario");

    if (bienvenida) {
      bienvenida.textContent = "Bienvenida, " + usuarioActivo.nombre;
    }

    if (rolUsuario) {
      rolUsuario.textContent = usuarioActivo.rol;
    }

    const modulosPermitidos = window.ETPermissions && typeof window.ETPermissions.obtenerModulosUsuario === "function"
      ? window.ETPermissions.obtenerModulosUsuario(usuarioActivo)
      : (permisos[normalizarRolLogin(usuarioActivo.rol)] || []);

    menuModulos.innerHTML = "";
    modulosCards.innerHTML = "";

    modulosPermitidos.forEach(function (modulo) {
      const link = document.createElement("a");
      link.href = obtenerRutaModulo(modulo);
      link.className = "nav-item";
      if (modulo === "Dashboard") link.classList.add("active");
      link.textContent = modulo;
      menuModulos.appendChild(link);

      const card = document.createElement("div");
      card.className = "module-card";
      card.innerHTML = "<h3>" + modulo + "</h3><p>" + (descripciones[modulo] || "") + "</p>";
      card.addEventListener("click", function () {
        window.location.href = obtenerRutaModulo(modulo);
      });
      modulosCards.appendChild(card);
    });
  }

  function obtenerRutaModulo(modulo) {
    if (window.ETPermissions) {
      return window.ETPermissions.obtenerRutaModulo(modulo, false);
    }

    const rutas = {
      "Dashboard": "dashboard.html",
      "Parque Vehicular": "modulos/parque-vehicular.html",
      "Peticiones": "modulos/peticiones.html",
      "Gestión de Cotizaciones": "modulos/peticiones.html?vista=cotizaciones",
      "Cotizaciones Proveedor": "modulos/portal-proveedor.html?vista=cotizaciones",
      "Peticiones de almacén": "modulos/portal-proveedor.html?vista=peticiones",
      "Seguimiento de trámites SIIF": "modulos/portal-proveedor.html?vista=seguimiento-siif#moduloSeguimientoSiif",
      "Requisiciones": "modulos/seguimiento-siif.html",
      "Seguimiento SIIF": "modulos/seguimiento-siif.html",
      "Importar SIIF": "modulos/importar-siif.html",
      "Requisiciones SIIF": "modulos/requis-siif.html",
      "Órdenes de Compra SIIF": "modulos/oc-siif.html",
      "Solicitudes de Pago SIIF": "modulos/sp-siif.html",
      "Vales": "modulos/vales.html",
      "Usuarios": "modulos/usuarios.html",
      "Generar Textos": "modulos/generar-textos.html",
      "Auditoría": "modulos/auditoria.html"
    };

    return rutas[modulo] || "#";
  }

  function esRutaDeModulo(pathname) {
    return /(\/modulos\/|\/modules\/)/.test(pathname || "");
  }

  function resolverRutaLogin() {
    const path = window.location.pathname;
    if (esRutaDeModulo(path)) return "../index.html";
    return "index.html";
  }

  window.cerrarSesion = function () {
    const usuarioActivo = obtenerUsuarioActivo();
    if (usuarioActivo && typeof registrarAuditoria === "function") {
      registrarAuditoria("Login", "Cierre de sesión", usuarioActivo.usuario);
    }
    if (temporizadorExpiracionSesion) {
      clearTimeout(temporizadorExpiracionSesion);
      temporizadorExpiracionSesion = null;
    }
    localStorage.removeItem("usuarioActivo");
    window.location.href = resolverRutaLogin();
  };

  window.registrarAuditoria = function (modulo, accion, detalle, opciones) {
    const usuarioActivo = obtenerUsuarioActivo();
    let auditoria = parseJSON(localStorage.getItem("auditoria")) || [];
    const extra = opciones || {};

    const registro = {
      fecha: formatearFechaHoraAuditoria(new Date()),
      usuario: usuarioActivo ? usuarioActivo.nombre : "Usuario no identificado",
      rol: usuarioActivo ? usuarioActivo.rol : "Sin rol",
      modulo: modulo,
      accion: accion,
      detalle: detalle,
      entidad_tipo: extra.entidad_tipo || extra.entidadTipo || null,
      entidad_id: extra.entidad_id || extra.entidadId || null,
      metadata: extra.metadata || {}
    };

    auditoria.unshift(registro);
    localStorage.setItem("auditoria", JSON.stringify(auditoria));

    if (loginSupabaseClient) {
      loginSupabaseClient.from("auditoria").insert({
        usuario_id: usuarioActivo ? usuarioActivo.id : null,
        usuario_nombre: usuarioActivo ? usuarioActivo.nombre : "Usuario no identificado",
        usuario_rol: usuarioActivo ? usuarioActivo.rol : "Sin rol",
        modulo: modulo,
        accion: accion,
        detalle: detalle,
        entidad_tipo: registro.entidad_tipo,
        entidad_id: registro.entidad_id,
        metadata: registro.metadata
      }).then(function (result) {
        if (result && result.error) {
          console.error("Auditoria Supabase error:", result.error);
        }
      }).catch(function (err) {
        console.error("Auditoría error:", err);
      });
    }
  };

  window.validarPermiso = function (modulo) {
    const usuarioActivo = obtenerUsuarioActivo();

    if (!usuarioActivo) {
      window.location.href = esRutaDeModulo(window.location.pathname)
        ? "../index.html"
        : "index.html";
      return false;
    }


    const rolNormalizado = normalizarRolLogin(usuarioActivo.rol);
    const modulosPermitidos = window.ETPermissions && typeof window.ETPermissions.obtenerModulosUsuario === "function"
      ? window.ETPermissions.obtenerModulosUsuario(usuarioActivo)
      : (permisos[rolNormalizado] || []);

    if (!modulosPermitidos.includes(modulo)) {
      alert("No tienes permiso para acceder a este módulo.");
      window.location.href = esRutaDeModulo(window.location.pathname)
        ? "../dashboard.html"
        : "dashboard.html";
      return false;
    }

    return true;
  };

  window.esSoloLectura = function () {
    const usuarioActivo = obtenerUsuarioActivo();
    if (!usuarioActivo) return true;
    return usuarioActivo.rol === "Solo Lectura" || usuarioActivo.rol === "Consulta";
  };

  validarVigenciaSesion();
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) validarVigenciaSesion();
  });
  window.addEventListener("focus", validarVigenciaSesion);

})();
