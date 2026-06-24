-- ============================================================
-- Administración de Talleres — ERP Foundation Schema
-- Supabase / PostgreSQL
-- Ejecutar en orden. Habilitar RLS en todas las tablas.
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CATÁLOGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(200) NOT NULL,
  rfc VARCHAR(13),
  contacto VARCHAR(150),
  telefono VARCHAR(30),
  email VARCHAR(150),
  direccion TEXT,
  calificacion NUMERIC(3,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  especialidad VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PARQUE VEHICULAR (expediente digital)
-- ============================================================

-- Migrar parque_vehicular existente agregando columnas
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS vin VARCHAR(17);
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS numero_economico VARCHAR(50);
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS conductor_asignado VARCHAR(150);
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos(id);
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS kilometraje INTEGER DEFAULT 0;
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS disponibilidad VARCHAR(30) DEFAULT 'DISPONIBLE';
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS fecha_seguro DATE;
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS fecha_verificacion DATE;
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS poliza_seguro VARCHAR(100);
ALTER TABLE parque_vehicular ADD COLUMN IF NOT EXISTS qr_code VARCHAR(100);

CREATE TABLE IF NOT EXISTS vehiculo_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES parque_vehicular(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  storage_path TEXT NOT NULL,
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehiculo_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES parque_vehicular(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  descripcion VARCHAR(200),
  es_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mantenimiento_programado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES parque_vehicular(id) ON DELETE CASCADE,
  tipo_servicio VARCHAR(100) NOT NULL,
  intervalo_km INTEGER,
  intervalo_dias INTEGER,
  ultimo_servicio DATE,
  proximo_servicio DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS historial_kilometraje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES parque_vehicular(id) ON DELETE CASCADE,
  kilometraje INTEGER NOT NULL,
  fecha DATE NOT NULL,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS historial_combustible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES parque_vehicular(id) ON DELETE CASCADE,
  litros NUMERIC(10,2),
  costo NUMERIC(12,2),
  kilometraje INTEGER,
  fecha DATE NOT NULL,
  estacion VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS historial_llantas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES parque_vehicular(id) ON DELETE CASCADE,
  posicion VARCHAR(50),
  marca VARCHAR(100),
  medida VARCHAR(50),
  fecha_instalacion DATE,
  kilometraje_instalacion INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÓRDENES DE TRABAJO (Workshop Operations)
-- ============================================================

CREATE TYPE orden_trabajo_estado AS ENUM (
  'solicitud', 'diagnostico', 'aprobacion', 'reparacion',
  'control_calidad', 'entrega', 'cerrada', 'cancelada'
);

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(30) UNIQUE NOT NULL,
  vehiculo_id UUID REFERENCES parque_vehicular(id),
  solicitante_id UUID REFERENCES usuarios(id),
  tecnico_id UUID REFERENCES tecnicos(id),
  departamento_id UUID REFERENCES departamentos(id),
  tipo VARCHAR(20) DEFAULT 'interno' CHECK (tipo IN ('interno', 'externo')),
  estado orden_trabajo_estado DEFAULT 'solicitud',
  descripcion_falla TEXT,
  diagnostico TEXT,
  prioridad VARCHAR(20) DEFAULT 'normal',
  fecha_solicitud DATE DEFAULT CURRENT_DATE,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  costo_mano_obra NUMERIC(12,2) DEFAULT 0,
  costo_refacciones NUMERIC(12,2) DEFAULT 0,
  costo_total NUMERIC(12,2) GENERATED ALWAYS AS (costo_mano_obra + costo_refacciones) STORED,
  taller_externo VARCHAR(200),
  firma_entrega TEXT,
  firma_recepcion TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orden_trabajo_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  estado_anterior orden_trabajo_estado,
  estado_nuevo orden_trabajo_estado NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orden_trabajo_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES tecnicos(id),
  descripcion TEXT NOT NULL,
  horas NUMERIC(6,2) NOT NULL,
  costo_hora NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INVENTARIO / ALMACÉN
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'refaccion' CHECK (tipo IN ('refaccion', 'herramienta', 'consumible')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  codigo_barras VARCHAR(100),
  nombre VARCHAR(200) NOT NULL,
  categoria_id UUID REFERENCES categorias_inventario(id),
  unidad_medida VARCHAR(30) DEFAULT 'PZA',
  stock_actual NUMERIC(12,2) DEFAULT 0,
  stock_minimo NUMERIC(12,2) DEFAULT 0,
  costo_unitario NUMERIC(12,2) DEFAULT 0,
  ubicacion VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID REFERENCES inventario(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad NUMERIC(12,2) NOT NULL,
  costo_unitario NUMERIC(12,2),
  referencia VARCHAR(100),
  vale_id UUID REFERENCES vales(id),
  orden_id UUID REFERENCES ordenes_trabajo(id),
  usuario_id UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vista Kardex
CREATE OR REPLACE VIEW kardex_inventario AS
SELECT
  m.id,
  m.inventario_id,
  i.codigo,
  i.nombre,
  m.tipo,
  m.cantidad,
  m.costo_unitario,
  m.referencia,
  m.created_at,
  SUM(CASE WHEN m.tipo IN ('entrada','devolucion') THEN m.cantidad
           WHEN m.tipo IN ('salida') THEN -m.cantidad
           ELSE m.cantidad END)
    OVER (PARTITION BY m.inventario_id ORDER BY m.created_at) AS saldo_acumulado
FROM inventario_movimientos m
JOIN inventario i ON i.id = m.inventario_id
ORDER BY m.created_at;

-- ============================================================
-- COMPRAS
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(30) UNIQUE NOT NULL,
  solicitante_id UUID REFERENCES usuarios(id),
  departamento_id UUID REFERENCES departamentos(id),
  concepto TEXT NOT NULL,
  monto_estimado NUMERIC(12,2),
  estado VARCHAR(30) DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID REFERENCES solicitudes_compra(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id),
  monto NUMERIC(12,2) NOT NULL,
  vigencia DATE,
  documento_path TEXT,
  seleccionada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(30) UNIQUE NOT NULL,
  solicitud_id UUID REFERENCES solicitudes_compra(id),
  proveedor_id UUID REFERENCES proveedores(id),
  monto NUMERIC(12,2) NOT NULL,
  estado VARCHAR(30) DEFAULT 'pendiente',
  aprobado_por UUID REFERENCES usuarios(id),
  fecha_aprobacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedor_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
  numero_contrato VARCHAR(50),
  vigencia_inicio DATE,
  vigencia_fin DATE,
  documento_path TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICACIONES Y AUDITORÍA
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  enlace VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  modulo VARCHAR(100) NOT NULL,
  accion VARCHAR(100) NOT NULL,
  detalle TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOCUMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id UUID NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  tamano_bytes BIGINT,
  subido_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECUENCIAS DE FOLIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS folio_secuencias (
  prefijo VARCHAR(20) PRIMARY KEY,
  anio INTEGER NOT NULL,
  ultimo_numero INTEGER DEFAULT 0,
  UNIQUE(prefijo, anio)
);

CREATE OR REPLACE FUNCTION generar_folio(p_prefijo TEXT)
RETURNS TEXT AS $$
DECLARE
  v_anio INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_numero INTEGER;
BEGIN
  INSERT INTO folio_secuencias (prefijo, anio, ultimo_numero)
  VALUES (p_prefijo, v_anio, 1)
  ON CONFLICT (prefijo, anio)
  DO UPDATE SET ultimo_numero = folio_secuencias.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_numero;

  RETURN LPAD(v_numero::TEXT, 4, '0') || '-' || v_anio || '-' || p_prefijo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS — Políticas base (ajustar según migración a Supabase Auth)
-- ============================================================

ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Política temporal: acceso autenticado (reemplazar con roles JWT)
CREATE POLICY "authenticated_read" ON departamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON ordenes_trabajo FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON inventario FOR SELECT TO authenticated USING (true);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_trabajo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_inventario_codigo ON inventario(codigo);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario ON inventario_movimientos(inventario_id, created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, leida);
