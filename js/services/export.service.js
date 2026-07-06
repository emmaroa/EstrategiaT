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

  function formatearFechaCSV(valor) {
    if (!valor) return "";
    const fecha = String(valor).split("T")[0];
    if (fecha.includes("/")) {
      const partesSlash = fecha.split("/");
      if (partesSlash.length === 3) {
        const primero = Number(partesSlash[0]);
        const segundo = Number(partesSlash[1]);
        if (primero > 12) return partesSlash[0].padStart(2, "0") + "/" + partesSlash[1].padStart(2, "0") + "/" + partesSlash[2];
        if (segundo > 12 || primero <= 12) return partesSlash[1].padStart(2, "0") + "/" + partesSlash[0].padStart(2, "0") + "/" + partesSlash[2];
      }
    }
    const partes = fecha.split("-");
    if (partes.length !== 3) return valor;
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  function obtenerValorCSV(fila, columna) {
    const valor = fila[columna.key];
    const key = String(columna.key || "").toLowerCase();
    if (key === "fecha" || key.startsWith("fecha_")) {
      return formatearFechaCSV(valor);
    }
    return valor;
  }

  function exportarCSV(nombreArchivo, columnas, filas) {
    const header = columnas.map(function (c) { return escapeCSV(c.label); }).join(",");
    const body = filas.map(function (fila) {
      return columnas.map(function (c) { return escapeCSV(obtenerValorCSV(fila, c)); }).join(",");
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
