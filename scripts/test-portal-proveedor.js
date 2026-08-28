const assert = require("assert");
const fs = require("fs");
const path = require("path");

const portal = fs.readFileSync(
  path.join(__dirname, "..", "modulos", "portal-proveedor.html"),
  "utf8"
);

assert.match(portal, /function cargarRegistrosSiifParaProveedor\(/);
assert.match(portal, /\.range\(desde, desde \+ tamanoBloque - 1\)/);
assert.doesNotMatch(portal, /\.contains\("proveedores", \[proveedorVinculado\]\)/);
assert.match(portal, /cargarRegistrosSiifParaProveedor\(\s*"requis_siif"/);
assert.match(portal, /\.replace\(\/\\s\+\/g, " "\)/);
assert.match(
  portal,
  /requisicionesInicialesResultado\.data \|\| \[\]\)\.map\(normalizarRequisicionInicialSiif\)\.concat\(\s*requisicionesResultado\.data \|\| \[\]/
);

console.log("Portal proveedor: coincidencia normalizada, carga paginada y prioridad del seguimiento unificado verificadas.");
