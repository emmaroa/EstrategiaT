# Edición de peticiones propias de gdavis

La cuenta verificada `827cb6d4-5879-4a85-9fdf-b325f37250e6` tiene una excepción de edición por registro en la aplicación. Se conserva su permiso general de consulta en Peticiones y el resto de sus permisos. La regla no se extiende a otra cuenta que utilice el mismo nombre de usuario.

Se consideran propias las peticiones cuyo ID aparece en una entrada de creación de auditoría con ese usuario: operación INSERT o acción heredada `Creo nueva peticion`. No se deduce la autoría del solicitante ni del área. Las entradas de modificación no otorgan propiedad. Si no existe evidencia de creación, la petición permanece sin edición para gdavis.

La pantalla consulta los IDs con paginación, muestra Editar solo en los registros propios y comprueba también apertura y guardado. El servicio vuelve a consultar la autoría antes de actualizar. Un error de consulta deniega la edición. No se conceden eliminación, generación de requisiciones ni edición de otras peticiones. Se permiten las peticiones propias de cualquier área, conforme a la aclaración del usuario.

Esta regla utiliza el control de acceso de la aplicación existente; no introduce autenticación JWT ni sustituye las políticas heredadas de Supabase. Requiere publicar el HTML de Peticiones y el servicio actualizado para estar disponible en el sitio. No es necesario modificar el permiso general de la cuenta ni ejecutar SQL.

Prueba: `node scripts/test-peticiones-propias.js`.
