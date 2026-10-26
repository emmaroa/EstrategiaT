const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const page = fs.readFileSync('modulos/vales.html','utf8');
const fechaFuncion = page.match(/    function fechaHoyVale\(\) \{[\s\S]*?\n    \}/)[0];
for (const [instante,esperada] of [['2026-10-27T06:59:59Z','2026-10-26'],['2026-10-27T07:00:00Z','2026-10-27']]) {
  class Reloj extends Date { constructor() { super(instante); } }
  assert.equal(vm.runInNewContext(fechaFuncion+'; fechaHoyVale()', { Date:Reloj, Intl }),esperada);
}
assert.match(page, /id="fechaVale" readonly/);
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA et_privado;
      CREATE TABLE usuarios(id uuid PRIMARY KEY,rol text,activo boolean);
      CREATE TABLE et_privado.sesiones_aplicacion(token_hash bytea,usuario_id uuid,expira_en timestamptz);
      CREATE TABLE vales(id uuid DEFAULT gen_random_uuid(),fecha date,estatus text);
      CREATE TABLE auditoria(id uuid DEFAULT gen_random_uuid(),entidad_tipo text,entidad_id uuid,modulo text,created_at timestamptz DEFAULT now());
      ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
      CREATE POLICY amplia ON auditoria FOR SELECT TO anon USING(true);
      GRANT USAGE ON SCHEMA public TO anon;
      GRANT SELECT ON auditoria TO anon;
      GRANT SELECT,INSERT,UPDATE ON vales TO anon;`);
    const sql = fs.readFileSync('supabase/migrations/067_vales_fecha_historial.sql','utf8');
    await db.exec(sql); await db.exec(sql);
    const id = '11111111-1111-4111-8111-111111111111';
    await db.query(`INSERT INTO usuarios VALUES($1,'Admin',true);
      `,[id]);
    await db.query(`INSERT INTO et_privado.sesiones_aplicacion VALUES(sha256(convert_to('valido','UTF8')),$1,now()+interval '1 hour')`,[id]);
    await db.query(`INSERT INTO auditoria(entidad_tipo,entidad_id,modulo) SELECT 'vales',$1,'Vales' FROM generate_series(1,105)`,[id]);
    await db.exec('SET ROLE anon');
    const vale = (await db.query("INSERT INTO vales(fecha) VALUES('2000-01-01') RETURNING *")).rows[0];
    assert.equal(String(vale.fecha), String((await db.query("SELECT (statement_timestamp() AT TIME ZONE 'America/Hermosillo')::date AS fecha")).rows[0].fecha));
    await assert.rejects(db.query("UPDATE vales SET fecha='2000-01-01'"), /no se puede modificar/);
    await db.exec("UPDATE vales SET estatus='Entregado'");
    assert.equal((await db.query('SELECT * FROM auditoria')).rows.length,0);
    await assert.rejects(db.query('SELECT * FROM historial_vale($1,$2)', ['falso',id]), /Sin acceso/);
    assert.equal((await db.query('SELECT * FROM historial_vale($1,$2)', ['valido',id])).rows.length,100);
    assert.equal((await db.query('SELECT * FROM historial_vale($1,$2,100)', ['valido',id])).rows.length,5);
    await db.query("SELECT set_config('request.headers',$1,false)", [JSON.stringify({'x-et-session-token':'valido'})]);
    assert.equal((await db.query('SELECT * FROM auditoria')).rows.length,105);
    await db.exec('RESET ROLE');
    for (const rol of ['SuperAdmin','Jefe de Almacén','Admin','Administrador del Sistema','Coordinador','Proveedor','Técnico Vales']) {
      await db.query('UPDATE usuarios SET rol=$1',[rol]);
      await db.exec('SET ROLE anon');
      if (['Coordinador','Proveedor','Técnico Vales'].includes(rol)) {
        await assert.rejects(db.query('SELECT * FROM historial_vale($1,$2)', ['valido',id]), /Sin acceso/);
        assert.equal((await db.query('SELECT * FROM auditoria')).rows.length,0);
      } else assert.equal((await db.query('SELECT * FROM historial_vale($1,$2)', ['valido',id])).rows.length,100);
      await db.exec('RESET ROLE');
    }
    await db.exec("UPDATE usuarios SET rol='Admin',activo=false");
    await assert.rejects(db.query('SELECT * FROM historial_vale($1,$2)', ['valido',id]), /Sin acceso/);
    await db.exec("UPDATE usuarios SET activo=true; UPDATE et_privado.sesiones_aplicacion SET expira_en=now()-interval '1 second'");
    await assert.rejects(db.query('SELECT * FROM historial_vale($1,$2)', ['valido',id]), /Sin acceso/);
    console.log('Vales: fecha inmutable, altas con fecha del servidor, historial paginado, roles, sesión inválida/expirada y acceso directo protegidos.');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
