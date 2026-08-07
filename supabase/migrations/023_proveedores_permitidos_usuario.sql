-- Permite vincular varias empresas a una misma cuenta del portal de proveedores.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS proveedores_permitidos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE public.usuarios
SET proveedores_permitidos = ARRAY[trim(proveedor)]
WHERE COALESCE(trim(proveedor), '') <> ''
  AND cardinality(proveedores_permitidos) = 0;

CREATE INDEX IF NOT EXISTS idx_usuarios_proveedores_permitidos
  ON public.usuarios USING GIN (proveedores_permitidos);

COMMENT ON COLUMN public.usuarios.proveedores_permitidos IS
  'Proveedores que el usuario puede seleccionar y gestionar dentro del Portal de Proveedores.';
