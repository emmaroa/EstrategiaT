BEGIN;
-- La política UPDATE evaluaba "editar" antes de llegar al trigger que distingue
-- un cambio exclusivo de estatus. Se abre la fila para Técnicos y el trigger
-- rbac_escritura sigue limitando la modificación a estatus/updated_at.
DO $$ DECLARE definicion text; ancla text; BEGIN
 definicion:=pg_get_functiondef('et_privado.seguridad_fila(text,jsonb,text)'::regprocedure);
 IF position('estatus_vales_tecnicos_rls' IN definicion)=0 THEN
  ancla:='IF EXISTS(SELECT 1 FROM et_privado.rbac_tablas WHERE tabla=t) THEN';
  IF position(ancla IN definicion)=0 THEN RAISE EXCEPTION 'No se encontró la política central de escritura RLS'; END IF;
  definicion:=replace(definicion,ancla,$regla$
  -- estatus_vales_tecnicos_rls: la validación de columnas permanece en rbac_escritura.
  IF t='vales' AND a='editar'
     AND et_privado.rbac_rol(u->>'rol') IN ('tecnico','tecnicovales')
     AND et_privado.rbac_puede(u,'Vales','cambiar_estatus',r) THEN
    RETURN true;
  END IF;
  IF EXISTS(SELECT 1 FROM et_privado.rbac_tablas WHERE tabla=t) THEN$regla$);
  EXECUTE definicion;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
