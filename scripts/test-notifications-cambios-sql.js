const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const id=n=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
(async()=>{
  const db=new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE usuarios(id uuid PRIMARY KEY, usuario text, rol text, activo boolean DEFAULT true,
        modulos_permitidos jsonb, areas_permitidas jsonb, proveedor text, proveedores_permitidos text[]);
      CREATE TABLE notificaciones(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),usuario_id uuid,tipo text,titulo text,mensaje text,enlace text,leida boolean DEFAULT false,created_at timestamptz DEFAULT now());
      CREATE TABLE acuerdos(id uuid PRIMARY KEY,folio text,creado_por uuid,asignado_a uuid,estatus text,updated_at timestamptz);
      CREATE TABLE eventos_calendario(id uuid PRIMARY KEY,titulo text,creado_por uuid,alcance text,destinatarios uuid[],fecha_inicio timestamptz);
      CREATE TABLE peticiones(id uuid PRIMARY KEY,area text,estatus text,proveedor text);
      CREATE TABLE cotizaciones_almacen(id uuid PRIMARY KEY,folio text,peticion_id uuid,proveedor text,estatus text);
      CREATE TABLE auditoria(entidad_id uuid,entidad_tipo text,usuario_id uuid,metadata jsonb);`);
    const users=[
      [1,'uno','Técnico',null,[],null],[2,'dos','Técnico',null,[],null],
      [3,'tres','Técnico',null,[],null],[4,'coord','Coordinador',null,['Gasolina'],null],
      [5,'proveedor','Proveedor',null,[],'Proveedor A'],[6,'nuevo','Proveedor',null,[],'Proveedor B'],
      [7,'bloqueado','Coordinador',[{modulo:'Seguimiento Peticiones',permiso:'none'}],['Gasolina'],null]
    ];
    for(const [n,usuario,rol,mods,areas,proveedor] of users)await db.query('INSERT INTO usuarios(id,usuario,rol,modulos_permitidos,areas_permitidas,proveedor) VALUES($1,$2,$3,$4,$5,$6)',[id(n),usuario,rol,JSON.stringify(mods),JSON.stringify(areas),proveedor]);
    const sql=fs.readFileSync('supabase/migrations/064_notificaciones_cambios_usuario.sql','utf8');
    await db.exec(sql);await db.exec(sql);
    const recipients=async()=>new Set((await db.query('SELECT usuario_id FROM notificaciones')).rows.map(r=>r.usuario_id));
    const clear=()=>db.exec('DELETE FROM notificaciones');
    await db.query('INSERT INTO acuerdos VALUES($1,$2,$3,$4,$5,now())',[id(20),'T-20',id(1),id(2),'Abierto']);
    assert.deepEqual(await recipients(),new Set([id(1),id(2)]));await clear();
    await db.query('UPDATE acuerdos SET asignado_a=$1 WHERE id=$2',[id(3),id(20)]);
    assert.deepEqual(await recipients(),new Set([id(1),id(2),id(3)]));
    assert.equal((await db.query('SELECT enlace FROM notificaciones WHERE usuario_id=$1',[id(2)])).rows[0].enlace,null);
    await clear();await db.exec('UPDATE acuerdos SET updated_at=now()');assert.equal((await recipients()).size,0);
    await db.exec('BEGIN; DELETE FROM acuerdos; ROLLBACK;');assert.equal((await recipients()).size,0);
    await db.exec('DELETE FROM acuerdos');assert.deepEqual(await recipients(),new Set([id(1),id(3)]));await clear();
    await db.query('INSERT INTO peticiones VALUES($1,$2,$3,$4)',[id(30),'Gasolina','Pendiente','Proveedor A']);
    assert.deepEqual(await recipients(),new Set([id(4),id(5)]));await clear();
    await db.query('UPDATE peticiones SET proveedor=$1,area=$2 WHERE id=$3',['Proveedor B','Diesel',id(30)]);
    assert.deepEqual(await recipients(),new Set([id(4),id(5),id(6)]));await clear();
    await db.query('INSERT INTO cotizaciones_almacen VALUES($1,$2,$3,$4,$5)',[id(40),'COT-40',id(30),'Proveedor B','Pendiente']);
    assert.deepEqual(await recipients(),new Set([id(6)]));await clear();
    await db.query('UPDATE peticiones SET proveedor=$1 WHERE id=$2',['Proveedor A',id(30)]);await clear();
    await db.query('UPDATE cotizaciones_almacen SET estatus=$1 WHERE id=$2',['Validada',id(40)]);
    assert.deepEqual(await recipients(),new Set([id(6)]),'Related request cannot expose another supplier quotation');await clear();
    await db.query('INSERT INTO auditoria VALUES($1,$2,$3,$4)',[id(30),'peticiones',id(1),JSON.stringify({operacion:'INSERT'})]);
    await db.query('UPDATE peticiones SET estatus=$1 WHERE id=$2',['Solventada',id(30)]);
    assert.deepEqual(await recipients(),new Set([id(1),id(5)]),'Historical creator receives own request changes');await clear();
    // A supplier not related to either snapshot never receives another supplier's notice.
    await db.query('UPDATE cotizaciones_almacen SET estatus=$1 WHERE id=$2',['Rechazada',id(40)]);
    assert.deepEqual(await recipients(),new Set([id(6)]));await clear();
    await db.query('INSERT INTO eventos_calendario VALUES($1,$2,$3,$4,$5,now())',[id(50),'Privado',id(1),'Seleccionados',[id(2)]]);
    // Técnicos do not have calendar access by default: explicit grants are needed.
    await clear();
    await db.query('UPDATE usuarios SET modulos_permitidos=$1 WHERE id IN ($2,$3,$4)',[JSON.stringify(['Calendario']),id(1),id(2),id(3)]);await clear();
    await db.query('UPDATE eventos_calendario SET destinatarios=$1 WHERE id=$2',[[id(3)],id(50)]);
    assert.deepEqual(await recipients(),new Set([id(1),id(2),id(3)]));await clear();
    await db.exec('DELETE FROM eventos_calendario');assert.deepEqual(await recipients(),new Set([id(1),id(3)]));await clear();
    await db.query('UPDATE usuarios SET areas_permitidas=$1 WHERE id=$2',[JSON.stringify(['Infraestructura']),id(4)]);
    assert.deepEqual(await recipients(),new Set([id(4)]));
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query("SELECT et_privado.modulos_avisos('{}')"));
    console.log('Avisos SQL: altas, cambios, bajas, reasignación, privacidad, áreas, proveedores, permisos, cuenta, rollback e idempotencia aprobados.');
  } finally {await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
