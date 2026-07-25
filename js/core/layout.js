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

  const GRUPOS_NAVEGACION = [
    { nombre: "General", modulos: ["Dashboard"] },
    {
      nombre: "Operación",
      modulos: ["Parque Vehicular", "Peticiones", "Seguimiento Peticiones", "Acuerdos", "Vales"]
    },
    {
      nombre: "Administración",
      modulos: ["Requisiciones", "Tiempo Extra", "Tramites Administrativos", "Generar Textos"]
    },
    { nombre: "Sistema", modulos: ["Usuarios", "Auditoría"] }
  ];

  const ICONOS_MODULOS = {
    "Dashboard": '<path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/>',
    "Parque Vehicular": '<path d="M5 17h14l-1-6-2-3H8l-2 3-1 6Z"/><path d="M7 11h10M7 17v2M17 17v2"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
    "Peticiones": '<path d="M6 3h9l3 3v15H6Z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
    "Seguimiento Peticiones": '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M8 11l2 2 4-4"/>',
    "Requisiciones": '<path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h5M10 13h6M10 17h6"/>',
    "Acuerdos": '<path d="M7 4h10v16H7Z"/><path d="m9 10 2 2 4-4M10 16h4"/>',
    "Vales": '<path d="M4 6h16v12H4Z"/><path d="M8 10h8M8 14h5"/>',
    "Usuarios": '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',
    "Auditoría": '<path d="M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    "Tiempo Extra": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M19 5l2-2"/>',
    "Tramites Administrativos": '<path d="M5 4h14v16H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    "Generar Textos": '<path d="M5 3h10l4 4v14H5Z"/><path d="M15 3v5h5M8 12h8M8 16h6"/>'
  };

  const CAMPOS_REQUERIDOS = [
    "inventarioUnidad",
    "descripcionUnidad",
    "unidad",
    "solicitante",
    "area",
    "peticion",
    "nuevoProveedorNombre",
    "unidadReq",
    "dependenciaReq",
    "conceptoReq",
    "nombreUsuario",
    "usuarioUsuario",
    "rolUsuarioForm",
    "unidadVale",
    "areaVale",
    "solicitanteVale",
    "recibeVale",
    "refaccionVale",
    "altaNumEmpleado",
    "altaNombreEmpleado",
    "numEmpleado",
    "fechaInicio",
    "fechaFin",
    "descripcionOrden",
    "titulo",
    "turnarUsuario"
  ];
  let ultimoActivadorModal = null;

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

  function iconoModulo(modulo) {
    const contenido = ICONOS_MODULOS[modulo] || ICONOS_MODULOS.Dashboard;
    return '<svg class="et-nav-icon" viewBox="0 0 24 24" aria-hidden="true">' + contenido + "</svg>";
  }

  function renderizarNavegacion(nav, permitidos, moduloActivo, desdeModulo) {
    nav.innerHTML = GRUPOS_NAVEGACION.map(function (grupo) {
      const modulosGrupo = grupo.modulos.filter(function (modulo) {
        return permitidos.includes(modulo);
      });
      if (!modulosGrupo.length) return "";

      const enlaces = modulosGrupo.map(function (modulo) {
        const ruta = global.ETPermissions.obtenerRutaModulo(modulo, desdeModulo);
        const active = modulo === moduloActivo ? " active" : "";
        const current = modulo === moduloActivo ? ' aria-current="page"' : "";
        return '<a href="' + ruta + '" class="nav-item' + active + '" title="' + modulo + '"' + current + ">" +
          iconoModulo(modulo) +
          '<span class="et-nav-label">' + modulo + "</span>" +
          "</a>";
      }).join("");

      return '<section class="et-nav-group" aria-label="' + grupo.nombre + '">' +
        '<h2 class="et-nav-group-title">' + grupo.nombre + "</h2>" +
        enlaces +
        "</section>";
    }).join("");
    nav.setAttribute("aria-label", "Navegación principal");
  }

  function crearBotonMenu(clase, etiqueta) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = clase;
    boton.setAttribute("aria-label", etiqueta);
    boton.setAttribute("title", etiqueta);
    boton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    return boton;
  }

  function cerrarMenuMovil() {
    document.body.classList.remove("et-nav-open");
    const boton = document.querySelector(".et-mobile-menu");
    if (boton) boton.setAttribute("aria-expanded", "false");
  }

  function prepararSidebar(usuario) {
    const sidebar = document.querySelector(".sidebar");
    const main = document.querySelector(".main-content");
    if (!sidebar || !main || sidebar.dataset.etEnhanced) return;

    sidebar.dataset.etEnhanced = "1";
    sidebar.classList.add("et-sidebar");
    document.body.classList.add("et-layout-ready");
    sidebar.id = sidebar.id || "etSidebar";

    const encabezado = sidebar.querySelector(".sidebar-logo, .brand");
    if (encabezado) {
      encabezado.classList.add("et-sidebar-brand");
      if (!encabezado.querySelector(".mini-logo")) {
        const logo = document.createElement("div");
        logo.className = "mini-logo";
        logo.textContent = "E";
        encabezado.insertBefore(logo, encabezado.firstChild);
      }
      if (encabezado.matches(".brand") && !encabezado.querySelector(".et-brand-copy")) {
        const copia = document.createElement("div");
        copia.className = "et-brand-copy";
        const titulo = encabezado.querySelector(":scope > h2");
        const subtitulo = encabezado.querySelector(":scope > span");
        if (titulo) copia.appendChild(titulo);
        if (subtitulo) copia.appendChild(subtitulo);
        encabezado.appendChild(copia);
      }
      const colapsar = crearBotonMenu("et-sidebar-collapse", "Contraer menú");
      colapsar.setAttribute("aria-controls", sidebar.id);
      encabezado.appendChild(colapsar);
      colapsar.addEventListener("click", function () {
        const colapsado = document.body.classList.toggle("et-nav-collapsed");
        const etiqueta = colapsado ? "Expandir menú" : "Contraer menú";
        colapsar.setAttribute("aria-label", etiqueta);
        colapsar.setAttribute("title", etiqueta);
        localStorage.setItem("etSidebarCollapsed", colapsado ? "1" : "0");
      });
    }

    if (localStorage.getItem("etSidebarCollapsed") === "1") {
      document.body.classList.add("et-nav-collapsed");
    }

    const perfil = document.createElement("div");
    perfil.className = "et-sidebar-profile";
    const nombre = String(usuario.nombre || usuario.usuario || "Usuario");
    const rol = String(usuario.rol || "Sin rol");
    perfil.innerHTML =
      '<span class="et-profile-avatar" aria-hidden="true"></span>' +
      '<span class="et-profile-copy"><strong></strong><small></small></span>';
    perfil.querySelector(".et-profile-avatar").textContent = nombre.charAt(0).toUpperCase();
    perfil.querySelector("strong").textContent = nombre;
    perfil.querySelector("small").textContent = rol;

    const logout = document.getElementById("etLogout");
    const footerExistente = sidebar.querySelector(".sidebar-footer");
    const footer = footerExistente || document.createElement("div");
    footer.classList.add("et-sidebar-footer");
    if (!footerExistente) sidebar.appendChild(footer);
    footer.insertBefore(perfil, footer.firstChild);
    if (logout) {
      logout.classList.add("et-sidebar-logout");
      footer.appendChild(logout);
    }

    const menuMovil = crearBotonMenu("et-mobile-menu", "Abrir menú");
    menuMovil.setAttribute("aria-controls", sidebar.id);
    menuMovil.setAttribute("aria-expanded", "false");
    main.insertBefore(menuMovil, main.firstChild);
    menuMovil.addEventListener("click", function () {
      const abierto = document.body.classList.toggle("et-nav-open");
      menuMovil.setAttribute("aria-expanded", abierto ? "true" : "false");
    });

    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "et-nav-overlay";
    overlay.setAttribute("aria-label", "Cerrar menú");
    document.body.appendChild(overlay);
    overlay.addEventListener("click", cerrarMenuMovil);

    sidebar.addEventListener("click", function (event) {
      if (event.target.closest("a")) cerrarMenuMovil();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") cerrarMenuMovil();
    });
  }

  function prepararEncabezado(moduloActivo) {
    const header = document.querySelector(".topbar, .page-header");
    if (!header || header.querySelector(".et-breadcrumb")) return;

    const primerBloque = header.querySelector(":scope > div") || header;
    const breadcrumb = document.createElement("nav");
    breadcrumb.className = "et-breadcrumb";
    breadcrumb.setAttribute("aria-label", "Ruta de navegación");
    breadcrumb.innerHTML =
      '<a class="et-home-button" href="' + (esRutaDeModulo(global.location.pathname) ? "../dashboard.html" : "dashboard.html") + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8Z"/></svg>' +
        "<span>Inicio</span>" +
      "</a>";
    primerBloque.insertBefore(breadcrumb, primerBloque.firstChild);
  }

  const FUENTES_BUSQUEDA_GLOBAL = [
    {
      modulo: "Parque Vehicular",
      tabla: "parque_vehicular",
      campos: "id,numero_inventario,unidad_patrulla,descripcion,placa,dependencia",
      buscarEn: ["numero_inventario", "unidad_patrulla", "descripcion", "placa"],
      area: "dependencia",
      titulo: function (fila) {
        return fila.unidad_patrulla || fila.numero_inventario || "Unidad";
      },
      detalle: function (fila) {
        return [fila.descripcion, fila.placa, fila.dependencia].filter(Boolean).join(" · ");
      }
    },
    {
      modulo: "Peticiones",
      tabla: "peticiones",
      campos: "id,unidad,peticion,solicitante,estatus,area",
      buscarEn: ["unidad", "peticion", "solicitante"],
      area: "area",
      titulo: function (fila) {
        return fila.unidad || "Petición";
      },
      detalle: function (fila) {
        return [fila.peticion, fila.solicitante, fila.estatus].filter(Boolean).join(" · ");
      }
    },
    {
      modulo: "Requisiciones",
      tabla: "requisiciones_siif",
      campos: "id,numero_req,unidad,concepto,proveedor,estatus,dependencia",
      buscarEn: ["numero_req", "unidad", "concepto", "proveedor"],
      area: "dependencia",
      titulo: function (fila) {
        return fila.numero_req || fila.unidad || "Requisición";
      },
      detalle: function (fila) {
        return [fila.concepto, fila.proveedor, fila.estatus].filter(Boolean).join(" · ");
      }
    },
    {
      modulo: "Vales",
      tabla: "vales",
      campos: "id,folio,unidad,solicitante,refaccion,estatus,area",
      buscarEn: ["folio", "unidad", "solicitante", "refaccion"],
      area: "area",
      titulo: function (fila) {
        return fila.folio || fila.unidad || "Vale";
      },
      detalle: function (fila) {
        return [fila.unidad, fila.refaccion, fila.estatus].filter(Boolean).join(" · ");
      }
    }
  ];

  function rutaBusquedaGlobal(modulo, termino) {
    const desdeModulo = esRutaDeModulo(global.location.pathname);
    const ruta = global.ETPermissions.obtenerRutaModulo(modulo, desdeModulo);
    return ruta + (ruta.includes("?") ? "&" : "?") + "buscar=" + encodeURIComponent(termino || "");
  }

  function rutaModuloGlobal(modulo) {
    return global.ETPermissions.obtenerRutaModulo(modulo, esRutaDeModulo(global.location.pathname));
  }

  function crearBusquedaGlobal(usuario) {
    let overlay = document.getElementById("etGlobalSearch");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "etGlobalSearch";
    overlay.className = "et-command-overlay";
    overlay.innerHTML =
      '<section class="et-command-dialog" role="dialog" aria-modal="true" aria-labelledby="etCommandTitle">' +
        '<div class="et-command-header">' +
          '<span class="et-command-search-icon" aria-hidden="true">⌕</span>' +
          '<div class="et-command-input-wrap">' +
            '<h2 id="etCommandTitle" class="sr-only">Búsqueda global</h2>' +
            '<input id="etCommandInput" type="search" autocomplete="off" placeholder="Buscar módulos, unidades, peticiones, requisiciones o vales…">' +
          "</div>" +
          '<button type="button" class="et-command-close" aria-label="Cerrar búsqueda">Esc</button>' +
        "</div>" +
        '<div class="et-command-status" id="etCommandStatus" aria-live="polite"></div>' +
        '<div class="et-command-results" id="etCommandResults" role="listbox"></div>' +
        '<footer class="et-command-footer"><span>↑↓ Navegar</span><span>↵ Abrir</span><span>Esc Cerrar</span></footer>' +
      "</section>";
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#etCommandInput");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "etCommandResults");
    input.setAttribute("aria-expanded", "false");
    const resultados = overlay.querySelector("#etCommandResults");
    const estado = overlay.querySelector("#etCommandStatus");
    const permitidos = (global.ETPermissions.obtenerModulosUsuario(usuario) || [])
      .filter(function (modulo) {
        return MODULOS_IMPLEMENTADOS.includes(modulo);
      });
    let temporizador = null;
    let consultaActual = 0;
    let indiceActivo = -1;
    let ultimoActivador = null;

    function cerrar() {
      consultaActual += 1;
      global.clearTimeout(temporizador);
      overlay.classList.remove("is-open");
      document.body.classList.remove("et-command-open");
      input.setAttribute("aria-expanded", "false");
      input.value = "";
      indiceActivo = -1;
      if (ultimoActivador && ultimoActivador.isConnected) ultimoActivador.focus();
    }

    function abrir() {
      ultimoActivador = document.activeElement;
      overlay.classList.add("is-open");
      document.body.classList.add("et-command-open");
      input.setAttribute("aria-expanded", "true");
      renderizarResultados("", []);
      global.setTimeout(function () { input.focus(); }, 20);
    }

    function seleccionar(indice) {
      const opciones = Array.from(resultados.querySelectorAll(".et-command-result"));
      if (!opciones.length) {
        indiceActivo = -1;
        return;
      }
      indiceActivo = (indice + opciones.length) % opciones.length;
      opciones.forEach(function (opcion, posicion) {
        const activo = posicion === indiceActivo;
        opcion.classList.toggle("is-active", activo);
        opcion.setAttribute("aria-selected", activo ? "true" : "false");
      });
      opciones[indiceActivo].scrollIntoView({ block: "nearest" });
      input.setAttribute("aria-activedescendant", opciones[indiceActivo].id);
    }

    function crearResultado(resultado, indice) {
      const enlace = document.createElement("a");
      enlace.id = "etCommandResult" + indice;
      enlace.className = "et-command-result";
      enlace.href = resultado.href;
      enlace.setAttribute("role", "option");
      enlace.setAttribute("aria-selected", "false");

      const icono = document.createElement("span");
      icono.className = "et-command-result-icon";
      icono.innerHTML = iconoModulo(resultado.modulo);

      const copia = document.createElement("span");
      copia.className = "et-command-result-copy";
      const titulo = document.createElement("strong");
      titulo.textContent = resultado.titulo;
      const detalle = document.createElement("small");
      detalle.textContent = resultado.detalle || resultado.modulo;
      copia.append(titulo, detalle);

      const etiqueta = document.createElement("span");
      etiqueta.className = "et-command-result-type";
      etiqueta.textContent = resultado.tipo;
      enlace.append(icono, copia, etiqueta);
      enlace.addEventListener("mouseenter", function () { seleccionar(indice); });
      return enlace;
    }

    function resultadosModulos(termino) {
      const normalizado = String(termino || "").trim().toLowerCase();
      return permitidos.filter(function (modulo) {
        const descripcion = global.ETPermissions.DESCRIPCIONES[modulo] || "";
        return !normalizado ||
          modulo.toLowerCase().includes(normalizado) ||
          descripcion.toLowerCase().includes(normalizado);
      }).map(function (modulo) {
        return {
          tipo: "Módulo",
          modulo,
          titulo: modulo,
          detalle: global.ETPermissions.DESCRIPCIONES[modulo] || "Abrir módulo",
          href: rutaModuloGlobal(modulo)
        };
      });
    }

    function renderizarResultados(termino, registros) {
      const modulos = resultadosModulos(termino);
      const combinados = modulos.concat(registros || []);
      resultados.innerHTML = "";
      indiceActivo = -1;
      input.removeAttribute("aria-activedescendant");

      if (!combinados.length) {
        resultados.innerHTML =
          '<div class="et-command-empty"><span aria-hidden="true">⌕</span>' +
          "<strong>Sin coincidencias</strong><small>Prueba con un folio, unidad, placa, proveedor o palabra diferente.</small></div>";
        estado.textContent = "No se encontraron resultados";
        return;
      }

      combinados.slice(0, 24).forEach(function (resultado, indice) {
        resultados.appendChild(crearResultado(resultado, indice));
      });
      estado.textContent = termino
        ? combinados.length + (combinados.length === 1 ? " resultado" : " resultados")
        : "Accesos disponibles";
    }

    async function consultarRegistros(termino, token) {
      const client = global.supabaseClient;
      const limpio = String(termino || "")
        .replace(/[,()%."'\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!client || limpio.length < 2) return [];

      let areas = usuario.areas_permitidas;
      if (typeof areas === "string") {
        try {
          areas = JSON.parse(areas);
        } catch (_) {
          areas = areas.split(",");
        }
      }
      areas = Array.isArray(areas)
        ? areas.map(function (area) { return String(area || "").trim(); }).filter(Boolean)
        : [];
      const fuentes = FUENTES_BUSQUEDA_GLOBAL.filter(function (fuente) {
        return permitidos.includes(fuente.modulo);
      });

      estado.innerHTML = '<span class="et-command-mini-spinner" aria-hidden="true"></span> Buscando registros…';
      const consultas = fuentes.map(async function (fuente) {
        try {
          const filtros = fuente.buscarEn.map(function (campo) {
            return campo + ".ilike.%" + limpio + "%";
          }).join(",");
          let consulta = client.from(fuente.tabla).select(fuente.campos).or(filtros).limit(5);
          if (areas.length && fuente.area) consulta = consulta.in(fuente.area, areas);
          const respuesta = await consulta;
          if (respuesta.error) throw respuesta.error;
          return (respuesta.data || []).map(function (fila) {
            return {
              tipo: fuente.modulo,
              modulo: fuente.modulo,
              titulo: fuente.titulo(fila),
              detalle: fuente.detalle(fila),
              href: rutaBusquedaGlobal(fuente.modulo, limpio)
            };
          });
        } catch (error) {
          console.warn("[Búsqueda global] No se pudo consultar " + fuente.modulo + ":", error);
          return [];
        }
      });
      const grupos = await Promise.all(consultas);
      if (token !== consultaActual) return null;
      return grupos.flat();
    }

    function buscar() {
      const termino = input.value.trim();
      global.clearTimeout(temporizador);
      consultaActual += 1;
      const token = consultaActual;

      if (termino.length < 2) {
        renderizarResultados(termino, []);
        return;
      }

      renderizarResultados(termino, []);
      temporizador = global.setTimeout(async function () {
        const registros = await consultarRegistros(termino, token);
        if (registros !== null) renderizarResultados(termino, registros);
      }, 260);
    }

    input.addEventListener("input", buscar);
    input.addEventListener("keydown", function (event) {
      const opciones = resultados.querySelectorAll(".et-command-result");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        seleccionar(indiceActivo + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        seleccionar(indiceActivo - 1);
      } else if (event.key === "Enter" && opciones.length) {
        event.preventDefault();
        (opciones[indiceActivo >= 0 ? indiceActivo : 0]).click();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cerrar();
      }
    });
    overlay.querySelector(".et-command-close").addEventListener("click", cerrar);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) cerrar();
    });
    overlay.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cerrar();
        return;
      }
      if (event.key !== "Tab") return;
      const enfocables = Array.from(overlay.querySelectorAll(
        "input:not([disabled]), button:not([disabled]), a[href]"
      )).filter(function (elemento) {
        return elemento.offsetParent !== null;
      });
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    });

    overlay.etAbrir = abrir;
    overlay.etCerrar = cerrar;
    return overlay;
  }

  function prepararBusquedaGlobal(usuario) {
    const header = document.querySelector(".topbar, .page-header");
    if (!header || document.querySelector(".et-global-search-trigger")) return;
    const overlay = crearBusquedaGlobal(usuario);
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "et-global-search-trigger";
    boton.setAttribute("aria-label", "Abrir búsqueda global");
    boton.innerHTML =
      '<span class="et-global-search-icon" aria-hidden="true">⌕</span>' +
      '<span class="et-global-search-label">Buscar</span>' +
      '<kbd>Ctrl K</kbd>';
    const acciones = document.getElementById("etTemaContainer")?.parentElement || header;
    acciones.insertBefore(boton, acciones.firstChild);
    boton.addEventListener("click", overlay.etAbrir);

    if (document.body.dataset.etGlobalSearchShortcut !== "1") {
      document.body.dataset.etGlobalSearchShortcut = "1";
      document.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          if (overlay.classList.contains("is-open")) overlay.etCerrar();
          else overlay.etAbrir();
        }
      });
    }
  }

  function aplicarBusquedaDesdeURL() {
    const termino = new URLSearchParams(global.location.search).get("buscar");
    if (!termino) return;
    const control = document.querySelector(
      ".filters input[type='search'], .filters input[type='text'], input[id^='buscar']"
    );
    if (!control) return;
    control.value = termino;
    control.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function obtenerCumpleanosSemana(empleados, totalDias) {
    const diasVentana = Math.max(1, Number(totalDias || 7));
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    return (empleados || []).filter(function (empleado) {
      return empleado && empleado.activo !== false && empleado.fecha_nac;
    }).map(function (empleado) {
      const partes = String(empleado.fecha_nac).split("T")[0].split("-").map(Number);
      if (partes.length !== 3 || !partes[1] || !partes[2]) return null;

      let fecha = new Date(hoy.getFullYear(), partes[1] - 1, partes[2]);
      if (fecha.getMonth() !== partes[1] - 1) {
        fecha = new Date(hoy.getFullYear(), partes[1], 0);
      }
      if (fecha < hoy) {
        fecha = new Date(hoy.getFullYear() + 1, partes[1] - 1, partes[2]);
        if (fecha.getMonth() !== partes[1] - 1) {
          fecha = new Date(hoy.getFullYear() + 1, partes[1], 0);
        }
      }

      const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
      if (dias < 0 || dias >= diasVentana) return null;
      return {
        empleado,
        fecha,
        dias,
        nombre: empleado.nombre_completo || empleado.nombre || empleado.num_empleado || "Empleado",
        etiqueta: fecha.toLocaleDateString("es-MX", {
          weekday: "short",
          day: "numeric",
          month: "short"
        })
      };
    }).filter(Boolean).sort(function (a, b) {
      return a.fecha - b.fecha || a.nombre.localeCompare(b.nombre, "es");
    });
  }

  function valorControl(control) {
    if (control.type === "checkbox" || control.type === "radio") {
      return control.checked ? "1" : "";
    }
    return String(control.value || "").trim();
  }

  function prepararFiltros() {
    document.querySelectorAll(".filters").forEach(function (filtros) {
      if (filtros.dataset.etEnhanced) return;
      filtros.dataset.etEnhanced = "1";
      filtros.classList.add("et-filter-bar");
      filtros.setAttribute("role", "search");
      filtros.setAttribute("aria-label", "Filtros de la tabla");

      const controles = Array.from(filtros.querySelectorAll("input, select")).filter(function (control) {
        return control.type !== "hidden";
      });
      if (!controles.length) return;

      const limpiar = document.createElement("button");
      limpiar.type = "button";
      limpiar.className = "et-filter-reset";
      limpiar.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>' +
        "<span>Limpiar</span>";
      limpiar.setAttribute("aria-label", "Limpiar todos los filtros");
      filtros.appendChild(limpiar);

      function actualizarBoton() {
        limpiar.disabled = !controles.some(function (control) {
          return Boolean(valorControl(control));
        });
      }

      controles.forEach(function (control) {
        control.addEventListener("input", actualizarBoton);
        control.addEventListener("change", actualizarBoton);
      });
      filtros.addEventListener("click", function () {
        global.setTimeout(actualizarBoton, 0);
      });

      limpiar.addEventListener("click", function () {
        controles.forEach(function (control) {
          if (control.type === "checkbox" || control.type === "radio") {
            control.checked = false;
          } else if (control.tagName === "SELECT") {
            control.selectedIndex = 0;
          } else {
            control.value = "";
          }
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        });
        filtros.querySelectorAll(".is-active, .active").forEach(function (elemento) {
          if (elemento.tagName === "BUTTON") elemento.classList.remove("is-active", "active");
        });
        actualizarBoton();
        if (controles[0]) controles[0].focus();
      });

      actualizarBoton();
    });
  }

  function esFilaVacia(fila) {
    if (!fila) return false;
    if (fila.dataset.etEmpty === "1") return true;
    const celdas = fila.querySelectorAll("td");
    if (celdas.length !== 1 || !celdas[0].hasAttribute("colspan")) return false;
    return /^(no hay|sin |no se encontraron|aún no hay)/i.test(celdas[0].textContent.trim());
  }

  function prepararTabla(contenedor) {
    if (contenedor.dataset.etEnhanced) return;
    const tabla = contenedor.querySelector("table");
    const tbody = tabla && tabla.querySelector("tbody");
    if (!tabla || !tbody) return;

    contenedor.dataset.etEnhanced = "1";
    contenedor.classList.add("et-data-table");
    contenedor.tabIndex = 0;
    contenedor.setAttribute("role", "region");
    const tituloPanel = contenedor.closest(".panel, .card")?.querySelector("h2, h3");
    contenedor.setAttribute(
      "aria-label",
      tituloPanel ? "Tabla: " + tituloPanel.textContent.trim() : "Tabla de resultados"
    );

    tabla.querySelectorAll("thead th").forEach(function (th) {
      if (!th.hasAttribute("scope")) th.setAttribute("scope", "col");
    });

    if (!tbody.children.length) {
      mostrarCargaTabla(tbody);
    }

    const tienePaginacion = Boolean(
      contenedor.nextElementSibling && contenedor.nextElementSibling.classList.contains("pagination-bar")
    );
    let resumen = null;
    let paginacion = null;
    let paginaActual = 1;
    const registrosPorPagina = 20;
    if (!tienePaginacion && !tabla.classList.contains("generator-table")) {
      resumen = document.createElement("div");
      resumen.className = "et-table-summary";
      resumen.setAttribute("aria-live", "polite");
      contenedor.insertAdjacentElement("afterend", resumen);

      if (!tbody.querySelector("input, select, textarea")) {
        paginacion = document.createElement("div");
        paginacion.className = "pagination-bar et-auto-pagination";
        paginacion.hidden = true;
        paginacion.innerHTML =
          '<button type="button" class="btn-secondary" data-et-page="previous">Anterior</button>' +
          '<span data-et-page-status aria-live="polite">Página 1 de 1</span>' +
          '<button type="button" class="btn-secondary" data-et-page="next">Siguiente</button>';
        resumen.insertAdjacentElement("afterend", paginacion);
      }
    }

    function actualizar() {
      let filas = Array.from(tbody.querySelectorAll(":scope > tr"));
      const filasReales = filas.filter(function (fila) {
        return fila.dataset.etLoading !== "1" && fila.dataset.etGenerated !== "1";
      });
      if (filasReales.length) {
        tbody.querySelectorAll('[data-et-loading="1"]').forEach(function (fila) {
          fila.remove();
        });
        delete tbody.dataset.etLoading;
        tbody.removeAttribute("aria-busy");
        filas = Array.from(tbody.querySelectorAll(":scope > tr"));
      }
      const cargando = Boolean(tbody.querySelector('[data-et-loading="1"]'));
      if (!cargando) {
        delete tbody.dataset.etLoading;
        tbody.removeAttribute("aria-busy");
      }
      filas.forEach(function (fila) {
        fila.classList.remove("et-page-hidden");
      });
      filas.forEach(function (fila) {
        if (esFilaVacia(fila)) {
          fila.dataset.etEmpty = "1";
          fila.classList.add("et-empty-row");
        }
      });

      filas = filas.filter(function (fila) {
        return fila.dataset.etLoading !== "1" &&
          !esFilaVacia(fila) &&
          !fila.hidden &&
          getComputedStyle(fila).display !== "none";
      });

      if (filas.length) {
        tbody.querySelectorAll('[data-et-generated="1"]').forEach(function (fila) {
          fila.remove();
        });
      }

      if (!filas.length && !cargando && !tbody.querySelector('[data-et-empty="1"]')) {
        const vacia = document.createElement("tr");
        vacia.dataset.etEmpty = "1";
        vacia.dataset.etGenerated = "1";
        vacia.className = "et-empty-row";
        const celda = document.createElement("td");
        celda.colSpan = Math.max(1, tabla.querySelectorAll("thead th").length);
        celda.innerHTML =
          '<div class="et-empty-content"><span aria-hidden="true">⌕</span>' +
          "<strong>Sin resultados</strong><small>Prueba cambiando o limpiando los filtros.</small></div>";
        vacia.appendChild(celda);
        tbody.appendChild(vacia);
      }

      if (resumen) {
        if (cargando) {
          resumen.textContent = "Cargando datos…";
          if (paginacion) paginacion.hidden = true;
        } else if (paginacion && filas.length > registrosPorPagina) {
          const totalPaginas = Math.ceil(filas.length / registrosPorPagina);
          paginaActual = Math.min(Math.max(1, paginaActual), totalPaginas);
          const inicio = (paginaActual - 1) * registrosPorPagina;
          const fin = Math.min(inicio + registrosPorPagina, filas.length);
          filas.forEach(function (fila, indice) {
            fila.classList.toggle("et-page-hidden", indice < inicio || indice >= fin);
          });
          resumen.textContent = "Mostrando " + (inicio + 1) + "–" + fin + " de " + filas.length + " registros";
          paginacion.hidden = false;
          paginacion.querySelector("[data-et-page-status]").textContent =
            "Página " + paginaActual + " de " + totalPaginas;
          paginacion.querySelector('[data-et-page="previous"]').disabled = paginaActual === 1;
          paginacion.querySelector('[data-et-page="next"]').disabled = paginaActual === totalPaginas;
        } else {
          resumen.textContent = filas.length + (filas.length === 1 ? " registro visible" : " registros visibles");
          if (paginacion) paginacion.hidden = true;
        }
      }
    }

    if (paginacion) {
      paginacion.addEventListener("click", function (event) {
        const boton = event.target.closest("[data-et-page]");
        if (!boton || boton.disabled) return;
        paginaActual += boton.dataset.etPage === "next" ? 1 : -1;
        actualizar();
        contenedor.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    const observador = new MutationObserver(function (mutaciones) {
      actualizar();
      let indice = 0;
      mutaciones.forEach(function (mutacion) {
        mutacion.addedNodes.forEach(function (nodo) {
          if (
            nodo.nodeType !== 1 ||
            nodo.tagName !== "TR" ||
            nodo.dataset.etLoading === "1" ||
            nodo.dataset.etEmpty === "1"
          ) return;
          nodo.style.setProperty("--et-row-delay", Math.min(indice, 8) * 28 + "ms");
          nodo.classList.add("et-row-enter");
          indice += 1;
          global.setTimeout(function () {
            nodo.classList.remove("et-row-enter");
            nodo.style.removeProperty("--et-row-delay");
          }, 520);
        });
      });
    });
    observador.observe(tbody, { childList: true, subtree: true });
    actualizar();

    const panel = contenedor.closest(".panel, .card, main");
    if (panel) {
      panel.querySelectorAll(".filters input, .filters select").forEach(function (control) {
        control.addEventListener("input", function () {
          paginaActual = 1;
          global.setTimeout(actualizar, 0);
        });
        control.addEventListener("change", function () {
          paginaActual = 1;
          global.setTimeout(actualizar, 0);
        });
      });
    }
  }

  function prepararTablas() {
    document.querySelectorAll(".table-container, .table-wrapper").forEach(prepararTabla);
  }

  function prepararMicrointeracciones() {
    const selectores = [
      ".kpi-card",
      ".module-card",
      ".dashboard-action-grid > .panel",
      "main > .panel",
      ".dashboard-quick-action",
      ".alert-card"
    ].join(",");

    function revelar(elementos) {
      Array.from(elementos).filter(function (elemento) {
        return !elemento.classList.contains("et-reveal") && elemento.offsetParent !== null;
      })
      .slice(0, 24)
      .forEach(function (elemento, indice) {
        const retraso = Math.min(indice, 12) * 34;
        elemento.classList.add("et-reveal");
        elemento.style.setProperty("--et-reveal-delay", retraso + "ms");
        global.setTimeout(function () {
          elemento.classList.remove("et-reveal");
          elemento.style.removeProperty("--et-reveal-delay");
        }, retraso + 500);
      });
    }

    revelar(document.querySelectorAll(selectores));

    if (document.body.dataset.etMicrointeractions !== "1") {
      document.body.dataset.etMicrointeractions = "1";
      document.addEventListener("change", function (event) {
        const control = event.target.closest(".filters input, .filters select");
        if (!control) return;
        const barra = control.closest(".filters");
        barra.classList.remove("et-filter-updated");
        void barra.offsetWidth;
        barra.classList.add("et-filter-updated");
        global.setTimeout(function () {
          barra.classList.remove("et-filter-updated");
        }, 360);
      });

      const observadorInterfaz = new MutationObserver(function (mutaciones) {
        const nuevos = [];
        mutaciones.forEach(function (mutacion) {
          mutacion.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            if (nodo.matches(selectores)) nuevos.push(nodo);
            nodo.querySelectorAll(selectores).forEach(function (elemento) {
              nuevos.push(elemento);
            });
          });
        });
        if (nuevos.length) revelar(nuevos);
      });
      observadorInterfaz.observe(document.body, { childList: true, subtree: true });
    }
  }

  function mostrarCargaTabla(tablaOTbody, filas) {
    const tbody = typeof tablaOTbody === "string"
      ? document.getElementById(tablaOTbody)
      : tablaOTbody;
    if (!tbody || tbody.dataset.etLoading === "1") return;
    const tabla = tbody.closest("table");
    const columnas = Math.max(1, tabla ? tabla.querySelectorAll("thead th").length : 1);
    const totalFilas = Math.max(3, Number(filas || 5));
    tbody.dataset.etLoading = "1";
    tbody.innerHTML = Array.from({ length: totalFilas }, function (_, indiceFila) {
      const celdas = Array.from({ length: columnas }, function (_, indiceColumna) {
        const ancho = 38 + ((indiceFila * 17 + indiceColumna * 23) % 48);
        return '<td><span class="et-skeleton-line" style="--et-skeleton-width:' + ancho + '%"></span></td>';
      }).join("");
      return '<tr class="et-skeleton-row" data-et-loading="1" aria-hidden="true">' + celdas + "</tr>";
    }).join("");
    tbody.setAttribute("aria-busy", "true");
  }

  function terminarCargaTabla(tablaOTbody) {
    const tbody = typeof tablaOTbody === "string"
      ? document.getElementById(tablaOTbody)
      : tablaOTbody;
    if (!tbody) return;
    tbody.querySelectorAll('[data-et-loading="1"]').forEach(function (fila) {
      fila.remove();
    });
    delete tbody.dataset.etLoading;
    tbody.removeAttribute("aria-busy");
  }

  function ejecutarConBoton(boton, tarea, config) {
    config = config || {};
    if (!boton || typeof tarea !== "function" || boton.dataset.etLoading === "1") {
      return Promise.resolve(false);
    }

    const contenidoOriginal = boton.innerHTML;
    boton.dataset.etLoading = "1";
    boton.disabled = true;
    boton.setAttribute("aria-busy", "true");
    boton.classList.add("et-button-loading");
    boton.innerHTML =
      '<span class="et-spinner" aria-hidden="true"></span>' +
      "<span>" + (config.label || "Procesando…") + "</span>";

    return Promise.resolve()
      .then(tarea)
      .catch(function (error) {
        console.error(error);
        mostrarToast({
          type: "error",
          title: "No se completó la acción",
          message: error && error.message ? error.message : "Intenta nuevamente."
        });
        return false;
      })
      .finally(function () {
        boton.innerHTML = contenidoOriginal;
        boton.disabled = false;
        boton.removeAttribute("aria-busy");
        boton.classList.remove("et-button-loading");
        delete boton.dataset.etLoading;
      });
  }

  function obtenerGrupoCampo(control) {
    return control.closest(".input-group, .form-group") || control.parentElement;
  }

  function obtenerErrorCampo(control) {
    const grupo = obtenerGrupoCampo(control);
    return grupo && grupo.querySelector(':scope > .et-field-error[data-for="' + control.id + '"]');
  }

  function mensajeValidacion(control) {
    if (control.validity.valueMissing) return "Este campo es obligatorio.";
    if (control.validity.typeMismatch) return "Captura un valor con el formato correcto.";
    if (control.validity.rangeUnderflow || control.validity.rangeOverflow) return "El valor está fuera del rango permitido.";
    return "Revisa el valor capturado.";
  }

  function validarCampo(control, mostrarError) {
    if (!control || control.disabled || control.hidden) return true;
    const valido = control.checkValidity();
    const error = obtenerErrorCampo(control);
    control.classList.toggle("et-field-invalid", !valido && mostrarError);
    control.setAttribute("aria-invalid", !valido && mostrarError ? "true" : "false");
    if (error) {
      error.textContent = !valido && mostrarError ? mensajeValidacion(control) : "";
      error.hidden = valido || !mostrarError;
    }
    return valido;
  }

  function serializarModal(modal) {
    return Array.from(modal.querySelectorAll("input, select, textarea"))
      .filter(function (control) {
        return !control.disabled && !control.readOnly && control.type !== "hidden";
      })
      .map(function (control) {
        const valor = control.type === "checkbox" || control.type === "radio"
          ? String(control.checked)
          : control.value;
        return (control.id || control.name || control.type) + "=" + valor;
      })
      .join("&");
  }

  function modalConCambios(modal) {
    if (!modal || !modal.classList.contains("show")) return false;
    return modal.dataset.etInitialState !== serializarModal(modal);
  }

  function actualizarEstadoModal(modal) {
    const sucio = modalConCambios(modal);
    modal.dataset.etDirty = sucio ? "1" : "0";
    return sucio;
  }

  function solicitarCierreModal(modal, alConfirmar) {
    if (modal.dataset.etAllowDirtyClose === "1") {
      delete modal.dataset.etAllowDirtyClose;
      return false;
    }
    if (!actualizarEstadoModal(modal)) return false;

    confirmarAccion({
      title: "Descartar cambios",
      message: "Hay cambios sin guardar. Si cierras el formulario, se perderán.",
      confirmLabel: "Descartar y cerrar",
      danger: true
    }).then(function (confirmado) {
      if (!confirmado) return;
      modal.dataset.etAllowDirtyClose = "1";
      alConfirmar();
    });
    return true;
  }

  function validarModal(modal) {
    const controles = Array.from(modal.querySelectorAll("input[required], select[required], textarea[required]"))
      .filter(function (control) {
        return !control.disabled && control.offsetParent !== null;
      });
    let primeroInvalido = null;
    controles.forEach(function (control) {
      if (!validarCampo(control, true) && !primeroInvalido) primeroInvalido = control;
    });
    if (primeroInvalido) {
      primeroInvalido.focus();
      primeroInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  function enfocarModal(modal) {
    const destino = modal.querySelector(
      "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
    );
    if (destino) destino.focus();
  }

  function prepararModal(modal) {
    if (modal.dataset.etFormEnhanced) return;
    modal.dataset.etFormEnhanced = "1";
    const encabezado = modal.querySelector(".modal-header");
    if (encabezado && !encabezado.querySelector(".et-dirty-label")) {
      const copia = encabezado.querySelector(":scope > div");
      if (copia && modal.querySelector("[required]")) {
        const nota = document.createElement("small");
        nota.className = "et-required-note";
        nota.textContent = "Los campos marcados con * son obligatorios.";
        copia.appendChild(nota);
      }
      const etiqueta = document.createElement("span");
      etiqueta.className = "et-dirty-label";
      etiqueta.textContent = "Cambios sin guardar";
      encabezado.appendChild(etiqueta);
    }

    modal.querySelectorAll(".modal-actions .btn-small, .modal-actions .btn-primary").forEach(function (boton) {
      boton.dataset.etValidateModal = "1";
    });

    modal.addEventListener("input", function (event) {
      if (event.target.matches("input, select, textarea")) {
        validarCampo(event.target, false);
        actualizarEstadoModal(modal);
      }
    });
    modal.addEventListener("change", function () {
      actualizarEstadoModal(modal);
    });

    const observador = new MutationObserver(function () {
      if (modal.classList.contains("show")) {
        const activo = document.activeElement;
        modal.etOpener = activo && !modal.contains(activo) ? activo : ultimoActivadorModal;
        global.setTimeout(function () {
          modal.dataset.etInitialState = serializarModal(modal);
          modal.dataset.etDirty = "0";
          enfocarModal(modal);
        }, 0);
      } else {
        modal.dataset.etDirty = "0";
        modal.querySelectorAll(".et-field-invalid").forEach(function (control) {
          validarCampo(control, false);
        });
        if (modal.etOpener && modal.etOpener.isConnected) {
          global.setTimeout(function () {
            modal.etOpener.focus();
          }, 0);
        }
      }
    });
    observador.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  function prepararFormularios() {
    CAMPOS_REQUERIDOS.forEach(function (id) {
      const control = document.getElementById(id);
      if (!control) return;
      control.required = true;
      control.setAttribute("aria-required", "true");
      const grupo = obtenerGrupoCampo(control);
      const label = grupo && grupo.querySelector("label");
      if (label) label.classList.add("et-required-label");
      if (control.id && grupo && !obtenerErrorCampo(control)) {
        const error = document.createElement("small");
        error.className = "et-field-error";
        error.dataset.for = control.id;
        error.id = "error-" + control.id;
        error.hidden = true;
        grupo.appendChild(error);
        control.setAttribute("aria-describedby", [control.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
      }
      control.addEventListener("blur", function () {
        validarCampo(control, true);
      });
      control.addEventListener("input", function () {
        if (control.getAttribute("aria-invalid") === "true") validarCampo(control, true);
      });
    });

    document.querySelectorAll(".modal").forEach(prepararModal);

    document.addEventListener("click", function (event) {
      const activador = event.target.closest('[aria-haspopup="dialog"]');
      if (activador) ultimoActivadorModal = activador;

      const guardar = event.target.closest("[data-et-validate-modal]");
      if (guardar) {
        const modal = guardar.closest(".modal");
        if (modal && !validarModal(modal)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }

      const cierre = event.target.closest(".modal .close-btn, .modal .modal-actions .btn-secondary");
      const fondo = event.target.classList && event.target.classList.contains("modal") ? event.target : null;
      const modal = cierre ? cierre.closest(".modal") : fondo;
      if (modal && modal.classList.contains("show") && solicitarCierreModal(modal, function () {
        event.target.click();
      })) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      const abiertos = Array.from(document.querySelectorAll(".modal.show"));
      const modal = abiertos[abiertos.length - 1];
      if (!modal) return;

      if (event.key === "Escape" && solicitarCierreModal(modal, function () {
        modal.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true
        }));
      })) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (event.key === "Tab") {
        const enfocables = Array.from(modal.querySelectorAll(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )).filter(function (elemento) {
          return elemento.offsetParent !== null;
        });
        if (!enfocables.length) return;
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        if (event.shiftKey && document.activeElement === primero) {
          event.preventDefault();
          ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault();
          primero.focus();
        }
      }
    }, true);

    global.addEventListener("beforeunload", function (event) {
      const hayCambios = Array.from(document.querySelectorAll(".modal.show")).some(actualizarEstadoModal);
      if (hayCambios) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }

  function obtenerFichaDetalle() {
    let drawer = document.getElementById("etDetailDrawer");
    if (drawer) return drawer;

    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "et-detail-overlay";
    overlay.setAttribute("aria-label", "Cerrar ficha de detalle");
    overlay.addEventListener("click", cerrarFichaDetalle);

    drawer = document.createElement("aside");
    drawer.id = "etDetailDrawer";
    drawer.className = "et-detail-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "etDetailTitle");
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML =
      '<header class="et-detail-header">' +
        '<div class="et-detail-heading">' +
          '<span class="et-detail-eyebrow"></span>' +
          '<h2 id="etDetailTitle"></h2>' +
          '<p class="et-detail-subtitle"></p>' +
        "</div>" +
        '<button type="button" class="et-detail-close" aria-label="Cerrar ficha">×</button>' +
      "</header>" +
      '<div class="et-detail-status-row"></div>' +
      '<div class="et-detail-body"></div>' +
      '<footer class="et-detail-actions"></footer>';

    drawer.querySelector(".et-detail-close").addEventListener("click", cerrarFichaDetalle);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    document.addEventListener("keydown", function (event) {
      if (!document.body.classList.contains("et-detail-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        cerrarFichaDetalle();
        return;
      }
      if (event.key !== "Tab") return;
      const enfocables = Array.from(drawer.querySelectorAll("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"));
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    });

    return drawer;
  }

  function crearCampoDetalle(campo) {
    const contenedor = document.createElement("div");
    contenedor.className = "et-detail-field" + (campo.wide ? " is-wide" : "");
    const etiqueta = document.createElement("dt");
    etiqueta.textContent = campo.label || "Dato";
    const valor = document.createElement("dd");
    const contenido = campo.value === 0 ? "0" : String(campo.value || "").trim();
    valor.textContent = contenido || "Sin información";
    if (!contenido) valor.classList.add("is-empty");
    contenedor.appendChild(etiqueta);
    contenedor.appendChild(valor);
    return contenedor;
  }

  function abrirFichaDetalle(configuracion) {
    const config = configuracion || {};
    const drawer = obtenerFichaDetalle();
    drawer.etOpener = document.activeElement;
    drawer.querySelector(".et-detail-eyebrow").textContent = config.eyebrow || "Detalle";
    drawer.querySelector("#etDetailTitle").textContent = config.title || "Registro";
    drawer.querySelector(".et-detail-subtitle").textContent = config.subtitle || "";

    const estado = drawer.querySelector(".et-detail-status-row");
    estado.innerHTML = "";
    if (config.status && config.status.label) {
      const badge = document.createElement("span");
      const tonos = ["green", "amber", "red", "blue", "teal", "gray", "orange"];
      const tono = tonos.includes(config.status.tone) ? config.status.tone : "gray";
      badge.className = "badge status-badge " + tono;
      badge.textContent = config.status.label;
      estado.appendChild(badge);
    }

    const body = drawer.querySelector(".et-detail-body");
    body.innerHTML = "";
    (config.sections || []).forEach(function (seccion) {
      const section = document.createElement("section");
      section.className = "et-detail-section";
      const titulo = document.createElement("h3");
      titulo.textContent = seccion.title || "Información";
      const lista = document.createElement("dl");
      lista.className = "et-detail-grid";
      (seccion.fields || []).forEach(function (campo) {
        lista.appendChild(crearCampoDetalle(campo));
      });
      section.appendChild(titulo);
      section.appendChild(lista);
      body.appendChild(section);
    });

    const footer = drawer.querySelector(".et-detail-actions");
    footer.innerHTML = "";
    (config.actions || []).forEach(function (accion) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = accion.variant === "primary" ? "btn-small" : "btn-secondary";
      boton.textContent = accion.label || "Continuar";
      boton.addEventListener("click", function () {
        cerrarFichaDetalle(false);
        if (typeof accion.onClick === "function") accion.onClick();
      });
      footer.appendChild(boton);
    });
    footer.hidden = !(config.actions || []).length;

    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("et-detail-open");
    global.requestAnimationFrame(function () {
      drawer.querySelector(".et-detail-close").focus();
    });
  }

  function cerrarFichaDetalle(restaurarFoco) {
    const drawer = document.getElementById("etDetailDrawer");
    if (!drawer || !document.body.classList.contains("et-detail-open")) return;
    document.body.classList.remove("et-detail-open");
    drawer.setAttribute("aria-hidden", "true");
    if (restaurarFoco !== false && drawer.etOpener && drawer.etOpener.isConnected) {
      global.setTimeout(function () {
        drawer.etOpener.focus();
      }, 180);
    }
  }

  function inferirTipoMensaje(mensaje) {
    const texto = String(mensaje || "").toLowerCase();
    if (/correctamente|guardad[oa]|copiad[oa]|registrad[oa]|actualizad[oa]|generad[oa]/.test(texto)) return "success";
    if (/error|no se pudo|no fue posible|fall[oó]|inv[aá]lid/.test(texto)) return "error";
    if (/completa|captura|selecciona|debes|falta|pendiente/.test(texto)) return "warning";
    return "info";
  }

  function mostrarToast(mensaje, tipo, opciones) {
    const config = opciones || {};
    let region = document.getElementById("etToastRegion");
    if (!region) {
      region = document.createElement("section");
      region.id = "etToastRegion";
      region.className = "et-toast-region";
      region.setAttribute("aria-label", "Notificaciones");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }

    const toast = document.createElement("article");
    const tipoFinal = ["success", "error", "warning", "info"].includes(tipo)
      ? tipo
      : inferirTipoMensaje(mensaje);
    toast.className = "et-toast " + tipoFinal;
    const iconos = { success: "✓", error: "!", warning: "!", info: "i" };
    toast.innerHTML =
      '<span class="et-toast-icon" aria-hidden="true">' + iconos[tipoFinal] + "</span>" +
      '<div class="et-toast-copy"><strong></strong><p></p></div>' +
      '<button type="button" class="et-toast-close" aria-label="Cerrar notificación">×</button>';
    toast.querySelector("strong").textContent =
      config.title || ({ success: "Listo", error: "Ocurrió un problema", warning: "Revisa la información", info: "Información" })[tipoFinal];
    toast.querySelector("p").textContent = String(mensaje || "");

    function cerrar() {
      toast.classList.remove("is-visible");
      global.setTimeout(function () { toast.remove(); }, 180);
    }
    toast.querySelector(".et-toast-close").addEventListener("click", cerrar);
    region.appendChild(toast);
    global.requestAnimationFrame(function () { toast.classList.add("is-visible"); });

    while (region.children.length > 4) region.firstElementChild.remove();
    global.setTimeout(cerrar, Number(config.duration || (tipoFinal === "error" ? 6500 : 4500)));
    return toast;
  }

  function obtenerDialogoFeedback() {
    let dialogo = document.getElementById("etFeedbackDialog");
    if (dialogo) return dialogo;

    const overlay = document.createElement("div");
    overlay.className = "et-feedback-overlay";
    overlay.innerHTML =
      '<section class="et-feedback-dialog" id="etFeedbackDialog" role="dialog" aria-modal="true" aria-labelledby="etFeedbackTitle" aria-hidden="true">' +
        '<div class="et-feedback-icon" aria-hidden="true">?</div>' +
        '<div class="et-feedback-copy">' +
          '<h2 id="etFeedbackTitle"></h2>' +
          '<p class="et-feedback-message"></p>' +
        "</div>" +
        '<div class="et-feedback-control"></div>' +
        '<div class="et-feedback-actions">' +
          '<button type="button" class="btn-secondary" data-feedback-cancel>Cancelar</button>' +
          '<button type="button" class="btn-small" data-feedback-confirm>Continuar</button>' +
        "</div>" +
      "</section>";
    document.body.appendChild(overlay);
    dialogo = overlay.querySelector("#etFeedbackDialog");
    dialogo.etOverlay = overlay;
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay && dialogo.etResolve) dialogo.etResolve(null);
    });
    return dialogo;
  }

  function abrirDialogoFeedback(configuracion) {
    const config = configuracion || {};
    const dialogo = obtenerDialogoFeedback();
    const overlay = dialogo.etOverlay;
    const controlContainer = dialogo.querySelector(".et-feedback-control");
    const confirmar = dialogo.querySelector("[data-feedback-confirm]");
    const cancelar = dialogo.querySelector("[data-feedback-cancel]");
    dialogo.etOpener = document.activeElement;
    dialogo.querySelector("#etFeedbackTitle").textContent = config.title || "Confirmar acción";
    dialogo.querySelector(".et-feedback-message").textContent = config.message || "";
    confirmar.textContent = config.confirmLabel || "Continuar";
    cancelar.textContent = config.cancelLabel || "Cancelar";
    confirmar.className = config.danger ? "btn-danger" : "btn-small";
    controlContainer.innerHTML = "";

    let control = null;
    if (config.options && config.options.length) {
      control = document.createElement("select");
      control.className = "et-feedback-select";
      config.options.forEach(function (opcion) {
        const option = document.createElement("option");
        option.value = typeof opcion === "string" ? opcion : opcion.value;
        option.textContent = typeof opcion === "string" ? opcion : opcion.label;
        control.appendChild(option);
      });
      control.value = config.value || control.options[0]?.value || "";
      controlContainer.appendChild(control);
    } else if (config.input) {
      control = document.createElement("input");
      control.className = "et-feedback-input";
      control.type = "text";
      control.value = config.value || "";
      control.placeholder = config.placeholder || "";
      controlContainer.appendChild(control);
    }

    overlay.classList.add("is-open");
    dialogo.setAttribute("aria-hidden", "false");
    document.body.classList.add("et-feedback-open");

    return new Promise(function (resolve) {
      let terminado = false;
      function finalizar(valor) {
        if (terminado) return;
        terminado = true;
        overlay.classList.remove("is-open");
        dialogo.setAttribute("aria-hidden", "true");
        document.body.classList.remove("et-feedback-open");
        dialogo.etResolve = null;
        confirmar.onclick = null;
        cancelar.onclick = null;
        document.removeEventListener("keydown", manejarTeclado, true);
        if (dialogo.etOpener && dialogo.etOpener.isConnected) dialogo.etOpener.focus();
        resolve(valor);
      }
      function manejarTeclado(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          finalizar(null);
        } else if (event.key === "Enter" && document.activeElement !== cancelar) {
          event.preventDefault();
          finalizar(control ? control.value : true);
        }
      }
      dialogo.etResolve = finalizar;
      confirmar.onclick = function () { finalizar(control ? control.value : true); };
      cancelar.onclick = function () { finalizar(null); };
      document.addEventListener("keydown", manejarTeclado, true);
      global.requestAnimationFrame(function () {
        (control || confirmar).focus();
      });
    });
  }

  async function confirmarAccion(configuracion) {
    const config = typeof configuracion === "string"
      ? { message: configuracion }
      : (configuracion || {});
    return (await abrirDialogoFeedback(config)) === true;
  }

  async function seleccionarOpcion(configuracion) {
    return abrirDialogoFeedback(configuracion || {});
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

      renderizarNavegacion(nav, permitidos, moduloActivo, desdeModulo);
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
    prepararSidebar(usuario);
    prepararEncabezado(moduloActivo);
    prepararBusquedaGlobal(usuario);
    prepararFiltros();
    prepararTablas();
    prepararFormularios();
    prepararMicrointeracciones();
    global.setTimeout(aplicarBusquedaDesdeURL, 0);
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
    cerrarMenuMovil,
    prepararFiltros,
    prepararTablas,
    prepararFormularios,
    prepararBusquedaGlobal,
    prepararMicrointeracciones,
    obtenerCumpleanosSemana,
    mostrarCargaTabla,
    terminarCargaTabla,
    ejecutarConBoton,
    abrirFichaDetalle,
    cerrarFichaDetalle,
    mostrarToast,
    confirmar: confirmarAccion,
    seleccionar: seleccionarOpcion,
    ocultarSiSoloLectura
  };
  global.ETFeedback = {
    toast: mostrarToast,
    confirmar: confirmarAccion,
    seleccionar: seleccionarOpcion
  };
  global.ETLoading = {
    ejecutar: ejecutarConBoton,
    mostrarTabla: mostrarCargaTabla,
    terminarTabla: terminarCargaTabla
  };
  global.alert = function (mensaje) {
    mostrarToast(mensaje);
  };
})(window);
