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

- `index.html`: acceso a la aplicación.
- `dashboard.html`: panel principal.
- `buscador-unidades.html`: buscador global de unidades.
- `modulos/`: pantallas funcionales organizadas por proceso.
- `css/`: estilos globales y estilos específicos de módulos.
- `js/core/`: autenticación, permisos, navegación, tema y conexión compartida.
- `js/services/`: acceso a datos y reglas por dominio.
- `js/modules/`: lógica de pantallas con comportamiento amplio.
- `supabase/migrations/`: evolución ordenada de la base de datos.
- `templates/`: documentos base agrupados por módulo.
- `assets/`: imágenes, íconos y otros recursos visuales.
- `scripts/`: verificación, empaquetado móvil y utilidades de desarrollo.
- `docs/`: documentación comercial, operativa y técnica.
- `android/`: proyecto nativo generado por Capacitor.
- `www/`: salida web generada para Capacitor; no editar directamente.

Consulta [docs/README.md](docs/README.md) para conocer el mapa completo de documentación.

## Seguridad antes de producción

El estado actual requiere migrar el inicio de sesión a Supabase Auth y reemplazar políticas RLS anónimas amplias. No debe utilizarse información sensible en una demo hasta completar esa migración y validar el aislamiento entre roles y proveedores.

## Documentos comerciales

- [Ficha comercial](docs/comercial/ficha-comercial.md)
- [Portafolio comercial](docs/comercial/portafolio-comercial.md)
- [Plan de preparación para venta](docs/comercial/plan-preparacion-venta.md)
