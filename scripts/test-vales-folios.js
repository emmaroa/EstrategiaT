const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const db = new PGlite();
  const sql = fs.readFileSync('supabase/migrations/054_vales_folio_atomico.sql', 'utf8');
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      GRANT USAGE ON SCHEMA public TO anon;
      CREATE TABLE public.vales(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), folio text NOT NULL, observaciones text);
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.vales TO anon;`);
    const year = (await db.query("SELECT extract(year FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Hermosillo')::integer AS year")).rows[0].year;
    await db.query(`INSERT INTO public.vales(folio)
      SELECT lpad(n::text,4,'0') || '-' || $1::text || '-V' FROM generate_series(1,1500) n`, [year]);
    await db.query('INSERT INTO public.vales(folio) VALUES ($1),($1),($2)', [`1500-${year}-V`, `9999-${year - 1}-V`]);
    await db.exec(sql);
    await db.exec('SET ROLE anon');
    const insert = async (folio = 'repetido') => (await db.query('INSERT INTO public.vales(folio) VALUES ($1) RETURNING *', [folio])).rows[0];
    const first = await insert();
    assert.equal(first.folio, `1501-${year}-V`);
    const second = (await db.query('INSERT INTO public.vales(observaciones) VALUES ($1) RETURNING *', ['sin folio enviado'])).rows[0];
    assert.equal(second.folio, `1502-${year}-V`);
    await db.query('UPDATE public.vales SET observaciones=$1 WHERE id=$2', ['editado', first.id]);
    await assert.rejects(db.query('UPDATE public.vales SET folio=$1 WHERE id=$2', ['otro',first.id]), /no se puede modificar/);
    await assert.rejects(db.query('UPDATE et_privado.vales_consecutivos SET ultimo_numero=0'), e => e.code === '42501');
    await db.query('DELETE FROM public.vales WHERE id=$1', [second.id]);
    assert.equal((await insert()).folio, `1503-${year}-V`);
    await db.exec('BEGIN');
    await insert();
    await db.exec('ROLLBACK');
    assert.equal((await insert()).folio, `1504-${year}-V`);
    await db.exec('RESET ROLE');
    await db.exec(sql);
    assert.equal((await insert()).folio, `1505-${year}-V`);
    assert.equal((await db.query('SELECT count(*)::integer AS n FROM public.vales WHERE folio=$1', [`1500-${year}-V`])).rows[0].n, 3);
    await db.query('UPDATE et_privado.vales_consecutivos SET ultimo_numero=9999 WHERE anio=$1',[year]);
    assert.equal((await insert()).folio, `10000-${year}-V`);
    const page = fs.readFileSync('modulos/vales.html', 'utf8');
    assert.ok(!page.includes('obtenerSiguienteFolioVale'));
    assert.ok(page.includes('folioVale.value = valeGuardado.folio'));
    console.log('Vales: >1000 históricos, altas sin folio y clientes antiguos, edición, borrado, rollback, repetición de migración y consecutivos >9999 verificados.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
