-- Notifica al responsable cuando se crea o reasigna un acuerdo.
CREATE OR REPLACE FUNCTION public.notificar_acuerdo_asignado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.asignado_a IS NOT NULL AND (
    TG_OP = 'INSERT' OR NEW.asignado_a IS DISTINCT FROM OLD.asignado_a
  ) THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    VALUES (
      NEW.asignado_a,
      'acuerdo_asignado',
      'Nuevo acuerdo asignado',
      'Se te asignó el acuerdo ' || COALESCE(NEW.folio, 'sin folio') ||
        ': ' || COALESCE(NEW.titulo, 'Sin título') || '.',
      'modulos/acuerdos.html?buscar=' || COALESCE(NEW.folio, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_acuerdo_asignado ON public.acuerdos;
CREATE TRIGGER trg_notificar_acuerdo_asignado
AFTER INSERT OR UPDATE OF asignado_a ON public.acuerdos
FOR EACH ROW
EXECUTE FUNCTION public.notificar_acuerdo_asignado();

GRANT SELECT, UPDATE ON public.notificaciones TO anon, authenticated;
