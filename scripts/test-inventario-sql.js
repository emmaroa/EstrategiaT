const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const db = new PGlite();
 try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO anon, authenticated; CREATE TABLE public.usuarios(id uuid PRIMARY KEY);');
  for (const file of ['046_inventario_codigos_ubicaciones.sql','047_restringir_politicas_inventario.sql']) {
   await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ''));
  }
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM public.inventario'), e => e.code === '42501');
  await db.exec('RESET ROLE');
  const migration = fs.readFileSync('supabase/migrations/053_inventario_login_actual.sql','utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.exec('ALTER TABLE public.categorias_inventario ENABLE ROW LEVEL SECURITY; SET ROLE anon');
  await db.query('SELECT * FROM public.categorias_inventario');
  await db.query("INSERT INTO public.ubicaciones_inventario(codigo,nombre) VALUES ('A','Almacen')");
  const id = (await db.query("INSERT INTO public.inventario(codigo,nombre) VALUES ('TEST','Prueba') RETURNING id")).rows[0].id;
  await db.query("SELECT public.registrar_movimiento_inventario($1,'entrada',5)",[id]);
  await db.query("SELECT public.registrar_movimiento_inventario($1,'salida',2)",[id]);
  assert.equal(Number((await db.query('SELECT stock_actual FROM public.inventario WHERE id=$1',[id])).rows[0].stock_actual),3);
  assert.equal((await db.query('SELECT * FROM public.inventario_movimientos')).rows.length,2);
  await assert.rejects(db.query("SELECT public.registrar_movimiento_inventario($1,'salida',4)",[id]));
  await assert.rejects(db.query('DELETE FROM public.inventario'),e=>e.code==='42501');
  await assert.rejects(db.query("INSERT INTO public.inventario_movimientos(inventario_id,tipo,cantidad) VALUES ($1,'entrada',1)",[id]),e=>e.code==='42501');
  console.log('OK: login actual, categorias, ubicaciones, movimientos atomicos, stock y permisos SQL; migracion repetible.');
 } finally { await db.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
