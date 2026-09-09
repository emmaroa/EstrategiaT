-- Ejecutar antes de publicar el cliente actualizado.
BEGIN;

-- El autor no cambia cuando otro usuario corrige o da seguimiento al ingreso.
CREATE OR REPLACE FUNCTION public.conservar_autor_ingreso_taller()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.creado_por := OLD.creado_por;
  NEW.creado_por_nombre := OLD.creado_por_nombre;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_conservar_autor_ingreso_taller ON public.ingresos_taller;
CREATE TRIGGER trg_conservar_autor_ingreso_taller
BEFORE UPDATE ON public.ingresos_taller
FOR EACH ROW EXECUTE FUNCTION public.conservar_autor_ingreso_taller();

-- Recalcular ambas unidades al corregir una asociación; conservar EN TALLER
-- si existe otro ingreso abierto al terminar o eliminar un registro histórico.
CREATE OR REPLACE FUNCTION public.sincronizar_disponibilidad_taller()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  anterior uuid;
  actual uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN anterior := OLD.vehiculo_id; END IF;
  IF TG_OP <> 'DELETE' THEN actual := NEW.vehiculo_id; END IF;
  PERFORM id FROM public.parque_vehicular
    WHERE id IN (anterior, actual) ORDER BY id FOR UPDATE;
  UPDATE public.parque_vehicular p SET disponibilidad = CASE
    WHEN EXISTS (SELECT 1 FROM public.ingresos_taller i
      WHERE i.vehiculo_id = p.id AND i.estatus <> 'Terminado')
    THEN 'EN TALLER' ELSE 'DISPONIBLE' END
  WHERE p.id IN (anterior, actual);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sincronizar_disponibilidad_taller ON public.ingresos_taller;
CREATE TRIGGER trg_sincronizar_disponibilidad_taller
AFTER INSERT OR UPDATE OF estatus, vehiculo_id OR DELETE ON public.ingresos_taller
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_disponibilidad_taller();

-- La aplicación usa usuarios propios, sin auth.uid(). Comprobar la contraseña
-- en el servidor y no aceptar eliminaciones REST basadas solo en un id local.
REVOKE DELETE ON public.ingresos_taller FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.eliminar_ingreso_taller(
  p_ingreso_id uuid, p_usuario_id uuid, p_password text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  autor uuid;
BEGIN
  IF p_password IS NULL OR length(btrim(p_password)) = 0 OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_usuario_id AND u.activo IS TRUE AND u.password = p_password
      AND lower(btrim(coalesce(u.rol, ''))) NOT IN ('solo lectura', 'consulta')
  ) THEN
    RAISE EXCEPTION 'No autorizado para eliminar este ingreso' USING ERRCODE = '42501';
  END IF;
  SELECT creado_por INTO autor FROM public.ingresos_taller
    WHERE id = p_ingreso_id FOR UPDATE;
  IF NOT FOUND OR autor IS NULL OR autor IS DISTINCT FROM p_usuario_id THEN
    RAISE EXCEPTION 'No autorizado para eliminar este ingreso' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.ingresos_taller WHERE id = p_ingreso_id AND creado_por = p_usuario_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.eliminar_ingreso_taller(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_ingreso_taller(uuid, uuid, text) TO anon, authenticated;
COMMIT;
