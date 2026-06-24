-- Fase 3: Peticiones y Requisiciones unificadas en Supabase

-- PETICIONES
CREATE TABLE IF NOT EXISTS peticiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  unidad VARCHAR(50) NOT NULL,
  peticion TEXT NOT NULL,
  solicitante VARCHAR(150) NOT NULL,
  area VARCHAR(100) NOT NULL,
  proveedor VARCHAR(150),
  estatus VARCHAR(50) DEFAULT 'Pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS fecha DATE;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS peticion TEXT;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS solicitante VARCHAR(150);
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS area VARCHAR(100);
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS proveedor VARCHAR(150);
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS estatus VARCHAR(50) DEFAULT 'Pendiente';
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- REQUISICIONES
CREATE TABLE IF NOT EXISTS requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  numero VARCHAR(50) NOT NULL,
  unidad VARCHAR(50) NOT NULL,
  dependencia VARCHAR(100) NOT NULL,
  concepto TEXT NOT NULL,
  proveedor VARCHAR(150),
  monto NUMERIC(12,2) DEFAULT 0,
  estatus VARCHAR(80) DEFAULT 'Por autorizar',
  oc VARCHAR(50),
  factura VARCHAR(50),
  solicitud_pago VARCHAR(50),
  observaciones TEXT,
  peticion_id UUID REFERENCES peticiones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS solicitud_pago VARCHAR(50);
ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS peticion_id UUID REFERENCES peticiones(id) ON DELETE SET NULL;
ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_requisiciones_numero ON requisiciones(numero);
CREATE INDEX IF NOT EXISTS idx_peticiones_estatus ON peticiones(estatus);
CREATE INDEX IF NOT EXISTS idx_peticiones_unidad ON peticiones(unidad);
CREATE INDEX IF NOT EXISTS idx_requisiciones_estatus ON requisiciones(estatus);
CREATE INDEX IF NOT EXISTS idx_requisiciones_peticion ON requisiciones(peticion_id);

ALTER TABLE peticiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas para anon (ajustar en Fase 2 con Supabase Auth)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'peticiones' AND policyname = 'anon_all_peticiones') THEN
    CREATE POLICY anon_all_peticiones ON peticiones FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requisiciones' AND policyname = 'anon_all_requisiciones') THEN
    CREATE POLICY anon_all_requisiciones ON requisiciones FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
