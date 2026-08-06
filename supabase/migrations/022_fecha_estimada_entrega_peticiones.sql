-- Fecha prevista de entrega una vez que la peticion tiene proveedor asignado.
ALTER TABLE public.peticiones
  ADD COLUMN IF NOT EXISTS fecha_estimada_entrega DATE;

COMMENT ON COLUMN public.peticiones.fecha_estimada_entrega IS
  'Fecha estimada de entrega capturada por Admin, SuperAdmin o Director cuando existe proveedor asignado.';

ALTER TABLE public.peticiones
  DROP CONSTRAINT IF EXISTS peticiones_fecha_estimada_requiere_proveedor;

ALTER TABLE public.peticiones
  ADD CONSTRAINT peticiones_fecha_estimada_requiere_proveedor
  CHECK (
    fecha_estimada_entrega IS NULL
    OR COALESCE(trim(proveedor), '') <> ''
  );
