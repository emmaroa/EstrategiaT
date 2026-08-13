-- Notifica a los usuarios proveedor cuando una cotización pasa de pendiente
-- a requisición generada, sin depender de la pantalla que haga el cambio.
CREATE OR REPLACE FUNCTION public.notificar_cotizacion_requisicion_generada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(trim(COALESCE(OLD.estatus, ''))) = lower('Pendiente de revisión')
     AND lower(trim(COALESCE(NEW.estatus, ''))) = lower('Requisición generada') THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    SELECT
      u.id,
      'cotizacion_requisicion_generada',
      'Requisición generada',
      'La cotización ' || COALESCE(NEW.folio, 'sin folio') ||
        ' cambió a Requisición generada' ||
        CASE WHEN COALESCE(trim(NEW.requisicion), '') <> ''
          THEN ' con el número ' || NEW.requisicion ELSE '' END || '.',
      'modulos/portal-proveedor.html?vista=cotizaciones'
    FROM public.usuarios AS u
    WHERE lower(trim(COALESCE(u.proveedor, ''))) = lower(trim(NEW.proveedor))
       OR EXISTS (
         SELECT 1 FROM unnest(COALESCE(u.proveedores_permitidos, ARRAY[]::TEXT[])) AS p
         WHERE lower(trim(p)) = lower(trim(NEW.proveedor))
       );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_cotizacion_requisicion_generada
  ON public.cotizaciones_almacen;
CREATE TRIGGER trg_notificar_cotizacion_requisicion_generada
AFTER UPDATE OF estatus ON public.cotizaciones_almacen
FOR EACH ROW
EXECUTE FUNCTION public.notificar_cotizacion_requisicion_generada();

GRANT SELECT, UPDATE ON public.notificaciones TO anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notificaciones'
      AND policyname = 'portal_consulta_notificaciones'
  ) THEN
    CREATE POLICY portal_consulta_notificaciones ON public.notificaciones
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notificaciones'
      AND policyname = 'portal_actualiza_notificaciones'
  ) THEN
    CREATE POLICY portal_actualiza_notificaciones ON public.notificaciones
      FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
