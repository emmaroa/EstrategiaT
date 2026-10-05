# Columnas de tablas y exportaciones

Todas las pantallas de la aplicación que cargan el layout incluyen `js/core/table-columns.js`. El componente detecta tablas existentes y nuevas, incluso las de ventanas de detalle. El botón **Columnas** permite elegir campos visibles; Todas restaura la vista completa. Se requiere al menos una columna. Cancelar o Escape conservan la selección anterior.

Las preferencias se guardan localmente por usuario, ruta y tabla. La visibilidad y las columnas de exportación tienen preferencias independientes. Las columnas ocultas por el módulo o sus permisos no se ofrecen en la exportación genérica. El componente no solicita datos adicionales a Supabase.

**Exportar tabla cargada** descarga CSV de las filas presentes en el DOM, incluidas las páginas de la paginación local y excluidas las filas filtradas, estados vacíos, cargas y acciones. Si el módulo pagina en el servidor, esta opción solo incluye las filas cargadas. Su título aclara esta limitación. Los exportadores originales siguen usando sus conjuntos completos filtrados y ahora abren el selector de columnas: Peticiones, Gestión de Cotizaciones, Portal proveedor, Seguimiento SIIF, Control de Taller, Reportes de Cotizaciones y Trámites administrativos.

Los formatos documentales (cotizaciones PDF, oficios y plantillas oficiales de tiempo extra) conservan su estructura; sus tablas en pantalla sí admiten personalización y CSV. La impresión de tablas de la pantalla respeta las columnas visibles y oculta los controles.

El componente conserva posiciones lógicas de celdas con colspan y rowspan, ajusta totales y reaplica preferencias tras cambios de filas o encabezados. No elimina celdas ni cambia índices usados por captura y edición. Los esquemas de columnas se identifican por etiqueta y ocurrencia. Nuevas columnas aparecen por defecto. Al renombrar una columna comienza con su preferencia predeterminada.

Pruebas: `npm.cmd run test:table-columns`, `npm.cmd run test:generar-textos` y `npm.cmd run verify`. La prueba de navegador usa datos sintéticos, verifica descargas reales, selección independiente, persistencia por usuario, permisos, filas dinámicas, encabezados agrupados, totales, paginación local, cancelación y vista móvil.
