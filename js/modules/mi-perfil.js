(function () {
  const KPIS = [
    ["kpiCostoAnual", "Costo anual", "Gasto acumulado del año"],
    ["kpiCostoMensual", "Costo mensual", "Gasto del mes actual"],
    ["kpiDashboardCotizacionesSinRequisicion", "Cotizaciones pendientes", "Sin requisición vinculada"],
    ["kpiDashboardMontoSinRequisicion", "Monto sin requisición", "Importe pendiente de vincular"],
    ["kpiPeticiones", "Peticiones pendientes", "Solicitudes por atender"],
    ["kpiPeticionesPendienteProveedor", "Pendientes de proveedor", "Peticiones sin asignación"],
    ["kpiAcuerdosPendientes", "Tickets abiertos", "Trabajos por terminar"],
    ["kpiAcuerdosRevision", "Tickets en revisión", "Pendientes de validar"],
    ["kpiRequisiciones", "Requisiciones activas", "Seguimiento administrativo"],
    ["kpiRequisicionesAutorizar", "Por autorizar", "Requisiciones pendientes"],
    ["kpiRequisicionesXml", "Con XML", "Requisiciones documentadas"],
    ["kpiValesEmitidos", "Vales", "Emitidos o activos"],
    ["kpiCumpleanosHoy", "Cumpleaños", "Personal que cumple años hoy"],
    ["kpiAusentesHoy", "Ausencias", "Personal ausente hoy"]
  ];
  let usuario;

  function leerUsuario() {
    try { return JSON.parse(localStorage.getItem("usuarioActivo") || "null"); } catch (_) { return null; }
  }

  function renderKpis() {
    const seleccion = Array.isArray(usuario.dashboard_kpis) && usuario.dashboard_kpis.length
      ? usuario.dashboard_kpis : KPIS.map(function (kpi) { return kpi[0]; });
    document.getElementById("listaKpis").innerHTML = KPIS.map(function (kpi) {
      return '<label class="profile-kpi-option"><input type="checkbox" value="' + kpi[0] + '" ' +
        (seleccion.includes(kpi[0]) ? "checked" : "") + '><span><strong>' + kpi[1] +
        '</strong><small>' + kpi[2] + "</small></span></label>";
    }).join("");
  }

  function guardarPreferencias() {
    const kpis = Array.from(document.querySelectorAll('#listaKpis input:checked')).map(function (input) { return input.value; });
    if (!kpis.length) return ETLayout.toast("Selecciona por lo menos un indicador.", "warning");
    usuario.dashboard_kpis = kpis;
    localStorage.setItem("etDashboardKpis_" + usuario.id, JSON.stringify(kpis));
    localStorage.setItem("usuarioActivo", JSON.stringify(usuario));
    ETLayout.toast("Preferencias guardadas en este dispositivo.", "success");
  }

  async function cambiarPassword(event) {
    event.preventDefault();
    const nueva = document.getElementById("nuevaPassword").value;
    const confirmar = document.getElementById("confirmarPassword").value;
    if (nueva.length < 8) return ETLayout.toast("Usa por lo menos 8 caracteres.", "warning");
    if (nueva !== confirmar) return ETLayout.toast("Las contraseñas no coinciden.", "warning");
    const resultado = await supabaseClient.from("usuarios").update({ password: nueva }).eq("id", usuario.id);
    if (resultado.error) return ETLayout.toast("No fue posible actualizar la contraseña.", "error");
    event.target.reset();
    ETLayout.toast("Contraseña actualizada.", "success");
  }

  usuario = leerUsuario();
  if (!usuario) { location.replace("../index.html"); return; }
  ETLayout.inicializar("Dashboard");
  renderKpis();
  document.getElementById("seleccionarTodosKpis").addEventListener("click", function () {
    document.querySelectorAll('#listaKpis input[type="checkbox"]').forEach(function (input) { input.checked = true; });
  });
  document.getElementById("guardarPreferencias").addEventListener("click", guardarPreferencias);
  document.getElementById("passwordForm").addEventListener("submit", cambiarPassword);
})();
