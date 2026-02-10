/**
 * Floating cart: localStorage cart, floating button, drawer, add-to-cart animation.
 * Each item: { id, name, price, quantity, size } (size for tee: S, M, L, XL).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cr_cart';
  var PRODUCTS = {
    cd: { name: 'First EP — CD', price: 12.00, image: 'assets/images/merch/02-cd.jpg' },
    'ep-digital': { name: 'First EP — Digital', price: 6.00, image: 'assets/releases/01-ep_cover.png' },
    tee: { name: 'Reigning Over Darkness — Tee', price: 24.00, image: 'assets/images/merch/01-thirt_01.jpg' }
  };
  var TEE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

  function getCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (typeof window.crCartUpdate === 'function') window.crCartUpdate();
  }

  function addItem(id, name, price, quantity, size, date, time) {
    var items = getCart();
    quantity = quantity || 1;
    size = size || (id === 'tee' ? 'M' : null);
    var existing = items.find(function (i) {
      return i.id === id && (i.size || null) === (size || null);
    });
    if (existing) {
      existing.quantity += quantity;
      if ((id + '').indexOf('tour-') === 0 && (date || time)) {
        if (date) existing.date = date;
        if (time) existing.time = time;
      }
    } else {
      var item = { id: id, name: name, price: price, quantity: quantity, size: size };
      if (date) item.date = date;
      if (time) item.time = time;
      items.push(item);
    }
    setCart(items);
    return items;
  }

  function updateItem(index, data) {
    var items = getCart();
    if (index < 0 || index >= items.length) return items;
    if (data.quantity !== undefined) items[index].quantity = Math.max(1, parseInt(data.quantity, 10));
    if (data.size !== undefined) items[index].size = data.size;
    setCart(items);
    return items;
  }

  function removeItem(index) {
    var items = getCart();
    items.splice(index, 1);
    setCart(items);
    return items;
  }

  function getCount() {
    return getCart().reduce(function (sum, i) { return sum + i.quantity; }, 0);
  }

  // Expose for checkout page and other pages (e.g. open drawer after add from music)
  window.crCart = {
    getCart: getCart,
    setCart: setCart,
    addItem: addItem,
    updateItem: updateItem,
    removeItem: removeItem,
    getCount: getCount,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    PRODUCTS: PRODUCTS,
    TEE_SIZES: TEE_SIZES
  };

  // --- Floating button + drawer (inject into DOM) ---
  function injectCartUI() {
    if (document.getElementById('cr-cart-root')) return;
    var root = document.createElement('div');
    root.id = 'cr-cart-root';
    root.innerHTML =
      '<button type="button" id="cr-cart-btn" class="cr-cart-btn" aria-label="Open cart">' +
      '<i class="fas fa-shopping-cart" aria-hidden="true"></i>' +
      '<span id="cr-cart-count" class="cr-cart-count">0</span>' +
      '</button>' +
      '<div id="cr-cart-drawer" class="cr-cart-drawer" aria-hidden="true">' +
      '<div class="cr-cart-drawer__backdrop" id="cr-cart-backdrop"></div>' +
      '<div class="cr-cart-drawer__panel">' +
      '<div class="cr-cart-drawer__header">' +
      '<h2 class="cr-cart-drawer__title">Cart</h2>' +
      '<button type="button" class="cr-cart-drawer__close" id="cr-cart-close" aria-label="Close cart">&times;</button>' +
      '</div>' +
      '<div id="cr-cart-drawer-body" class="cr-cart-drawer__body"></div>' +
      '<div class="cr-cart-drawer__footer">' +
      '<div class="cr-cart-drawer__subtotal d-flex justify-content-between mb-2"><span>Subtotal</span><span id="cr-cart-drawer-subtotal">$0.00</span></div>' +
      '<a href="checkout.html" id="cr-cart-checkout-btn" class="btn btn-primary w-100">Checkout</a>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div id="cr-cart-toast" class="cr-cart-toast" aria-live="polite"></div>';
    document.body.appendChild(root);
  }

  function renderDrawer() {
    var body = document.getElementById('cr-cart-drawer-body');
    var subtotalEl = document.getElementById('cr-cart-drawer-subtotal');
    var checkoutBtn = document.getElementById('cr-cart-checkout-btn');
    if (!body) return;
    var items = getCart();
    if (items.length === 0) {
      body.innerHTML = '<p class="cr-cart-drawer__empty text-muted small">Your cart is empty.</p>';
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      if (checkoutBtn) checkoutBtn.classList.add('disabled');
      return;
    }
    if (checkoutBtn) checkoutBtn.classList.remove('disabled');
    var subtotal = 0;
    body.innerHTML = items.map(function (item, index) {
      var lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      var isTicket = (item.id + '').indexOf('tour-') === 0;
      var thumbHtml = (isTicket && (item.date || item.time))
        ? '<div class="cr-cart-drawer__item-thumb cr-cart-drawer__item-thumb--dt"><span class="cr-cart-drawer__item-date">' + escapeHtml(item.date || '') + '</span><span class="cr-cart-drawer__item-time">' + escapeHtml(item.time || '') + '</span></div>'
        : (function () { var img = (PRODUCTS[item.id] && PRODUCTS[item.id].image) ? PRODUCTS[item.id].image : 'assets/releases/01-ep_cover.png'; return '<div class="cr-cart-drawer__item-thumb"><img src="' + escapeHtml(img) + '" alt=""></div>'; })();
      var sizeHtml = item.id === 'tee'
        ? '<label class="small me-1">Size</label><select class="cr-cart-drawer__size form-select form-select-sm" data-index="' + index + '">' +
        TEE_SIZES.map(function (s) { return '<option value="' + s + '"' + (item.size === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
        '</select>'
        : '';
      var itemClass = 'cr-cart-drawer__item' + (sizeHtml ? ' cr-cart-drawer__item--has-size' : '');
      return '<div class="' + itemClass + '" data-index="' + index + '">' +
        thumbHtml +
        '<div class="cr-cart-drawer__item-body">' +
        '<div class="cr-cart-drawer__item-head d-flex justify-content-between align-items-start">' +
        '<span class="cr-cart-drawer__item-name">' + escapeHtml(item.name) + '</span>' +
        '<button type="button" class="cr-cart-drawer__remove btn btn-sm" data-index="' + index + '" aria-label="Remove">×</button>' +
        '</div>' +
        (sizeHtml ? '<div class="cr-cart-drawer__item-size">' + sizeHtml + '</div>' : '') +
        '<div class="d-flex justify-content-between align-items-center">' +
        '<div class="cr-cart-drawer__qty">' +
        '<button type="button" class="cr-cart-qty-btn" data-index="' + index + '" data-delta="-1" aria-label="Decrease">−</button>' +
        '<input type="number" class="cr-cart-qty-input" min="1" value="' + item.quantity + '" data-index="' + index + '" aria-label="Quantity">' +
        '<button type="button" class="cr-cart-qty-btn" data-index="' + index + '" data-delta="1" aria-label="Increase">+</button>' +
        '</div>' +
        '<span class="cr-cart-drawer__item-total">$' + lineTotal.toFixed(2) + '</span>' +
        '</div>' +
        '</div>' +
        '</div>';
    }).join('');
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    bindDrawerEvents();
  }

  function bindDrawerEvents() {
    document.querySelectorAll('.cr-cart-drawer__remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(this.dataset.index, 10);
        removeItem(i);
        renderDrawer();
        updateFloatingButton();
      });
    });
    document.querySelectorAll('.cr-cart-qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(this.dataset.index, 10);
        var delta = parseInt(this.dataset.delta, 10);
        var items = getCart();
        if (items[i]) {
          items[i].quantity = Math.max(1, items[i].quantity + delta);
          setCart(items);
          renderDrawer();
          updateFloatingButton();
        }
      });
    });
    document.querySelectorAll('.cr-cart-qty-input').forEach(function (input) {
      input.addEventListener('change', function () {
        var i = parseInt(this.dataset.index, 10);
        var val = parseInt(this.value, 10);
        if (val >= 1) updateItem(i, { quantity: val });
        renderDrawer();
        updateFloatingButton();
      });
    });
    document.querySelectorAll('.cr-cart-drawer__size').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var i = parseInt(this.dataset.index, 10);
        updateItem(i, { size: this.value });
      });
    });
  }

  function updateFloatingButton() {
    var count = getCount();
    var el = document.getElementById('cr-cart-count');
    var btn = document.getElementById('cr-cart-btn');
    if (el) el.textContent = count;
    if (btn) {
      btn.classList.toggle('cr-cart-btn--empty', count === 0);
      btn.setAttribute('aria-label', count === 0 ? 'Cart is empty' : 'Open cart (' + count + ' items)');
    }
  }

  function openDrawer() {
    var drawer = document.getElementById('cr-cart-drawer');
    if (drawer) {
      drawer.classList.add('cr-cart-drawer--open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cr-cart-drawer-open');
    }
  }

  function closeDrawer() {
    var drawer = document.getElementById('cr-cart-drawer');
    if (drawer) {
      drawer.classList.remove('cr-cart-drawer--open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('cr-cart-drawer-open');
    }
  }

  function playAddAnimation() {
    var btn = document.getElementById('cr-cart-btn');
    if (btn) btn.classList.add('cr-cart-btn--bump');
    setTimeout(function () {
      if (btn) btn.classList.remove('cr-cart-btn--bump');
    }, 400);
    var toast = document.getElementById('cr-cart-toast');
    if (toast) {
      toast.textContent = 'Added to cart';
      toast.classList.add('cr-cart-toast--show');
      setTimeout(function () { toast.classList.remove('cr-cart-toast--show'); }, 2000);
    }
  }

  window.crCartUpdate = function () {
    updateFloatingButton();
    renderDrawer();
  };

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function bindAddToCart() {
    document.querySelectorAll('[data-cart-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = this.dataset.cartId;
        var name = this.dataset.cartName || PRODUCTS[id] && PRODUCTS[id].name;
        var price = parseFloat(this.dataset.cartPrice || 0, 10);
        if (!id || !name || !price) return;
        var size = null;
        var quantity = 1;
        var date, time;
        if (id === 'tee') {
          var wrap = btn.closest('.cr-merch-tee-actions');
          var sizeSelect = wrap ? wrap.querySelector('.cr-merch-tee-size') : document.getElementById('cr-merch-tee-size');
          size = sizeSelect ? sizeSelect.value : 'M';
        } else {
          var tier = btn.closest('.cr-tour-tier');
          var qtyInput = tier ? tier.querySelector('.cr-ticket-qty') : null;
          if (qtyInput) {
            var val = parseInt(qtyInput.value, 10);
            quantity = (val >= 1 && val <= 100) ? val : 1;
          }
          var row = btn.closest('[data-tour-row]');
          if (row) {
            var dateEl = row.querySelector('.cr-tour-date');
            var timeEl = row.querySelector('.cr-tour-time');
            date = dateEl ? dateEl.textContent.trim() : '';
            time = timeEl ? timeEl.textContent.trim() : '';
          }
        }
        addItem(id, name, price, quantity, size, date, time);
        updateFloatingButton();
        renderDrawer();
        playAddAnimation();
      });
    });
  }

  function init() {
    injectCartUI();
    updateFloatingButton();
    renderDrawer();
    bindAddToCart();
    document.getElementById('cr-cart-btn').addEventListener('click', function () {
      renderDrawer();
      openDrawer();
    });
    document.getElementById('cr-cart-close').addEventListener('click', closeDrawer);
    document.getElementById('cr-cart-backdrop').addEventListener('click', closeDrawer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
