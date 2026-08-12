-- Confirmación del proveedor de que concluyó una cotización vinculada
-- a requisición en el portal externo de compras.
ALTER TABLE public.cotizaciones_almacen
  ADD COLUMN IF NOT EXISTS cotizado_portal_compras BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cotizado_portal_compras_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cotizado_portal_compras_por VARCHAR(150);

COMMENT ON COLUMN public.cotizaciones_almacen.cotizado_portal_compras IS
  'Indica que el proveedor confirmó esta cotización en el portal de compras.';

COMMENT ON COLUMN public.cotizaciones_almacen.cotizado_portal_compras_at IS
  'Fecha y hora en que el proveedor confirmó la cotización en el portal de compras.';

COMMENT ON COLUMN public.cotizaciones_almacen.cotizado_portal_compras_por IS
  'Proveedor que realizó la confirmación en el portal de compras.';
