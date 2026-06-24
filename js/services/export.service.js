/**
 * Exportación CSV / Excel / impresión PDF
 */
(function (global) {
  function escapeCSV(valor) {
    if (valor == null) return "";
    const str = String(valor).replace(/"/g, '""');
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? '"' + str + '"'
      : str;
  }

  function exportarCSV(nombreArchivo, columnas, filas) {
    const header = columnas.map(function (c) { return escapeCSV(c.label); }).join(",");
    const body = filas.map(function (fila) {
      return columnas.map(function (c) { return escapeCSV(fila[c.key]); }).join(",");
    }).join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + header + "\n" + body], {
      type: "text/csv;charset=utf-8;"
    });
    descargarBlob(blob, nombreArchivo.endsWith(".csv") ? nombreArchivo : nombreArchivo + ".csv");
  }

  function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    window.print();
  }

  function moneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN"
    });
  }

  global.ETExport = {
    exportarCSV,
    exportarPDF,
    moneda,
    escapeCSV
  };
})(window);
