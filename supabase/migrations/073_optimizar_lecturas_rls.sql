-- Corrección de lecturas: permisos calculados una vez por sentencia, no por fila.
BEGIN;
SET LOCAL lock_timeout='10s';
CREATE OR REPLACE FUNCTION et_privado.contexto_lectura()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); permitidos jsonb; mapa jsonb;
BEGIN
 IF u IS NULL THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(m),'[]'::jsonb) INTO permitidos FROM
 (SELECT DISTINCT modulo m FROM et_privado.rbac_base
 UNION SELECT modulo FROM et_privado.rbac_tablas) x
 WHERE et_privado.rbac_puede(u,m,'ver');
 SELECT jsonb_object_agg(tabla,modulo) INTO mapa FROM et_privado.rbac_tablas;
 RETURN jsonb_build_object('usuario',u,'rol',et_privado.rbac_rol(u->>'rol'),
   'modulos',permitidos,'tablas',mapa);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='usuarios' THEN RETURN rol='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF rol='proveedor' THEN
  IF NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
  IF t='parque_vehicular' THEN RETURN true; END IF;
  m:=CASE WHEN t='peticiones' THEN 'Peticiones de almacén'
    WHEN t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
    WHEN t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF' ELSE m END;
 ELSIF t='peticiones' AND r->>'origen_peticion'='coordinador' THEN
  m:='Peticiones de Coordinadores';
 END IF;
 RETURN coalesce((c->'modulos') ? m,false);
END $$;
REVOKE ALL ON FUNCTION et_privado.contexto_lectura(),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.contexto_lectura(),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.rbac_tablas WHERE to_regclass(format('public.%I',tabla)) IS NOT NULL LOOP
  -- Ambas barreras anteriores repetían la misma autorización de lectura.
  EXECUTE format('DROP POLICY IF EXISTS rbac_lectura ON public.%I',t.tabla);
  EXECUTE format('DROP POLICY IF EXISTS seguridad_ver ON public.%I',t.tabla);
  EXECUTE format('CREATE POLICY seguridad_ver ON public.%I AS RESTRICTIVE FOR SELECT TO anon,authenticated USING (et_privado.lectura_con_contexto(%L,to_jsonb(%I),(SELECT et_privado.contexto_lectura())))',t.tabla,t.tabla,t.tabla);
 END LOOP;
END $$;
DROP POLICY IF EXISTS seguridad_ver ON public.notificaciones;
CREATE POLICY seguridad_ver ON public.notificaciones AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING (usuario_id=(SELECT (et_privado.rbac_actor()->>'id')::uuid));
DROP POLICY IF EXISTS seguridad_editar ON public.notificaciones;
CREATE POLICY seguridad_editar ON public.notificaciones AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING (usuario_id=(SELECT (et_privado.rbac_actor()->>'id')::uuid))
 WITH CHECK (usuario_id=(SELECT (et_privado.rbac_actor()->>'id')::uuid));
CREATE INDEX IF NOT EXISTS notificaciones_usuario_lectura_fecha_idx
 ON public.notificaciones(usuario_id,leida,created_at DESC,id DESC);
NOTIFY pgrst,'reload schema';
COMMIT;
