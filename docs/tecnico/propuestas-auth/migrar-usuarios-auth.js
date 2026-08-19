#!/usr/bin/env node
"use strict";

const ejecutar = process.argv.includes("--execute");
const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const dominioTemporal = String(process.env.TEMP_EMAIL_DOMAIN || "temporal.estrategiat.app")
  .trim().toLowerCase().replace(/^@/, "");

if (!url || !secret) {
  console.error("Define SUPABASE_URL y SUPABASE_SECRET_KEY en la terminal.");
  process.exit(1);
}

const headers = {
  apikey: secret,
  Authorization: "Bearer " + secret,
  "Content-Type": "application/json"
};

async function request(ruta, opciones) {
  const respuesta = await fetch(url + ruta, Object.assign({ headers }, opciones || {}));
  const texto = await respuesta.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch (_) { cuerpo = texto; }
  if (!respuesta.ok) {
    const mensaje = cuerpo && (cuerpo.msg || cuerpo.message || cuerpo.error_description || cuerpo.error) || texto || respuesta.statusText;
    throw new Error(respuesta.status + " " + mensaje);
  }
  return cuerpo;
}

async function perfilesActivos() {
  return request("/rest/v1/usuarios?select=id,nombre,usuario,email,password,activo,auth_user_id&activo=eq.true&order=nombre.asc");
}

async function usuariosAuth() {
  const todos = [];
  for (let pagina = 1; ; pagina += 1) {
    const resultado = await request("/auth/v1/admin/users?page=" + pagina + "&per_page=1000");
    const lote = Array.isArray(resultado) ? resultado : (resultado.users || []);
    todos.push(...lote);
    if (lote.length < 1000) break;
  }
  return todos;
}

async function crearAuth(perfil) {
  return request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: perfil.email.trim().toLowerCase(),
      password: perfil.password,
      email_confirm: true,
      user_metadata: { nombre: perfil.nombre, usuario: perfil.usuario },
      app_metadata: { migrated_from: "public.usuarios" }
    })
  });
}

async function vincular(perfilId, authId, requiereCambio, email, requiereEmail) {
  await request("/rest/v1/usuarios?id=eq." + encodeURIComponent(perfilId), {
    method: "PATCH",
    headers: Object.assign({}, headers, { Prefer: "return=minimal" }),
    body: JSON.stringify({
      auth_user_id: authId,
      email: email,
      password_change_required: requiereCambio,
      email_change_required: requiereEmail
    })
  });
}

async function main() {
  console.log(ejecutar ? "MODO EJECUCION" : "MODO SIMULACION (no modifica datos)");
  const [perfiles, auth] = await Promise.all([perfilesActivos(), usuariosAuth()]);
  const authPorEmail = new Map(auth.filter(u => u.email).map(u => [u.email.toLowerCase(), u]));
  const correosPerfiles = new Set();
  const resumen = { listos: 0, creados: 0, vinculados: 0, omitidos: 0, errores: 0 };

  for (const perfil of perfiles) {
    const etiqueta = perfil.usuario + " (" + (perfil.nombre || "sin nombre") + ")";
    if (perfil.auth_user_id) {
      console.log("OMITIDO ya vinculado:", etiqueta);
      resumen.omitidos += 1;
      continue;
    }
    const correoOriginal = String(perfil.email || "").trim().toLowerCase();
    const requiereEmail = !correoOriginal || !correoOriginal.includes("@");
    const baseTemporal = String(perfil.usuario || "usuario").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]/g, ".").replace(/^\.+|\.+$/g, "") || "usuario";
    const email = requiereEmail
      ? baseTemporal + "." + String(perfil.id).slice(0, 8) + "@" + dominioTemporal
      : correoOriginal;
    if (correosPerfiles.has(email)) {
      console.log("ERROR correo repetido en perfiles:", email, "-", etiqueta);
      resumen.errores += 1;
      continue;
    }
    correosPerfiles.add(email);
    const existente = authPorEmail.get(email);
    if (existente) {
      console.log(ejecutar ? "VINCULANDO cuenta existente:" : "LISTO para vincular cuenta existente:", etiqueta, "->", email);
      if (ejecutar) await vincular(perfil.id, existente.id, false, email, requiereEmail);
      resumen.vinculados += 1;
      continue;
    }
    if (!perfil.password) {
      console.log("ERROR sin contrasena heredada:", etiqueta);
      resumen.errores += 1;
      continue;
    }
    console.log(ejecutar ? "CREANDO:" : "LISTO para crear:", etiqueta, "->", email);
    resumen.listos += 1;
    if (!ejecutar) continue;
    try {
      const creado = await crearAuth(perfil);
      const authUser = creado.user || creado;
      await vincular(perfil.id, authUser.id, true, email, requiereEmail);
      resumen.creados += 1;
    } catch (error) {
      console.log("ERROR al migrar", etiqueta + ":", error.message);
      resumen.errores += 1;
    }
  }

  console.log("\nResumen:", resumen);
  if (!ejecutar) console.log("Si el resultado es correcto, repite con --execute.");
  if (resumen.errores) process.exitCode = 2;
}

main().catch(function (error) {
  console.error("Migracion detenida:", error.message);
  process.exit(1);
});
