(function (global) {
  const CONFIG = {
    requisicion: {
      modulo: "Requisiciones SIIF",
      tabla: "requis_siif",
      singular: "requisición",
      titulo: "Requisiciones SIIF",
      descripcion: "Captura la primera etapa del trámite.",
      campos: [
        { key: "folio", label: "Folio", required: true, placeholder: "0002720-00" },
        { key: "oficio", label: "Oficio", required: true, placeholder: "RB/0002720/2026" },
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
        { key: "tipo_procedimiento", label: "Tipo de procedimiento", value: "COMPRA DIRECTA" },
        { key: "dependencia", label: "Dependencia", required: true, wide: true },
        { key: "clasificacion", label: "Clasificación / partida", wide: true },
        { key: "justificacion", label: "Justificación", type: "textarea", required: true, wide: true }
      ],
      columnas: ["fecha", "folio", "oficio", "dependencia", "importe", "estatus"],
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
        { key: "folio", label: "Número de OC", type: "number", required: true },
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
        { key: "numero_requisicion", label: "Número de requisición", required: true, placeholder: "0002720-00" },
        { key: "oficio_requisicion", label: "Oficio de requisición", placeholder: "RB/0002720/2026" },
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
        { key: "numero_solicitud", label: "Número de solicitud", type: "number", required: true },
        { key: "fecha", label: "Fecha", type: "datetime-local", required: true },
        { key: "tipo_solicitud", label: "Tipo de solicitud", value: "SOLICITUD DE PAGO" },
        { key: "estatus", label: "Estatus", type: "select", required: true, value: "EMITIDA",
          options: ["BORRADOR", "EMITIDA", "ENVIADA", "PAGADA", "CANCELADA"] },
        { key: "importe", label: "Importe", type: "number", step: "0.01", required: true },
        { key: "referencia", label: "Referencia / oficio", required: true, placeholder: "RB/0002720/2026" },
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
        control = '<input id="siif_' + campo.key + '" type="' + (campo.type || "text") + '"' +
          (campo.step ? ' step="' + campo.step + '"' : "") + requerido + placeholder + ">";
      }
      return '<div class="' + clase + '"><label for="siif_' + campo.key + '">' +
        escapar(campo.label) + (campo.required ? " *" : "") + "</label>" + control + "</div>";
    }).join("");

    document.getElementById("encabezadoTablaSiif").innerHTML =
      "<tr>" + config.columnas.map(function (campo) {
        return "<th>" + escapar(etiquetaCampo(campo)) + "</th>";
      }).join("") + "<th>Acciones</th></tr>";
  }

  async function cargarProveedoresSiif() {
    const campoProveedor = config.campos.find(function (campo) { return campo.type === "provider"; });
    if (!campoProveedor) return;
    const select = document.getElementById("siif_" + campoProveedor.key);
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
    return registros.filter(function (registro) {
      return normalizar(config.campos.map(function (campo) {
        return registro[campo.key];
      }).join(" ")).includes(texto);
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

    document.getElementById("kpiCapturaTotal").textContent = registros.length;
    document.getElementById("kpiCapturaImporte").textContent = moneda(registros.reduce(function (total, fila) {
      return total + Number(fila.importe || 0);
    }, 0));
    document.getElementById("kpiCapturaFinalizados").textContent = registros.filter(function (fila) {
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
      payload[campo.key] = campo.type === "number"
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
  validarPermiso(config.modulo);
  ETLayout.inicializar(config.modulo);
  cargarProveedoresSiif();
  document.getElementById("btnNuevoRegistroSiif").addEventListener("click", function () { abrir(); });
  document.getElementById("btnGuardarRegistroSiif").addEventListener("click", guardar);
  document.getElementById("buscarCapturaSiif").addEventListener("input", function () {
    pagina = 1; renderizar();
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
