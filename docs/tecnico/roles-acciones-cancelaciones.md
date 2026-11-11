# Roles, acciones y cancelaciones — versión 2

La matriz aprobada se define en `js/core/rbac.js`. Las excepciones se guardan en
`usuarios.permisos_excepciones` como `{ "Módulo": { "acción": true/false } }`.
Ausencia de una acción significa heredar del rol. Denegar `ver` impide las demás acciones.

Las restricciones globales no se pueden ampliar mediante una excepción:

- Coordinadores y Técnicos editan y solicitan cancelación únicamente de capturas propias.
- Coordinadores consultan sus módulos; Técnicos consultan la operación, sin Usuarios,
  Licencias, Auditoría ni importación.
- Solo SuperAdmin y Administrador del Sistema eliminan.
- SuperAdmin, Administrador del Sistema y Jefe de Almacén resuelven cancelaciones.
- Solo SuperAdmin administra usuarios y excepciones. Licencias conserva su restricción a Emma.

## Entrega y activación

1. Publicar juntos los HTML, `js/core/rbac.js`, cambios de servicios y la pantalla de Cancelaciones.
2. Ejecutar `supabase/migrations/070_roles_acciones_cancelaciones.sql` después de las
   migraciones anteriores. Se requiere SQL Editor con permisos administrativos.
3. Entrar nuevamente o volver a enfocar la aplicación. El perfil se actualiza desde la
   sesión de servidor y recarga si cambian el rol o los permisos.
4. Verificar una cuenta por rol en el entorno publicado antes de extender su uso.

La migración conserva una fotografía sin contraseñas de las cuentas en
`et_privado.rbac_respaldo_usuarios`. No elimina `modulos_permitidos`: queda como
referencia del modelo anterior, pero la versión 2 usa la nueva matriz y sus excepciones.
Las listas antiguas no se convierten automáticamente en excepciones, pues bloquearían
los accesos nuevos expresamente acordados para Técnicos y Coordinadores.

Se conserva la compatibilidad de la interfaz con cuentas versión 1 hasta instalar SQL.
La clave REST pública no permite instalar esta migración. No ejecutar el importador
de recuperación sin sesión después de activar estas reglas: las escrituras requieren
el token de una sesión válida.

## Autoría y cancelaciones

Las nuevas capturas reciben `rbac_creado_por` desde la sesión autenticada por el
servidor. Los registros antiguos usan su campo de autoría existente. Cuando no hay
autoría verificable no se inventa: Coordinadores y Técnicos no pueden modificarlos.
El respaldo permite revisar los casos históricos con un administrador.

Cancelaciones permite seleccionar registros, indicar un motivo, aprobar o rechazar,
y consultar responsable y resolución. Aprobar marca `rbac_cancelado=true`, conserva
el registro y bloquea su edición. No borra datos ni sustituye los estados contables
importados desde SIIF. Las pantallas operativas pueden seguir mostrando la captura
histórica; el estado de la cancelación se consulta en Cancelaciones.

## Mantenimiento y pruebas

Después de editar la matriz ejecutar `node scripts/generar-rbac-sql.js`. El archivo
SQL se genera desde `scripts/rbac-migracion.template.sql` y la misma matriz usada
por JavaScript, para evitar que la configuración de servidor difiera de la interfaz.

`node scripts/test-rbac.js` verifica la matriz, excepciones, registros propios,
denegación de borrados y escalamiento de rol, sesión, cancelación e idempotencia
en PostgreSQL local. `npm.cmd run verify` ejecuta además las regresiones existentes.
