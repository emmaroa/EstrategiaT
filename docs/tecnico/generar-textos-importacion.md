# Importación en Generar textos

La captura manual y la biblioteca de textos frecuentes permanecen disponibles. Los archivos y sus datos se procesan en memoria local; no se envían ni se guardan en Supabase.

## Uso

1. Abrir **Generar Textos → Importar archivo**.
2. Seleccionar o arrastrar un `.xlsx`, `.xls` o `.csv` (un archivo por importación, hasta 10 MB).
3. Elegir la hoja. El lector busca la fila de encabezados entre las primeras 100 filas. Si no la reconoce con suficiente certeza, indicar la fila manualmente; `0` significa que no hay encabezados.
4. Revisar la relación de columnas y la vista previa de las cinco primeras filas con datos. **Unidad está fija en F, índice 5**, independientemente de su encabezado. Los otros siete campos se relacionan por nombres equivalentes, ignorando mayúsculas, acentos, espacios, puntos y guiones. Una coincidencia ambigua se deja pendiente de selección manual.
5. Pulsar **Procesar archivo**. Las filas se añaden a la tabla existente sin borrar datos capturados. Si se deja un campo sin columna, las filas se importan como incompletas para corregirlas manualmente. Las filas totalmente vacías se omiten.
6. Completar campos faltantes en la tabla o usar **Editar** en la tarjeta del resultado. El texto se regenera automáticamente al editar. También hay un botón **Regenerar** por fila.
7. Copiar una tarjeta, **Copiar todos** o **Descargar textos**. Las acciones conjuntas incluyen todos los textos completos de la captura, aunque el buscador o filtro oculten algunos, separados por una línea en blanco. La descarga es un TXT UTF-8.

**Cancelar importación** descarta solo el archivo pendiente. **Limpiar resultados** oculta los resultados conservando las filas editables; **Generar textos** los vuelve a generar. Agregar fila y Eliminar funcionan sin importar archivos. La tabla y los resultados se paginan de 50 en 50, con un máximo de 10,000 filas de datos en la captura.

## Formato exacto

```text
3351: PAGO DE FACTURA 4587 POR ADQUISICION DE BALATAS DELANTERAS PARA UNIDAD 3351 DE SERVICIOS PUBLICOS.
OC 1724 REQ 2851 963
PROCEDIMIENTO EN PORTAL WEB DE COMPRAS: T26-01458
```

Cada texto tiene **tres renglones y dos saltos de línea internos**, sin líneas vacías entre ellos. Se eliminan espacios redundantes y se convierte a mayúsculas. No se añaden `OC-`, `REQ-`, `EA-` ni `T26-`; los prefijos presentes en los datos sí se conservan. Artículo y dependencia no se convierten a números.

Si la unidad no contiene ningún dígito (incluidos vacío, STOCK o SIN UNIDAD), el texto usa `STOCK: ... PARA UNIDADES DE ...`. Se conservan unidades numéricas y alfanuméricas, incluido `0` y sus ceros iniciales. `2743.0` pasa a `2743` en identificadores. También se respetan máscaras numéricas como `000000`: un valor 35 se importa como `000035`. Si Excel ya eliminó los ceros y el archivo no contiene una máscara que los indique, no se inventan ceros. Los números enteros fuera de la precisión segura y las fórmulas sin resultado guardado se marcan para corregir; no se ejecutan fórmulas. El folio de entrada se imprime directamente después de REQ, sin añadir la palabra ENTRADA.

## Librerías y seguridad

- Se reutiliza **ExcelJS 4.4.0** del proyecto para `.xlsx`.
- Se agrega **SheetJS CE 0.20.3** local para `.xls` binario BIFF, con licencia Apache-2.0 y SHA-256 en `js/vendor/manifest.json`. [Distribución oficial](https://docs.sheetjs.com/docs/getting-started/installation/standalone/).
- CSV usa un lector local que conserva texto, reconoce coma, punto y coma o tabulador, admite celdas entre comillas, comillas escapadas, saltos internos y BOM. Intenta UTF-8 y admite Windows-1252 como alternativa.
- La lectura se ejecuta en un **Web Worker** para mantener operativa la interfaz. Se requiere abrir el proyecto mediante un servidor HTTP/HTTPS, como el resto de la aplicación, no mediante `file://`.
- Se validan extensión, firma de Excel, tamaño, límites de filas/columnas y errores de lectura. Un fallo o cancelación conserva la captura previa.
- Los valores se insertan con `textContent` o propiedades de controles, nunca como HTML ejecutable. El módulo reutiliza el cliente Supabase, la navegación, la autenticación y el tema existentes; no crea nuevos clientes ni escribe datos remotos.

## Archivos

Modificados:

- `modulos/generar-textos.html`: apartado Importar archivo, selector de hojas, columnas, vista previa, acciones y filtros; lógica del módulo trasladada a un archivo separado.
- `.gitignore`: excluye artefactos de pruebas.
- `js/vendor/manifest.json`: dependencia SheetJS fijada y licenciada.
- `package.json`: comandos de prueba y verificación.
- Archivos sincronizados por el comando oficial de versión: `VERSION.json`, `package.json`, `package-lock.json`, `js/core/supabase.js`, `android/app/build.gradle`.

Nuevos:

- `css/generar-textos-importacion.css`.
- `js/modules/generar-textos.js`.
- `js/modules/textos-importacion.worker.js`.
- `js/services/textos-tabulares.js`.
- `js/vendor/xlsx.js` y `js/vendor/xlsx.js.LICENSE`.
- `scripts/test-generar-textos.js`.
- `scripts/test-generar-textos-browser.js`.
- Este documento.

El cambio pendiente anterior en `modulos/usuarios.html` se conserva; no forma parte de la importación.

## Pruebas reproducibles

```powershell
npm.cmd run test:generar-textos
npm.cmd run verify
```

La prueba del lector genera XLSX con varias hojas y encabezados desplazados, XLS BIFF8/BIFF5 y CSV, verifica que Unidad proviene de F aunque exista otra columna llamada Unidad, e incluye valores numéricos, ceros iniciales, máscaras Excel, STOCK, 0, decimales, encabezados alternativos, acentos, filas vacías, errores y 5,000 registros. Compara el texto completo carácter por carácter con el formato solicitado.

La prueba de navegador usa Edge headless y el layout real con datos sintéticos. Comprueba el Worker, importación, mapeo manual, cambio de hoja, edición de incompletas, captura y eliminación manuales, copia individual, copia de todos, fallback del portapapeles, mensaje exacto, descarga TXT, contenido malicioso tratado como texto, conservación de datos ante errores/cancelación, paginación de 1,004 filas y ancho móvil de 390 px. No usa cuentas ni datos de producción.

Resultado: pruebas de lector y navegador aprobadas. Los artefactos de navegador se guardan en `.tmp-textos/` y no se versionan.
