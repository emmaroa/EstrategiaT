const db = window.supabaseClient;

const USUARIO_ACTUAL = {
  id: "91cd00d7-d49c-437a-b640-7020b25c53c2",
  usuario: "efigueroa",
  rol: "super_admin"
};

document.addEventListener("DOMContentLoaded", () => {
  cargarAcuerdos();

  document.getElementById("btnNuevoAcuerdo").addEventListener("click", abrirModal);
  document.getElementById("cerrarModal").addEventListener("click", cerrarModal);
  document.getElementById("guardarAcuerdo").addEventListener("click", guardarAcuerdo);
});

function abrirModal() {
  document.getElementById("modal").classList.remove("oculto");
}

function cerrarModal() {
  document.getElementById("modal").classList.add("oculto");
}

async function cargarAcuerdos() {
  const { data, error } = await db
    .from("acuerdos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error cargando acuerdos:", error);
    return;
  }

  limpiarColumnas();

  data.forEach(acuerdo => {
    pintarTarjeta(acuerdo);
  });
}

function limpiarColumnas() {
  document.querySelectorAll(".lista").forEach(lista => {
    lista.innerHTML = "";
  });
}

function pintarTarjeta(acuerdo) {
  const contenedor = document.getElementById(acuerdo.estado);

  if (!contenedor) return;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <span class="folio">${acuerdo.folio || ""}</span>
    <h3>${acuerdo.titulo}</h3>
    <p>${acuerdo.descripcion || ""}</p>
    <small>Prioridad: ${acuerdo.prioridad}</small>
    <small>Vence: ${acuerdo.fecha_compromiso || "Sin fecha"}</small>

    <div class="card-acciones">
      <button onclick="cambiarEstado('${acuerdo.id}', 'En proceso')">En proceso</button>
      <button onclick="cambiarEstado('${acuerdo.id}', 'En espera')">En espera</button>
      <button onclick="cambiarEstado('${acuerdo.id}', 'Para revisión')">Para revisión</button>
      <button onclick="cambiarEstado('${acuerdo.id}', 'Concluido')">Concluir</button>
    </div>
  `;

  contenedor.appendChild(card);
}

async function guardarAcuerdo() {
  const titulo = document.getElementById("titulo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const categoria = document.getElementById("categoria").value;
  const prioridad = document.getElementById("prioridad").value;
  const fechaCompromiso = document.getElementById("fechaCompromiso").value;

  if (!titulo) {
    alert("Escribe el título del acuerdo");
    return;
  }

  const { error } = await db.from("acuerdos").insert({
    titulo,
    descripcion,
    categoria,
    prioridad,
    estado: "Nuevo",
    creado_por: USUARIO_ACTUAL.id,
    asignado_a: USUARIO_ACTUAL.id,
    fecha_compromiso: fechaCompromiso || null
  });

  if (error) {
    console.error("Error guardando acuerdo:", error);
    alert("No se pudo guardar el acuerdo");
    return;
  }

  cerrarModal();
  limpiarFormulario();
  cargarAcuerdos();
}

function limpiarFormulario() {
  document.getElementById("titulo").value = "";
  document.getElementById("descripcion").value = "";
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
    alert("No se pudo cambiar el estado");
    return;
  }

  await db.from("acuerdos_historial").insert({
    acuerdo_id: id,
    usuario_id: USUARIO_ACTUAL.id,
    accion: "Cambio de estado",
    detalle: `Estado cambiado a ${estado}`
  });

  cargarAcuerdos();
}