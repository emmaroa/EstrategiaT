BEGIN;
CREATE SCHEMA IF NOT EXISTS et_privado;
CREATE TABLE IF NOT EXISTS et_privado.rbac_respaldo_usuarios AS SELECT id,to_jsonb(u)-'password' datos,now() respaldado_en FROM public.usuarios u;
REVOKE ALL ON et_privado.rbac_respaldo_usuarios FROM PUBLIC,anon,authenticated;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permisos_version integer NOT NULL DEFAULT 2;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permisos_excepciones jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS et_privado.rbac_base(rol text,modulo text,acciones jsonb,PRIMARY KEY(rol,modulo));
INSERT INTO et_privado.rbac_base VALUES
/* MATRIZ */
ON CONFLICT(rol,modulo) DO UPDATE SET acciones=excluded.acciones
WHERE to_regclass('et_privado.roles') IS NULL;
CREATE TABLE IF NOT EXISTS et_privado.rbac_tablas(tabla text PRIMARY KEY,modulo text NOT NULL);
INSERT INTO et_privado.rbac_tablas VALUES
/* TABLAS */
ON CONFLICT(tabla) DO UPDATE SET modulo=excluded.modulo;
REVOKE ALL ON et_privado.rbac_base,et_privado.rbac_tablas FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_rol(text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT regexp_replace(lower(translate(coalesce($1,''),'áéíóúÁÉÍÓÚ','aeiouAEIOU')),'[ _-]','','g')
$$;
CREATE OR REPLACE FUNCTION et_privado.rbac_actor() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT to_jsonb(u)-'password' FROM public.usuarios u JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=u.id
 WHERE s.token_hash=sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-et-session-token','UTF8'))
 AND s.expira_en>now() AND u.activo IS TRUE LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.obtener_perfil_acceso() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT et_privado.rbac_actor() $$;
REVOKE ALL ON FUNCTION public.obtener_perfil_acceso() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_perfil_acceso() TO anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='nombre') THEN
  EXECUTE 'CREATE OR REPLACE VIEW public.directorio_usuarios WITH (security_barrier=true) AS SELECT id,nombre,usuario,rol,activo FROM public.usuarios WHERE activo IS TRUE AND et_privado.rbac_actor() IS NOT NULL';
  GRANT SELECT ON public.directorio_usuarios TO anon,authenticated;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION et_privado.limite_modulos_anterior(u jsonb,m text,a text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE lista jsonb:=u->'modulos_permitidos'; x jsonb; nombre text; nivel text; edita boolean;
BEGIN
 IF jsonb_typeof(lista)='string' THEN
  BEGIN lista:=(lista #>> '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN SELECT jsonb_agg(btrim(v)) INTO lista FROM unnest(string_to_array(u->>'modulos_permitidos',',')) v WHERE btrim(v)<>'';
  END;
 END IF;
 IF jsonb_typeof(lista) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(lista)=0 THEN RETURN false; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(lista) LOOP
  nombre:=btrim(CASE WHEN jsonb_typeof(x)='string' THEN x #>> '{}' ELSE coalesce(x->>'modulo',x->>'nombre',x->>'module','') END);
  IF nombre='Requisiciones' THEN nombre:='Seguimiento SIIF'; END IF;
  IF nombre IS DISTINCT FROM m THEN CONTINUE; END IF;
  nivel:=CASE WHEN jsonb_typeof(x)='string' THEN 'editar' ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel',''))) END;
  edita:=nivel IN ('editar','edit','write','modificar');
  IF (a IN ('ver','exportar','imprimir') AND (edita OR nivel IN ('ver','vista','view','solo vista','moderar','moderador','moderate')))
    OR (a NOT IN ('ver','exportar','imprimir') AND edita) THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION et_privado.limite_modulos_anterior(jsonb,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_puede(u jsonb,m text,a text,r jsonb DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rol text:=et_privado.rbac_rol(u->>'rol'); permisos jsonb; ex jsonb; permitido boolean; visible boolean;
BEGIN
 IF u IS NULL OR coalesce((u->>'activo')::boolean,false)=false THEN RETURN false; END IF;
 IF m='Roles' THEN RETURN rol='superadmin'; END IF;
 IF NOT et_privado.limite_modulos_anterior(u,m,'ver') OR NOT et_privado.limite_modulos_anterior(u,m,a) THEN RETURN false; END IF;
 IF m='Usuarios' AND rol<>'superadmin' THEN RETURN false; END IF;
 IF m='Licencias' AND (rol<>'superadmin' OR lower(u->>'usuario')<>'emma') THEN RETURN false; END IF;
 IF a='eliminar' AND rol NOT IN ('superadmin','administradordelsistema') THEN RETURN false; END IF;
 IF a='aprobar_cancelacion' AND rol NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RETURN false; END IF;
 SELECT b.acciones INTO permisos FROM et_privado.rbac_base b WHERE b.rol=et_privado.rbac_rol(u->>'rol') AND b.modulo=m;
 ex:=u->'permisos_excepciones'->m;
 visible:=CASE WHEN jsonb_typeof(ex->'ver')='boolean' THEN (ex->>'ver')::boolean ELSE coalesce(permisos ? 'ver',false) AND et_privado.limite_modulos_anterior(u,m,'ver') END;
 permitido:=CASE WHEN jsonb_typeof(ex->a)='boolean' THEN (ex->>a)::boolean ELSE coalesce(permisos ? a,false) AND et_privado.limite_modulos_anterior(u,m,a) END;
 IF NOT visible OR NOT permitido THEN RETURN false; END IF;
 IF r IS NOT NULL AND a IN ('editar','cambiar_estatus','autorizar','solicitar_cancelacion') AND rol IN ('coordinador','coordinadorinfraestructura','tecnico') THEN
   RETURN coalesce(nullif(coalesce(r->>'rbac_creado_por',r->>'creado_por',r->>'creada_por_id',r->>'usuario_id',r->>'solicitante_id'),'')=u->>'id',false);
 END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_modulo(t text,r jsonb) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor' AND t='peticiones' THEN 'Peticiones de almacén'
 WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor' AND t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
 WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor' AND t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF'
 WHEN t='peticiones' AND r->>'origen_peticion'='coordinador' THEN 'Peticiones de Coordinadores' ELSE modulo END FROM et_privado.rbac_tablas WHERE tabla=t
$$;
CREATE OR REPLACE FUNCTION et_privado.rbac_proveedor(u jsonb,r jsonb) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(u->'proveedores_permitidos')='array' THEN u->'proveedores_permitidos' ELSE '[]'::jsonb END || jsonb_build_array(u->>'proveedor')) p
 WHERE nullif(btrim(p),'') IS NOT NULL AND et_privado.rbac_rol(p) IN (et_privado.rbac_rol(r->>'proveedor'),et_privado.rbac_rol(r->>'beneficiario')))
$$;
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_rol(u->>'rol')='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN true; END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_proveedor_fila(u jsonb,t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE permitido boolean:=false;
BEGIN
 IF et_privado.rbac_proveedor(u,r) THEN RETURN true; END IF;
 IF t='sp_siif' AND nullif(r->>'beneficiario','') IS NOT NULL THEN
   RETURN et_privado.rbac_proveedor(u,jsonb_build_object('proveedor',regexp_replace(r->>'beneficiario','^[^-]+ - ','')));
 END IF;
 IF t='requis_siif' AND to_regclass('public.oc_siif') IS NOT NULL THEN
  EXECUTE $q$SELECT EXISTS(SELECT 1 FROM public.oc_siif o WHERE et_privado.rbac_proveedor($1,to_jsonb(o))
   AND left(o.fecha::text,4)=left($2->>'fecha',4)
   AND ((nullif($2->>'oficio','') IS NOT NULL AND upper(btrim(o.oficio_requisicion))=upper(btrim($2->>'oficio')))
   OR (nullif(btrim(o.oficio_requisicion),'') IS NULL AND ltrim(o.numero_requisicion::text,'0')=ltrim($2->>'folio','0'))))$q$ INTO permitido USING u,r;
 ELSIF t='parque_vehicular' AND to_regclass('public.cotizaciones_almacen') IS NOT NULL THEN
  EXECUTE $q$SELECT EXISTS(SELECT 1 FROM public.cotizaciones_almacen c WHERE et_privado.rbac_proveedor($1,to_jsonb(c))
   AND nullif(c.unidad,'') IS NOT NULL AND c.unidad IN ($2->>'numero_economico',$2->>'numero_inventario',$2->>'unidad_patrulla'))$q$ INTO permitido USING u,r;
 END IF;
 RETURN permitido;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_escritura() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); anterior jsonb; nuevo jsonb; m text; accion text;
BEGIN
 -- Las escrituras derivadas de disparadores ya autorizados conservan su transacción.
 IF pg_trigger_depth()>1 THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF u IS NULL THEN RAISE EXCEPTION 'Sesión inválida o expirada' USING ERRCODE='42501'; END IF;
 IF TG_OP<>'INSERT' THEN anterior:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN nuevo:=to_jsonb(NEW); END IF;
 IF TG_TABLE_NAME='usuarios' AND TG_OP='UPDATE' AND anterior->>'id'=u->>'id'
   AND (anterior-ARRAY['password','avatar_url','dashboard_kpis'])=(nuevo-ARRAY['password','avatar_url','dashboard_kpis']) THEN
   IF anterior->'password' IS DISTINCT FROM nuevo->'password' AND length(coalesce(nuevo->>'password',''))<8 THEN
     RAISE EXCEPTION 'La contraseña requiere al menos 8 caracteres' USING ERRCODE='42501';
   END IF;
   RETURN NEW;
 END IF;
 m:=et_privado.rbac_modulo(TG_TABLE_NAME,coalesce(anterior,nuevo));
 accion:=CASE TG_OP WHEN 'INSERT' THEN 'crear' WHEN 'DELETE' THEN 'eliminar' ELSE 'editar' END;
 IF TG_TABLE_NAME='importaciones_siif' THEN accion:='importar'; END IF;
 IF NOT coalesce(et_privado.rbac_puede(u,m,accion,anterior),false) THEN RAISE EXCEPTION 'Sin permiso: % / %',m,accion USING ERRCODE='42501'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' THEN
   IF NOT coalesce(et_privado.rbac_proveedor(u,coalesce(anterior,nuevo)),false) OR (nuevo IS NOT NULL AND NOT coalesce(et_privado.rbac_proveedor(u,nuevo),false)) THEN RAISE EXCEPTION 'Registro de otro proveedor' USING ERRCODE='42501'; END IF;
   IF TG_OP='UPDATE' AND TG_TABLE_NAME='peticiones' AND (anterior-ARRAY['estatus_proveedor','fecha_entrega_proveedor','nota_proveedor','updated_at']) IS DISTINCT FROM (nuevo-ARRAY['estatus_proveedor','fecha_entrega_proveedor','nota_proveedor','updated_at']) THEN RAISE EXCEPTION 'Solo puede actualizar datos de entrega' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
   IF ((anterior->'estatus' IS DISTINCT FROM nuevo->'estatus' AND lower(coalesce(nuevo->>'estatus','')) LIKE 'cancelad%') OR (anterior->'estado' IS DISTINCT FROM nuevo->'estado' AND lower(coalesce(nuevo->>'estado','')) LIKE 'cancelad%')) AND NOT (TG_TABLE_NAME IN ('requis_siif','oc_siif','sp_siif') AND et_privado.rbac_puede(u,'Importar SIIF','importar')) THEN RAISE EXCEPTION 'Solicite la cancelación mediante el módulo Cancelaciones' USING ERRCODE='42501'; END IF;
   IF NOT coalesce(et_privado.rbac_puede(u,et_privado.rbac_modulo(TG_TABLE_NAME,nuevo),accion,anterior),false) THEN RAISE EXCEPTION 'No puede cambiar el módulo del registro' USING ERRCODE='42501'; END IF;
   IF (anterior->'estatus' IS DISTINCT FROM nuevo->'estatus' OR anterior->'estado' IS DISTINCT FROM nuevo->'estado') AND TG_TABLE_NAME<>'importaciones_siif'
     AND NOT coalesce(et_privado.rbac_puede(u,m,'cambiar_estatus',anterior),false) THEN RAISE EXCEPTION 'Sin permiso para cambiar estatus' USING ERRCODE='42501'; END IF;
   NEW.rbac_creado_por:=OLD.rbac_creado_por;
   IF NEW.rbac_creado_por IS NULL AND coalesce(anterior->>'creado_por',anterior->>'creada_por_id',anterior->>'usuario_id',anterior->>'solicitante_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
     NEW.rbac_creado_por:=coalesce(anterior->>'creado_por',anterior->>'creada_por_id',anterior->>'usuario_id',anterior->>'solicitante_id')::uuid;
   END IF;
   IF anterior->'estado_autorizacion' IS DISTINCT FROM nuevo->'estado_autorizacion' AND NOT coalesce(et_privado.rbac_puede(u,m,'autorizar',anterior),false) THEN RAISE EXCEPTION 'Sin permiso para autorizar' USING ERRCODE='42501'; END IF;
   IF anterior->'creada_por_id' IS DISTINCT FROM nuevo->'creada_por_id' THEN RAISE EXCEPTION 'No se puede cambiar la autoría' USING ERRCODE='42501'; END IF;
   IF anterior->'creado_por' IS DISTINCT FROM nuevo->'creado_por' THEN RAISE EXCEPTION 'No se puede cambiar la autoría' USING ERRCODE='42501'; END IF;
   IF NEW.rbac_cancelado IS DISTINCT FROM OLD.rbac_cancelado THEN RAISE EXCEPTION 'Utilice el flujo de cancelación' USING ERRCODE='42501'; END IF;
   IF OLD.rbac_cancelado THEN RAISE EXCEPTION 'El registro está cancelado' USING ERRCODE='42501'; END IF;
 ELSIF TG_OP='INSERT' THEN
   NEW.rbac_creado_por:=(u->>'id')::uuid;NEW.rbac_cancelado:=false;
   NEW:=jsonb_populate_record(NEW,jsonb_build_object('creado_por',u->>'id','creada_por_id',u->>'id'));
   IF nuevo->>'origen_peticion'='coordinador' AND coalesce(nuevo->>'estado_autorizacion','pendiente')<>'pendiente' AND NOT et_privado.rbac_puede(u,m,'autorizar') THEN RAISE EXCEPTION 'Sin permiso para autorizar' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_TABLE_NAME='usuarios' AND TG_OP<>'DELETE' THEN
   IF jsonb_typeof(NEW.permisos_excepciones)<>'object' THEN RAISE EXCEPTION 'Excepciones inválidas'; END IF;
   NEW.permisos_version:=2;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.rbac_tablas LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t.tabla) AND relkind IN ('r','p')) THEN CONTINUE; END IF;
  EXECUTE format('DROP TRIGGER IF EXISTS rbac_escritura ON public.%I',t.tabla);
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS rbac_creado_por uuid, ADD COLUMN IF NOT EXISTS rbac_cancelado boolean NOT NULL DEFAULT false',t.tabla);
  EXECUTE format('DROP TRIGGER IF EXISTS rbac_escritura ON public.%I',t.tabla);
  EXECUTE format('CREATE TRIGGER rbac_escritura BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION et_privado.rbac_escritura()',t.tabla);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tabla);
  EXECUTE format('DROP POLICY IF EXISTS rbac_lectura ON public.%I',t.tabla);
  EXECUTE format('CREATE POLICY rbac_lectura ON public.%I AS RESTRICTIVE FOR SELECT TO anon,authenticated USING (et_privado.rbac_lectura(%L,to_jsonb(%I)))',t.tabla,t.tabla,t.tabla);
 END LOOP;
END $$;
-- Evitar que una vista de consulta omita las políticas de sus tablas de origen.
DO $$ DECLARE v record; BEGIN
 FOR v IN SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname IN ('seguimiento_siif','kardex_inventario','reporte_control_area_unidades','reporte_control_area_dependencias','reporte_control_area_talleres','reporte_control_area_modelos') LOOP
  EXECUTE format('ALTER VIEW public.%I SET (security_invoker=true)',v.viewname);
 END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS public.solicitudes_cancelacion(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tabla text NOT NULL,registro_id uuid NOT NULL,modulo text NOT NULL,
 motivo text NOT NULL CHECK(length(btrim(motivo))>=5),solicitante_id uuid NOT NULL REFERENCES public.usuarios(id),
 estado text NOT NULL DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente','Aprobada','Rechazada')),
 resolucion text,resuelto_por uuid REFERENCES public.usuarios(id),created_at timestamptz NOT NULL DEFAULT now(),resuelto_en timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS cancelacion_pendiente_unica ON public.solicitudes_cancelacion(tabla,registro_id) WHERE estado='Pendiente';
ALTER TABLE public.solicitudes_cancelacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitudes_cancelacion FROM anon,authenticated;
GRANT SELECT ON public.solicitudes_cancelacion TO anon,authenticated;
DROP POLICY IF EXISTS consultar_cancelaciones ON public.solicitudes_cancelacion;
CREATE POLICY consultar_cancelaciones ON public.solicitudes_cancelacion FOR SELECT TO anon,authenticated USING (
 solicitante_id::text=et_privado.rbac_actor()->>'id' OR et_privado.rbac_puede(et_privado.rbac_actor(),'Cancelaciones','aprobar_cancelacion'));
CREATE OR REPLACE FUNCTION public.solicitar_cancelacion(p_tabla text,p_registro uuid,p_motivo text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();r jsonb;m text;salida uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM et_privado.rbac_tablas WHERE tabla=p_tabla AND tabla<>'usuarios') THEN RAISE EXCEPTION 'Tabla no disponible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_tabla AND column_name='id' AND udt_name='uuid') THEN RAISE EXCEPTION 'Esta tabla no admite cancelación por registro'; END IF;
 EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE id=$1 FOR UPDATE',p_tabla) INTO r USING p_registro;
 m:=et_privado.rbac_modulo(p_tabla,r);
 IF r IS NULL OR NOT coalesce(et_privado.rbac_puede(u,m,'solicitar_cancelacion',r),false) THEN RAISE EXCEPTION 'Sin permiso para solicitar cancelación' USING ERRCODE='42501'; END IF;
 IF (r->>'rbac_cancelado')::boolean THEN RAISE EXCEPTION 'Ya está cancelado'; END IF;
 INSERT INTO public.solicitudes_cancelacion(tabla,registro_id,modulo,motivo,solicitante_id)
 VALUES(p_tabla,p_registro,m,btrim(p_motivo),(u->>'id')::uuid) RETURNING id INTO salida;
 RETURN salida;
END $$;
CREATE OR REPLACE FUNCTION public.resolver_cancelacion(p_id uuid,p_aprobar boolean,p_motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();s public.solicitudes_cancelacion%ROWTYPE;
BEGIN
 IF NOT coalesce(et_privado.rbac_puede(u,'Cancelaciones','aprobar_cancelacion'),false) THEN RAISE EXCEPTION 'Sin permiso para resolver cancelaciones' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_motivo,'')))<5 THEN RAISE EXCEPTION 'Escriba el motivo de la resolución'; END IF;
 SELECT * INTO s FROM public.solicitudes_cancelacion WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR s.estado<>'Pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta o no existe'; END IF;
 UPDATE public.solicitudes_cancelacion SET estado=CASE WHEN p_aprobar THEN 'Aprobada' ELSE 'Rechazada' END,
 resolucion=p_motivo,resuelto_por=(u->>'id')::uuid,resuelto_en=now() WHERE id=p_id;
END $$;
-- El cambio del registro se ejecuta como efecto del trigger autorizado, no como borrado.
CREATE OR REPLACE FUNCTION et_privado.rbac_aplicar_cancelacion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.estado='Aprobada' AND OLD.estado='Pendiente' THEN
  EXECUTE format('UPDATE public.%I SET rbac_cancelado=true WHERE id=$1',NEW.tabla) USING NEW.registro_id;
  IF NOT FOUND THEN NULL; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aplicar_cancelacion ON public.solicitudes_cancelacion;
CREATE TRIGGER aplicar_cancelacion AFTER UPDATE ON public.solicitudes_cancelacion FOR EACH ROW EXECUTE FUNCTION et_privado.rbac_aplicar_cancelacion();
REVOKE ALL ON FUNCTION public.solicitar_cancelacion(text,uuid,text),public.resolver_cancelacion(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_cancelacion(text,uuid,text),public.resolver_cancelacion(uuid,boolean,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.autorizar_flujo_siif(p_usuario uuid,p_token text,p_editar boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb;
BEGIN
 SELECT to_jsonb(t)-'password' INTO u FROM public.usuarios t JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=t.id
 WHERE t.id=p_usuario AND t.activo IS TRUE AND s.expira_en>now() AND s.token_hash=sha256(convert_to(p_token,'UTF8'));
 IF NOT coalesce(et_privado.rbac_puede(u,'Seguimiento SIIF',CASE WHEN p_editar THEN 'editar' ELSE 'ver' END),false) THEN RAISE EXCEPTION 'Sin sesión o permiso para Seguimiento SIIF' USING ERRCODE='42501'; END IF;
 RETURN coalesce(u->>'nombre',u->>'usuario');
END $$;
REVOKE ALL ON FUNCTION et_privado.autorizar_flujo_siif(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION et_privado.rbac_rol(text),et_privado.rbac_actor(),et_privado.rbac_puede(jsonb,text,text,jsonb),et_privado.rbac_modulo(text,jsonb),et_privado.rbac_lectura(text,jsonb),et_privado.rbac_escritura(),et_privado.rbac_aplicar_cancelacion() FROM PUBLIC;
REVOKE ALL ON FUNCTION et_privado.rbac_proveedor(jsonb,jsonb),et_privado.rbac_proveedor_fila(jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA et_privado TO anon,authenticated;
GRANT EXECUTE ON FUNCTION et_privado.rbac_actor(),et_privado.rbac_lectura(text,jsonb),et_privado.rbac_puede(jsonb,text,text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
