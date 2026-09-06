-- Control operativo de ingresos y salidas de unidades en talleres internos y foráneos.
CREATE TABLE IF NOT EXISTS public.ingresos_taller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), vehiculo_id UUID NOT NULL REFERENCES public.parque_vehicular(id) ON DELETE RESTRICT,
  numero_economico VARCHAR(50) NOT NULL, unidad_descripcion TEXT NOT NULL, dependencia TEXT,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('Preventivo','Correctivo')),
  concepto VARCHAR(250) NOT NULL, descripcion TEXT, refacciones TEXT,
  taller_ambito VARCHAR(20) NOT NULL CHECK (taller_ambito IN ('Interno','Foráneo')), taller_nombre VARCHAR(150) NOT NULL,
  fecha_ingreso DATE NOT NULL, fecha_salida DATE, estatus VARCHAR(30) NOT NULL DEFAULT 'En curso' CHECK (estatus IN ('En curso','En espera','Terminado')),
  estatus_cotizacion VARCHAR(30) NOT NULL DEFAULT 'No requerida' CHECK (estatus_cotizacion IN ('No requerida','Pendiente','Solicitada','Recibida','Autorizada')),
  monto_cotizacion NUMERIC(14,2), creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL, creado_por_nombre TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ingresos_taller_salida_valida CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_ingreso)
);
CREATE INDEX IF NOT EXISTS idx_ingresos_taller_fechas ON public.ingresos_taller(fecha_ingreso,fecha_salida);
CREATE INDEX IF NOT EXISTS idx_ingresos_taller_dependencia ON public.ingresos_taller(dependencia);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingresos_taller_unidad_abierta ON public.ingresos_taller(vehiculo_id) WHERE estatus <> 'Terminado';
ALTER TABLE public.ingresos_taller ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ingresos_taller TO anon,authenticated;
DROP POLICY IF EXISTS "ingresos_taller_acceso_aplicacion" ON public.ingresos_taller;
CREATE POLICY "ingresos_taller_acceso_aplicacion" ON public.ingresos_taller FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE OR REPLACE FUNCTION public.sincronizar_disponibilidad_taller() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.parque_vehicular SET disponibilidad=CASE WHEN NEW.estatus='Terminado' THEN 'DISPONIBLE' ELSE 'EN TALLER' END WHERE id=NEW.vehiculo_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sincronizar_disponibilidad_taller ON public.ingresos_taller;
CREATE TRIGGER trg_sincronizar_disponibilidad_taller AFTER INSERT OR UPDATE OF estatus ON public.ingresos_taller FOR EACH ROW EXECUTE FUNCTION public.sincronizar_disponibilidad_taller();
