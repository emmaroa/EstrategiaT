# Componente FODA · ARV Agentes de Cambio

`FodaModule.vue` es un componente independiente para montar dentro del Main Shell
de una aplicación Vue 3. No requiere Supabase, router ni una librería de modales.

## Instalación

En el proyecto Vue de destino, con Tailwind CSS ya configurado:

```sh
npm install vue @lucide/vue
```

Copia `FodaModule.vue` a `src/components/`. Incluye esa carpeta en el escaneo de
Tailwind. Se verificó con Tailwind 4; las utilidades empleadas también existen en
Tailwind 3.4. No se utiliza el CDN de Tailwind ni se generan clases dinámicamente.

El componente usa [Composition API y script setup](https://vuejs.org/api/sfc-script-setup.html)
y el paquete actual de [Lucide para Vue](https://lucide.dev/guide/vue).

```vue
<script setup>
import { ref } from 'vue'
import FodaModule from './components/FodaModule.vue'

const foda = ref(null)

function abrirFormularioPlan(hallazgo) {
  // Entregar hallazgo al módulo real de acciones correctivas / 5W2H.
  // Contiene id, quadrant, description, impact, category, actionPlanId,
  // documentId, documentCode, documentVersion, area y owner.
}

function abrirPlan(hallazgo) {
  // Navegar al plan existente utilizando hallazgo.actionPlanId.
}

function alCrearPlan(hallazgoId, planId) {
  // Invocar solamente cuando el módulo de acciones haya guardado el plan.
  // false significa que el documento está bloqueado, el hallazgo no existe
  // o no se pudo persistir el vínculo. No elimina el plan externo.
  return foda.value?.linkActionPlan(hallazgoId, planId)
}
</script>

<template>
  <FodaModule
    ref="foda"
    @create-action-plan="abrirFormularioPlan"
    @open-action-plan="abrirPlan"
  />
</template>
```

Las funciones del ejemplo son puntos de integración: el componente no inventa
planes ni asigna IDs antes de que el módulo externo los cree. Los vínculos se
admiten para Debilidades y Amenazas. El acceso a planes ya vinculados sigue
disponible cuando el documento está aprobado.

## Comportamiento

- Almacenamiento automático bajo `arv_foda_data`; esquema versionado y validación
  al recuperar datos. Fechas automáticas por defecto, con opción manual.
- Borrador y En Revisión permiten editar. Aprobado bloquea hallazgos, categorías,
  estrategias, metadatos y nuevos vínculos; exige confirmación para reabrir.
- Aprobar requiere completar el control documental y al menos un hallazgo.
- Edición en modal, confirmación de borrado y reinicio, soporte de Escape,
  foco nativo de los diálogos y avisos accesibles.
- El reinicio sustituye el FODA local: no borra planes de otros módulos.
- Errores de almacenamiento no muestran una confirmación falsa de guardado.
  Datos corruptos o cambios desde otra pestaña bloquean la sobrescritura automática.
- La impresión incluye estrategias colapsadas, metadatos completos y estado;
  omite navegación, botones y campos interactivos. El reporte puede ocupar varias
  páginas según el contenido. Los estilos de aislamiento del Shell se aplican
  únicamente durante la impresión y mientras el componente está montado.

La aprobación es un bloqueo de interfaz local, no una firma electrónica ni un
historial inmutable. `localStorage` es por navegador y origen: no sincroniza
usuarios o dispositivos. Para un SGC con trazabilidad centralizada, la plataforma
debe añadir autorización y versionado en servidor.

## Validación realizada

Compilación SFC y Tailwind, montaje en Edge sin interfaz, alta en los cuatro
cuadrantes, edición, eliminación con cancelación, persistencia tras recarga,
aprobación/reapertura, eventos de planes y vinculación, protección ante contenido
HTML importado, reinicio con confirmación, recuperación de almacenamiento corrupto,
vista de 390 px y generación de PDF con el Shell oculto.
