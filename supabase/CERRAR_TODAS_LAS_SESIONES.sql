-- Ejecutar una sola vez en SQL Editor. Invalida los tokens actuales, incluida su sesión.
-- Las cuentas y contraseñas se conservan. Los nuevos inicios de sesión funcionan normalmente.
BEGIN;
WITH revocadas AS (
 DELETE FROM et_privado.sesiones_aplicacion RETURNING usuario_id
)
SELECT count(*) AS sesiones_revocadas, count(DISTINCT usuario_id) AS usuarios_afectados
FROM revocadas;
COMMIT;
