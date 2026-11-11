-- Solo diagnóstico, ejecutar después de INSTALAR_SEGURIDAD.sql.
SELECT n.nspname AS esquema,c.relname AS tabla,c.relrowsecurity AS rls,
 (SELECT count(*) FROM pg_policies p WHERE p.schemaname=n.nspname
  AND p.tablename=c.relname AND p.policyname IN
  ('seguridad_ver','seguridad_crear','seguridad_editar','seguridad_eliminar')) AS barreras,
 has_table_privilege('anon',c.oid,'TRUNCATE') AS anon_puede_truncar
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','et_privado') AND c.relkind IN ('r','p')
ORDER BY n.nspname,c.relname;

-- Debe devolver cero, aun cuando se use la clave pública de la aplicación.
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.headers','{}',true);
SELECT count(*) AS usuarios_visibles_sin_sesion FROM public.usuarios;
ROLLBACK;
