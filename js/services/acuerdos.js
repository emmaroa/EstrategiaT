const db = window.supabaseClient || window.supabase?.client || window.SupabaseClient;

const USUARIO_ACTUAL = {
  id: "91cd00d7-d49c-437a-b640-7020b25c53c2",
  usuario: "efigueroa",
  rol: "super_admin"
};

let acuerdos = [];
let usuarios = [];
let acuerdoSeleccionadoParaTurnar = null;

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

  if (btnNuevo) btnNuevo.addEventListener("click", abrirModal);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);
  if (btnGuardar) btnGuardar.addEventListener("click", guardarAcuerdo);

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
  modal?.classList.add("show");
  modal?.setAttribute("aria-hidden", "false");
  document.getElementById("titulo")?.focus();
}

function cerrarModal() {
  const modal = document.getElementById("modalAcuerdo");
  modal?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");
  limpiarFormulario();
}

async function cargarAcuerdos() {
  if (!db || typeof db.from !== "function") {
    console.error("Supabase no está inicializado. Revisa ../js/config/supabase.js");
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
  if (!almacenado) return USUARIO_ACTUAL;

  try {
    return JSON.parse(almacenado);
  } catch (error) {
    return USUARIO_ACTUAL;
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
}

function renderUsuariosTurnar() {
  const select = document.getElementById("turnarUsuario");
  if (!select) return;

  select.innerHTML = "<option value=''>Selecciona un usuario</option>";
  usuarios.forEach(function (usuario) {
    const option = document.createElement("option");
    option.value = usuario.id;
    option.textContent = `${usuario.nombre || usuario.usuario} (${usuario.rol || "Usuario"})`;
    select.appendChild(option);
  });
}

function esUsuarioAdministrador(usuarioActivo) {
  if (!usuarioActivo) return false;
  return ["super_admin", "admin", "jefe"].includes(usuarioActivo.rol);
}

function esUsuarioAsignadoTurnado(acuerdo, usuarioActivo) {
  if (!acuerdo || !usuarioActivo) return false;
  if (esUsuarioAdministrador(usuarioActivo)) return true;
  return acuerdo.asignado_a === usuarioActivo.id;
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
      (acuerdo.estado || "").toLowerCase().includes(texto);

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
      <small><strong>Estado:</strong> ${escapar(acuerdo.estado || "Nuevo")}</small>
    </div>

    <div class="acuerdo-acciones">
      <button type="button" class="action-btn" onclick="verAcuerdo('${acuerdo.id}')">Ver</button>
      ${soloLectura ? "" : botonesEstado(acuerdo)}
    </div>
  `;

  contenedor.appendChild(card);
}

function botonesEstado(acuerdo) {
  const usuarioActivo = obtenerUsuarioActivo();
  const puedeModificar = esUsuarioAdministrador(usuarioActivo) || acuerdo.asignado_a === usuarioActivo.id;

  if (!puedeModificar) {
    return "";
  }

  return `
    <button type="button" class="action-btn blue" onclick="cambiarEstado('${acuerdo.id}', 'En proceso')">En proceso</button>
    <button type="button" class="action-btn" onclick="cambiarEstado('${acuerdo.id}', 'En espera')">En espera</button>
    <button type="button" class="action-btn orange" onclick="abrirTurnarModal('${acuerdo.id}')">Turnar</button>
    <button type="button" class="action-btn" onclick="cambiarEstado('${acuerdo.id}', 'Para revisión')">Revisión</button>
    <button type="button" class="action-btn edit" onclick="cambiarEstado('${acuerdo.id}', 'Concluido')">Concluir</button>
  `;
}

async function guardarAcuerdo() {
  const titulo = document.getElementById("titulo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const categoria = document.getElementById("categoria").value;
  const prioridad = document.getElementById("prioridad").value;
  const fechaCompromiso = document.getElementById("fechaCompromiso").value;
  const usuarioActivo = obtenerUsuarioActivo();

  if (!titulo) {
    alert("Escribe el título del acuerdo.");
    return;
  }

  const nuevoAcuerdo = {
    folio: `AC-${Date.now().toString().slice(-6)}`,
    titulo,
    descripcion,
    categoria,
    prioridad,
    estado: "Nuevo",
    creado_por: usuarioActivo.id,
    asignado_a: usuarioActivo.id,
    fecha_compromiso: fechaCompromiso || null,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString()
  };

  const { data, error } = await db.from("acuerdos").insert([nuevoAcuerdo]).select().single();

  if (error) {
    console.error("Error guardando acuerdo:", error);
    alert("No se pudo guardar el acuerdo. Revisa la tabla y columnas de Supabase.");
    return;
  }

  if (data) {
    acuerdos = [data, ...acuerdos];
  }

  if (typeof registrarAuditoria === "function") {
    registrarAuditoria("Acuerdos", "Creó nuevo acuerdo", titulo);
  }

  cerrarModal();
  await cargarAcuerdos();
  alert("Acuerdo guardado correctamente.");
}

function limpiarFormulario() {
  document.getElementById("titulo").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("categoria").value = "Oficios";
  document.getElementById("prioridad").value = "Media";
  document.getElementById("fechaCompromiso").value = "";
}

async function cambiarEstado(id, estado) {
  const updateData = { estado };

  if (estado === "Concluido") {
    updateData.fecha_conclusion = new Date().toISOString();
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

  await registrarHistorial(id, "Cambio de estado", "Estado cambiado a " + estado);

  if (typeof registrarAuditoria === "function") {
    registrarAuditoria("Acuerdos", "Cambió estado", "Estado cambiado a " + estado);
  }

  await cargarAcuerdos();
}

function abrirTurnarModal(id) {
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
    registrarAuditoria("Acuerdos", "Turnó acuerdo", detalle);
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

function verAcuerdo(id) {
  const acuerdo = acuerdos.find(a => a.id === id);
  if (!acuerdo) return;

  alert(
    "Folio: " + (acuerdo.folio || "Sin folio") +
    "\nTítulo: " + (acuerdo.titulo || "") +
    "\nDescripción: " + (acuerdo.descripcion || "Sin descripción") +
    "\nCategoría: " + (acuerdo.categoria || "Sin categoría") +
    "\nPrioridad: " + (acuerdo.prioridad || "Media") +
    "\nEstado: " + (acuerdo.estado || "Nuevo") +
    "\nFecha compromiso: " + (formatearFecha(acuerdo.fecha_compromiso) || "Sin fecha")
  );
}

function actualizarKPIs(lista) {
  document.getElementById("kpiTotal").textContent = lista.length;
  document.getElementById("kpiNuevos").textContent = lista.filter(a => a.estado === "Nuevo").length;
  document.getElementById("kpiSinConcluir").textContent = lista.filter(a => a.estado !== "Concluido").length;
  document.getElementById("kpiProceso").textContent = lista.filter(a => a.estado === "En proceso").length;
  document.getElementById("kpiConcluidos").textContent = lista.filter(a => a.estado === "Concluido").length;
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
  const partes = fecha.split("-");
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
