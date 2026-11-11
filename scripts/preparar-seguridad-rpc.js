// Generación reproducible desde las definiciones entregadas por el administrador.
// No ejecuta SQL ni copia datos de negocio.
const fs=require('node:fs');
const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
const head=`-- Requiere 070 y 071. Definiciones revisadas del inventario del 11-11-2026.
BEGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.exigir_permiso(m text,a text,identidad uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();
BEGIN
 IF u IS NULL OR (identidad IS NOT NULL AND identidad::text<>u->>'id')
   OR NOT coalesce(et_privado.rbac_puede(u,m,a),false) THEN
   RAISE EXCEPTION 'Sesión o permiso inválido' USING ERRCODE='42501';
 END IF;
 RETURN (u->>'id')::uuid;
END $$;
REVOKE ALL ON FUNCTION et_privado.exigir_permiso(text,text,uuid) FROM PUBLIC,anon,authenticated;
`;
const patches={
 registrar_movimiento_inventario:"p_usuario_id := et_privado.exigir_permiso('Inventario','editar',p_usuario_id);\n  PERFORM et_privado.exigir_permiso('Inventario','crear');",
 respaldo_tablas:"PERFORM et_privado.exigir_permiso('Licencias','ver');",
 validar_admin_licencias:"PERFORM et_privado.exigir_permiso('Licencias','editar',p_usuario_id);",
 autorizar_cotizacion_xml:"PERFORM et_privado.exigir_permiso('Crear cotización',CASE WHEN p_editar THEN 'editar' ELSE 'ver' END,p_usuario);",
 eliminar_ingreso_taller:"PERFORM et_privado.exigir_permiso('Control de Taller','eliminar',p_usuario_id);"
};
let sql=head;
for(const [name,guard] of Object.entries(patches)){
 const f=source.funciones.filter(f=>f.nombre===name);
 if(f.length!==1)throw Error('Definición ambigua o ausente: '+name);
 const def=f[0].definicion;
 if(!/AS \$function\$\s*[\s\S]*?\bBEGIN\b/i.test(def))throw Error('Formato no esperado: '+name);
 sql+=def.replace(/(AS \$function\$[\s\S]*?\bBEGIN\b)/i,'$1\n  '+guard)+';\n';
}
sql+=`
CREATE OR REPLACE FUNCTION public.listar_usuarios_turnables_acuerdos()
RETURNS TABLE(id uuid,nombre text,usuario text,rol text,activo boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM et_privado.exigir_permiso('Acuerdos','ver');
 RETURN QUERY SELECT u.id,u.nombre::text,u.usuario::text,u.rol::text,u.activo
 FROM public.usuarios u WHERE u.activo IS TRUE AND et_privado.rbac_rol(u.rol)<>'proveedor'
 ORDER BY u.nombre;
END $$;
CREATE OR REPLACE FUNCTION public.usuario_actual_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT (et_privado.rbac_actor()->>'id')::uuid
$$;
CREATE OR REPLACE FUNCTION public.generar_folio_cotizacion_almacen() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM et_privado.exigir_permiso(
 CASE WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor'
 THEN 'Cotizaciones Proveedor' ELSE 'Gestión de Cotizaciones' END,'crear');
 RETURN 'COT-' || EXTRACT(YEAR FROM CURRENT_DATE)::integer || '-' ||
 lpad(nextval('public.cotizaciones_almacen_folio_seq')::text,4,'0');
END $$;
CREATE OR REPLACE FUNCTION public.usuario_actual_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT lower(btrim(et_privado.rbac_actor()->>'rol'))
$$;
-- RPC heredadas sin consumidor en el cliente actual; los folios siguen por triggers.
REVOKE ALL ON FUNCTION public.resolver_email_login(text),public.generar_folio(text)
 FROM PUBLIC,anon,authenticated;
-- Eliminar privilegios EXECUTE por defecto en funciones trigger: no son endpoints.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure firma FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','et_privado') AND p.prorettype='trigger'::regtype LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.firma);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
`;
const audit=source.funciones.find(f=>f.nombre==='auditar_movimiento'&&f.schema==='et_privado');
if(!audit || !audit.definicion.includes("actor := (cabeceras ->> 'x-et-usuario-id')::uuid;"))throw Error('Auditoría no reconocida');
const fixedAudit=audit.definicion
 .replace("actor := (cabeceras ->> 'x-et-usuario-id')::uuid;","actor := (et_privado.rbac_actor()->>'id')::uuid;")
 .replace("actor_origen := 'declarado_por_aplicacion'","actor_origen := 'sesion_validada'");
sql=sql.replace("NOTIFY pgrst,'reload schema';",fixedAudit+";\nREVOKE ALL ON FUNCTION et_privado.auditar_movimiento() FROM PUBLIC,anon,authenticated;\nNOTIFY pgrst,'reload schema';");
fs.writeFileSync('supabase/migrations/072_cerrar_accesos_rpc.sql',sql);
