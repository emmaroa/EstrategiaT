(function () {
  let empleadosAgregados = [];
let periodoActual = null;
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", function () {
    configurarTabs();
    configurarHoras();
    configurarBotones();
    actualizarResumen();
  });

  function configurarTabs() {
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tab = btn.dataset.tab;

        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        $("tab-" + tab).classList.add("active");

        actualizarResumenDocumentos();
      });
    });
  }

  function configurarHoras() {
    document.querySelectorAll(".hora-dia").forEach(function (input) {
      input.addEventListener("input", calcularTotalEmpleado);
    });
  }

  function configurarBotones() {
    $("btnAgregarEmpleado")?.addEventListener("click", agregarEmpleado);
    $("btnVistaPrevia")?.addEventListener("click", vistaPrevia);
    $("btnGenerarPDF")?.addEventListener("click", generarPDF);
    $("btnGuardarPeriodo")?.addEventListener("click", guardarPeriodoTemporal);
    $("btnBuscarHistorial")?.addEventListener("click", buscarHistorial);

    $("numEmpleado")?.addEventListener("blur", buscarEmpleado);
    $("numEmpleado")?.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        buscarEmpleado();
      }
    });
  }

  function calcularTotalEmpleado() {
    let total = 0;

    document.querySelectorAll(".hora-dia").forEach(function (input) {
      total += Number(input.value || 0);
    });

    $("totalHorasEmpleado").textContent = total;
    return total;
  }

  function obtenerDetalleDias() {
    const filas = document.querySelectorAll("#tablaDias tr");

    return Array.from(filas).map(function (fila) {
      const celdas = fila.querySelectorAll("td");
      const inputs = fila.querySelectorAll("input");

      return {
        dia: celdas[0]?.textContent || "",
        fecha: inputs[0]?.value || "",
        entrada: inputs[1]?.value || "",
        salida: inputs[2]?.value || "",
        horas: Number(inputs[3]?.value || 0)
      };
    }).filter(function (item) {
      return item.horas > 0 || item.fecha || item.entrada || item.salida;
    });
  }

  async function buscarEmpleado() {
  const num = $("numEmpleado").value.trim();

  if (!num) return;

  limpiarDatosEmpleado();

  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("*")
      .eq("num_empleado", num)
      .eq("activo", true)
      .single();

    if (error || !data) {
      alert("No se encontró el empleado.");
      return;
    }

    $("nombreEmpleado").value = data.nombre_completo || data.nombre || "";
    $("direccionEmpleado").value = data.direccion || "";
    $("departamentoEmpleado").value = data.departamento || "";
    $("puestoEmpleado").value = data.puesto || "";

  } catch (err) {
    console.error("Error al buscar empleado:", err);
    alert("Ocurrió un error al buscar el empleado.");
  }
}

function limpiarDatosEmpleado() {
  $("nombreEmpleado").value = "";
  $("direccionEmpleado").value = "";
  $("departamentoEmpleado").value = "";
  $("puestoEmpleado").value = "";
}
  

  function agregarEmpleado() {
    const numEmpleado = $("numEmpleado").value.trim();
    const nombre = $("nombreEmpleado").value.trim();
    const direccion = $("direccionEmpleado").value.trim();
    const departamento = $("departamentoEmpleado").value.trim();
    const puesto = $("puestoEmpleado").value.trim();
    const actividad = $("actividadEmpleado").value.trim();
    const totalHoras = calcularTotalEmpleado();
    const detalleDias = obtenerDetalleDias();

    if (!numEmpleado) {
      alert("Ingresa el número de empleado.");
      return;
    }

    if (totalHoras <= 0) {
      alert("Captura al menos una hora extra.");
      return;
    }

    empleadosAgregados.push({
      numEmpleado,
      nombre,
      direccion,
      departamento,
      puesto,
      actividad,
      totalHoras,
      detalleDias
    });

    renderTablaEmpleados();
    limpiarCapturaEmpleado();
    actualizarResumen();
    actualizarResumenDocumentos();
  }

  function renderTablaEmpleados() {
    const tbody = $("tablaTiempoExtra");

    if (!empleadosAgregados.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin empleados agregados.</td></tr>';
      return;
    }

    tbody.innerHTML = empleadosAgregados.map(function (emp, index) {
      return `
        <tr>
          <td>${emp.numEmpleado}</td>
          <td>${emp.nombre || "Sin nombre"}</td>
          <td>${emp.departamento || "-"}</td>
          <td>${emp.puesto || "-"}</td>
          <td>${emp.totalHoras}</td>
          <td>${emp.actividad || "-"}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="TiempoExtra.eliminarEmpleado(${index})">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function eliminarEmpleado(index) {
    empleadosAgregados.splice(index, 1);
    renderTablaEmpleados();
    actualizarResumen();
    actualizarResumenDocumentos();
  }

  function limpiarCapturaEmpleado() {
    $("numEmpleado").value = "";
    $("nombreEmpleado").value = "";
    $("direccionEmpleado").value = "";
    $("departamentoEmpleado").value = "";
    $("puestoEmpleado").value = "";
    $("actividadEmpleado").value = "";

    document.querySelectorAll("#tablaDias input").forEach(function (input) {
      input.value = "";
    });

    $("totalHorasEmpleado").textContent = "0";
  }

  function actualizarResumen() {
    const totalEmpleados = empleadosAgregados.length;
    const totalHoras = empleadosAgregados.reduce(function (sum, emp) {
      return sum + Number(emp.totalHoras || 0);
    }, 0);

    $("resumenPeriodo").textContent = `${totalEmpleados} empleados | ${totalHoras} horas`;
  }

  function actualizarResumenDocumentos() {
    const inicio = $("periodoInicio")?.value || "";
    const fin = $("periodoFin")?.value || "";
    const oficio = $("numeroOficio")?.value || "";

    const totalEmpleados = empleadosAgregados.length;
    const totalHoras = empleadosAgregados.reduce(function (sum, emp) {
      return sum + Number(emp.totalHoras || 0);
    }, 0);

    $("docPeriodo").textContent = inicio && fin ? `${inicio} al ${fin}` : "Sin periodo";
    $("docOficio").textContent = oficio || "Sin oficio";
    $("docEmpleados").textContent = totalEmpleados;
    $("docHoras").textContent = totalHoras;
  }

  async function guardarPeriodoTemporal() {
  const inicio = $("periodoInicio").value;
  const fin = $("periodoFin").value;
  const numeroOficio = $("numeroOficio").value.trim();
  const fechaOficio = $("fechaOficio").value;
  const adscripcion = $("adscripcion").value.trim();
  const destinatario = $("dirigidoA").value.trim();

  if (!inicio || !fin) {
    alert("Captura el periodo de inicio y fin.");
    return;
  }

  const semana = obtenerSemanaISO(inicio);
  const anio = new Date(inicio + "T00:00:00").getFullYear();

  try {
    const { data, error } = await supabase
      .from("periodos_tiempo_extra")
      .insert({
        fecha_inicio: inicio,
        fecha_fin: fin,
        semana: semana,
        anio: anio,
        numero_oficio: numeroOficio,
        fecha_oficio: fechaOficio || null,
        adscripcion: adscripcion,
        destinatario: destinatario,
        estatus: "borrador"
      })
      .select()
      .single();

    if (error) throw error;

    periodoActual = data;

    llenarFechasSemana(inicio, fin);
    actualizarResumenDocumentos();

    alert("Periodo guardado correctamente.");

    cambiarTab("captura");

  } catch (err) {
    console.error("Error al guardar periodo:", err);
    alert("No se pudo guardar el periodo.");
  }
}

function obtenerSemanaISO(fechaTexto) {
  const fecha = new Date(fechaTexto + "T00:00:00");
  const temp = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = temp.getUTCDay() || 7;

  temp.setUTCDate(temp.getUTCDate() + 4 - dia);

  const inicioAnio = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil((((temp - inicioAnio) / 86400000) + 1) / 7);
}

function llenarFechasSemana(inicio, fin) {
  const fechaInicio = new Date(inicio + "T00:00:00");
  const fechaFin = new Date(fin + "T00:00:00");
  const filas = document.querySelectorAll("#tablaDias tr");

  let fechaActual = new Date(fechaInicio);

  filas.forEach(function (fila) {
    const inputs = fila.querySelectorAll("input");
    if (!inputs.length) return;

    if (fechaActual <= fechaFin) {
      inputs[0].value = fechaActual.toISOString().split("T")[0];
      fechaActual.setDate(fechaActual.getDate() + 1);
    } else {
      inputs[0].value = "";
    }
  });
}

function cambiarTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.classList.remove("active");
  });

  document.querySelectorAll(".tab-panel").forEach(function (panel) {
    panel.classList.remove("active");
  });

  const btnActivo = document.querySelector(`[data-tab="${tab}"]`);
  const panelActivo = $("tab-" + tab);

  if (btnActivo) btnActivo.classList.add("active");
  if (panelActivo) panelActivo.classList.add("active");
}

  function vistaPrevia() {
    actualizarResumenDocumentos();
    alert("Aquí irá la vista previa del paquete: generadores, resumen y oficio.");
  }

  function generarPDF() {
    if (!empleadosAgregados.length) {
      alert("Agrega al menos un empleado antes de generar el PDF.");
      return;
    }

    alert("Aquí generaremos el PDF completo.");
  }

  function buscarHistorial() {
    alert("Aquí consultaremos reportes históricos desde Supabase.");
  }

  window.TiempoExtra = {
    eliminarEmpleado
  };
})();