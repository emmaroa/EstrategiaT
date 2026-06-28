-- ============================================================
-- ACUERDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS acuerdos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(30) UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(80) DEFAULT 'Oficios',
  prioridad VARCHAR(20) DEFAULT 'Media',
  estado VARCHAR(40) DEFAULT 'Nuevo',
  fecha_compromiso DATE,
  fecha_conclusion TIMESTAMPTZ,
  creado_por UUID,
  asignado_a UUID,
  turnado_por UUID,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acuerdos_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id UUID NOT NULL,
  usuario_id UUID,
  accion TEXT NOT NULL,
  detalle TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acuerdos_estado ON acuerdos (estado);
CREATE INDEX IF NOT EXISTS idx_acuerdos_created_at ON acuerdos (created_at DESC);
