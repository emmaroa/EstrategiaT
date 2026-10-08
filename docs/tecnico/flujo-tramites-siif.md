# Seguimiento operativo de trámites SIIF

Disponible en **Seguimiento SIIF**, sin un nuevo permiso de menú. La tabla importada
`requis_siif` es el origen del trámite; conserva sus relaciones con `oc_siif` y
`sp_siif`. El seguimiento es independiente de los estados contables de SIIF.

## Flujo

Desde la migración `064_sp_emitida_ubicacion_libre.sql`, las SP en **Emitido** o
**Emitida** (sin distinguir mayúsculas ni espacios) permiten cualquier ubicación
del catálogo y cualquier responsable capturado, independientemente de la etapa.
La excepción aplica tanto al movimiento individual como al masivo y por CSV.
Si otra SP relacionada tiene un estado informado distinto, prevalece el envío
automático. Las SP sin estado no habilitan por sí solas esta excepción.
La migración corrige la marca automática anterior y registra el cambio en el
historial, conservando la ubicación hasta que alguien registre el lugar real.
Requiere ejecutar la migración 064 después de la 063 en Supabase y publicar los
archivos actualizados. La validación local no aplica SQL a la base compartida.

| Etapa | Área que actúa | Ubicación sugerida |
| --- | --- | --- |
| Elaboración de requisición | Compras | Compras |
| Carga en portal web de compras | Compras | Compras |
| Espera de cotización | Proveedor; seguimiento de Compras | Compras |
| Asignación de OC | Compras | Compras |
| Autorización de OC | Administrativo | Administrativo |
| Espera de facturación | Proveedor; seguimiento de Compras | Compras |
| Recepción de factura y comprometido SIIF | Compras | Compras |
| Firmas de Almacén | Almacén | Almacén |
| Firmas de Administrativo | Administrativo | Administrativo |
| Acuse y envío a Oficialía Mayor | Compras | Enviado |

Durante la espera de cotización/factura la ubicación permanece en Compras y el
proveedor es obligatorio, conforme a la confirmación del usuario. Las otras etapas
permiten indicar la ubicación física real. Enviado corresponde a la etapa 10.
La persona responsable se captura por nombre, permitiendo personal no dado de alta
en el sistema. No se deduce su identidad del usuario que registra el movimiento.

Los trámites antiguos empiezan como **Sin seguimiento / Sin registrar**, sin inventar
que se encuentran en Compras. Se pueden inicializar por lotes y corregir o retroceder
de etapa, siempre dejando historial. La existencia de una OC/SP no confirma por sí sola firmas o recepción física.
Desde la migración 063, por regla solicitada, una SP relacionada con estatus informado
distinto de `Emitida` asigna automáticamente etapa 10 / Enviado. Se ignoran mayúsculas
y espacios exteriores; vacío y NULL no activan la regla. Si hay varias SP basta una
que cumpla, incluso Cancelada (la condición solicitada no excluye otros estatus).
Esto es una clasificación operativa: no acredita que se haya realizado un envío físico.
Se conserva responsable y acuse existentes; sin responsable no se inventa una persona.
Queda historial con actor de sistema. Reimportar no duplica movimientos ni reinicia fechas.
Si la fuente vuelve a Emitida no se revierte el envío automáticamente; se permite corregir
manualmente cuando ninguna SP relacionada siga cumpliendo la condición.

## Uso

1. Iniciar sesión normalmente y abrir Seguimiento SIIF. Se carga automáticamente,
   sin volver a pedir la contraseña.
2. Filtrar por requisición/OC/SP, dependencia, proveedor, importe, etapa, ubicación
   o persona responsable. Los contadores de ubicación consideran los filtros.
3. Seleccionar filas (la selección permanece entre páginas) o todos los filtrados.
   Cambiar filtros limpia la selección para evitar mover filas ocultas por accidente.
4. Pulsar Mover seleccionados, indicar etapa, ubicación, responsable y, cuando
   corresponda, proveedor. Se puede añadir nota y referencia de acuse.
5. Guardar. Máximo 500 trámites por operación; todo el lote confirma o se revierte.
6. Abrir una fila para consultar OC/SP relacionadas, estado operativo y movimientos
   anteriores, con fecha, usuario que registró, responsables y ubicaciones anterior/nueva.

El campo de acuse registra una referencia, no genera un PDF de acuse ni envía documentos
a Oficialía Mayor. Carga a portal, recepción, firmas y envío son acciones registradas
manualmente: no hay integración con el portal externo. Un acuse vacío conserva el
acuse existente; en un lote con acuses distintos, dejarlo vacío conserva cada uno.
Etapa, ubicación, responsable, proveedor y nota son comunes al lote seleccionado.

### Selección mediante CSV

Usar **Cargar requisiciones desde CSV**. Se acepta una columna de folios, con o sin
encabezado (`Requisición`, `REQ`, `Folio`, `numero_req`), y separadores coma, punto y coma
o tabulación. Si hay más columnas, elegir cuál contiene el número. Se conserva el
texto del folio; sólo números completos toleran ceros iniciales, sin convertirlos a
coma flotante ni interpretar fórmulas. Se admite UTF-8 y Windows-1252.

La búsqueda considera todas las requisiciones cargadas, no sólo las filtradas en la
tabla. El año opcional resuelve folios repetidos entre ejercicios; una coincidencia
ambigua nunca se elige automáticamente. La revisión muestra encontradas, repetidas,
no encontradas y filas sin número; sólo las coincidencias únicas pasan al diálogo de
movimiento. Continuar indica expresamente cuántas se tomarán. Subir, revisar o cancelar
no escribe en la base; el usuario elige etapa/ubicación/responsable y guarda después.

Límites: 1 MB, 5,000 filas de datos, 100 columnas y 500 requisiciones coincidentes por
movimiento. Si hay más de 500, dividir el archivo: no se realizan lotes parciales
silenciosos. La vista previa muestra las primeras 200 filas de revisión y el resumen
cuenta todas. Se conservan validación de permisos, revisión concurrente e historial del
RPC existente; la regla de Enviado automático por SP también se respeta.

Ejemplo:

```csv
Requisición
1234
5678
```

No requiere una migración adicional de base de datos.

La exportación CSV conserva los filtros e incluye columnas elegibles de seguimiento,
acuse, nota y proveedor esperado, además de todas las OC/SP relacionadas. El selector
de columnas de tabla existente continúa disponible.

Los días corresponden al tiempo desde el último cambio de etapa, ubicación o responsable;
añadir una nota sin cambiar esos datos no reinicia el contador.

## Instalación

Ejecutar como administrador, en orden:

1. `supabase/migrations/060_flujo_tramites_siif.sql`
2. `supabase/migrations/061_relaciones_siif_por_ejercicio.sql`
3. `supabase/migrations/062_sesion_login_flujo_siif.sql`
4. `supabase/migrations/063_envio_automatico_sp.sql`

La 063 asigna también los registros existentes y deja triggers para nuevas importaciones
de SP/requisiciones, independientemente de su orden de carga. No permite retroceder
manualmente un trámite mientras una SP relacionada siga exigiendo Enviado.
En la pantalla, Iniciar/Avanzar preselecciona la próxima etapa y conserva el responsable.
Los accesos A Compras, A Administrativo, A Almacén y Marcar enviado preseleccionan las
etapas 1, 5, 8 y 10 respectivamente, con revisión antes de guardar; se puede elegir otra
etapa mediante botones dentro del diálogo. Los mismos controles sirven para lotes.

Publicar `modulos/seguimiento-siif.html`, `css/flujo-siif.css`,
`js/services/flujo-siif.js`, `js/modules/flujo-siif.js` y `js/core/auth.js` con el resto del cliente.
Después de instalar 062, las sesiones anteriores requieren salir y entrar una vez
desde el login normal; no hay un formulario de contraseña dentro del módulo.
La migración 059 de Control de Taller es independiente y no es requisito del flujo.
La 060 requiere las tablas originales `usuarios` y `requis_siif`; la 061 requiere
las tres fuentes SIIF y sus columnas, como la vista original de la migración 018.

Desde la sesión de desarrollo sólo se dispone de la API pública, no de una conexión
SQL administrativa. Los scripts están preparados y probados localmente; no se afirma
que las migraciones se hayan ejecutado en producción.

## Relaciones y conservación de datos

- OC: número de requisición; como alternativa, oficio único cuando el número no
  corresponde a una requisición conocida del ejercicio.
- SP: referencia a un oficio único; como alternativa, número REQ en descripción si
  no hay referencia a un oficio conocido.
- Se exige el mismo año de fecha SIIF. Los folios puramente numéricos toleran ceros
  iniciales. Las claves ambiguas no enlazan varias requisiciones por suposición.
- Enlaces entre ejercicios, datos sin fecha, ambigüedades o referencias incorrectas
  necesitan corregir la fuente importada; no se adivinan ni se editan desde este flujo.
- La vista mantiene nombre y columnas para los consumidores existentes. El vínculo
  operativo usa el UUID estable de la requisición, no el texto del folio.
- Actualizar la requisición importada conserva el seguimiento. Borrar una requisición
  con seguimiento/historial se impide mediante FK `ON DELETE RESTRICT` para evitar
  perder trazabilidad. No se alteraron importadores para borrar y recrear registros.

## Acceso y concurrencia

Tablas nuevas con RLS habilitado y sin grants directos a `anon`/`authenticated`.
Sólo RPC con sesión comprobada, usuario activo y permiso de Seguimiento SIIF
(o permiso heredado de Requisiciones). Proveedores no tienen acceso al flujo interno.
Sólo lectura/Consulta no escriben. Se respeta denegación o ausencia de módulo cuando
el usuario tiene una lista explícita de permisos. El login normal emite un token
aleatorio de ocho horas, ligado al usuario, cuyo SHA-256 se almacena en una tabla
privada sin acceso de clientes. El navegador conserva el token con la sesión,
no la contraseña. El módulo manda ese token y el servidor comprueba vigencia,
cuenta y permisos en cada llamada. El cierre de sesión intenta revocarlo en servidor
y siempre lo elimina localmente; sin conexión, el token remoto caduca a las ocho horas.
Esta persistencia comparte la exposición a XSS del almacenamiento local existente.

Es una compatibilidad con la autenticación heredada, no una migración a Supabase Auth:
persisten las limitaciones del login y tablas existentes documentadas en la auditoría.
No se atribuye identidad a una cabecera modificable por el cliente para este historial.

Cada cambio requiere la revisión que se leyó al abrir el diálogo. Los locks se toman
por ID en orden estable y un conflicto revierte el lote completo, incluido el historial.
Se comprueban longitudes, IDs, duplicados, etapa, lugar y proveedor en servidor.
Ante un timeout, actualizar antes de reintentar: el servidor podría haber confirmado
el movimiento. La revisión evita repetir un lote ya aplicado.

## Verificación

- `npm.cmd run test:flujo-siif`: SQL/PGlite y navegador aislado con datos sintéticos.
- `npm.cmd run verify`: incluye pruebas SQL y del servicio de seguimiento.
- SQL: usuarios distintos, permisos, actor real, rollback de lote, revisión obsoleta,
  inactividad, relaciones por año, ambigüedad, integridad e importación sin reinicio;
  token ligado a cuenta, expiración, revocación y rechazo de contraseña en los RPC del flujo.
- Navegador: carga automática sin contraseña, 65 trámites, paginación, selección masiva de 35, filtros, proveedor,
  historial, texto no interpretado como HTML, CSV filtrado, móvil y sólo lectura.
