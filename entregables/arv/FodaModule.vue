<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Plus, Trash2, Edit3, CheckCircle, AlertCircle, ShieldCheck, TrendingUp, Zap, Printer, ArrowRight } from '@lucide/vue'

// The parent creates/persists action plans, then calls linkActionPlan(itemId, planId).
const emit = defineEmits(['create-action-plan', 'open-action-plan'])
const STORAGE_KEY = 'arv_foda_data'
const categories = ['Procesos', 'Recursos', 'Mercado', 'Personal', 'Infraestructura', 'Tecnología']
const impacts = ['Alto', 'Medio', 'Bajo']
const statuses = ['Borrador', 'En Revisión', 'Aprobado']
const quadrants = [
  { key: 'F', title: 'Fortalezas', singular: 'Fortaleza', subtitle: 'Capacidad interna', color: '#10B981', surface: '#ecfdf5', icon: ShieldCheck },
  { key: 'O', title: 'Oportunidades', singular: 'Oportunidad', subtitle: 'Crecimiento externo', color: '#3B82F6', surface: '#eff6ff', icon: TrendingUp },
  { key: 'D', title: 'Debilidades', singular: 'Debilidad', subtitle: 'Puntos internos a mejorar', color: '#F59E0B', surface: '#fffbeb', icon: Zap },
  { key: 'A', title: 'Amenazas', singular: 'Amenaza', subtitle: 'Riesgos externos', color: '#EF4444', surface: '#fef2f2', icon: AlertCircle },
]
const strategies = [
  { key: 'FO', name: 'Maxi-Maxi', help: 'Usar fortalezas para aprovechar oportunidades.' },
  { key: 'DO', name: 'Mini-Maxi', help: 'Superar debilidades aprovechando oportunidades.' },
  { key: 'FA', name: 'Maxi-Mini', help: 'Usar fortalezas para evitar amenazas.' },
  { key: 'DA', name: 'Mini-Mini', help: 'Minimizar debilidades y evitar amenazas.' },
]
const metadata = [
  { key: 'code', label: 'Código de documento', placeholder: 'SGC-FODA-001', max: 80 },
  { key: 'version', label: 'Versión', placeholder: 'v1.2', max: 40 },
  { key: 'area', label: 'Proceso / Área evaluada', placeholder: 'Planta Operativa / Dirección General', max: 200 },
  { key: 'owner', label: 'Elaboró / Responsable', placeholder: 'Emma Figueroa', max: 150 },
]
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const newId = () => globalThis.crypto?.randomUUID?.() || `foda-${Date.now()}-${Math.random().toString(36).slice(2)}`
function emptyDocument() {
  return {
    schemaVersion: 1, id: newId(), code: 'SGC-FODA-001', version: 'v1.2', area: '', owner: '',
    date: today(), automaticDate: true, status: 'Borrador', updatedAt: null,
    items: { F: [], O: [], D: [], A: [] }, strategies: { FO: '', DO: '', FA: '', DA: '' },
  }
}
const documentData = ref(emptyDocument())
const ready = ref(false)
const storageError = ref('')
const storageBlocked = ref(false)
const savedAt = ref(null)
const editor = ref(null)
const editorDialog = ref(null)
const confirmDialog = ref(null)
const summaryPanel = ref(null)
const confirm = ref(null)
const toast = ref('')
const draft = reactive({ description: '', impact: 'Medio', category: 'Procesos' })
let toastTimer
let lastStored = null
let stopWatch
let summaryWasOpen = true
const approved = computed(() => documentData.value.status === 'Aprobado')
const disabled = computed(() => !ready.value || approved.value || storageBlocked.value)
const total = computed(() => quadrants.reduce((sum, q) => sum + documentData.value.items[q.key].length, 0))
const highImpact = computed(() => quadrants.reduce((sum, q) => sum + documentData.value.items[q.key].filter(i => i.impact === 'Alto').length, 0))
const statusClass = computed(() => ({
  Borrador: 'border-amber-300 bg-amber-50 text-amber-900',
  'En Revisión': 'border-blue-300 bg-blue-50 text-blue-900',
  Aprobado: 'border-emerald-300 bg-emerald-50 text-emerald-900',
}[documentData.value.status]))
const impactClass = impact => ({ Alto: 'bg-red-50 text-red-800', Medio: 'bg-blue-50 text-blue-800', Bajo: 'bg-slate-100 text-slate-700' }[impact])
const formatTime = value => value ? new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
const planLabel = id => String(id).startsWith('PL-') ? String(id) : `PL-${id}`

function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 4200)
}
function validDocument(value) {
  const text = (v, max) => typeof v === 'string' && v.length <= max
  if (!value || value.schemaVersion !== 1 || !text(value.id, 150) || !value.id || !statuses.includes(value.status)) return false
  if (!metadata.every(m => text(value[m.key], m.max))) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(Date.parse(value.date))) return false
  if (typeof value.automaticDate !== 'boolean' || (value.updatedAt !== null && !Number.isFinite(Date.parse(value.updatedAt)))) return false
  if (!value.items || !value.strategies || !strategies.every(s => text(value.strategies[s.key], 4000))) return false
  const ids = new Set()
  return quadrants.every(q => Array.isArray(value.items[q.key]) && value.items[q.key].length <= 500 && value.items[q.key].every(i => {
    if (!i || !text(i.id, 150) || !i.id || ids.has(i.id) || !text(i.description, 2000) || !i.description.trim() || !categories.includes(i.category) || !impacts.includes(i.impact)) return false
    if (i.actionPlanId !== null && (!text(i.actionPlanId, 150) || !i.actionPlanId.trim())) return false
    ids.add(i.id)
    return true
  }))
}
function persist(showNotice = false) {
  if (!ready.value || storageBlocked.value) return false
  try {
    // Do not silently overwrite another tab's changes.
    if (window.localStorage.getItem(STORAGE_KEY) !== lastStored) {
      storageBlocked.value = true
      storageError.value = 'El FODA cambió en otra pestaña. Recarga para recuperar la versión guardada antes de continuar.'
      return false
    }
    const serialized = JSON.stringify(documentData.value)
    window.localStorage.setItem(STORAGE_KEY, serialized)
    lastStored = serialized
    savedAt.value = new Date().toISOString()
    storageError.value = ''
    if (showNotice) notify('Estado guardado en este dispositivo.')
    return true
  } catch {
    storageError.value = 'No se pudo guardar en este navegador. Revisa el espacio disponible y los permisos de almacenamiento; tus cambios siguen en pantalla.'
    return false
  }
}
function load() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      const parsed = JSON.parse(stored)
      if (!validDocument(parsed)) throw new Error('invalid-data')
      documentData.value = parsed
      savedAt.value = parsed.updatedAt
    }
    lastStored = stored
  } catch {
    storageBlocked.value = true
    storageError.value = 'No se pudo recuperar el FODA guardado. No se sobrescribirá: recarga para reintentar o confirma Nuevo FODA para sustituirlo.'
  }
  ready.value = true
  stopWatch = watch(documentData, () => { persist() }, { deep: true, flush: 'sync' })
}
// All writes go through this boundary: one timestamp and one storage write per change.
function commit(change) {
  if (!ready.value || storageBlocked.value) return false
  const next = JSON.parse(JSON.stringify(documentData.value))
  change(next)
  if (next.automaticDate) next.date = today()
  next.updatedAt = new Date().toISOString()
  documentData.value = next
  return true
}
function changeMetadata(key, value) {
  if (disabled.value) return
  if (key === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return
  commit(doc => { doc[key] = value })
}
function changeStrategy(key, value) {
  if (!disabled.value) commit(doc => { doc.strategies[key] = value })
}
function changeCategory(quadrant, itemId, category) {
  if (disabled.value || !categories.includes(category)) return
  commit(doc => { const item = doc.items[quadrant].find(i => i.id === itemId); if (item) item.category = category })
}
async function openEditor(quadrant, item = null) {
  if (disabled.value) return
  if (!item && documentData.value.items[quadrant].length >= 500) return notify('Este cuadrante alcanzó el límite de 500 hallazgos.')
  editor.value = { quadrant, id: item?.id || null, title: quadrants.find(q => q.key === quadrant).singular }
  Object.assign(draft, { description: item?.description || '', impact: item?.impact || 'Medio', category: item?.category || 'Procesos' })
  await nextTick()
  editorDialog.value.showModal()
}
function saveItem() {
  if (disabled.value || !editor.value || !draft.description.trim()) return
  const { quadrant, id } = editor.value
  commit(doc => {
    const values = { description: draft.description.trim(), impact: draft.impact, category: draft.category }
    if (id) {
      const item = doc.items[quadrant].find(i => i.id === id)
      if (item) Object.assign(item, values)
    } else doc.items[quadrant].push({ id: newId(), ...values, actionPlanId: null })
  })
  editorDialog.value.close()
}
async function askConfirmation(action) {
  confirm.value = action
  await nextTick()
  confirmDialog.value.showModal()
}
function changeStatus(event) {
  const status = event.target.value
  event.target.value = documentData.value.status
  if (!ready.value || storageBlocked.value || status === documentData.value.status || !statuses.includes(status)) return
  if (status === 'Aprobado') {
    if (!metadata.every(m => documentData.value[m.key].trim()) || !total.value) return notify('Completa el control documental y registra al menos un hallazgo antes de aprobar.')
    askConfirmation({ type: 'status', status, title: 'Aprobar este FODA', message: 'Se bloquearán los hallazgos, el control documental y las estrategias. Podrás reabrirlo explícitamente para editarlo.' })
  } else if (approved.value) {
    askConfirmation({ type: 'status', status, title: 'Reabrir documento aprobado', message: 'El documento dejará de estar aprobado. Revisa su versión documental antes de volver a aprobarlo.' })
  } else commit(doc => { doc.status = status })
}
function deleteItem(quadrant, item) {
  if (!disabled.value) askConfirmation({ type: 'delete', quadrant, id: item.id, title: 'Eliminar hallazgo', message: `Se eliminará «${item.description.slice(0, 160)}».${item.actionPlanId ? ' El plan vinculado no se eliminará del módulo de acciones.' : ''}` })
}
function newDocument() {
  if (ready.value) askConfirmation({ type: 'reset', title: 'Reiniciar / Nuevo FODA', message: 'Se sustituirá el FODA guardado en este dispositivo, incluidos sus hallazgos y estrategias. Imprime el reporte antes si necesitas conservarlo. Los planes externos no se eliminarán.' })
}
function applyConfirmation() {
  const action = confirm.value
  confirmDialog.value.close()
  if (!action) return
  if (action.type === 'reset') {
    try {
      const next = emptyDocument()
      next.updatedAt = new Date().toISOString()
      const serialized = JSON.stringify(next)
      window.localStorage.setItem(STORAGE_KEY, serialized)
      lastStored = serialized
      storageBlocked.value = false
      documentData.value = next
      notify('Nuevo FODA creado.')
    } catch { storageError.value = 'No fue posible crear el nuevo FODA. El documento anterior permanece en pantalla.' }
  } else if (action.type === 'status') {
    commit(doc => { doc.status = action.status })
  } else if (action.type === 'delete' && !disabled.value) {
    commit(doc => { doc.items[action.quadrant] = doc.items[action.quadrant].filter(i => i.id !== action.id) })
  }
}
function actionContext(quadrant, item) {
  return { ...item, quadrant, documentId: documentData.value.id, documentCode: documentData.value.code, documentVersion: documentData.value.version, area: documentData.value.area, owner: documentData.value.owner }
}
function createPlan(quadrant, item) {
  if (!disabled.value && !item.actionPlanId && ['D', 'A'].includes(quadrant)) emit('create-action-plan', actionContext(quadrant, item))
}
// Call after the external module has successfully created the actual plan.
function linkActionPlan(itemId, planId) {
  if (disabled.value || planId === null || planId === undefined || !String(planId).trim() || String(planId).length > 150) return false
  const quadrant = ['D', 'A'].find(key => documentData.value.items[key].some(i => i.id === itemId))
  if (!quadrant) return false
  commit(doc => { doc.items[quadrant].find(i => i.id === itemId).actionPlanId = String(planId).trim() })
  return !storageError.value
}
async function printReport() { await nextTick(); window.print() }
function beforePrint() {
  if (summaryPanel.value) { summaryWasOpen = summaryPanel.value.open; summaryPanel.value.open = true }
}
function afterPrint() { if (summaryPanel.value) summaryPanel.value.open = summaryWasOpen }
function storageChanged(event) {
  if (event.storageArea !== window.localStorage || (event.key !== STORAGE_KEY && event.key !== null)) return
  storageBlocked.value = true
  storageError.value = 'El almacenamiento cambió en otra pestaña. Recarga para trabajar sobre la versión actual.'
  editorDialog.value?.close()
  confirmDialog.value?.close()
}
onMounted(() => { load(); window.addEventListener('storage', storageChanged); window.addEventListener('beforeprint', beforePrint); window.addEventListener('afterprint', afterPrint) })
onBeforeUnmount(() => { stopWatch?.(); clearTimeout(toastTimer); window.removeEventListener('storage', storageChanged); window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint) })
defineExpose({ linkActionPlan })
</script>

<template>
  <section class="arv-foda mx-auto max-w-7xl space-y-6 p-4 text-slate-900 sm:p-6" aria-label="Análisis FODA organizacional" :aria-busy="!ready">
    <header class="rounded-2xl bg-[#1E3A8A] p-5 text-white sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-5">
        <div><p class="text-xs font-semibold uppercase tracking-widest text-blue-200">ARV · Agentes de Cambio / SGC</p><h1 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Análisis FODA Organizacional</h1><p class="mt-2 text-sm text-blue-100">Módulo 1 · Contexto de la organización y dirección estratégica</p></div>
        <div class="no-print"><label class="mb-2 block text-xs font-semibold" for="arv-foda-status">Estado de aprobación</label><select id="arv-foda-status" :value="documentData.status" :disabled="!ready || storageBlocked" class="rounded-full border px-4 py-2 text-sm font-semibold" :class="statusClass" @change="changeStatus"><option v-for="status in statuses" :key="status">{{ status }}</option></select></div>
        <p class="print-only">Estado: {{ documentData.status }}</p>
      </div>
      <div class="mt-6 grid gap-4 border-t border-white/20 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="field in metadata" :key="field.key" class="min-w-0">
          <label :for="`arv-foda-${field.key}`" class="mb-1.5 block text-xs font-medium text-blue-100">{{ field.label }}</label>
          <input :id="`arv-foda-${field.key}`" :value="documentData[field.key]" :placeholder="field.placeholder" :maxlength="field.max" :disabled="disabled" class="document-input no-print w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200" @input="changeMetadata(field.key, $event.target.value)">
          <p class="print-only break-words">{{ documentData[field.key] || 'Sin especificar' }}</p>
        </div>
        <div class="sm:col-span-2"><label for="arv-foda-date" class="mb-1.5 block text-xs text-blue-100">Fecha de última actualización</label><div class="no-print flex flex-wrap items-center gap-3"><input id="arv-foda-date" type="date" :value="documentData.date" :disabled="disabled || documentData.automaticDate" class="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white" @change="changeMetadata('date', $event.target.value)"><label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="documentData.automaticDate" :disabled="disabled" @change="changeMetadata('automaticDate', $event.target.checked)"> Fecha automática</label></div><p class="print-only">{{ documentData.date }}</p></div>
      </div>
    </header>

    <div v-if="storageError" role="alert" class="no-print rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"><AlertCircle class="mr-2 inline size-5" aria-hidden="true" />{{ storageError }}</div>
    <div v-if="approved" class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck class="size-5 shrink-0" aria-hidden="true" /><p><strong>Documento aprobado.</strong> Edición bloqueada. Para modificarlo, cambia el estado y confirma su reapertura.</p></div>
    <div v-else-if="documentData.status === 'En Revisión'" role="status" class="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><AlertCircle class="size-5 shrink-0" aria-hidden="true" /><p><strong>En revisión.</strong> Valida los hallazgos y las estrategias antes de aprobar. La edición permanece habilitada.</p></div>

    <div class="flex flex-wrap items-center justify-between gap-3 text-sm"><p><strong>{{ total }}</strong> hallazgos <span class="mx-2 text-slate-300">/</span> <strong>{{ highImpact }}</strong> de impacto alto</p><p class="no-print text-slate-500" role="status">{{ storageError ? 'Cambios pendientes de guardar' : savedAt ? `Guardado en este dispositivo · ${formatTime(savedAt)}` : 'Guardado automático en este dispositivo' }}</p></div>

    <div class="foda-matrix grid gap-5 lg:grid-cols-2">
      <section v-for="q in quadrants" :key="q.key" :aria-labelledby="`arv-heading-${q.key}`" class="quadrant min-w-0 rounded-2xl border p-4 sm:p-5" :style="{ borderColor: q.color, backgroundColor: q.surface }">
        <header class="mb-4 flex items-center justify-between gap-3"><div class="flex items-center gap-3"><span class="rounded-xl bg-white p-2.5" :style="{ color: q.color }"><component :is="q.icon" class="size-6" aria-hidden="true" /></span><div><h2 :id="`arv-heading-${q.key}`" class="text-lg font-bold">{{ q.title }}</h2><p class="text-xs text-slate-600">{{ q.subtitle }}</p></div></div><span class="rounded-full bg-white px-3 py-1 text-sm font-bold" :aria-label="`${documentData.items[q.key].length} hallazgos`">{{ documentData.items[q.key].length }}</span></header>
        <ul class="space-y-3">
          <li v-for="item in documentData.items[q.key]" :key="item.id" class="finding rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-2"><span class="rounded-md px-2 py-1 text-xs font-semibold" :class="impactClass(item.impact)">Impacto {{ item.impact.toLowerCase() }}</span><div v-if="!approved" class="no-print flex gap-1"><button type="button" :disabled="disabled" class="icon-button text-slate-600 hover:bg-slate-100" :aria-label="`Editar ${item.description.slice(0, 60)}`" @click="openEditor(q.key, item)"><Edit3 class="size-4" aria-hidden="true" /></button><button type="button" :disabled="disabled" class="icon-button text-red-700 hover:bg-red-50" :aria-label="`Eliminar ${item.description.slice(0, 60)}`" @click="deleteItem(q.key, item)"><Trash2 class="size-4" aria-hidden="true" /></button></div></div>
            <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{{ item.description }}</p>
            <label class="no-print mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span>Categoría</span><select :value="item.category" :disabled="disabled" class="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800" @change="changeCategory(q.key, item.id, $event.target.value)"><option v-for="category in categories" :key="category">{{ category }}</option></select></label><p class="print-only mt-2 text-xs">Categoría: {{ item.category }}</p>
            <div v-if="q.key === 'D' || q.key === 'A'" class="mt-4 border-t border-slate-100 pt-3">
              <button v-if="item.actionPlanId" type="button" class="no-print flex items-center gap-2 text-sm font-semibold text-[#1E3A8A] hover:underline" @click="emit('open-action-plan', actionContext(q.key, item))"><CheckCircle class="size-4 shrink-0" aria-hidden="true" /><span class="break-all">Plan vinculado (#{{ planLabel(item.actionPlanId) }})</span><ArrowRight class="size-4 shrink-0" aria-hidden="true" /></button>
              <button v-else-if="!approved" type="button" :disabled="disabled" class="no-print flex items-center gap-2 text-left text-sm font-semibold text-[#1E3A8A] hover:underline" @click="createPlan(q.key, item)"><Plus class="size-4 shrink-0" aria-hidden="true" />Generar Plan de Acción (5W2H)</button>
              <p v-else class="no-print text-xs text-slate-500">Sin plan vinculado</p><p class="print-only text-xs">{{ item.actionPlanId ? `Plan vinculado: #${planLabel(item.actionPlanId)}` : 'Sin plan vinculado' }}</p>
            </div>
          </li>
        </ul>
        <p v-if="!documentData.items[q.key].length" class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Aún no hay hallazgos registrados.</p>
        <button v-if="!approved" type="button" :disabled="disabled" class="no-print mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold hover:bg-slate-50" @click="openEditor(q.key)"><Plus class="size-4" aria-hidden="true" />Agregar {{ q.singular }}</button>
      </section>
    </div>

    <details ref="summaryPanel" class="strategic-summary rounded-2xl border border-slate-200 bg-white p-5" open>
      <summary class="cursor-pointer text-lg font-bold text-[#1E3A8A]">Resumen estratégico · Matriz cruzada</summary>
      <div class="strategies-grid mt-5 grid gap-5 sm:grid-cols-2"><div v-for="strategy in strategies" :key="strategy.key" class="strategy"><label :for="`arv-strategy-${strategy.key}`" class="text-sm font-bold">{{ strategy.key }} · {{ strategy.name }}</label><p :id="`arv-strategy-help-${strategy.key}`" class="mb-2 mt-1 text-xs text-slate-500">{{ strategy.help }}</p><textarea :id="`arv-strategy-${strategy.key}`" :value="documentData.strategies[strategy.key]" :aria-describedby="`arv-strategy-help-${strategy.key}`" :disabled="disabled" rows="4" maxlength="4000" class="no-print w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm" placeholder="Registra la estrategia y los hallazgos que relaciona…" @input="changeStrategy(strategy.key, $event.target.value)" /><p class="print-only whitespace-pre-wrap break-words text-sm">{{ documentData.strategies[strategy.key] || 'Sin estrategia registrada.' }}</p></div></div>
    </details>

    <footer class="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><button type="button" :disabled="!ready" class="rounded-lg px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50" @click="newDocument">Reiniciar / Nuevo FODA</button><div class="flex flex-wrap gap-3"><button type="button" :disabled="!ready || storageBlocked" class="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50" @click="printReport"><Printer class="size-4" aria-hidden="true" />Imprimir / Reporte SGC</button><button type="button" :disabled="!ready || storageBlocked" class="flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-orange-400" @click="persist(true)"><CheckCircle class="size-4" aria-hidden="true" />Guardar Estado</button></div></footer>

    <dialog ref="editorDialog" class="no-print w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50" aria-labelledby="arv-editor-title" @close="editor = null">
      <form class="space-y-4 p-6" @submit.prevent="saveItem"><h2 id="arv-editor-title" class="text-xl font-bold">{{ editor?.id ? 'Editar' : 'Agregar' }} {{ editor?.title }}</h2><label class="block text-sm font-medium">Descripción<textarea v-model="draft.description" required maxlength="2000" rows="5" autofocus class="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label><div class="grid grid-cols-2 gap-4"><label class="text-sm font-medium">Impacto<select v-model="draft.impact" class="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2"><option v-for="impact in impacts" :key="impact">{{ impact }}</option></select></label><label class="text-sm font-medium">Categoría<select v-model="draft.category" class="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2"><option v-for="category in categories" :key="category">{{ category }}</option></select></label></div><p class="text-xs text-slate-500">{{ draft.description.length }} / 2000 caracteres</p><div class="flex justify-end gap-3"><button type="button" class="rounded-lg border border-slate-300 px-4 py-2" @click="editorDialog.close()">Cancelar</button><button type="submit" :disabled="disabled || !draft.description.trim()" class="rounded-lg bg-[#F97316] px-4 py-2 font-semibold text-slate-950">Guardar hallazgo</button></div></form>
    </dialog>
    <dialog ref="confirmDialog" class="no-print w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/50" aria-labelledby="arv-confirm-title" aria-describedby="arv-confirm-message"><h2 id="arv-confirm-title" class="text-xl font-bold">{{ confirm?.title }}</h2><p id="arv-confirm-message" class="mt-3 text-sm leading-6 text-slate-600">{{ confirm?.message }}</p><div class="mt-6 flex justify-end gap-3"><button type="button" autofocus class="rounded-lg border border-slate-300 px-4 py-2" @click="confirmDialog.close()">Cancelar</button><button type="button" class="rounded-lg bg-[#1E3A8A] px-4 py-2 font-semibold text-white" @click="applyConfirmation">Confirmar</button></div></dialog>
    <div class="no-print pointer-events-none fixed bottom-6 right-6 z-50 max-w-sm" role="status" aria-live="polite" aria-atomic="true"><p v-if="toast" class="rounded-xl bg-slate-900 px-5 py-4 text-sm text-white shadow-lg">{{ toast }}</p></div>
    <p class="print-only mt-6 border-t border-slate-300 pt-3 text-xs">ARV Agentes de Cambio · {{ documentData.code }} · {{ documentData.version }} · Estado: {{ documentData.status }} · {{ documentData.date }}</p>
  </section>
</template>

<style scoped>
.arv-foda :is(button, input, textarea, select, summary):focus-visible { outline: 3px solid #f97316; outline-offset: 3px; }
.arv-foda :disabled { cursor: not-allowed; opacity: .65; }
.icon-button { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; border-radius: 8px; }
.print-only { display: none; }
@media print {
  @page { size: A4; margin: 12mm; }
  /* Keep only the component and its ancestors in the host shell's print layout. */
  :global(body *:not(:has(.arv-foda)):not(.arv-foda):not(.arv-foda *)) { display: none !important; }
  :global(body *:has(.arv-foda)) { display: block !important; position: static !important; overflow: visible !important; width: auto !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; transform: none !important; }
  .arv-foda { max-width: none; padding: 0; font-size: 10pt; color: #111827; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .foda-matrix { display: block; }
  .quadrant { margin-top: 5mm; padding: 4mm; }
  .finding, .strategy { break-inside: avoid; box-shadow: none; }
  .quadrant header, summary { break-after: avoid; }
  .strategic-summary > .strategies-grid { display: grid !important; grid-template-columns: 1fr 1fr; }
  .strategic-summary::details-content { content-visibility: visible !important; }
  h1 { font-size: 20pt; }
  h2 { font-size: 13pt; }
}
</style>
