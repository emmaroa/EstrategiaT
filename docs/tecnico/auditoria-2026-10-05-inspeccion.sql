-- Auditoría EstrategiaT: consultas de sólo lectura, ejecutar como administrador.
-- No se ejecutaron contra producción durante la auditoría local.
-- No devuelve registros de negocio, contraseñas ni claves.

-- Tablas/vistas y activación efectiva de RLS.
SELECT n.nspname AS esquema, c.relname AS objeto, c.relkind,
       c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls,
       pg_get_userbyid(c.relowner) AS propietario, c.reloptions
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'et_privado', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm')
ORDER BY 1, 2;

-- Políticas: revisar todas, incluidas las permisivas que se combinan mediante OR.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'et_privado', 'storage')
ORDER BY 1, 2, 3;

-- Privilegios efectivos de tabla; considera pertenencia de roles/PUBLIC.
SELECT n.nspname AS esquema, c.relname AS tabla, r.rolname AS rol,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS lectura,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS alta,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS cambio,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS baja,
       has_table_privilege(r.oid, c.oid, 'TRUNCATE') AS vaciado
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN pg_roles r
WHERE n.nspname IN ('public', 'et_privado', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm')
  AND r.rolname IN ('anon', 'authenticated')
ORDER BY 1, 2, 3;

-- Los grants por columna pueden sobrevivir a REVOKE de privilegios de tabla.
SELECT table_schema, table_name, column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema IN ('public', 'et_privado')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY 1, 2, 3, 4;

-- Funciones: exposición EXECUTE, propietario, SECURITY DEFINER y search_path.
SELECT n.nspname AS esquema, p.proname AS funcion,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS security_definer, p.proconfig AS configuracion,
       pg_get_userbyid(p.proowner) AS propietario,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS ejecutable_anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS ejecutable_auth
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'et_privado') AND p.prokind = 'f'
ORDER BY 1, 2, 3;

-- Evitar que un rol cliente cree objetos usados por funciones privilegiadas.
SELECT n.nspname AS esquema, r.rolname AS rol,
       has_schema_privilege(r.oid, n.oid, 'USAGE') AS uso,
       has_schema_privilege(r.oid, n.oid, 'CREATE') AS crear
FROM pg_namespace n CROSS JOIN pg_roles r
WHERE n.nspname IN ('public', 'et_privado')
  AND r.rolname IN ('anon', 'authenticated') ORDER BY 1, 2;

-- Verificar que no haya BYPASSRLS en roles cliente.
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role');

-- Índices existentes antes de recomendar/adicionar otros.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Supabase Dashboard: confirmar además esquemas expuestos por Data API,
-- configuración Auth, límites REST, buckets públicos/privados y encabezados web.
-- No asumir que el repositorio refleja todas las modificaciones del despliegue.
