(function () {
  'use strict';
  let sequence = 0;
  function enhance(root) {
    root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(control => {
      if (control.labels?.length || control.hasAttribute('aria-labelledby')) return;
      if (!control.id) control.id = 'etAccessibleField' + (++sequence);
      const group = control.closest('.input-group, .form-group');
      const label = group?.querySelector('label:not([for])');
      if (label && !label.querySelector('input, select, textarea')) { label.htmlFor = control.id; return; }
      const name = control.getAttribute('aria-label') || control.getAttribute('title') || control.getAttribute('placeholder');
      if (name) {
        const associated = document.createElement('label');
        associated.htmlFor = control.id;
        associated.className = 'sr-only';
        associated.textContent = name;
        control.before(associated);
      }
    });
    root.querySelectorAll('button').forEach(button => {
      if (button.hasAttribute('aria-label') || button.hasAttribute('aria-labelledby')) return;
      const text = button.textContent.trim();
      if (button.title) button.setAttribute('aria-label', button.title);
      else if (/^[×✕x]$/.test(text) && button.closest('[role="dialog"], dialog')) button.setAttribute('aria-label', 'Cerrar diálogo');
    });
    root.querySelectorAll('a[target="_blank"]').forEach(link => { link.relList.add('noopener', 'noreferrer'); });
    root.querySelectorAll('.table-container, .table-wrapper, .table-responsive').forEach(region => {
      if (!region.hasAttribute('tabindex')) region.tabIndex = 0;
      if (!region.hasAttribute('role')) region.setAttribute('role', 'region');
      if (!region.hasAttribute('aria-label') && !region.hasAttribute('aria-labelledby')) {
        region.setAttribute('aria-label', region.querySelector('caption')?.textContent || 'Tabla de datos; desplazamiento horizontal con las flechas');
      }
    });
    root.querySelectorAll('[role="tablist"] .tab-btn[data-tab]').forEach(tab => {
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      if (!panel) return;
      tab.id = tab.id || 'etTab-' + tab.dataset.tab;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      const active = tab.classList.contains('active');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
    });
  }
  function init() {
    const main = document.querySelector('main') || document.querySelector('.login-card');
    if (main && !document.querySelector('.et-skip-link')) {
      if (!main.id) main.id = 'etMainContent';
      main.tabIndex = -1;
      const link = document.createElement('a'); link.className = 'et-skip-link';
      link.href = '#' + main.id; link.textContent = 'Saltar al contenido principal';
      document.body.prepend(link);
    }
    enhance(document);
    document.addEventListener('keydown', event => {
      const tab = event.target.closest('[role="tablist"] [role="tab"]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault(); tabs[next].focus(); tabs[next].click();
    });
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target.matches('.tab-btn')) { enhance(document); break; }
        if ([...record.addedNodes].some(node => node.nodeType === 1 && node.tagName !== 'LABEL')) { enhance(document); break; }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
