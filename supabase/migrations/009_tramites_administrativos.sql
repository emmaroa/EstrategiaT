-- Tramites administrativos: dias economicos, permisos, vacaciones e incapacidades

CREATE TABLE IF NOT EXISTS feriados_administrativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  nombre VARCHAR(180) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tramites_administrativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL,
  num_empleado VARCHAR(50) NOT NULL,
  empleado_nombre TEXT NOT NULL,
  direccion TEXT,
  departamento TEXT,
  puesto TEXT,
  tipo_tramite VARCHAR(40) NOT NULL CHECK (tipo_tramite IN ('Dias economicos', 'Permiso especial', 'Vacaciones', 'Incapacidad')),
  subtipo_incapacidad VARCHAR(60) CHECK (
    subtipo_incapacidad IS NULL OR
    subtipo_incapacidad IN ('Incapacidad general', 'Incapacidad por riesgo de trabajo')
  ),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_habiles NUMERIC(6,2) NOT NULL DEFAULT 0,
  periodo_anio INTEGER NOT NULL,
  motivo TEXT,
  observaciones TEXT,
  folio_documento VARCHAR(100),
  estatus VARCHAR(40) NOT NULL DEFAULT 'Autorizado',
  capturado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  capturado_por_nombre TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);

ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS num_empleado VARCHAR(50);
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS empleado_nombre TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS puesto TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS tipo_tramite VARCHAR(40);
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS subtipo_incapacidad VARCHAR(60);
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS dias_habiles NUMERIC(6,2) DEFAULT 0;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS periodo_anio INTEGER;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS folio_documento VARCHAR(100);
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS estatus VARCHAR(40) DEFAULT 'Autorizado';
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS capturado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS capturado_por_nombre TEXT;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE tramites_administrativos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tramites_admin_empleado ON tramites_administrativos(num_empleado);
CREATE INDEX IF NOT EXISTS idx_tramites_admin_periodo ON tramites_administrativos(periodo_anio);
CREATE INDEX IF NOT EXISTS idx_tramites_admin_tipo ON tramites_administrativos(tipo_tramite);
CREATE INDEX IF NOT EXISTS idx_tramites_admin_fechas ON tramites_administrativos(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_feriados_admin_fecha ON feriados_administrativos(fecha);

ALTER TABLE tramites_administrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados_administrativos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tramites_administrativos' AND policyname = 'anon_all_tramites_administrativos') THEN
    CREATE POLICY anon_all_tramites_administrativos ON tramites_administrativos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feriados_administrativos' AND policyname = 'anon_all_feriados_administrativos') THEN
    CREATE POLICY anon_all_feriados_administrativos ON feriados_administrativos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
      AND column_name = 'modulos_permitidos'
  ) THEN
    UPDATE usuarios
    SET modulos_permitidos = '[{"modulo":"Dashboard","permiso":"ver"},{"modulo":"Tramites Administrativos","permiso":"editar"}]'::jsonb
    WHERE rol = 'Capturista Administrativo'
      AND (modulos_permitidos IS NULL OR modulos_permitidos = '[]'::jsonb);
  END IF;
END $$;
