BEGIN;
CREATE TABLE IF NOT EXISTS et_privado.roles (
 clave text PRIMARY KEY, nombre text NOT NULL, revision integer NOT NULL DEFAULT 1
);
INSERT INTO et_privado.roles(clave,nombre)
 SELECT DISTINCT rol,rol FROM et_privado.rbac_base ON CONFLICT DO NOTHING;
INSERT INTO et_privado.roles(clave,nombre)
 SELECT et_privado.rbac_rol(rol),min(rol) FROM public.usuarios WHERE nullif(btrim(rol),'') IS NOT NULL
 GROUP BY et_privado.rbac_rol(rol) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS et_privado.roles_historial (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, fecha timestamptz NOT NULL DEFAULT now(),
 actor uuid NOT NULL, rol text NOT NULL, accion text NOT NULL, antes jsonb, despues jsonb
);
ALTER TABLE et_privado.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE et_privado.roles_historial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.roles,et_privado.roles_historial FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION et_privado.rbac_actor() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT (to_jsonb(u)-'password') || jsonb_build_object('permisos_rol',
   coalesce((SELECT jsonb_object_agg(b.modulo,b.acciones) FROM et_privado.rbac_base b
     WHERE b.rol=et_privado.rbac_rol(u.rol)),'{}'::jsonb))
 FROM public.usuarios u JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=u.id
 WHERE s.token_hash=sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-et-session-token','UTF8'))
 AND s.expira_en>now() AND u.activo IS TRUE LIMIT 1
$$;
CREATE OR REPLACE FUNCTION et_privado.exigir_admin_roles() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();
BEGIN
 IF u IS NULL OR et_privado.rbac_rol(u->>'rol')<>'superadmin' THEN
  RAISE EXCEPTION 'Solo SuperAdmin puede administrar roles' USING ERRCODE='42501';
 END IF;
 RETURN (u->>'id')::uuid;
END $$;
REVOKE ALL ON FUNCTION et_privado.exigir_admin_roles() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_roles() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE resultado jsonb;
BEGIN
 PERFORM et_privado.exigir_admin_roles();
 SELECT coalesce(jsonb_agg(jsonb_build_object('clave',r.clave,'nombre',r.nombre,'revision',r.revision,
  'usuarios',(SELECT count(*) FROM public.usuarios u WHERE et_privado.rbac_rol(u.rol)=r.clave),
  'permisos',coalesce((SELECT jsonb_object_agg(b.modulo,b.acciones) FROM et_privado.rbac_base b WHERE b.rol=r.clave),'{}'::jsonb)) ORDER BY r.nombre),'[]'::jsonb)
 INTO resultado FROM et_privado.roles r;
 RETURN resultado;
END $$;

CREATE OR REPLACE FUNCTION public.admin_guardar_rol(p_clave text,p_nombre text,p_permisos jsonb,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid:=et_privado.exigir_admin_roles(); clave text:=et_privado.rbac_rol(p_clave);
 actual et_privado.roles%ROWTYPE; anterior jsonb; item record; accion text;
BEGIN
 IF clave IS NULL OR clave !~ '^[a-z0-9]{2,60}$' OR length(btrim(coalesce(p_nombre,''))) NOT BETWEEN 2 AND 80
  OR jsonb_typeof(p_permisos) IS DISTINCT FROM 'object' OR p_revision IS NULL OR p_revision<0 THEN
  RAISE EXCEPTION 'Nombre, clave o permisos inválidos';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('roles:'||clave));
 SELECT * INTO actual FROM et_privado.roles WHERE roles.clave=clave FOR UPDATE;
 IF (FOUND AND actual.revision<>p_revision) OR (NOT FOUND AND p_revision<>0) THEN
  RAISE EXCEPTION 'El rol cambió. Actualice antes de guardar' USING ERRCODE='40001';
 END IF;
 SELECT jsonb_object_agg(modulo,acciones) INTO anterior FROM et_privado.rbac_base WHERE rol=clave;
 FOR item IN SELECT * FROM jsonb_each(p_permisos) LOOP
  IF NOT EXISTS(SELECT 1 FROM et_privado.roles_modulos WHERE modulo=item.key)
   OR jsonb_typeof(item.value)<>'array' THEN RAISE EXCEPTION 'Módulo o acciones inválidos: %',item.key; END IF;
  IF jsonb_array_length(item.value)>0 AND NOT item.value ? 'ver' THEN RAISE EXCEPTION 'Las acciones requieren lectura'; END IF;
  IF item.key IN ('Usuarios','Roles','Licencias') AND clave<>'superadmin' AND jsonb_array_length(item.value)>0 THEN
   RAISE EXCEPTION 'Módulo reservado a SuperAdmin'; END IF;
  FOR accion IN SELECT jsonb_array_elements_text(item.value) LOOP
   IF accion NOT IN ('ver','crear','editar','eliminar','cambiar_estatus','autorizar','importar','generar_requisicion','exportar','imprimir','solicitar_cancelacion','aprobar_cancelacion') THEN RAISE EXCEPTION 'Acción inválida'; END IF;
   IF accion='eliminar' AND clave NOT IN ('superadmin','administradordelsistema') THEN RAISE EXCEPTION 'Este rol no puede eliminar registros'; END IF;
   IF accion='aprobar_cancelacion' AND clave NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RAISE EXCEPTION 'Este rol no puede aprobar cancelaciones'; END IF;
  END LOOP;
 END LOOP;
 IF clave='superadmin' AND (NOT coalesce(p_permisos->'Usuarios' ?& ARRAY['ver','crear','editar'],false)
  OR NOT coalesce(p_permisos->'Roles' ? 'ver',false)) THEN
  RAISE EXCEPTION 'SuperAdmin debe conservar Usuarios y Roles'; END IF;
 INSERT INTO et_privado.roles AS dest(clave,nombre,revision) VALUES(clave,btrim(p_nombre),1)
 ON CONFLICT ON CONSTRAINT roles_pkey DO UPDATE SET nombre=excluded.nombre,revision=dest.revision+1;
 DELETE FROM et_privado.rbac_base WHERE rol=clave;
 INSERT INTO et_privado.rbac_base(rol,modulo,acciones) SELECT clave,key,value FROM jsonb_each(p_permisos) WHERE jsonb_array_length(value)>0;
 INSERT INTO et_privado.roles_historial(actor,rol,accion,antes,despues) VALUES(actor,clave,'guardar',anterior,p_permisos);
END $$;

CREATE TABLE IF NOT EXISTS et_privado.roles_modulos(modulo text PRIMARY KEY);
INSERT INTO et_privado.roles_modulos SELECT DISTINCT modulo FROM et_privado.rbac_base ON CONFLICT DO NOTHING;
INSERT INTO et_privado.roles_modulos VALUES('Roles') ON CONFLICT DO NOTHING;
ALTER TABLE et_privado.roles_modulos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.roles_modulos FROM PUBLIC,anon,authenticated;
INSERT INTO et_privado.rbac_base VALUES('superadmin','Roles','["ver","crear","editar","eliminar"]')
 ON CONFLICT(rol,modulo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_eliminar_rol(p_clave text,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=et_privado.exigir_admin_roles(); actual et_privado.roles%ROWTYPE; anterior jsonb;
BEGIN
 IF p_clave='superadmin' THEN RAISE EXCEPTION 'SuperAdmin no se puede eliminar'; END IF;
 SELECT * INTO actual FROM et_privado.roles WHERE clave=p_clave FOR UPDATE;
 IF NOT FOUND OR actual.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'El rol cambió. Actualice la lista' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE et_privado.rbac_rol(rol)=p_clave) THEN
  RAISE EXCEPTION 'Reasigne primero los usuarios de este rol'; END IF;
 SELECT jsonb_object_agg(modulo,acciones) INTO anterior FROM et_privado.rbac_base WHERE rol=p_clave;
 DELETE FROM et_privado.rbac_base WHERE rol=p_clave;
 DELETE FROM et_privado.roles WHERE clave=p_clave;
 INSERT INTO et_privado.roles_historial(actor,rol,accion,antes) VALUES(actor,p_clave,'eliminar',anterior);
END $$;
CREATE OR REPLACE FUNCTION et_privado.validar_rol_asignado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.rol IS NOT DISTINCT FROM OLD.rol THEN RETURN NEW; END IF;
 PERFORM 1 FROM et_privado.roles WHERE clave=et_privado.rbac_rol(NEW.rol) FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un rol existente'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_rol_asignado ON public.usuarios;
CREATE TRIGGER validar_rol_asignado BEFORE INSERT OR UPDATE OF rol ON public.usuarios FOR EACH ROW EXECUTE FUNCTION et_privado.validar_rol_asignado();
REVOKE ALL ON FUNCTION et_privado.validar_rol_asignado() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_listar_roles(),public.admin_guardar_rol(text,text,jsonb,integer),public.admin_eliminar_rol(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_roles(),public.admin_guardar_rol(text,text,jsonb,integer),public.admin_eliminar_rol(text,integer) TO anon,authenticated;
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
NOTIFY pgrst,'reload schema';
COMMIT;
