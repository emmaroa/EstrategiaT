-- Alinea las reglas SQL con los estados utilizados por la interfaz de Acuerdos.
ALTER TABLE public.acuerdos DROP CONSTRAINT IF EXISTS acuerdos_estado_valido;
ALTER TABLE public.acuerdos
  ADD CONSTRAINT acuerdos_estado_valido
  CHECK (estado IN ('Nuevo', 'Turnado', 'En proceso', 'En espera', 'Para revisiÃ³n', 'Concluido')) NOT VALID;

CREATE OR REPLACE FUNCTION public.validar_acuerdo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE rol_destino TEXT;
BEGIN
  IF NEW.asignado_a IS NOT NULL THEN
    SELECT lower(trim(COALESCE(rol, ''))) INTO rol_destino
    FROM public.usuarios WHERE id = NEW.asignado_a;
    IF rol_destino = 'proveedor' THEN
      RAISE EXCEPTION 'Los acuerdos no pueden turnarse a proveedores';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado
     AND NOT public.usuario_actual_admin_acuerdos() THEN
    IF NOT (
      (OLD.estado IN ('Nuevo', 'Turnado') AND NEW.estado = 'En proceso') OR
      (OLD.estado = 'En proceso' AND NEW.estado IN ('En espera', 'Para revisiÃ³n')) OR
      (OLD.estado = 'En espera' AND NEW.estado IN ('En proceso', 'Para revisiÃ³n')) OR
      (OLD.estado = 'Para revisiÃ³n' AND NEW.estado IN ('En proceso', 'Concluido'))
    ) THEN
      RAISE EXCEPTION 'Transicion de estado no permitida: % -> %', OLD.estado, NEW.estado;
    END IF;
  END IF;
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;