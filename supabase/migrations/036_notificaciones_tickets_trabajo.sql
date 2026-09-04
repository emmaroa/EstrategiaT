-- Actualiza el lenguaje de las notificaciones del módulo Acuerdos convertido en tickets.
CREATE OR REPLACE FUNCTION public.notificar_acuerdo_asignado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.asignado_a IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.asignado_a IS DISTINCT FROM OLD.asignado_a) THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    VALUES (
      NEW.asignado_a,
      'acuerdo_asignado',
      'Nuevo ticket asignado',
      'Se te asignó el ticket ' || COALESCE(NEW.folio, 'sin folio') ||
        CASE WHEN COALESCE(trim(NEW.titulo), '') <> '' THEN ': ' || NEW.titulo ELSE '' END || '.',
      'modulos/acuerdos.html?buscar=' || COALESCE(NEW.folio, '')
    );
  END IF;
  RETURN NEW;
END;
$$;
