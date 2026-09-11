(function (root) {
  "use strict";
  function leerCSV(texto) {
    const filas = []; let fila = [], campo = "", comillas = false;
    texto = texto.replace(/^\uFEFF/, "");
    const separador = texto.split(/\r?\n/)[0].includes(";") ? ";" : ",";
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (c === '"') {
        if (comillas && texto[i + 1] === '"') { campo += '"'; i++; }
        else comillas = !comillas;
      } else if (!comillas && (c === separador || c === "\n" || c === "\r")) {
        fila.push(campo.trim()); campo = "";
        if (c !== separador) {
          if (fila.some(Boolean)) filas.push(fila);
          fila = [];
          if (c === "\r" && texto[i + 1] === "\n") i++;
        }
      } else campo += c;
    }
    if (comillas) throw new Error("El CSV contiene comillas sin cerrar.");
    fila.push(campo.trim()); if (fila.some(Boolean)) filas.push(fila);
    return filas;
  }
  function minutos(hora) {
    if (!/^\d{1,2}:\d{2}(:00)?$/.test(hora)) return null;
    const [h, m] = hora.split(":").map(Number);
    return h < 24 && m < 60 ? h * 60 + m : null;
  }
  function horario(min) { return String(Math.floor(min / 60) % 24).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
  function duracion(min) { return Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0") + " min"; }
  function horasEnteras(minutos) {
    return Number.isFinite(minutos) && minutos > 0 ? Math.floor((minutos + 10) / 60) : 0;
  }
  function analizar(texto) {
    const filas = leerCSV(texto), encabezados = filas.shift() || [];
    const normalizar = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const columnas = encabezados.map(normalizar);
    const requeridas = ["id de empleado", "nombre", "apellido", "fecha", "primera checada", "ultima checada"];
    if (requeridas.some(c => !columnas.includes(c))) throw new Error("Faltan columnas: se requieren ID de Empleado, Nombre, Apellido, Fecha, Primera Checada y Última Checada.");
    const registros = filas.map((fila, i) => {
      const valor = c => fila[columnas.indexOf(c)] || "";
      const entrada = minutos(valor("primera checada")), salida = minutos(valor("ultima checada"));
      const fecha = valor("fecha"), date = new Date(fecha + "T12:00:00Z");
      let error = "";
      if (fila.length !== encabezados.length) error = "Número de columnas incorrecto";
      else if (!valor("id de empleado") || !valor("nombre")) error = "Falta empleado o nombre";
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fecha) error = "Fecha inválida";
      else if (entrada === null || salida === null) error = "Checada faltante o inválida";
      else if (salida <= entrada) error = "Checadas iguales o salida anterior: revisar";
      const trabajados = error ? 0 : salida - entrada;
      return { fila: i + 2, numero: valor("id de empleado"), nombre: [valor("nombre"), valor("apellido")].filter(Boolean).join(" "), departamento: valor("departamento"), puesto: valor("cargo"), fecha, entrada: valor("primera checada"), salida: valor("ultima checada"), trabajados, extra: Math.max(0, horasEnteras(trabajados) - 7) * 60, entradaExtra: error ? "" : horario(entrada + 420), error };
    });
    const claves = new Map();
    registros.forEach(r => { const k = r.numero + "|" + r.fecha; claves.set(k, (claves.get(k) || 0) + 1); });
    registros.forEach(r => { if (claves.get(r.numero + "|" + r.fecha) > 1) r.error = "Empleado y fecha duplicados en el CSV"; });
    return registros;
  }
  root.ETCalculoTiempoExtra = { analizar, duracion, horasEnteras };
  if (typeof module !== "undefined") module.exports = root.ETCalculoTiempoExtra;
})(typeof window !== "undefined" ? window : globalThis);
