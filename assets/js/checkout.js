/**
 * Checkout: order summary from cart (localStorage), editable quantity/size, shipping, totals.
 */
(function () {
  'use strict';

  var STORAGE_KEY_ORDERS = 'cr_orders';
  var TAX_RATES = {
    'US': 0.00,  // Configurable in admin panel
    'CA': 0.00,
    'OTHER': 0.00
  };

  function generateOrderId() {
    var timestamp = Date.now();
    var random = Math.floor(Math.random() * 10000);
    return 'CRR-' + timestamp + '-' + random;
  }

  function calculateTax(subtotal, country) {
    var rate = TAX_RATES[country] || 0;
    return subtotal * rate;
  }

  function saveOrder(orderData) {
    try {
      var orders = JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS) || '[]');
      orderData.id = generateOrderId();
      orderData.createdAt = new Date().toISOString();
      orderData.status = 'Pending';
      orderData.paymentStatus = 'Paid';
      orderData.trackingNumber = '';
      orderData.carrier = '';
      orderData.notes = '';
      orderData.customerNotes = '';
      orders.push(orderData);
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      return orderData;
    } catch (e) {
      console.error('Failed to save order:', e);
      return null;
    }
  }

  function getCart() {
    if (window.crCart && typeof window.crCart.getCart === 'function') {
      return window.crCart.getCart();
    }
    try {
      var raw = localStorage.getItem('cr_cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    if (window.crCart && typeof window.crCart.setCart === 'function') {
      window.crCart.setCart(items);
      return;
    }
    localStorage.setItem('cr_cart', JSON.stringify(items));
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

  function getShippingCost() {
    var radio = document.querySelector('input[name="shipping"]:checked');
    return radio ? parseFloat(radio.dataset.cost || 0, 10) : 5.99;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var PRODUCTS = window.crCart && window.crCart.PRODUCTS ? window.crCart.PRODUCTS : { tee: { image: 'assets/images/merch/01-thirt_01.jpg' }, cd: { image: 'assets/images/merch/02-cd.jpg' }, 'ep-digital': { image: 'assets/releases/01-ep_cover.png' } };
  var TEE_SIZES_CHECKOUT = window.crCart && window.crCart.TEE_SIZES ? window.crCart.TEE_SIZES : ['S', 'M', 'L', 'XL'];

  function renderOrderSummary() {
    var items = getCart();
    var container = document.getElementById('order-items');
    var subtotalEl = document.getElementById('order-subtotal');
    var shippingEl = document.getElementById('order-shipping');
    var totalEl = document.getElementById('order-total');
    if (!container || !subtotalEl) return;

    if (items.length === 0) {
      container.innerHTML = '<p class="cr-cart-drawer__empty text-muted small mb-0">Your cart is empty.</p>';
      if (shippingEl) shippingEl.textContent = '$5.99';
      if (totalEl) totalEl.textContent = '$5.99';
      subtotalEl.textContent = '$0.00';
      return;
    }

    var subtotal = 0;
    container.innerHTML = items.map(function (item, index) {
      var lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      var isTicket = (item.id + '').indexOf('tour-') === 0;
      var thumbHtml = (isTicket && (item.date || item.time))
        ? '<div class="cr-cart-drawer__item-thumb cr-cart-drawer__item-thumb--dt"><span class="cr-cart-drawer__item-date">' + escapeHtml(item.date || '') + '</span><span class="cr-cart-drawer__item-time">' + escapeHtml(item.time || '') + '</span></div>'
        : (function () { var img = (PRODUCTS[item.id] && PRODUCTS[item.id].image) ? PRODUCTS[item.id].image : 'assets/releases/01-ep_cover.png'; return '<div class="cr-cart-drawer__item-thumb"><img src="' + escapeHtml(img) + '" alt=""></div>'; })();
      var sizeHtml = item.id === 'tee'
        ? '<label class="small me-1">Size</label><select class="cr-cart-drawer__size form-select form-select-sm" data-index="' + index + '">' +
            TEE_SIZES_CHECKOUT.map(function (s) { return '<option value="' + s + '"' + (item.size === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
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

    var shipping = getShippingCost();
    var total = subtotal + shipping;
    subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (shippingEl) shippingEl.textContent = '$' + shipping.toFixed(2);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

    bindOrderSummaryEvents(container);
  }

  function bindOrderSummaryEvents(container) {
    if (!container) return;
    container.querySelectorAll('.cr-cart-drawer__remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(this.dataset.index, 10);
        removeItem(i);
        renderOrderSummary();
        if (window.crCartUpdate) window.crCartUpdate();
      });
    });
    container.querySelectorAll('.cr-cart-qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(this.dataset.index, 10);
        var delta = parseInt(this.dataset.delta, 10);
        var items = getCart();
        if (items[i]) {
          items[i].quantity = Math.max(1, items[i].quantity + delta);
          setCart(items);
          renderOrderSummary();
          if (window.crCartUpdate) window.crCartUpdate();
        }
      });
    });
    container.querySelectorAll('.cr-cart-qty-input').forEach(function (input) {
      input.addEventListener('change', function () {
        var i = parseInt(this.dataset.index, 10);
        var val = parseInt(this.value, 10);
        if (val >= 1) updateItem(i, { quantity: val });
        renderOrderSummary();
        if (window.crCartUpdate) window.crCartUpdate();
      });
    });
    container.querySelectorAll('.cr-cart-drawer__size').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var i = parseInt(this.dataset.index, 10);
        updateItem(i, { size: this.value });
      });
    });
  }

  function initShippingListeners() {
    document.querySelectorAll('input[name="shipping"]').forEach(function (radio) {
      radio.addEventListener('change', renderOrderSummary);
    });
  }

  function initCheckoutButton() {
    // Handle PayPal placeholder click
    var paypalPlaceholder = document.querySelector('.cr-paypal-placeholder');
    if (paypalPlaceholder) {
      paypalPlaceholder.style.cursor = 'pointer';
      paypalPlaceholder.addEventListener('click', function () {
        processOrder();
      });
    }
  }

  function processOrder() {
    var form = document.getElementById('checkout-form');
    if (!form) return;

    // Basic validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Gather form data
    var formData = {
      fullname: document.getElementById('fullname').value,
      country: document.getElementById('country').value,
      address1: document.getElementById('address1').value,
      address2: document.getElementById('address2').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      zip: document.getElementById('zip').value
    };

    // Get shipping method
    var selectedShipping = document.querySelector('input[name="shipping"]:checked');
    var shippingCost = parseFloat(selectedShipping.dataset.cost || 5.99);
    var shippingMethod = selectedShipping.value;

    // Calculate totals
    var items = getCart();
    var subtotal = items.reduce(function (sum, item) {
      return sum + (item.price * item.quantity);
    }, 0);
    var tax = calculateTax(subtotal, formData.country);
    var total = subtotal + shippingCost + tax;

    // Create order object
    var order = {
      customer: formData,
      items: items,
      subtotal: subtotal,
      shipping: {
        method: shippingMethod,
        cost: shippingCost
      },
      tax: tax,
      total: total
    };

    // Save order
    var savedOrder = saveOrder(order);
    
    if (savedOrder) {
      // Clear cart
      setCart([]);
      if (window.crCartUpdate) window.crCartUpdate();
      
      // Show success message
      alert('Order placed successfully!\n\nOrder ID: ' + savedOrder.id + '\n\nThank you for your order!\n\n(This is a demo. In production, PayPal payment would be processed here.)');
      
      // Redirect to merch page
      window.location.href = 'merch.html';
    } else {
      alert('Failed to save order. Please try again.');
    }
  }

  var cart = getCart();
  if (cart.length === 0) {
    // Don't redirect, just show empty state
  }
  renderOrderSummary();
  initShippingListeners();
  initCheckoutButton();
})();
