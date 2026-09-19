# Auditoría central de movimientos

## Hallazgos

- La bitácora dependía de llamadas manuales a `registrarAuditoria`; faltaban en operaciones de Calendario, Control de Taller, Inventario, Tiempo Extra y otros servicios.
- La consulta se limitaba a 1,000 filas. Los filtros se aplicaban solo a ese subconjunto y ofrecían una lista fija de módulos/acciones.
- Al fallar la lectura remota se mostraba silenciosamente una copia local. «Limpiar historial» vaciaba la vista y esa copia, pero no el historial central.
- Una falla de localStorage podía impedir enviar un evento manual. Inicio/cierre de sesión navegaban antes de esperar el envío.

## Activación

Ejecutar `supabase/migrations/052_auditoria_movimientos.sql` después de las migraciones existentes y publicar los archivos web actualizados. La migración instala triggers en las tablas actuales del esquema `public` (excepto `auditoria`, tablas pertenecientes a extensiones y particiones hijas cubiertas por su padre).

Los cambios empiezan a registrarse al aplicar la migración. No hay reconstrucción automática de operaciones históricas que nunca se auditaron.

## Comportamiento

- Cada INSERT/UPDATE/DELETE genera un registro por fila con tabla, identificador, operación y valores anteriores/nuevos. Un UPDATE sin cambios no crea evento.
- TRUNCATE genera un evento por tabla; no conserva las filas que se vaciaron.
- La auditoría se inserta en la misma transacción: un rollback no deja eventos de cambios que no ocurrieron. Si falla la auditoría, tampoco se confirma el cambio de datos.
- Se cubren importaciones, operaciones RPC y cambios SQL en las tablas incluidas, aun cuando la pantalla no llame al registrador manual.
- Las acciones manuales (inicio/cierre de sesión, impresiones y otras acciones instrumentadas) se conservan. Pueden coexistir un evento funcional y otro de cambio de datos para una misma operación; la pantalla distingue su origen.
- Se protegen campos de contraseña, claves y tokens en los objetos JSON, también anidados. Los cambios exclusivamente de contraseña dejan evento, pero no revelan los valores. No se procesan retrospectivamente los registros antiguos; texto libre no estructurado no tiene redacción semántica.
- Se impide modificar, borrar o truncar la bitácora desde los roles web. Los administradores de la base de datos siguen teniendo control administrativo.
- La consulta usa cursor por fecha e ID hasta agotarse, sin el corte de 1,000. La pantalla muestra páginas de 100 y deriva los filtros de todos los registros consultados. Las cargas fallidas se anuncian y no sustituyen datos por la copia del dispositivo.
- SuperAdmin consulta todos los eventos; los demás roles conservan la vista filtrada a sus propios movimientos. Esto es el comportamiento de la interfaz existente, no una nueva restricción RLS de lectura.

## Identidad y alcance

El cliente compartido envía el ID del usuario activo como contexto. El trigger consulta su nombre y rol en la base de datos y lo marca como **identidad declarada por la aplicación**, porque el login heredado no proporciona un JWT de usuario verificable. Esa cabecera no sirve para autorizar operaciones. Sin contexto válido, el evento se registra como origen no identificado; no se atribuye al creador original de la fila.

Se registran mutaciones de las tablas públicas existentes. Las lecturas, descargas y acciones de interfaz solo figuran si tienen un evento explícito. Los cambios privados de licencias conservan su historial privado; actualizar la licencia pública actual sí genera una auditoría central. No se incluyen Storage/Auth, tablas nuevas posteriores, cambios DDL ni operaciones locales sin guardado en el servidor.

Al crear nuevas tablas, instalar los triggers `et_auditoria_movimiento` y `et_auditoria_vaciado` dentro de su migración. Revisar volumen y retención: la bitácora crece por cada fila modificada y la consulta completa se mantiene en memoria en el navegador.

## Pruebas

`npm.cmd run test:auditoria` verifica paginación de 1,205 registros con límite de servidor inferior al lote solicitado, filtrado por usuario, fallo remoto, triggers de alta/cambio/baja/vaciado, rollback, identidad inválida, redacción de secretos anidados y bloqueo de modificaciones a la bitácora en PostgreSQL aislado.
