const calendarioDb = window.supabaseClient || window.supabase?.client || window.SupabaseClient;
let eventosCalendario = [];
let ticketsCalendario = [];
let usuariosCalendario = [];
let destinatariosEventoSeleccionados = new Set();
let fechaVisible = new Date();
let fechaSeleccionada = new Date();
let eventoEditandoId = null;
let eventoDetalleId = null;

document.addEventListener("DOMContentLoaded", function () {
  if (typeof validarPermiso === "function") validarPermiso("Calendario");
  if (window.ETLayout) ETLayout.inicializar("Calendario");
  const fechaParametro = new URLSearchParams(location.search).get("fecha");
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaParametro || "")) {
    fechaVisible = fechaLocal(fechaParametro);
    fechaSeleccionada = fechaLocal(fechaParametro);
  }
  enlazarCalendario();
  cargarCalendario();
});

function enlazarCalendario() {
  document.getElementById("cerrarDetalleEvento").addEventListener("click", cerrarDetalleEvento);
  document.getElementById("editarDetalleEvento").addEventListener("click", function () {
    const evento = eventosCalendario.find(e => e.id === eventoDetalleId);
    if (!puedeEditarEvento(evento)) return;
    cerrarDetalleEvento();
    abrirEvento(evento);
  });
  document.getElementById("modalDetalleEvento").addEventListener("click", function (e) { if (e.target.id === "modalDetalleEvento") cerrarDetalleEvento(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.getElementById("modalDetalleEvento").classList.contains("show")) cerrarDetalleEvento();
    else if (document.getElementById("modalEvento").classList.contains("show")) cerrarEvento();
  });
  document.getElementById("mesAnterior")?.addEventListener("click", function () { fechaVisible.setMonth(fechaVisible.getMonth() - 1); renderizarCalendario(); });
  document.getElementById("mesSiguiente")?.addEventListener("click", function () { fechaVisible.setMonth(fechaVisible.getMonth() + 1); renderizarCalendario(); });
  document.getElementById("hoyCalendario")?.addEventListener("click", function () { fechaVisible = new Date(); fechaSeleccionada = new Date(); renderizarCalendario(); });
  document.getElementById("btnNuevoEvento")?.addEventListener("click", function () { abrirEvento(); });
  document.getElementById("cerrarEvento")?.addEventListener("click", cerrarEvento);
  document.getElementById("cancelarEvento")?.addEventListener("click", cerrarEvento);
  document.getElementById("guardarEvento")?.addEventListener("click", guardarEvento);
  document.getElementById("eliminarEvento")?.addEventListener("click", eliminarEvento);
  document.getElementById("buscarCalendario")?.addEventListener("input", renderizarCalendario);
  document.getElementById("filtroTipoCalendario")?.addEventListener("change", renderizarCalendario);
  document.getElementById("eventoAlcance")?.addEventListener("change", actualizarDestinatariosEvento);
  document.getElementById("buscarDestinatarioEvento")?.addEventListener("input", poblarDestinatariosEvento);
  document.getElementById("modalEvento")?.addEventListener("click", function (e) { if (e.target.id === "modalEvento") cerrarEvento(); });
}

function usuarioCalendario() {
  try { return JSON.parse(localStorage.getItem("usuarioActivo") || "null"); } catch (_) { return null; }
}

async function cargarCalendario() {
  if (!calendarioDb?.from) return;
  const usuario = usuarioCalendario();
  const [eventos, tickets, usuarios] = await Promise.all([
    calendarioDb.from("eventos_calendario").select("*").order("fecha_inicio", { ascending: true }),
    calendarioDb.from("acuerdos").select("id,folio,titulo,descripcion,prioridad,estado,fecha_compromiso,asignado_a,creado_por").not("fecha_compromiso", "is", null),
    calendarioDb.from("usuarios").select("id,nombre,usuario,rol,activo").eq("activo",true).neq("rol","Proveedor").order("nombre",{ascending:true})
  ]);
  if (eventos.error || tickets.error || usuarios.error) {
    console.error("No se pudo cargar el calendario:", eventos.error || tickets.error || usuarios.error);
    alert("No se pudo cargar el calendario. Verifica que la migración esté aplicada.");
    return;
  }
  eventosCalendario = (eventos.data || []).filter(function (evento) {
    return evento.alcance === "Todos" || evento.creado_por === usuario?.id || (evento.alcance === "Seleccionados" && (evento.destinatarios || []).includes(usuario?.id));
  });
  usuariosCalendario = (usuarios.data || []).filter(function(u){return normalizar(u.rol)!=="proveedor"});
  poblarDestinatariosEvento();
  ticketsCalendario = (tickets.data || []).filter(function (ticket) {
    return ticket.estado !== "Concluido" && (ticket.asignado_a === usuario?.id || ticket.creado_por === usuario?.id || puedeVerTodosTickets(usuario));
  });
  renderizarCalendario();
}

function puedeVerTodosTickets(usuario) {
  const rol = normalizar(usuario?.rol);
  return ["superadmin", "super admin", "super_admin", "admin", "administrador del sistema", "jefe", "director", "moderador de acuerdos"].includes(rol);
}

function normalizar(valor) { return String(valor || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function fechaLocal(valor) { const p = String(valor).slice(0, 10).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function claveFecha(fecha) { return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, "0"), String(fecha.getDate()).padStart(2, "0")].join("-"); }
function claveActividad(item) { return item.tipo === "Ticket" ? String(item.inicio).slice(0,10) : claveFecha(new Date(item.inicio)); }
function valorFechaHoraLocal(valor) { const fecha = new Date(valor); return claveFecha(fecha) + "T" + String(fecha.getHours()).padStart(2,"0") + ":" + String(fecha.getMinutes()).padStart(2,"0"); }
function escapar(valor) { return String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function poblarDestinatariosEvento(){const contenedor=document.getElementById("eventoDestinatarios");if(!contenedor)return;const propio=usuarioCalendario()?.id,texto=normalizar(document.getElementById("buscarDestinatarioEvento")?.value);const visibles=usuariosCalendario.filter(u=>u.id!==propio&&normalizar([u.nombre,u.usuario,u.rol].join(" ")).includes(texto));contenedor.innerHTML=visibles.length?visibles.map(u=>`<label class="destinatario-opcion"><input type="checkbox" value="${escapar(u.id)}"${destinatariosEventoSeleccionados.has(u.id)?" checked":""}><span><strong>${escapar(u.nombre||u.usuario)}</strong><small>${escapar(u.usuario||"")} · ${escapar(u.rol||"Usuario")}</small></span></label>`).join(""):'<div class="agenda-vacia">No se encontraron usuarios.</div>';contenedor.querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener("change",()=>{if(input.checked)destinatariosEventoSeleccionados.add(input.value);else destinatariosEventoSeleccionados.delete(input.value);actualizarResumenDestinatarios()}));actualizarResumenDestinatarios()}
function actualizarResumenDestinatarios(){const total=destinatariosEventoSeleccionados.size;document.getElementById("resumenDestinatariosEvento").textContent=total?total+" usuario"+(total===1?" seleccionado":"s seleccionados"):"Busca y marca una o varias personas."}
function actualizarDestinatariosEvento(){const elegidos=document.getElementById("eventoAlcance")?.value==="Seleccionados";document.getElementById("grupoDestinatariosEvento").hidden=!elegidos;if(elegidos)poblarDestinatariosEvento()}
function destinatariosSeleccionados(){return Array.from(destinatariosEventoSeleccionados)}

function actividadesFiltradas() {
  const texto = normalizar(document.getElementById("buscarCalendario")?.value);
  const tipo = document.getElementById("filtroTipoCalendario")?.value || "";
  const eventos = eventosCalendario.map(function (evento) {
    return { id:evento.id, tipo:evento.tipo, titulo:evento.titulo, descripcion:evento.descripcion, ubicacion:evento.ubicacion, inicio:evento.fecha_inicio, fin:evento.fecha_fin, color:evento.color||"#07b1bc", editable:evento.creado_por===usuarioCalendario()?.id, original:evento };
  });
  const tickets = ticketsCalendario.map(function (ticket) {
    return { id:ticket.id, tipo:"Ticket", titulo:(ticket.folio ? ticket.folio + " · " : "") + ticket.titulo, descripcion:ticket.descripcion, inicio:ticket.fecha_compromiso + "T23:59:00", editable:false, original:ticket };
  });
  return eventos.concat(tickets).filter(function (item) {
    return (!tipo || item.tipo === tipo) && (!texto || normalizar([item.titulo,item.descripcion,item.ubicacion,item.tipo].join(" ")).includes(texto));
  }).sort(function (a,b) { return new Date(a.inicio) - new Date(b.inicio); });
}

function renderizarCalendario() {
  const grid = document.getElementById("calendarioGrid");
  if (!grid) return;
  document.getElementById("tituloMes").textContent = fechaVisible.toLocaleDateString("es-MX", { month:"long", year:"numeric" });
  const primero = new Date(fechaVisible.getFullYear(), fechaVisible.getMonth(), 1);
  const inicio = new Date(primero); inicio.setDate(primero.getDate() - ((primero.getDay() + 6) % 7));
  const actividades = actividadesFiltradas();
  const hoy = claveFecha(new Date());
  const seleccion = claveFecha(fechaSeleccionada);
  grid.innerHTML = "";
  for (let i=0; i<42; i+=1) {
    const fecha = new Date(inicio); fecha.setDate(inicio.getDate() + i);
    const clave = claveFecha(fecha);
    const dia = document.createElement("div");
    dia.className = "calendario-dia" + (fecha.getMonth() !== fechaVisible.getMonth() ? " otro-mes" : "") + (clave === hoy ? " es-hoy" : "") + (clave === seleccion ? " seleccionado" : "");
    dia.innerHTML = '<button type="button" class="numero-dia evento-chip" data-fecha="' + clave + '">' + fecha.getDate() + "</button>";
    dia.addEventListener("click", function () { fechaSeleccionada = fechaLocal(clave); renderizarCalendario(); });
    dia.querySelector(".numero-dia").addEventListener("click", function (e) { e.stopPropagation(); fechaSeleccionada = fechaLocal(clave); renderizarCalendario(); });
    actividades.filter(a => claveActividad(a) === clave).slice(0,4).forEach(function (item) {
      const boton = document.createElement("button");
      boton.className = "evento-chip " + normalizar(item.tipo).replace(/ó/g,"o") + (esVencido(item) ? " vencido" : "");
      boton.textContent = horaActividad(item) + item.titulo;
      boton.title = item.titulo;
      if(item.tipo!=="Ticket"){boton.style.backgroundColor=(item.color||"#07b1bc")+"22";boton.style.borderLeft="4px solid "+(item.color||"#07b1bc")}
      boton.addEventListener("click", function (e) { e.stopPropagation(); fechaSeleccionada=fechaLocal(claveActividad(item));renderizarCalendario();abrirActividad(item); });
      dia.appendChild(boton);
    });
    grid.appendChild(dia);
  }
  renderizarAgenda(actividades);
  actualizarKpis(actividades);
}

function horaActividad(item) { return item.tipo === "Ticket" ? "" : new Date(item.inicio).toLocaleTimeString("es-MX", {hour:"2-digit",minute:"2-digit"}) + " "; }
function esVencido(item) { return item.tipo === "Ticket" && claveActividad(item) < claveFecha(new Date()); }

function renderizarAgenda(actividades) {
  const clave = claveFecha(fechaSeleccionada);
  document.getElementById("tituloAgenda").textContent = "Agenda · " + fechaSeleccionada.toLocaleDateString("es-MX", {day:"numeric",month:"short"});
  const lista = document.getElementById("listaAgenda");
  const dia = actividades.filter(a => claveActividad(a) === clave);
  lista.innerHTML = dia.length ? "" : '<div class="agenda-vacia">No hay actividades este día.</div>';
  dia.forEach(function (item) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "agenda-item " + normalizar(item.tipo) + (esVencido(item) ? " vencido" : "");
    if(item.tipo!=="Ticket")tarjeta.style.borderLeftColor=item.color||"#07b1bc";
    const horario=item.tipo==="Ticket"?"Fecha límite del ticket":formatearRangoEvento(item.inicio,item.fin);
    tarjeta.innerHTML = "<strong>" + escapar(item.titulo) + "</strong><small>" + escapar(item.tipo + " · " + horario) + "</small>" + (item.ubicacion ? '<p class="agenda-detalle"><b>Ubicación:</b> '+escapar(item.ubicacion)+"</p>" : "") + (item.descripcion?'<p class="agenda-detalle">'+escapar(item.descripcion)+"</p>":'<p class="agenda-detalle agenda-sin-detalle">Sin descripción.</p>') + '<div class="agenda-acciones"></div>';
    const acciones = tarjeta.querySelector(".agenda-acciones");
    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "btn-secondary";
    abrir.textContent = item.tipo === "Ticket" ? "Abrir ticket" : "Ver detalle";
    abrir.addEventListener("click", function (e) { e.stopPropagation(); abrirActividad(item); });
    acciones.appendChild(abrir);
    tarjeta.addEventListener("click", function () { abrirActividad(item); });
    lista.appendChild(tarjeta);
  });
}

function actualizarKpis(actividades) {
  const hoy = claveFecha(new Date()); const limite = new Date(); limite.setDate(limite.getDate()+7);
  document.getElementById("kpiHoy").textContent = actividades.filter(a => claveActividad(a) === hoy).length;
  document.getElementById("kpiSemana").textContent = actividades.filter(a => { const f=fechaLocal(claveActividad(a)); return f>=fechaLocal(hoy) && f<=limite; }).length;
  document.getElementById("kpiVencidos").textContent = actividades.filter(esVencido).length;
}
function formatearRangoEvento(inicio,fin){const a=new Date(inicio),b=new Date(fin);return a.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})+" a "+b.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}

function abrirActividad(item) {
  if (item.tipo === "Ticket") { location.href = "acuerdos.html?buscar=" + encodeURIComponent(item.original.folio || item.original.titulo); return; }
  abrirDetalleEvento(item.original);
}

function puedeEditarEvento(evento) {
  const usuario = usuarioCalendario();
  return Boolean(usuario?.id && evento?.creado_por === usuario.id && !(typeof esSoloLectura === "function" && esSoloLectura()));
}

function abrirDetalleEvento(evento) {
  if (!evento) return;
  eventoDetalleId = evento.id;
  document.getElementById("tituloDetalleEvento").textContent = evento.titulo;
  document.getElementById("tipoDetalleEvento").textContent = evento.tipo;
  document.getElementById("descripcionDetalleEvento").textContent = evento.descripcion || "Sin descripción.";
  const formato = { dateStyle: "long", timeStyle: "short" };
  document.getElementById("fechaDetalleEvento").textContent = new Date(evento.fecha_inicio).toLocaleString("es-MX", formato) + " — " + new Date(evento.fecha_fin).toLocaleString("es-MX", formato);
  document.getElementById("ubicacionDetalleEvento").textContent = evento.ubicacion || "Sin ubicación.";
  document.getElementById("creadorDetalleEvento").textContent = evento.creado_por_nombre || "Sin información del creador.";
  document.getElementById("editarDetalleEvento").hidden = !puedeEditarEvento(evento);
  const modal = document.getElementById("modalDetalleEvento");
  modal.style.setProperty("--evento-color", /^#[0-9a-f]{6}$/i.test(evento.color || "") ? evento.color : "#07b1bc");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("cerrarDetalleEvento").focus();
}

function cerrarDetalleEvento() {
  eventoDetalleId = null;
  const modal = document.getElementById("modalDetalleEvento");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function abrirEvento(evento) {
  if (!usuarioCalendario()?.id || (evento && !puedeEditarEvento(evento))) return;
  if (typeof esSoloLectura === "function" && esSoloLectura()) return;
  eventoEditandoId = evento?.id || null;
  const base = claveFecha(fechaSeleccionada);
  document.getElementById("tituloModalEvento").textContent = evento ? "Editar evento" : "Nuevo evento";
  document.getElementById("eventoTitulo").value = evento?.titulo || "";
  document.getElementById("eventoTipo").value = evento?.tipo || "Reunión";
  document.getElementById("eventoAlcance").value = evento?.alcance || "Todos";
  document.getElementById("eventoColor").value = /^#[0-9a-f]{6}$/i.test(evento?.color||"") ? evento.color : "#07b1bc";
  destinatariosEventoSeleccionados=new Set(evento?.destinatarios||[]);document.getElementById("buscarDestinatarioEvento").value="";actualizarDestinatariosEvento();
  document.getElementById("eventoInicio").value = evento ? valorFechaHoraLocal(evento.fecha_inicio) : base + "T09:00";
  document.getElementById("eventoFin").value = evento ? valorFechaHoraLocal(evento.fecha_fin) : base + "T10:00";
  document.getElementById("eventoUbicacion").value = evento?.ubicacion || "";
  document.getElementById("eventoDescripcion").value = evento?.descripcion || "";
  document.getElementById("eliminarEvento").hidden = !evento;
  document.getElementById("modalEvento").classList.add("show");
  document.getElementById("modalEvento").setAttribute("aria-hidden","false");
  document.getElementById("eventoTitulo").focus();
}

function cerrarEvento() { eventoEditandoId=null; document.getElementById("modalEvento").classList.remove("show"); document.getElementById("modalEvento").setAttribute("aria-hidden","true"); }

async function guardarEvento() {
  const usuario = usuarioCalendario();
  if (!usuario?.id || (typeof esSoloLectura === "function" && esSoloLectura())) return;
  if (eventoEditandoId && !puedeEditarEvento(eventosCalendario.find(e => e.id === eventoEditandoId))) return;
  const datos = { titulo:document.getElementById("eventoTitulo").value.trim(), tipo:document.getElementById("eventoTipo").value, alcance:document.getElementById("eventoAlcance").value, destinatarios:document.getElementById("eventoAlcance").value==="Seleccionados"?destinatariosSeleccionados():[], color:document.getElementById("eventoColor").value, fecha_inicio:document.getElementById("eventoInicio").value, fecha_fin:document.getElementById("eventoFin").value, ubicacion:document.getElementById("eventoUbicacion").value.trim() || null, descripcion:document.getElementById("eventoDescripcion").value.trim() || null, actualizado_en:new Date().toISOString() };
  if (!datos.titulo || !datos.fecha_inicio || !datos.fecha_fin) { alert("Completa el título, inicio y fin."); return; }
  if (datos.alcance==="Seleccionados"&&!datos.destinatarios.length) { alert("Selecciona al menos un usuario para compartir el evento."); return; }
  if (new Date(datos.fecha_fin) < new Date(datos.fecha_inicio)) { alert("La fecha de fin no puede ser anterior al inicio."); return; }
  let resultado;
  if (eventoEditandoId) resultado = await calendarioDb.from("eventos_calendario").update(datos).eq("id",eventoEditandoId).eq("creado_por",usuario.id);
  else resultado = await calendarioDb.from("eventos_calendario").insert(Object.assign(datos,{creado_por:usuario.id,creado_por_nombre:usuario.nombre || usuario.usuario || "Usuario"}));
  if (resultado.error) { alert("No se pudo guardar el evento. " + resultado.error.message); return; }
  cerrarEvento(); await cargarCalendario();
}

async function eliminarEvento() {
  if (!puedeEditarEvento(eventosCalendario.find(e => e.id === eventoEditandoId))) return;
  if (!eventoEditandoId || !confirm("¿Eliminar este evento del calendario?")) return;
  const resultado = await calendarioDb.from("eventos_calendario").delete().eq("id",eventoEditandoId).eq("creado_por",usuarioCalendario().id);
  if (resultado.error) { alert("No se pudo eliminar el evento."); return; }
  cerrarEvento(); await cargarCalendario();
}
