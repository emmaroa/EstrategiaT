-- Permite asignar proveedor desde la etapa de requisición SIIF.
ALTER TABLE public.requis_siif
  ADD COLUMN IF NOT EXISTS proveedor TEXT;

CREATE INDEX IF NOT EXISTS idx_requis_siif_proveedor
  ON public.requis_siif (proveedor);

GRANT SELECT, INSERT, UPDATE ON public.requis_siif TO anon, authenticated;

COMMENT ON COLUMN public.requis_siif.proveedor IS
  'Proveedor asignado desde la captura de la requisición SIIF.';
