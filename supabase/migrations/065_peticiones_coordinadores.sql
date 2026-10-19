-- Flujo de autorización para peticiones creadas por coordinadores.

ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS origen_peticion VARCHAR(30) DEFAULT 'normal';
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS estado_autorizacion VARCHAR(30) DEFAULT 'autorizada';
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS creada_por_id UUID;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS creada_por_nombre VARCHAR(150);
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS autorizada_por_id UUID;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS autorizada_por_nombre VARCHAR(150);
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS autorizada_at TIMESTAMPTZ;

UPDATE peticiones
SET origen_peticion = COALESCE(origen_peticion, 'normal'),
    estado_autorizacion = COALESCE(estado_autorizacion, 'autorizada')
WHERE origen_peticion IS NULL OR estado_autorizacion IS NULL;

CREATE INDEX IF NOT EXISTS idx_peticiones_origen_autorizacion
  ON peticiones(origen_peticion, estado_autorizacion);

UPDATE usuarios
SET modulos_permitidos = COALESCE(modulos_permitidos, '[]'::jsonb) ||
  '[{"modulo":"Peticiones de Coordinadores","permiso":"editar"}]'::jsonb
WHERE lower(replace(replace(trim(rol), ' ', ''), '_', '')) IN
  ('coordinador', 'coordinadorinfraestructura', 'jefedealmacen')
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(modulos_permitidos, '[]'::jsonb)) AS permiso
    WHERE permiso->>'modulo' = 'Peticiones de Coordinadores'
  );

UPDATE usuarios
SET modulos_permitidos = COALESCE((
  SELECT jsonb_agg(permiso)
  FROM jsonb_array_elements(COALESCE(modulos_permitidos, '[]'::jsonb)) AS permiso
  WHERE permiso->>'modulo' <> 'Peticiones'
), '[]'::jsonb) ||
  '[{"modulo":"Peticiones","permiso":"ver"}]'::jsonb
WHERE lower(replace(replace(trim(rol), ' ', ''), '_', '')) IN
  ('coordinador', 'coordinadorinfraestructura')
  AND lower(trim(usuario)) IN ('gdavis', 'rmada');