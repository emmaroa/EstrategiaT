const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const contexto = { window: {}, TextEncoder, Blob, Uint8Array, DataView };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/services/licencia-backup.js'), 'utf8'), contexto);
const { csv, zip, crc32 } = contexto.window.ETLicenseBackup;

(async () => {
  const tablas = [
    { nombre: 'vacia', columnas: ['id', 'nombre'], filas: [] },
    { nombre: 'datos', columnas: ['id', 'nombre', 'json'], filas: [
      { id: 1, nombre: 'á,"b"\r\nc', json: { texto: 'ñ' } },
      { id: 2, nombre: '=HYPERLINK("x")', json: null }
    ] },
    { nombre: 'muchas', columnas: ['id'], filas: Array.from({ length: 2505 }, (_, id) => ({ id })) }
  ];
  assert.equal(csv(tablas[0]), '\uFEFF"id","nombre"\r\n');
  assert.ok(csv(tablas[1]).includes('"á,""b""\r\nc"'));
  assert.ok(csv(tablas[1]).includes('"\'=HYPERLINK(""x"")"'));
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.throws(() => zip([]));
  assert.throws(() => zip([{ nombre: 'rota', columnas: [] }]));
  const blob = zip(tablas), bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer), decoder = new TextDecoder();
  let offset = 0;
  for (const tabla of tablas) {
    assert.equal(view.getUint32(offset, true), 0x04034b50);
    const size = view.getUint32(offset + 18, true), nameSize = view.getUint16(offset + 26, true);
    assert.equal(decoder.decode(bytes.slice(offset + 30, offset + 30 + nameSize)), tabla.nombre + '.csv');
    const data = bytes.slice(offset + 30 + nameSize, offset + 30 + nameSize + size);
    assert.equal(view.getUint32(offset + 14, true), crc32(data));
    assert.equal(decoder.decode(data), csv(tabla).replace(/^\uFEFF/, ''));
    offset += 30 + nameSize + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  const fin = bytes.length - 22;
  assert.equal(view.getUint32(fin, true), 0x06054b50);
  assert.equal(view.getUint16(fin + 10, true), tablas.length);
  assert.equal(view.getUint32(fin + 16, true), offset);
  assert.equal(offset + view.getUint32(fin + 12, true), fin);
  // Archivo temporal dentro del proyecto para verificación con un lector ZIP independiente.
  const output = process.argv[2];
  if (output) fs.writeFileSync(output, bytes);
  console.log('Licencia: CSV, Unicode, fórmulas, tablas vacías, 2,505 filas, CRC y ZIP correctos.');
})().catch(error => { console.error(error); process.exitCode = 1; });
