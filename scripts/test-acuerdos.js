const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const service = fs.readFileSync(path.join(root, "js/services/acuerdos.js"), "utf8");
const notifications = fs.readFileSync(path.join(root, "supabase/migrations/027_notificar_acuerdo_asignado.sql"), "utf8");

assert.match(service, /normalizarRolAcuerdos\(usuario\.rol\) !== "proveedor"/);
assert.match(service, /puedeEditarAcuerdo/);
assert.match(service, /esUsuarioAsignadoTurnado/);
assert.match(notifications, /notificar_acuerdo_asignado/);
assert.doesNotMatch(service, /\.eq\("password"/);

console.log("Acuerdos: turnado sin proveedores, permisos y notificaciones verificados.");
