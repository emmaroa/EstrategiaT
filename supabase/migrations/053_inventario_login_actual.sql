BEGIN;
-- Compatibilidad con el login actual: permisos individuales en la app.
ALTER TABLE public.inventario_movimientos ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id);
GRANT SELECT ON public.categorias_inventario TO anon;
GRANT SELECT, INSERT, UPDATE ON public.inventario, public.ubicaciones_inventario TO anon;
GRANT SELECT ON public.inventario_movimientos TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_inventario(UUID, VARCHAR, NUMERIC, VARCHAR, TEXT, UUID) TO anon;
DROP POLICY IF EXISTS categorias_inventario_login_actual ON public.categorias_inventario;
CREATE POLICY categorias_inventario_login_actual ON public.categorias_inventario FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS inventario_app_access ON public.inventario;
CREATE POLICY inventario_app_access ON public.inventario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ubicaciones_inventario_app_access ON public.ubicaciones_inventario;
CREATE POLICY ubicaciones_inventario_app_access ON public.ubicaciones_inventario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventario_movimientos_app_access ON public.inventario_movimientos;
CREATE POLICY inventario_movimientos_app_access ON public.inventario_movimientos FOR SELECT TO anon, authenticated USING (true);
COMMIT;
