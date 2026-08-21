-- EstrategiaT usa autenticación propia en public.usuarios y accede a Supabase
-- mediante el rol anon. Los permisos funcionales se validan en la aplicación
-- y en los triggers de Acuerdos; RLS debe permitir las operaciones REST.

ALTER TABLE public.acuerdos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acuerdos_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acuerdos_acceso_aplicacion" ON public.acuerdos;
CREATE POLICY "acuerdos_acceso_aplicacion"
  ON public.acuerdos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "acuerdos_historial_acceso_aplicacion" ON public.acuerdos_historial;
CREATE POLICY "acuerdos_historial_acceso_aplicacion"
  ON public.acuerdos_historial
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

