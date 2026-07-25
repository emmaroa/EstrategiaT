ALTER TABLE vales
ADD COLUMN IF NOT EXISTS dependencia VARCHAR(150);

UPDATE vales AS v
SET dependencia = (
  SELECT p.dependencia
  FROM parque_vehicular AS p
  WHERE p.numero_economico = v.unidad
     OR p.unidad_patrulla = v.unidad
  ORDER BY CASE WHEN p.numero_economico = v.unidad THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE COALESCE(v.dependencia, '') = ''
  AND EXISTS (
    SELECT 1
    FROM parque_vehicular AS p
    WHERE (p.numero_economico = v.unidad OR p.unidad_patrulla = v.unidad)
      AND COALESCE(p.dependencia, '') <> ''
  );

CREATE INDEX IF NOT EXISTS idx_vales_dependencia
ON vales(dependencia);
