const fs = require('node:fs');
const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
(async () => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE importaciones_siif(id uuid PRIMARY KEY,estado text);
    CREATE TABLE requis_siif(id integer PRIMARY KEY,importacion_id uuid,updated_at timestamptz,importe numeric);
    CREATE TABLE oc_siif(LIKE requis_siif INCLUDING ALL);
    CREATE TABLE sp_siif(LIKE requis_siif INCLUDING ALL);`);
  const sql = fs.readFileSync('supabase/migrations/068_cancelar_importaciones_siif.sql','utf8');
  await db.exec(sql); await db.exec(sql);
  const id='00000000-0000-4000-8000-000000000001';
  await db.query("INSERT INTO importaciones_siif VALUES($1,'Procesando')",[id]);
  for (const tabla of ['requis_siif','oc_siif','sp_siif']) await db.query(`INSERT INTO ${tabla} VALUES(1,$1,'2026-11-05',10)`,[id]);
  await db.query("UPDATE importaciones_siif SET estado='Fallida' WHERE id=$1",[id]);
  for (const tabla of ['requis_siif','oc_siif','sp_siif']) {
    await assert.rejects(db.query(`INSERT INTO ${tabla} VALUES(2,$1,now(),20)`,[id]),/cerrada o cancelada/);
    await assert.rejects(db.exec(`UPDATE ${tabla} SET importe=20,updated_at=now() WHERE id=1`),/cerrada o cancelada/);
    assert.equal((await db.query(`SELECT importe FROM ${tabla} WHERE id=1`)).rows[0].importe,'10');
    await db.exec(`UPDATE ${tabla} SET importe=11 WHERE id=1`);
    await db.exec(`INSERT INTO ${tabla} VALUES(3,NULL,now(),30)`);
  }
  await assert.rejects(db.query("UPDATE importaciones_siif SET estado='Procesada' WHERE id=$1",[id]),/no puede reabrirse/);
  await db.close();
  console.log('Cancelación SQL: tres tablas, rechazo de cargas cerradas, conservación de registros e idempotencia verificados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
