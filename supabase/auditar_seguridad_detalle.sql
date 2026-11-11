-- Solo lectura de estructura y código SQL. No consulta registros de negocio.
-- Revisar antes de compartir: una función antigua podría contener secretos literales.
SELECT jsonb_pretty(jsonb_build_object(
 'columnas',(SELECT jsonb_agg(jsonb_build_object('schema',table_schema,'tabla',table_name,
   'columna',column_name,'tipo',udt_name,'nullable',is_nullable))
   FROM information_schema.columns WHERE table_schema IN ('public','et_privado')),
 'privilegios',(SELECT jsonb_agg(to_jsonb(x)) FROM information_schema.role_table_grants x
   WHERE table_schema IN ('public','et_privado') AND grantee IN ('PUBLIC','anon','authenticated')),
 'privilegios_columnas',(SELECT jsonb_agg(to_jsonb(x)) FROM information_schema.role_column_grants x
   WHERE table_schema IN ('public','et_privado') AND grantee IN ('PUBLIC','anon','authenticated')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('tabla',c.relname,'schema',n.nspname,
   'definicion',pg_get_triggerdef(t.oid))) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE NOT t.tgisinternal AND n.nspname IN ('public','et_privado')),
 'funciones',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'nombre',p.proname,
   'definicion',pg_get_functiondef(p.oid)))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname IN ('public','et_privado') AND p.prokind='f'
   AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass
     AND d.objid=p.oid AND d.deptype='e'))
)) AS detalle_seguridad;
