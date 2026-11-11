-- Solo lectura. Ejecutar en SQL Editor y compartir el JSON (no contiene filas ni claves).
SELECT jsonb_pretty(jsonb_build_object(
  'tablas', (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'tabla',c.relname,
    'rls',c.relrowsecurity,'politicas',(SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p
      WHERE p.schemaname=n.nspname AND p.tablename=c.relname)))
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','et_privado') AND c.relkind IN ('r','p')),
  'vistas', (SELECT jsonb_agg(jsonb_build_object('nombre',c.relname,'opciones',c.reloptions,
    'definicion',pg_get_viewdef(c.oid))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('v','m')),
  'funciones', (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'nombre',p.proname,
    'argumentos',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,
    'config',p.proconfig,'anon',has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE')))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','et_privado'))
)) AS inventario_seguridad;
