BEGIN;
-- Restaura la compatibilidad con el login actual definida en 026 y 027.
-- El usuario destinatario se filtra en la app; anon no es identidad verificada.
GRANT SELECT ON public.notificaciones TO anon, authenticated;
GRANT UPDATE (leida) ON public.notificaciones TO anon, authenticated;

DROP POLICY IF EXISTS portal_consulta_notificaciones ON public.notificaciones;
CREATE POLICY portal_consulta_notificaciones ON public.notificaciones
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS portal_actualiza_notificaciones ON public.notificaciones;
CREATE POLICY portal_actualiza_notificaciones ON public.notificaciones
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
COMMIT;
