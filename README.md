# EstrategiaT

Plataforma web y móvil para administrar talleres, parque vehicular, almacén, compras, proveedores, seguimiento SIIF y procesos administrativos.

## Capacidades principales

- Dashboard ejecutivo e indicadores operativos.
- Parque vehicular y órdenes de trabajo.
- Peticiones, cotizaciones, requisiciones y vales.
- Captura, importación y seguimiento SIIF.
- Portal privado para proveedores.
- Acuerdos, empleados, tiempo extra y trámites administrativos.
- Roles, permisos, auditoría y exportaciones.
- Aplicación Android basada en Capacitor 7.

## Requisitos

- Node.js 18 o posterior.
- Una instancia de Supabase con las migraciones aplicadas.
- Android Studio y JDK compatibles para compilar Android.

## Verificación del proyecto

Antes de preparar una demostración o entrega:

```powershell
npm run verify
```

La verificación comprueba archivos esenciales, referencias locales, rutas declaradas, configuración móvil y riesgos conocidos de seguridad. Los avisos de autenticación y políticas anónimas deben resolverse antes de usar datos reales.

## Aplicación móvil

```powershell
npm run mobile:build
npm run mobile:sync
```

El contenido web preparado se copia a `www` y después se sincroniza con los proyectos nativos de Capacitor.

## Estructura

- `modulos/`: interfaces funcionales.
- `js/core/`: configuración, permisos, navegación y comportamiento compartido.
- `js/services/`: acceso a datos por dominio.
- `supabase/migrations/`: evolución versionada de la base de datos.
- `templates/`: plantillas Excel y Word.
- `android/`: proyecto móvil nativo.

## Seguridad antes de producción

El estado actual requiere migrar el inicio de sesión a Supabase Auth y reemplazar políticas RLS anónimas amplias. No debe utilizarse información sensible en una demo hasta completar esa migración y validar el aislamiento entre roles y proveedores.

## Documentos comerciales

- `FICHA_COMERCIAL_ESTRATEGIAT.md`
- `PORTAFOLIO_COMERCIAL_ESTRATEGIAT.md`
- `PLAN_PREPARACION_VENTA.md`
