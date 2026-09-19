(function (global) {
  const servicio = global.ETInventario;
  let lector = null;
  let modalCodigoItem = null;

  const $ = (id) => document.getElementById(id);
  const dinero = (value) => Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const abrir = (id) => { const el = $(id); el.classList.add("is-open"); el.setAttribute("aria-hidden", "false"); };
  const cerrar = (id) => { const el = $(id); el.classList.remove("is-open"); el.setAttribute("aria-hidden", "true"); };

  function aplicarPermisosInventario() {
    document.querySelectorAll('#btnNuevoInventario, #btnNuevaUbicacion, [data-action="edit"], [data-action="move"], [data-lectura-movimiento]')
      .forEach(control => { control.hidden = !servicio.puedeEditar(); });
  }

  function ubicacion(item) {
    const ref = item.ubicacion_ref;
    if (ref) return `${ref.codigo} · ${ref.nombre}`;
    return item.ubicacion || "Sin ubicación";
  }

  function actualizarResumen(items, locations) {
    const activos = items.filter((item) => item.activo !== false);
    const bajos = activos.filter((item) => Number(item.stock_actual) <= Number(item.stock_minimo || 0));
    const valor = activos.reduce((total, item) => total + Number(item.stock_actual || 0) * Number(item.costo_unitario || 0), 0);
    $("kpiArticulos").textContent = activos.length;
    $("kpiStockBajo").textContent = bajos.length;
    $("kpiValor").textContent = dinero(valor);
    $("kpiUbicaciones").textContent = locations.length;
  }

  function render(items) {
    const query = $("buscarInventario").value.trim().toLowerCase();
    const filtro = $("filtroInventarioEstado").value;
    const visibles = items.filter((item) => {
      const texto = [item.codigo, item.codigo_barras, item.codigo_qr, item.nombre, ubicacion(item)].join(" ").toLowerCase();
      const bajo = Number(item.stock_actual || 0) <= Number(item.stock_minimo || 0);
      return (!query || texto.includes(query)) && (!filtro || (filtro === "bajo" && bajo) || (filtro === "sin" && Number(item.stock_actual || 0) === 0));
    });
    $("tablaInventario").innerHTML = visibles.length ? visibles.map((item) => {
      const bajo = Number(item.stock_actual || 0) <= Number(item.stock_minimo || 0);
      return `<tr><td><strong>${esc(item.codigo)}</strong><br><small>${esc(item.codigo_barras || item.codigo_qr || "Sin etiqueta")}</small></td><td>${esc(item.nombre)}<br><small>${esc(item.categoria?.nombre || item.unidad_medida || "")}</small></td><td>${Number(item.stock_actual || 0)} ${esc(item.unidad_medida || "")}</td><td class="inventario-location">${esc(ubicacion(item))}</td><td>${dinero(item.costo_unitario)}</td><td class="${bajo ? "stock-low" : "stock-ok"}">${bajo ? "Stock bajo" : "Disponible"}</td><td><button class="action-btn" type="button" data-action="code" data-id="${item.id}" title="Generar códigos">▣</button><button class="action-btn" type="button" data-action="move" data-id="${item.id}" title="Registrar movimiento">±</button><button class="action-btn" type="button" data-action="edit" data-id="${item.id}" title="Editar artículo">✎</button></td></tr>`;
    }).join("") : '<tr><td colspan="7" class="empty-state">No hay artículos que coincidan con la búsqueda.</td></tr>';
    aplicarPermisosInventario();
  }

  function llenarUbicaciones() {
    $("inventarioUbicacion").innerHTML = '<option value="">Sin ubicación</option>' + servicio.state.locations.map((location) => `<option value="${location.id}">${esc(location.codigo)} · ${esc(location.nombre)}</option>`).join("");
  }

  function limpiarFormulario() {
    $("formInventario").reset();
    $("inventarioId").value = "";
    $("inventarioUnidad").value = "PZA";
    $("inventarioMinimo").value = "0";
    $("inventarioMaximo").value = "0";
    $("inventarioCosto").value = "0";
    $("tituloInventario").textContent = "Nuevo artículo";
  }

  function editar(item) {
    if (!servicio.puedeEditar()) return;
    $("inventarioId").value = item.id;
    $("inventarioCodigo").value = item.codigo || "";
    $("inventarioNombre").value = item.nombre || "";
    $("inventarioBarras").value = item.codigo_barras || item.codigo_qr || "";
    $("inventarioUnidad").value = item.unidad_medida || "PZA";
    $("inventarioMinimo").value = item.stock_minimo || 0;
    $("inventarioMaximo").value = item.stock_maximo || 0;
    $("inventarioCosto").value = item.costo_unitario || 0;
    $("inventarioUbicacion").value = item.ubicacion_id || "";
    $("tituloInventario").textContent = "Editar artículo";
    abrir("modalInventario");
  }

  function generarCodigo(item) {
    modalCodigoItem = item;
    $("codigoTitulo").textContent = `${item.codigo} · ${item.nombre}`;
    $("qrPreview").innerHTML = "";
    $("barPreview").innerHTML = '<svg id="barcodeInventario" aria-label="Código de barras"></svg>';
    const valor = item.codigo_qr || item.codigo;
    new QRCode($("qrPreview"), { text: `INVENTARIO|${valor}`, width: 170, height: 170, correctLevel: QRCode.CorrectLevel.M });
    JsBarcode("#barcodeInventario", item.codigo_barras || item.codigo, { format: "CODE128", displayValue: true, height: 70, margin: 12 });
    abrir("modalCodigo");
  }

  function abrirMovimiento(item) {
    if (!servicio.puedeEditar()) return;
    $("formMovimiento").reset();
    $("movimientoId").value = item.id;
    $("movimientoArticulo").textContent = `${item.codigo} · ${item.nombre} · Existencia actual: ${item.stock_actual || 0} ${item.unidad_medida || ""}`;
    abrir("modalMovimiento");
  }

  function mostrarResultado(item, codigo) {
    const target = $("resultadoLectura");
    target.hidden = false;
    if (!item) {
      target.innerHTML = `No se encontró un artículo para <strong>${esc(codigo)}</strong>.`;
      return;
    }
    target.innerHTML = `<strong>${esc(item.codigo)} · ${esc(item.nombre)}</strong><br>Existencia: ${Number(item.stock_actual || 0)} ${esc(item.unidad_medida || "")}<br>Ubicación: ${esc(ubicacion(item))}<br><button class="btn-small" type="button" data-lectura-movimiento="${item.id}">Registrar movimiento</button>`;
    aplicarPermisosInventario();
  }

  function buscarCodigo(raw) {
    const codigo = raw.trim().replace(/^INVENTARIO\|/i, "");
    const item = servicio.state.items.find((candidate) => [candidate.codigo, candidate.codigo_barras, candidate.codigo_qr].some((value) => String(value || "").toLowerCase() === codigo.toLowerCase()));
    mostrarResultado(item, codigo);
  }

  async function iniciarLector() {
    if (!global.Html5Qrcode) return;
    if (lector) return;
    lector = new Html5Qrcode("lectorInventario");
    try {
      await lector.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 160 } }, (decoded) => {
        $("codigoManual").value = decoded;
        buscarCodigo(decoded);
        detenerLector();
      }, () => {});
    } catch (error) {
      $("resultadoLectura").hidden = false;
      $("resultadoLectura").textContent = "No fue posible abrir la cámara. Captura el código manualmente.";
    }
  }

  async function detenerLector() {
    if (!lector) return;
    try { await lector.stop(); } catch (_) {}
    lector.clear();
    lector = null;
  }

  async function cargar() {
    const result = await servicio.cargar();
    if (result.error) { alert(`No se pudo cargar inventario: ${result.error.message}`); return; }
    actualizarResumen(servicio.state.items, servicio.state.locations);
    llenarUbicaciones();
    render(servicio.state.items);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!global.validarPermiso('Inventario')) return;
    if (global.ETLayout) global.ETLayout.inicializar("Inventario");
    aplicarPermisosInventario();
    $("buscarInventario").addEventListener("input", () => render(servicio.state.items));
    $("filtroInventarioEstado").addEventListener("change", () => render(servicio.state.items));
    $("btnNuevoInventario").addEventListener("click", () => { if (!servicio.puedeEditar()) return; limpiarFormulario(); abrir("modalInventario"); });
    $("btnLeerCodigo").addEventListener("click", () => { abrir("modalLector"); iniciarLector(); });
    $("btnBuscarCodigo").addEventListener("click", () => buscarCodigo($("codigoManual").value));
    $("btnImprimirCodigo").addEventListener("click", () => global.print());
    document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", async () => { if (button.dataset.close === "modalLector") await detenerLector(); cerrar(button.dataset.close); }));
    $("formInventario").addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = await servicio.guardarItem({ id: $("inventarioId").value, codigo: $("inventarioCodigo").value, nombre: $("inventarioNombre").value, codigo_barras: $("inventarioBarras").value, codigo_qr: $("inventarioCodigo").value, unidad_medida: $("inventarioUnidad").value, stock_minimo: $("inventarioMinimo").value, stock_maximo: $("inventarioMaximo").value, costo_unitario: $("inventarioCosto").value, ubicacion_id: $("inventarioUbicacion").value, ubicacion: "" });
      if (result.error) { alert(`No se pudo guardar: ${result.error.message}`); return; }
      cerrar("modalInventario"); await cargar();
    });
    $("formMovimiento").addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = await servicio.registrarMovimiento({ inventario_id: $("movimientoId").value, tipo: $("movimientoTipo").value, cantidad: $("movimientoCantidad").value, referencia: $("movimientoReferencia").value, notas: $("movimientoNotas").value });
      if (result.error) { alert(`No se pudo registrar el movimiento: ${result.error.message}`); return; }
      cerrar("modalMovimiento"); await cargar();
    });
    $("tablaInventario").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const item = servicio.state.items.find((candidate) => candidate.id === button.dataset.id);
      if (!item) return;
      if (button.dataset.action === "code") generarCodigo(item);
      if (button.dataset.action === "move") abrirMovimiento(item);
      if (button.dataset.action === "edit") editar(item);
    });
    $("resultadoLectura").addEventListener("click", (event) => { const button = event.target.closest("[data-lectura-movimiento]"); if (!button) return; const item = servicio.state.items.find((candidate) => candidate.id === button.dataset.lecturaMovimiento); if (item) { cerrar("modalLector"); detenerLector(); abrirMovimiento(item); } });
    $("btnNuevaUbicacion").addEventListener("click", async () => { const codigo = prompt("Código de ubicación, por ejemplo A-01-02"); if (!codigo) return; const nombre = prompt("Nombre de la ubicación"); if (!nombre) return; const result = await servicio.guardarUbicacion({ codigo, nombre, pasillo: "", estante: "", nivel: "" }); if (result.error) alert(`No se pudo guardar la ubicación: ${result.error.message}`); else await cargar(); });
    cargar();
  });
})(window);
