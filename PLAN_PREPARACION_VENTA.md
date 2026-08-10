# Plan de preparación para venta — EstrategiaT

## Objetivo

Convertir el repositorio actual en un producto demostrable, documentado y transferible sin exponer información real ni prometer capacidades que todavía no han sido verificadas.

## Decisión recomendada

No presentar una demo con datos productivos hasta completar la Fase 1. Mientras tanto, usar exclusivamente un ambiente separado con datos ficticios.

## Fase 1 — Bloqueadores de seguridad (prioridad crítica)

Duración estimada: 2 a 4 semanas. Inversión estimada: $35,000 a $60,000 MXN + IVA.

- Migrar el inicio de sesión a Supabase Auth; eliminar la comparación de contraseñas desde el navegador.
- Invalidar contraseñas actuales y obligar a cada usuario a establecer una nueva.
- Sustituir `localStorage` como autoridad de identidad por la sesión firmada de Supabase.
- Crear una relación segura entre `auth.users` y el perfil funcional de cada usuario.
- Reemplazar políticas `anon ... USING (true)` por políticas RLS basadas en usuario, rol, proveedor y área.
- Revocar escrituras anónimas en tablas administrativas, auditoría, empleados y SIIF.
- Limitar el portal de proveedor a los registros asociados al proveedor autenticado.
- Separar desarrollo, demostración y producción en proyectos distintos.
- Rotar credenciales, revisar variables públicas y documentar el manejo de secretos.
- Probar que un usuario no pueda consultar o modificar registros de otro rol/proveedor.

### Criterio de aceptación

Una prueba automatizada o documentada demuestra que cada rol sólo puede leer y modificar los datos expresamente autorizados, incluso usando directamente la API.

## Fase 2 — Estabilidad y aceptación funcional

Duración estimada: 2 a 3 semanas. Inversión estimada: $30,000 a $55,000 MXN + IVA.

- Definir los 12 flujos críticos que sí formarán parte de la venta.
- Crear pruebas de humo reproducibles para login, usuarios, peticiones, vales, SIIF, proveedores y exportaciones.
- Corregir errores críticos y registrar limitaciones conocidas.
- Verificar instalación desde cero aplicando todas las migraciones.
- Probar restauración de respaldo.
- Validar versión móvil Android en al menos dos tamaños de pantalla.
- Revisar accesibilidad básica, mensajes de error y estados vacíos.

### Flujos mínimos sugeridos para aceptación

1. Acceso y cierre de sesión por rol.
2. Alta y restricción de usuario.
3. Registro y consulta de unidad.
4. Creación y seguimiento de petición.
5. Generación de vale.
6. Registro de cotización.
7. Conversión o vínculo con requisición.
8. Importación SIIF con duplicados y errores.
9. Seguimiento requisición–orden–pago.
10. Cotización y actualización desde portal de proveedor.
11. Registro de trámite administrativo o tiempo extra.
12. Exportación de dashboard/documentos.

## Fase 3 — Transferencia y documentación

Duración estimada: 1 a 2 semanas. Inversión estimada: $18,000 a $30,000 MXN + IVA.

- Manual de instalación y configuración.
- Diagrama de arquitectura y modelo de datos.
- Catálogo de módulos, roles y permisos.
- Manual de respaldo y recuperación.
- Manual de operación del administrador.
- Registro de versiones y procedimiento de despliegue.
- Inventario de dependencias y licencias.
- Matriz de entregables y exclusiones contractuales.

## Fase 4 — Paquete comercial y demo

Duración estimada: 1 semana. Inversión estimada: $15,000 a $30,000 MXN + IVA.

- Ambiente demo aislado con datos ficticios coherentes.
- Tres usuarios demo: Dirección, Almacén y Proveedor.
- Guion de demostración de 20 minutos.
- Video breve de 2 a 3 minutos.
- Capturas limpias de dashboard, flujo SIIF y portal de proveedor.
- Ficha comercial de una página y portafolio completo.
- Formato de propuesta económica y carta de intención.

## Guion de demostración recomendado (20 minutos)

| Tiempo | Demostración | Mensaje de negocio |
|---:|---|---|
| 0–2 min | Problema y alcance | Una sola plataforma reemplaza seguimientos dispersos |
| 2–5 min | Dashboard de Dirección | Visibilidad inmediata de pendientes, montos y operación |
| 5–9 min | Petición, cotización y vale | Trazabilidad desde la necesidad hasta la salida de almacén |
| 9–13 min | Importación y seguimiento SIIF | Menos recaptura y seguimiento financiero unificado |
| 13–16 min | Portal de proveedor | Colaboración externa controlada y mejor información de entrega |
| 16–18 min | Personal, tiempo extra y documentos | Automatización de formatos y procesos administrativos |
| 18–20 min | Implementación y propuesta | Producto adaptable, transferencia ordenada y soporte definido |

## Datos ficticios para la demo

- 30 unidades con diferentes estatus.
- 3 dependencias o áreas.
- 5 proveedores ficticios.
- 25 peticiones en distintas etapas.
- 12 requisiciones, 8 órdenes de compra y 6 solicitudes de pago.
- 10 vales y 8 acuerdos.
- 15 empleados y 2 periodos de tiempo extra.
- Fechas dentro de los últimos 90 días para que el dashboard sea convincente.

No reutilizar nombres, correos, documentos, placas, importes o expedientes reales.

## Matriz de preparación

| Condición | Estado observado | Antes de venta |
|---|---|---|
| Cobertura funcional | Amplia | Verificar flujos incluidos |
| Interfaz web/móvil | Disponible | QA visual y móvil |
| Historial de código | Disponible | Etiquetar versión estable |
| Base de datos versionada | Disponible | Probar instalación limpia |
| Autenticación segura | No lista | Migrar a Supabase Auth |
| RLS y aislamiento de datos | No listo | Rediseñar y probar políticas |
| Pruebas automatizadas | No observadas | Añadir pruebas críticas |
| Documentación de transferencia | Parcial | Completar paquete técnico |
| Datos para demo | No definidos | Crear conjunto ficticio |
| Propiedad intelectual | Por verificar | Integrar expediente legal |

## Evidencia que aumenta el precio

Registrar durante 30 a 60 días, si el sistema ya está en uso:

- Usuarios activos por rol.
- Peticiones, vales y trámites procesados al mes.
- Tiempo promedio antes y después del sistema.
- Porcentaje de expedientes con trazabilidad completa.
- Horas de recaptura evitadas por importaciones.
- Tiempo de respuesta de proveedores.
- Reducción de pendientes vencidos.

El precio basado en ahorro o adopción puede ser mayor que una valuación basada sólo en horas de desarrollo.

## Expediente legal y contractual

- Confirmar titularidad del código, diseño, plantillas, dominio y marca.
- Identificar código o recursos de terceros y conservar sus licencias.
- Definir si se vende propiedad, exclusividad o únicamente licencia de uso.
- Separar expresamente los datos del producto: vender software no implica transferir datos personales u operativos.
- Incluir alcance, exclusiones, garantía, soporte, aceptación, confidencialidad y calendario de pagos.
- Obtener revisión de abogado y contador antes de firmar.

## Orden de ejecución

1. Congelar una copia estable del estado actual.
2. Crear ambiente demo separado.
3. Completar autenticación y RLS.
4. Ejecutar pruebas críticas.
5. Documentar instalación y transferencia.
6. Poblar datos ficticios y grabar demo.
7. Iniciar conversaciones comerciales con precio de salida de $1,050,000 MXN + IVA.

