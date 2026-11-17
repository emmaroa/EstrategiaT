# Cancelación desde cada módulo — 2.0.170

En una instalación que ya tiene las migraciones de seguridad hasta 077, ejecutar `migrations/078_cancelacion_desde_modulos.sql` en el SQL Editor de Supabase y publicar el cliente 2.0.170. La instalación conjunta `INSTALAR_SEGURIDAD.sql` también incluye esta migración.

El módulo independiente Cancelaciones desaparece. Dentro de cada módulo compatible, el botón **Cancelación de registros** permite elegir un registro, escribir un motivo y confirmar. El permiso se configura como **Cancelar registros** en las acciones del rol o las excepciones del usuario. Conserva la clave interna `solicitar_cancelacion` para respetar los permisos existentes; ahora cancela directamente, sin una aprobación separada. Se mantienen las restricciones de autoría y proveedor.

La cancelación es lógica: conserva el registro, marca `rbac_cancelado` y bloquea su edición. No cambia los estados particulares de cada tabla ni elimina registros relacionados. El selector **Cancelados** permite consultar el motivo y la fecha. Se guarda también el identificador del usuario que canceló. Se conserva el historial anterior; las solicitudes pendientes se resuelven cuando alguien autorizado cancela su registro.

Los procedimientos anteriores de solicitud y aprobación dejan de ser ejecutables desde el cliente. La nueva operación verifica sesión, visibilidad y permiso en la base de datos; requiere un motivo de 5 a 1000 caracteres y evita cancelaciones duplicadas.
