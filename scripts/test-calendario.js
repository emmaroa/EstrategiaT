const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "modulos/calendario.html"), "utf8");
const service = fs.readFileSync(path.join(root, "js/services/calendario.js"), "utf8");
const permissions = fs.readFileSync(path.join(root, "js/core/permissions.js"), "utf8");
const layout = fs.readFileSync(path.join(root, "js/core/layout.js"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/037_calendario_interno.sql"), "utf8");
const audienceMigration = fs.readFileSync(path.join(root, "supabase/migrations/041_destinatarios_eventos_calendario.sql"), "utf8");
const colorMigration = fs.readFileSync(path.join(root, "supabase/migrations/042_color_eventos_calendario.sql"), "utf8");
assert.match(html, /id="calendarioGrid"/);
assert.match(html, /id="modalEvento"/);
assert.match(service, /from\("eventos_calendario"\)/);
assert.match(service, /from\("acuerdos"\)/);
assert.match(service, /ticket\.estado !== "Concluido"/);
assert.match(service, /datos\.fecha_fin.*datos\.fecha_inicio/);
assert.match(permissions, /CALENDARIO: "Calendario"/);
assert.match(layout, /"Calendario"/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.eventos_calendario/);
assert.match(html, /value="Seleccionados"/);assert.match(html, /id="buscarDestinatarioEvento" type="search"/);assert.match(html, /class="destinatarios-resultados"/);
assert.match(service, /evento\.destinatarios/);assert.match(service, /destinatariosSeleccionados/);assert.match(service, /Selecciona al menos un usuario/);
assert.match(service, /\.neq\("rol","Proveedor"\)/);assert.match(service, /normalizar\(u\.rol\)!=="proveedor"/);assert.match(service, /destinatariosEventoSeleccionados/);
assert.match(audienceMigration, /destinatarios UUID\[\]/);assert.match(audienceMigration, /'Seleccionados'/);
assert.match(html, /id="eventoColor" type="color"/);assert.match(service, /evento\.creado_por===usuarioCalendario\(\)\?\.id/);assert.match(service, /Editar evento/);assert.match(service, /formatearRangoEvento/);assert.match(colorMigration, /ADD COLUMN IF NOT EXISTS color/);
const vm = require("vm");
let usuarioPrueba = { id: "creador" };
let soloLectura = false;
const elementos = new Map();
function elemento(id) {
  if (!elementos.has(id)) elementos.set(id, {
    value: "", textContent: "", hidden: false,
    classList: { add() {}, remove() {} }, style: { setProperty() {} },
    setAttribute() {}, focus() {}
  });
  return elementos.get(id);
}
let escrituras = 0;
const contexto = vm.createContext({
  window: { supabaseClient: { from() { escrituras++; throw new Error("Escritura no autorizada"); } } },
  document: { addEventListener() {}, getElementById: elemento },
  localStorage: { getItem() { return JSON.stringify(usuarioPrueba); } },
  esSoloLectura: () => soloLectura,
  confirm: () => true
});
vm.runInContext(service, contexto);
const eventoPrueba = { id: "evento", creado_por: "creador", titulo: "Reunión", descripcion: "Primera línea\n<contenido>", fecha_inicio: "2026-09-05T09:00:00Z", fecha_fin: "2026-09-05T10:00:00Z", color: "#ff8800" };
assert.strictEqual(contexto.puedeEditarEvento(eventoPrueba), true);
contexto.abrirDetalleEvento(eventoPrueba);
assert.strictEqual(elemento("descripcionDetalleEvento").textContent, eventoPrueba.descripcion);
assert.strictEqual(elemento("editarDetalleEvento").hidden, false);
usuarioPrueba = { id: "invitado", rol: "SuperAdmin" };
assert.strictEqual(contexto.puedeEditarEvento(eventoPrueba), false);
contexto.abrirDetalleEvento(eventoPrueba);
assert.strictEqual(elemento("editarDetalleEvento").hidden, true);
contexto.abrirEvento(eventoPrueba);
assert.strictEqual(vm.runInContext("eventoEditandoId", contexto), null);
contexto.eventoPrueba = eventoPrueba;
vm.runInContext('eventosCalendario = [eventoPrueba]; eventoEditandoId = "evento";', contexto);
async function verificarProtecciones() {
  await contexto.guardarEvento();
  await contexto.eliminarEvento();
  assert.strictEqual(escrituras, 0);
  usuarioPrueba = { id: "creador" };
  soloLectura = true;
  assert.strictEqual(contexto.puedeEditarEvento(eventoPrueba), false);
  await contexto.guardarEvento();
  await contexto.eliminarEvento();
  assert.strictEqual(escrituras, 0);
  usuarioPrueba = null;
  assert.strictEqual(contexto.puedeEditarEvento({}), false);
  console.log("Calendario: detalle, color y restricciones de edición verificados.");
}
verificarProtecciones().catch(error => { console.error(error); process.exitCode = 1; });
