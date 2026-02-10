// Cyrus Reigns Records – track page: reading progress, font size controls

(function () {
  'use strict';

  var FONT_STORAGE_KEY = 'cyrus-reigns-font-size';

  // ----- Reading progress bar -----
  var progressBar = document.getElementById('reading-progress-bar');
  var progressContainer = document.querySelector('.cr-reading-progress');

  if (progressBar && progressContainer) {
    function updateProgress() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var percent = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      progressBar.style.width = percent + '%';
      progressContainer.setAttribute('aria-valuenow', Math.round(percent));
    }

    window.addEventListener('scroll', function () {
      requestAnimationFrame(updateProgress);
    }, { passive: true });
    updateProgress();
  }

  // ----- Font size controls -----
  var fontButtons = document.querySelectorAll('.cr-font-controls button[data-font-size]');

  function setFontSize(size) {
    var value = size === 'default' ? '' : size;
    document.documentElement.setAttribute('data-font-size', value);
    try {
      if (value) localStorage.setItem(FONT_STORAGE_KEY, value);
      else localStorage.removeItem(FONT_STORAGE_KEY);
    } catch (e) {}
    fontButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-font-size') === size ? 'true' : 'false');
    });
  }

  function initFontSize() {
    try {
      var stored = localStorage.getItem(FONT_STORAGE_KEY);
      if (stored && (stored === 'small' || stored === 'large' || stored === 'x-large')) {
        setFontSize(stored);
      } else {
        setFontSize('default');
      }
    } catch (e) {
      setFontSize('default');
    }
  }

  fontButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var size = btn.getAttribute('data-font-size');
      if (size === 'default') setFontSize('default');
      else if (size === 'small') setFontSize('small');
      else if (size === 'large') setFontSize('large');
      else if (size === 'x-large') setFontSize('x-large');
    });
  });

  initFontSize();
})();
