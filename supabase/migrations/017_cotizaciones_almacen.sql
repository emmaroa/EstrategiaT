-- Cotizaciones de artículos entregados al almacén, con o sin petición previa.
CREATE SEQUENCE IF NOT EXISTS cotizaciones_almacen_folio_seq START WITH 1;

CREATE OR REPLACE FUNCTION generar_folio_cotizacion_almacen()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'COT-' || EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER || '-' ||
    LPAD(nextval('cotizaciones_almacen_folio_seq')::TEXT, 4, '0');
$$;

CREATE TABLE IF NOT EXISTS cotizaciones_almacen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(30) NOT NULL UNIQUE DEFAULT generar_folio_cotizacion_almacen(),
  peticion_id UUID REFERENCES peticiones(id) ON DELETE SET NULL,
  proveedor VARCHAR(150) NOT NULL,
  fecha_cotizacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  unidad VARCHAR(50) NOT NULL,
  unidad_id UUID REFERENCES parque_vehicular(id) ON DELETE SET NULL,
  numero_serie VARCHAR(100),
  dependencia VARCHAR(150),
  materiales JSONB NOT NULL DEFAULT '[]'::JSONB,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  origen VARCHAR(30) NOT NULL DEFAULT 'Sin petición'
    CHECK (origen IN ('Desde petición', 'Sin petición')),
  estatus VARCHAR(40) NOT NULL DEFAULT 'Pendiente de revisión'
    CHECK (estatus IN ('Pendiente de revisión', 'Validada', 'Requisición generada', 'Rechazada')),
  partida VARCHAR(5) CHECK (partida IS NULL OR partida IN ('29601', '29801', '26102')),
  requisicion VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION calcular_totales_cotizacion_almacen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  material JSONB;
  subtotal_calculado NUMERIC(14,2) := 0;
BEGIN
  IF jsonb_typeof(NEW.materiales) <> 'array' OR jsonb_array_length(NEW.materiales) = 0 THEN
    RAISE EXCEPTION 'La cotización debe contener al menos un material';
  END IF;

  FOR material IN SELECT value FROM jsonb_array_elements(NEW.materiales)
  LOOP
    IF COALESCE((material->>'cantidad')::NUMERIC, 0) <= 0
       OR COALESCE((material->>'precio_unitario')::NUMERIC, -1) < 0
       OR COALESCE(TRIM(material->>'item'), '') = '' THEN
      RAISE EXCEPTION 'Cada material requiere item, cantidad positiva y precio unitario válido';
    END IF;
    subtotal_calculado := subtotal_calculado +
      ROUND((material->>'cantidad')::NUMERIC * (material->>'precio_unitario')::NUMERIC, 2);
  END LOOP;

  NEW.subtotal := ROUND(subtotal_calculado, 2);
  NEW.iva := ROUND(NEW.subtotal * 0.16, 2);
  NEW.total := ROUND(NEW.subtotal + NEW.iva, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_totales_cotizacion_almacen ON cotizaciones_almacen;
CREATE TRIGGER trg_calcular_totales_cotizacion_almacen
BEFORE INSERT OR UPDATE OF materiales
ON cotizaciones_almacen
FOR EACH ROW
EXECUTE FUNCTION calcular_totales_cotizacion_almacen();

CREATE UNIQUE INDEX IF NOT EXISTS uq_cotizaciones_almacen_peticion
  ON cotizaciones_almacen(peticion_id)
  WHERE peticion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_almacen_proveedor
  ON cotizaciones_almacen(proveedor);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_almacen_estatus
  ON cotizaciones_almacen(estatus);

ALTER TABLE cotizaciones_almacen ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE cotizaciones_almacen TO anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cotizaciones_almacen'
      AND policyname = 'anon_gestion_cotizaciones_almacen'
  ) THEN
    CREATE POLICY anon_gestion_cotizaciones_almacen
      ON cotizaciones_almacen
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cotizaciones_almacen'
      AND policyname = 'authenticated_gestion_cotizaciones_almacen'
  ) THEN
    CREATE POLICY authenticated_gestion_cotizaciones_almacen
      ON cotizaciones_almacen
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
