-- Permitir acceso de lectura y escritura a la tabla requisiciones_siif desde la app web
ALTER TABLE IF EXISTS public.requisiciones_siif ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.requisiciones_siif TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'requisiciones_siif'
      AND policyname = 'anon_all_requisiciones_siif'
  ) THEN
    CREATE POLICY anon_all_requisiciones_siif
      ON public.requisiciones_siif
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'requisiciones_siif'
      AND policyname = 'authenticated_all_requisiciones_siif'
  ) THEN
    CREATE POLICY authenticated_all_requisiciones_siif
      ON public.requisiciones_siif
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
