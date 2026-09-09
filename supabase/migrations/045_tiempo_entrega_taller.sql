-- Plazo estimado opcional, independiente de la fecha real de salida.
BEGIN;
ALTER TABLE public.ingresos_taller
  ADD COLUMN IF NOT EXISTS tiempo_entrega_aproximado VARCHAR(80);
COMMENT ON COLUMN public.ingresos_taller.tiempo_entrega_aproximado IS
  'Tiempo de entrega estimado indicado al capturar o editar el ingreso, por ejemplo 3 días o 1 semana.';
COMMIT;
