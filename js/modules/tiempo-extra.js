(function () {
  let empleadosAgregados = [];
let periodoActual = null;
  const $ = (id) => document.getElementById(id);

  function getSupabaseClient() {
    if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
      return window.supabaseClient;
    }

    if (window.supabase && typeof window.supabaseClient.from === "function") {
      return window.supabase;
    }

    return null;
  }

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

  const client = getSupabaseClient();
  if (!client) {
    alert("No se pudo conectar con Supabase.");
    return;
  }

  try {
    const { data, error } = await client
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

async function cargarArchivoComoArrayBuffer(ruta) {
  const res = await fetch(ruta);

  if (!res.ok) {
    throw new Error("No se pudo cargar la plantilla: " + ruta);
  }

  return await res.arrayBuffer();
}

function obtenerPeriodoTexto() {
  const inicio = periodoInicio.value;
  const fin = periodoFin.value;

  if (!inicio || !fin) return "SIN PERIODO";

  return `${formatearFechaLarga(inicio)} AL ${formatearFechaLarga(fin)}`;
}

function formatearFechaLarga(fechaISO) {
  const fecha = new Date(fechaISO + "T00:00:00");

  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).toUpperCase();
}

function obtenerMesPeriodo() {
  if (!periodoInicio.value) return "";

  const fecha = new Date(periodoInicio.value + "T00:00:00");

  return fecha.toLocaleDateString("es-MX", {
    month: "long"
  }).toUpperCase();
}

function obtenerAnioPeriodo() {
  if (!periodoInicio.value) return "";

  return new Date(periodoInicio.value + "T00:00:00").getFullYear();
}

function descargarArchivo(buffer, nombre, tipo) {
  const blob = new Blob([buffer], { type: tipo });
  saveAs(blob, nombre);
}

async function generarGeneradorIndividual(empleado) {
  const buffer = await cargarArchivoComoArrayBuffer("../templates/GENERADOR_DE_TIEMPO_XTRA.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];

  sheet.name = empleado.nombre.substring(0, 31);

  const inicio = new Date(periodoInicio.value + "T00:00:00");
  const fin = new Date(periodoFin.value + "T00:00:00");

  sheet.getCell("C2").value = inicio.getDate();
  sheet.getCell("F2").value = fin.getDate();
  sheet.getCell("H2").value = obtenerMesPeriodo();
  sheet.getCell("J2").value = obtenerAnioPeriodo();

  sheet.getCell("C4").value = empleado.direccion || "DIRECCION DE TALLERES";
  sheet.getCell("C5").value = empleado.departamento || "";
  sheet.getCell("C6").value = empleado.nombre || "";
  sheet.getCell("C7").value = empleado.numero || "";
  sheet.getCell("G7").value = empleado.puesto || "";

  const dias = empleado.dias || [];

  for (let i = 0; i < 7; i++) {
    const fila = 11 + i;
    const dia = dias[i];

    if (!dia) {
      sheet.getCell(`B${fila}`).value = "";
      sheet.getCell(`C${fila}`).value = "";
      sheet.getCell(`D${fila}`).value = "";
      sheet.getCell(`E${fila}`).value = "";
      sheet.getCell(`F${fila}`).value = "";
      continue;
    }

    sheet.getCell(`B${fila}`).value = dia.dia || "";
    sheet.getCell(`C${fila}`).value = dia.entrada || "";
    sheet.getCell(`D${fila}`).value = dia.salida || "";
    sheet.getCell(`E${fila}`).value = Number(dia.horas || 0);
    sheet.getCell(`F${fila}`).value = dia.actividad || empleado.actividad || "";
  }

  sheet.getCell("E18").value = Number(empleado.totalHoras || 0);

  const salida = await workbook.xlsx.writeBuffer();

  descargarArchivo(
    salida,
    `Generador_${empleado.numero}_${empleado.nombre}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

async function generarRelacionSemanal() {
  if (!empleadosAgregados.length) {
    alert("Agrega empleados antes de generar la relación semanal.");
    return;
  }

  const buffer = await cargarArchivoComoArrayBuffer("../templates/RELACION_SEMANAL_TIEMPO_EXTRA.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet("relacion semanal") || workbook.worksheets[0];

  const totalHoras = empleadosAgregados.reduce((sum, emp) => {
    return sum + Number(emp.totalHoras || 0);
  }, 0);

  sheet.getCell("D7").value = obtenerPeriodoTexto();
  sheet.getCell("C8").value = empleadosAgregados.length;
  sheet.getCell("C9").value = totalHoras;

  for (let i = 0; i < 19; i++) {
    const fila = 12 + i;

    sheet.getCell(`B${fila}`).value = "";
    sheet.getCell(`C${fila}`).value = "";
    sheet.getCell(`D${fila}`).value = "";
    sheet.getCell(`E${fila}`).value = "";
  }

  empleadosAgregados.forEach((emp, index) => {
    const fila = 12 + index;

    sheet.getCell(`B${fila}`).value = emp.numero || "";
    sheet.getCell(`C${fila}`).value = Number(emp.totalHoras || 0);
    sheet.getCell(`D${fila}`).value = emp.nombre || "";
    sheet.getCell(`E${fila}`).value = emp.coste || "";
  });

  const salida = await workbook.xlsx.writeBuffer();

  descargarArchivo(
    salida,
    `Relacion_Semanal_Tiempo_Extra_${periodoInicio.value || "periodo"}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}


async function generarOficioWord() {
  if (!empleadosAgregados.length) {
    alert("Agrega empleados antes de generar el oficio.");
    return;
  }

  const buffer = await cargarArchivoComoArrayBuffer("../templates/OFICIO_TIEMPO_EXTRA.docx");

  const zip = new PizZip(buffer);
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
  });

  const totalHoras = empleadosAgregados.reduce((sum, emp) => {
    return sum + Number(emp.totalHoras || 0);
  }, 0);

  doc.render({
    OFICIO: numeroOficio.value || "",
    FECHA_OFICIO: formatearFechaLarga(fechaOficio.value),
    DIRIGIDO_A: dirigidoA.value || "",
    PERIODO: obtenerPeriodoTexto(),
    ADSCRIPCION: adscripcion.value || "DIRECCION DE TALLERES",
    NUM_EMPLEADOS: empleadosAgregados.length,
    TOTAL_HORAS: totalHoras
  });

  const salida = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  saveAs(salida, `Oficio_Tiempo_Extra_${numeroOficio.value || "sin_oficio"}.docx`);
}


async function generarPaqueteFormatos() {
  if (!empleadosAgregados.length) {
    alert("Agrega al menos un empleado.");
    return;
  }

  const zip = new JSZip();

  await agregarRelacionSemanalAlZip(zip);
  await agregarOficioAlZip(zip);

  const carpetaGeneradores = zip.folder("Generadores");

  for (const emp of empleadosAgregados) {
    await agregarGeneradorAlZip(carpetaGeneradores, emp);
  }

  const contenido = await zip.generateAsync({ type: "blob" });

  saveAs(contenido, `Tiempo_Extra_${periodoInicio.value || "periodo"}.zip`);
}

async function agregarGeneradorAlZip(zip, empleado) {
  const buffer = await cargarArchivoComoArrayBuffer("../templates/GENERADOR_DE_TIEMPO_XTRA.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];

  sheet.name = empleado.nombre.substring(0, 31);

  sheet.getCell("C4").value = empleado.direccion || "DIRECCION DE TALLERES";
  sheet.getCell("C5").value = empleado.departamento || "";
  sheet.getCell("C6").value = empleado.nombre || "";
  sheet.getCell("C7").value = empleado.numero || "";
  sheet.getCell("G7").value = empleado.puesto || "";

  const dias = empleado.dias || [];

  for (let i = 0; i < 7; i++) {
    const fila = 11 + i;
    const dia = dias[i];

    sheet.getCell(`B${fila}`).value = dia?.dia || "";
    sheet.getCell(`C${fila}`).value = dia?.entrada || "";
    sheet.getCell(`D${fila}`).value = dia?.salida || "";
    sheet.getCell(`E${fila}`).value = Number(dia?.horas || 0);
    sheet.getCell(`F${fila}`).value = dia?.actividad || empleado.actividad || "";
  }

  sheet.getCell("E18").value = Number(empleado.totalHoras || 0);

  const salida = await workbook.xlsx.writeBuffer();

  zip.file(`Generador_${empleado.numero}_${empleado.nombre}.xlsx`, salida);
}


async function agregarRelacionSemanalAlZip(zip) {
  const buffer = await cargarArchivoComoArrayBuffer("../templates/RELACION_SEMANAL_TIEMPO_EXTRA.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet("relacion semanal") || workbook.worksheets[0];

  const totalHoras = empleadosAgregados.reduce((sum, emp) => {
    return sum + Number(emp.totalHoras || 0);
  }, 0);

  sheet.getCell("D7").value = obtenerPeriodoTexto();
  sheet.getCell("C8").value = empleadosAgregados.length;
  sheet.getCell("C9").value = totalHoras;

  empleadosAgregados.forEach((emp, index) => {
    const fila = 12 + index;

    sheet.getCell(`B${fila}`).value = emp.numero || "";
    sheet.getCell(`C${fila}`).value = Number(emp.totalHoras || 0);
    sheet.getCell(`D${fila}`).value = emp.nombre || "";
    sheet.getCell(`E${fila}`).value = emp.coste || "";
  });

  const salida = await workbook.xlsx.writeBuffer();

  zip.file("Relacion_Semanal_Tiempo_Extra.xlsx", salida);
}

async function agregarOficioAlZip(zip) {
  const buffer = await cargarArchivoComoArrayBuffer("../templates/OFICIO_TIEMPO_EXTRA.docx");

  const docZip = new PizZip(buffer);
  const doc = new window.docxtemplater(docZip, {
    paragraphLoop: true,
    linebreaks: true
  });

  const totalHoras = empleadosAgregados.reduce((sum, emp) => {
    return sum + Number(emp.totalHoras || 0);
  }, 0);

  doc.render({
    OFICIO: numeroOficio.value || "",
    FECHA_OFICIO: formatearFechaLarga(fechaOficio.value),
    DIRIGIDO_A: dirigidoA.value || "",
    PERIODO: obtenerPeriodoTexto(),
    ADSCRIPCION: adscripcion.value || "DIRECCION DE TALLERES",
    NUM_EMPLEADOS: empleadosAgregados.length,
    TOTAL_HORAS: totalHoras
  });

  const salida = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  zip.file("Oficio_Tiempo_Extra.docx", salida);
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

  const client = getSupabaseClient();
  if (!client) {
    alert("No se pudo conectar con Supabase.");
    return;
  }

  try {
    const { data, error } = await client
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
  generarPaqueteFormatos();
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