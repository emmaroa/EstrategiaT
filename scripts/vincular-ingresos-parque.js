const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "imports", "supabase", "01_ingresos_taller_electricas.csv");
const output = path.join(root, "imports", "supabase", "01_ingresos_taller_electricas_vinculados.csv");
const unmatchedOutput = path.join(root, "imports", "supabase", "06_unidades_sin_coincidencia_parque.csv");
const auditOutput = path.join(root, "imports", "supabase", "07_revision_vinculos_parque.csv");

function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); if (row.some(cell => cell !== "")) rows.push(row); row = []; value = "";
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift().map(header => header.replace(/^\uFEFF/, ""));
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function csvValue(value) { return '"' + String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ") + '"'; }
function writeCsv(file, headers, records) {
  const content = [headers, ...records.map(record => headers.map(header => record[header] ?? ""))]
    .map(row => row.map(csvValue).join(",")).join("\r\n");
  fs.writeFileSync(file, "\uFEFF" + content + "\r\n", "utf8");
}
function normalize(value) { return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[\s_-]+/g, ""); }

async function main() {
  const config = fs.readFileSync(path.join(root, "js", "core", "supabase.js"), "utf8");
  const url = config.match(/const SUPABASE_URL = "([^"]+)"/)?.[1];
  const key = config.match(/const SUPABASE_KEY = "([^"]+)"/)?.[1];
  if (!url || !key) throw new Error("No se encontró la configuración de Supabase.");
  const vehicles = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(url + "/rest/v1/parque_vehicular?select=id,numero_economico,numero_inventario,unidad_patrulla,descripcion,dependencia&order=id", {
      headers: { apikey: key, Authorization: "Bearer " + key, Range: offset + "-" + (offset + 999) }
    });
    if (!response.ok) throw new Error("Supabase respondió " + response.status + ".");
    const page = await response.json();
    vehicles.push(...page);
    if (page.length < 1000) break;
  }
  const index = new Map();
  const ambiguous = new Set();
  vehicles.forEach(vehicle => {
    [["numero_economico", vehicle.numero_economico], ["numero_inventario", vehicle.numero_inventario], ["unidad_patrulla", vehicle.unidad_patrulla]].forEach(([field, value]) => {
      const normalized = normalize(value);
      if (!normalized) return;
      if (index.has(normalized) && index.get(normalized).vehicle.id !== vehicle.id) ambiguous.add(normalized);
      else index.set(normalized, { vehicle, field });
    });
  });
  const rows = parseCsv(fs.readFileSync(source, "utf8"));
  const matched = []; const unmatched = []; const audit = [];
  rows.forEach(row => {
    const key = normalize(row.numero_economico);
    const match = index.get(key);
    if (!match || ambiguous.has(key)) { unmatched.push(Object.assign({}, row, { motivo_revision: ambiguous.has(key) ? "Número económico duplicado en parque" : "Sin coincidencia en parque" })); return; }
    const vehicle = match.vehicle;
    audit.push({ numero_economico_origen: row.numero_economico, vehiculo_id: vehicle.id, campo_coincidente: match.field, numero_economico_parque: vehicle.numero_economico, numero_inventario_parque: vehicle.numero_inventario, unidad_patrulla_parque: vehicle.unidad_patrulla });
    matched.push({
      vehiculo_id: vehicle.id,
      numero_economico: row.numero_economico,
      unidad_descripcion: vehicle.descripcion || row.tipo_unidad,
      dependencia: vehicle.dependencia || row.dependencia,
      tipo_movimiento: row.tipo_movimiento,
      concepto: row.concepto,
      descripcion: [row.descripcion, row.observaciones].filter(Boolean).join(" · "),
      refacciones: "",
      taller_ambito: normalize(row.taller_nombre).includes("INTERNO") ? "Interno" : "Foráneo",
      taller_nombre: row.taller_nombre,
      fecha_ingreso: row.fecha_ingreso,
      fecha_salida: row.fecha_salida,
      estatus: row.estatus,
      estatus_cotizacion: "No requerida",
      monto_cotizacion: ""
    });
  });
  const headers = ["vehiculo_id","numero_economico","unidad_descripcion","dependencia","tipo_movimiento","concepto","descripcion","refacciones","taller_ambito","taller_nombre","fecha_ingreso","fecha_salida","estatus","estatus_cotizacion","monto_cotizacion"];
  writeCsv(output, headers, matched);
  writeCsv(unmatchedOutput, [...Object.keys(rows[0] || {}), "motivo_revision"], unmatched);
  writeCsv(auditOutput, ["numero_economico_origen","vehiculo_id","campo_coincidente","numero_economico_parque","numero_inventario_parque","unidad_patrulla_parque"], audit);
  process.stdout.write(JSON.stringify({ parque: vehicles.length, vinculados: matched.length, sin_coincidencia_o_ambiguos: unmatched.length }));
}

main().catch(error => { console.error(error.message); process.exit(1); });
