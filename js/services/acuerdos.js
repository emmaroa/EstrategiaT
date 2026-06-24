const db = window.supabaseClient || window.supabase?.client || window.SupabaseClient;

const USUARIO_ACTUAL = {
  id: "91cd00d7-d49c-437a-b640-7020b25c53c2",
  usuario: "efigueroa",
  rol: "super_admin"
};

let acuerdos = [];

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

  if (btnNuevo) btnNuevo.addEventListener("click", abrirModal);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);
  if (btnGuardar) btnGuardar.addEventListener("click", guardarAcuerdo);

  document.getElementById("buscarAcuerdo")?.addEventListener("input", renderizarAcuerdos);
  document.getElementById("filtroEstado")?.addEventListener("change", renderizarAcuerdos);
  document.getElementById("filtroPrioridad")?.addEventListener("change", renderizarAcuerdos);
  document.getElementById("filtroCategoria")?.addEventListener("change", renderizarAcuerdos);

  document.getElementById("modalAcuerdo")?.addEventListener("click", function (event) {
    if (event.target.id === "modalAcuerdo") cerrarModal();
  });

  cargarAcuerdos();
});

function abrirModal() {
  if (typeof esSoloLectura === "function" && esSoloLectura()) return;
  document.getElementById("modalAcuerdo").classList.add("show");
}

function cerrarModal() {
  document.getElementById("modalAcuerdo").classList.remove("show");
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

function renderizarAcuerdos() {
  limpiarColumnas();

  const texto = (document.getElementById("buscarAcuerdo")?.value || "").toLowerCase();
  const estado = document.getElementById("filtroEstado")?.value || "";
  const prioridad = document.getElementById("filtroPrioridad")?.value || "";
  const categoria = document.getElementById("filtroCategoria")?.value || "";

  const filtrados = acuerdos.filter(function (acuerdo) {
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
  actualizarKPIs(acuerdos);
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
      <button class="action-btn" onclick="verAcuerdo('${acuerdo.id}')">Ver</button>
      ${soloLectura ? "" : botonesEstado(acuerdo)}
    </div>
  `;

  contenedor.appendChild(card);
}

function botonesEstado(acuerdo) {
  return `
    <button class="action-btn blue" onclick="cambiarEstado('${acuerdo.id}', 'En proceso')">En proceso</button>
    <button class="action-btn" onclick="cambiarEstado('${acuerdo.id}', 'En espera')">En espera</button>
    <button class="action-btn orange" onclick="turnarALuis('${acuerdo.id}')">Turnar</button>
    <button class="action-btn" onclick="cambiarEstado('${acuerdo.id}', 'Para revisión')">Revisión</button>
    <button class="action-btn edit" onclick="cambiarEstado('${acuerdo.id}', 'Concluido')">Concluir</button>
  `;
}

async function guardarAcuerdo() {
  const titulo = document.getElementById("titulo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const categoria = document.getElementById("categoria").value;
  const prioridad = document.getElementById("prioridad").value;
  const fechaCompromiso = document.getElementById("fechaCompromiso").value;

  if (!titulo) {
    alert("Escribe el título del acuerdo.");
    return;
  }

  const nuevoAcuerdo = {
    titulo,
    descripcion,
    categoria,
    prioridad,
    estado: "Nuevo",
    creado_por: USUARIO_ACTUAL.id,
    asignado_a: USUARIO_ACTUAL.id,
    fecha_compromiso: fechaCompromiso || null
  };

  const { error } = await db.from("acuerdos").insert(nuevoAcuerdo);

  if (error) {
    console.error("Error guardando acuerdo:", error);
    alert("No se pudo guardar el acuerdo.");
    return;
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

async function turnarALuis(id) {
  const luisId = "312705af-3fa7-4639-9518-2f3b332b0a0c";

  const { error } = await db
    .from("acuerdos")
    .update({
      asignado_a: luisId,
      turnado_por: USUARIO_ACTUAL.id,
      estado: "Turnado"
    })
    .eq("id", id);

  if (error) {
    console.error("Error turnando acuerdo:", error);
    alert("No se pudo turnar el acuerdo.");
    return;
  }

  await registrarHistorial(id, "Acuerdo turnado", "Emma turnó el acuerdo a Luis Lerma");

  if (typeof registrarAuditoria === "function") {
    registrarAuditoria("Acuerdos", "Turnó acuerdo", "Turnado a Luis Lerma");
  }

  await cargarAcuerdos();
}

async function registrarHistorial(acuerdoId, accion, detalle) {
  try {
    await db.from("acuerdos_historial").insert({
      acuerdo_id: acuerdoId,
      usuario_id: USUARIO_ACTUAL.id,
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
