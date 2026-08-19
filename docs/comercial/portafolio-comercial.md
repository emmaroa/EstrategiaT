# EstrategiaT — Portafolio comercial y valuación preliminar

**Sistema integral para la administración de talleres, flota, almacén, compras y trámites institucionales**  
Hermosillo, Sonora · Valuación preparada el 9 de agosto de 2026

> **Precio sugerido de salida a venta:** **$1,050,000 MXN + IVA**  
> **Rango razonable de cierre, después del paquete de preparación:** **$850,000 a $1,200,000 MXN + IVA**  
> **Valor técnico de reposición estimado:** **$1,180,000 a $1,540,000 MXN + IVA**

## Resumen ejecutivo

EstrategiaT es una plataforma administrativa web y móvil diseñada para centralizar la operación de un taller institucional. Reúne en un solo sistema el control de parque vehicular, peticiones de almacén, cotizaciones, requisiciones y seguimiento SIIF, vales, proveedores, acuerdos, empleados, tiempo extra, trámites administrativos, usuarios y auditoría.

El activo revisado supera claramente el alcance de una página web o un prototipo: contiene **24 interfaces HTML, 23 migraciones de base de datos, 16 archivos JavaScript, aplicación Android con Capacitor, control de acceso por roles, panel ejecutivo y portal privado para proveedores**. El repositorio suma **24,762 líneas útiles en 71 archivos fuente** y **95 cambios registrados** entre mayo y agosto de 2026.

La mejor estrategia no es vender únicamente el código “tal como está”, porque eso castiga el precio. Conviene ejecutar primero un paquete corto de endurecimiento, pruebas, documentación y transferencia. Con ese trabajo, el producto puede presentarse como una solución operativa transferible y no como desarrollo inconcluso.

## La propuesta de valor

EstrategiaT sustituye hojas de cálculo, archivos aislados y seguimientos manuales por una operación trazable:

- Centraliza información de unidades, compras, almacén, proveedores, personal y trámites.
- Reduce recapturas mediante importación validada de archivos SIIF.
- Da visibilidad ejecutiva mediante indicadores, alertas y consultas por rol.
- Permite dar seguimiento completo desde una petición hasta requisición, orden de compra y solicitud de pago.
- Extiende el sistema a proveedores mediante un portal privado de cotizaciones y entregas.
- Genera salidas en CSV/Excel, PDF y documentos de tiempo extra.
- Mantiene historial y auditoría de actividades.
- Funciona como web adaptable y como aplicación Android.

## Alcance funcional disponible

| Área | Capacidades observadas |
|---|---|
| Dirección | Dashboard ejecutivo, KPIs, alertas, montos y exportación |
| Parque vehicular | Expediente de unidades, disponibilidad, documentos, fotos, kilometraje, combustible y llantas |
| Taller | Órdenes de trabajo, labores, historial y mantenimiento programado |
| Almacén | Peticiones, vales foliados, cotizaciones, inventario y movimientos |
| Compras | Proveedores, cotizaciones, requisiciones y órdenes de compra |
| SIIF | Captura de requisiciones, órdenes y solicitudes de pago; seguimiento unificado e importación CSV |
| Proveedores | Portal privado, cotización de partidas, cartera SIIF, entregas y exportaciones |
| Gestión directiva | Acuerdos, responsables, compromisos, fechas e historial |
| Recursos humanos | Empleados, tiempo extra, permisos, vacaciones, días económicos e incapacidades |
| Documentos | Excel, CSV, PDF, DOCX y paquetes descargables a partir de plantillas |
| Seguridad funcional | Inicio de sesión, roles, módulos permitidos, acciones por rol y auditoría |
| Movilidad | Diseño adaptable, PWA/web móvil y proyecto Android mediante Capacitor 7 |

## Inventario técnico

- Frontend: HTML5, CSS3 y JavaScript sin dependencia de un framework pesado.
- Backend administrado: Supabase con PostgreSQL, autenticación y API.
- Base de datos: al menos 34 entidades/tablas definidas o extendidas en 23 migraciones.
- Aplicación móvil: Capacitor 7 con proyecto nativo Android y preparación para iOS.
- Reportes: generación y exportación CSV, Excel, PDF y DOCX.
- Arquitectura: servicios por dominio, núcleo de permisos, diseño compartido y módulos funcionales.
- Activos adicionales: plantillas oficiales para tiempo extra, manual de portal de proveedores e iconografía móvil.

## Perfil de comprador ideal

- Dependencias estatales o municipales con parque vehicular y taller propio.
- Organismos descentralizados y empresas de servicios públicos.
- Empresas con flotilla, almacén de refacciones y compras recurrentes.
- Talleres corporativos que requieren autorizaciones, evidencia y trazabilidad.
- Integradores de software que quieran licenciar la solución a varios clientes.

## Valuación por costo de reposición

La estimación representa lo que costaría reconstruir hoy un producto equivalente con un equipo pequeño en Hermosillo. Se utiliza una tarifa comercial combinada de **$650 MXN por hora**, superior al salario nominal porque incorpora dirección, análisis, prestaciones/cargas, tiempos no facturables, equipo, garantía y riesgo del proveedor.

| Frente de trabajo | Horas equivalentes | Importe |
|---|---:|---:|
| Descubrimiento, procesos y arquitectura | 150 h | $97,500 |
| UX/UI, diseño adaptable y sistema visual | 220 h | $143,000 |
| Frontend y módulos administrativos | 720 h | $468,000 |
| Base de datos, autenticación, API y permisos | 330 h | $214,500 |
| Dashboard, reportes e importación/exportación | 190 h | $123,500 |
| Aplicación móvil Android/Capacitor | 100 h | $65,000 |
| QA, despliegue, documentación y gestión | 190 h | $123,500 |
| **Subtotal de reconstrucción** | **1,900 h** | **$1,235,000** |
| Contingencia técnica (12%) |  | $148,200 |
| **Valor central de reposición** |  | **$1,383,200 MXN** |

Por variación de alcance, seniority y nivel de garantía, se recomienda expresar el costo de reposición como un rango de **$1.18 a $1.54 millones MXN + IVA**. Como contraste, referencias comerciales mexicanas de 2026 colocan plataformas empresariales y ERP/CRM a medida en rangos que comienzan alrededor de $600 mil y pueden superar $1.5 millones; la presente cifra se mantiene en el extremo prudente por el uso de una arquitectura web ligera.

## Precio de venta recomendado

El costo de reposición no es automáticamente el precio de venta. La operación debe descontar riesgos de transferencia y sumar el valor de tener el sistema ya construido.

| Modalidad | Qué recibe el comprador | Precio sugerido |
|---|---|---:|
| Venta inmediata “como está” | Código y activos actuales, sin garantía amplia | **$500,000–$700,000 + IVA** |
| Venta preparada | Código, base de datos, documentación, hardening, pruebas, despliegue y 60 días de soporte | **$850,000–$1,200,000 + IVA** |
| Venta exclusiva estratégica | Todo lo anterior, cesión amplia, capacitación, personalización inicial y 90 días de soporte | **$1,200,000–$1,550,000 + IVA** |
| Licencia por cliente | Derecho de uso sin transferir propiedad intelectual | **$180,000–$320,000 de implementación + IVA** |

### Recomendación de negociación

- Publicar o presentar en **$1,050,000 MXN + IVA**.
- Definir un objetivo de cierre de **$900,000 MXN + IVA**.
- No bajar de **$750,000 MXN + IVA** si incluye código fuente, base de datos, capacitación y exclusividad.
- Si el comprador sólo necesita uso interno, conservar la propiedad intelectual y ofrecer licencia; tres implementaciones pueden superar el ingreso de una venta única.
- Cobrar personalizaciones posteriores por separado, sugerentemente entre **$650 y $950 MXN/hora + IVA**.

Estos importes suponen que quien vende puede acreditar la propiedad o autorización de transferencia de todo el código, plantillas, marca, dominio y datos involucrados.

## Inversión para dejarlo listo para venta

| Actividad previa | Estimación |
|---|---:|
| Auditoría y endurecimiento de seguridad/RLS | $35,000–$60,000 |
| Pruebas funcionales y corrección de incidencias críticas | $30,000–$55,000 |
| Manual técnico, instalación, respaldo y recuperación | $18,000–$30,000 |
| Inventario de propiedad intelectual y licencias | $8,000–$18,000 |
| Demo con datos ficticios, capacitación y material comercial | $15,000–$30,000 |
| **Paquete recomendado** | **$106,000–$193,000 + IVA** |

La inversión puede realizarse por etapas. El mínimo recomendable antes de una demostración con información real es seguridad, respaldo y eliminación/anonimización de datos personales.

## Costos de operación estimados

| Concepto | Mensual | Anual aproximado |
|---|---:|---:|
| Supabase Pro, base | ~US$25 | ~US$300 |
| Hosting web/CDN | $0–$500 MXN | $0–$6,000 MXN |
| Dominio | — | $400–$1,200 MXN |
| Correo transaccional/SMTP | $0–$600 MXN | $0–$7,200 MXN |
| Soporte correctivo preventivo | $8,000–$18,000 MXN | $96,000–$216,000 MXN |
| **Operación recomendada, sin mejoras mayores** | **$9,000–$20,000 MXN** | **$108,000–$240,000 MXN** |

Supabase publica el plan Pro desde **US$25 al mes**, con 100,000 usuarios activos mensuales, 8 GB de base de datos, 250 GB de transferencia y respaldos diarios de siete días incluidos. El consumo adicional y servicios opcionales se facturan aparte. Para una instalación institucional crítica podría evaluarse un plan superior o infraestructura dedicada.

## Estado de preparación y riesgos

### Fortalezas verificadas

- Cobertura funcional amplia y especializada.
- Flujos conectados de almacén, compras, proveedores y SIIF.
- Aplicación web y proyecto Android disponibles.
- Base de datos versionada mediante migraciones.
- Control granular de módulos y acciones por rol.
- Exportaciones y documentos operativos ya implementados.
- Actividad de desarrollo reciente y repositorio con historial.

### Aspectos que reducen el valor si no se atienden

- Varias migraciones contienen políticas amplias para el rol `anon`; deben revisarse antes de producción o de una demostración con datos sensibles.
- No se observó una suite formal de pruebas automatizadas del negocio.
- Parte de la lógica vive dentro de archivos HTML extensos, lo que eleva el costo de mantenimiento.
- Algunas rutas declaradas corresponden a capacidades futuras o no están presentes como pantallas terminadas; el contrato debe listar únicamente entregables verificados.
- Se requiere documentar configuración, secretos, respaldo, restauración y despliegue.
- La publicación móvil comercial exige revisar firma, cuenta de tienda, privacidad y cumplimiento.
- El comprador debe recibir datos ficticios o anonimizados; los datos operativos y personales no deben transferirse sin base legal.

## Paquete de entrega propuesto

1. Código fuente etiquetado en una versión estable.
2. Migraciones y diagrama actualizado de base de datos.
3. Manual de instalación, variables de entorno y despliegue.
4. Manual de operación para administrador, usuarios y proveedores.
5. Matriz de roles y permisos.
6. Aplicación Android firmada o proyecto listo para firma del comprador.
7. Inventario de librerías, plantillas, dominio, marca y licencias.
8. Respaldo inicial, procedimiento de restauración y plan de continuidad.
9. Ambiente de demostración con datos ficticios.
10. Capacitación, acta de aceptación y periodo definido de soporte.

## Condiciones comerciales sugeridas

- 30% al firmar carta de intención y reservar la operación.
- 40% al entregar ambiente de aceptación y documentación.
- 30% contra transferencia final y acta de aceptación.
- Cambios fuera del alcance se cotizan aparte.
- La garantía cubre defectos reproducibles, no nuevas funciones ni cambios de terceros.
- El contrato debe precisar si la cesión es exclusiva, territorial, perpetua o sólo una licencia de uso.
- Los precios se expresan antes de IVA y deben validarse con asesor fiscal y abogado.

## Base y límites de la estimación

Esta es una **valuación técnica-comercial preliminar**, no un avalúo financiero ni una opinión legal. Se basa en inspección estática del repositorio al 9 de agosto de 2026; no incluye entrevistas con usuarios, métricas de adopción, ingresos, ahorro demostrado, inventario de datos productivos, pruebas de penetración ni ejecución de todos los flujos contra una instancia real de Supabase. Si existen usuarios activos, contratos, ahorro anual comprobable o posibilidad de licenciar a múltiples dependencias, el valor por ingresos puede ser mayor al costo de reposición.

Referencias de mercado consultadas:

- [Indeed: sueldo de desarrollador de software en Hermosillo](https://mx.indeed.com/career/desarrollador-de-software/salaries/Hermosillo--Son.) — $17,510 mensuales, actualizado el 10 de julio de 2026.
- [Gobierno de Sonora: convocatoria de Jefe de Departamento de Desarrollo Web 2026](https://hacienda.sonora.gob.mx/doclink/convocatoria-sh-001-2026-jefe-departamento-desarrollo-web/) — referencia pública de remuneración bruta de $22,832.45 mensuales.
- [Observatorio Laboral: panorama profesional por estados](https://www.observatoriolaboral.gob.mx/static/estudios-publicaciones/Panorama_profesional_estados.html) — promedio profesional de Sonora basado en ENOE al cuarto trimestre de 2025.
- [Supabase: precios oficiales](https://supabase.com/pricing) — plan Pro desde US$25/mes y límites incluidos.

---

**Mensaje comercial breve**

> EstrategiaT digitaliza de punta a punta la administración de talleres y flotillas: desde una petición de almacén hasta su compra, entrega y seguimiento financiero, incorporando control vehicular, proveedores, personal, auditoría y app móvil. Es una base funcional y adaptable que reduce meses de desarrollo y puede implantarse en dependencias, organismos y empresas con operación de flotilla.
