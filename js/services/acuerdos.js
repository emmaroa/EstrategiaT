const db = window.supabaseClient || window.supabase?.client || window.SupabaseClient;

let acuerdos = [];
let usuarios = [];
let acuerdoSeleccionadoParaTurnar = null;
let acuerdoEditandoId = null;

const ESTADOS = [
  "Nuevo",
  "Turnado",
  "En proceso",
  "En espera",
  "Para revisión",
  "Concluido"
];

document.addEventListener("DOMContentLoaded", () => {
  if (typeof validarPermiso === "function") {
    validarPermiso("Acuerdos");
  }

  if (window.ETLayout && typeof ETLayout.inicializar === "function") {
    ETLayout.inicializar("Acuerdos");
  }

  if (window.ETLayout && typeof ETLayout.ocultarSiSoloLectura === "function") {
    ETLayout.ocultarSiSoloLectura("#btnNuevoAcuerdo");
  }

  const btnNuevo = document.getElementById("btnNuevoAcuerdo");
  const btnCerrar = document.getElementById("cerrarModal");
  const btnCancelar = document.getElementById("cancelarAcuerdo");
  const btnGuardar = document.getElementById("guardarAcuerdo");
  const modalAcuerdo = document.getElementById("modalAcuerdo");
  const modalAcuerdoTitulo = document.getElementById("modalAcuerdoTitulo");
  const buscarAcuerdo = document.getElementById("buscarAcuerdo");
  const filtroEstado = document.getElementById("filtroEstado");
  const filtroPrioridad = document.getElementById("filtroPrioridad");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const parametros = new URLSearchParams(window.location.search);
  const estadoInicial = parametros.get("estado");
  if (estadoInicial && filtroEstado && ESTADOS.includes(estadoInicial)) filtroEstado.value = estadoInicial;

  if (btnNuevo) btnNuevo.addEventListener("click", abrirModal);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);
  if (btnGuardar) {
    btnGuardar.addEventListener("click", function () {
      ETLoading.ejecutar(btnGuardar, guardarAcuerdo);
    });
  }

  buscarAcuerdo?.addEventListener("input", renderizarAcuerdos);
  filtroEstado?.addEventListener("change", renderizarAcuerdos);
  filtroPrioridad?.addEventListener("change", renderizarAcuerdos);
  filtroCategoria?.addEventListener("change", renderizarAcuerdos);

  modalAcuerdo?.addEventListener("click", function (event) {
    if (event.target === modalAcuerdo) cerrarModal();
  });

  const modalTurnar = document.getElementById("modalTurnar");
  const btnCerrarTurnar = document.getElementById("cerrarTurnar");
  const btnCancelarTurnar = document.getElementById("cancelarTurnar");
  const btnConfirmarTurnar = document.getElementById("confirmarTurnar");

  if (modalTurnar) {
    modalTurnar.addEventListener("click", function (event) {
      if (event.target === modalTurnar) cerrarModalTurnar();
    });
  }

  if (btnCerrarTurnar) btnCerrarTurnar.addEventListener("click", cerrarModalTurnar);
  if (btnCancelarTurnar) btnCancelarTurnar.addEventListener("click", cerrarModalTurnar);
  if (btnConfirmarTurnar) btnConfirmarTurnar.addEventListener("click", confirmarTurnar);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (modalAcuerdo?.classList.contains("show")) cerrarModal();
      if (modalTurnar?.classList.contains("show")) cerrarModalTurnar();
    }
  });

  cargarUsuarios();
  cargarAcuerdos();
});

function abrirModal() {
  if (typeof esSoloLectura === "function" && esSoloLectura()) return;
  const modal = document.getElementById("modalAcuerdo");
  const usuarioActivo = obtenerUsuarioActivo();
  const responsable = document.getElementById("asignadoA");
  if (!acuerdoEditandoId) {
    limpiarFormulario();
    if (responsable && usuarioActivo?.id) responsable.value = usuarioActivo.id;
  }
  if (responsable) responsable.disabled = !puedeTurnarAcuerdos(usuarioActivo);
  modal?.classList.add("show");
  modal?.setAttribute("aria-hidden", "false");
  document.getElementById("modalAcuerdoTitulo").textContent = acuerdoEditandoId ? "Editar acuerdo" : "Nuevo acuerdo";
  document.getElementById("guardarAcuerdo").textContent = acuerdoEditandoId ? "Guardar cambios" : "Guardar acuerdo";
  document.getElementById("titulo")?.focus();
}

function cerrarModal() {
  const modal = document.getElementById("modalAcuerdo");
  modal?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");
  limpiarFormulario();
  acuerdoEditandoId = null;
}

async function cargarAcuerdos() {
  if (!db || typeof db.from !== "function") {
    console.error("Supabase no está inicializado. Revisa ../js/core/supabase.js");
    alert("No se pudo conectar con Supabase.");
    return;
  }

  const { data, error } = await db
    .from("acuerdos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error cargando acuerdos:", error);
    alert("No se pudieron cargar los acuerdos.");
    return;
  }

  acuerdos = data || [];
  renderizarAcuerdos();
}

function obtenerUsuarioActivo() {
  const almacenado = localStorage.getItem("usuarioActivo");
  if (!almacenado) return null;

  try {
    return JSON.parse(almacenado);
  } catch (error) {
    return null;
  }
}

async function cargarUsuarios() {
  if (!db || typeof db.from !== "function") return;

  const { data, error } = await db
    .from("usuarios")
    .select("id,nombre,usuario,rol,activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.warn("No se pudieron cargar los usuarios:", error);
    usuarios = [];
    return;
  }

  usuarios = data || [];
  renderUsuariosTurnar();
  if (acuerdos.length) renderizarAcuerdos();
}

function renderUsuariosTurnar() {
  [document.getElementById("turnarUsuario"), document.getElementById("asignadoA")].forEach(function (select) {
    if (!select) return;
    const valorActual = select.value;
    select.innerHTML = "<option value=''>Sin responsable asignado</option>";
    usuarios.filter(function (usuario) {
      return normalizarRolAcuerdos(usuario.rol) !== "proveedor";
    }).forEach(function (usuario) {
      const option = document.createElement("option");
      option.value = usuario.id;
      option.textContent = `${usuario.nombre || usuario.usuario} (${usuario.rol || "Usuario"})`;
      select.appendChild(option);
    });
    select.value = valorActual;
  });
}

function normalizarRolAcuerdos(rol) {
  return String(rol || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function esUsuarioAdministrador(usuarioActivo) {
  if (!usuarioActivo) return false;
  return ["super_admin", "superadmin", "administrador_del_sistema", "admin", "jefe", "director"].includes(
    normalizarRolAcuerdos(usuarioActivo.rol)
  );
}

function esModeradorAcuerdos(usuarioActivo) {
  if (!usuarioActivo) return false;
  const rol = normalizarRolAcuerdos(usuarioActivo.rol);

  if (rol === "moderador_de_acuerdos" || rol === "moderador_acuerdos") {
    return true;
  }

  if (window.ETPermissions && typeof ETPermissions.obtenerPermisoModuloUsuario === "function") {
    return ETPermissions.obtenerPermisoModuloUsuario(usuarioActivo, "Acuerdos") === "moderar";
  }

  return false;
}

function puedeVerTodosLosAcuerdos(usuarioActivo) {
  return esUsuarioAdministrador(usuarioActivo) || esModeradorAcuerdos(usuarioActivo);
}

function puedeEditarAcuerdo(acuerdo, usuarioActivo) {
  if (!acuerdo || !usuarioActivo) return false;
  return esUsuarioAdministrador(usuarioActivo) || esModeradorAcuerdos(usuarioActivo) ||
    acuerdo.asignado_a === usuarioActivo.id || acuerdo.creado_por === usuarioActivo.id;
}

function puedeTurnarAcuerdos(usuarioActivo) {
  return esUsuarioAdministrador(usuarioActivo) || esModeradorAcuerdos(usuarioActivo);
}

function esUsuarioAsignadoTurnado(acuerdo, usuarioActivo) {
  if (!acuerdo || !usuarioActivo) return false;
  if (puedeVerTodosLosAcuerdos(usuarioActivo)) return true;
  return acuerdo.asignado_a === usuarioActivo.id || acuerdo.creado_por === usuarioActivo.id;
}

function renderizarAcuerdos() {
  limpiarColumnas();

  const texto = (document.getElementById("buscarAcuerdo")?.value || "").toLowerCase();
  const estado = document.getElementById("filtroEstado")?.value || "";
  const prioridad = document.getElementById("filtroPrioridad")?.value || "";
  const categoria = document.getElementById("filtroCategoria")?.value || "";
  const usuarioActivo = obtenerUsuarioActivo();

  const filtrados = acuerdos.filter(function (acuerdo) {
    if (!esUsuarioAsignadoTurnado(acuerdo, usuarioActivo)) {
      return false;
    }

    const coincideTexto =
      (acuerdo.folio || "").toLowerCase().includes(texto) ||
      (acuerdo.titulo || "").toLowerCase().includes(texto) ||
      (acuerdo.descripcion || "").toLowerCase().includes(texto) ||
      (acuerdo.categoria || "").toLowerCase().includes(texto) ||
      (acuerdo.prioridad || "").toLowerCase().includes(texto) ||
      (acuerdo.estado || "").toLowerCase().includes(texto) ||
      obtenerTextoEstadoAcuerdo(acuerdo).toLowerCase().includes(texto);

    const coincideEstado = estado === "" || acuerdo.estado === estado;
    const coincidePrioridad = prioridad === "" || acuerdo.prioridad === prioridad;
    const coincideCategoria = categoria === "" || acuerdo.categoria === categoria;

    return coincideTexto && coincideEstado && coincidePrioridad && coincideCategoria;
  });

  filtrados.forEach(pintarTarjeta);
  pintarColumnasVacias();
  actualizarKPIs(acuerdos.filter(a => esUsuarioAsignadoTurnado(a, usuarioActivo)));
  actualizarContadores(filtrados);
}

function limpiarColumnas() {
  document.querySelectorAll(".lista").forEach(lista => {
    lista.innerHTML = "";
  });
}

function pintarColumnasVacias() {
  ESTADOS.forEach(function (estado) {
    const contenedor = document.getElementById(estado);
    if (!contenedor) return;

    if (!contenedor.children.length) {
      contenedor.innerHTML = '<div class="estado-vacio">Sin acuerdos</div>';
    }
  });
}

function pintarTarjeta(acuerdo) {
  const contenedor = document.getElementById(acuerdo.estado);
  if (!contenedor) return;

  const card = document.createElement("div");
  card.className = "acuerdo-card " + obtenerClasePrioridad(acuerdo.prioridad);

  const soloLectura = typeof esSoloLectura === "function" && esSoloLectura();
  const estadoTexto = obtenerTextoEstadoAcuerdo(acuerdo);
  const usuarioActivo = obtenerUsuarioActivo();
  const responsable = obtenerNombreUsuario(obtenerUsuarioPorId(acuerdo.asignado_a)) || "Sin asignar";
  const vencimiento = obtenerVencimientoAcuerdo(acuerdo);
  if (vencimiento.clase) card.classList.add(vencimiento.clase);

  card.innerHTML = `
    <div class="acuerdo-top">
      <span class="folio">${escapar(acuerdo.folio || "Sin folio")}</span>
      <span class="badge ${obtenerBadgePrioridad(acuerdo.prioridad)}">${escapar(acuerdo.prioridad || "Media")}</span>
    </div>

    <h3>${escapar(acuerdo.titulo || "Sin título")}</h3>
    <p>${escapar(acuerdo.descripcion || "Sin descripción")}</p>

    <div class="acuerdo-meta">
      <small><strong>Categoría:</strong> ${escapar(acuerdo.categoria || "Sin categoría")}</small>
      <small><strong>Vence:</strong> ${formatearFecha(acuerdo.fecha_compromiso) || "Sin fecha"}</small>
      <small><strong>Responsable:</strong> ${escapar(responsable)}</small>
      <small><strong>Estado:</strong> ${escapar(estadoTexto)}</small>
      ${vencimiento.texto ? `<small class="acuerdo-vencimiento"><strong>${escapar(vencimiento.texto)}</strong></small>` : ""}
    </div>

    <div class="acuerdo-acciones">
      ${botonIconoAcuerdo("ver", "Ver acuerdo", "verAcuerdo('" + acuerdo.id + "')")}
      ${!soloLectura && puedeEditarAcuerdo(acuerdo, usuarioActivo) ? botonIconoAcuerdo("editar", "Editar acuerdo", "editarAcuerdo('" + acuerdo.id + "')", "edit") : ""}
      ${soloLectura ? "" : botonesEstado(acuerdo)}
    </div>
  `;

  contenedor.appendChild(card);
}

function botonIconoAcuerdo(icono, etiqueta, onclick, clase) {
  if (window.ETLayout && typeof ETLayout.iconButton === "function") {
    return ETLayout.iconButton(icono, etiqueta, onclick, clase);
  }
  return `<button type="button" class="action-btn ${clase || ""}" title="${etiqueta}" aria-label="${etiqueta}" onclick="${onclick}">${etiqueta}</button>`;
}

function botonesEstado(acuerdo) {
  const usuarioActivo = obtenerUsuarioActivo();
  const puedeModificarEstado = puedeEditarAcuerdo(acuerdo, usuarioActivo);
  const puedeTurnar = puedeTurnarAcuerdos(usuarioActivo);

  if (!puedeModificarEstado && !puedeTurnar) {
    return "";
  }

  if (!puedeModificarEstado && puedeTurnar) {
    return botonIconoAcuerdo("turnar", "Turnar acuerdo", "abrirTurnarModal('" + acuerdo.id + "')", "orange");
  }

  const accionesPorEstado = {
    "Nuevo": [["proceso", "Iniciar acuerdo", "En proceso", "blue"]],
    "Turnado": [["proceso", "Aceptar e iniciar", "En proceso", "blue"]],
    "En proceso": [["espera", "Poner en espera", "En espera", ""], ["revision", "Enviar a revisión", "Para revisión", "orange"]],
    "En espera": [["proceso", "Reanudar acuerdo", "En proceso", "blue"], ["revision", "Enviar a revisión", "Para revisión", "orange"]],
    "Para revisión": [["proceso", "Regresar a proceso", "En proceso", "blue"], ["concluir", "Concluir acuerdo", "Concluido", "edit"]],
    "Concluido": esUsuarioAdministrador(usuarioActivo) ? [["proceso", "Reabrir acuerdo", "En proceso", "blue"]] : []
  };
  const botones = (accionesPorEstado[acuerdo.estado] || []).map(function (accion) {
    return botonIconoAcuerdo(accion[0], accion[1], "cambiarEstado('" + acuerdo.id + "', '" + accion[2] + "')", accion[3]);
  });
  if (puedeTurnar) botones.push(botonIconoAcuerdo("turnar", "Asignar responsable", "abrirTurnarModal('" + acuerdo.id + "')", "orange"));
  return botones.join("");
}

function obtenerVencimientoAcuerdo(acuerdo) {
  if (!acuerdo?.fecha_compromiso || acuerdo.estado === "Concluido") return { clase: "", texto: "" };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(String(acuerdo.fecha_compromiso).split("T")[0] + "T00:00:00");
  const dias = Math.round((fecha - hoy) / 86400000);
  if (dias < 0) return { clase: "esta-vencido", texto: "Vencido hace " + Math.abs(dias) + (Math.abs(dias) === 1 ? " día" : " días") };
  if (dias === 0) return { clase: "vence-pronto", texto: "Vence hoy" };
  if (dias <= 3) return { clase: "vence-pronto", texto: "Vence en " + dias + (dias === 1 ? " día" : " días") };
  return { clase: "", texto: "" };
}

function obtenerUsuarioPorId(id) {
  if (!id) return null;
  return usuarios.find(function (usuario) {
    return usuario.id === id;
  }) || null;
}

function obtenerNombreUsuario(usuario) {
  if (!usuario) return "";
  return usuario.nombre || usuario.usuario || "";
}

function obtenerTextoEstadoAcuerdo(acuerdo) {
  const estado = acuerdo.estado || "Nuevo";
  if (estado !== "Turnado") return estado;

  const usuarioAsignado = obtenerUsuarioPorId(acuerdo.asignado_a);
  const nombreAsignado = obtenerNombreUsuario(usuarioAsignado);

  return nombreAsignado ? `Turnado a ${nombreAsignado}` : "Turnado";
}

async function guardarAcuerdo() {
  const titulo = document.getElementById("titulo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const categoria = document.getElementById("categoria").value;
  const prioridad = document.getElementById("prioridad").value;
  const fechaCompromiso = document.getElementById("fechaCompromiso").value;
  const usuarioActivo = obtenerUsuarioActivo();
  const asignadoSeleccionado = document.getElementById("asignadoA")?.value || usuarioActivo?.id || null;

  if (!usuarioActivo?.id) {
    alert("La sesión no es válida. Inicia sesión nuevamente.");
    return;
  }

  if (!titulo) {
    alert("Escribe el título del acuerdo.");
    document.getElementById("titulo")?.focus();
    return;
  }

  const datosAcuerdo = {
    titulo,
    descripcion,
    categoria,
    prioridad,
    asignado_a: asignadoSeleccionado,
    fecha_compromiso: fechaCompromiso || null,
    actualizado_en: new Date().toISOString()
  };
  let data;
  let error;
  const anterior = acuerdoEditandoId ? acuerdos.find(a => a.id === acuerdoEditandoId) : null;
  if (acuerdoEditandoId) {
    ({ data, error } = await db.from("acuerdos").update(datosAcuerdo).eq("id", acuerdoEditandoId).select().single());
  } else {
    const nuevoAcuerdo = Object.assign({}, datosAcuerdo, {
      folio: `AC-${Date.now().toString().slice(-6)}`,
      estado: asignadoSeleccionado && asignadoSeleccionado !== usuarioActivo.id ? "Turnado" : "Nuevo",
      creado_por: usuarioActivo.id,
      creado_en: new Date().toISOString()
    });
    ({ data, error } = await db.from("acuerdos").insert([nuevoAcuerdo]).select().single());
  }

  if (error) {
    console.error("Error guardando acuerdo:", error);
    alert("No se pudo guardar el acuerdo. " + (error.message || "Revisa la conexión con Supabase."));
    return;
  }

  const accionHistorial = acuerdoEditandoId ? "Acuerdo editado" : "Acuerdo creado";
  const detalleHistorial = acuerdoEditandoId
    ? describirCambiosAcuerdo(anterior, data || datosAcuerdo)
    : "Se registró el acuerdo " + titulo;
  await registrarHistorial(data?.id || acuerdoEditandoId, accionHistorial, detalleHistorial);

  if (typeof registrarAuditoria === "function") {
    registrarAuditoria("Acuerdos", acuerdoEditandoId ? "Editó acuerdo" : "Creó nuevo acuerdo", titulo, {
      entidad_tipo: "acuerdos",
      entidad_id: data?.id || acuerdoEditandoId,
      metadata: { antes: anterior || null, despues: data || datosAcuerdo }
    });
  }

  const fueEdicion = Boolean(acuerdoEditandoId);
  cerrarModal();
  await cargarAcuerdos();
  alert(fueEdicion ? "Acuerdo actualizado correctamente." : "Acuerdo guardado correctamente.");
}

function describirCambiosAcuerdo(antes, despues) {
  if (!antes) return "Datos del acuerdo actualizados.";
  const etiquetas = {
    titulo: "Título", descripcion: "Descripción", categoria: "Categoría",
    prioridad: "Prioridad", fecha_compromiso: "Fecha compromiso", asignado_a: "Responsable"
  };
  const cambios = Object.keys(etiquetas).filter(function (campo) {
    return String(antes[campo] ?? "") !== String(despues[campo] ?? "");
  }).map(function (campo) { return etiquetas[campo]; });
  return cambios.length ? "Se cambió: " + cambios.join(", ") + "." : "Se guardó sin cambios visibles.";
}

function editarAcuerdo(id) {
  const acuerdo = acuerdos.find(a => a.id === id);
  const usuarioActivo = obtenerUsuarioActivo();
  if (!acuerdo || !puedeEditarAcuerdo(acuerdo, usuarioActivo)) return;
  acuerdoEditandoId = id;
  document.getElementById("titulo").value = acuerdo.titulo || "";
  document.getElementById("descripcion").value = acuerdo.descripcion || "";
  document.getElementById("categoria").value = acuerdo.categoria || "Oficios";
  document.getElementById("prioridad").value = acuerdo.prioridad || "Media";
  document.getElementById("fechaCompromiso").value = String(acuerdo.fecha_compromiso || "").split("T")[0];
  document.getElementById("asignadoA").value = acuerdo.asignado_a || "";
  abrirModal();
}

function limpiarFormulario() {
  document.getElementById("titulo").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("categoria").value = "Oficios";
  document.getElementById("prioridad").value = "Media";
  document.getElementById("fechaCompromiso").value = "";
  const responsable = document.getElementById("asignadoA");
  if (responsable) responsable.value = "";
}

async function cambiarEstado(id, estado) {
  const acuerdo = acuerdos.find(a => a.id === id);
  const usuarioActivo = obtenerUsuarioActivo();
  if (!acuerdo || !puedeEditarAcuerdo(acuerdo, usuarioActivo)) {
    alert("No tienes permiso para actualizar este acuerdo.");
    return;
  }
  const confirmado = await ETFeedback.confirmar({
    title: estado === "Concluido" ? "Concluir acuerdo" : "Actualizar seguimiento",
    message: "El acuerdo cambiará de “" + acuerdo.estado + "” a “" + estado + "”.",
    confirmLabel: estado === "Concluido" ? "Concluir" : "Cambiar estado"
  });
  if (!confirmado) return;

  const updateData = { estado, actualizado_en: new Date().toISOString() };

  if (estado === "Concluido") {
    updateData.fecha_conclusion = new Date().toISOString();
  } else if (acuerdo.estado === "Concluido") {
    updateData.fecha_conclusion = null;
  }

  const { error } = await db
    .from("acuerdos")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error cambiando estado:", error);
    alert("No se pudo cambiar el estado.");
    return;
  }

  await registrarHistorial(id, "Cambio de estado", "Estado cambiado de " + acuerdo.estado + " a " + estado);

  if (typeof registrarAuditoria === "function") {
    registrarAuditoria("Acuerdos", "Cambió estado", "Estado cambiado de " + acuerdo.estado + " a " + estado, {
      entidad_tipo: "acuerdos", entidad_id: id,
      metadata: { antes: { estado: acuerdo.estado }, despues: { estado: estado } }
    });
  }

  await cargarAcuerdos();
}

function abrirTurnarModal(id) {
  const usuarioActivo = obtenerUsuarioActivo();
  if (!puedeTurnarAcuerdos(usuarioActivo)) {
    alert("No tienes permiso para turnar acuerdos.");
    return;
  }

  acuerdoSeleccionadoParaTurnar = id;
  const modal = document.getElementById("modalTurnar");
  const titulo = document.getElementById("modalTurnarTitulo");
  const mensaje = document.getElementById("modalTurnarMensaje");

  if (titulo) titulo.textContent = "Turnar acuerdo";
  if (mensaje) mensaje.textContent = "Selecciona el usuario al que deseas turnar este acuerdo.";

  modal?.classList.add("show");
  modal?.setAttribute("aria-hidden", "false");
}

function cerrarModalTurnar() {
  const modal = document.getElementById("modalTurnar");
  const select = document.getElementById("turnarUsuario");

  modal?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");
  if (select) select.value = "";
  acuerdoSeleccionadoParaTurnar = null;
}

async function confirmarTurnar() {
  if (!acuerdoSeleccionadoParaTurnar) return;

  const usuarioSeleccionado = document.getElementById("turnarUsuario")?.value;
  if (!usuarioSeleccionado) {
    alert("Selecciona un usuario válido para turnar.");
    return;
  }

  const usuarioActivo = obtenerUsuarioActivo();
  if (!puedeTurnarAcuerdos(usuarioActivo)) {
    alert("No tienes permiso para turnar acuerdos.");
    return;
  }

  const acuerdoAnterior = acuerdos.find(a => a.id === acuerdoSeleccionadoParaTurnar);
  const { error } = await db
    .from("acuerdos")
    .update({
      asignado_a: usuarioSeleccionado,
      turnado_por: usuarioActivo.id,
      estado: "Turnado",
      actualizado_en: new Date().toISOString()
    })
    .eq("id", acuerdoSeleccionadoParaTurnar);

  if (error) {
    console.error("Error turnando acuerdo:", error);
    alert("No se pudo turnar el acuerdo. " + (error.message || JSON.stringify(error)));
    return;
  }

  const usuarioDestino = usuarios.find(u => u.id === usuarioSeleccionado);
  const detalle = usuarioDestino
    ? `Turnado a ${usuarioDestino.nombre || usuarioDestino.usuario}`
    : "Turnado a otro usuario";

  await registrarHistorial(acuerdoSeleccionadoParaTurnar, "Acuerdo turnado", detalle);

  if (typeof registrarAuditoria === "function") {
    registrarAuditoria("Acuerdos", "Turnó acuerdo", detalle, {
      entidad_tipo: "acuerdos", entidad_id: acuerdoSeleccionadoParaTurnar,
      metadata: {
        antes: { asignado_a: acuerdoAnterior?.asignado_a || null, estado: acuerdoAnterior?.estado || null },
        despues: { asignado_a: usuarioSeleccionado, estado: "Turnado" }
      }
    });
  }

  cerrarModalTurnar();
  await cargarAcuerdos();
}

async function registrarHistorial(acuerdoId, accion, detalle) {
  try {
    const usuarioActivo = obtenerUsuarioActivo();
    await db.from("acuerdos_historial").insert({
      acuerdo_id: acuerdoId,
      usuario_id: usuarioActivo.id,
      accion,
      detalle
    });
  } catch (error) {
    console.warn("No se pudo registrar historial:", error);
  }
}

async function verAcuerdo(id) {
  const acuerdo = acuerdos.find(a => a.id === id);
  if (!acuerdo) return;
  const historial = await obtenerHistorialAcuerdo(id);
  const actividad = historial.length
    ? historial.slice(0, 8).map(function (item) {
        return {
          label: formatearFechaHoraAcuerdo(item.created_at) + " · " + (item.accion || "Movimiento"),
          value: (item.detalle || "Sin detalle") + (item.usuario_nombre ? " — " + item.usuario_nombre : ""),
          wide: true
        };
      })
    : [{ label: "Actividad", value: "Sin movimientos registrados", wide: true }];
  const usuarioActivo = obtenerUsuarioActivo();
  const acciones = puedeEditarAcuerdo(acuerdo, usuarioActivo) ? [{
    label: "Editar acuerdo", variant: "primary", onClick: function () { editarAcuerdo(id); }
  }] : [];
  ETLayout.abrirFichaDetalle({
    eyebrow: acuerdo.folio || "Acuerdo",
    title: acuerdo.titulo || "Sin título",
    subtitle: acuerdo.descripcion || "Sin descripción",
    status: { label: obtenerTextoEstadoAcuerdo(acuerdo), tone: obtenerTonoEstadoAcuerdo(acuerdo.estado) },
    sections: [
      { title: "Seguimiento", fields: [
        { label: "Responsable", value: obtenerNombreUsuario(obtenerUsuarioPorId(acuerdo.asignado_a)) },
        { label: "Fecha compromiso", value: formatearFecha(acuerdo.fecha_compromiso) },
        { label: "Prioridad", value: acuerdo.prioridad },
        { label: "Categoría", value: acuerdo.categoria }
      ] },
      { title: "Actividad reciente", fields: actividad }
    ],
    actions: acciones
  });
}

async function obtenerHistorialAcuerdo(id) {
  const { data, error } = await db.from("acuerdos_historial")
    .select("accion,detalle,created_at,usuario_id")
    .eq("acuerdo_id", id).order("created_at", { ascending: false });
  if (error) {
    console.warn("No se pudo consultar el historial:", error);
    return [];
  }
  return (data || []).map(function (item) {
    return Object.assign({}, item, { usuario_nombre: obtenerNombreUsuario(obtenerUsuarioPorId(item.usuario_id)) });
  });
}

function formatearFechaHoraAcuerdo(fecha) {
  if (!fecha) return "Sin fecha";
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? String(fecha) : date.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function obtenerTonoEstadoAcuerdo(estado) {
  if (estado === "Concluido") return "green";
  if (estado === "Para revisión") return "orange";
  if (estado === "En proceso") return "blue";
  if (estado === "En espera") return "amber";
  return "gray";
}

function actualizarKPIs(lista) {
  const counts = lista.reduce(function (acumulado, acuerdo) {
    acumulado.total += 1;
    if (acuerdo.estado === "Nuevo") acumulado.nuevos += 1;
    if (acuerdo.estado !== "Concluido") acumulado.sinConcluir += 1;
    if (acuerdo.estado === "En proceso") acumulado.proceso += 1;
    if (acuerdo.estado === "Concluido") acumulado.concluidos += 1;
    return acumulado;
  }, {
    total: 0,
    nuevos: 0,
    sinConcluir: 0,
    proceso: 0,
    concluidos: 0
  });

  document.getElementById("kpiTotal").textContent = counts.total;
  document.getElementById("kpiNuevos").textContent = counts.nuevos;
  document.getElementById("kpiSinConcluir").textContent = counts.sinConcluir;
  document.getElementById("kpiProceso").textContent = counts.proceso;
  document.getElementById("kpiConcluidos").textContent = counts.concluidos;
}

function actualizarContadores(lista) {
  setTexto("countNuevo", contarEstado(lista, "Nuevo"));
  setTexto("countTurnado", contarEstado(lista, "Turnado"));
  setTexto("countEnProceso", contarEstado(lista, "En proceso"));
  setTexto("countEnEspera", contarEstado(lista, "En espera"));
  setTexto("countParaRevision", contarEstado(lista, "Para revisión"));
  setTexto("countConcluido", contarEstado(lista, "Concluido"));
}

function contarEstado(lista, estado) {
  return lista.filter(a => a.estado === estado).length;
}

function setTexto(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor;
}

function obtenerClasePrioridad(prioridad) {
  if (prioridad === "Alta") return "prioridad-alta";
  if (prioridad === "Baja") return "prioridad-baja";
  return "prioridad-media";
}

function obtenerBadgePrioridad(prioridad) {
  if (prioridad === "Alta") return "prioridad-alta";
  if (prioridad === "Baja") return "prioridad-baja";
  return "prioridad-media";
}

function formatearFecha(fecha) {
  if (!fecha) return "";
  const valor = String(fecha).split("T")[0];
  if (valor.includes("/")) {
    const partesSlash = valor.split("/");
    if (partesSlash.length === 3) {
      const primero = Number(partesSlash[0]);
      const segundo = Number(partesSlash[1]);
      if (primero > 12) return partesSlash[0].padStart(2, "0") + "/" + partesSlash[1].padStart(2, "0") + "/" + partesSlash[2];
      if (segundo > 12 || primero <= 12) return partesSlash[1].padStart(2, "0") + "/" + partesSlash[0].padStart(2, "0") + "/" + partesSlash[2];
    }
  }
  const partes = valor.split("-");
  if (partes.length !== 3) return fecha;
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function escapar(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
