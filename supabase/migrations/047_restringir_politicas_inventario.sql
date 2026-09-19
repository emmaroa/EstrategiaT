BEGIN;

-- Corrige instalaciones donde 046 ya fue ejecutada con acceso anónimo.
REVOKE ALL ON public.inventario FROM anon;
REVOKE ALL ON public.ubicaciones_inventario FROM anon;
REVOKE ALL ON public.inventario_movimientos FROM anon;
REVOKE ALL ON FUNCTION public.registrar_movimiento_inventario(UUID, VARCHAR, NUMERIC, VARCHAR, TEXT, UUID) FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.inventario TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ubicaciones_inventario TO authenticated;
GRANT SELECT ON public.inventario_movimientos TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_inventario(UUID, VARCHAR, NUMERIC, VARCHAR, TEXT, UUID) TO authenticated;

DROP POLICY IF EXISTS inventario_app_access ON public.inventario;
CREATE POLICY inventario_app_access
  ON public.inventario
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS ubicaciones_inventario_app_access ON public.ubicaciones_inventario;
CREATE POLICY ubicaciones_inventario_app_access
  ON public.ubicaciones_inventario
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS inventario_movimientos_app_access ON public.inventario_movimientos;
CREATE POLICY inventario_movimientos_app_access
  ON public.inventario_movimientos
  FOR SELECT TO authenticated
  USING (true);

COMMIT;