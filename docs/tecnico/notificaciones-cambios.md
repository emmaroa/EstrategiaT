# Avisos de cambios — 2.0.139

La interfaz consulta la bandeja cada 30 segundos mientras la aplicación está visible, al recuperar conexión/foco y tras guardar datos. Muestra avisos emergentes sin repetirlos al navegar, incluye todos los avisos pendientes y conserva la bandeja cuando falla la conexión. Son avisos dentro de la aplicación; no son notificaciones push con la aplicación cerrada.

Desde 2.0.142, **Mi perfil → Notificaciones** permite elegir categorías, silenciar todos los avisos y desactivar únicamente los emergentes. La campana incluye un enlace a esa configuración. Las preferencias se guardan por identificador de usuario en este dispositivo; no se sincronizan entre dispositivos. No requieren una migración nueva.

El filtro se aplica al contador, la lista y los emergentes de ambos orígenes (base de datos y calendario). Los avisos desactivados no se eliminan y «Leer todas» solo marca los avisos visibles. Al reactivar una categoría, los avisos conservados vuelven a la lista sin repetir emergentes antiguos. Las preferencias no amplían permisos ni cambian los destinatarios calculados en el servidor.

## Activación

Aplicar `supabase/migrations/064_notificaciones_cambios_usuario.sql` en el proyecto de Supabase antes o junto con la publicación de esta versión. La migración es transaccional e idempotente, sustituye los dos disparadores antiguos de tickets/cotizaciones y no modifica registros de negocio ni genera avisos retroactivos.

La migración genera avisos persistentes en `notificaciones` al insertar, modificar o eliminar registros de los módulos configurados: calendario, tickets, peticiones, cotizaciones, requisiciones y documentos SIIF, taller, parque vehicular, vales, inventario, proveedores, empleados, tiempo extra, trámites administrativos y cuentas de usuario. Los cambios guardados mientras un usuario está desconectado quedan disponibles al regresar.

Los destinatarios se calculan con ambos estados del registro: responsables y creadores, autores históricos registrados en auditoría, coordinadores del área y proveedores relacionados. Las cuentas operativas de administración, dirección, compras y almacén reciben los cambios de las colas a las que tienen permiso. Los calendarios personales se restringen a su creador y los seleccionados a sus destinatarios. Los cambios de cuenta se notifican solamente a la cuenta afectada. No se generan avisos por actualizar únicamente marcas de tiempo/revisión.

Las cuentas inactivas y los módulos expresamente denegados no reciben avisos. Al retirar una asignación o eliminar un registro se conserva un aviso sin enlace al contenido retirado. Los mensajes identifican campos modificados, sin copiar sus valores ni credenciales.

El mapa de permisos por rol de la migración proviene de `ETPermissions.obtenerModulosUsuario` en `js/core/permissions.js`. Si cambian los permisos por defecto o se añaden módulos/tablas, actualizar ese mapa y la configuración de disparadores mediante una nueva migración.

## Validación

- `npm.cmd run test:notifications`: bandeja paginada, destinatarios y generación SQL con PostgreSQL local (PGlite), incluidos fallos, reasignación, privacidad, permisos, rollback e idempotencia.
- `node scripts/test-calendar-notifications-browser.js`: campana y avisos generales/calendario en navegador, lectura y recuperación de fallos.
- `npm.cmd run verify`: suite general del proyecto.

La activación en producción requiere acceso administrativo de Supabase. La clave pública de la aplicación no permite aplicar la migración.
