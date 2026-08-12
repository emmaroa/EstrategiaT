-- Migración correctiva para bases que alcanzaron a aplicar una versión
-- anterior de 024 sobre requis_siif. No elimina esas columnas para evitar
-- una operación destructiva; garantiza los campos en cotizaciones_almacen.
ALTER TABLE public.cotizaciones_almacen
  ADD COLUMN IF NOT EXISTS cotizado_portal_compras BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cotizado_portal_compras_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cotizado_portal_compras_por VARCHAR(150);

COMMENT ON COLUMN public.cotizaciones_almacen.cotizado_portal_compras IS
  'Indica que el proveedor confirmó esta cotización en el portal de compras.';

COMMENT ON COLUMN public.cotizaciones_almacen.cotizado_portal_compras_at IS
  'Fecha y hora de confirmación de la cotización en el portal de compras.';

COMMENT ON COLUMN public.cotizaciones_almacen.cotizado_portal_compras_por IS
  'Proveedor que confirmó la cotización en el portal de compras.';
