-- ============================================================
-- Tiempo Extra: periodos, empleados y justificaciones por dia
-- ============================================================

CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  num_empleado VARCHAR(50) NOT NULL,
  nombre_completo TEXT,
  nombre TEXT,
  direccion TEXT,
  departamento TEXT,
  puesto TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE empleados ADD COLUMN IF NOT EXISTS num_empleado VARCHAR(50);
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS nombre_completo TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS puesto TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_empleados_num_empleado ON empleados(num_empleado);

CREATE TABLE IF NOT EXISTS periodos_tiempo_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  semana INTEGER,
  anio INTEGER,
  numero_oficio VARCHAR(80),
  fecha_oficio DATE,
  adscripcion TEXT,
  destinatario TEXT,
  total_empleados INTEGER DEFAULT 0,
  total_horas NUMERIC(8,2) DEFAULT 0,
  estatus VARCHAR(40) DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE periodos_tiempo_extra ADD COLUMN IF NOT EXISTS total_empleados INTEGER DEFAULT 0;
ALTER TABLE periodos_tiempo_extra ADD COLUMN IF NOT EXISTS total_horas NUMERIC(8,2) DEFAULT 0;
ALTER TABLE periodos_tiempo_extra ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS tiempo_extra_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos_tiempo_extra(id) ON DELETE CASCADE,
  empleado_id TEXT,
  num_empleado VARCHAR(50) NOT NULL,
  nombre TEXT,
  direccion TEXT,
  departamento TEXT,
  puesto TEXT,
  total_horas NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tiempo_extra_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos_tiempo_extra(id) ON DELETE CASCADE,
  tiempo_extra_empleado_id UUID NOT NULL REFERENCES tiempo_extra_empleados(id) ON DELETE CASCADE,
  dia_semana VARCHAR(20) NOT NULL,
  fecha DATE,
  entrada TIME,
  salida TIME,
  horas NUMERIC(6,2) DEFAULT 0,
  justificacion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_periodos_tiempo_extra_fecha ON periodos_tiempo_extra(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_periodos_tiempo_extra_anio ON periodos_tiempo_extra(anio);
CREATE INDEX IF NOT EXISTS idx_tiempo_extra_empleados_periodo ON tiempo_extra_empleados(periodo_id);
CREATE INDEX IF NOT EXISTS idx_tiempo_extra_detalles_periodo ON tiempo_extra_detalles(periodo_id);
CREATE INDEX IF NOT EXISTS idx_tiempo_extra_detalles_empleado ON tiempo_extra_detalles(tiempo_extra_empleado_id);

ALTER TABLE periodos_tiempo_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiempo_extra_empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiempo_extra_detalles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'empleados' AND policyname = 'anon_all_empleados') THEN
    CREATE POLICY anon_all_empleados ON empleados FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'periodos_tiempo_extra' AND policyname = 'anon_all_periodos_tiempo_extra') THEN
    CREATE POLICY anon_all_periodos_tiempo_extra ON periodos_tiempo_extra FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiempo_extra_empleados' AND policyname = 'anon_all_tiempo_extra_empleados') THEN
    CREATE POLICY anon_all_tiempo_extra_empleados ON tiempo_extra_empleados FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiempo_extra_detalles' AND policyname = 'anon_all_tiempo_extra_detalles') THEN
    CREATE POLICY anon_all_tiempo_extra_detalles ON tiempo_extra_detalles FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
