(function () {
  const DIAS_SEMANA = ["Viernes", "Sabado", "Domingo", "Lunes", "Martes", "Miercoles", "Jueves"];
  const DIA_VIERNES = 5;
  const DIAS_PERIODO = 6;

  let empleadosAgregados = [];
  let periodoActual = null;
  let indiceEdicion = null;
  let modoAltaEmpleado = false;

  const $ = (id) => document.getElementById(id);

  function getSupabaseClient() {
    if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
      return window.supabaseClient;
    }

    if (window.supabase && typeof window.supabase.from === "function") {
      return window.supabase;
    }

    return null;
  }

  function escapeHTML(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function texto(valor, fallback = "") {
    const str = String(valor == null ? "" : valor).trim();
    return str || fallback;
  }

  function normalizarHorasEnteras(valor) {
    const horas = Number(valor || 0);
    return Number.isFinite(horas) && horas > 0 ? Math.floor(horas) : 0;
  }

  function horaAMinutos(valor) {
    const partes = String(valor || "").split(":");
    if (partes.length < 2) return null;

    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    if (!Number.isInteger(horas) || !Number.isInteger(minutos) || horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
      return null;
    }

    return horas * 60 + minutos;
  }

  function normalizarInputHora(input) {
    if (!input?.value) return;

    const partes = input.value.split(":");
    if (!partes[0]) return;

    input.value = `${partes[0].padStart(2, "0")}:00`;
  }

  function calcularHorasEntre(entrada, salida) {
    const inicio = horaAMinutos(entrada);
    const fin = horaAMinutos(salida);
    if (inicio == null || fin == null) return "";

    let diferencia = fin - inicio;
    if (diferencia < 0) diferencia += 24 * 60;

    return Math.floor(diferencia / 60);
  }

  function normalizarNombreDia(dia) {
    return texto(dia)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizarDia(dia, fallbackActividad) {
    const justificacion = texto(dia?.justificacion || dia?.actividad || dia?.motivo || fallbackActividad);
    return {
      dia: texto(dia?.dia),
      fecha: texto(dia?.fecha),
      entrada: texto(dia?.entrada),
      salida: texto(dia?.salida),
      horas: normalizarHorasEnteras(dia?.horas),
      justificacion,
      actividad: justificacion
    };
  }

  function normalizarEmpleado(emp) {
    const detalleOriginal = emp?.detalleDias || emp?.dias || [];
    const actividadLegacy = emp?.actividad || emp?.justificacion || "";
    const detalleDias = detalleOriginal.map((dia) => normalizarDia(dia, actividadLegacy));
    const totalHoras = detalleDias.length
      ? detalleDias.reduce((sum, dia) => sum + Number(dia.horas || 0), 0)
      : Number(emp?.totalHoras || emp?.total_horas || 0);

    return {
      id: emp?.id || emp?.empleado_periodo_id || null,
      empleadoId: emp?.empleadoId || emp?.empleado_id || null,
      numEmpleado: texto(emp?.numEmpleado || emp?.numero || emp?.num_empleado),
      numero: texto(emp?.numero || emp?.numEmpleado || emp?.num_empleado),
      nombre: texto(emp?.nombre || emp?.nombre_completo),
      direccion: texto(emp?.direccion),
      departamento: texto(emp?.departamento),
      puesto: texto(emp?.puesto),
      coste: texto(emp?.coste || emp?.centro_costo),
      totalHoras,
      detalleDias,
      dias: detalleDias
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    configurarTabs();
    configurarHoras();
    configurarBotones();
    actualizarResumen();
    actualizarResumenDocumentos();
  });

  function configurarTabs() {
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cambiarTab(btn.dataset.tab);
        actualizarResumenDocumentos();
      });
    });
  }

  function configurarHoras() {
    document.querySelectorAll("#tablaDias tr").forEach(function (fila) {
      const inputs = fila.querySelectorAll("input");
      const fecha = inputs[0];
      const entrada = inputs[1];
      const salida = inputs[2];
      const horas = inputs[3];
      const celdaDia = fila.querySelector("td");

      if (horas) {
        horas.step = "1";
        horas.readOnly = true;
      }

      fecha?.addEventListener("change", function () {
        const diaSemana = celdaDia?.dataset.dia || celdaDia?.textContent || "";
        if (celdaDia) celdaDia.textContent = formatearDiaConFecha(fecha.value, diaSemana);
      });

      [entrada, salida].forEach(function (input) {
        input?.addEventListener("change", function () {
          normalizarInputHora(input);
          calcularHorasFila(fila);
        });

        input?.addEventListener("input", function () {
          calcularHorasFila(fila);
        });
      });
    });
  }

  function calcularHorasFila(fila) {
    const inputs = fila?.querySelectorAll("input");
    if (!inputs || inputs.length < 4) return 0;

    const horas = calcularHorasEntre(inputs[1].value, inputs[2].value);
    inputs[3].value = horas === "" || horas <= 0 ? "" : String(horas);
    return calcularTotalEmpleado();
  }

  function configurarBotones() {
    $("btnAgregarEmpleado")?.addEventListener("click", agregarOActualizarEmpleado);
    $("btnCancelarEdicion")?.addEventListener("click", cancelarEdicion);
    $("btnGuardarAltaEmpleado")?.addEventListener("click", guardarAltaEmpleado);
    $("btnCancelarAltaEmpleado")?.addEventListener("click", cancelarAltaEmpleado);
    $("btnVistaPrevia")?.addEventListener("click", vistaPrevia);
    $("btnImprimirPDF")?.addEventListener("click", generarPDF);
    $("btnGenerarPDF")?.addEventListener("click", generarPaqueteFormatos);
    $("btnGuardarPeriodo")?.addEventListener("click", guardarPeriodoTemporal);
    $("btnBuscarHistorial")?.addEventListener("click", buscarHistorial);
    $("periodoInicio")?.addEventListener("change", sincronizarPeriodoViernesJueves);
    $("periodoFin")?.addEventListener("change", sincronizarPeriodoViernesJueves);

    $("numEmpleado")?.addEventListener("blur", buscarEmpleado);
    $("numEmpleado")?.addEventListener("input", function () {
      if (indiceEdicion == null) {
        limpiarDatosEmpleado();
        limpiarDetalleSemanal(true);
      }
    });
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
      const horas = normalizarHorasEnteras(input.value);
      input.value = horas > 0 ? String(horas) : "";
      total += horas;
    });

    if ($("totalHorasEmpleado")) $("totalHorasEmpleado").textContent = total;
    return total;
  }

  function obtenerDetalleDias() {
    const filas = document.querySelectorAll("#tablaDias tr");

    return Array.from(filas).map(function (fila) {
      const celdas = fila.querySelectorAll("td");
      const inputs = fila.querySelectorAll("input");
      const justificacion = fila.querySelector(".justificacion-dia");
      normalizarInputHora(inputs[1]);
      normalizarInputHora(inputs[2]);

      const horasCalculadas = calcularHorasEntre(inputs[1]?.value, inputs[2]?.value);
      if (inputs[3]) {
        inputs[3].value = horasCalculadas === "" || horasCalculadas <= 0 ? "" : String(horasCalculadas);
      }

      return normalizarDia({
        dia: celdas[0]?.dataset.dia || celdas[0]?.textContent || "",
        fecha: inputs[0]?.value || "",
        entrada: inputs[1]?.value || "",
        salida: inputs[2]?.value || "",
        horas: normalizarHorasEnteras(inputs[3]?.value),
        justificacion: justificacion?.value || ""
      });
    }).filter(function (item) {
      return item.horas > 0 || item.fecha || item.entrada || item.salida || item.justificacion;
    });
  }

  function validarDetalleDias(detalleDias) {
    const diasConHorasSinJustificacion = detalleDias.filter(function (dia) {
      return Number(dia.horas || 0) > 0 && !texto(dia.justificacion);
    });

    if (diasConHorasSinJustificacion.length) {
      alert("Captura la justificacion de cada dia que tenga horas extra.");
      return false;
    }

    return true;
  }

  async function buscarEmpleado() {
    const num = $("numEmpleado")?.value.trim();

    if (!num) return;

    if (modoAltaEmpleado && $("numEmpleado")?.dataset.altaNum === num) return;

    limpiarDatosEmpleado();
    limpiarDetalleSemanal(true);

    const client = getSupabaseClient();
    if (!client) {
      alert("No se pudo conectar con Supabase.");
      return;
    }

    try {
      const { data, error } = await buscarEmpleadoCatalogo(client, num);

      if (error || !data) {
        prepararAltaEmpleado(num);
        return;
      }

      cargarDatosEmpleado(data);
    } catch (err) {
      console.error("Error al buscar empleado:", err);
      alert("Ocurrio un error al buscar el empleado.");
    }
  }

  function cargarDatosEmpleado(data) {
    $("nombreEmpleado").value = data.nombre_completo || data.nombre || "";
    $("direccionEmpleado").value = data.direccion || "";
    $("departamentoEmpleado").value = data.departamento || "";
    $("puestoEmpleado").value = data.puesto || "";
    $("numEmpleado").dataset.empleadoId = data.id || "";
    desactivarAltaEmpleado();
  }

  function limpiarDatosEmpleado() {
    $("nombreEmpleado").value = "";
    $("direccionEmpleado").value = "";
    $("departamentoEmpleado").value = "";
    $("puestoEmpleado").value = "";
    $("numEmpleado").dataset.empleadoId = "";
  }

  function setCamposEmpleadoEditables(editable) {
    ["nombreEmpleado", "direccionEmpleado", "departamentoEmpleado", "puestoEmpleado"].forEach(function (id) {
      const input = $(id);
      if (input) input.readOnly = !editable;
    });
  }

  function prepararAltaEmpleado(numEmpleado) {
    modoAltaEmpleado = true;
    setCamposEmpleadoEditables(true);
    $("numEmpleado").dataset.empleadoId = "";
    $("numEmpleado").dataset.altaNum = numEmpleado;

    const box = $("altaEmpleadoBox");
    const mensaje = $("altaEmpleadoMensaje");
    if (mensaje) {
      mensaje.textContent = `El empleado ${numEmpleado} no existe. Captura sus datos basicos y guardalo en el catalogo.`;
    }
    if (box) box.hidden = false;

    $("nombreEmpleado")?.focus();
  }

  function desactivarAltaEmpleado() {
    modoAltaEmpleado = false;
    setCamposEmpleadoEditables(false);
    if ($("altaEmpleadoBox")) $("altaEmpleadoBox").hidden = true;
    if ($("numEmpleado")) $("numEmpleado").dataset.altaNum = "";
  }

  function cancelarAltaEmpleado() {
    desactivarAltaEmpleado();
    limpiarDatosEmpleado();
  }

  function obtenerPayloadEmpleadoNuevo(preferirNombreCompleto = true) {
    const numEmpleado = texto($("numEmpleado")?.value);
    const nombre = texto($("nombreEmpleado")?.value);
    const payload = {
      num_empleado: numEmpleado,
      direccion: texto($("direccionEmpleado")?.value),
      departamento: texto($("departamentoEmpleado")?.value),
      puesto: texto($("puestoEmpleado")?.value),
      activo: true
    };

    if (preferirNombreCompleto) {
      payload.nombre_completo = nombre;
      payload.nombre = nombre;
    } else {
      payload.nombre = nombre;
    }

    return payload;
  }

  function esErrorColumnaInexistente(error) {
    const mensaje = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return error?.code === "42703" || mensaje.includes("column") || mensaje.includes("schema cache");
  }

  async function buscarEmpleadoCatalogo(client, numEmpleado, soloActivos = true) {
    let query = client
      .from("empleados")
      .select("*")
      .eq("num_empleado", numEmpleado);

    if (soloActivos) {
      query = query.eq("activo", true);
    }

    const res = await query.maybeSingle();

    if (res.error && soloActivos && esErrorColumnaInexistente(res.error)) {
      return buscarEmpleadoCatalogo(client, numEmpleado, false);
    }

    return res;
  }

  async function insertarEmpleadoConFallback(client) {
    const intentos = [
      obtenerPayloadEmpleadoNuevo(true),
      obtenerPayloadEmpleadoNuevo(false),
      {
        num_empleado: texto($("numEmpleado")?.value),
        nombre: texto($("nombreEmpleado")?.value),
        activo: true
      },
      {
        num_empleado: texto($("numEmpleado")?.value),
        nombre: texto($("nombreEmpleado")?.value)
      }
    ];

    let ultimoError = null;

    for (const payload of intentos) {
      const { data, error } = await client
        .from("empleados")
        .insert(payload)
        .select()
        .single();

      if (!error) return data;

      ultimoError = error;
      if (!esErrorColumnaInexistente(error)) break;
    }

    throw ultimoError;
  }

  async function guardarAltaEmpleado() {
    const numEmpleado = texto($("numEmpleado")?.value);
    const nombre = texto($("nombreEmpleado")?.value);

    if (!numEmpleado) {
      alert("Ingresa el numero de empleado.");
      return;
    }

    if (!nombre) {
      alert("Ingresa el nombre del empleado.");
      $("nombreEmpleado")?.focus();
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      alert("No se pudo conectar con Supabase.");
      return;
    }

    try {
      const existente = await buscarEmpleadoCatalogo(client, numEmpleado, false);

      if (existente.error) throw existente.error;

      if (existente.data) {
        cargarDatosEmpleado(existente.data);
        alert("El empleado ya existia en el catalogo y fue cargado.");
        return;
      }

      const data = await insertarEmpleadoConFallback(client);
      cargarDatosEmpleado(data);
      alert("Empleado agregado al catalogo correctamente.");
    } catch (err) {
      console.error("Error al guardar empleado:", err);
      alert("No se pudo guardar el empleado. Verifica las columnas y permisos de la tabla empleados.");
    }
  }

  function agregarOActualizarEmpleado() {
    const detalleDias = obtenerDetalleDias();
    const totalHoras = detalleDias.reduce((sum, dia) => sum + Number(dia.horas || 0), 0);

    if (!texto($("numEmpleado")?.value)) {
      alert("Ingresa el numero de empleado.");
      return;
    }

    if (modoAltaEmpleado || !$("numEmpleado")?.dataset.empleadoId) {
      alert("Guarda o carga el empleado antes de agregar horas extra.");
      return;
    }

    if (totalHoras <= 0) {
      alert("Captura al menos una hora extra.");
      return;
    }

    if (!validarDetalleDias(detalleDias)) return;

    const empleado = normalizarEmpleado({
      id: indiceEdicion == null ? null : empleadosAgregados[indiceEdicion]?.id,
      empleadoId: $("numEmpleado").dataset.empleadoId || null,
      numEmpleado: $("numEmpleado").value,
      nombre: $("nombreEmpleado").value,
      direccion: $("direccionEmpleado").value,
      departamento: $("departamentoEmpleado").value,
      puesto: $("puestoEmpleado").value,
      totalHoras,
      detalleDias
    });

    if (indiceEdicion == null) {
      empleadosAgregados.push(empleado);
    } else {
      empleadosAgregados[indiceEdicion] = empleado;
    }

    renderTablaEmpleados();
    limpiarCapturaEmpleado();
    actualizarResumen();
    actualizarResumenDocumentos();
  }

  function contarDiasJustificados(emp) {
    return (emp.detalleDias || []).filter((dia) => Number(dia.horas || 0) > 0 && texto(dia.justificacion)).length;
  }

  function renderTablaEmpleados() {
    const tbody = $("tablaTiempoExtra");
    if (!tbody) return;

    if (!empleadosAgregados.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin empleados agregados.</td></tr>';
      return;
    }

    tbody.innerHTML = empleadosAgregados.map(function (emp, index) {
      return `
        <tr>
          <td>${escapeHTML(emp.numEmpleado)}</td>
          <td>${escapeHTML(emp.nombre || "Sin nombre")}</td>
          <td>${escapeHTML(emp.departamento || "-")}</td>
          <td>${escapeHTML(emp.puesto || "-")}</td>
          <td>${Number(emp.totalHoras || 0)}</td>
          <td>${contarDiasJustificados(emp)} de ${(emp.detalleDias || []).filter((dia) => Number(dia.horas || 0) > 0).length}</td>
          <td class="acciones-tabla">
            <button class="btn btn-secondary btn-sm" type="button" data-accion="editar" data-index="${index}">Editar</button>
            <button class="btn btn-danger btn-sm" type="button" data-accion="eliminar" data-index="${index}">Eliminar</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("button[data-accion]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const index = Number(btn.dataset.index);
        if (btn.dataset.accion === "editar") editarEmpleado(index);
        if (btn.dataset.accion === "eliminar") eliminarEmpleado(index);
      });
    });
  }

  function editarEmpleado(index) {
    const emp = empleadosAgregados[index];
    if (!emp) return;

    desactivarAltaEmpleado();
    indiceEdicion = index;
    $("numEmpleado").value = emp.numEmpleado || emp.numero || "";
    $("numEmpleado").dataset.empleadoId = emp.empleadoId || "";
    $("nombreEmpleado").value = emp.nombre || "";
    $("direccionEmpleado").value = emp.direccion || "";
    $("departamentoEmpleado").value = emp.departamento || "";
    $("puestoEmpleado").value = emp.puesto || "";

    const filas = document.querySelectorAll("#tablaDias tr");
    filas.forEach(function (fila) {
      const inputs = fila.querySelectorAll("input");
      const justificacion = fila.querySelector(".justificacion-dia");
      const celdaDia = fila.querySelector("td");
      const nombreDia = celdaDia?.dataset.dia || celdaDia?.textContent || "";
      const dia = obtenerDiaParaFila(emp, nombreDia) || {};

      inputs[0].value = dia.fecha || "";
      inputs[1].value = dia.entrada || "";
      inputs[2].value = dia.salida || "";
      inputs[3].value = dia.horas || "";
      if (celdaDia) {
        celdaDia.dataset.dia = nombreDia;
        celdaDia.textContent = formatearDiaConFecha(dia.fecha, nombreDia);
      }
      if (justificacion) justificacion.value = dia.justificacion || dia.actividad || "";
    });

    $("btnAgregarEmpleado").textContent = "Actualizar empleado";
    $("btnCancelarEdicion").hidden = false;
    calcularTotalEmpleado();
    cambiarTab("captura");
  }

  function eliminarEmpleado(index) {
    empleadosAgregados.splice(index, 1);
    if (indiceEdicion === index) limpiarCapturaEmpleado();
    renderTablaEmpleados();
    actualizarResumen();
    actualizarResumenDocumentos();
  }

  function cancelarEdicion() {
    limpiarCapturaEmpleado();
  }

  function limpiarCapturaEmpleado() {
    indiceEdicion = null;
    desactivarAltaEmpleado();
    $("numEmpleado").value = "";
    limpiarDatosEmpleado();

    limpiarDetalleSemanal(true);

    $("btnAgregarEmpleado").textContent = "Agregar empleado";
    $("btnCancelarEdicion").hidden = true;
    $("totalHorasEmpleado").textContent = "0";
  }

  function limpiarDetalleSemanal(mantenerFechasPeriodo = false) {
    document.querySelectorAll("#tablaDias tr").forEach(function (fila, index) {
      const celdaDia = fila.querySelector("td");
      const inputs = fila.querySelectorAll("input");
      const justificacion = fila.querySelector(".justificacion-dia");
      const diaSemana = celdaDia?.dataset.dia || DIAS_SEMANA[index] || celdaDia?.textContent || "";

      if (celdaDia) {
        celdaDia.dataset.dia = diaSemana;
        celdaDia.textContent = diaSemana;
      }

      inputs.forEach(function (input) {
        input.value = "";
      });

      if (justificacion) justificacion.value = "";
    });

    $("totalHorasEmpleado").textContent = "0";

    if (mantenerFechasPeriodo) {
      llenarFechasDelPeriodoActual();
    }
  }

  function obtenerTotalHoras() {
    return empleadosAgregados.reduce(function (sum, emp) {
      return sum + Number(emp.totalHoras || 0);
    }, 0);
  }

  function obtenerCounts() {
    return {
      empleados: empleadosAgregados.reduce(function (total, emp) {
        return total + (Number(emp.totalHoras || 0) > 0 ? 1 : 0);
      }, 0),
      horas: obtenerTotalHoras()
    };
  }

  function actualizarResumen() {
    const counts = obtenerCounts();

    if ($("resumenPeriodo")) {
      $("resumenPeriodo").textContent = `${counts.empleados} empleados | ${counts.horas} horas`;
    }
  }

  function actualizarResumenDocumentos() {
    const inicio = $("periodoInicio")?.value || "";
    const fin = $("periodoFin")?.value || "";
    const oficio = $("numeroOficio")?.value || "";
    const counts = obtenerCounts();

    if ($("docPeriodo")) $("docPeriodo").textContent = inicio && fin ? `${inicio} al ${fin}` : "Sin periodo";
    if ($("docOficio")) $("docOficio").textContent = oficio || "Sin oficio";
    if ($("docEmpleados")) $("docEmpleados").textContent = counts.empleados;
    if ($("docHoras")) $("docHoras").textContent = counts.horas;
  }

  async function cargarArchivoComoArrayBuffer(ruta) {
    const res = await fetch(ruta);

    if (!res.ok) {
      throw new Error("No se pudo cargar la plantilla: " + ruta);
    }

    return await res.arrayBuffer();
  }

  function obtenerPeriodoTexto() {
    const inicio = $("periodoInicio")?.value;
    const fin = $("periodoFin")?.value;

    if (!inicio || !fin) return "SIN PERIODO";

    return `${formatearFechaLarga(inicio)} AL ${formatearFechaLarga(fin)}`;
  }

  function formatearFechaLarga(fechaISO) {
    if (!fechaISO) return "";
    return formatearFechaCorta(fechaISO);
  }

  function formatearDiaConFecha(fechaISO, diaFallback) {
    if (!fechaISO) return diaFallback || "";

    const fecha = new Date(fechaISO + "T00:00:00");
    if (Number.isNaN(fecha.getTime())) return diaFallback || "";

    return fecha.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).replace(/^\w/, (letra) => letra.toUpperCase());
  }

  function formatearFechaCorta(fechaISO) {
    if (!fechaISO) return "";
    const valor = String(fechaISO).split("T")[0];
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
    if (partes.length !== 3) return fechaISO;
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  function obtenerMesPeriodo() {
    if (!$("periodoInicio")?.value) return "";

    const fecha = new Date($("periodoInicio").value + "T00:00:00");

    return fecha.toLocaleDateString("es-MX", {
      month: "long"
    }).toUpperCase();
  }

  function obtenerAnioPeriodo() {
    if (!$("periodoInicio")?.value) return "";
    return new Date($("periodoInicio").value + "T00:00:00").getFullYear();
  }

  function crearFechaLocal(fechaTexto) {
    return fechaTexto ? new Date(fechaTexto + "T00:00:00") : null;
  }

  function formatearISOFecha(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }

  function obtenerViernesPeriodo(fechaTexto) {
    const fecha = crearFechaLocal(fechaTexto);
    if (!fecha) return "";

    const diferencia = (fecha.getDay() - DIA_VIERNES + 7) % 7;
    fecha.setDate(fecha.getDate() - diferencia);

    return formatearISOFecha(fecha);
  }

  function obtenerJuevesPeriodo(viernesTexto) {
    const fecha = crearFechaLocal(viernesTexto);
    if (!fecha) return "";

    fecha.setDate(fecha.getDate() + DIAS_PERIODO);
    return formatearISOFecha(fecha);
  }

  function sincronizarPeriodoViernesJueves() {
    const inicioInput = $("periodoInicio");
    const finInput = $("periodoFin");
    if (!inicioInput || !finInput) return true;

    if (!inicioInput.value) {
      finInput.value = "";
      limpiarDetalleSemanal(false);
      actualizarResumenDocumentos();
      return false;
    }

    const viernes = obtenerViernesPeriodo(inicioInput.value);
    const jueves = obtenerJuevesPeriodo(viernes);

    inicioInput.value = viernes;
    finInput.value = jueves;
    llenarFechasSemana(viernes, jueves);
    actualizarResumenDocumentos();
    return true;
  }

  function validarPeriodoViernesJueves(inicio, fin) {
    return inicio === obtenerViernesPeriodo(inicio) && fin === obtenerJuevesPeriodo(inicio);
  }

  function descargarArchivo(buffer, nombre, tipo) {
    const blob = new Blob([buffer], { type: tipo });
    saveAs(blob, nombre);
  }

  function obtenerHojaGenerador(workbook) {
    const activeTab = workbook.views?.[0]?.activeTab;
    const hojaActiva = Number.isInteger(activeTab) ? workbook.worksheets[activeTab] : null;
    const hojaSeleccionada = workbook.worksheets.find((sheet) => {
      return sheet.state !== "hidden" && sheet.views?.some((view) => view.tabSelected);
    });

    if (hojaActiva && hojaActiva.state !== "hidden") {
      return hojaActiva;
    }

    if (hojaSeleccionada) {
      return hojaSeleccionada;
    }

    const hojasVisibles = workbook.worksheets.filter((sheet) => sheet.state !== "hidden" && sheet.name !== "Combos");
    return hojasVisibles[hojasVisibles.length - 1] || workbook.worksheets[0];
  }

  function activarHojaGenerador(workbook, sheet) {
    const activeTab = workbook.worksheets.findIndex((item) => item.id === sheet.id);
    sheet.state = "visible";

    workbook.views = workbook.views?.length ? workbook.views : [{}];
    workbook.views[0].activeTab = activeTab >= 0 ? activeTab : 0;
    workbook.views[0].firstSheet = activeTab >= 0 ? activeTab : 0;
  }

  function obtenerDiasEmpleado(empleado) {
    return (empleado.detalleDias || empleado.dias || []).map((dia) => normalizarDia(dia, empleado.actividad));
  }

  function obtenerDiaParaFila(empleado, nombreDia) {
    const buscado = normalizarNombreDia(nombreDia);
    return obtenerDiasEmpleado(empleado).find((dia) => normalizarNombreDia(dia.dia) === buscado);
  }

  function obtenerDiasOrdenadosSemana(empleado) {
    const dias = obtenerDiasEmpleado(empleado);

    return DIAS_SEMANA.map(function (diaSemana) {
      return dias.find((dia) => normalizarNombreDia(dia.dia) === normalizarNombreDia(diaSemana)) || {
        dia: diaSemana,
        fecha: "",
        entrada: "",
        salida: "",
        horas: 0,
        justificacion: ""
      };
    });
  }

  function escribirDiasEnGenerador(sheet, empleado) {
    const dias = obtenerDiasOrdenadosSemana(empleado);

    for (let i = 0; i < 8; i++) {
      const fila = 11 + i;
      const dia = dias[i] || {};

      sheet.getCell(`B${fila}`).value = formatearDiaConFecha(dia.fecha, dia.dia || DIAS_SEMANA[i] || "");
      sheet.getCell(`C${fila}`).value = dia.entrada || "";
      sheet.getCell(`D${fila}`).value = dia.salida || "";
      sheet.getCell(`E${fila}`).value = Number(dia.horas || 0) || "";
      sheet.getCell(`F${fila}`).value = dia.justificacion || "";
    }

    sheet.getCell("E19").value = {
      formula: "SUM(E11:E18)",
      result: Number(empleado.totalHoras || 0)
    };
  }

  async function generarGeneradorIndividual(empleado) {
    const buffer = await cargarArchivoComoArrayBuffer("../templates/GENERADOR_DE_TIEMPO_XTRA.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = obtenerHojaGenerador(workbook);
    sheet.name = texto(empleado.nombre, "Empleado").substring(0, 31);
    activarHojaGenerador(workbook, sheet);

    const inicio = $("periodoInicio").value ? new Date($("periodoInicio").value + "T00:00:00") : null;
    const fin = $("periodoFin").value ? new Date($("periodoFin").value + "T00:00:00") : null;

    sheet.getCell("D2").value = inicio ? inicio.getDate() : "";
    sheet.getCell("F2").value = fin ? fin.getDate() : "";
    sheet.getCell("H2").value = obtenerMesPeriodo();
    sheet.getCell("J2").value = obtenerAnioPeriodo();
    sheet.getCell("C4").value = empleado.direccion || "DIRECCION DE TALLERES";
    sheet.getCell("C5").value = empleado.departamento || "";
    sheet.getCell("C6").value = empleado.nombre || "";
    sheet.getCell("C7").value = empleado.numEmpleado || empleado.numero || "";
    sheet.getCell("G7").value = empleado.puesto || "";

    escribirDiasEnGenerador(sheet, empleado);

    const salida = await workbook.xlsx.writeBuffer();

    descargarArchivo(
      salida,
      `Generador_${empleado.numEmpleado || empleado.numero}_${empleado.nombre || "empleado"}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  async function generarRelacionSemanal() {
    if (!empleadosAgregados.length) {
      alert("Agrega empleados antes de generar la relacion semanal.");
      return;
    }

    const buffer = await cargarArchivoComoArrayBuffer("../templates/RELACION_SEMANAL_TIEMPO_EXTRA.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("relacion semanal") || workbook.worksheets[0];
    const counts = obtenerCounts();

    sheet.getCell("D7").value = obtenerPeriodoTexto();
    sheet.getCell("D8").value = counts.empleados;
    sheet.getCell("D9").value = counts.horas;

    for (let i = 0; i < 19; i++) {
      const fila = 12 + i;
      ["B", "C", "D", "E"].forEach((col) => {
        sheet.getCell(`${col}${fila}`).value = "";
      });
    }

    empleadosAgregados.forEach((emp, index) => {
      const fila = 12 + index;

      sheet.getCell(`B${fila}`).value = emp.numEmpleado || emp.numero || "";
      sheet.getCell(`C${fila}`).value = Number(emp.totalHoras || 0);
      sheet.getCell(`D${fila}`).value = emp.nombre || "";
      sheet.getCell(`E${fila}`).value = emp.coste || "";
    });

    const salida = await workbook.xlsx.writeBuffer();

    descargarArchivo(
      salida,
      `Relacion_Semanal_Tiempo_Extra_${$("periodoInicio").value || "periodo"}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  async function generarOficioWord() {
    if (!empleadosAgregados.length) {
      alert("Agrega empleados antes de generar el oficio.");
      return;
    }

    const counts = obtenerCounts();
    const buffer = await cargarArchivoComoArrayBuffer("../templates/OFICIO_TIEMPO_EXTRA.docx");
    const zip = new PizZip(buffer);
    const doc = new window.docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    doc.render({
      OFICIO: $("numeroOficio").value || "",
      FECHA_OFICIO: formatearFechaLarga($("fechaOficio").value),
      DIRIGIDO_A: $("dirigidoA").value || "",
      PERIODO: obtenerPeriodoTexto(),
      ADSCRIPCION: $("adscripcion").value || "DIRECCION DE TALLERES",
      NUM_EMPLEADOS: counts.empleados,
      TOTAL_HORAS: counts.horas
    });

    const salida = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    saveAs(salida, `Oficio_Tiempo_Extra_${$("numeroOficio").value || "sin_oficio"}.docx`);
  }

  async function generarPaqueteFormatos() {
    if (!empleadosAgregados.length) {
      alert("Agrega al menos un empleado.");
      return;
    }

    try {
      const generarGeneradores = Boolean($("chkGeneradores")?.checked);
      const generarResumen = Boolean($("chkResumen")?.checked);
      const generarOficio = Boolean($("chkOficio")?.checked);
      const generarCaratula = Boolean($("chkCaratula")?.checked);

      if (!generarGeneradores && !generarResumen && !generarOficio && !generarCaratula) {
        alert("Selecciona al menos un documento para generar.");
        return;
      }

      const zip = new JSZip();

      if (generarResumen) await agregarRelacionSemanalAlZip(zip);
      if (generarOficio) await agregarOficioAlZip(zip);

      if (generarGeneradores) {
        const carpetaGeneradores = zip.folder("Generadores");
        for (const emp of empleadosAgregados) {
          await agregarGeneradorAlZip(carpetaGeneradores, emp);
        }
      }

      if (generarCaratula) {
        zip.file("Vista_Previa_Tiempo_Extra.html", construirHTMLVistaPrevia());
      }

      const contenido = await zip.generateAsync({ type: "blob" });
      saveAs(contenido, `Tiempo_Extra_${$("periodoInicio").value || "periodo"}.zip`);
    } catch (err) {
      console.error("Error al generar paquete:", err);
      alert("No se pudo generar el paquete de documentos.");
    }
  }

  async function agregarGeneradorAlZip(zip, empleado) {
    const buffer = await cargarArchivoComoArrayBuffer("../templates/GENERADOR_DE_TIEMPO_XTRA.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = obtenerHojaGenerador(workbook);
    sheet.name = texto(empleado.nombre, "Empleado").substring(0, 31);
    activarHojaGenerador(workbook, sheet);

    const inicio = $("periodoInicio").value ? new Date($("periodoInicio").value + "T00:00:00") : null;
    const fin = $("periodoFin").value ? new Date($("periodoFin").value + "T00:00:00") : null;

    sheet.getCell("D2").value = inicio ? inicio.getDate() : "";
    sheet.getCell("F2").value = fin ? fin.getDate() : "";
    sheet.getCell("H2").value = obtenerMesPeriodo();
    sheet.getCell("J2").value = obtenerAnioPeriodo();
    sheet.getCell("C4").value = empleado.direccion || "DIRECCION DE TALLERES";
    sheet.getCell("C5").value = empleado.departamento || "";
    sheet.getCell("C6").value = empleado.nombre || "";
    sheet.getCell("C7").value = empleado.numEmpleado || empleado.numero || "";
    sheet.getCell("G7").value = empleado.puesto || "";

    escribirDiasEnGenerador(sheet, empleado);

    const salida = await workbook.xlsx.writeBuffer();
    zip.file(`Generador_${empleado.numEmpleado || empleado.numero}_${empleado.nombre || "empleado"}.xlsx`, salida);
  }

  async function agregarRelacionSemanalAlZip(zip) {
    const buffer = await cargarArchivoComoArrayBuffer("../templates/RELACION_SEMANAL_TIEMPO_EXTRA.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("relacion semanal") || workbook.worksheets[0];
    const counts = obtenerCounts();

    sheet.getCell("D7").value = obtenerPeriodoTexto();
    sheet.getCell("D8").value = counts.empleados;
    sheet.getCell("D9").value = counts.horas;

    empleadosAgregados.forEach((emp, index) => {
      const fila = 12 + index;
      sheet.getCell(`B${fila}`).value = emp.numEmpleado || emp.numero || "";
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
    const counts = obtenerCounts();

    doc.render({
      OFICIO: $("numeroOficio").value || "",
      FECHA_OFICIO: formatearFechaLarga($("fechaOficio").value),
      DIRIGIDO_A: $("dirigidoA").value || "",
      PERIODO: obtenerPeriodoTexto(),
      ADSCRIPCION: $("adscripcion").value || "DIRECCION DE TALLERES",
      NUM_EMPLEADOS: counts.empleados,
      TOTAL_HORAS: counts.horas
    });

    const salida = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    zip.file("Oficio_Tiempo_Extra.docx", salida);
  }

  async function guardarPeriodoTemporal() {
    sincronizarPeriodoViernesJueves();
    const inicio = $("periodoInicio").value;
    const fin = $("periodoFin").value;

    if (!inicio || !fin) {
      alert("Captura el periodo de inicio y fin.");
      return;
    }

    if (!validarPeriodoViernesJueves(inicio, fin)) {
      alert("El periodo debe iniciar en viernes y terminar el jueves siguiente.");
      return;
    }

    const empleadoSinJustificacion = empleadosAgregados.find((emp) => !validarEmpleadoSilencioso(emp));
    if (empleadoSinJustificacion) {
      alert(`El empleado ${empleadoSinJustificacion.nombre || empleadoSinJustificacion.numEmpleado} tiene dias con horas sin justificacion.`);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      alert("No se pudo conectar con Supabase.");
      return;
    }

    try {
      const counts = obtenerCounts();
      const payload = {
        fecha_inicio: inicio,
        fecha_fin: fin,
        semana: obtenerSemanaISO(inicio),
        anio: new Date(inicio + "T00:00:00").getFullYear(),
        numero_oficio: $("numeroOficio").value.trim(),
        fecha_oficio: $("fechaOficio").value || null,
        adscripcion: $("adscripcion").value.trim(),
        destinatario: $("dirigidoA").value.trim(),
        total_empleados: counts.empleados,
        total_horas: counts.horas,
        estatus: "borrador"
      };

      let data;
      if (periodoActual?.id) {
        const res = await client
          .from("periodos_tiempo_extra")
          .update(payload)
          .eq("id", periodoActual.id)
          .select()
          .single();
        if (res.error) throw res.error;
        data = res.data;
      } else {
        const res = await client
          .from("periodos_tiempo_extra")
          .insert(payload)
          .select()
          .single();
        if (res.error) throw res.error;
        data = res.data;
      }

      periodoActual = data;
      await guardarEmpleadosPeriodo(client, periodoActual.id);
      llenarFechasSemana(inicio, fin);
      actualizarResumenDocumentos();
      alert("Periodo guardado correctamente.");
      cambiarTab("captura");
    } catch (err) {
      console.error("Error al guardar periodo:", err);
      alert("No se pudo guardar el periodo. Verifica que las tablas de tiempo extra esten actualizadas.");
    }
  }

  function validarEmpleadoSilencioso(emp) {
    return obtenerDiasEmpleado(emp).every((dia) => Number(dia.horas || 0) <= 0 || texto(dia.justificacion));
  }

  async function guardarEmpleadosPeriodo(client, periodoId) {
    const detallesEliminados = await client.from("tiempo_extra_detalles").delete().eq("periodo_id", periodoId);
    if (detallesEliminados.error) throw detallesEliminados.error;

    const empleadosEliminados = await client.from("tiempo_extra_empleados").delete().eq("periodo_id", periodoId);
    if (empleadosEliminados.error) throw empleadosEliminados.error;

    for (const emp of empleadosAgregados) {
      const empleadoRes = await client.from("tiempo_extra_empleados").insert({
        periodo_id: periodoId,
        empleado_id: emp.empleadoId || null,
        num_empleado: emp.numEmpleado || emp.numero,
        nombre: emp.nombre,
        direccion: emp.direccion,
        departamento: emp.departamento,
        puesto: emp.puesto,
        total_horas: Number(emp.totalHoras || 0)
      }).select().single();

      if (empleadoRes.error) throw empleadoRes.error;

      const detalleRows = obtenerDiasEmpleado(emp)
        .filter((dia) => Number(dia.horas || 0) > 0 || dia.fecha || dia.entrada || dia.salida || dia.justificacion)
        .map((dia, index) => ({
          periodo_id: periodoId,
          tiempo_extra_empleado_id: empleadoRes.data.id,
          dia_semana: dia.dia || DIAS_SEMANA[index],
          fecha: dia.fecha || null,
          entrada: dia.entrada || null,
          salida: dia.salida || null,
          horas: Number(dia.horas || 0),
          justificacion: dia.justificacion || ""
        }));

      if (detalleRows.length) {
        const detalleRes = await client.from("tiempo_extra_detalles").insert(detalleRows);
        if (detalleRes.error) throw detalleRes.error;
      }
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

    filas.forEach(function (fila, index) {
      const celdaDia = fila.querySelector("td");
      const inputFecha = fila.querySelector('input[type="date"]');
      const diaSemana = DIAS_SEMANA[index] || celdaDia?.dataset.dia || celdaDia?.textContent || "";

      if (celdaDia) {
        celdaDia.dataset.dia = diaSemana;
      }

      if (!inputFecha) return;

      if (fechaActual <= fechaFin) {
        const fechaISO = fechaActual.toISOString().split("T")[0];
        inputFecha.value = fechaISO;
        if (celdaDia) celdaDia.textContent = formatearDiaConFecha(fechaISO, diaSemana);
        fechaActual.setDate(fechaActual.getDate() + 1);
      } else {
        inputFecha.value = "";
        if (celdaDia) celdaDia.textContent = diaSemana;
      }
    });
  }

  function llenarFechasDelPeriodoActual() {
    const inicio = $("periodoInicio")?.value;
    const fin = $("periodoFin")?.value;

    if (inicio && fin) {
      llenarFechasSemana(inicio, fin);
    }
  }

  function cambiarTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    document.querySelectorAll(".tab-panel").forEach(function (panel) {
      panel.classList.toggle("active", panel.id === "tab-" + tab);
    });
  }

  function construirHTMLVistaPrevia() {
    const counts = obtenerCounts();
    const empleadosHTML = empleadosAgregados.map(function (emp) {
      const diasHTML = obtenerDiasEmpleado(emp)
        .filter((dia) => Number(dia.horas || 0) > 0)
        .map((dia) => `
          <tr>
            <td>${escapeHTML(formatearDiaConFecha(dia.fecha, dia.dia))}</td>
            <td>${escapeHTML(formatearFechaCorta(dia.fecha))}</td>
            <td>${escapeHTML(dia.entrada)}</td>
            <td>${escapeHTML(dia.salida)}</td>
            <td>${Number(dia.horas || 0)}</td>
            <td>${escapeHTML(dia.justificacion)}</td>
          </tr>
        `).join("");

      return `
        <section class="preview-empleado">
          <h4>${escapeHTML(emp.numEmpleado || emp.numero)} - ${escapeHTML(emp.nombre || "Sin nombre")}</h4>
          <p><strong>Departamento:</strong> ${escapeHTML(emp.departamento || "-")} | <strong>Puesto:</strong> ${escapeHTML(emp.puesto || "-")} | <strong>Total:</strong> ${Number(emp.totalHoras || 0)} horas</p>
          <table>
            <thead>
              <tr><th>Dia</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Justificacion</th></tr>
            </thead>
            <tbody>${diasHTML || '<tr><td colspan="6">Sin dias capturados.</td></tr>'}</tbody>
          </table>
        </section>
      `;
    }).join("");

    return `
      <article class="preview-documento">
        <h3>Tiempo Extra</h3>
        <p><strong>Periodo:</strong> ${escapeHTML(obtenerPeriodoTexto())}</p>
        <p><strong>Oficio:</strong> ${escapeHTML($("numeroOficio")?.value || "Sin oficio")}</p>
        <p><strong>Empleados:</strong> ${counts.empleados} | <strong>Total horas:</strong> ${counts.horas}</p>
        ${empleadosHTML || '<p class="empty-state">Sin empleados agregados.</p>'}
      </article>
    `;
  }

  function vistaPrevia() {
    actualizarResumenDocumentos();
    const preview = $("vistaPreviaTiempoExtra");
    if (!preview) return;
    preview.innerHTML = construirHTMLVistaPrevia();
    preview.hidden = false;
  }

  function generarPDF() {
    if (!empleadosAgregados.length) {
      alert("Agrega empleados antes de generar el PDF.");
      return;
    }

    const ventana = window.open("", "_blank");
    if (!ventana) {
      alert("Permite ventanas emergentes para generar el PDF.");
      return;
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Tiempo Extra</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
          h3, h4 { margin-bottom: 8px; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0 22px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-size: 12px; text-transform: uppercase; }
          .preview-empleado { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>${construirHTMLVistaPrevia()}</body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  async function buscarHistorial() {
    const client = getSupabaseClient();
    if (!client) {
      alert("No se pudo conectar con Supabase.");
      return;
    }

    try {
      let query = client
        .from("periodos_tiempo_extra")
        .select("*")
        .order("fecha_inicio", { ascending: false });

      const desde = $("historialDesde")?.value;
      const hasta = $("historialHasta")?.value;
      const anio = $("historialAnio")?.value;
      const empleadoFiltro = texto($("buscarEmpleadoHistorial")?.value).toLowerCase();

      if (desde) query = query.gte("fecha_inicio", desde);
      if (hasta) query = query.lte("fecha_fin", hasta);
      if (anio) query = query.eq("anio", Number(anio));

      const { data, error } = await query;
      if (error) throw error;

      let periodos = data || [];

      if (empleadoFiltro) {
        const empleadosRes = await client
          .from("tiempo_extra_empleados")
          .select("periodo_id,num_empleado,nombre");
        if (empleadosRes.error) throw empleadosRes.error;

        const periodosCoincidentes = new Set(
          (empleadosRes.data || [])
            .filter((emp) => {
              const numero = texto(emp.num_empleado).toLowerCase();
              const nombre = texto(emp.nombre).toLowerCase();
              return numero.includes(empleadoFiltro) || nombre.includes(empleadoFiltro);
            })
            .map((emp) => emp.periodo_id)
        );

        periodos = periodos.filter((periodo) => periodosCoincidentes.has(periodo.id));
      }

      renderHistorial(periodos);
    } catch (err) {
      console.error("Error al consultar historial:", err);
      alert("No se pudo consultar el historial.");
    }
  }

  function renderHistorial(periodos) {
    const tbody = $("tablaHistorial");
    if (!tbody) return;

    if (!periodos.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Sin resultados.</td></tr>';
      return;
    }

    tbody.innerHTML = periodos.map(function (periodo) {
      return `
        <tr>
          <td>${escapeHTML(formatearFechaCorta(periodo.fecha_inicio))} al ${escapeHTML(formatearFechaCorta(periodo.fecha_fin))}</td>
          <td>${escapeHTML(periodo.numero_oficio || "Sin oficio")}</td>
          <td>${Number(periodo.total_empleados || 0)}</td>
          <td>${Number(periodo.total_horas || 0)}</td>
          <td><button class="btn btn-secondary btn-sm" type="button" data-periodo-id="${escapeHTML(periodo.id)}">Cargar</button></td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("button[data-periodo-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cargarPeriodo(btn.dataset.periodoId);
      });
    });
  }

  async function cargarPeriodo(periodoId) {
    const client = getSupabaseClient();
    if (!client || !periodoId) return;

    try {
      const periodoRes = await client
        .from("periodos_tiempo_extra")
        .select("*")
        .eq("id", periodoId)
        .single();
      if (periodoRes.error) throw periodoRes.error;

      const empleadosRes = await client
        .from("tiempo_extra_empleados")
        .select("*")
        .eq("periodo_id", periodoId)
        .order("created_at", { ascending: true });
      if (empleadosRes.error) throw empleadosRes.error;

      const detallesRes = await client
        .from("tiempo_extra_detalles")
        .select("*")
        .eq("periodo_id", periodoId)
        .order("fecha", { ascending: true });
      if (detallesRes.error) throw detallesRes.error;

      periodoActual = periodoRes.data;
      $("periodoInicio").value = periodoActual.fecha_inicio || "";
      $("periodoFin").value = periodoActual.fecha_fin || "";
      $("numeroOficio").value = periodoActual.numero_oficio || "";
      $("fechaOficio").value = periodoActual.fecha_oficio || "";
      $("adscripcion").value = periodoActual.adscripcion || "";
      $("dirigidoA").value = periodoActual.destinatario || "";

      empleadosAgregados = (empleadosRes.data || []).map(function (emp) {
        const detalleDias = (detallesRes.data || [])
          .filter((dia) => dia.tiempo_extra_empleado_id === emp.id)
          .map((dia) => normalizarDia({
            dia: dia.dia_semana,
            fecha: dia.fecha,
            entrada: dia.entrada,
            salida: dia.salida,
            horas: dia.horas,
            justificacion: dia.justificacion
          }));

        return normalizarEmpleado({
          id: emp.id,
          empleadoId: emp.empleado_id,
          numEmpleado: emp.num_empleado,
          nombre: emp.nombre,
          direccion: emp.direccion,
          departamento: emp.departamento,
          puesto: emp.puesto,
          totalHoras: emp.total_horas,
          detalleDias
        });
      });

      renderTablaEmpleados();
      limpiarCapturaEmpleado();
      actualizarResumen();
      actualizarResumenDocumentos();
      cambiarTab("captura");
    } catch (err) {
      console.error("Error al cargar periodo:", err);
      alert("No se pudo cargar el reporte seleccionado.");
    }
  }

  window.TiempoExtra = {
    eliminarEmpleado,
    editarEmpleado,
    generarGeneradorIndividual,
    generarRelacionSemanal,
    generarOficioWord,
    generarPaqueteFormatos
  };
})();
