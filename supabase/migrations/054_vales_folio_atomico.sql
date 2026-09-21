BEGIN;

-- Bloquea altas durante la inicialización del contador, sin renumerar históricos.
LOCK TABLE public.vales IN ACCESS EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS et_privado;
CREATE TABLE IF NOT EXISTS et_privado.vales_consecutivos (
  anio integer PRIMARY KEY,
  ultimo_numero bigint NOT NULL CHECK (ultimo_numero >= 0)
);
REVOKE ALL ON et_privado.vales_consecutivos FROM PUBLIC, anon, authenticated;

INSERT INTO et_privado.vales_consecutivos (anio, ultimo_numero)
SELECT split_part(upper(btrim(folio)), '-', 2)::integer,
       max(split_part(btrim(folio), '-', 1)::bigint)
FROM public.vales
WHERE btrim(folio) ~* '^[0-9]+-[0-9]{4}-V$'
GROUP BY split_part(upper(btrim(folio)), '-', 2)::integer
ON CONFLICT (anio) DO UPDATE
SET ultimo_numero = greatest(vales_consecutivos.ultimo_numero, EXCLUDED.ultimo_numero);

CREATE OR REPLACE FUNCTION et_privado.asignar_folio_vale()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_anio integer := extract(year FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Hermosillo');
  v_numero bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.folio IS DISTINCT FROM OLD.folio THEN
      RAISE EXCEPTION 'El folio de un vale existente no se puede modificar';
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO et_privado.vales_consecutivos (anio, ultimo_numero)
  VALUES (v_anio, 1)
  ON CONFLICT (anio) DO UPDATE
  SET ultimo_numero = vales_consecutivos.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_numero;

  NEW.folio := lpad(v_numero::text, greatest(4, length(v_numero::text)), '0')
    || '-' || v_anio::text || '-V';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION et_privado.asignar_folio_vale() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zz_vales_folio_atomico ON public.vales;
CREATE TRIGGER zz_vales_folio_atomico
BEFORE INSERT OR UPDATE ON public.vales
FOR EACH ROW EXECUTE FUNCTION et_privado.asignar_folio_vale();

COMMIT;
