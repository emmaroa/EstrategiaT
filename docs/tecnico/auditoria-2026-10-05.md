# Auditoría técnica de EstrategiaT — 5 de octubre de 2026

Versión inspeccionada: **2.0.116**. Auditoría del repositorio local, sin cambios funcionales ni consultas a datos de producción.

**Dictamen:** la prioridad es sustituir la identidad declarada por el navegador y cerrar el acceso anónimo a datos operativos. La presencia de RLS no basta: varias políticas permiten todas las filas. Hay además un punto de XSS almacenado, trazabilidad de autoría no verificable y un guardado con riesgo de pérdida parcial. No se necesita adoptar un framework SPA para resolverlos.

Los hallazgos siguientes incluyen evidencia, riesgo y corrección. Los ejemplos son propuestas para una migración coordinada y revisada; **no constituyen un parche aplicado ni una migración lista para ejecutar íntegramente**. Los ejemplos de autorización presuponen el enlace entre Supabase Auth y usuarios explicado en A01. Cerrar `anon` antes de migrar el login interrumpiría el sistema actual.

**Alcance y evidencia**

- Lectura de módulos, servicios, autenticación, migraciones y configuración Capacitor/Android; revisión de llamadas, límites, exportadores y pruebas relacionadas.
- `npm.cmd run verify`: terminó correctamente. Incluye pruebas funcionales y suites PGlite, pero no todas las pruebas de navegador que existen como comandos independientes.
- `npm.cmd audit --json`: **dos paquetes con severidad alta**, ambos transitivos de `@capacitor/cli`; detalles en A12. No se instalaron actualizaciones.
- Prueba aislada PGlite con la migración real `002`: el rol `anon` pudo modificar una petición sin JWT de usuario. El entorno de prueba concedió explícitamente permisos de tabla; no se inspeccionaron los grants de producción.
- Prueba del exportador real en Node/VM: `ETExport.escapeCSV('=1+1')` devolvió exactamente `=1+1`.
- El ejemplo transaccional de A13 compiló contra el esquema de `005` en PGlite: se comprobó rollback sin pérdida del contenido anterior, totales del reemplazo válido y rechazo de revisión obsoleta. Se utilizó un stub de Auth; esta prueba no acredita autorización en Supabase desplegado.
- Las huellas SHA-256 de las **12 bibliotecas** de `js/vendor/manifest.json` coincidieron con los archivos locales. Esto acredita consistencia con ese manifiesto, no ausencia de vulnerabilidades ni autenticidad independiente.
- Búsqueda de secretos en 1,963 archivos versionados: no se encontraron JWT literales con rol `service_role` ni claves literales `sb_secret_`. El alcance no incluye todo el historial Git, secretos externos o APK publicadas.
- No se examinó el catálogo SQL desplegado, encabezados HTTP reales, configuración remota de Auth/Storage, manifiesto Android fusionado de una APK ni un proyecto iOS nativo. No se ejecutaron ataques contra producción ni pruebas destructivas o de agotamiento de memoria.

**A01 — [Crítico] Login propio con contraseña consultable e identidad manipulable**

**Evidencia:** `js/core/auth.js:209–268`, `js/core/supabase.js:12–20`, `modulos/usuarios.html:515`. El login hace:

```js
loginSupabaseClient.from('usuarios')
  .select('*').eq('usuario', usuario).eq('password', password).single();
```

El módulo de usuarios escribe la contraseña directamente. La sesión guarda ID, rol y permisos en `localStorage`; el SDK usa `persistSession: false`. No se autentica al usuario mediante `supabase.auth.signInWithPassword`. La caducidad de ocho horas también la decide el navegador. `x-et-usuario-id` no es una firma.

**Riesgo:** contraseñas tratadas como datos ordinarios, posibilidad de que aparezcan en URL de consultas/logs, suplantación de permisos de interfaz y ausencia de identidad individual verificable para RLS. Cambiar `localStorage` no rompe criptografía: el sistema no está usando JWT de usuario como límite de autorización. Las propuestas Auth bajo `docs/tecnico/propuestas-auth/` no equivalen a una migración activa.

**Corrección:** migrar a Supabase Auth; resolver acceso por nombre de usuario mediante un flujo de servidor si se conserva ese identificador. Nunca descargar contraseñas o hashes al cliente. El alta/cambio de roles debe pasar por operaciones administrativas autorizadas en servidor. El enlace no debe asumir que `usuarios.id` coincide con `auth.users.id`.

```js
// Ejemplo de login Auth por correo; conservar la contraseña exacta, sin trim().
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: correo.trim(),
  password: passwordInput.value
});
if (error) throw new Error('No fue posible iniciar sesión.');
// El rol del cliente sólo controla presentación. RLS decide acceso efectivo.
```

Base propuesta para los ejemplos de políticas del informe:

```sql
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id);
-- Vincular cuentas por un proceso administrativo comprobado, no por datos
-- enviados libremente por el navegador. No asignar IDs por coincidencias débiles.

CREATE SCHEMA IF NOT EXISTS et_privado;
REVOKE ALL ON SCHEMA et_privado FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA et_privado TO authenticated;

CREATE OR REPLACE FUNCTION et_privado.usuario_actual_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT u.id FROM public.usuarios AS u
  WHERE u.auth_user_id = (SELECT auth.uid()) AND u.activo IS TRUE
$$;
REVOKE ALL ON FUNCTION et_privado.usuario_actual_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION et_privado.usuario_actual_id() TO authenticated;

-- Impedir que un usuario se otorgue un rol o se vincule otra cuenta.
REVOKE INSERT, UPDATE, DELETE ON public.usuarios FROM anon, authenticated;
-- Revisar también grants por columna heredados. Reabrir sólo campos de perfil
-- inocuos mediante RPC autorizada. Tras completar el corte, retirar password
-- y todos los RPC que dependan de esa columna.
```

El propietario de la función debe ser un rol controlado; `et_privado` no debe incorporarse a los esquemas expuestos por PostgREST. Si se usan claims, generarlos en servidor; `user_metadata` editable por el usuario no es una fuente segura de roles. [Documentación de Auth y RBAC](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac).

**A02 — [Crítico] Políticas RLS abiertas y regresiones que restituyen acceso anónimo**

**Evidencia:** `supabase/migrations/002_peticiones_requisiciones.sql:65`, `005_tiempo_extra_justificaciones.sql:86`, `010_requisiciones_siif_policies.sql`, `017_cotizaciones_almacen.sql`, `019_importaciones_siif.sql`, `034_corregir_rls_acuerdos.sql`, `037_calendario_interno.sql`, `038_control_ingresos_taller.sql`, `040_ingresos_taller_pendientes.sql`.

```sql
CREATE POLICY anon_all_peticiones ON peticiones
FOR ALL TO anon USING (true) WITH CHECK (true);
```

`053_inventario_login_actual.sql:4–15` vuelve a conceder a `anon` lectura/escritura y ejecución de movimientos después del endurecimiento de `047`. `055_restaurar_acceso_notificaciones.sql:4–12` permite leer todas las notificaciones y actualizar `leida`. En calendario se descargan eventos antes de filtrar visibilidad en `js/services/calendario.js:63`.

**Riesgo:** con los grants correspondientes, quien disponga de la clave pública puede operar directamente por REST, sin pasar por los botones ni roles de la aplicación. La clave pública se distribuye por diseño. Eventos privados y avisos de terceros no deben depender de filtros JavaScript. En notificaciones la evidencia acredita lectura y cambio de `leida`, no escritura libre de todas las columnas.

**Corrección:** sustituir las políticas abiertas, revocar `anon` y definir una matriz de permisos por operación, usuario, área y módulo. Una política restrictiva adicional no neutraliza automáticamente políticas permisivas existentes: normalmente se combinan con OR. [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Ejemplo de notificaciones individuales, después de A01 y de inventariar/eliminar cualquier otra política permisiva:

```sql
BEGIN;
REVOKE ALL ON public.notificaciones FROM PUBLIC, anon;
REVOKE ALL ON public.notificaciones FROM authenticated;
REVOKE UPDATE (leida) ON public.notificaciones FROM PUBLIC, anon, authenticated;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portal_consulta_notificaciones ON public.notificaciones;
DROP POLICY IF EXISTS portal_actualiza_notificaciones ON public.notificaciones;
GRANT SELECT ON public.notificaciones TO authenticated;
GRANT UPDATE (leida) ON public.notificaciones TO authenticated;
CREATE POLICY notificaciones_propias_lectura ON public.notificaciones
FOR SELECT TO authenticated
USING (usuario_id = (SELECT et_privado.usuario_actual_id()));
CREATE POLICY notificaciones_propias_lectura_estado ON public.notificaciones
FOR UPDATE TO authenticated
USING (usuario_id = (SELECT et_privado.usuario_actual_id()))
WITH CHECK (usuario_id = (SELECT et_privado.usuario_actual_id()));
COMMIT;
```

Las notificaciones generales requieren una regla explícita o una fila por destinatario. Replicar el diseño para calendario, acuerdos, talleres e inventario según su matriz; no reemplazar todo por `TO authenticated USING(true)`.

**A03 — [Alto] Cobertura RLS incompleta y baseline SQL no reproducible**

**Evidencia:** `001_erp_foundation.sql` crea tablas y sólo habilita RLS explícitamente en ocho de ellas. En las migraciones revisadas no se encontró una habilitación explícita para:

`tecnicos`, `vehiculo_documentos`, `vehiculo_fotos`, `mantenimiento_programado`, `historial_kilometraje`, `historial_combustible`, `historial_llantas`, `orden_trabajo_historial`, `orden_trabajo_labor`, `categorias_inventario`, `solicitudes_compra`, `cotizaciones`, `ordenes_compra`, `proveedor_contratos`, `folio_secuencias`.

Además, la base inicial presupone `usuarios` y `parque_vehicular`, sin sus definiciones originales en ese baseline. Una política sobre `categorias_inventario` en `053` no activa RLS por sí sola.

**Riesgo:** no es posible asegurar que ninguna tabla esté expuesta ni reconstruir de manera fiable una instalación vacía sólo con ese punto de partida. La exposición real depende también de grants y esquemas publicados; la ausencia en archivos no demuestra el estado de producción.

**Corrección:** exportar un baseline revisado sin datos/secretos, inventariar políticas efectivas con el SQL adjunto y cerrar cada tabla. Ejemplo para una tabla interna que no necesita acceso directo:

```sql
ALTER TABLE public.folio_secuencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.folio_secuencias FROM PUBLIC, anon, authenticated;
-- El folio sólo lo consume una función de servidor autorizada.
-- Para tablas funcionales, crear políticas específicas antes de reabrir grants.
```

No aplicar `FORCE ROW LEVEL SECURITY` indiscriminadamente: hay funciones administrativas y triggers cuyo rol/propiedad deben revisarse. El archivo `auditoria-2026-10-05-inspeccion.sql` contiene consultas de diagnóstico, no cambios.

**A04 — [Alto] La regla «sólo sus registros» de gdavis no está impuesta en SQL**

**Evidencia:** `js/services/peticiones.service.js` contiene el UUID fijo de gdavis y consulta autoría en auditoría. `js/services/control-taller.js:204` compara ese UUID con `creado_por`; `modulos/peticiones.html` decide mostrar acciones. Las políticas generales siguen abiertas.

**Riesgo:** omitir esos filtros en una petición REST permite saltar el control de interfaz. La identidad o autoría derivada de un evento de auditoría insertable tampoco debe servir como permiso. **Matiz:** `044_editar_eliminar_ingresos_taller.sql` sí revoca DELETE directo y exige verificaciones en el RPC de borrado; ese borrado no equivale a un DELETE anónimo abierto. La actualización sigue necesitando políticas efectivas.

**Corrección:** autoría persistente, asignada desde identidad Auth y no modificable; permisos en RLS para todos los usuarios, sin UUID especiales en JS. Ejemplo mínimo de propiedad de peticiones, que debe complementarse con permisos de módulo/rol y acceso administrativo deliberado:

```sql
ALTER TABLE public.peticiones
  ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES public.usuarios(id);
-- Backfill histórico sólo con evidencia confiable; las filas sin autor quedan
-- fuera de las políticas de propietario, hasta resolverlas administrativamente.

CREATE OR REPLACE FUNCTION et_privado.fijar_autor_peticion()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := et_privado.usuario_actual_id();
    IF NEW.creado_por IS NULL THEN RAISE EXCEPTION 'Cuenta no autorizada'; END IF;
  ELSIF NEW.creado_por IS DISTINCT FROM OLD.creado_por THEN
    RAISE EXCEPTION 'La autoría no puede modificarse';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fijar_autor_peticion BEFORE INSERT OR UPDATE ON public.peticiones
FOR EACH ROW EXECUTE FUNCTION et_privado.fijar_autor_peticion();

DROP POLICY IF EXISTS anon_all_peticiones ON public.peticiones;
REVOKE ALL ON public.peticiones FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peticiones TO authenticated;
CREATE POLICY peticiones_propietario ON public.peticiones
FOR ALL TO authenticated
USING (creado_por = (SELECT et_privado.usuario_actual_id()))
WITH CHECK (creado_por = (SELECT et_privado.usuario_actual_id()));
```

Este ejemplo demuestra propiedad; no es la matriz final del producto. Añadir restricciones de lectura/escritura por rol y área según las reglas vigentes. Un usuario de sólo lectura no debe recibir permisos de escritura por ser propietario.

**A05 — [Alto] Autor de auditoría falsificable**

**Evidencia:** `052_auditoria_movimientos.sql:39–49` obtiene al actor de `request.headers ->> 'x-et-usuario-id'`. El código reconoce expresamente que es una identidad declarada. `006_auditoria_policies.sql` permite inserción anónima; `052` revoca UPDATE/DELETE/TRUNCATE, pero conserva el flujo de altas manuales.

**Riesgo:** un cliente puede atribuir una operación a otra cuenta activa. La protección contra borrado mejora la integridad posterior, pero no acredita autenticidad del actor ni que un evento manual corresponda a una operación real.

**Corrección:** dentro del trigger, obtener identidad del JWT validado y separar sucesos informativos del cliente de evidencia de mutaciones de base de datos.

```sql
-- Sustituir la lectura de la cabecera dentro del trigger:
actor := et_privado.usuario_actual_id();
IF actor IS NULL THEN
  actor_origen := 'proceso_sin_usuario_auth';
ELSE
  actor_origen := 'supabase_auth';
END IF;
-- Procesos de sistema: identidad técnica específica, sin inventar un usuario.
```

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.auditoria
FROM PUBLIC, anon, authenticated;
-- Conservar INSERT a través del trigger con privilegios controlados.
-- Para eventos de UI: RPC acotada, actor derivado del JWT y tipo de evento
-- no utilizable para crear derechos de propiedad.
```

Conservar el saneamiento de secretos existente en `auditoria_sin_secretos` y las pruebas de rollback.

**A06 — [Alto] RPC con privilegios elevados y actor suministrado por el cliente**

**Evidencia:** `046_inventario_codigos_ubicaciones.sql:73–107` define `registrar_movimiento_inventario` como `SECURITY DEFINER`, recibe `p_usuario_id` y lo guarda. `053` concede ejecución a `anon`. `001_erp_foundation.sql:342` contiene `generar_folio` con privilegios elevados sin endurecimiento explícito de `search_path` en esa definición. Algunos RPC heredados autentican comparando `u.password = p_password`.

**Riesgo:** los permisos del propietario de la función pueden superar RLS; permitir invocación anónima no queda compensado por validar cantidad/tipo. La autoría del movimiento es manipulable. El riesgo de `search_path` depende de quién pueda crear objetos en los esquemas consultados.

**Corrección:** después de A01, retirar identidad/contraseña de parámetros, validar permiso funcional dentro de cada RPC y limitar EXECUTE. Conservar `FOR UPDATE` del inventario: es una protección útil contra carreras de stock.

```sql
REVOKE EXECUTE ON FUNCTION public.registrar_movimiento_inventario
  (uuid, varchar, numeric, varchar, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_inventario
  (uuid, varchar, numeric, varchar, text, uuid) TO authenticated;
```

En el cuerpo refactorizado:

```sql
-- Añadir variable v_actor uuid en DECLARE.
v_actor := et_privado.usuario_actual_id();
IF v_actor IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
-- Comprobar además permiso de movimientos de inventario en tabla protegida.
-- Usar v_actor en INSERT; eliminar p_usuario_id en la siguiente firma pública.
```

Usar `SET search_path = ''` y nombres totalmente cualificados al reescribir las funciones. Revocar `CREATE` a roles no confiables en esquemas de resolución. Las migraciones `056–058` de Crear cotización ya incorporan controles más estrictos, límites y revisiones; no se afirma que todos los RPC estén abiertos.

**A07 — [Alto] XSS almacenado en el listado de peticiones**

**Evidencia:** `modulos/peticiones.html:1055–1071` concatena datos de base de datos en `innerHTML`:

```js
fila.innerHTML = '<td><strong>' + p.unidad + '</strong></td>' +
  '<td>' + p.peticion + '</td>' + '<td>' + p.solicitante + '</td>';
```

También se interpolan área, dependencia, proveedor y estado. Los atributos escapados en otros lugares no protegen estos nodos de texto.

**Riesgo:** un dato almacenado con marcado activo se interpreta como HTML al abrir el listado. Combinado con escrituras públicas, amplía el alcance a otros usuarios. No hace falta que se ejecute una etiqueta `<script>`: existen atributos de evento. No se probó un payload contra usuarios reales.

**Corrección:** construir DOM con `textContent` y conectar eventos con `addEventListener`. Aplicar la misma revisión a cada interpolación externa, distinguiendo plantillas constantes de datos.

```js
function celda(texto) {
  const td = document.createElement('td');
  td.textContent = String(texto ?? '');
  return td;
}
const unidad = document.createElement('strong');
unidad.textContent = String(p.unidad ?? '');
const tdUnidad = document.createElement('td');
tdUnidad.append(unidad);
fila.replaceChildren(tdUnidad, celda(p.peticion), celda(p.solicitante));
const copiar = document.createElement('button');
copiar.type = 'button';
copiar.textContent = 'Copiar texto';
copiar.addEventListener('click', () => copiarTextoPedido(p.id));
fila.cells[1].append(copiar);
```

Adaptar el constructor a todas las columnas actuales; el ejemplo muestra el patrón, no la fila completa. Para texto plano no se necesita interpretar HTML. [Prevención DOM XSS de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html).

**A08 — [Medio] Enlaces de notificaciones sin validación de destino**

**Evidencia:** `js/core/layout.js:1091` asigna `item.enlace` a `location.href`, únicamente ajustando `modulos/`.

**Riesgo:** acepta esquemas y destinos que no corresponden a navegación interna. La explotación requiere controlar ese campo mediante algún escritor de notificaciones; esa ruta de escritura no se demostró. No se equipara al XSS almacenado confirmado por el renderizado de A07.

**Corrección:** validar esquema, origen y rutas permitidas, manteniendo el prefijo de instalación de la app.

```js
function destinoNotificacion(enlace, appBase) {
  // appBase se determina desde la URL conocida del script/layout de la app.
  const base = new URL(appBase);
  const destino = new URL(String(enlace), base);
  const rutas = ['modulos/calendario.html', 'modulos/acuerdos.html',
    'modulos/peticiones.html'].map(r => new URL(r, base).pathname);
  if (!['https:', 'http:'].includes(destino.protocol) ||
      destino.origin !== base.origin || !rutas.includes(destino.pathname)) {
    throw new Error('Destino de notificación no permitido.');
  }
  return destino.href;
}
```

Completar la lista con destinos reales del sistema. En builds con un esquema nativo distinto, permitir exactamente el esquema/origen configurado; no todos los esquemas arbitrariamente.

**A09 — [Medio] Inyección de fórmulas en exportadores CSV**

**Evidencia:** `js/services/export.service.js:5` sólo escapa comillas/separadores. `js/services/control-taller.js:197` hace lo mismo en `csvTaller`. El caso probado `=1+1` sale sin neutralizar. Otros exportadores sí tienen protección, por lo que el comportamiento es inconsistente.

**Riesgo:** el programa de hojas de cálculo puede interpretar texto controlado por un usuario como fórmula al abrir el CSV. Poner el campo entre comillas CSV no lo convierte en texto seguro para Excel.

**Corrección:** centralizar el tratamiento de texto no confiable; preservar los números que realmente son numéricos. Validar con las aplicaciones destino y no reutilizar este escape para HTML.

```js
function escapeCSV(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  let texto = String(valor ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(texto) || /^[\t\r\n]/u.test(texto)) {
    texto = "'" + texto;
  }
  return '"' + texto.replaceAll('"', '""') + '"';
}
// En XLSX, para contenido externo, asignar una cadena, no { formula: texto }.
celdaExcel.value = String(valorExterno ?? '');
```

No se encontró evidencia de que `jsPDF.text()` ejecute scripts por recibir texto. Tampoco se debe confundir leer una fórmula/caché de XLSX con evaluarla. La ruta de impresión HTML sí requiere el mismo cuidado de A07.

**A10 — [Medio] Datos locales y configuración de respaldo/compartición Android**

**Evidencia:** identidad/perfil en `localStorage`; `android/app/src/main/AndroidManifest.xml:5` usa `allowBackup="true"`; `res/xml/file_paths.xml` permite `external-path path="."` y todo el caché. No hay un adaptador de almacenamiento seguro en las dependencias revisadas.

**Riesgo:** persistencia del perfil y futura sesión Auth en almacenamiento WebView; copias de seguridad de datos sensibles; superficie de archivos compartibles más extensa de lo necesario. El FileProvider tiene `exported=false`: no se afirma que cualquier aplicación pueda leerlo sin una concesión URI. Actualmente el almacenamiento contiene una sesión propia, no un JWT Auth cuya presencia se haya comprobado.

**Corrección:** al migrar Auth, usar en móvil un adaptador de almacenamiento respaldado por Keystore/Keychain, con claves fuera del código y limpieza en cierre de sesión. `Capacitor Preferences` no equivale a cifrado seguro. [Seguridad de Capacitor](https://capacitorjs.com/docs/guides/security).

```xml
<!-- Propuesta de atributos de application, conservando los demás existentes. -->
android:allowBackup="false"
android:fullBackupContent="@xml/backup_rules"
android:dataExtractionRules="@xml/data_extraction_rules"
```

```xml
<!-- res/xml/backup_rules.xml: excluir datos privados del respaldo heredado. -->
<full-backup-content>
  <exclude domain="root" path="." />
  <exclude domain="file" path="." />
  <exclude domain="database" path="." />
  <exclude domain="sharedpref" path="." />
  <exclude domain="external" path="." />
</full-backup-content>
```

Definir también exclusiones de `cloud-backup` y `device-transfer` en `data_extraction_rules.xml` para Android 12+, incluyendo los dominios de dispositivo si se usan. La transferencia entre dispositivos puede variar por fabricante; verificar restauración de un build firmado. [Reglas Android de respaldo](https://developer.android.com/identity/data/autobackup).

```xml
<!-- file_paths.xml: guardar allí únicamente documentos que se van a compartir. -->
<paths xmlns:android="http://schemas.android.com/apk/res/android">
  <cache-path name="exports" path="exports/" />
</paths>
```

Conceder sólo lectura y sólo la URI necesaria. [Recomendaciones FileProvider](https://developer.android.com/privacy-and-security/risks/file-providers). El manifiesto fuente declara únicamente INTERNET; el permiso final debe confirmarse en el manifiesto fusionado. No hay proyecto iOS nativo versionado que permita certificar sus permisos/entitlements.

**A11 — [Medio] No hay una política CSP comprobable desde el repositorio**

**Evidencia:** múltiples páginas tienen scripts/eventos inline; no se localizó una definición CSP de despliegue aplicable a todas las páginas. Esto no prueba que el alojamiento no envíe un encabezado CSP.

**Riesgo:** falta de defensa adicional comprobada frente a XSS. Una CSP que permita indiscriminadamente `unsafe-inline` reduce su utilidad.

**Corrección:** inventariar orígenes utilizados, mover handlers inline a JS y comenzar con Report-Only antes de bloquear. Ejemplo inicial de encabezado de servidor, ajustando el dominio Supabase y recursos requeridos:

```text
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://TU-PROYECTO.supabase.co wss://TU-PROYECTO.supabase.co; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
```

Configurar además un destino de reportes. Probar impresión, workers, PDF y móvil antes de convertirlo en `Content-Security-Policy`; un encabezado HTTP de alojamiento no cubre automáticamente recursos empaquetados en Capacitor. `frame-ancestors` requiere encabezado, no se resuelve con un meta tag.

**A12 — [Alto] Dependencias vulnerables en la herramienta de compilación**

**Evidencia:** `package-lock.json` / `npm audit`, árbol instalado:

```text
@capacitor/cli@7.6.8
├─ plist@3.1.1 → @xmldom/xmldom@0.9.10
└─ rimraf@6.1.3 → glob@13.0.6 → minimatch@10.2.6 → brace-expansion@5.0.9
```

**Riesgo:** npm clasifica ambos paquetes como altos, con avisos de consumo excesivo de CPU/memoria e inyección XML en determinadas APIs. Son dependencias de desarrollo: no se demostró que una carga XML del usuario en el navegador llegue a estas versiones. El parser del navegador no es automáticamente `@xmldom/xmldom` del CLI.

**Corrección propuesta:** actualizar dependencias transitivas compatibles y comprobar compilación. Para los avisos observados, los mantenedores publicaron correcciones en [xmldom 0.9.12](https://github.com/xmldom/xmldom/releases/tag/0.9.12) y [brace-expansion 5.0.12](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-q2hr-2g5m-vwhr). Si la resolución del CLI sigue reteniendo versiones vulnerables, evaluar estos overrides, regenerar lockfile y probar:

```json
{
  "overrides": {
    "@xmldom/xmldom": "0.9.12",
    "brace-expansion": "5.0.12"
  }
}
```

```powershell
npm.cmd install --package-lock-only
npm.cmd ci
npm.cmd audit
npm.cmd run verify
npm.cmd run mobile:sync
```

No se ejecutó esta actualización. Compilar Android/iOS en sus entornos y revisar compatibilidad antes de entregar. Auditar también las bibliotecas copiadas a `js/vendor`: npm no las cubre por estar fuera de su árbol de dependencias. Fijar versiones exactas en sus URL de origen; algunos registros del manifiesto usan un tag variable aunque la copia local tenga hash.

**A13 — [Alto] Guardado de Tiempo Extra no atómico y múltiples viajes de red**

**Evidencia:** `js/modules/tiempo-extra.js:1258` borra detalles y empleados del periodo, después inserta cada empleado y sus detalles con solicitudes independientes. La cabecera se guarda antes de llamar a esta función.

**Riesgo:** una interrupción deja el periodo vacío o parcialmente reconstruido; un mensaje de error no revierte solicitudes ya confirmadas. Dos editores pueden sobrescribirse. El bucle genera aproximadamente dos solicitudes por empleado además de borrados/actualización.

**Corrección:** una sola RPC transaccional para cabecera, empleados y detalles, con permiso RLS efectivo y control de revisión. Ejemplo concreto del reemplazo de hijos y actualización de totales; integrar en esta misma transacción los campos editables de cabecera, quitando su actualización previa desde JS:

```sql
CREATE OR REPLACE FUNCTION public.reemplazar_empleados_periodo(
  p_periodo uuid, p_revision timestamptz, p_empleados jsonb
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_emp jsonb;
  v_id uuid;
  v_cantidad integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF jsonb_typeof(p_empleados) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_empleados) > 1000 THEN
    RAISE EXCEPTION 'Lista de empleados inválida';
  END IF;
  UPDATE public.periodos_tiempo_extra
    SET updated_at = clock_timestamp()
    WHERE id = p_periodo AND updated_at = p_revision;
  GET DIAGNOSTICS v_cantidad = ROW_COUNT;
  IF v_cantidad <> 1 THEN RAISE EXCEPTION 'Sin permiso o revisión desactualizada'; END IF;

  DELETE FROM public.tiempo_extra_detalles WHERE periodo_id = p_periodo;
  DELETE FROM public.tiempo_extra_empleados WHERE periodo_id = p_periodo;
  FOR v_emp IN SELECT value FROM jsonb_array_elements(p_empleados) LOOP
    INSERT INTO public.tiempo_extra_empleados
      (periodo_id, empleado_id, num_empleado, nombre, direccion, departamento, puesto)
    VALUES (p_periodo, v_emp->>'empleado_id', v_emp->>'num_empleado',
      v_emp->>'nombre', v_emp->>'direccion', v_emp->>'departamento', v_emp->>'puesto')
    RETURNING id INTO v_id;
    IF jsonb_typeof(v_emp->'dias') IS DISTINCT FROM 'array'
       OR jsonb_array_length(v_emp->'dias') > 7 THEN
      RAISE EXCEPTION 'Días inválidos';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(v_emp->'dias')
      AS d(horas numeric, justificacion text)
      WHERE d.horas IS NULL OR d.horas < 0 OR d.horas > 24
         OR (d.horas > 0 AND btrim(coalesce(d.justificacion,'')) = '')) THEN
      RAISE EXCEPTION 'Horas o justificación inválidas';
    END IF;
    INSERT INTO public.tiempo_extra_detalles
      (periodo_id, tiempo_extra_empleado_id, dia_semana, fecha,
       entrada, salida, horas, justificacion)
    SELECT p_periodo, v_id, d.dia_semana, d.fecha, d.entrada,
      d.salida, d.horas, coalesce(d.justificacion,'')
    FROM jsonb_to_recordset(v_emp->'dias') AS d
      (dia_semana text, fecha date, entrada time, salida time,
       horas numeric, justificacion text);
    UPDATE public.tiempo_extra_empleados SET total_horas = (
      SELECT coalesce(sum(horas),0) FROM public.tiempo_extra_detalles
      WHERE tiempo_extra_empleado_id = v_id) WHERE id = v_id;
  END LOOP;
  UPDATE public.periodos_tiempo_extra SET
    total_empleados = jsonb_array_length(p_empleados),
    total_horas = (SELECT coalesce(sum(total_horas),0)
      FROM public.tiempo_extra_empleados WHERE periodo_id = p_periodo)
    WHERE id = p_periodo;
END $$;
REVOKE ALL ON FUNCTION public.reemplazar_empleados_periodo(uuid,timestamptz,jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reemplazar_empleados_periodo(uuid,timestamptz,jsonb)
TO authenticated;
```

```js
const { error } = await client.rpc('reemplazar_empleados_periodo', {
  p_periodo: periodo.id,
  p_revision: periodo.updated_at,
  p_empleados: empleadosNormalizados // nombres de campos del contrato SQL anterior
});
if (error) throw error;
```

Antes de desplegar: implementar RLS para todas las tablas involucradas, validar fechas dentro del periodo, duplicados y reglas exactas del cálculo; no basta con `auth.uid() IS NOT NULL`. Una excepción revierte todo el RPC. Usar el mismo patrón para alta de cabecera y sus hijos.

**A14 — [Alto] Sobrelectura de la tabla usuarios desde el dashboard**

**Evidencia:** `dashboard.html:799` ejecuta `from('usuarios').select('*')` dentro de la carga común. El modelo utilizado por login/edición incluye `password`.

**Riesgo:** si los permisos desplegados permiten esa lectura, cada carga del dashboard descarga también columnas sensibles. No se consultó producción para extraer contraseñas. Limitar la UI o quitar una columna visual no limita la respuesta REST.

**Corrección:** retirar credenciales del esquema expuesto, aplicar permisos por columna/RLS y pedir únicamente los campos necesarios para indicadores.

```js
const usuariosRes = await dashboardClient
  .from('usuarios')
  .select('id,activo'); // ampliar sólo si un indicador lo requiere realmente
```

```sql
-- Tras migrar login y revisar grants por columna existentes:
REVOKE SELECT ON public.usuarios FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, nombre, usuario, activo) ON public.usuarios TO authenticated;
-- Habilitar RLS y definir quién puede listar qué usuarios.
-- No conceder SELECT(password), ni publicar una vista que vuelva a exponerla.
```

Una consulta de recuento agregada con permisos es preferible si sólo se necesita un total.

**A15 — [Medio] Cargas completas, filtrado local y riesgo de indicadores truncados**

**Evidencia:** `dashboard.html:699–756` pagina tablas completas en bloques de 1,000; `js/services/peticiones.service.js` reúne todas las peticiones antes de renderizar páginas; el calendario descarga eventos sin ventana mensual. Otras consultas del dashboard, como acuerdos/cotizaciones/usuarios, no paginan.

**Riesgo:** transferencia y memoria crecen con el historial. Las consultas sin paginar pueden quedar limitadas por el máximo de filas de PostgREST y producir indicadores incompletos. No se midieron volúmenes productivos ni latencias, por lo que no se atribuye una degradación cuantificada.

**Corrección:** proyectar columnas, filtrar/paginar en servidor, agregar KPI en SQL respetando RLS y exportar por lotes con los mismos filtros. Ejemplo:

```js
async function listarPagina({ estado, desde, hasta, pagina = 0 }, signal) {
  const tamano = 50;
  let query = supabaseClient.from('peticiones')
    .select('id,fecha,unidad,peticion,estatus,created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  if (estado) query = query.eq('estatus', estado);
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);
  const { data, error, count } = await query
    .range(pagina * tamano, (pagina + 1) * tamano - 1).abortSignal(signal);
  if (error) throw error;
  return { filas: data, total: count };
}
```

Para páginas profundas, evaluar cursor compuesto por `created_at,id`. Hay índices existentes de estatus/unidad y otros módulos; no se concluye que toda la base carezca de índices. Un candidato a medir con `EXPLAIN (ANALYZE, BUFFERS)` sobre datos de prueba representativos es:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peticiones_created_id
ON public.peticiones (created_at DESC, id DESC);
```

Ejecutar `CONCURRENTLY` fuera de un bloque de transacción. Medir selectividad y filtros combinados antes de añadir más índices; no cambiar una sobrelectura por decenas de consultas de detalle por fila.

**A16 — [Medio] Límites de archivo posteriores a la descompresión y acumulación de documentos**

**Evidencia:** `js/services/textos-tabulares.js:104–135` limita entrada a 10 MB, pero comprueba filas/columnas después de `book.xlsx.load(buffer)`. Un XLSX es un ZIP. `js/modules/crear-cotizacion.js` limita cada lote/archivo, pero conserva `records` entre importaciones; `schedule()` inicia previsualizaciones y una revisión descarta resultados obsoletos, sin cancelar necesariamente el trabajo previo. Tiempo Extra construye varios documentos y el ZIP en memoria.

**Riesgo:** un archivo pequeño comprimido puede expandirse mucho; lotes sucesivos y documentos simultáneos consumen RAM, especialmente en móvil. Los workers existentes y el timeout reducen bloqueo, pero no son una cuota estricta de memoria. No se ejecutó una bomba ZIP.

**Corrección:** límites acumulados, metadatos ZIP antes de inflar y un lector que cuente los bytes realmente descomprimidos; no confiar sólo en tamaños declarados del ZIP. Procesar de uno en uno, descartar referencias/buffers y terminar workers obsoletos. Ejemplo de cuota acumulada antes de leer:

```js
const MAX_DOCUMENTOS = 20;
const MAX_BYTES_SESION = 25 * 1024 * 1024;
function validarLote(records, files) {
  const bytesActuales = records.reduce((n, r) => n + r.bytesOrigen, 0);
  const bytesNuevos = files.reduce((n, f) => n + f.size, 0);
  if (records.length + files.length > MAX_DOCUMENTOS ||
      bytesActuales + bytesNuevos > MAX_BYTES_SESION) {
    throw new Error('Retira documentos antes de importar otro lote.');
  }
}
// Guardar bytesOrigen = file.size al aceptar cada archivo.
// Recalcular la cuota desde records al retirar elementos.
```

Ejemplo de cancelación efectiva del cálculo, tras mover la tarea a un worker dedicado:

```js
let workerActual;
function iniciarCalculo(buffer) {
  workerActual?.terminate();
  workerActual = new Worker('documentos.worker.js');
  workerActual.postMessage({ buffer }, [buffer]);
  return workerActual;
}
```

El worker y el lector ZIP acotado son componentes por implementar, no APIs ya presentes. Mantener la validación de DOCTYPE/ENTITY, errores XML, conceptos y totales que ya existe en `cotizacion-xml.js` y las migraciones de Crear cotización.

**A17 — [Medio] Responsabilidades mezcladas y contratos asíncronos dispares**

**Evidencia:** `modulos/peticiones.html` tiene 2,746 líneas y mezcla CSS, plantillas, permisos y operaciones. `js/services/calendario.js` también registra eventos DOM, abre modales y consulta datos. Hay globales compartidas e inicializaciones alternativas del cliente Supabase; `ETPeticiones` y varios servicios más recientes ya ofrecen separación parcial.

**Riesgo:** cambios de negocio pueden afectar presentación/permisos, duplicar clientes o tratar un error como una lista vacía. Hay usos correctos de `try/catch/finally`; el problema es la falta de un contrato uniforme, no que todo el código ignore errores. No hace falta introducir React/Vue para corregirlo.

**Corrección:** separar repositorio, reglas y vista en módulos ES; una instancia Supabase; un contrato consistente que arroje errores y distinga vacío, carga y fallo. Ejemplo del límite de servicio y su consumidor:

```js
// peticiones.repository.js — recibe la instancia única.
export function crearRepositorioPeticiones(db) {
  return {
    async guardar(id, cambios) {
      const { data, error } = await db.from('peticiones')
        .update(cambios).eq('id', id).select('id,updated_at').single();
      if (error) throw error;
      return data;
    }
  };
}

// En la vista: mensaje por textContent; no repetir POST/INSERT a ciegas.
async function guardarDesdeVista(repo, id, cambios, boton, estado) {
  boton.disabled = true;
  estado.textContent = 'Guardando…';
  try {
    await repo.guardar(id, cambios);
    estado.textContent = 'Guardado.';
  } catch (error) {
    estado.textContent = 'No se confirmó el guardado. Actualiza antes de reintentar.';
  } finally {
    boton.disabled = false;
  }
}
```

Para escrituras que puedan duplicarse por reintento, agregar una clave idempotente única en servidor. Un timeout no demuestra que el servidor haya rechazado la operación. No registrar contraseñas ni payloads sensibles al reportar errores.

**A18 — [Bajo] Recálculo global de tablas ante mutaciones locales**

**Evidencia:** `js/core/table-columns.js:137–163`: cualquier cambio de hijos en una tabla puede programar `scan()` sobre todas las tablas; `apply()` vuelve a recorrer celdas y consulta estilos. Ya existe agrupación mediante `requestAnimationFrame`, lo cual ayuda.

**Riesgo:** trabajo repetido al pintar lotes grandes o varias tablas en la misma página. No se midió una regresión de tiempo real; es un coste estructural evitable.

**Corrección:** mantener el escaneo inicial y registrar sólo tablas nuevas; para tablas conocidas, aplicar únicamente las que cambiaron. Ejemplo para actualizaciones de filas existentes, dentro del closure actual:

```js
const pendientes = new Set();
let frame = 0;
function actualizarTabla(table) {
  pendientes.add(table);
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    for (const tabla of pendientes) {
      const state = states.get(tabla);
      if (tabla.isConnected && state) apply(state);
    }
    pendientes.clear();
  });
}
// Observer: actualizarTabla(mutation.target.closest('table')).
// Para tablas nuevas, extraer registro individual desde scan(), sin reescanear
// todas. Conservar soporte de rowspan/colspan y pruebas del selector.
```

**A19 — [Bajo] Capas CSS superpuestas y mantenimiento visual costoso**

**Evidencia:** `css/design-system.css` tiene 3,611 líneas y 101 usos de `!important`; se combina con `style.css`, `reference-theme.css`, estilos por módulo y estilos inline. La pantalla de peticiones agrega 32 `!important`. Las cifras no son por sí solas un defecto: señalan dependencia de orden/especificidad que debe revisarse.

**Riesgo:** arreglos visuales locales pueden alterar otros módulos; el aspecto acaba variando por acumulación de excepciones. La auditoría no determina si una interfaz «parece IA» sin una evaluación visual de pantallas y tareas.

**Corrección:** consolidar tokens y componentes (tablas, botones, formularios), reducir overrides durante cambios graduales y mantener estilos funcionales de visibilidad/accesibilidad. Ejemplo:

```css
:root {
  --space-1: .25rem;
  --space-2: .5rem;
  --control-radius: .375rem;
  --color-border: #d8dee6;
}
.btn-small {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--control-radius);
}
.peticion-copiar-directo { white-space: nowrap; }
```

Integrar con los tokens ya presentes en `variables.css`; no crear un segundo sistema paralelo. Si se adoptan cascade layers, migrar también las reglas heredadas: las reglas sin capa pueden prevalecer sobre las agrupadas. Revisar foco, contraste y móvil, no sólo colores.

**A20 — [Medio] Las pruebas no establecen una barrera de seguridad ni reproducen toda la instalación**

**Evidencia:** `package.json` ejecuta numerosas pruebas con `verify`, pero los comandos de navegador de Crear cotización, Generar textos, columnas y avisos están separados. `scripts/test-cliente-notificaciones.js:17–29` espera explícitamente que `anon` lea y actualice `leida`; algunas pruebas usan esquemas reducidos/mocks. No hay flujo CI versionado en `.github`.

**Riesgo:** un resultado verde puede conservar la política insegura o dejar fuera regresiones de navegador. PGlite valida SQL útilmente, pero no sustituye PostgREST + Supabase Auth + configuración real de roles. La ausencia de `.github` no prueba que no exista CI externo.

**Corrección:** baseline reproducible, pruebas negativas con dos usuarios reales y anónimo, y ejecución automatizada de pruebas de navegador. Ejemplo de contrato de seguridad para una petición ajena, ejecutado en un proyecto de prueba aislado:

```js
// clienteB tiene un JWT válido de otro usuario, sin permiso sobre esa fila.
const { data: antes, error: lecturaError } = await clienteB
  .from('peticiones').select('id').eq('id', peticionDeA);
assert.equal(lecturaError, null);
assert.deepEqual(antes, []);

const { data: cambios, error: cambioError } = await clienteB
  .from('peticiones').update({ peticion: 'cambio no autorizado' })
  .eq('id', peticionDeA).select('id');
assert.ok(cambioError || cambios.length === 0);
// Verificar luego con clienteA que los datos siguen intactos.
```

Probar también alta con autor falsificado, modificación de rol, usuario inactivo, sólo lectura, permisos por área, RPC e inserción de auditoría. RLS puede negar UPDATE dejando cero filas en vez de devolver un error; la prueba debe contemplarlo. Un esquema CI mínimo incluiría:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '22'
      cache: npm
  - run: npm ci
  - run: npm run verify
  - run: npm audit --audit-level=high
  # Añadir provisionamiento del navegador usado por los scripts y proyecto
  # Supabase aislado antes de habilitar las pruebas de integración/seguridad.
```

Fijar las acciones por SHA verificada en la implementación definitiva. No usar secretos de producción en pruebas ni en PR de origen no confiable.

**A21 — [Informativo] Clave pública y varias defensas existentes correctamente planteadas**

**Evidencia:** la configuración cliente contiene una clave publicable; no se detectó una clave literal `service_role`/`sb_secret_` en el alcance escaneado. `capacitor.config.json` usa contenido empaquetado y esquema Android HTTPS, sin `server.url` remoto ni wildcard de navegación. Las migraciones recientes de cotizaciones restringen tabla/RPC, límites de entrada y revisión concurrente; existen pruebas de centavos, rollback, paginación y manejo de XML.

**Riesgo residual:** la clave pública es esperada en el cliente, pero depende de RLS y privilegios. Ocultarla en una variable de build no repararía A02. La búsqueda no certifica ausencia de secretos en el historial o builds externos. [Claves API de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

**Patrón que se debe conservar:**

```js
// Cliente: sólo clave publicable y JWT del usuario obtenido por Auth.
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
// service_role / sb_secret_*: exclusivamente en servidor, nunca en www,
// JavaScript del navegador, archivos Capacitor ni configuración embebida.
```

Ampliar secret scanning a historial y artefactos de entrega; no hay evidencia que justifique afirmar aquí que una service key ya fue filtrada.

**Orden de remediación recomendado**

1. Coordinar migración Auth, vinculación de usuarios, permisos de roles y políticas SQL; comprobar accesos en un entorno de prueba antes del corte. Resolver A01–A06 y A14 como un conjunto.
2. Corregir el renderizado XSS, CSV y guardado transaccional; añadir pruebas negativas de autorización y de rollback por falla.
3. Actualizar dependencias de compilación y revisar copias de respaldo, URI compartidas y CSP por plataforma.
4. Optimizar consultas/memoria con métricas y después consolidar módulos/CSS gradualmente.

**Criterios de cierre:** ningún cliente anónimo puede leer/modificar datos operativos; usuarios sin permiso no pueden afectar filas ajenas por REST/RPC; el autor viene del JWT; no se transportan contraseñas como datos; inputs de texto se muestran como texto; fallos de guardado no dejan estados parciales; se ejecutan pruebas en navegador y Supabase real aislado. Las consultas de inspección adjuntas permiten completar la comprobación de producción sin escribir datos.
