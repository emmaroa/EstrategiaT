WITH nombres_requisiciones AS (
  SELECT DISTINCT ON (lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')))
    regexp_replace(trim(proveedor), '\s+', ' ', 'g') AS nombre,
    lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) AS clave
  FROM requisiciones_siif
  WHERE COALESCE(trim(proveedor), '') <> ''
  ORDER BY
    lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')),
    proveedor
)
INSERT INTO proveedores (razon_social, activo)
SELECT nombre, true
FROM nombres_requisiciones AS nr
WHERE NOT EXISTS (
  SELECT 1
  FROM proveedores AS p
  WHERE lower(regexp_replace(trim(p.razon_social), '\s+', ' ', 'g')) = nr.clave
);

UPDATE peticiones AS p
SET proveedor = canonico.nombre
FROM (
  SELECT DISTINCT ON (lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')))
    regexp_replace(trim(proveedor), '\s+', ' ', 'g') AS nombre,
    lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) AS clave
  FROM requisiciones_siif
  WHERE COALESCE(trim(proveedor), '') <> ''
  ORDER BY
    lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')),
    proveedor
) AS canonico
WHERE lower(regexp_replace(trim(p.proveedor), '\s+', ' ', 'g')) = canonico.clave
  AND p.proveedor IS DISTINCT FROM canonico.nombre;

UPDATE usuarios AS u
SET proveedor = canonico.nombre
FROM (
  SELECT DISTINCT ON (lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')))
    regexp_replace(trim(proveedor), '\s+', ' ', 'g') AS nombre,
    lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) AS clave
  FROM requisiciones_siif
  WHERE COALESCE(trim(proveedor), '') <> ''
  ORDER BY
    lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')),
    proveedor
) AS canonico
WHERE lower(regexp_replace(trim(u.proveedor), '\s+', ' ', 'g')) = canonico.clave
  AND u.proveedor IS DISTINCT FROM canonico.nombre;
