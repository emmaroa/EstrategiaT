BEGIN;
-- Cambiar estatus no concede edición del resto de los datos de un vale ajeno.
DO $$ DECLARE definicion text; ancla text; BEGIN
 definicion:=pg_get_functiondef('et_privado.rbac_puede(jsonb,text,text,jsonb)'::regprocedure);
 IF position('estatus_vales_tecnicos' IN definicion)=0 THEN
  ancla:='IF r IS NOT NULL AND a IN';
  IF position(ancla IN definicion)=0 THEN RAISE EXCEPTION 'No se encontró la regla de autoría RBAC'; END IF;
  definicion:=replace(definicion,ancla,$regla$
   -- estatus_vales_tecnicos: después de validar acceso y excepciones.
   IF m='Vales' AND a='cambiar_estatus' AND rol IN ('tecnico','tecnicovales') THEN
    RETURN NOT coalesce((r->>'rbac_cancelado')::boolean,false);
   END IF;
   IF r IS NOT NULL AND a IN$regla$);
  EXECUTE definicion;
 END IF;
 definicion:=pg_get_functiondef('et_privado.rbac_escritura()'::regprocedure);
 IF position('estatus_vales_tecnicos' IN definicion)=0 THEN
  ancla:='IF TG_TABLE_NAME=''importaciones_siif'' THEN accion:=''importar''; END IF;';
  IF position(ancla IN definicion)=0 THEN RAISE EXCEPTION 'No se encontró la validación de escritura RBAC'; END IF;
  definicion:=replace(definicion,ancla,ancla || $regla$
   -- estatus_vales_tecnicos: UPDATE limitado al estatus y marca de actualización.
   IF TG_TABLE_NAME='vales' AND TG_OP='UPDATE'
      AND et_privado.rbac_rol(u->>'rol') IN ('tecnico','tecnicovales')
      AND (anterior-ARRAY['estatus','updated_at'])=(nuevo-ARRAY['estatus','updated_at']) THEN
    accion:='cambiar_estatus';
   END IF;
  $regla$);
  EXECUTE definicion;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
