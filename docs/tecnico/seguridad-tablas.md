# Instalación de seguridad — EstrategiaT 2.0.161

Preparado a partir de los dos inventarios entregados el 11 de noviembre de 2026.
No se ha ejecutado contra la base remota.

## Corrección de timeout 57014

Para una instalación que ya aplicó 070–072, ejecutar únicamente
supabase/migrations/073_optimizar_lecturas_rls.sql. No reinstalar el paquete inicial
para corregir este incidente. El paquete completo incluye ahora 073 para nuevas
instalaciones.

Las barreras de lectura anteriores repetían consultas de sesión y permisos por
fila, y rbac_lectura duplicaba seguridad_ver. 073 conserva una barrera restrictiva
equivalente y usa un SELECT independiente para calcular contexto una vez por
sentencia. Las notificaciones comparan usuario_id con el identificador validado
una vez y tienen un índice por destinatario, leida, fecha e id. No eleva timeouts,
deshabilita RLS ni almacena permisos en variables modificables por el cliente.

Prueba local con 6,000 notificaciones: página de 500 desde offset 3,000 en unos
21–31 ms, con InitPlan ejecutado una vez. Es evidencia local, no una medición
del servidor remoto. Se verifican equivalencias de lectura con la función
anterior para SuperAdmin, Consulta, Proveedor y Coordinador.

## Instalación

1. Publicar el cliente actual completo, incluido js/core/rbac.js y la pantalla de
   Cancelaciones. Este paquete activa el modelo de permisos de la migración 070.
   Revisar su matriz en docs/tecnico/roles-acciones-cancelaciones.md.
2. Probar primero en una copia del proyecto cuando esté disponible. Los ensayos
   locales reconstruyen estructura, funciones y triggers, pero no incluyen datos,
   restricciones, defaults o índices completos de producción ni pruebas de UI remota.
3. Ejecutar el contenido completo de supabase/INSTALAR_SEGURIDAD.sql en SQL Editor.
   Agrupa 070, 071 y 072 en una transacción: un error revierte todo. No ejecutar
   además los tres archivos individuales. Si hay error, compartirlo; no sustituir
   controles por políticas abiertas. El timeout de bloqueo es de 10 segundos.
4. Cerrar sesión y volver a entrar. Probar SuperAdmin, consulta, proveedor y un
   coordinador: lectura, edición propia, aislamiento entre proveedores, inventario,
   notificaciones y cambio de contraseña. No depende de un nuevo APK para instalar SQL;
   clientes antiguos pueden perder accesos hasta actualizarse.
5. Ejecutar supabase/verificar_seguridad.sql. Todas las tablas de aplicación deben
   mostrar RLS activo; las públicas deben tener cuatro barreras y anon_puede_truncar
   falso. usuarios_visibles_sin_sesion debe ser cero. Compartir resultados para la
   validación remota final.

## Cambios

- RLS y reglas restrictivas por sesión y acción para todas las tablas públicas
  existentes que no pertenecen a extensiones. Las políticas antiguas no pueden
  ampliar estas reglas porque se combinan mediante AND.
- Tablas privadas sin acceso directo para anon/authenticated.
- Categorías de inventario: lectura con permiso del módulo.
- Historial de acuerdos: lectura según el acuerdo; altas con identidad de sesión
  y permiso de edición; no se modifica ni borra directamente.
- Notificaciones: cada destinatario puede leer y marcar leida, sin alterar mensaje,
  identidad ni otros campos. Auditoría directa: solo lectura autorizada.
- RPC de inventario: sesión, permisos de crear/editar y autor verificado; se
  conservan bloqueo de stock y rechazo de saldo negativo.
- RPC de cotización XML, eliminación de taller, respaldo y licencias: se exige
  además sesión y permiso actual; conservan sus verificaciones previas de claves.
  El respaldo antiguo queda limitado al propietario con permiso de Licencias.
- Listado para turnar acuerdos exige permiso. Los helpers de identidad consultan
  la sesión opaca en vez de depender de un JWT ausente en este login.
- Generación de folio de cotización requiere permiso de crear. Se cierra acceso
  directo a generar_folio y resolver_email_login, sin consumidores actuales.
- La auditoría obtiene el actor del token validado, no de x-et-usuario-id.
- Cada cuenta conserva actualización propia de password, avatar_url y dashboard_kpis.
  El trigger impide aprovechar ese permiso para cambiar rol, estado o excepciones.
- Vistas ordinarias respetan RLS; directorio_usuarios mantiene su proyección
  explícita sin contraseñas y validación de sesión. Vistas materializadas cerradas.

Las tablas no clasificadas quedan cerradas al cliente. Incluyen tablas antiguas
(tiempo_extra, tiempo_extra_periodos, empleados_tiempo_extra, tiempo_extra_detalle,
actualizacion_estatus_peticiones, usuarios_duplicate), documentos y ordenes_compra.
Las tablas que ya operan exclusivamente por RPC (licencia_uso, cotizaciones_xml y
sus detalles, flujo_tramites_siif_historial) siguen sin acceso directo. No se
eliminan datos. folio_secuencias queda para operaciones internas autorizadas.

## Validación y límites

Pasaron npm.cmd run verify, test-rbac.js, test-seguridad-tablas.js y la reconstrucción
local de las 50 tablas con test-seguridad-inventario.js. Esta última instala el
paquete dos veces, usa ambos roles API, prueba lecturas sin sesión, RPC inválidas,
movimiento autorizado de stock, stock negativo, suplantación y edición del perfil.
El inventario usado es estructura y código; no se copiaron registros reales.

El verificador general mantiene avisos de rutas faltantes, políticas en migraciones
históricas y el fallback de autenticación heredado. La instalación lo deja sin
lectura anónima de usuarios, por lo que dicho fallback ya no permite entrar.
El login RPC 062 debe estar disponible (el paquete verifica esta dependencia).

No es una certificación de seguridad completa. Continúan contraseñas en texto
plano en el modelo heredado: falta migrarlas a hashes o Supabase Auth de forma
coordinada con las RPC que verifican contraseña. estado_licencia sigue siendo
consultable antes del login para el flujo de vigencia. Storage y otros esquemas
no estaban incluidos en los inventarios y no se han modificado. Las tablas nuevas
necesitan su propia revisión de permisos; no se instala un trigger DDL automático.

## Reproducir

node scripts/generar-rbac-sql.js
node scripts/preparar-seguridad-rpc.js <detalle.json>
node scripts/empaquetar-seguridad.js
node scripts/test-seguridad-tablas.js
node scripts/test-seguridad-inventario.js <inventario.json> <detalle.json>

No repetir version:bump: esta solicitud ya incrementó la versión a 2.0.161.
