const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const service = fs.readFileSync(path.join(root, "js/services/acuerdos.js"), "utf8");
const notifications = fs.readFileSync(path.join(root, "supabase/migrations/027_notificar_acuerdo_asignado.sql"), "utf8");
const access = fs.readFileSync(path.join(root, "supabase/migrations/033_habilitar_acceso_acuerdos.sql"), "utf8");
const rls = fs.readFileSync(path.join(root, "supabase/migrations/034_corregir_rls_acuerdos.sql"), "utf8");
const ticketNotifications = fs.readFileSync(path.join(root, "supabase/migrations/036_notificaciones_tickets_trabajo.sql"), "utf8");

assert.match(service, /normalizarRolAcuerdos\(usuario\.rol\) !== "proveedor"/);
assert.match(service, /puedeEditarAcuerdo/);
assert.match(service, /esUsuarioAsignadoTurnado/);
assert.match(service, /const ETIQUETAS_ESTADO_TICKET/);
assert.match(service, /folio: `TK-/);
assert.match(service, /async function agregarComentarioTicket/);
assert.match(service, /busquedaInicial/);
assert.match(access, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.acuerdos TO anon, authenticated/);
assert.match(access, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.acuerdos_historial TO anon, authenticated/);
assert.match(rls, /CREATE POLICY "acuerdos_acceso_aplicacion"/);
assert.match(rls, /CREATE POLICY "acuerdos_historial_acceso_aplicacion"/);
assert.match(rls, /TO anon, authenticated[\s\S]*USING \(true\)[\s\S]*WITH CHECK \(true\)/);
assert.match(notifications, /notificar_acuerdo_asignado/);
assert.match(ticketNotifications, /Nuevo ticket asignado/);
assert.doesNotMatch(service, /\.eq\("password"/);

console.log("Acuerdos: turnado sin proveedores, permisos y notificaciones verificados.");
