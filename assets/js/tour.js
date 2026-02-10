/**
 * Tour page: tier dropdown — show the selected tier panel (GA = cheapest, default).
 * Big +/- quantity buttons: sync with input and clamp min/max.
 */
(function () {
  'use strict';

  function switchTierPanel(selectEl) {
    var row = selectEl.closest('[data-tour-row]');
    if (!row) return;
    var value = selectEl.value;
    var panels = row.querySelectorAll('.cr-tour-tier-panel');
    panels.forEach(function (panel) {
      if (panel.getAttribute('data-tier') === value) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });
  }

  function bindQtyButtons() {
    document.querySelectorAll('.cr-tour-qty-wrap').forEach(function (wrap) {
      var input = wrap.querySelector('.cr-ticket-qty');
      var minusBtn = wrap.querySelector('.cr-tour-qty-btn--minus');
      var plusBtn = wrap.querySelector('.cr-tour-qty-btn--plus');
      if (!input || !minusBtn || !plusBtn) return;

      function updateValue(delta) {
        var min = parseInt(input.getAttribute('min'), 10) || 1;
        var max = parseInt(input.getAttribute('max'), 10) || 10;
        var val = parseInt(input.value, 10) || min;
        val = Math.min(max, Math.max(min, val + delta));
        input.value = val;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      minusBtn.addEventListener('click', function () { updateValue(-1); });
      plusBtn.addEventListener('click', function () { updateValue(1); });
    });
  }

  function init() {
    document.querySelectorAll('[data-tour-select]').forEach(function (select) {
      switchTierPanel(select);
      select.addEventListener('change', function () {
        switchTierPanel(select);
      });
    });
    bindQtyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
