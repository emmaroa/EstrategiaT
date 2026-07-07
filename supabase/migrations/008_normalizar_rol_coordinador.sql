-- Unificar variantes del rol coordinador

UPDATE usuarios
SET rol = 'Coordinador'
WHERE lower(trim(rol)) = 'coordinador';
