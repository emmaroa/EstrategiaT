# Roles y permisos de usuarios

## Activación

Ejecutar `supabase/migrations/077_administracion_roles.sql` después de las
migraciones de seguridad anteriores. Publicar el cliente actualizado y cerrar
sesión para entrar de nuevo. No necesita volver a ejecutar 070–076. El paquete
completo también incluye 077 para instalaciones nuevas.

## Uso

- En **Usuarios**, cada módulo tiene Sin acceso, Solo lectura o Lectura y edición.
  Un buscador filtra los módulos. Las excepciones por acción se encuentran dentro
  de un desplegable. Las cuentas nuevas comienzan sin módulos seleccionados.
- **Usar módulos del rol** copia los módulos actuales del rol y limpia las
  excepciones, previa confirmación. Después hay que guardar el usuario. Cambiar
  solo el rol no amplía automáticamente la lista personal.
- **Roles**, en Sistema, permite crear, renombrar, editar permisos y eliminar roles.
  La clave identifica el rol y no cambia después del alta. Los nombres se muestran
  en el selector de Usuarios, incluidos los roles nuevos.
- Las acciones detalladas permiten ajustar la plantilla. El rol define permisos
  base; la lista personal sigue siendo un límite. Las excepciones explícitas de
  una cuenta siguen teniendo su significado dentro de ese límite.

## Protección

Roles está reservado a sesiones activas de SuperAdmin (incluida la cuenta
propietaria Emma). Esta exclusividad se valida tanto en la pantalla como en cada
RPC. Es una excepción deliberada a la selección personal del módulo Roles: un
SuperAdmin conserva el acceso a la administración de roles.

No se puede eliminar SuperAdmin, quitarle sus accesos administrativos esenciales,
eliminar un rol asignado a alguna cuenta (incluso inactiva), ni asignar un rol que
no existe. La revisión por rol impide sobrescribir cambios concurrentes. Se
registran actor, fecha y permisos antes/después en et_privado.roles_historial.
Las tablas de administración no tienen acceso directo desde el cliente.

Los módulos Usuarios, Roles y Licencias no se pueden conceder a otros roles;
Licencias conserva su restricción a la propietaria. El borrado de registros y la
aprobación de cancelaciones conservan sus límites anteriores. Las restricciones
por autoría de coordinadores y técnicos siguen vigentes.

La sesión devuelve ahora permisos_rol desde la base de datos. El cliente actualiza
esos permisos al volver al foco y recarga si cambiaron; al iniciar sesión obtiene
el perfil actual. La autorización SQL aplica los cambios inmediatamente.
La reinstalación de las semillas no debe sobrescribir los roles ya administrados.

## Validación

`npm.cmd run test:roles`: PostgreSQL local y Edge sin conexión a producción.
Incluye denegación anónima y de otros roles, CRUD, edición concurrente, rol en uso,
asignación, trazabilidad, actualización de permisos, formularios y ancho móvil.
No se ha aplicado la migración a la base remota desde esta sesión.
