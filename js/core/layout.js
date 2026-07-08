(function (global) {
  const MODULOS_IMPLEMENTADOS = [
    "Dashboard",
    "Parque Vehicular",
    "Acuerdos",
    "Peticiones",
    "Seguimiento Peticiones",
    "Requisiciones",
    "Vales",
    "Usuarios",
    "Auditoría",
    "Tiempo Extra",
    "Tramites Administrativos",
    "Generar Textos"
    
  ];

  function htmlBotonTema() {
    return '<button class="theme-toggle" data-theme-toggle title="Cambiar tema">' +
      '<span data-theme-icon>☀️</span></button>';
  }

  const ICONOS = {
    ver: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    historial: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>',
    copiar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>',
    editar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    eliminar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>',
    requisicion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h5"/><path d="M10 13h6"/><path d="M10 17h6"/></svg>',
    estatus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10"/><path d="M4 12h16"/><path d="M4 17h7"/><path d="M17 4v6"/><path d="M14 7h6"/></svg>',
    imprimir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6Z"/></svg>',
    guardar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l2 2v16H5Z"/><path d="M8 3v6h8V3"/><path d="M8 17h8"/></svg>',
    cancelar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    agregar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>',
    avanzar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    usuario: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    activar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
    inactivar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
    turnar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10"/><path d="m10 3 4 4-4 4"/><circle cx="17" cy="17" r="3"/><path d="M12 21a5 5 0 0 1 10 0"/></svg>',
    proceso: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.7"/><path d="M20 4v6h-6"/><path d="M20 12a8 8 0 0 1-13.7 5.7"/><path d="M4 20v-6h6"/></svg>',
    espera: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    revision: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l3 3v15H5V3Z"/><path d="M16 3v4h4"/><path d="m9 15 2 2 4-5"/></svg>',
    concluir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
  };

  function icono(nombre) {
    return ICONOS[nombre] || ICONOS.ver;
  }

  function iconButton(iconoNombre, etiqueta, onclick, clasesExtra) {
    const clases = "action-btn icon-only" + (clasesExtra ? " " + clasesExtra : "");
    const click = onclick ? ' onclick="' + onclick + '"' : "";
    return '<button type="button" class="' + clases + '" title="' + etiqueta + '" aria-label="' + etiqueta + '"' + click + ">" +
      icono(iconoNombre) +
      "</button>";
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
    icono,
    iconButton,
    ocultarSiSoloLectura
  };
})(window);
