(function (global) {
  'use strict';
  const base = new URL('.', document.currentScript.src), states = new WeakMap(), spans = new WeakMap();
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('../../css/table-columns.css?v=2.0.112', base); document.head.append(css);
  const el = (tag, text) => { const n = document.createElement(tag); if (text != null) n.textContent = text; return n; };
  const button = (text, action) => { const b = el('button', text); b.type = 'button'; b.className = 'btn-secondary'; b.addEventListener('click', action); return b; };
  function storageKey(key) {
    let user = {}; try { user = JSON.parse(localStorage.getItem('usuarioActivo') || '{}') || {}; } catch (_) {}
    return 'etColumns:v1:' + (user.id || user.usuario || user.nombre || 'local') + ':' + location.pathname + ':' + key;
  }
  function read(key) { try { return JSON.parse(localStorage.getItem(storageKey(key)) || 'null'); } catch (_) { return null; } }
  function write(key, value) { try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch (_) {} }
  function keys(labels) { const seen = new Map(); return labels.map(label => { const key = String(label).trim(); const count = seen.get(key) || 0; seen.set(key, count + 1); return key + ':' + count; }); }
  // Mapa lógico que conserva encabezados agrupados, rowspan y celdas de totales.
  function grid(section) {
    const occupied = [], result = [];
    Array.from(section?.rows || []).forEach((row, y) => {
      occupied[y] ||= []; let x = 0;
      Array.from(row.cells).forEach(cell => {
        while (occupied[y][x]) x++;
        let original = spans.get(cell);
        if (!original || cell.colSpan !== original.applied) { original = {size:cell.colSpan, applied:cell.colSpan}; spans.set(cell, original); }
        const indices = Array.from({length:original.size}, (_, i) => x + i);
        const height = cell.rowSpan || section.rows.length - y;
        for (let dy = 0; dy < height; dy++) { occupied[y + dy] ||= []; indices.forEach(i => { occupied[y + dy][i] = true; }); }
        result.push({cell, indices, original}); x += original.size;
      });
    });
    return result;
  }
  function schema(table) {
    const cells = grid(table.tHead), columns = [];
    cells.forEach(({cell, indices}) => indices.forEach(i => {
      const label = cell.textContent.trim() || cell.getAttribute('aria-label') || 'Columna ' + (i + 1);
      columns[i] = {label, cell};
    }));
    return columns;
  }
  function available(column) {
    // No volver a mostrar columnas ocultas por permisos u otras reglas del módulo.
    const own = column.cell.classList.contains('et-column-hidden');
    if (own) column.cell.classList.remove('et-column-hidden');
    const allowed = !column.cell.hidden && getComputedStyle(column.cell).display !== 'none';
    if (own) column.cell.classList.add('et-column-hidden');
    return allowed;
  }
  function apply(state) {
    const columns = schema(state.table); if (!columns.length) return;
    state.columns = columns; state.keys = keys(columns.map(c => c.label));
    state.allowed = columns.map(available);
    const pref = read('view:' + state.id) || {};
    state.visible = state.keys.map((key, i) => state.allowed[i] && pref[key] !== false);
    if (!state.visible.some(Boolean)) { const first = state.allowed.indexOf(true); if (first >= 0) state.visible[first] = true; }
    [state.table.tHead, ...state.table.tBodies, state.table.tFoot].filter(Boolean).forEach(section => {
      grid(section).forEach(({cell, indices, original}) => {
        const count = indices.filter(i => state.visible[i]).length;
        cell.classList.toggle('et-column-hidden', count === 0);
        const size = Math.max(1, count); if (cell.colSpan !== size) cell.colSpan = size; original.applied = size;
      });
    });
  }
  let activeDialog = false;
  function choose(labels, selected, title, extra) {
    if (activeDialog) return Promise.resolve(null);
    activeDialog = true;
    return new Promise(resolve => {
      const previous = document.activeElement, dialog = el('dialog'); dialog.className = 'et-columns-dialog';
      const heading = el('h2', title); heading.id = 'et-columns-title'; dialog.setAttribute('aria-labelledby', heading.id);
      const list = el('div'); list.className = 'et-columns-list';
      const boxes = labels.map((label, i) => { const wrap = el('label'), input = el('input'); input.type = 'checkbox'; input.checked = selected[i] !== false; wrap.append(input, document.createTextNode(label)); list.append(wrap); return input; });
      const tools = el('div'); tools.className = 'et-columns-actions';
      const confirm = button('Aplicar', () => finish(boxes.map(b => b.checked)));
      const update = () => { confirm.disabled = !boxes.some(b => b.checked); };
      const select = values => { boxes.forEach((b, i) => { b.checked = values[i]; }); update(); };
      tools.append(button('Todas', () => select(labels.map(() => true))), button('Ninguna', () => select(labels.map(() => false))));
      if (extra) tools.append(button('Usar columnas visibles', () => select(extra)));
      const footer = el('div'); footer.className = 'et-columns-actions'; footer.append(button('Cancelar', () => finish(null)), confirm);
      dialog.append(heading, el('p', 'Selecciona al menos una columna.'), tools, list, footer);
      list.addEventListener('change', update);
      function finish(value) { dialog.close(); dialog.remove(); activeDialog = false; previous?.focus(); resolve(value); }
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
      document.body.append(dialog); update(); dialog.showModal();
    });
  }
  async function selectExport(headers, id, table) {
    const labels = headers.map(String), names = keys(labels), saved = read('export:' + id) || {};
    const state = table && states.get(table); if (state) apply(state);
    const visible = state ? labels.map(label => { const index = state.columns.findIndex(c => c.label === label); return index < 0 || state.visible[index]; }) : null;
    const selected = await choose(labels, names.map(k => saved[k] !== false), 'Columnas para exportar', visible);
    if (!selected) return null;
    write('export:' + id, Object.fromEntries(names.map((k, i) => [k, selected[i]])));
    return selected.map((value, i) => value ? i : -1).filter(i => i >= 0);
  }
  function csvCell(value) {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  async function exportCSV(name, headers, rows, options = {}) {
    const indices = await selectExport(headers, options.id || name.replace(/\d{4}-\d{2}-\d{2}/g, 'fecha'), options.table);
    if (!indices) return false;
    const data = [...(options.preamble || []), indices.map(i => headers[i]), ...rows.map(row => indices.map(i => row[i]))];
    const blob = new Blob(['\ufeff' + data.map(row => row.map(csvCell).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = name.endsWith('.csv') ? name : name + '.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return true;
  }
  function cellValue(cell) {
    const inputs = Array.from(cell.querySelectorAll('input:not([type=hidden]), select, textarea'));
    if (inputs.length) return inputs.map(input => input.type === 'checkbox' ? (input.checked ? 'Sí' : 'No') : input.tagName === 'SELECT' ? input.selectedOptions[0]?.textContent || '' : input.value).join(' · ');
    const copy = cell.cloneNode(true);
    copy.querySelectorAll('.et-column-toolbar, button, script, style, [hidden]').forEach(n => n.remove());
    return copy.textContent.trim();
  }
  function exportTable(state) {
    apply(state);
    const indices = state.columns.map((c, i) => state.allowed[i] && !/^(acciones?|seleccionar|selección)$/i.test(c.label) ? i : -1).filter(i => i >= 0);
    const data = [];
    Array.from(state.table.tBodies).forEach(body => {
      const values = new Map();
      grid(body).forEach(({cell, indices:positions}) => {
        const start = Array.from(body.rows).indexOf(cell.parentElement), count = cell.rowSpan || body.rows.length-start;
        for (let offset=0; offset<count && start+offset<body.rows.length; offset++) {
          const row=body.rows[start+offset]; if (!values.has(row)) values.set(row, []);
          positions.forEach(i => { values.get(row)[i] = cellValue(cell); });
        }
      });
      values.forEach((row, tr) => {
        if (tr.hidden || tr.dataset.etLoading || tr.dataset.etEmpty || tr.dataset.etGenerated || tr.classList.contains('empty-state')) return;
        const paged = tr.classList.contains('et-page-hidden'); if (paged) tr.classList.remove('et-page-hidden');
        const shown = getComputedStyle(tr).display !== 'none'; if (paged) tr.classList.add('et-page-hidden');
        if (shown && !(tr.cells.length === 1 && state.columns.length > 1)) data.push(indices.map(i => row[i] || ''));
      });
    });
    return exportCSV('tabla-' + state.id, indices.map(i => state.columns[i].label), data, {id:'table:' + state.id, table:state.table});
  }
  function scan() {
    const occurrences = new Map();
    document.querySelectorAll('table').forEach(table => {
      if (!table.tHead || !table.tBodies.length || !schema(table).length || table.closest('[data-column-controls="off"]')) return;
      const signature = (table.closest('.panel, .card, section')?.querySelector('h2, h3')?.textContent || '') + '|' + schema(table).map(c=>c.label).join('|');
      let hash=2166136261; for (const char of signature) hash=Math.imul(hash ^ char.charCodeAt(0),16777619);
      const occurrence=occurrences.get(signature)||0; occurrences.set(signature,occurrence+1);
      let state = states.get(table);
      if (!state) {
        state = {table, id:table.id || table.tBodies[0].id || 'tabla-' + (hash>>>0).toString(16) + '-' + occurrence}; states.set(table, state);
        const toolbar = el('div'); toolbar.className = 'et-column-toolbar';
        toolbar.append(button('Columnas', async () => {
          apply(state); const indices = state.columns.map((_, i) => i).filter(i => state.allowed[i]);
          const result = await choose(indices.map(i => state.columns[i].label), indices.map(i => state.visible[i]), 'Columnas de la tabla');
          if (!result) return; const pref = read('view:' + state.id) || {}; indices.forEach((i, j) => { pref[state.keys[i]] = result[j]; }); write('view:' + state.id, pref); apply(state);
        }), button('Exportar tabla cargada', () => exportTable(state)));
        toolbar.lastChild.title = 'Exporta las filas cargadas en esta tabla. Para exportar todos los registros filtrados, usa el exportador del módulo si está disponible.';
        table.before(toolbar);
      }
      apply(state);
    });
  }
  global.ETTableColumns = {scan, selectExport, exportCSV};
  function start() {
    scan(); let pending = false;
    new MutationObserver(mutations => {
      if (!mutations.some(m => m.target.closest?.('table') || Array.from(m.addedNodes).some(n => n.nodeType === 1 && (n.matches('table') || n.querySelector('table'))))) return;
      if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; scan(); });
    }).observe(document.body, {childList:true, subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
