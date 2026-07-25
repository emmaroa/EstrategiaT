ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS proveedor VARCHAR(150);

ALTER TABLE peticiones
ADD COLUMN IF NOT EXISTS estatus_proveedor VARCHAR(50) DEFAULT 'Pendiente de entrega',
ADD COLUMN IF NOT EXISTS nota_proveedor TEXT,
ADD COLUMN IF NOT EXISTS fecha_entrega_proveedor TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_proveedor ON usuarios(proveedor);
CREATE INDEX IF NOT EXISTS idx_peticiones_proveedor ON peticiones(proveedor);
CREATE INDEX IF NOT EXISTS idx_requisiciones_siif_proveedor ON requisiciones_siif(proveedor);

INSERT INTO proveedores (razon_social, activo)
SELECT nombres.razon_social, true
FROM (
  SELECT DISTINCT ON (lower(regexp_replace(trim(r.proveedor), '\s+', ' ', 'g')))
    regexp_replace(trim(r.proveedor), '\s+', ' ', 'g') AS razon_social
  FROM requisiciones_siif AS r
  WHERE COALESCE(trim(r.proveedor), '') <> ''
  ORDER BY
    lower(regexp_replace(trim(r.proveedor), '\s+', ' ', 'g')),
    r.proveedor
) AS nombres
WHERE COALESCE(nombres.razon_social, '') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM proveedores AS p
    WHERE lower(regexp_replace(trim(p.razon_social), '\s+', ' ', 'g')) =
          lower(nombres.razon_social)
  );

UPDATE peticiones AS p
SET proveedor = (
  SELECT r.proveedor
  FROM requisiciones_siif AS r
  WHERE lower(regexp_replace(trim(r.proveedor), '\s+', ' ', 'g')) =
        lower(regexp_replace(trim(p.proveedor), '\s+', ' ', 'g'))
  ORDER BY r.proveedor
  LIMIT 1
)
WHERE COALESCE(trim(p.proveedor), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM requisiciones_siif AS r
    WHERE lower(regexp_replace(trim(r.proveedor), '\s+', ' ', 'g')) =
          lower(regexp_replace(trim(p.proveedor), '\s+', ' ', 'g'))
  );

UPDATE usuarios AS u
SET proveedor = (
  SELECT r.proveedor
  FROM requisiciones_siif AS r
  WHERE lower(regexp_replace(trim(r.proveedor), '\s+', ' ', 'g')) =
        lower(regexp_replace(trim(u.proveedor), '\s+', ' ', 'g'))
  ORDER BY r.proveedor
  LIMIT 1
)
WHERE COALESCE(trim(u.proveedor), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM requisiciones_siif AS r
    WHERE lower(regexp_replace(trim(r.proveedor), '\s+', ' ', 'g')) =
          lower(regexp_replace(trim(u.proveedor), '\s+', ' ', 'g'))
  );

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE proveedores TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proveedores'
      AND policyname = 'anon_gestion_proveedores'
  ) THEN
    CREATE POLICY anon_gestion_proveedores
      ON proveedores
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
