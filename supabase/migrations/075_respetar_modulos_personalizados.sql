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
 IF jsonb_typeof(lista) IS DISTINCT FROM 'array' THEN RETURN true; END IF;
 IF jsonb_array_length(lista)=0 OR m='Dashboard' THEN RETURN true; END IF;
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

SELECT u.usuario,u.rol,u.modulos_permitidos,
 (SELECT jsonb_agg(m ORDER BY m) FROM (SELECT DISTINCT modulo m FROM et_privado.rbac_base) x
 WHERE et_privado.rbac_puede(to_jsonb(u),m,'ver')) AS modulos_visibles
FROM public.usuarios u WHERE lower(btrim(u.usuario))='paulo';
