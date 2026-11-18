BEGIN;
-- Regla obligatoria, incluso si existen excepciones de permisos por usuario.
DO $$ DECLARE definicion text; BEGIN
 definicion := pg_get_functiondef('et_privado.rbac_puede(jsonb,text,text,jsonb)'::regprocedure);
 IF position('cancelacion_peticiones_roles' IN definicion)=0 THEN
  definicion := regexp_replace(definicion, '\mBEGIN\M', $regla$BEGIN
   -- cancelacion_peticiones_roles
   IF m='Peticiones' AND a='solicitar_cancelacion'
      AND et_privado.rbac_rol(u->>'rol') NOT IN ('superadmin','jefedealmacen') THEN RETURN false; END IF;
  $regla$);
  EXECUTE definicion;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION et_privado.proteger_cancelacion_peticion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); cambia boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  cambia:=coalesce(NEW.rbac_cancelado,false) OR lower(btrim(coalesce(NEW.estatus,''))) IN ('cancelado','cancelada');
 ELSE
  cambia:=(coalesce(NEW.rbac_cancelado,false) AND NOT coalesce(OLD.rbac_cancelado,false))
   OR (NEW.estatus IS DISTINCT FROM OLD.estatus AND lower(btrim(coalesce(NEW.estatus,''))) IN ('cancelado','cancelada'));
 END IF;
 IF cambia AND coalesce(NEW.origen_peticion,'')<>'coordinador' THEN
  IF NOT coalesce(et_privado.rbac_puede(u,'Peticiones','solicitar_cancelacion',to_jsonb(NEW)),false) THEN
   RAISE EXCEPTION 'Sin permiso: solo SuperAdmin y Jefe de Almacén pueden cancelar peticiones' USING ERRCODE='42501';
  END IF;
  IF NOT coalesce(NEW.rbac_cancelado,false) THEN
   RAISE EXCEPTION 'Use Cancelar petición e indique el motivo' USING ERRCODE='42501';
  END IF;
  NEW.estatus:='CANCELADO';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_cancelacion_peticion ON public.peticiones;
CREATE TRIGGER proteger_cancelacion_peticion BEFORE INSERT OR UPDATE ON public.peticiones
FOR EACH ROW EXECUTE FUNCTION et_privado.proteger_cancelacion_peticion();
REVOKE ALL ON FUNCTION et_privado.proteger_cancelacion_peticion() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
