-- ============================================================
-- Auditoria centralizada
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  modulo VARCHAR(100) NOT NULL,
  accion VARCHAR(100) NOT NULL,
  detalle TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha
  ON auditoria(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
  ON auditoria(usuario_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_modulo
  ON auditoria(modulo);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'auditoria'
      AND policyname = 'anon_all_auditoria'
  ) THEN
    CREATE POLICY anon_all_auditoria
      ON auditoria
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
