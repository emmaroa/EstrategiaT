# Avisos del calendario

La campana común incorpora los eventos del calendario sin requerir otra migración. Al entrar en cualquier módulo, recuperar el foco, abrir la campana o cada 30 segundos con la página visible, se consultan los eventos vigentes del usuario. Guardar o eliminar un evento actualiza los avisos de esa pantalla inmediatamente; los otros usuarios los reciben en la siguiente consulta.

- Evento agendado: eventos compartidos con Todos o con el usuario seleccionado, excluyendo el propio creador.
- Próximo evento: desde 30 minutos antes hasta el inicio, también para eventos personales y del creador.
- Los proveedores y las cuentas sin acceso al Calendario no reciben estos avisos.
- Los eventos finalizados, eliminados o que dejan de compartirse desaparecen al actualizar.
- Cambiar el horario genera un nuevo recordatorio. Una actualización del evento compartido genera un aviso actualizado.
- Ver elemento abre la fecha y el detalle del evento; no abre el editor.

La deduplicación de avisos emergentes y la lectura se guardan en localStorage por usuario y dispositivo. Las notificaciones existentes continúan guardando su lectura en Supabase. La consulta del calendario se pagina de 500 en 500, filtra la audiencia y comprueba los destinatarios antes de mostrar datos. Las fechas capturadas se convierten de hora local a ISO UTC antes de guardar.

Estos avisos funcionan dentro de EstrategiaT con sesión activa. No son push del sistema operativo y no se entregan con el navegador cerrado. Al volver al sistema se muestran los eventos todavía vigentes. No se solicita permiso de notificaciones al navegador, ni se envían correos.

Validación: `npm.cmd run test:calendar-notifications` prueba destinatarios, privacidad, ventana temporal, cambios de horario, paginación, errores y persistencia; también abre el navegador con datos sintéticos y verifica la campana, contador, lectura y eliminación de avisos. No usa cuentas ni datos de producción.
