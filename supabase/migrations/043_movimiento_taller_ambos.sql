-- Un solo ingreso puede incluir servicio preventivo y correctivo.
BEGIN;
ALTER TABLE public.ingresos_taller
  DROP CONSTRAINT IF EXISTS ingresos_taller_tipo_movimiento_check;
ALTER TABLE public.ingresos_taller
  ADD CONSTRAINT ingresos_taller_tipo_movimiento_check
  CHECK (tipo_movimiento IN ('Preventivo', 'Correctivo', 'Ambos'));
COMMENT ON COLUMN public.ingresos_taller.tipo_movimiento IS
  'Preventivo, Correctivo o Ambos (preventivo y correctivo en un mismo ingreso).';
COMMIT;
