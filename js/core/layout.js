(function (global) {
  const MODULOS_IMPLEMENTADOS = [
    "Dashboard",
    "Parque Vehicular",
    "Acuerdos",
    "Peticiones",
    "Requisiciones",
    "Vales",
    "Usuarios",
    "Auditoría",
    "Órdenes de Trabajo",
    "Tiempo Extra"
    
  ];

  function htmlBotonTema() {
    return '<button class="theme-toggle" data-theme-toggle title="Cambiar tema">' +
      '<span data-theme-icon>☀️</span></button>';
  }

  function enlazarTema() {
    if (!global.ETTheme) return;
    global.ETTheme.applyTheme(global.ETTheme.getTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      if (btn.dataset.etBound) return;
      btn.dataset.etBound = "1";
      btn.addEventListener("click", global.ETTheme.toggleTheme);
    });
  }

  function esRutaDeModulo(pathname) {
    return /(\/modulos\/|\/modules\/)/.test(pathname || "");
  }

  function inicializar(moduloActivo) {
    const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
    if (!usuario || !global.ETPermissions) return;

    const modNameEl = document.getElementById("etModuleName");
    if (modNameEl) modNameEl.textContent = moduloActivo;

    const nav = document.getElementById("etNav");
    if (nav) {
let permitidos = global.ETPermissions.obtenerModulosUsuario(usuario) || [];
const desdeModulo = esRutaDeModulo(global.location.pathname);

permitidos = permitidos.filter(function (m) {
  return MODULOS_IMPLEMENTADOS.indexOf(m) >= 0;
});

      nav.innerHTML = permitidos.map(function (m) {
        const ruta = global.ETPermissions.obtenerRutaModulo(m, desdeModulo);
        const active = m === moduloActivo ? " active" : "";
        return '<a href="' + ruta + '" class="nav-item' + active + '">' + m + "</a>";
      }).join("");
    }

    const logout = document.getElementById("etLogout");
    if (logout && typeof global.cerrarSesion === "function") {
      logout.onclick = global.cerrarSesion;
    }

    const temaContainer = document.getElementById("etTemaContainer");
    if (temaContainer && !temaContainer.innerHTML) {
      temaContainer.innerHTML = htmlBotonTema();
    }

    enlazarTema();
  }

  function ocultarSiSoloLectura(selector) {
    if (typeof global.esSoloLectura === "function" && global.esSoloLectura()) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.style.display = "none";
      });
    }
  }

  global.ETLayout = {
    MODULOS_IMPLEMENTADOS,
    inicializar,
    htmlBotonTema,
    ocultarSiSoloLectura
  };
})(window);
