BEGIN;
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
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND et_privado.rbac_rol(u->>'rol')='jefedealmacen'
   AND (et_privado.rbac_puede(u,'Peticiones','ver') OR et_privado.rbac_puede(u,'Vales','ver')) THEN
   RETURN true;
 END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_puede(u,'Usuarios','ver') OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN et_privado.rbac_puede(u,'Cotizaciones Proveedor','ver'); END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND rol='jefedealmacen'
   AND ((c->'modulos') ? 'Peticiones' OR (c->'modulos') ? 'Vales') THEN RETURN true; END IF;
 IF t='usuarios' THEN RETURN coalesce((c->'modulos') ? 'Usuarios',false) OR r->>'id'=u->>'id'; END IF;
 IF rol='proveedor' THEN
  IF NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
  IF t='parque_vehicular' THEN RETURN coalesce((c->'modulos') ? 'Cotizaciones Proveedor',false); END IF;
  m:=CASE WHEN t='peticiones' THEN 'Peticiones de almacén'
    WHEN t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
    WHEN t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF' ELSE m END;
 ELSIF t='peticiones' AND r->>'origen_peticion'='coordinador' THEN
  m:='Peticiones de Coordinadores';
 END IF;
 RETURN coalesce((c->'modulos') ? m,false);
END $$;
REVOKE ALL ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE activo IS TRUE) AND NOT EXISTS(
 SELECT 1 FROM public.usuarios u WHERE u.activo IS TRUE AND et_privado.rbac_puede(to_jsonb(u),'Usuarios','editar')) THEN
 RAISE EXCEPTION 'No hay SuperAdmin con Usuarios permitido para editar. Asigne primero ese m?dulo a la cuenta administradora; no se aplic? ning?n cambio.';
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT usuario,rol,modulos_permitidos FROM public.usuarios ORDER BY usuario;
