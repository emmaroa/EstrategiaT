// PostgreSQL aislado en memoria. Nunca conecta con Supabase ni usa datos reales.
const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const propietario = '11111111-1111-4111-8111-111111111111';
const otro = '22222222-2222-4222-8222-222222222222';
const clave = 'clave-sintetica-exclusiva-para-pruebas-' + 'a'.repeat(32);

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      CREATE TABLE public.usuarios (id uuid PRIMARY KEY, usuario text, rol text, activo boolean, password text DEFAULT 'password-prueba');
      INSERT INTO public.usuarios (id, usuario, rol, activo) VALUES
      ('${propietario}', 'emma', 'SuperAdmin', true), ('${otro}', 'otro', 'SuperAdmin', true);`);
    for (const nombre of ['048_licencia_respaldo.sql', '049_titular_cliente_licencia.sql', '050_administracion_licencias.sql']) {
      await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', nombre), 'utf8'));
    }
    async function denegar(sql, params, codigo = '42501') {
      await assert.rejects(() => db.query(sql, params), error => error.code === codigo);
    }
    const listar = 'SELECT public.admin_listar_licencias($1, $2) AS datos';
    const guardar = 'SELECT public.admin_guardar_licencia($1,$2,$3,$4,$5,$6,$7,$8,$9) AS id';
    await db.exec('SET ROLE anon');
    await denegar(listar, [propietario, clave]); // sin configuración: fail closed
    await db.exec('RESET ROLE');
    const instalador = fs.readFileSync(path.join(__dirname, '../supabase/configurar_licencias_emma.sql'), 'utf8');
    const instalacion = await db.query(instalador);
    assert.equal(instalacion.rows[0].usuario, 'emma');
    assert.match(instalacion.rows[0].clave_privada_licencias, /^[a-f0-9]{64}$/);
    assert.equal((await db.query(instalador)).rows.length, 0);
    await db.query('UPDATE et_privado.licencias_administrador SET clave_sha256 = sha256(convert_to($1, \'UTF8\'))', [clave]);
    await db.exec('SET ROLE anon');
    await denegar('SELECT * FROM et_privado.licencias');
    await denegar('SELECT * FROM et_privado.licencias_administrador');
    await denegar('SELECT et_privado.validar_admin_licencias($1,$2)', [propietario, clave]);
    await denegar(listar, [otro, clave]);
    await denegar(listar, [propietario, 'incorrecta'.repeat(8)]);
    await denegar(listar, [propietario, null]);
    await denegar(guardar, [otro, clave, null, null, 'ET-ATAQUE', 'Intruso', null, '2030-01-01', '']);
    const inicial = (await db.query(listar, [propietario, clave])).rows[0].datos;
    assert.equal(inicial.length, 1);
    assert.equal(inicial[0].cliente, 'Municipio de Hermosillo - Talleres');
    assert.equal(inicial[0].es_actual, true);
    assert.equal(inicial[0].estado, 'Sin vigencia');
    await db.query(guardar, [propietario, clave, inicial[0].id, 1, 'ET-HMO-001', inicial[0].cliente, '2020-01-01', '2020-09-30', 'Prueba']);
    const vencida = (await db.query(listar, [propietario, clave])).rows[0].datos[0];
    assert.equal(vencida.estado, 'Vencida'); assert.equal(vencida.dias_restantes, 0);
    assert.equal(new Date(vencida.valida_hasta).toISOString(), '2020-10-01T07:00:00.000Z');
    const aviso = (await db.query('SELECT public.estado_licencia() AS datos')).rows[0].datos;
    assert.equal(aviso.titular, 'Brote Labs'); assert.equal(aviso.vencida, true);
    await denegar(guardar, [propietario, clave, inicial[0].id, 1, 'ET-HMO-001', inicial[0].cliente, null, '2035-09-30', ''], '40001');
    await denegar(guardar, [propietario, clave, null, null, 'ET-B', 'B', '2035-10-01', '2035-09-30', ''], '22023');
    await denegar(guardar, [propietario, clave, null, null, 'ET-HMO-001', 'B', null, null, ''], '23505');
    const nueva = (await db.query(guardar, [propietario, clave, null, null, 'ET-B', 'Cliente B', '2099-01-01', '2099-12-31', ''])).rows[0].id;
    const lista = (await db.query(listar, [propietario, clave])).rows[0].datos;
    assert.equal(lista.length, 2);
    assert.equal(lista.find(x => x.id === nueva).estado, 'Programada');
    assert.equal((await db.query('SELECT public.estado_licencia() AS datos')).rows[0].datos.cliente, inicial[0].cliente);
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM et_privado.licencias_historial')).rows[0].n, 2);
    await db.query('INSERT INTO et_privado.respaldo_config VALUES (true, sha256(convert_to($1, \'UTF8\')))', [clave]);
    await db.exec('SET ROLE anon');
    const backup = (await db.query('SELECT public.respaldo_tablas($1) AS datos', [clave])).rows[0].datos;
    assert.equal(backup.some(tabla => tabla.nombre.startsWith('licencias')), false);
    await db.exec('RESET ROLE');
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/051_roles_respaldo_completo.sql'), 'utf8'));
    const respaldo = 'SELECT public.respaldo_tablas($1,$2,$3) AS datos';
    for (const rol of ['SuperAdmin', 'super_admin', 'Director', 'Admin', 'Administrador del Sistema', 'Proveedor', 'jefe', 'Consulta', 'Coordinador']) {
      await db.query('UPDATE public.usuarios SET rol=$1 WHERE id=$2', [rol, propietario]);
      await db.exec('SET ROLE anon');
      if (['SuperAdmin', 'super_admin', 'Director', 'Admin'].includes(rol)) {
        assert.ok((await db.query(respaldo, [clave, propietario, 'password-prueba'])).rows[0].datos.length > 0);
      } else await denegar(respaldo, [clave, propietario, 'password-prueba']);
      await db.exec('RESET ROLE');
    }
    await db.query("UPDATE public.usuarios SET rol='Admin' WHERE id=$1", [propietario]);
    await db.exec('SET ROLE authenticated');
    await denegar(respaldo, [clave, propietario, 'incorrecta']);
    await denegar(respaldo, [clave, propietario, null]);
    await denegar(respaldo, ['incorrecta'.repeat(8), propietario, 'password-prueba']);
    await denegar(respaldo, [clave, '33333333-3333-4333-8333-333333333333', 'password-prueba']);
    await denegar('SELECT public.respaldo_tablas($1)', [clave], '42883');
    await denegar('SELECT et_privado.respaldo_tablas($1)', [clave]);
    await db.exec('RESET ROLE');
    await db.query('UPDATE public.usuarios SET activo=false WHERE id=$1', [propietario]);
    await db.exec('SET ROLE anon');
    await denegar(respaldo, [clave, propietario, 'password-prueba']);
    await db.exec('RESET ROLE');
    await db.query('UPDATE public.usuarios SET activo=true WHERE id=$1', [propietario]);
    await db.query("UPDATE public.usuarios SET rol='Admin' WHERE id=$1", [propietario]);
    await db.exec('SET ROLE anon'); await denegar(listar, [propietario, clave]);
    await db.exec('RESET ROLE');
    await db.query("UPDATE public.usuarios SET rol='SuperAdmin', activo=false WHERE id=$1", [propietario]);
    await db.exec('SET ROLE authenticated'); await denegar(listar, [propietario, clave]);
    await denegar('UPDATE public.licencia_uso SET cliente = \'Intruso\'');
    console.log('Licencias SQL: permisos, cuenta propietaria, fechas y concurrencia correctos. Respaldo: roles autorizados, contraseña, clave, cuentas inactivas y cierre de la API antigua verificados.');
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
