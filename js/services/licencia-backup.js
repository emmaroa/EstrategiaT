(function (global) {
  'use strict';
  const encoder = new TextEncoder();

  function csv(tabla) {
    function celda(valor) {
      let texto = valor == null ? '' : typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
      // Evita ejecutar fórmulas al abrir un CSV en una hoja de cálculo.
      if (typeof valor === 'string' && /^[\s]*[=+@-]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replace(/"/g, '""') + '"';
    }
    return '\uFEFF' + [tabla.columnas.map(celda).join(',')].concat(
      tabla.filas.map(fila => tabla.columnas.map(columna => celda(fila[columna])).join(','))
    ).join('\r\n') + '\r\n';
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // ZIP STORE estándar: sin librerías remotas; solo archivos CSV.
  function zip(tablas) {
    if (!Array.isArray(tablas) || !tablas.length) throw new Error('El servidor no devolvió tablas.');
    if (tablas.length > 65535) throw new Error('El respaldo excede el límite de archivos ZIP.');
    const partes = [], directorio = [];
    let offset = 0, tamDirectorio = 0;
    tablas.forEach(tabla => {
      if (!Array.isArray(tabla.columnas) || !Array.isArray(tabla.filas)) throw new Error('Respuesta de respaldo incompleta.');
      const nombre = encoder.encode(encodeURIComponent(tabla.nombre) + '.csv');
      const datos = encoder.encode(csv(tabla));
      const crc = crc32(datos);
      if (offset + datos.length + nombre.length + 30 >= 0xffffffff) throw new Error('El respaldo supera 4 GB.');
      const local = new Uint8Array(30), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); lv.setUint16(12, 33, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, datos.length, true);
      lv.setUint32(22, datos.length, true); lv.setUint16(26, nombre.length, true);
      const central = new Uint8Array(46), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true); cv.setUint16(14, 33, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, datos.length, true);
      cv.setUint32(24, datos.length, true); cv.setUint16(28, nombre.length, true);
      cv.setUint32(42, offset, true);
      partes.push(local, nombre, datos); directorio.push(central, nombre);
      offset += local.length + nombre.length + datos.length;
      tamDirectorio += central.length + nombre.length;
    });
    if (offset + tamDirectorio >= 0xffffffff) throw new Error('El respaldo supera 4 GB.');
    const fin = new Uint8Array(22), fv = new DataView(fin.buffer);
    fv.setUint32(0, 0x06054b50, true); fv.setUint16(8, tablas.length, true);
    fv.setUint16(10, tablas.length, true); fv.setUint32(12, tamDirectorio, true);
    fv.setUint32(16, offset, true);
    return new Blob(partes.concat(directorio, [fin]), { type: 'application/zip' });
  }
  global.ETLicenseBackup = { csv, zip, crc32 };
})(window);
