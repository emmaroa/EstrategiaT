-- ============================================================
-- Permisos manuales por usuario
-- ============================================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS modulos_permitidos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN usuarios.modulos_permitidos IS 'Lista de módulos habilitados manualmente para el usuario';
