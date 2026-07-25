ALTER TABLE vales
ALTER COLUMN area DROP NOT NULL,
ALTER COLUMN cantidad DROP NOT NULL,
ALTER COLUMN medida DROP NOT NULL;

DO $$
DECLARE
  restriccion RECORD;
BEGIN
  FOR restriccion IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'vales'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%estatus%'
  LOOP
    EXECUTE format('ALTER TABLE vales DROP CONSTRAINT %I', restriccion.conname);
  END LOOP;
END
$$;

ALTER TABLE vales
ADD CONSTRAINT vales_estatus_check
CHECK (estatus IN ('Pendiente', 'Entregado', 'Cancelado', 'Solventado'));
