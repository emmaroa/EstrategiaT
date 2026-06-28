
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
        SuperAdmin: ["Dashboard", "Parque Vehicular", "Peticiones", "Requisiciones", "Vales", "Usuarios", "Auditoría"],
        Admin: ["Dashboard", "Parque Vehicular", "Peticiones", "Requisiciones", "Vales", "Auditoría"],
        Compras: ["Dashboard", "Peticiones", "Requisiciones"],
        Almacen: ["Dashboard", "Peticiones", "Vales"],
        Consulta: ["Dashboard", "Parque Vehicular", "Peticiones", "Requisiciones", "Vales"],
        CapturistaPV: ["Dashboard", "Parque Vehicular"]
      };

  const descripciones = window.ETPermissions
    ? window.ETPermissions.DESCRIPCIONES
    : {
        "Dashboard": "Indicadores generales del sistema.",
        "Parque Vehicular": "Consulta y control de unidades registradas.",
        "Peticiones": "Seguimiento de solicitudes al almacén.",
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

  function mostrarError(mensaje) {
    const mensajeError = document.getElementById("mensajeError");
    if (mensajeError) {
      mensajeError.textContent = mensaje;
    }
  }

  function obtenerModulosUsuario(data) {
    if (window.ETPermissions && typeof window.ETPermissions.obtenerModulosUsuario === "function") {
      return window.ETPermissions.obtenerModulosUsuario(data);
    }

    return permisos[data && data.rol ? data.rol : ""] || [];
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

    const usuarioActivo = {
      id: data.id,
      nombre: data.nombre,
      usuario: data.usuario,
      rol: data.rol,
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
      : (permisos[usuarioActivo.rol] || []);

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
      "Auditoría": "modulos/auditoria.html"
    };

    return rutas[modulo] || "#";
  }

  function resolverRutaLogin() {
    const path = window.location.pathname;
    if (path.includes("/modulos/")) return "../index.html";
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

  window.registrarAuditoria = function (modulo, accion, detalle) {
    const usuarioActivo = obtenerUsuarioActivo();
    let auditoria = parseJSON(localStorage.getItem("auditoria")) || [];

    const registro = {
      fecha: new Date().toLocaleString("es-MX"),
      usuario: usuarioActivo ? usuarioActivo.nombre : "Usuario no identificado",
      rol: usuarioActivo ? usuarioActivo.rol : "Sin rol",
      modulo: modulo,
      accion: accion,
      detalle: detalle
    };

    auditoria.unshift(registro);
    localStorage.setItem("auditoria", JSON.stringify(auditoria));

    if (loginSupabaseClient) {
      loginSupabaseClient.from("auditoria").insert({
        usuario_id: usuarioActivo ? usuarioActivo.id : null,
        modulo: modulo,
        accion: accion,
        detalle: detalle
      }).then(function () {}).catch(function (err) {
        console.error("Auditoría error:", err);
      });
    }
  };

  window.validarPermiso = function (modulo) {
    const usuarioActivo = obtenerUsuarioActivo();

    if (!usuarioActivo) {
      window.location.href = window.location.pathname.includes("/modulos/")
        ? "../index.html"
        : "index.html";
      return false;
    }

    const modulosPermitidos = permisos[usuarioActivo.rol] || [];

    if (!modulosPermitidos.includes(modulo)) {
      alert("No tienes permiso para acceder a este módulo.");
      window.location.href = window.location.pathname.includes("/modulos/")
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
