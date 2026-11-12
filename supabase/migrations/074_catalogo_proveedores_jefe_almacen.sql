-- Cat?logo necesario para asignar proveedores en Peticiones y Vales.
-- Conserva permisos de escritura y excepciones; no modifica la cuenta de Jair.
BEGIN;
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND et_privado.rbac_rol(u->>'rol')='jefedealmacen'
   AND (et_privado.rbac_puede(u,'Peticiones','ver') OR et_privado.rbac_puede(u,'Vales','ver')) THEN
   RETURN true;
 END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_rol(u->>'rol')='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN true; END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND rol='jefedealmacen'
   AND ((c->'modulos') ? 'Peticiones' OR (c->'modulos') ? 'Vales') THEN RETURN true; END IF;
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
REVOKE ALL ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
