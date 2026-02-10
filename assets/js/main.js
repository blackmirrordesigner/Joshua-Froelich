// Cyrus Reigns Records – theme (dark default), smooth scroll, scroll-in animation, navbar scroll, page load

(function () {
  'use strict';

  var STORAGE_KEY = 'cyrus-reigns-theme';
  var themeToggle = document.getElementById('theme-toggle');

  // ----- Smooth first load: remove loading state and hide skeleton -----
  function onPageReady() {
    document.body.classList.remove('cr-page-loading');
    document.body.classList.add('cr-ready');
    var skeleton = document.getElementById('cr-skeleton-loader');
    if (skeleton) {
      skeleton.classList.add('cr-skeleton-loader--done');
      setTimeout(function () {
        skeleton.remove();
      }, 500);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageReady);
  } else {
    onPageReady();
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode || '');
    try {
      if (mode) localStorage.setItem(STORAGE_KEY, mode);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    updateToggleLabel();
  }

  function updateToggleLabel() {
    if (!themeToggle) return;
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    themeToggle.classList.remove('cr-theme-toggle--light', 'cr-theme-toggle--dark');
    themeToggle.classList.add(isDark ? 'cr-theme-toggle--dark' : 'cr-theme-toggle--light');
    themeToggle.setAttribute('aria-checked', isDark ? 'false' : 'true');
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored === 'light') setTheme('light');
    else setTheme(''); // dark is default (no attribute or empty)
    updateToggleLabel();
  }

  if (themeToggle) {
    function toggleTheme() {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      setTheme(isLight ? '' : 'light');
    }
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  initTheme();

  // Disable click on current/active nav item (no refresh, no redundant navigation)
  document.querySelectorAll('.navbar-nav .nav-link.active').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
    });
  });

  // Smooth scroll for same-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href');
    if (id === '#') return;
    var target = document.querySelector(id);
    if (target) {
      a.addEventListener('click', function (e) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  // Scroll-in animation: add .cr-visible when element enters viewport
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    var animated = document.querySelectorAll('.cr-animate-on-scroll');
    if (animated.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('cr-visible');
            }
          });
        },
        { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
      );
      animated.forEach(function (el) { observer.observe(el); });
    }
  }

  // Parallax: releases section background moves slower on scroll
  var parallaxBg = document.querySelector('.cr-releases-parallax-bg');
  if (parallaxBg && !reduceMotion) {
    function onParallaxScroll() {
      var section = document.getElementById('latest-release');
      if (!section) return;
      var rect = section.getBoundingClientRect();
      var h = window.innerHeight;
      var sectionH = rect.height;
      if (rect.bottom < 0 || rect.top > h) return;
      /* progress 0 = section top at viewport top, 1 = section bottom at viewport bottom */
      var progress = (h - rect.top) / (h + sectionH);
      progress = Math.max(0, Math.min(1, progress));
      /* same pronounced parallax as footer: background moves slower (0.4 * viewport) */
      var offsetPx = -progress * 0.4 * h;
      parallaxBg.style.backgroundPosition = 'center ' + offsetPx + 'px';
    }
    window.addEventListener('scroll', onParallaxScroll, { passive: true });
    onParallaxScroll();
  }
  // About page: artist bg parallax
  var aboutBgs = document.querySelectorAll('.cr-about-artist__bg');
  if (aboutBgs.length && !reduceMotion) {
    function onAboutParallaxScroll() {
      var h = window.innerHeight;
      aboutBgs.forEach(function (bg) {
        var section = bg.closest('.cr-about-artist');
        if (!section) return;
        var rect = section.getBoundingClientRect();
        var sectionH = rect.height;
        if (rect.bottom < 0 || rect.top > h) return;
        var progress = (h - rect.top) / (h + sectionH);
        progress = Math.max(0, Math.min(1, progress));
        var offsetPx = -progress * 0.35 * h;
        bg.style.backgroundPosition = 'center ' + offsetPx + 'px';
      });
    }
    window.addEventListener('scroll', onAboutParallaxScroll, { passive: true });
    onAboutParallaxScroll();
  }

  // Footer: parallax background (moves slower on scroll)
  var footerBg = document.querySelector('.cr-footer__bg');
  if (footerBg && !reduceMotion) {
    function onFooterParallaxScroll() {
      var footer = footerBg.closest('footer');
      if (!footer) return;
      var rect = footer.getBoundingClientRect();
      var h = window.innerHeight;
      var footerH = rect.height;
      if (rect.bottom < 0 || rect.top > h) return;
      var progress = (h - rect.top) / (h + footerH);
      progress = Math.max(0, Math.min(1, progress));
      var offsetPx = -progress * 0.4 * h;
      footerBg.style.backgroundPosition = 'center ' + offsetPx + 'px';
    }
    window.addEventListener('scroll', onFooterParallaxScroll, { passive: true });
    onFooterParallaxScroll();
  }

  // Navbar: add .scrolled when page is scrolled (optional, for solid background on scroll)
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    function onScroll() {
      if (window.scrollY > 20) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Footer: current year
  var footerYear = document.getElementById('cr-footer-year');
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // Footer newsletter: prevent default, show thank you (replace action with your backend later)
  var newsletterForm = document.getElementById('cr-footer-newsletter');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = newsletterForm.querySelector('.cr-footer__newsletter-input');
      var btn = newsletterForm.querySelector('.cr-footer__newsletter-btn');
      var hint = newsletterForm.querySelector('.cr-footer__newsletter-hint');
      if (input && btn && hint) {
        btn.disabled = true;
        btn.textContent = 'Subscribed!';
        hint.textContent = 'Thanks for subscribing. We\'ll be in touch.';
        hint.classList.add('text-success');
      }
    });
  }

  // Hero typewriter: type phrase → blink cursor twice → delete → next phrase (one line)
  var typewriterEl = document.getElementById('cr-hero-typewriter');
  if (typewriterEl && !reduceMotion) {
    var typewriterText = typewriterEl.querySelector('.cr-hero-typewriter__text');
    var typewriterCursor = typewriterEl.querySelector('.cr-hero-typewriter__cursor');
    var phrases = [
      'DARKNESS TREMBLES',
      'HIS REIGN. OUR ROAR.',
      'NO OTHER KING',
      'LIGHT CRUSHES DARKNESS',
      'WHERE THE LION ROARS',
      'CHAINS BREAK. GLORY FALLS.',
      'WE SING. HE REIGNS.'
    ];
    var typeSpeed = 85;
    var deleteSpeed = 45;
    var pauseAfterType = 600;
    var blinkDuration = 550;
    var phraseIndex = 0;

    function blinkTwice(callback) {
      if (!typewriterCursor) { callback(); return; }
      typewriterCursor.classList.add('cr-hero-typewriter__cursor--off');
      setTimeout(function () {
        typewriterCursor.classList.remove('cr-hero-typewriter__cursor--off');
        setTimeout(function () {
          typewriterCursor.classList.add('cr-hero-typewriter__cursor--off');
          setTimeout(function () {
            typewriterCursor.classList.remove('cr-hero-typewriter__cursor--off');
            callback();
          }, blinkDuration);
        }, blinkDuration);
      }, blinkDuration);
    }

    function typeChar(phrase, i, done) {
      if (i >= phrase.length) {
        setTimeout(function () { blinkTwice(done); }, pauseAfterType);
        return;
      }
      if (typewriterText) typewriterText.textContent += phrase[i];
      setTimeout(function () { typeChar(phrase, i + 1, done); }, typeSpeed);
    }

    function deleteChar(len, done) {
      if (len <= 0) {
        setTimeout(done, deleteSpeed);
        return;
      }
      if (typewriterText) typewriterText.textContent = typewriterText.textContent.slice(0, -1);
      setTimeout(function () { deleteChar(len - 1, done); }, deleteSpeed);
    }

    function runCycle() {
      var phrase = phrases[phraseIndex];
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typeChar(phrase, 0, function () {
        deleteChar(phrase.length, function () {
          runCycle();
        });
      });
    }

    runCycle();
  } else if (typewriterEl) {
    typewriterEl.classList.add('cr-hero-typewriter--static');
    var fallbackText = typewriterEl.querySelector('.cr-hero-typewriter__text');
    if (fallbackText) fallbackText.textContent = 'CYRUS REIGNS RECORDS';
  }
})();
