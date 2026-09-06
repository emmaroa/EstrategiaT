CREATE TABLE IF NOT EXISTS public.ingresos_taller_pendientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), clave_origen TEXT UNIQUE NOT NULL,
  area TEXT NOT NULL DEFAULT 'Electricas', numero_economico TEXT, unidad_descripcion TEXT,
  dependencia TEXT, tipo_movimiento TEXT, concepto TEXT, descripcion TEXT, taller_nombre TEXT,
  fecha_ingreso DATE, estatus TEXT, fecha_salida DATE, observaciones TEXT,
  motivo_revision TEXT NOT NULL, creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingresos_taller_pendientes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingresos_taller_pendientes TO anon, authenticated;
DROP POLICY IF EXISTS "ingresos_taller_pendientes_acceso_aplicacion" ON public.ingresos_taller_pendientes;
CREATE POLICY "ingresos_taller_pendientes_acceso_aplicacion" ON public.ingresos_taller_pendientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.ingresos_taller_pendientes (clave_origen,numero_economico,unidad_descripcion,dependencia,tipo_movimiento,concepto,descripcion,taller_nombre,fecha_ingreso,estatus,fecha_salida,observaciones,motivo_revision) VALUES
('electricas:E-449','E-449','Pa',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Faltan datos obligatorios del ingreso'),
('electricas:E-371','E-371','Patrulla Esei E40X','Seguridad Pública','Preventivo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Faltan datos obligatorios del ingreso'),
('electricas:E-374','E-374','Patrulla Esei E40X','Seguridad Pública',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Faltan datos obligatorios del ingreso'),
('electricas:E-334','E-334','Patrulla Mini Dolphin','Seguridad Pública','Correctivo','Falla en aislamiento','SALIO DE TALLER BYD PARA INGRESARLA POR TEMA DE GANTIA POR EL SEGURO, SE INGRESA A ZONA NORTE','Taller ByD','2025-07-14','En curso',NULL,NULL,'La unidad no existe o no coincide con Parque Vehicular'),
('electricas:E-4422','E-4422','T8','Ayudantia','Correctivo','Falla en aislamiento','Reemplazo de modulos completos en paquete de bateria','Taller Jac','2026-01-19','En curso',NULL,NULL,'La unidad no existe o no coincide con Parque Vehicular') ON CONFLICT (clave_origen) DO NOTHING;
