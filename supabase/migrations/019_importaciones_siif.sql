-- Historial y trazabilidad de las cargas realizadas desde el módulo Importar SIIF.
CREATE TABLE IF NOT EXISTS public.importaciones_siif (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('requisicion', 'oc', 'sp')),
  nombre_archivo TEXT NOT NULL,
  total_registros INTEGER NOT NULL DEFAULT 0,
  registros_nuevos INTEGER NOT NULL DEFAULT 0,
  registros_actualizados INTEGER NOT NULL DEFAULT 0,
  registros_con_error INTEGER NOT NULL DEFAULT 0,
  usuario_nombre VARCHAR(150),
  estado VARCHAR(30) NOT NULL DEFAULT 'Procesada'
    CHECK (estado IN ('Procesando', 'Procesada', 'Procesada con errores', 'Fallida')),
  detalle_errores JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requis_siif
  ADD COLUMN IF NOT EXISTS importacion_id UUID REFERENCES public.importaciones_siif(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.oc_siif
  ADD COLUMN IF NOT EXISTS importacion_id UUID REFERENCES public.importaciones_siif(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.sp_siif
  ADD COLUMN IF NOT EXISTS importacion_id UUID REFERENCES public.importaciones_siif(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_importaciones_siif_created_at
  ON public.importaciones_siif(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requis_siif_importacion
  ON public.requis_siif(importacion_id);

CREATE INDEX IF NOT EXISTS idx_oc_siif_importacion
  ON public.oc_siif(importacion_id);

CREATE INDEX IF NOT EXISTS idx_sp_siif_importacion
  ON public.sp_siif(importacion_id);

ALTER TABLE public.importaciones_siif ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.importaciones_siif TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.requis_siif TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.oc_siif TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sp_siif TO anon, authenticated;

ALTER TABLE public.requis_siif ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_siif ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_siif ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'importaciones_siif'
      AND policyname = 'anon_gestion_importaciones_siif'
  ) THEN
    CREATE POLICY anon_gestion_importaciones_siif
      ON public.importaciones_siif
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'importaciones_siif'
      AND policyname = 'authenticated_gestion_importaciones_siif'
  ) THEN
    CREATE POLICY authenticated_gestion_importaciones_siif
      ON public.importaciones_siif
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
DECLARE
  tabla TEXT;
  politica_anon TEXT;
  politica_auth TEXT;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['requis_siif', 'oc_siif', 'sp_siif']
  LOOP
    politica_anon := 'anon_importar_' || tabla;
    politica_auth := 'authenticated_importar_' || tabla;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tabla AND policyname = politica_anon
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)',
        politica_anon,
        tabla
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tabla AND policyname = politica_auth
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        politica_auth,
        tabla
      );
    END IF;
  END LOOP;
END $$;
