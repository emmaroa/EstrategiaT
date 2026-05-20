
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

  const permisos = {
    SuperAdmin: [
      "Dashboard",
      "Parque Vehicular",
      "Peticiones",
      "Requisiciones",
      "Vales",
      "Usuarios",
      "Auditoría"
    ],
    Admin: [
      "Dashboard",
      "Parque Vehicular",
      "Peticiones",
      "Requisiciones",
      "Vales",
      "Auditoría"
    ],
    Compras: [
      "Dashboard",
      "Peticiones",
      "Requisiciones"
    ],
    Almacen: [
      "Dashboard",
      "Peticiones",
      "Vales"
    ],
    Consulta: [
      "Dashboard",
      "Parque Vehicular",
      "Peticiones",
      "Requisiciones",
      "Vales"
    ],
    CapturistaPV: [
      "Dashboard",
      "Parque Vehicular"
    ]
  };

  const descripciones = {
    "Dashboard": "Indicadores generales del sistema.",
    "Parque Vehicular": "Consulta y control de unidades registradas.",
    "Peticiones": "Seguimiento de solicitudes al almacén.",
    "Requisiciones": "Control de requisiciones, órdenes y pagos.",
    "Vales": "Registro y consulta de vales de salida.",
    "Usuarios": "Administración de usuarios, roles y permisos.",
    "Auditoría": "Historial de movimientos del sistema."
  };

  const btnLogin = document.getElementById("btnLogin");

  if (btnLogin) {
    btnLogin.addEventListener("click", iniciarSesion);
  }

  async function iniciarSesion() {
    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();
    const mensajeError = document.getElementById("mensajeError");

    mensajeError.textContent = "";

    if (!usuario || !password) {
      mensajeError.textContent = "Ingresa usuario y contraseña.";
      return;
    }

    if (!loginSupabaseClient) {
      mensajeError.textContent = "No se pudo conectar con Supabase.";
      return;
    }

    const { data, error } = await loginSupabaseClient
      .from("usuarios")
      .select("*")
      .eq("usuario", usuario)
      .eq("password", password)
      .single();

    if (error || !data) {
      mensajeError.textContent = "Usuario o contraseña incorrectos.";
      return;
    }

    if (!data.activo) {
      mensajeError.textContent = "Este usuario está inactivo.";
      return;
    }

    const usuarioActivo = {
      id: data.id,
      nombre: data.nombre,
      usuario: data.usuario,
      rol: data.rol
    };

    localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));

    window.location.href = "dashboard.html";
  }

  const menuModulos = document.getElementById("menuModulos");
  const modulosCards = document.getElementById("modulosCards");

  if (menuModulos && modulosCards) {
    cargarDashboard();
  }

  function cargarDashboard() {
    const usuarioActivo = JSON.parse(localStorage.getItem("usuarioActivo"));

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

    const modulosPermitidos = permisos[usuarioActivo.rol] || [];

    menuModulos.innerHTML = "";
    modulosCards.innerHTML = "";

    modulosPermitidos.forEach(function (modulo) {
      const link = document.createElement("a");
      link.href = obtenerRutaModulo(modulo);
      link.className = "nav-item";
      link.textContent = modulo;

      menuModulos.appendChild(link);

      const card = document.createElement("div");
      card.className = "module-card";

      card.innerHTML = `
        <h3>${modulo}</h3>
        <p>${descripciones[modulo]}</p>
      `;

      card.addEventListener("click", function () {
        window.location.href = obtenerRutaModulo(modulo);
      });

      modulosCards.appendChild(card);
    });
  }

  function obtenerRutaModulo(modulo) {
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

  window.cerrarSesion = function () {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "../index.html";
  };

  window.registrarAuditoria = function (modulo, accion, detalle) {
    const usuarioActivo = JSON.parse(localStorage.getItem("usuarioActivo"));

    const auditoria = JSON.parse(localStorage.getItem("auditoria")) || [];

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
  };

window.validarPermiso = function(modulo) {

  const usuarioActivo =
    JSON.parse(
      localStorage.getItem("usuarioActivo")
    );

  if (!usuarioActivo) {

    window.location.href =
      "../index.html";

    return false;
  }

  const modulosPermitidos =
    permisos[usuarioActivo.rol] || [];

  if (!modulosPermitidos.includes(modulo)) {

    alert(
      "No tienes permiso para acceder a este módulo."
    );

    window.location.href =
      "../dashboard.html";

    return false;
  }

  return true;
};

})();