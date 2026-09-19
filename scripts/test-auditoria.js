const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const contexto = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/services/auditoria.service.js'), 'utf8'), contexto);
  const filas = Array.from({ length: 1205 }, (_, i) => ({ id: String(9999 - i), created_at: '2026-09-18T10:00:00Z' }));
  let pagina = 0, filtros = [];
  const client = { from() { return {
    select() { return this; }, order() { return this; }, limit() { return this; },
    eq(campo, valor) { filtros.push([campo, valor]); return this; },
    or(valor) { assert.ok(valor.includes('id.lt.')); return this; },
    then(resolve) { const inicio = pagina++ * 200; resolve({ data: filas.slice(inicio, inicio + 200) }); }
  }; } };
  const registros = await contexto.window.ETAuditoria.cargar(client, 'usuario-actual');
  assert.equal(registros.length, 1205); assert.equal(filtros.length, 8);
  assert.ok(filtros.every(x => x[0] === 'usuario_id' && x[1] === 'usuario-actual'));
  const errorClient = { from() { return { select() { return this; }, order() { return this; }, limit() { return this; }, then(resolve) { resolve({ error: { message: 'fallo' } }); } }; } };
  await assert.rejects(() => contexto.window.ETAuditoria.cargar(errorClient), /historial central/);

  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA et_privado;
      CREATE TABLE public.usuarios (id uuid PRIMARY KEY, nombre text, usuario text, rol text, activo boolean, password text);
      CREATE TABLE public.prueba_movimientos (id integer PRIMARY KEY, nombre text, metadata jsonb);
      CREATE TABLE public.eventos_calendario (id uuid PRIMARY KEY, titulo text);
      INSERT INTO usuarios VALUES ('11111111-1111-4111-8111-111111111111', 'Emma', 'emma', 'SuperAdmin', true, 'secreto');`);
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/006_auditoria_policies.sql'), 'utf8'));
    await db.exec('GRANT USAGE ON SCHEMA public TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO anon;');
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/052_auditoria_movimientos.sql'), 'utf8'));
    await db.query("SELECT set_config('request.headers', $1, false)", [JSON.stringify({ 'x-et-usuario-id': '11111111-1111-4111-8111-111111111111' })]);
    await db.query('INSERT INTO prueba_movimientos VALUES (1, $1, $2)', ['Antes', { nested: { password: 'no-publicar', access_token: 'tampoco' } }]);
    await db.exec("UPDATE prueba_movimientos SET nombre='Después' WHERE id=1; DELETE FROM prueba_movimientos WHERE id=1;");
    const auditoria = (await db.query("SELECT * FROM auditoria WHERE entidad_tipo='prueba_movimientos' ORDER BY created_at,id")).rows;
    assert.equal(auditoria.length, 3);
    assert.deepEqual(auditoria.map(x => x.metadata.operacion).sort(), ['DELETE', 'INSERT', 'UPDATE']);
    assert.ok(auditoria.every(x => x.usuario_nombre === 'Emma' && x.entidad_id === null));
    assert.equal(auditoria.find(x => x.metadata.operacion === 'UPDATE').metadata.antes.nombre, 'Antes');
    assert.equal(auditoria.find(x => x.metadata.operacion === 'UPDATE').metadata.despues.nombre, 'Después');
    assert.ok(!JSON.stringify(auditoria).includes('no-publicar'));
    assert.ok(!JSON.stringify(auditoria).includes('tampoco'));
    await db.exec("BEGIN; INSERT INTO prueba_movimientos VALUES (2,'Rollback',null); ROLLBACK;");
    assert.equal((await db.query('SELECT count(*)::int AS n FROM auditoria')).rows[0].n, 3);
    await db.query("SELECT set_config('request.headers', $1, false)", ['{"x-et-usuario-id":"invalido"}']);
    await db.exec("INSERT INTO eventos_calendario VALUES ('22222222-2222-4222-8222-222222222222', 'Reunión');");
    const calendario = (await db.query("SELECT * FROM auditoria WHERE modulo='Calendario'")).rows[0];
    assert.equal(calendario.usuario_id, null); assert.equal(calendario.metadata.identidad, 'sin_identificar');
    await db.exec('TRUNCATE prueba_movimientos;');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM auditoria WHERE accion='Vació tabla'")).rows[0].n, 1);
    await db.exec('SET ROLE anon');
    await assert.rejects(() => db.exec('DELETE FROM auditoria'), error => error.code === '42501');
    await assert.rejects(() => db.exec("UPDATE auditoria SET detalle='oculto'"), error => error.code === '42501');
    await db.query("INSERT INTO auditoria (modulo,accion,metadata) VALUES ('Usuarios','Evento manual',$1)", [{ antes: { password: 'ocultar-manual' } }]);
    assert.ok(!JSON.stringify((await db.query('SELECT metadata FROM auditoria')).rows).includes('ocultar-manual'));
    console.log('Auditoría: >1,000 filas, permisos de consulta, errores, altas/cambios/bajas/vaciado, rollback, identidad y secretos verificados.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
