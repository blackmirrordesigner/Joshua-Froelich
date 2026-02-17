/**
 * Checkout: order summary from cart (localStorage), editable quantity/size, shipping, totals.
 */
(function () {
  'use strict';

  var STORAGE_KEY_ORDERS = 'cr_orders';
  var TAX_RATES = {
    'US': 0.00,
    'CA': 0.00,
    'OTHER': 0.00
  };
  var ATOMONE_WALLET_ADDRESS = 'atone1r5dv24amcyvdxfcjjrw7m5ts324cavyu0fszgq';
  var VENMO_BUSINESS_HANDLE = '@cyrusreigns';
  var VENMO_BUSINESS_URL = 'https://www.venmo.com/u/cyrusreigns';
  var MIN_TX_HASH_LENGTH = 20;
  var PAYMENT_METHODS = {
    venmo: 'Venmo',
    bank_account: 'Bank Account',
    atom_one: 'Atom one'
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
      orderData.status = orderData.status || 'Pending';
      orderData.paymentMethod = orderData.paymentMethod || 'Venmo';
      orderData.paymentStatus = orderData.paymentStatus || 'Awaiting Venmo Confirmation';
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

  function toggleElementVisibility(elementId, isVisible) {
    var element = document.getElementById(elementId);
    if (!element) return;
    element.classList.toggle('d-none', !isVisible);
  }

  function getSelectedPaymentMethod() {
    var methodSelect = document.getElementById('payment-method');
    if (!methodSelect) return 'venmo';
    return methodSelect.value || 'venmo';
  }

  function setPaymentFieldRequirements(method) {
    var venmoHandle = document.getElementById('venmo-handle');
    var bankAccountHolder = document.getElementById('bank-account-holder');
    var bankTransferReference = document.getElementById('bank-transfer-reference');
    var atomoneSenderWallet = document.getElementById('atomone-sender-wallet');
    var atomoneTxHash = document.getElementById('atomone-tx-hash');
    var atomoneConfirm = document.getElementById('atomone-only-confirm');

    if (venmoHandle) venmoHandle.required = method === 'venmo';
    if (bankAccountHolder) bankAccountHolder.required = method === 'bank_account';
    if (bankTransferReference) bankTransferReference.required = method === 'bank_account';
    if (atomoneSenderWallet) atomoneSenderWallet.required = method === 'atom_one';
    if (atomoneTxHash) atomoneTxHash.required = method === 'atom_one';
    if (atomoneConfirm) atomoneConfirm.required = method === 'atom_one';
  }

  function updatePaymentMethodUI() {
    var method = getSelectedPaymentMethod();
    var submitButton = document.getElementById('checkout-submit-order');
    var paymentNote = document.getElementById('checkout-payment-note');

    toggleElementVisibility('payment-panel-venmo', method === 'venmo');
    toggleElementVisibility('payment-panel-bank-account', method === 'bank_account');
    toggleElementVisibility('payment-panel-atom-one', method === 'atom_one');
    setPaymentFieldRequirements(method);

    if (!submitButton || !paymentNote) return;

    if (method === 'venmo') {
      submitButton.textContent = 'Place Venmo order';
      paymentNote.innerHTML = '<i class="fas fa-lock me-1"></i>Pay to <a href="' + VENMO_BUSINESS_URL + '" target="_blank" rel="noopener noreferrer">' + VENMO_BUSINESS_HANDLE + '</a>. We store your Venmo username and optional reference with this order.';
      return;
    }

    if (method === 'bank_account') {
      submitButton.textContent = 'Place Bank Account order';
      paymentNote.innerHTML = '<i class="fas fa-lock me-1"></i>We store your account holder name and transfer reference with this order.';
      return;
    }

    submitButton.textContent = 'I sent Atom one - confirm order';
    paymentNote.innerHTML = '<i class="fas fa-lock me-1"></i>We only collect the sender wallet and tx hash to verify on-chain payment.';
  }

  function initPaymentMethodSelector() {
    var methodSelect = document.getElementById('payment-method');
    if (!methodSelect) return;
    methodSelect.addEventListener('change', updatePaymentMethodUI);
    updatePaymentMethodUI();
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

  function setCopyFeedback(message, isError) {
    var feedback = document.getElementById('atomone-copy-feedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('text-success', 'text-danger');
    if (!message) return;
    feedback.classList.add(isError ? 'text-danger' : 'text-success');
  }

  function copyAtomOneWallet() {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(ATOMONE_WALLET_ADDRESS).then(function () {
        setCopyFeedback('Wallet copied. Send Atom one (ATONE).', false);
      }).catch(function () {
        setCopyFeedback('Copy failed. Please copy the wallet manually.', true);
      });
      return;
    }

    var temp = document.createElement('textarea');
    temp.value = ATOMONE_WALLET_ADDRESS;
    temp.setAttribute('readonly', '');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();

    try {
      document.execCommand('copy');
      setCopyFeedback('Wallet copied. Send Atom one (ATONE).', false);
    } catch (e) {
      setCopyFeedback('Copy failed. Please copy the wallet manually.', true);
    }

    document.body.removeChild(temp);
  }

  function initPaymentActions() {
    var copyButton = document.getElementById('copy-atomone-wallet');
    if (copyButton) {
      copyButton.addEventListener('click', copyAtomOneWallet);
    }

    var form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        processOrder();
      });
    }

    var confirmButton = document.getElementById('checkout-submit-order');
    if (confirmButton) {
      confirmButton.addEventListener('click', processOrder);
    }
  }

  function processOrder() {
    var form = document.getElementById('checkout-form');
    if (!form) return;

    var paymentMethodKey = getSelectedPaymentMethod();
    var paymentMethodLabel = PAYMENT_METHODS[paymentMethodKey] || PAYMENT_METHODS.venmo;
    var paymentStatus = 'Pending Payment Confirmation';
    var payment = {};
    var paymentLineOne = '';
    var paymentLineTwo = '';

    if (paymentMethodKey === 'venmo') {
      var venmoHandle = (document.getElementById('venmo-handle').value || '').trim();
      var venmoReference = (document.getElementById('venmo-reference').value || '').trim();
      if (!venmoHandle) {
        alert('Please add your Venmo username.');
        return;
      }
      paymentStatus = 'Awaiting Venmo Confirmation';
      payment = {
        provider: 'Venmo',
        recipientHandle: VENMO_BUSINESS_HANDLE,
        recipientUrl: VENMO_BUSINESS_URL,
        senderHandle: venmoHandle,
        reference: venmoReference
      };
      paymentLineOne = 'Venmo username: ' + venmoHandle;
      paymentLineTwo = 'Pay to: ' + VENMO_BUSINESS_HANDLE;
      if (venmoReference) paymentLineTwo += ' | Reference: ' + venmoReference;
    }

    if (paymentMethodKey === 'bank_account') {
      var bankAccountHolder = (document.getElementById('bank-account-holder').value || '').trim();
      var bankTransferReference = (document.getElementById('bank-transfer-reference').value || '').trim();
      if (!bankAccountHolder) {
        alert('Please add the account holder name for your bank transfer.');
        return;
      }
      if (!bankTransferReference) {
        alert('Please add your bank transfer reference.');
        return;
      }
      paymentStatus = 'Awaiting Bank Transfer Confirmation';
      payment = {
        provider: 'Bank Account',
        accountHolder: bankAccountHolder,
        reference: bankTransferReference
      };
      paymentLineOne = 'Account holder: ' + bankAccountHolder;
      paymentLineTwo = 'Transfer reference: ' + bankTransferReference;
    }

    if (paymentMethodKey === 'atom_one') {
      var senderWallet = (document.getElementById('atomone-sender-wallet').value || '').trim();
      var txHash = (document.getElementById('atomone-tx-hash').value || '').trim();
      var atomoneConfirm = document.getElementById('atomone-only-confirm');
      var atomoneConfirmed = atomoneConfirm ? atomoneConfirm.checked : false;

      if (!senderWallet) {
        alert('Please add your sender wallet address.');
        return;
      }
      if (txHash.length < MIN_TX_HASH_LENGTH) {
        alert('Please add a valid Atom one transaction hash.');
        return;
      }
      if (!atomoneConfirmed) {
        alert('Please confirm that this order will be paid with Atom one.');
        return;
      }

      paymentStatus = 'Awaiting Atom one Confirmation';
      payment = {
        network: 'Atom one',
        recipientWallet: ATOMONE_WALLET_ADDRESS,
        senderWallet: senderWallet,
        txHash: txHash
      };
      paymentLineOne = 'Sender wallet: ' + senderWallet;
      paymentLineTwo = 'Tx hash: ' + txHash;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var formData = {
      fullname: (document.getElementById('fullname').value || '').trim(),
      country: (document.getElementById('country').value || '').trim(),
      address1: (document.getElementById('address1').value || '').trim(),
      address2: (document.getElementById('address2').value || '').trim(),
      city: (document.getElementById('city').value || '').trim(),
      state: (document.getElementById('state').value || '').trim(),
      zip: (document.getElementById('zip').value || '').trim()
    };

    var selectedShipping = document.querySelector('input[name="shipping"]:checked');
    if (!selectedShipping) {
      alert('Please select a shipping method.');
      return;
    }
    var shippingCost = parseFloat(selectedShipping.dataset.cost || 5.99);
    var shippingMethod = selectedShipping.value;

    var items = getCart();
    if (items.length === 0) {
      alert('Your cart is empty. Add at least one item before placing your order.');
      return;
    }
    var subtotal = items.reduce(function (sum, item) {
      return sum + (item.price * item.quantity);
    }, 0);
    var tax = calculateTax(subtotal, formData.country);
    var total = subtotal + shippingCost + tax;

    var order = {
      customer: formData,
      items: items,
      subtotal: subtotal,
      shipping: {
        method: shippingMethod,
        cost: shippingCost
      },
      tax: tax,
      total: total,
      paymentMethod: paymentMethodLabel,
      paymentStatus: paymentStatus,
      payment: payment
    };

    var savedOrder = saveOrder(order);

    if (savedOrder) {
      setCart([]);
      if (window.crCartUpdate) window.crCartUpdate();

      var successMessage = 'Order submitted successfully!\n\n' +
        'Order ID: ' + savedOrder.id + '\n' +
        'Payment method: ' + paymentMethodLabel;

      if (paymentLineOne) successMessage += '\n' + paymentLineOne;
      if (paymentLineTwo) successMessage += '\n' + paymentLineTwo;

      alert(successMessage);
      window.location.href = 'merch.html';
    } else {
      alert('Failed to save order. Please try again.');
    }
  }

  var cart = getCart();
  if (cart.length === 0) {
    // Keep checkout page visible and show empty state in summary.
  }

  renderOrderSummary();
  initShippingListeners();
  initPaymentMethodSelector();
  initPaymentActions();
})();
