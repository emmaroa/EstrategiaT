-- El campo solicitante dejó de formar parte de la captura de vales.
-- Se conserva la columna para no perder información histórica.
ALTER TABLE vales
ALTER COLUMN solicitante DROP NOT NULL;
