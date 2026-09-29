const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const user = '11111111-1111-4111-8111-111111111111';
const denied = '22222222-2222-4222-8222-222222222222';
const data = {
  id:null, folio:'',fecha:'2026-09-29',nota:'Entrega en taller',archivo:'prueba.xml',hash:'a'.repeat(64),uuid:'TEST-UUID',
  emisor:{Nombre:'Proveedor',Rfc:'AAA010101AAA'},receptor:{Nombre:'Taller'},origen:{Moneda:'MXN'},
  trasladosExtra:'0',retencionesExtra:'0',items:[{descripcion:'Pieza',cantidad:'2',precio:'100.005',descuento:'10',
    taxes:[{tipo:'Traslado',factor:'Tasa',impuesto:'002',base:'',tasa:'0.16',importe:'0',manual:false}]}]
};
(async()=>{
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO anon,authenticated;
      CREATE TABLE public.usuarios(id uuid PRIMARY KEY,usuario text,rol text,activo boolean,password text,modulos_permitidos jsonb DEFAULT '[]');
      INSERT INTO usuarios(id,usuario,rol,activo,password) VALUES ('${user}','compras','Compras',true,'test'),('${denied}','consulta','Consulta',true,'test');`);
    await db.exec(fs.readFileSync('supabase/migrations/056_crear_cotizacion_xml.sql','utf8'));
    await db.exec(fs.readFileSync('supabase/migrations/057_independizar_crear_cotizacion.sql','utf8'));
    await db.exec('SET ROLE anon');
    const save = q=>db.query('SELECT public.guardar_cotizacion_xml($1,$2,$3) AS q',[user,'test',q]);
    for (const table of ['cotizaciones_xml','cotizaciones_xml_conceptos','cotizaciones_xml_origen']) await assert.rejects(()=>db.query('SELECT * FROM '+table),e=>e.code==='42501');
    await assert.rejects(()=>db.query('SELECT public.listar_cotizaciones_xml($1,$2)',[denied,'test']),e=>e.code==='42501');
    await assert.rejects(()=>db.query('SELECT public.listar_cotizaciones_xml($1,$2)',[user,'incorrecta']),e=>e.code==='42501');
    const saved = (await save(data)).rows[0].q;
    assert.match(saved.folio,/^COT-XML-\d{4}-\d{4,}$/);
    const read = (await db.query('SELECT public.listar_cotizaciones_xml($1,$2) AS q',[user,'test'])).rows[0].q;
    assert.equal(read[0].nota,data.nota); assert.equal(read[0].items[0].cantidad,'2');
    await assert.rejects(()=>save(data),e=>e.code==='23505');
    saved.items[0].cantidad='3';
    const updated=(await save(saved)).rows[0].q; assert.equal(updated.revision,2);
    await assert.rejects(()=>save(saved),e=>e.code==='40001');
    const bad=structuredClone(updated);bad.items[0].cantidad='-1';
    await assert.rejects(()=>save(bad),e=>e.code==='22023');
    await db.exec('RESET ROLE');
    // El módulo funciona sin tablas de Gestión; ahora comprobar que tampoco las toca si existen.
    await db.exec("CREATE TABLE public.cotizaciones_almacen(folio text); CREATE SEQUENCE public.cotizaciones_almacen_folio_seq START 900;");
    await db.query('INSERT INTO public.cotizaciones_almacen VALUES ($1)',[saved.folio]);
    await db.exec(fs.readFileSync('supabase/migrations/057_independizar_crear_cotizacion.sql','utf8'));
    assert.equal((await db.query('SELECT folio FROM cotizaciones_xml')).rows[0].folio,saved.folio,'La actualización conserva folios previos');
    const totals=(await db.query('SELECT subtotal,descuento,impuestos,total FROM cotizaciones_xml')).rows[0];
    assert.equal(Number(totals.subtotal),300.02);assert.equal(Number(totals.impuestos),46.4);assert.equal(Number(totals.total),336.42);
    await db.query("UPDATE usuarios SET modulos_permitidos=$1 WHERE id=$2",[[{modulo:'Crear cotización',permiso:'ver'}],user]);
    await db.exec('SET ROLE anon');
    await db.query('SELECT public.listar_cotizaciones_xml($1,$2)',[user,'test']);
    await assert.rejects(()=>save(updated),e=>e.code==='42501');
    await db.exec('RESET ROLE');
    await db.query("UPDATE usuarios SET modulos_permitidos='[]',rol='SuperAdmin' WHERE id=$1",[user]);
    await db.exec('SET ROLE anon');
    const batch=await Promise.all([1,2,3,4,5].map(n=>save({...data,hash:String(n).repeat(64),uuid:'TEST-'+n})));
    assert.equal(new Set(batch.map(x=>x.rows[0].q.folio)).size,5);
    await save(updated); // Un mismo folio en Gestión no bloquea este módulo.
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM cotizaciones_almacen')).rows[0].n,1);
    assert.equal((await db.query('SELECT is_called FROM cotizaciones_almacen_folio_seq')).rows[0].is_called,false,'El consecutivo de Gestión no se utiliza');
    await db.exec('RESET ROLE');await db.query('UPDATE usuarios SET activo=false WHERE id=$1',[user]);await db.exec('SET ROLE anon');
    await assert.rejects(()=>db.query('SELECT public.listar_cotizaciones_xml($1,$2)',[user,'test']),e=>e.code==='42501');
    console.log('Cotización SQL: independencia de Gestión, actualización sin pérdida, guardado, recuperación, totales, folios propios, RLS y permisos aprobados.');
  } finally { await db.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
