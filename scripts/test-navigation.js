const fs = require("fs");
const path = require("path");
const assert = require("assert");

const layout = fs.readFileSync(path.resolve(__dirname, "../js/core/layout.js"), "utf8");

assert.match(layout, /prepararBuscadorNavegacion/, "Debe existir el buscador de modulos");
assert.match(layout, /leerListaNavegacion\("Favoritos", usuario\)/, "Los favoritos deben guardarse por usuario");
assert.match(layout, /leerListaNavegacion\("Recientes", usuario\)/, "Los recientes deben guardarse por usuario");
assert.match(layout, /permitidos\.includes\(modulo\)/, "Favoritos y recientes deben respetar permisos");
assert.match(layout, /registrarModuloReciente\(usuario, moduloActivo\)/, "Debe registrarse la navegacion reciente");

console.log("Navegacion: buscador, favoritos, recientes y permisos verificados.");
