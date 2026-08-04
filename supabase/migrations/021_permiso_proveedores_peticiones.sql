-- Control individual para mostrar proveedores a coordinadores.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS ver_proveedores_peticiones BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usuarios.ver_proveedores_peticiones IS
  'Permite a coordinadores ver la columna Proveedor en Peticiones y Seguimiento Peticiones.';
