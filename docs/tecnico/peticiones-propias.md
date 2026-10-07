# Edición de peticiones propias de gdavis

La cuenta verificada `827cb6d4-5879-4a85-9fdf-b325f37250e6` tiene una excepción de edición por registro en la aplicación. Se conserva su permiso general de consulta en Peticiones y el resto de sus permisos. La regla no se extiende a otra cuenta que utilice el mismo nombre de usuario.

Se consideran propias las peticiones cuyo ID aparece en una entrada de creación de auditoría con ese usuario: operación INSERT o acción heredada `Creo nueva peticion`. No se deduce la autoría del solicitante ni del área. Las entradas de modificación no otorgan propiedad. Si no existe evidencia de creación, la petición permanece sin edición para gdavis.

La pantalla consulta los IDs con paginación, muestra Editar y Eliminar solo en los registros propios y comprueba también apertura y guardado. El servicio vuelve a consultar la autoría antes de actualizar o eliminar. Un error de consulta deniega la operación. La eliminación conserva su diálogo de confirmación. No se conceden generación de requisiciones ni edición o eliminación de otras peticiones. Se permiten las peticiones propias de cualquier área, conforme a la aclaración del usuario.

En Control de Taller, gdavis puede editar y registrar la salida de cualquier ingreso, de todas las areas, incluidos los registros de otros autores o sin autor. Las actualizaciones no filtran por creador y conservan la autoria original. Se mantienen las comprobaciones de cuenta activa y solo lectura. La eliminacion conserva el RPC existente, que comprueba al creador y solicita su clave. No se modifica el comportamiento de otros usuarios ni los permisos de Peticiones.

Esta regla utiliza el control de acceso de la aplicación existente; no introduce autenticación JWT ni sustituye las políticas heredadas de Supabase. Requiere publicar el HTML de Peticiones y el servicio actualizado para estar disponible en el sitio. No es necesario modificar el permiso general de la cuenta ni ejecutar SQL.

Prueba: `node scripts/test-peticiones-propias.js`.
