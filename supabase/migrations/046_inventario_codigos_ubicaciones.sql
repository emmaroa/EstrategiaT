BEGIN;

-- Permite ejecutar esta migración desde el editor SQL aunque la base no haya
-- recibido todavía la sección de inventario de 001_erp_foundation.sql.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.categorias_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'refaccion' CHECK (tipo IN ('refaccion', 'herramienta', 'consumible')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  codigo_barras VARCHAR(100),
  nombre VARCHAR(200) NOT NULL,
  categoria_id UUID REFERENCES public.categorias_inventario(id),
  unidad_medida VARCHAR(30) DEFAULT 'PZA',
  stock_actual NUMERIC(12,2) DEFAULT 0,
  stock_minimo NUMERIC(12,2) DEFAULT 0,
  costo_unitario NUMERIC(12,2) DEFAULT 0,
  ubicacion VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID REFERENCES public.inventario(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad NUMERIC(12,2) NOT NULL,
  costo_unitario NUMERIC(12,2),
  referencia VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ubicaciones_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  pasillo VARCHAR(40),
  estante VARCHAR(40),
  nivel VARCHAR(40),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventario
  ADD COLUMN IF NOT EXISTS codigo_qr VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tipo_codigo VARCHAR(20) NOT NULL DEFAULT 'CODE128',
  ADD COLUMN IF NOT EXISTS stock_maximo NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES public.ubicaciones_inventario(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventario_codigo_qr
  ON public.inventario(codigo_qr)
  WHERE codigo_qr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventario_ubicacion_id
  ON public.inventario(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_inventario_stock_bajo
  ON public.inventario(stock_actual, stock_minimo)
  WHERE activo = true;

CREATE OR REPLACE FUNCTION public.registrar_movimiento_inventario(
  p_inventario_id UUID,
  p_tipo VARCHAR,
  p_cantidad NUMERIC,
  p_referencia VARCHAR DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS public.inventario_movimientos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.inventario;
  v_mov public.inventario_movimientos;
  v_delta NUMERIC;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
  END IF;
  IF p_tipo NOT IN ('entrada', 'salida', 'ajuste', 'devolucion') THEN
    RAISE EXCEPTION 'Tipo de movimiento no válido';
  END IF;

  SELECT * INTO v_item FROM public.inventario WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artículo de inventario no encontrado'; END IF;

  v_delta := CASE
    WHEN p_tipo IN ('entrada', 'devolucion') THEN p_cantidad
    WHEN p_tipo = 'salida' THEN -p_cantidad
    ELSE p_cantidad - v_item.stock_actual
  END;
  IF v_item.stock_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'El movimiento dejaría el stock en negativo';
  END IF;

  INSERT INTO public.inventario_movimientos
    (inventario_id, tipo, cantidad, costo_unitario, referencia, usuario_id, notas)
  VALUES
    (p_inventario_id, p_tipo, p_cantidad, v_item.costo_unitario, p_referencia, p_usuario_id, p_notas)
  RETURNING * INTO v_mov;

  UPDATE public.inventario
    SET stock_actual = v_item.stock_actual + v_delta, updated_at = now()
    WHERE id = p_inventario_id;

  RETURN v_mov;
END;
$$;

REVOKE ALL ON public.inventario FROM anon;
REVOKE ALL ON public.ubicaciones_inventario FROM anon;
REVOKE ALL ON public.inventario_movimientos FROM anon;
REVOKE ALL ON FUNCTION public.registrar_movimiento_inventario(UUID, VARCHAR, NUMERIC, VARCHAR, TEXT, UUID) FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.inventario TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ubicaciones_inventario TO authenticated;
GRANT SELECT ON public.inventario_movimientos TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_inventario(UUID, VARCHAR, NUMERIC, VARCHAR, TEXT, UUID) TO authenticated;

ALTER TABLE public.ubicaciones_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventario_app_access ON public.inventario;
CREATE POLICY inventario_app_access ON public.inventario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ubicaciones_inventario_app_access ON public.ubicaciones_inventario;
CREATE POLICY ubicaciones_inventario_app_access ON public.ubicaciones_inventario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventario_movimientos_app_access ON public.inventario_movimientos;
CREATE POLICY inventario_movimientos_app_access ON public.inventario_movimientos
  FOR SELECT TO authenticated USING (true);

COMMIT;
