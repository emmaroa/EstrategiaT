(function () {
  'use strict';
  const barra = document.querySelector('.peticiones-filters');
  if (!barra) return;
  const controles = Array.from(barra.querySelectorAll('input, select'));
  const adicionales = document.getElementById('filtrosAdicionalesPeticiones');
  const alternar = document.getElementById('btnMasFiltrosPeticiones');
  const limpiar = document.getElementById('btnLimpiarFiltrosPeticiones');
  const estado = document.getElementById('filtroEstatus');
  const rapidos = [['btnFiltroPendientes', 'Pendiente'], ['btnFiltroRevisado', 'Revisado por almacen'], ['btnFiltroCotizacion', 'En cotización']];
  function actualizar() {
    limpiar.disabled = !controles.some(control => control.value);
    const cantidad = Array.from(adicionales.querySelectorAll('select')).filter(control => control.value).length;
    document.getElementById('contadorFiltrosPeticiones').textContent = cantidad ? ' (' + cantidad + ')' : '';
    rapidos.forEach(([id, valor]) => document.getElementById(id).setAttribute('aria-pressed', String(estado.value === valor)));
  }
  alternar.addEventListener('click', function () {
    adicionales.hidden = !adicionales.hidden;
    alternar.setAttribute('aria-expanded', String(!adicionales.hidden));
  });
  limpiar.addEventListener('click', function () {
    controles.forEach(control => {
      control.value = '';
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    });
    actualizar();
    document.getElementById('buscarPeticion').focus();
  });
  barra.addEventListener('input', actualizar);
  barra.addEventListener('change', actualizar);
  barra.addEventListener('click', actualizar);
  actualizar();
})();
