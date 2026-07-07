
(function () {
  const LOGIN_SUPABASE_URL = "https://knjuevjxfyohcxrsldpb.supabase.co";
  const LOGIN_SUPABASE_KEY = "sb_publishable_f_1SKtetMWPSNmZ5eSRaOw_RYtHenaR";

  let loginSupabaseClient = null;

  if (typeof supabase !== "undefined") {
    loginSupabaseClient = supabase.createClient(
      LOGIN_SUPABASE_URL,
      LOGIN_SUPABASE_KEY
    );
  }

  const permisos = window.ETPermissions
    ? window.ETPermissions.PERMISOS
    : {
        SuperAdmin: ["Dashboard", "Parque Vehicular", "Acuerdos", "Peticiones", "Requisiciones", "Vales", "Usuarios", "Auditoría", "Tiempo Extra", "Generar Textos"],
        Admin: ["Dashboard", "Parque Vehicular", "Acuerdos", "Peticiones", "Requisiciones", "Vales", "Auditoría", "Tiempo Extra", "Generar Textos"],
        "Moderador de Acuerdos": ["Dashboard", "Acuerdos"],
        Compras: ["Dashboard", "Peticiones", "Requisiciones", "Generar Textos"],
        Almacen: ["Dashboard", "Peticiones", "Vales"],
        Consulta: ["Dashboard", "Parque Vehicular", "Peticiones", "Requisiciones", "Vales"],
        Coordinador: ["Dashboard", "Seguimiento Peticiones"],
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
        "Requisiciones": "Control de requisiciones, órdenes y pagos.",
        "Vales": "Registro y consulta de vales de salida.",
        "Usuarios": "Administración de usuarios, roles y permisos.",
        "Auditoría": "Historial de movimientos del sistema."
      };

  const btnLogin = document.getElementById("btnLogin");
  const usuarioInput = document.getElementById("usuario");
  const passwordInput = document.getElementById("password");

  if (btnLogin) {
    btnLogin.addEventListener("click", iniciarSesion);
  }

  [usuarioInput, passwordInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        iniciarSesion();
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

  function obtenerUsuarioActivo() {
    return parseJSON(localStorage.getItem("usuarioActivo"));
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
    if (clave === "coordinador") return "Coordinador";
    if (clave === "capturista_administrativo") return "Capturista Administrativo";
    if (clave === "moderador_de_acuerdos" || clave === "moderador_acuerdos") return "Moderador de Acuerdos";
    return String(rol || "").trim();
  }

  function obtenerModulosUsuario(data) {
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
    const usuarioActivo = {
      id: data.id,
      nombre: data.nombre,
      usuario: data.usuario,
      rol: rolNormalizado,
      rol_original: data.rol,
      modulos_permitidos: data.modulos_permitidos || [],
      areas_permitidas: data.areas_permitidas || [],
      modulos: obtenerModulosUsuario(data)
    };

    localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));

    if (typeof registrarAuditoria === "function") {
      registrarAuditoria("Login", "Inicio de sesión", usuarioActivo.usuario);
    }

    window.location.href = "dashboard.html";
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
      "Requisiciones": "modulos/requisiciones.html",
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

})();
