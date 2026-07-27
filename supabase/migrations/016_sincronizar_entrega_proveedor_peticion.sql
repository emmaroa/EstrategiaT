-- Sincroniza la recepción en almacén con la entrega confirmada del proveedor.
CREATE OR REPLACE FUNCTION sincronizar_entrega_proveedor_peticion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(replace(trim(COALESCE(NEW.estatus, '')), 'é', 'e')) = 'recibido en almacen' THEN
    NEW.estatus_proveedor := 'Entregado a almacén';
    NEW.fecha_entrega_proveedor := COALESCE(NEW.fecha_entrega_proveedor, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_entrega_proveedor_peticion ON peticiones;

CREATE TRIGGER trg_sincronizar_entrega_proveedor_peticion
BEFORE INSERT OR UPDATE OF estatus
ON peticiones
FOR EACH ROW
EXECUTE FUNCTION sincronizar_entrega_proveedor_peticion();

UPDATE peticiones
SET
  estatus_proveedor = 'Entregado a almacén',
  fecha_entrega_proveedor = COALESCE(fecha_entrega_proveedor, now())
WHERE lower(replace(trim(COALESCE(estatus, '')), 'é', 'e')) = 'recibido en almacen'
  AND (
    estatus_proveedor IS DISTINCT FROM 'Entregado a almacén'
    OR fecha_entrega_proveedor IS NULL
  );
