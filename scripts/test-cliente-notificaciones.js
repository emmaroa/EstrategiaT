const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  for (const order of [['supabase', 'auth'], ['auth', 'supabase']]) {
    let creados = 0;
    const context = { window: { addEventListener() {} }, document: { addEventListener() {}, getElementById: () => null },
      localStorage: { getItem: () => null }, console,
      supabase: { createClient() { creados++; return { id: creados }; } } };
    for (const name of [...order, ...order]) vm.runInNewContext(fs.readFileSync(`js/core/${name}.js`, 'utf8'), context);
    assert.equal(creados, 1);
  }
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      CREATE TABLE public.notificaciones(id integer PRIMARY KEY, titulo text, leida boolean DEFAULT false);
      ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
      INSERT INTO public.notificaciones(id,titulo) VALUES (1,'Prueba'); SET ROLE anon;`);
    await assert.rejects(db.query('SELECT * FROM public.notificaciones'), e => e.code === '42501');
    await db.exec('RESET ROLE');
    const sql = fs.readFileSync('supabase/migrations/055_restaurar_acceso_notificaciones.sql','utf8');
    await db.exec(sql); await db.exec(sql);
    for (const rol of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${rol}`);
      assert.equal((await db.query('SELECT * FROM public.notificaciones')).rows.length, 1);
      await db.exec('UPDATE public.notificaciones SET leida=true WHERE id=1');
      await assert.rejects(db.query('DELETE FROM public.notificaciones'), e => e.code === '42501');
      await db.exec('RESET ROLE');
    }
  } finally { await db.close(); }
  console.log('Cliente único con ambos órdenes de carga; notificaciones: consulta y lectura verificadas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
