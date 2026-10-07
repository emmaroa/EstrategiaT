-- Reasignación administrativa autorizada: registros existentes de Control de
-- Taller sin autor pasan a gdavis. No afirma quién hizo la captura histórica.
-- Ejecutar una vez en Supabase SQL Editor como administrador.
-- La API cliente no puede efectuar este cambio por el trigger de autoría.
BEGIN;

LOCK TABLE public.ingresos_taller, public.ingresos_taller_pendientes
  IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE public.ingresos_taller_pendientes
  ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creado_por_nombre text;

-- Sólo durante esta transacción; ninguna escritura concurrente puede entrar.
ALTER TABLE public.ingresos_taller DISABLE TRIGGER trg_conservar_autor_ingreso_taller;

DO $$
DECLARE
  cuenta public.usuarios%ROWTYPE;
  ingresos_asignados integer;
  pendientes_asignados integer;
BEGIN
  SELECT * INTO cuenta FROM public.usuarios
  WHERE id = '827cb6d4-5879-4a85-9fdf-b325f37250e6'::uuid
    AND usuario = 'gdavis' AND activo IS TRUE
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la cuenta activa esperada de gdavis';
  END IF;

  UPDATE public.ingresos_taller
  SET creado_por = cuenta.id,
      creado_por_nombre = coalesce(nullif(btrim(cuenta.nombre), ''), cuenta.usuario)
  WHERE creado_por IS NULL;
  GET DIAGNOSTICS ingresos_asignados = ROW_COUNT;

  UPDATE public.ingresos_taller_pendientes
  SET creado_por = cuenta.id,
      creado_por_nombre = coalesce(nullif(btrim(cuenta.nombre), ''), cuenta.usuario)
  WHERE creado_por IS NULL;
  GET DIAGNOSTICS pendientes_asignados = ROW_COUNT;

  IF EXISTS (SELECT 1 FROM public.ingresos_taller WHERE creado_por IS NULL)
    OR EXISTS (SELECT 1 FROM public.ingresos_taller_pendientes WHERE creado_por IS NULL) THEN
    RAISE EXCEPTION 'La reasignación no se completó; se revierte toda la operación';
  END IF;
  RAISE NOTICE 'Asignados a gdavis: % ingresos y % pendientes',
    ingresos_asignados, pendientes_asignados;
END $$;

ALTER TABLE public.ingresos_taller ENABLE TRIGGER trg_conservar_autor_ingreso_taller;
COMMIT;

-- Comprobación: el ingreso abierto de E-378 debe tener a gdavis como responsable.
SELECT numero_economico, fecha_ingreso, estatus, creado_por, creado_por_nombre
FROM public.ingresos_taller
WHERE numero_economico = 'E-378'
ORDER BY fecha_ingreso DESC;
