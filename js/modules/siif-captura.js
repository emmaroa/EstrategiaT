(function (global) {
  const CONFIG = {
    requisicion: {
      modulo: "Requisiciones SIIF",
      tabla: "requis_siif",
      singular: "requisición",
      titulo: "Requisiciones SIIF",
      descripcion: "Captura la primera etapa del trámite.",
      campos: [
        { key: "folio", label: "Folio", required: true, placeholder: "Escribe sólo el número", format: "folio-requisicion" },
        { key: "oficio", label: "Oficio", required: true, placeholder: "Se genera automáticamente", format: "oficio-requisicion", readonly: true },
        { key: "fecha", label: "Fecha", type: "datetime-local", required: true },
        { key: "estatus", label: "Estatus", type: "select", required: true, value: "PENDIENTE",
          options: [
            "PENDIENTE",
            "EN PROCESO",
            "COTIZACION EN PORTAL",
            "INICIO DE PROCEDIMIENTO",
            "INSUFICIENCIA",
            "FINALIZADA",
            "CANCELADA"
          ] },
        { key: "importe", label: "Importe", type: "number", step: "0.01", required: true },
        { key: "proveedor", label: "Proveedor", type: "provider", wide: true },
        { key: "tipo_procedimiento", label: "Tipo de procedimiento", value: "COMPRA DIRECTA" },
        { key: "dependencia", label: "Dependencia", required: true, wide: true },
        { key: "clasificacion", label: "Clasificación / partida", wide: true },
        { key: "justificacion", label: "Justificación", type: "textarea", required: true, wide: true }
      ],
      columnas: ["fecha", "folio", "oficio", "proveedor", "dependencia", "importe", "estatus"],
      claveDuplicado: async function (client, registro, id) {
        let consulta = client.from("requis_siif").select("id").eq("oficio", registro.oficio);
        if (id) consulta = consulta.neq("id", id);
        return consulta.limit(1);
      }
    },
    oc: {
      modulo: "Órdenes de Compra SIIF",
      tabla: "oc_siif",
      singular: "orden de compra",
      titulo: "Órdenes de Compra SIIF",
      descripcion: "Relaciona cada orden con su requisición de origen.",
      campos: [
        { key: "folio", label: "Número de OC", type: "digits", numeric: true, required: true },
        { key: "fecha", label: "Fecha", type: "datetime-local", required: true },
        { key: "estatus", label: "Estatus", type: "select", required: true, value: "PENDIENTE",
          options: [
            "PENDIENTE",
            "EN PROCESO",
            "LLENADO DE OC",
            "OC AUTORIZADA",
            "ADJUDICADA",
            "FACTURA RECIBIDA",
            "FINALIZADA",
            "CANCELADA"
          ] },
        { key: "fecha_adjudicacion", label: "Fecha de adjudicación", type: "date" },
        { key: "importe", label: "Importe", type: "number", step: "0.01", required: true },
        { key: "proveedor", label: "Proveedor", type: "provider", required: true, wide: true },
        { key: "numero_requisicion", label: "Número de requisición", required: true, placeholder: "Escribe sólo el número", format: "folio-requisicion" },
        { key: "oficio_requisicion", label: "Oficio de requisición", placeholder: "Se genera automáticamente", format: "oficio-requisicion", readonly: true },
        { key: "tipo_procedimiento", label: "Tipo de procedimiento", value: "COMPRA DIRECTA", wide: true }
      ],
      columnas: ["fecha", "folio", "numero_requisicion", "proveedor", "importe", "estatus"],
      claveDuplicado: async function (client, registro, id) {
        let consulta = client.from("oc_siif").select("id,fecha").eq("folio", registro.folio);
        if (id) consulta = consulta.neq("id", id);
        return consulta.limit(10);
      }
    },
    sp: {
      modulo: "Solicitudes de Pago SIIF",
      tabla: "sp_siif",
      singular: "solicitud de pago",
      titulo: "Solicitudes de Pago SIIF",
      descripcion: "Registra la etapa de pago y su referencia de requisición.",
      campos: [
        { key: "numero_solicitud", label: "Número de solicitud", type: "digits", numeric: true, required: true },
        { key: "fecha", label: "Fecha", type: "datetime-local", required: true },
        { key: "tipo_solicitud", label: "Tipo de solicitud", value: "SOLICITUD DE PAGO" },
        { key: "estatus", label: "Estatus", type: "select", required: true, value: "EMITIDA",
          options: ["BORRADOR", "EMITIDA", "ENVIADA", "PAGADA", "CANCELADA"] },
        { key: "importe", label: "Importe", type: "number", step: "0.01", required: true },
        { key: "referencia", label: "Referencia / oficio", required: true, placeholder: "Escribe sólo el número de requisición", format: "oficio-requisicion" },
        { key: "beneficiario", label: "Beneficiario", required: true, wide: true },
        { key: "dependencia", label: "Dependencia", wide: true },
        { key: "fuente_financiamiento", label: "Fuente de financiamiento", wide: true },
        { key: "poliza_comprometido", label: "Póliza de comprometido" },
        { key: "descripcion", label: "Descripción", type: "textarea", required: true, wide: true }
      ],
      columnas: ["fecha", "numero_solicitud", "referencia", "beneficiario", "importe", "estatus"],
      claveDuplicado: async function (client, registro, id) {
        let consulta = client.from("sp_siif").select("id,fecha").eq("numero_solicitud", registro.numero_solicitud);
        if (id) consulta = consulta.neq("id", id);
        return consulta.limit(10);
      }
    }
  };

  const tipo = document.body.dataset.siifTipo;
  const config = CONFIG[tipo];
  if (!config) return;

  let registros = [];
  let requisicionesRelacion = [];
  let idEditando = null;
  let pagina = 1;
  const POR_PAGINA = 30;

  function escapar(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function normalizar(valor) {
    return String(valor || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function fecha(valor) {
    if (!valor) return "—";
    const partes = String(valor).split("T")[0].split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : valor;
  }

  function valorFechaInput(valor, type) {
    if (!valor) return "";
    if (type === "date") return String(valor).slice(0, 10);
    if (type === "datetime-local") return String(valor).replace(" ", "T").slice(0, 16);
    return valor;
  }

  function moneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function estaCancelado(registro) {
    return normalizar(registro && registro.estatus).includes("cancelad");
  }

  function etiquetaCampo(key) {
    return config.campos.find(function (campo) { return campo.key === key; })?.label || key;
  }

  function construirFormulario() {
    document.getElementById("tituloModuloSiif").textContent = config.titulo;
    document.getElementById("descripcionModuloSiif").textContent = config.descripcion;
    document.getElementById("tituloListadoSiif").textContent = config.titulo;
    document.getElementById("camposFormularioSiif").innerHTML = config.campos.map(function (campo) {
      const clase = "input-group" + (campo.wide ? " full" : "");
      const requerido = campo.required ? " required" : "";
      const placeholder = campo.placeholder ? ' placeholder="' + escapar(campo.placeholder) + '"' : "";
      let control;
      if (campo.type === "textarea") {
        control = '<textarea id="siif_' + campo.key + '" rows="4"' + requerido + placeholder + "></textarea>";
      } else if (campo.type === "select" || campo.type === "provider") {
        const opciones = campo.type === "provider"
          ? '<option value="">Selecciona proveedor</option>'
          : (campo.options || []).map(function (opcion) {
              return '<option value="' + escapar(opcion) + '">' + escapar(opcion) + "</option>";
            }).join("");
        control = '<select id="siif_' + campo.key + '"' + requerido + ">" + opciones + "</select>";
      } else {
        const lista = ((tipo === "oc" && campo.key === "numero_requisicion") ||
          (tipo === "sp" && campo.key === "referencia"))
          ? ' list="listaRequisicionesSiif"'
          : "";
        control = '<input id="siif_' + campo.key + '" type="' + (campo.type === "digits" ? "text" : (campo.type || "text")) + '"' +
          (campo.step ? ' step="' + campo.step + '"' : "") +
          (campo.type === "digits" || campo.format ? ' inputmode="numeric"' : "") +
          (campo.readonly ? " readonly" : "") + lista + requerido + placeholder + ">";
      }
      return '<div class="' + clase + '"><label for="siif_' + campo.key + '">' +
        escapar(campo.label) + (campo.required ? " *" : "") + "</label>" + control + "</div>";
    }).join("");

    document.getElementById("encabezadoTablaSiif").innerHTML =
      "<tr>" + config.columnas.map(function (campo) {
        return "<th>" + escapar(etiquetaCampo(campo)) + "</th>";
      }).join("") + "<th>Acciones</th></tr>";
    if (tipo === "oc" || tipo === "sp") {
      document.getElementById("camposFormularioSiif").insertAdjacentHTML(
        "beforeend",
        '<datalist id="listaRequisicionesSiif"></datalist>' +
        '<p class="helper-text full" id="infoRelacionSiif">Escribe el número para buscar la requisición relacionada.</p>'
      );
    }
  }

  function soloDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function numeroBaseRequisicion(valor) {
    const digitos = soloDigitos(valor);
    if (!digitos) return "";
    if (digitos.length > 7) return digitos.slice(0, 7);
    return digitos.padStart(7, "0");
  }

  function formatearFolioRequisicion(valor) {
    const digitos = soloDigitos(valor);
    if (!digitos) return "";
    const base = (digitos.length > 7 ? digitos.slice(0, 7) : digitos).padStart(7, "0");
    const sufijo = digitos.length > 7 ? digitos.slice(7, 9).padEnd(2, "0") : "00";
    return base + "-" + sufijo;
  }

  function anioFormulario() {
    const fechaInput = document.getElementById("siif_fecha");
    return String(fechaInput && fechaInput.value || "").slice(0, 4) ||
      String(new Date().getFullYear());
  }

  function formatearOficioRequisicion(valor) {
    const base = numeroBaseRequisicion(valor);
    return base ? "RB/" + base + "/" + anioFormulario() : "";
  }

  function configurarFormatosIdentificadores() {
    config.campos.forEach(function (campo) {
      const input = document.getElementById("siif_" + campo.key);
      if (!input) return;
      if (campo.type === "digits") {
        input.addEventListener("input", function () {
          input.value = soloDigitos(input.value);
        });
      }
      if (campo.format === "folio-requisicion" && !campo.readonly) {
        input.addEventListener("input", function () {
          input.value = soloDigitos(input.value).slice(0, 9);
        });
        input.addEventListener("blur", function () {
          input.value = formatearFolioRequisicion(input.value);
          sincronizarOficioRelacionado(campo.key, input.value);
          aplicarRequisicionRelacionada(input.value);
        });
      }
      if (campo.format === "oficio-requisicion" && !campo.readonly) {
        input.addEventListener("input", function () {
          input.value = soloDigitos(input.value).slice(0, 7);
        });
        input.addEventListener("blur", function () {
          input.value = formatearOficioRequisicion(input.value);
          aplicarRequisicionRelacionada(input.value);
        });
      }
    });
    document.getElementById("siif_fecha")?.addEventListener("change", actualizarOficioAutomatico);
  }

  async function cargarRequisicionesRelacion() {
    if (tipo !== "oc" && tipo !== "sp") return;
    const resultado = await supabaseClient.from("requis_siif")
      .select("id,folio,oficio,proveedor,dependencia,tipo_procedimiento,justificacion,importe,estatus,fecha")
      .order("fecha", { ascending: false })
      .limit(2000);
    if (resultado.error) {
      console.error("No se pudieron cargar requisiciones para autocompletar:", resultado.error);
      return;
    }
    requisicionesRelacion = resultado.data || [];
    const datalist = document.getElementById("listaRequisicionesSiif");
    if (datalist) {
      datalist.innerHTML = requisicionesRelacion.map(function (requisicion) {
        const valor = tipo === "sp" ? requisicion.oficio : requisicion.folio;
        const detalle = [requisicion.dependencia, requisicion.proveedor].filter(Boolean).join(" · ");
        return '<option value="' + escapar(valor || "") + '">' + escapar(detalle) + "</option>";
      }).join("");
    }
  }

  function buscarRequisicionRelacionada(valor) {
    const digitos = soloDigitos(valor);
    const base = digitos.slice(0, 7).replace(/^0+/, "") || "0";
    return requisicionesRelacion.find(function (requisicion) {
      const folioBase = soloDigitos(requisicion.folio).slice(0, 7).replace(/^0+/, "") || "0";
      const oficioBase = soloDigitos(requisicion.oficio).slice(0, 7).replace(/^0+/, "") || "0";
      return base === folioBase || base === oficioBase;
    });
  }

  function asignarSiVacio(id, valor) {
    const control = document.getElementById(id);
    if (control && !control.value && valor !== null && valor !== undefined) {
      control.value = valor;
    }
  }

  function aplicarRequisicionRelacionada(valor) {
    if (tipo !== "oc" && tipo !== "sp") return;
    const requisicion = buscarRequisicionRelacionada(valor);
    const info = document.getElementById("infoRelacionSiif");
    if (!requisicion) {
      if (info) info.textContent = "No se encontró una requisición con ese número.";
      return;
    }
    if (tipo === "oc") {
      const proveedor = document.getElementById("siif_proveedor");
      if (proveedor && requisicion.proveedor) {
        if (!Array.from(proveedor.options).some(function (opcion) {
          return opcion.value === requisicion.proveedor;
        })) proveedor.add(new Option(requisicion.proveedor + " (requisición)", requisicion.proveedor));
        proveedor.value = requisicion.proveedor;
      }
      asignarSiVacio("siif_tipo_procedimiento", requisicion.tipo_procedimiento);
    } else {
      asignarSiVacio("siif_beneficiario", requisicion.proveedor);
      asignarSiVacio("siif_dependencia", requisicion.dependencia);
      asignarSiVacio("siif_descripcion", requisicion.justificacion);
      asignarSiVacio("siif_importe", requisicion.importe);
    }
    if (info) {
      info.textContent = "✓ Requisición encontrada: " +
        [requisicion.folio, requisicion.dependencia, requisicion.proveedor].filter(Boolean).join(" · ");
    }
  }

  function sincronizarOficioRelacionado(campoOrigen, valor) {
    const destinoKey = campoOrigen === "folio" ? "oficio" : "oficio_requisicion";
    const destino = document.getElementById("siif_" + destinoKey);
    if (destino) destino.value = formatearOficioRequisicion(valor);
  }

  function actualizarOficioAutomatico() {
    if (tipo === "requisicion") {
      sincronizarOficioRelacionado("folio", document.getElementById("siif_folio").value);
    } else if (tipo === "oc") {
      sincronizarOficioRelacionado("numero_requisicion", document.getElementById("siif_numero_requisicion").value);
    } else if (tipo === "sp") {
      const referencia = document.getElementById("siif_referencia");
      if (referencia && referencia.value) referencia.value = formatearOficioRequisicion(referencia.value);
    }
  }

  async function cargarProveedoresSiif(valorSeleccionado) {
    const campoProveedor = config.campos.find(function (campo) { return campo.type === "provider"; });
    if (!campoProveedor) return;
    const select = document.getElementById("siif_" + campoProveedor.key);
    const valorActual = valorSeleccionado === undefined ? select.value : valorSeleccionado;
    const resultado = await supabaseClient.from("proveedores")
      .select("razon_social,activo")
      .eq("activo", true)
      .order("razon_social", { ascending: true });
    if (resultado.error) {
      console.error("No se pudo cargar el catálogo de proveedores:", resultado.error);
      ETLayout.toast("No se pudo cargar el catálogo de proveedores.", "error");
      return;
    }
    select.innerHTML = '<option value="">Selecciona proveedor</option>' +
      (resultado.data || []).map(function (proveedor) {
        return '<option value="' + escapar(proveedor.razon_social) + '">' +
          escapar(proveedor.razon_social) + "</option>";
      }).join("");
    if (valorActual && !Array.from(select.options).some(function (opcion) {
      return opcion.value === valorActual;
    })) {
      select.add(new Option(valorActual + " (histórico)", valorActual));
    }
    select.value = valorActual || "";
  }

  async function cargar() {
    const acumulado = [];
    let desde = 0;
    while (true) {
      const resultado = await supabaseClient.from(config.tabla).select("*")
        .order("fecha", { ascending: false }).range(desde, desde + 999);
      if (resultado.error) {
        console.error(resultado.error);
        ETLayout.toast("No se pudo cargar " + config.tabla + ": " + resultado.error.message, "error");
        return;
      }
      const bloque = resultado.data || [];
      acumulado.push.apply(acumulado, bloque);
      if (bloque.length < 1000) break;
      desde += 1000;
    }
    registros = acumulado;
    renderizar();
  }

  function filtrados() {
    const texto = normalizar(document.getElementById("buscarCapturaSiif").value);
    const desde = document.getElementById("fechaDesdeCapturaSiif").value;
    const hasta = document.getElementById("fechaHastaCapturaSiif").value;
    return registros.filter(function (registro) {
      const fechaRegistro = String(registro.fecha || "").slice(0, 10);
      const coincideTexto = normalizar(config.campos.map(function (campo) {
        return registro[campo.key];
      }).join(" ")).includes(texto);
      return coincideTexto &&
        (!desde || (fechaRegistro && fechaRegistro >= desde)) &&
        (!hasta || (fechaRegistro && fechaRegistro <= hasta));
    });
  }

  function renderizar() {
    const datos = filtrados();
    const totalPaginas = Math.max(1, Math.ceil(datos.length / POR_PAGINA));
    pagina = Math.min(Math.max(pagina, 1), totalPaginas);
    const inicio = (pagina - 1) * POR_PAGINA;
    const actuales = datos.slice(inicio, inicio + POR_PAGINA);
    document.getElementById("tablaCapturaSiif").innerHTML = actuales.length
      ? actuales.map(function (registro) {
          return "<tr>" + config.columnas.map(function (campo) {
            let valor = registro[campo];
            if (campo === "fecha" || campo.startsWith("fecha_")) valor = fecha(valor);
            if (campo === "importe") valor = moneda(valor);
            return "<td>" + escapar(valor ?? "—") + "</td>";
          }).join("") +
          '<td>' + ETLayout.iconButton("editar", "Editar " + config.singular, "editarRegistroSiif('" + registro.id + "')", "edit") + "</td></tr>";
        }).join("")
      : '<tr><td colspan="' + (config.columnas.length + 1) + '">No hay registros.</td></tr>';

    const registrosParaKpi = registros.filter(function (fila) { return !estaCancelado(fila); });
    document.getElementById("kpiCapturaTotal").textContent = registrosParaKpi.length;
    document.getElementById("kpiCapturaImporte").textContent = moneda(registrosParaKpi.reduce(function (total, fila) {
      return total + Number(fila.importe || 0);
    }, 0));
    document.getElementById("kpiCapturaFinalizados").textContent = registrosParaKpi.filter(function (fila) {
      return ["finalizada", "finalizado", "emitida", "enviado"].includes(normalizar(fila.estatus));
    }).length;
    document.getElementById("infoCapturaSiif").textContent = datos.length
      ? "Mostrando " + (inicio + 1) + "-" + (inicio + actuales.length) + " de " + datos.length
      : "Mostrando 0 registros";
    document.getElementById("paginaCapturaSiif").textContent = "Página " + pagina + " de " + totalPaginas;
    document.getElementById("btnCapturaAnterior").disabled = pagina <= 1;
    document.getElementById("btnCapturaSiguiente").disabled = pagina >= totalPaginas;
  }

  function abrir(id) {
    idEditando = id || null;
    const registro = id ? registros.find(function (fila) { return fila.id === id; }) : null;
    cargarProveedoresSiif(registro && registro.proveedor || "");
    document.getElementById("tituloModalCapturaSiif").textContent =
      (registro ? "Editar " : "Nueva ") + config.singular;
    config.campos.forEach(function (campo) {
      const input = document.getElementById("siif_" + campo.key);
      if (registro && (campo.type === "provider" || campo.type === "select") && registro[campo.key] &&
          !Array.from(input.options).some(function (opcion) { return opcion.value === registro[campo.key]; })) {
        input.add(new Option(registro[campo.key] + " (histórico)", registro[campo.key]));
      }
      input.value = registro
        ? valorFechaInput(registro[campo.key], campo.type)
        : (campo.value || "");
    });
    const infoRelacion = document.getElementById("infoRelacionSiif");
    if (infoRelacion) {
      infoRelacion.textContent = "Escribe el número para buscar la requisición relacionada.";
      if (registro) {
        aplicarRequisicionRelacionada(
          tipo === "oc" ? registro.numero_requisicion : registro.referencia
        );
      }
    }
    document.getElementById("modalCapturaSiif").classList.add("show");
    document.getElementById("modalCapturaSiif").setAttribute("aria-hidden", "false");
  }

  function cerrar() {
    idEditando = null;
    document.getElementById("modalCapturaSiif").classList.remove("show");
    document.getElementById("modalCapturaSiif").setAttribute("aria-hidden", "true");
  }

  function obtenerPayload() {
    const payload = {};
    config.campos.forEach(function (campo) {
      const valor = document.getElementById("siif_" + campo.key).value.trim();
      payload[campo.key] = campo.type === "number" || campo.numeric
        ? (valor === "" ? null : Number(valor))
        : (valor || null);
    });
    payload.origen = "PORTAL";
    return payload;
  }

  async function validarRelacion(payload) {
    if (tipo === "oc") {
      let consulta = supabaseClient.from("requis_siif").select("id,folio,oficio");
      consulta = payload.oficio_requisicion
        ? consulta.eq("oficio", payload.oficio_requisicion)
        : consulta.eq("folio", payload.numero_requisicion);
      const resultado = await consulta.limit(1);
      if (resultado.error || !(resultado.data || []).length) {
        return "No existe una requisición con ese número u oficio.";
      }
    }
    if (tipo === "sp") {
      const resultado = await supabaseClient.from("requis_siif").select("id")
        .eq("oficio", payload.referencia).limit(1);
      if (resultado.error || !(resultado.data || []).length) {
        return "La referencia no coincide con el oficio de una requisición.";
      }
    }
    return "";
  }

  async function guardar() {
    const payload = obtenerPayload();
    const faltantes = config.campos.filter(function (campo) {
      return campo.required && (payload[campo.key] === null || payload[campo.key] === "");
    });
    if (faltantes.length) {
      alert("Completa: " + faltantes.map(function (campo) { return campo.label; }).join(", "));
      return;
    }
    const errorRelacion = await validarRelacion(payload);
    if (errorRelacion) {
      alert(errorRelacion);
      return;
    }
    const duplicado = await config.claveDuplicado(supabaseClient, payload, idEditando);
    if (duplicado.error) {
      alert("No se pudo validar el registro: " + duplicado.error.message);
      return;
    }
    const coincidencias = duplicado.data || [];
    const anioPayload = String(payload.fecha || "").slice(0, 4);
    const existeDuplicado = tipo === "requisicion"
      ? coincidencias.length > 0
      : coincidencias.some(function (fila) { return String(fila.fecha || "").slice(0, 4) === anioPayload; });
    if (existeDuplicado) {
      alert("Ya existe un registro con ese identificador en el mismo año.");
      return;
    }

    const resultado = idEditando
      ? await supabaseClient.from(config.tabla).update(payload).eq("id", idEditando).select().single()
      : await supabaseClient.from(config.tabla).insert(payload).select().single();
    if (resultado.error) {
      alert("No se pudo guardar: " + resultado.error.message);
      return;
    }
    if (typeof registrarAuditoria === "function") {
      registrarAuditoria(config.modulo, idEditando ? "Actualizó registro SIIF" : "Creó registro SIIF", String(resultado.data.id));
    }
    cerrar();
    await cargar();
    ETLayout.toast("Registro guardado. Seguimiento SIIF se actualizó automáticamente.", "success");
  }

  global.editarRegistroSiif = function (id) { abrir(id); };
  global.cerrarCapturaSiif = cerrar;

  construirFormulario();
  configurarFormatosIdentificadores();
  validarPermiso(config.modulo);
  ETLayout.inicializar(config.modulo);
  cargarProveedoresSiif();
  cargarRequisicionesRelacion();
  document.getElementById("btnNuevoRegistroSiif").addEventListener("click", function () { abrir(); });
  document.getElementById("btnGuardarRegistroSiif").addEventListener("click", guardar);
  document.getElementById("buscarCapturaSiif").addEventListener("input", function () {
    pagina = 1; renderizar();
  });
  ["fechaDesdeCapturaSiif", "fechaHastaCapturaSiif"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", function () {
      pagina = 1;
      renderizar();
    });
  });
  document.getElementById("btnLimpiarFechasCapturaSiif").addEventListener("click", function () {
    document.getElementById("fechaDesdeCapturaSiif").value = "";
    document.getElementById("fechaHastaCapturaSiif").value = "";
    pagina = 1;
    renderizar();
  });
  document.getElementById("btnCapturaAnterior").addEventListener("click", function () {
    if (pagina > 1) { pagina -= 1; renderizar(); }
  });
  document.getElementById("btnCapturaSiguiente").addEventListener("click", function () {
    pagina += 1; renderizar();
  });
  document.getElementById("modalCapturaSiif").addEventListener("click", function (event) {
    if (event.target === this) cerrar();
  });
  cargar();
})(window);
