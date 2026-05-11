const usuarios = [
  {
    usuario: "emma",
    password: "1234",
    nombre: "Emma Figueroa",
    rol: "SuperAdmin"
  },
  {
    usuario: "almacen",
    password: "1234",
    nombre: "Usuario Almacén",
    rol: "Almacen"
  },
  {
    usuario: "compras",
    password: "1234",
    nombre: "Usuario Compras",
    rol: "Compras"
  },
  {
    usuario: "consulta",
    password: "1234",
    nombre: "Usuario Consulta",
    rol: "Consulta"
  }
];

const permisos = {
  SuperAdmin: [
    "Parque Vehicular",
    "Peticiones",
    "Requisiciones",
    "Vales",
    "Dashboard",
    "Usuarios",
    "Auditoría"
  ],
  Almacen: [
    "Peticiones",
    "Vales",
    "Dashboard"
  ],
  Compras: [
    "Peticiones",
    "Requisiciones",
    "Dashboard"
  ],
  Consulta: [
    "Parque Vehicular",
    "Peticiones",
    "Requisiciones",
    "Dashboard"
  ]
};

const descripciones = {
  "Parque Vehicular": "Consulta y control de unidades registradas.",
  "Peticiones": "Seguimiento de solicitudes al almacén.",
  "Requisiciones": "Control de requisiciones, órdenes y pagos.",
  "Vales": "Registro y consulta de vales de salida.",
  "Dashboard": "Indicadores generales del sistema.",
  "Usuarios": "Administración de usuarios y permisos.",
  "Auditoría": "Historial de movimientos del sistema."
};

const btnLogin = document.getElementById("btnLogin");

if (btnLogin) {
  btnLogin.addEventListener("click", iniciarSesion);
}

function iniciarSesion() {
  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value.trim();
  const mensajeError = document.getElementById("mensajeError");

  const usuarioEncontrado = usuarios.find(function (u) {
    return u.usuario === usuario && u.password === password;
  });

  if (!usuarioEncontrado) {
    mensajeError.textContent = "Usuario o contraseña incorrectos.";
    return;
  }

  localStorage.setItem("usuarioActivo", JSON.stringify(usuarioEncontrado));

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

  document.getElementById("bienvenida").textContent =
    "Bienvenida, " + usuarioActivo.nombre;

  document.getElementById("rolUsuario").textContent =
    usuarioActivo.rol;

  const modulosPermitidos = permisos[usuarioActivo.rol];

  menuModulos.innerHTML = "";
  modulosCards.innerHTML = "";

  modulosPermitidos.forEach(function (modulo) {
    const link = document.createElement("a");
    link.href = obtenerRutaModulo(modulo);

      function obtenerRutaModulo(modulo) {
  const rutas = {
    "Parque Vehicular": "modulos/parque-vehicular.html",
    "Peticiones": "modulos/peticiones.html",
    "Requisiciones": "modulos/requisiciones.html",
    "Vales": "modulos/vales.html",
    "Usuarios": "modulos/usuarios.html",
    "Auditoría": "modulos/auditoria.html",
    "Dashboard": "dashboard.html"
  };

  return rutas[modulo] || "#";
}

    link.className = "nav-item";
    link.textContent = modulo;

    menuModulos.appendChild(link);

    const card = document.createElement("div");
    card.className = "module-card";

    card.innerHTML = `
      <h3>${modulo}</h3>
      <p>${descripciones[modulo]}</p>
    `;

    modulosCards.appendChild(card);
  });
}

const btnLogout = document.getElementById("btnLogout");

if (btnLogout) {
  btnLogout.addEventListener("click", function () {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "index.html";
  });
}

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