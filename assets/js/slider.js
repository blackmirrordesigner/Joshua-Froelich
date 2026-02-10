/**
 * Latest Release slider: prev/next, dots, optional autoplay.
 * Pauses autoplay on hover/focus for accessibility.
 */
(function () {
  'use strict';

  var AUTOPLAY_MS = 5000;
  var autoplayTimer = null;

  function initSlider(container) {
    var track = container.querySelector('.cr-slider__track');
    var slides = container.querySelectorAll('[data-cr-slide]');
    var prevBtn = container.querySelector('[data-cr-prev]');
    var nextBtn = container.querySelector('[data-cr-next]');
    var dotsEl = container.querySelector('[data-cr-dots]');
    var count = slides.length;
    if (!count) return;

    var state = { index: 0 };

    function goTo(i) {
      state.index = (i + count) % count;
      updateTrack();
      updateDots();
      updateSlideAria();
    }

    function updateTrack() {
      var offset = -state.index * 100;
      track.style.transform = 'translateX(' + offset + '%)';
    }

    function updateSlideAria() {
      slides.forEach(function (slide, i) {
        slide.setAttribute('aria-hidden', i !== state.index);
      });
    }

    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var tab = document.createElement('button');
        tab.type = 'button';
        tab.role = 'tab';
        tab.ariaLabel = 'Slide ' + (i + 1);
        tab.ariaSelected = i === 0;
        tab.dataset.crDot = i;
        tab.addEventListener('click', function () {
          goTo(parseInt(this.dataset.crDot, 10));
          resetAutoplay();
        });
        dotsEl.appendChild(tab);
      }
    }

    function updateDots() {
      var tabs = dotsEl ? dotsEl.querySelectorAll('[role="tab"]') : [];
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', i === state.index);
      });
    }

    function resetAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      autoplayTimer = setInterval(function () {
        goTo(state.index + 1);
      }, AUTOPLAY_MS);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    prevBtn.addEventListener('click', function () {
      goTo(state.index - 1);
      resetAutoplay();
    });
    nextBtn.addEventListener('click', function () {
      goTo(state.index + 1);
      resetAutoplay();
    });

    container.addEventListener('mouseenter', stopAutoplay);
    container.addEventListener('focusin', stopAutoplay);
    container.addEventListener('mouseleave', function () {
      if (document.querySelector('[data-cr-slider]:hover') === container) return;
      resetAutoplay();
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.closest('[data-cr-slider]') !== container) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(state.index - 1);
        resetAutoplay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(state.index + 1);
        resetAutoplay();
      }
    });

    var touchStartX = 0;
    var touchEndX = 0;
    var SWIPE_THRESHOLD = 50;
    container.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches ? e.changedTouches[0].clientX : e.touches[0].clientX;
    }, { passive: true });
    container.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches ? e.changedTouches[0].clientX : e.touches[0].clientX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) goTo(state.index + 1);
        else goTo(state.index - 1);
        resetAutoplay();
      }
    }, { passive: true });

    slides.forEach(function (slide, i) {
      slide.setAttribute('aria-hidden', i !== 0);
    });
    buildDots();
    updateTrack();
    resetAutoplay();
  }

  document.querySelectorAll('[data-cr-slider]').forEach(initSlider);
})();
