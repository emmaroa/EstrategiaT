BEGIN;
-- Un Coordinador puede eliminar solamente ingresos de taller cuya autoría ya
-- puede editar. La llamada recursiva conserva módulos, excepciones y autoría.
DO $$ DECLARE definicion text; ancla text; BEGIN
 definicion:=pg_get_functiondef('et_privado.rbac_puede(jsonb,text,text,jsonb)'::regprocedure);
 IF position('eliminar_control_taller_coordinador' IN definicion)=0 THEN
  ancla:='IF a=''eliminar'' AND rol NOT IN';
  IF position(ancla IN definicion)=0 THEN RAISE EXCEPTION 'No se encontró la restricción central de eliminación RBAC'; END IF;
  definicion:=replace(definicion,ancla,$regla$
   -- eliminar_control_taller_coordinador: solo registros propios con permiso de edición.
   IF m='Control de Taller' AND a='eliminar' AND rol='coordinador' AND r IS NOT NULL THEN
    RETURN et_privado.rbac_puede(u,m,'editar',r);
   END IF;
   IF a='eliminar' AND rol NOT IN$regla$);
  EXECUTE definicion;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
