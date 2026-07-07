-- Seguimiento de peticiones por coordinador de area

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS areas_permitidas JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN usuarios.areas_permitidas IS 'Areas de peticiones visibles para usuarios con rol coordinador';

CREATE TEMP TABLE tmp_coordinadores_seguimiento (
  nombre TEXT,
  usuario TEXT,
  password TEXT,
  rol TEXT,
  activo BOOLEAN,
  modulos_permitidos JSONB,
  areas_permitidas JSONB
) ON COMMIT DROP;

INSERT INTO tmp_coordinadores_seguimiento (
  nombre,
  usuario,
  password,
  rol,
  activo,
  modulos_permitidos,
  areas_permitidas
) VALUES
  (
    'Gabriel Davis',
    'gdavis',
    'gdavis',
    'Coordinador',
    true,
    '[{"modulo":"Dashboard","permiso":"ver"},{"modulo":"Seguimiento Peticiones","permiso":"ver"}]'::jsonb,
    '["Electricas"]'::jsonb
  ),
  (
    'Rodolfo Rendon',
    'rrendon',
    'rrendon',
    'Coordinador',
    true,
    '[{"modulo":"Dashboard","permiso":"ver"},{"modulo":"Seguimiento Peticiones","permiso":"ver"}]'::jsonb,
    '["Maquinaria Pesada","Barredoras"]'::jsonb
  ),
  (
    'Ramon Mada',
    'rmada',
    'rmada',
    'Coordinador',
    true,
    '[{"modulo":"Dashboard","permiso":"ver"},{"modulo":"Seguimiento Peticiones","permiso":"ver"}]'::jsonb,
    '["Gasolina","Motocicletas"]'::jsonb
  ),
  (
    'Christian Valencia',
    'cvalencia',
    'cvalencia',
    'Coordinador',
    true,
    '[{"modulo":"Dashboard","permiso":"ver"},{"modulo":"Seguimiento Peticiones","permiso":"ver"}]'::jsonb,
    '["Maquinaria Pesada","Barredoras","Colectores"]'::jsonb
  );

UPDATE usuarios u
SET
  nombre = c.nombre,
  rol = c.rol,
  activo = c.activo,
  modulos_permitidos = c.modulos_permitidos,
  areas_permitidas = c.areas_permitidas
FROM tmp_coordinadores_seguimiento c
WHERE u.usuario = c.usuario;

INSERT INTO usuarios (
  nombre,
  usuario,
  password,
  rol,
  activo,
  modulos_permitidos,
  areas_permitidas
)
SELECT
  c.nombre,
  c.usuario,
  c.password,
  c.rol,
  c.activo,
  c.modulos_permitidos,
  c.areas_permitidas
FROM tmp_coordinadores_seguimiento c
WHERE NOT EXISTS (
  SELECT 1
  FROM usuarios u
  WHERE u.usuario = c.usuario
);
