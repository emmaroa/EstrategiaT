const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const ctx = {}; vm.runInNewContext(fs.readFileSync('js/core/rbac.js', 'utf8'), ctx);
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const cuenta = rol => ({ id:id(1), rol, activo:true, modulos_permitidos:['Vales'] });
for (const rol of ['Técnico','Técnico Vales']) {
  const u = cuenta(rol), ajeno = {rbac_creado_por:id(9)};
  assert.equal(ctx.ETRbac.puede(u,'Vales','cambiar_estatus',ajeno),true);
  assert.equal(ctx.ETRbac.puede(u,'Vales','cambiar_estatus',{...ajeno,rbac_cancelado:true}),false);
  assert.equal(ctx.ETRbac.puede({...u,modulos_permitidos:[]},'Vales','cambiar_estatus',ajeno),false);
  assert.equal(ctx.ETRbac.puede({...u,permisos_excepciones:{Vales:{cambiar_estatus:false}}},'Vales','cambiar_estatus',ajeno),false);
}
assert.equal(ctx.ETRbac.puede(cuenta('Técnico'),'Vales','editar',{rbac_creado_por:id(9)}),false);
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA et_privado;
      CREATE TABLE usuarios(id uuid PRIMARY KEY,usuario text,rol text,activo boolean,password text,modulos_permitidos jsonb);
      CREATE TABLE et_privado.sesiones_aplicacion(token_hash bytea PRIMARY KEY,usuario_id uuid,expira_en timestamptz);
      CREATE TABLE vales(id uuid PRIMARY KEY,estatus text,descripcion text,updated_at timestamptz);
      GRANT USAGE ON SCHEMA public TO anon; GRANT ALL ON usuarios,vales TO anon;
      ALTER TABLE vales ENABLE ROW LEVEL SECURITY;
      CREATE POLICY base ON vales FOR ALL TO anon USING(true) WITH CHECK(true);`);
    for (const [n,rol] of [[1,'Técnico'],[2,'Técnico Vales'],[3,'Consulta']]) {
      await db.query("INSERT INTO usuarios VALUES($1,$2,$3,true,'test','[\"Vales\"]')",[id(n),'u'+n,rol]);
      await db.query("INSERT INTO et_privado.sesiones_aplicacion VALUES(sha256(convert_to($1,'UTF8')),$2,now()+interval '1 hour')",['token'+n,id(n)]);
    }
    await db.query("INSERT INTO vales VALUES($1,'Pendiente','Original',null)",[id(10)]);
    await db.exec(fs.readFileSync('supabase/migrations/070_roles_acciones_cancelaciones.sql','utf8'));
    await db.exec(fs.readFileSync('supabase/migrations/077_administracion_roles.sql','utf8'));
    const sql = fs.readFileSync('supabase/migrations/081_estatus_vales_tecnicos.sql','utf8');
    await db.exec(sql); await db.exec(sql);
    const actor = async n => {
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.headers',$1,false)",[JSON.stringify({'x-et-session-token':'token'+n})]);
      await db.exec('SET ROLE anon');
    };
    for (const n of [1,2]) {
      await actor(n);
      for (const estatus of ['Entregado','Solventado','Pendiente']) {
        await db.query('UPDATE vales SET estatus=$1 WHERE id=$2',[estatus,id(10)]);
        assert.equal((await db.query('SELECT estatus FROM vales WHERE id=$1',[id(10)])).rows[0].estatus,estatus);
      }
      await assert.rejects(db.query("UPDATE vales SET estatus='Cancelado' WHERE id=$1",[id(10)]),/cancelaci/);
      await assert.rejects(db.query('DELETE FROM vales WHERE id=$1',[id(10)]),/Sin permiso/);
    }
    await actor(1);
    await assert.rejects(db.query("UPDATE vales SET estatus='Entregado',descripcion='Ajeno' WHERE id=$1",[id(10)]),/Sin permiso/);
    await actor(3); await assert.rejects(db.query("UPDATE vales SET estatus='Entregado' WHERE id=$1",[id(10)]),/Sin permiso/);
    await db.exec('RESET ROLE; ALTER TABLE usuarios DISABLE TRIGGER rbac_escritura;');
    await db.query("UPDATE usuarios SET permisos_excepciones='{\"Vales\":{\"cambiar_estatus\":false}}' WHERE id=$1",[id(1)]);
    await db.exec('ALTER TABLE usuarios ENABLE TRIGGER rbac_escritura;');
    await actor(1); await assert.rejects(db.query("UPDATE vales SET estatus='Entregado' WHERE id=$1",[id(10)]),/Sin permiso/);
    await db.exec('RESET ROLE; ALTER TABLE vales DISABLE TRIGGER rbac_escritura; UPDATE vales SET rbac_cancelado=true; ALTER TABLE vales ENABLE TRIGGER rbac_escritura;');
    await actor(2); await assert.rejects(db.query("UPDATE vales SET estatus='Entregado' WHERE id=$1",[id(10)]),/Sin permiso|cancelado/);
    await actor(999);
    assert.equal((await db.query("UPDATE vales SET estatus='Entregado' WHERE id=$1 RETURNING id",[id(10)])).rows.length,0);
    console.log('Vales: estatus para ambos técnicos, autoría, edición ajena, permisos revocados, cancelación, sesión e idempotencia verificados.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
