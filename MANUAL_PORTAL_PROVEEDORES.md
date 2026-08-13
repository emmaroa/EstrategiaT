# Manual de usuario — Portal de Proveedores

**Sistema:** Administración de Talleres  
**Perfil:** Proveedor  
**Versión del manual:** 1.0  
**Fecha:** agosto de 2026

## 1. Objetivo

El Portal de Proveedores permite consultar las peticiones asignadas a su empresa, confirmar entregas al almacén, registrar notas, dar seguimiento a trámites SIIF y administrar cotizaciones o entregas sin petición.

La información mostrada pertenece únicamente al proveedor vinculado con la cuenta que inició sesión.

Una misma cuenta puede estar vinculada con varios proveedores. Cuando esto ocurra, aparecerá un selector **Proveedor** en el encabezado; el proveedor seleccionado determina qué peticiones, trámites y cotizaciones se consultan o actualizan.

## 2. Requisitos de acceso

Para utilizar el portal necesita:

- Una cuenta activa con rol **Proveedor**.
- Tener un proveedor vinculado a su usuario.
- Un navegador actualizado y conexión a internet.
- Permitir ventanas emergentes si desea imprimir comprobantes.

Si aparece el mensaje **“Tu usuario no tiene un proveedor vinculado”**, solicite al administrador del sistema que relacione su cuenta con la empresa correspondiente.

## 3. Iniciar y cerrar sesión

### Iniciar sesión

1. Abra la página de acceso al sistema.
2. Capture su usuario y contraseña.
3. Seleccione **Iniciar sesión**.
4. El sistema abrirá el portal correspondiente al perfil Proveedor.

Si intenta acceder con otro rol, el sistema indicará que el módulo es exclusivo para proveedores.

### Cerrar sesión

1. Localice el menú lateral.
2. Seleccione **Cerrar sesión**.
3. Confirme que el sistema regrese a la pantalla de acceso.

Por seguridad, cierre la sesión al terminar, especialmente si utiliza un equipo compartido.

## 4. Navegación principal

El menú del proveedor está dividido en cuatro vistas para evitar mezclar procesos:

- **Dashboard proveedor:** indicadores generales y accesos a los pendientes.
- **Peticiones de almacén:** solicitudes asignadas, confirmación de entrega y notas.
- **Cotizaciones sin requisición:** consulta, captura y exportación de cotizaciones pendientes de vincular.
- **Seguimiento de trámites SIIF:** resumen por estatus y detalle de requisiciones, órdenes de compra y solicitudes de pago.

Los módulos pueden contraerse o expandirse mediante el botón ubicado en su encabezado. El selector de tema permite cambiar la apariencia del sistema.

### Cambiar de proveedor activo

Si su cuenta administra más de un proveedor:

1. Abra el selector **Proveedor** ubicado en el encabezado.
2. Seleccione la empresa con la que desea trabajar.
3. Espere a que el portal vuelva a cargar la información.
4. Verifique el nombre mostrado antes de confirmar entregas, agregar notas o registrar cotizaciones.

El portal recuerda la selección durante la sesión. Los registros de proveedores diferentes no se mezclan en una misma vista.

## 5. Portal Proveedor

### 5.1 Indicadores generales

En la parte superior se muestran tarjetas con los siguientes indicadores:

- **Peticiones asignadas:** total de solicitudes relacionadas con el proveedor.
- **Pendientes de entrega:** peticiones que todavía no han sido confirmadas como entregadas.
- **Entregadas:** peticiones cuya entrega al almacén ya fue confirmada.
- **Trámites SIIF:** trámites activos asignados al proveedor.
- **Monto total SIIF:** suma de los importes visibles.
- **Con orden de compra:** trámites que ya cuentan con número de orden de compra.
- **En solicitud de pago:** trámites que se encuentran en esa etapa.

Los indicadores son informativos y se actualizan con los registros del portal.

### 5.2 Resumen de trámites SIIF

La sección **Trámites SIIF por estatus** agrupa los trámites según su situación actual. Cada tarjeta muestra:

- Estatus.
- Cantidad de trámites.
- Monto acumulado.
- Una barra comparativa respecto de los demás estatus.

En el encabezado se muestra la fecha de actualización de la información SIIF. Considere esta fecha al revisar cambios recientes.

### 5.3 Peticiones asignadas

La tabla presenta:

- Fecha de la petición.
- Unidad.
- Descripción de lo solicitado.
- Persona solicitante.
- Estatus interno.
- Estatus y fecha de entrega del proveedor.
- Nota del proveedor.
- Debajo del número de unidad se muestra su descripción, modelo, serie, combustible y año cuando esos datos existen en el parque vehicular.
- Acciones disponibles.

#### Buscar y filtrar peticiones

1. Escriba en el buscador una unidad, descripción, solicitante o texto incluido en una nota.
2. Si lo necesita, seleccione un **estatus interno**.
3. Seleccione **Pendientes de entrega** o **Entregadas al almacén** para filtrar por entrega.
4. Para volver a ver todos los registros, borre el texto y seleccione las opciones generales de los filtros.

#### Confirmar una entrega

1. Identifique la petición entregada físicamente al almacén.
2. Verifique cuidadosamente la unidad, material y solicitante.
3. Seleccione **Entregado**.
4. En la ventana de confirmación, seleccione **Sí, entregar**.
5. El registro cambiará a **Entregado a almacén** y guardará automáticamente la fecha y hora de confirmación.

> Importante: confirme la entrega únicamente después de que el material haya sido recibido físicamente por el almacén. El botón queda deshabilitado una vez confirmada la entrega.

#### Agregar o actualizar una nota

1. En la petición correspondiente, seleccione **Nota**.
2. Capture indicaciones, incidencias o detalles de entrega.
3. Seleccione **Guardar nota**.

El límite es de 2,000 caracteres. Para eliminar una nota existente, deje el campo vacío y guarde.

#### Exportar peticiones

1. Aplique primero los filtros que necesite.
2. Seleccione **Exportar hoja de cálculo**.
3. El navegador descargará un archivo CSV con los registros visibles según los filtros actuales.

El archivo puede abrirse con Excel, Google Sheets u otra aplicación compatible.

### 5.4 Detalle de trámites SIIF

Esta sección permite consultar el avance administrativo de los trámites. La tabla incluye:

- Fecha.
- Número de requisición.
- Unidad y concepto.
- Monto.
- Orden de compra.
- Folio de solicitud de pago.
- Etapa actual.
- Proveedor asignado.
- Estatus.

Sólo aparecen requisiciones vinculadas con el proveedor activo permitido para la cuenta. Las requisiciones sin proveedor o asignadas a otra empresa no son visibles.

#### Buscar y filtrar trámites

1. Escriba una requisición, unidad, concepto u orden de compra en el buscador.
2. Seleccione un estatus, si desea reducir los resultados.
3. Revise la etapa y los documentos disponibles en cada fila.

#### Exportar trámites

Seleccione **Exportar hoja de cálculo**. El archivo descargado respetará la búsqueda y los filtros activos.

## 6. Cotizaciones Proveedor

La opción **Cotizaciones Proveedor** muestra exclusivamente las cotizaciones vinculadas con la empresa del usuario.

Si la cuenta tiene varios proveedores permitidos, sólo se muestran las cotizaciones del proveedor activo seleccionado en el encabezado; nunca se mezclan cotizaciones de otros proveedores.

### 6.1 Indicadores de cotizaciones

Esta vista muestra:

- **Total de cotizaciones.**
- **Sin trámite:** cotizaciones sin requisición asignada.
- **Con requisición:** cotizaciones vinculadas a un trámite.
- **Monto con requisición:** importe acumulado de las cotizaciones que ya tienen número o estatus de requisición generada.
- **Requisiciones por cotizar:** cotizaciones con número de requisición que todavía no se confirman como cotizadas en el portal de compras.
- **Pendientes de revisión.**
- **Monto sin trámite:** importe acumulado de cotizaciones sin requisición.

### Notificaciones de requisición generada

Todos los módulos del proveedor muestran una campana de notificaciones en la esquina superior derecha. Cuando existen alertas nuevas aparece un contador; al pulsar la campana se despliega el listado, desde donde pueden abrirse y marcarse como leídas. Se genera una alerta cuando una cotización cambia de **Pendiente de revisión** a **Requisición generada**.

### 6.2 Consultar cotizaciones

La tabla incluye folio, fecha de entrega, unidad, número de requisición, materiales, total, estatus, notas y acciones. Materiales y notas se muestran de forma compacta; coloque el cursor sobre el texto para consultar el contenido completo.

Puede localizar registros mediante:

- Buscador por unidad, descripción o documento.
- Filtro de estatus.
- Filtro **Con y sin trámite**, **Sin trámite** o **Con requisición**.
- El buscador permite localizar cotizaciones por número de requisición, monto, folio, unidad, materiales o notas. La requisición puede escribirse con o sin guiones o espacios.
- Fechas **Desde** y **Hasta**.

Los filtros se aplican inmediatamente.

### 6.3 Registrar una entrega sin petición

Utilice esta opción cuando el material entregado no tenga una petición previa en el sistema.

1. Seleccione **Registrar entrega sin petición**.
2. Revise la **fecha de cotización**, asignada automáticamente al día actual.
3. Capture la **fecha de entrega**.
4. Capture el **número de inventario** de la unidad.
5. Salga del campo o presione otra parte de la pantalla para que el sistema busque la unidad.
6. Verifique que la descripción y dependencia correspondan a la unidad correcta.
7. Capture la cantidad, artículo o refacción y precio unitario del material.
8. Use **Agregar material** si necesita incluir más conceptos.
9. Revise subtotal, IVA del 16 % y total calculados automáticamente.
10. Agregue notas u observaciones, si corresponde.
11. Seleccione **Guardar registro**.

El nuevo registro se crea con origen **Sin petición** y estatus **Pendiente de revisión**. El sistema genera su folio.

#### Entregas para stock

Si la entrega no corresponde a una unidad específica, capture:

- `0`, o
- `STOCK`.

En estos casos la dependencia quedará pendiente.

#### Validaciones del material

Cada material debe tener:

- Artículo o descripción.
- Cantidad mayor que cero.
- Precio unitario válido, igual o mayor que cero.

La cotización debe contener al menos un material. Para eliminar una fila, use el botón **×**; la última fila no puede eliminarse.

### 6.4 Editar una cotización

1. Localice el registro.
2. Seleccione **Editar**.
3. Modifique los datos permitidos.
4. Revise nuevamente materiales e importes.
5. Seleccione **Guardar registro**.

No es posible editar desde el portal una cotización cuyo estatus sea **Requisición generada**.

### 6.5 Imprimir un comprobante

1. Localice la cotización.
2. Seleccione **Imprimir**.
3. Se abrirá el comprobante en una nueva ventana.
4. Utilice el diálogo de impresión del navegador para imprimirlo o guardarlo como PDF.

El comprobante contiene proveedor, folio, fechas, unidad, dependencia, estatus, requisición, materiales, importes y notas.

Si no se abre, permita las ventanas emergentes para el sitio e inténtelo nuevamente.

### 6.6 Exportar cotizaciones

1. Aplique los filtros de búsqueda, estatus y fecha que necesite.
2. Seleccione **Exportar todas las cotizaciones**.
3. El sistema descargará todas las cotizaciones del proveedor activo, independientemente de los filtros visuales. Incluye registros pendientes, con requisición, con requisición generada, validados y rechazados. El archivo contiene proveedor, folio, fechas de cotización y entrega, unidad, dependencia, materiales, total, número de requisición, estatus y notas.

## 7. Significado de estatus frecuentes

| Estatus | Significado |
|---|---|
| Pendiente de entrega | El material aún no se ha confirmado como recibido por almacén. |
| Entregado a almacén | El proveedor confirmó la entrega física. |
| Pendiente de revisión | La cotización fue registrada y espera validación interna. |
| Validada | La información fue revisada y aceptada. |
| Requisición generada | La cotización ya fue relacionada con una requisición y no puede editarse desde el portal. |
| Rechazada | La cotización no fue aceptada; revise las notas o contacte al área responsable. |
| Cancelada | El trámite fue cancelado y no se considera activo. |

El **estatus interno** de una petición y el **estatus de entrega del proveedor** son datos diferentes. El primero corresponde al proceso interno; el segundo indica si el proveedor ya confirmó la entrega.

## 8. Recomendaciones de uso

- Verifique la unidad y los materiales antes de confirmar una entrega.
- Capture descripciones claras y precios correctos.
- Use las notas para documentar faltantes, entregas parciales, sustituciones o incidencias.
- No comparta su contraseña.
- Evite utilizar la misma cuenta entre varias empresas o proveedores.
- Descargue reportes filtrados cuando necesite conciliaciones o seguimiento externo.
- Revise la fecha de actualización SIIF antes de reportar una diferencia.

## 9. Solución de problemas

### No aparecen peticiones o trámites

- Limpie los filtros y el texto del buscador.
- Confirme que ingresó con la cuenta correcta.
- Verifique con el administrador que su usuario esté vinculado al proveedor correcto.
- Recargue la página y compruebe su conexión a internet.

### No se encuentra una unidad

- Capture el número de inventario completo.
- Verifique que la unidad exista en el parque vehicular.
- Si el material es para almacén general, utilice `0` o `STOCK`.

### No se puede guardar una cotización

- Complete las fechas y la unidad.
- Revise que todos los materiales tengan descripción, cantidad mayor que cero y precio válido.
- Compruebe que la unidad haya sido localizada correctamente.
- Si el estatus es **Requisición generada**, la edición ya no está disponible para el proveedor.

### No se descarga un archivo

- Revise la carpeta de descargas del navegador.
- Compruebe que el navegador permita descargas desde el sitio.
- Intente nuevamente después de recargar la página.

### No se abre el comprobante de impresión

- Habilite las ventanas emergentes para el sitio.
- Vuelva a seleccionar **Imprimir**.

### La información SIIF no refleja un cambio reciente

- Revise la fecha de actualización mostrada en el portal.
- Espere la siguiente actualización de datos.
- Si la diferencia continúa, contacte al administrador o al área responsable del trámite.

## 10. Soporte

Al solicitar soporte, proporcione:

- Nombre del proveedor.
- Usuario con el que inició sesión, sin compartir la contraseña.
- Folio, petición, requisición o número de unidad relacionado.
- Descripción breve del problema.
- Captura de pantalla del mensaje recibido, si es posible.

No envíe contraseñas ni información bancaria mediante notas de petición o campos de observaciones.
