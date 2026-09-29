# Crear cotización desde XML

## Uso y activación

1. Ejecutar **una vez** `supabase/migrations/056_crear_cotizacion_xml.sql` en el SQL Editor del proyecto Supabase actual. No elimina ni altera las cotizaciones de almacén existentes. La migración es transaccional y se puede volver a ejecutar.
2. Publicar los archivos web del proyecto por el mismo mecanismo que ya utiliza EstrategiaT. No se crea otro cliente de Supabase.
3. Iniciar sesión con **SuperAdmin** o **Compras** y abrir **Operación → Crear cotización**. Cuando una cuenta usa permisos individuales, agregar `Crear cotización` con permiso `editar` en Usuarios; los permisos individuales siguen teniendo prioridad sobre el rol. El permiso `ver` permite recuperar, visualizar, descargar e imprimir, sin crear ni editar.
4. Seleccionar o arrastrar XML de ingreso CFDI 3.3/4.0. Se permiten 20 archivos por lote, hasta 5 MB y 1,000 conceptos por archivo. Cada archivo tiene su propio estado, editor, nota, PDF e impresión. Quitar un archivo solo lo retira de esta sesión, no borra cotizaciones guardadas.
5. Abrir **Editar / vista previa**, revisar emisor, receptor, conceptos, impuestos y nota. Cantidades y precios recalculan los totales. Una base de impuesto vacía usa importe menos descuento; una base explícita y los importes manuales permiten representar casos particulares. Las tasas se capturan como fracción: `0.16` significa 16 %. Los impuestos globales no desglosados por concepto se muestran como ajustes editables.
6. En **Conectar guardado y recuperar cotizaciones**, confirmar la contraseña de la cuenta actual. Se valida en el servidor y se mantiene solo en memoria por 15 minutos; nunca se guarda en localStorage, en el XML ni en la cotización. **Desconectar** la elimina de memoria.
7. Pulsar **Guardar cotización**. El servidor asigna `COT-año-consecutivo` usando la secuencia existente de almacén. No se generan consecutivos en el navegador. El folio puede corregirse, con comprobaciones de unicidad. Las nuevas cotizaciones comparten la secuencia con almacén, pero tienen sus propias tablas.
8. Pulsar **Descargar PDF** o **Imprimir**. Antes de guardar, el documento se identifica como **BORRADOR · pendiente de guardar** si no se ha capturado un folio. Para documentos definitivos, guardar primero. La impresión usa tamaño carta; desactivar los encabezados y pies del navegador si su diálogo los tiene habilitados (la aplicación no controla esa preferencia del navegador).

El análisis local y la generación de PDF funcionan sin la migración. **El guardado y la recuperación requieren instalarla.** Si no existe, la interfaz muestra un mensaje específico y conserva el trabajo local. No se ha ejecutado esta migración contra producción desde esta sesión: no hay conexión administrativa a Supabase disponible.

## Archivos nuevos

- `modulos/crear-cotizacion.html`: pantalla integrada.
- `css/crear-cotizacion.css`: editor responsive, vista previa e impresión.
- `js/modules/crear-cotizacion.js`: carga, edición, estados y acciones.
- `js/services/cotizacion-xml.js`: lectura XML, validación y cálculo decimal.
- `js/services/cotizacion-pdf.js`: composición vectorial y vista previa.
- `js/services/crear-cotizacion.service.js`: RPC con el cliente global existente.
- `supabase/migrations/056_crear_cotizacion_xml.sql`: esquema, validaciones y RPC.
- `supabase/migrations/057_independizar_crear_cotizacion.sql`: elimina el v?nculo de folios en instalaciones anteriores, conservando los datos existentes.
- `js/vendor/jspdf.js` y licencia: jsPDF 4.2.1 local.
- `js/vendor/fonts/NotoSans-Regular.ttf` y `OFL.txt`: fuente abierta local.
- `scripts/test-crear-cotizacion-browser.js` y `scripts/test-crear-cotizacion-sql.js`: pruebas reproducibles sin datos reales.
- Este documento.

## Integración modificada

`js/core/permissions.js` registra módulo, ruta, descripción y acceso de Compras; SuperAdmin incluye todos los módulos automáticamente. `js/core/layout.js` lo incorpora al sidebar de Operación. `package.json` añade `test:crear-cotizacion` y la prueba SQL al verificador general. `js/vendor/manifest.json` registra la versión, licencia y SHA-256 de jsPDF. `.gitignore` excluye artefactos de prueba. El comando oficial de versión sincroniza VERSION.json, package.json, package-lock.json, js/core/supabase.js y android/app/build.gradle.

La página carga una sola vez la autenticación existente, como los demás módulos; `validarPermiso` y `ETLayout.inicializar` se reutilizan. No se cambia el inicio de sesión ni se instancian clientes Supabase nuevos.

## Persistencia y decisiones

La tabla `cotizaciones_almacen` exige datos de unidades y calcula IVA fijo al 16 %. No es compatible con CFDI arbitrarios. Por ello la migración agrega:

- `cotizaciones_xml`: encabezado, proveedor/receptor, totales, nota, autor, revisión y fechas.
- `cotizaciones_xml_conceptos`: conceptos ordenados y sus impuestos.
- `cotizaciones_xml_origen`: UUID, nombre y SHA-256 del XML, más los atributos de referencia. **No almacena el XML completo.**

Las tres tablas tienen RLS, sin políticas públicas y sin privilegios directos para `anon` o `authenticated`. Los RPC `guardar_cotizacion_xml` y `listar_cotizaciones_xml` verifican cuenta activa, contraseña y permisos contra `usuarios`; no confían en roles o encabezados del navegador. La validación sigue el mecanismo de credenciales propio ya utilizado por los RPC de respaldo del proyecto. Esta implementación no sustituye ni endurece globalmente el sistema de autenticación previo.

El guardado es atómico; la revisión evita sobrescribir una edición concurrente. UUID, hash y folio únicos evitan duplicados. El servidor recalcula importes con `numeric`; el navegador usa `BigInt` con seis decimales y redondeo a centavos. Se conservan importes originales hasta editar cantidad, precio o descuento. Diferencias entre el total de origen y los conceptos producen una advertencia para revisión. No se consulta al SAT ni se certifica la validez fiscal del archivo.

Los textos importados se colocan con `textContent`, propiedades de formulario y primitivas PDF; no se interpretan como HTML. Se rechazan DTD y entidades. El XML no se envía a servicios de conversión; solo los datos estructurados llegan al Supabase existente cuando se guarda.

## PDF

Texto vectorial, fuente Noto Sans embebida, tamaño 612 × 792 puntos (carta vertical). La altura se calcula con las métricas reales de la fuente, incluyendo líneas envueltas. Los documentos extensos usan interlineado, filas y márgenes compactos antes de escalar todo el contenido al área imprimible. El mismo conjunto de coordenadas genera el PDF y el SVG de vista previa e impresión; no se rasteriza el documento ni se eliminan conceptos. La interfaz avisa si la escala queda debajo del 75 %. Una nota vacía no ocupa un bloque. El PDF siempre tiene una página; con cantidades extremas de texto la legibilidad disminuye y se muestra la advertencia.

Referencias de las dependencias: [documentación oficial de jsPDF](https://parallax.github.io/jsPDF/docs/jsPDF.html), [fuentes Noto](https://github.com/notofonts/noto-fonts). Ambas dependencias se distribuyen localmente con licencia; la pantalla no depende de un CDN.

## Pruebas

Ejecutar:

```powershell
npm.cmd run test:crear-cotizacion
npm.cmd run verify
```

La prueba de navegador utiliza Edge headless (ruta alternativa mediante `BROWSER_PATH`), el layout real y XML sintéticos. Sustituye autenticación, licencia y transporte de datos para no tocar producción. Comprueba CFDI 3.3/4.0, uno y varios conceptos, carga simultánea, errores aislados, duplicados, IVA 16 %, tasa cero, exento, tasa 8 %, retenciones, contenido malicioso, edición decimal y desde el formulario, nota vacía/con contenido, descarga de un PDF real, acceso por roles e impresión carta de una página sin desplazamiento horizontal a 390 px.

La prueba del documento extenso conserva el último de 150 conceptos, incluye una nota larga y verifica que todos los textos quedan dentro de la hoja. Los artefactos quedan en `.tmp-cotizacion/`, incluyendo `cotizacion-150-conceptos.pdf`, `impresion.pdf` y `movil.png`.

La prueba SQL usa PostgreSQL aislado mediante PGlite y ejecuta la migración real. Comprueba guardado/recuperación, edición, totales, errores, duplicados, revisiones concurrentes, secuencia independiente, denegación del acceso directo, contraseña incorrecta, cuenta inactiva, roles y permisos de solo lectura.

Resultado en versión **2.0.101**: ambas pruebas nuevas aprobadas y `npm.cmd run verify` completado sin errores (21 advertencias preexistentes). Se verificaron también los PDF de impresión normal y de 150 conceptos: ambos contienen exactamente una página. El segundo queda en `.tmp-cotizacion/impresion-150-conceptos.pdf`.

**Verificación pendiente en producción:** después de instalar la migración, conectar el guardado con una cuenta autorizada, guardar un XML, recargar la página, recuperar el registro y descargarlo; probar también con una cuenta sin permiso. Las pruebas locales no acreditan la configuración de un Supabase remoto que no se ha conectado.

Actualizaci?n **2.0.102**: prueba de independencia aprobada. Crear cotizaci?n funciona sin las tablas de Gesti?n; cuando esas tablas existen, no las modifica ni consume su consecutivo. La migraci?n 057 conserva folios previos y utiliza la nueva secuencia para altas posteriores.
