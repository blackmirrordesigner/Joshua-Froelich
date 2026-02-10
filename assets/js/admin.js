/**
 * Admin Panel: Secure order management system
 * Password: CyrusReigns2024!Secure#Admin
 */
(function () {
    'use strict';

    // Strong password hash (SHA-256 of "CyrusReigns2024!Secure#Admin")
    var PASSWORD_HASH = 'b4b53e65e441727d4a930c2b5891c437b75dedf77e136af050481d1a49ce53a5';
    var SESSION_KEY = 'cr_admin_session';
    var ORDERS_KEY = 'cr_orders';
    var TAX_SETTINGS_KEY = 'cr_tax_settings';

    var currentOrder = null;
    var orderModal = null;

    // Simple SHA-256 implementation (for demo purposes)
    async function hashPassword(password) {
        var encoder = new TextEncoder();
        var data = encoder.encode(password);
        var hashBuffer = await crypto.subtle.digest('SHA-256', data);
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    // Check if user is authenticated
    function isAuthenticated() {
        try {
            var session = sessionStorage.getItem(SESSION_KEY);
            return session === 'authenticated';
        } catch (e) {
            return false;
        }
    }

    // Authenticate user
    async function authenticate(password) {
        var hash = await hashPassword(password);
        if (hash === PASSWORD_HASH) {
            sessionStorage.setItem(SESSION_KEY, 'authenticated');
            return true;
        }
        return false;
    }

    // Logout
    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        showLogin();
    }

    // Show/hide panels
    function showLogin() {
        document.getElementById('admin-login').classList.remove('d-none');
        document.getElementById('admin-dashboard').classList.add('d-none');
    }

    function showDashboard() {
        document.getElementById('admin-login').classList.add('d-none');
        document.getElementById('admin-dashboard').classList.remove('d-none');
        loadDashboard();
    }

    // Get all orders
    function getOrders() {
        try {
            var orders = localStorage.getItem(ORDERS_KEY);
            return orders ? JSON.parse(orders) : [];
        } catch (e) {
            console.error('Failed to load orders:', e);
            return [];
        }
    }

    // Save orders
    function saveOrders(orders) {
        try {
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
            return true;
        } catch (e) {
            console.error('Failed to save orders:', e);
            alert('Failed to save changes');
            return false;
        }
    }

    // Update order
    function updateOrder(orderId, updates) {
        var orders = getOrders();
        var orderIndex = orders.findIndex(function (o) { return o.id === orderId; });
        if (orderIndex >= 0) {
            Object.assign(orders[orderIndex], updates);
            saveOrders(orders);
            return true;
        }
        return false;
    }

    // Load dashboard statistics
    function loadDashboard() {
        var orders = getOrders();
        var totalOrders = orders.length;
        var pending = orders.filter(function (o) { return o.status === 'Pending' || o.status === 'Processing'; }).length;
        var shipped = orders.filter(function (o) { return o.status === 'Shipped' || o.status === 'Delivered'; }).length;
        var revenue = orders.reduce(function (sum, o) { return sum + (o.total || 0); }, 0);

        document.getElementById('stat-total-orders').textContent = totalOrders;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-shipped').textContent = shipped;
        document.getElementById('stat-revenue').textContent = '$' + revenue.toFixed(2);

        renderOrders();
        loadTaxSettings();
    }

    // Render orders list
    function renderOrders(filterStatus, searchQuery) {
        var orders = getOrders();

        // Apply filters
        if (filterStatus) {
            orders = orders.filter(function (o) { return o.status === filterStatus; });
        }
        if (searchQuery) {
            var query = searchQuery.toLowerCase();
            orders = orders.filter(function (o) {
                return (o.id && o.id.toLowerCase().includes(query)) ||
                    (o.customer && o.customer.fullname && o.customer.fullname.toLowerCase().includes(query)) ||
                    (o.customer && o.customer.email && o.customer.email.toLowerCase().includes(query));
            });
        }

        // Sort by date (newest first)
        orders.sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        var container = document.getElementById('orders-list');
        if (orders.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-5"><p>No orders found</p></div>';
            return;
        }

        container.innerHTML = orders.map(function (order) {
            var date = new Date(order.createdAt);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var itemCount = order.items ? order.items.reduce(function (sum, item) { return sum + item.quantity; }, 0) : 0;
            var statusClass = 'status-' + (order.status || 'pending').toLowerCase();

            return '<div class="order-card">' +
                '<div class="row align-items-center">' +
                '<div class="col-md-3">' +
                '<div class="fw-bold">' + escapeHtml(order.id) + '</div>' +
                '<div class="small text-muted">' + dateStr + '</div>' +
                '</div>' +
                '<div class="col-md-3">' +
                '<div>' + escapeHtml(order.customer.fullname) + '</div>' +
                '<div class="small text-muted">' + escapeHtml(order.customer.city) + ', ' + escapeHtml(order.customer.state || order.customer.country) + '</div>' +
                '</div>' +
                '<div class="col-md-2">' +
                '<div>' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</div>' +
                '<div class="fw-bold">$' + (order.total || 0).toFixed(2) + '</div>' +
                '</div>' +
                '<div class="col-md-2">' +
                '<span class="order-status ' + statusClass + '">' + escapeHtml(order.status || 'Pending') + '</span>' +
                '<div class="small text-muted mt-1"><span class="badge badge-paid">' + escapeHtml(order.paymentStatus || 'Paid') + '</span></div>' +
                '</div>' +
                '<div class="col-md-2 text-end">' +
                '<button class="btn btn-sm btn-outline-primary" onclick="window.crAdmin.viewOrder(\'' + order.id + '\')">View</button>' +
                '</div>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    // View order details
    function viewOrder(orderId) {
        var orders = getOrders();
        var order = orders.find(function (o) { return o.id === orderId; });
        if (!order) return;

        currentOrder = order;
        var content = '<div class="order-detail">' +
            '<div class="row mb-4">' +
            '<div class="col-md-6">' +
            '<h6 class="text-muted mb-2">Customer Information</h6>' +
            '<p class="mb-1"><strong>' + escapeHtml(order.customer.fullname) + '</strong></p>' +
            '<p class="mb-1">' + escapeHtml(order.customer.address1) + '</p>' +
            (order.customer.address2 ? '<p class="mb-1">' + escapeHtml(order.customer.address2) + '</p>' : '') +
            '<p class="mb-1">' + escapeHtml(order.customer.city) + ', ' + escapeHtml(order.customer.state || '') + ' ' + escapeHtml(order.customer.zip) + '</p>' +
            '<p class="mb-1">' + escapeHtml(order.customer.country) + '</p>' +
            '</div>' +
            '<div class="col-md-6">' +
            '<h6 class="text-muted mb-2">Order Information</h6>' +
            '<p class="mb-1"><strong>Order ID:</strong> ' + escapeHtml(order.id) + '</p>' +
            '<p class="mb-1"><strong>Date:</strong> ' + new Date(order.createdAt).toLocaleString() + '</p>' +
            '<p class="mb-1"><strong>Status:</strong> ' +
            '<select class="form-select form-select-sm d-inline-block w-auto" id="order-status-select">' +
            '<option value="Pending"' + (order.status === 'Pending' ? ' selected' : '') + '>Pending</option>' +
            '<option value="Processing"' + (order.status === 'Processing' ? ' selected' : '') + '>Processing</option>' +
            '<option value="Shipped"' + (order.status === 'Shipped' ? ' selected' : '') + '>Shipped</option>' +
            '<option value="Delivered"' + (order.status === 'Delivered' ? ' selected' : '') + '>Delivered</option>' +
            '</select>' +
            '</p>' +
            '<p class="mb-1"><strong>Payment:</strong> <span class="badge badge-paid">' + escapeHtml(order.paymentStatus || 'Paid') + '</span></p>' +
            '</div>' +
            '</div>' +

            '<div class="mb-4">' +
            '<h6 class="text-muted mb-2">Shipping Information</h6>' +
            '<div class="row g-2">' +
            '<div class="col-md-4">' +
            '<label class="form-label small">Carrier</label>' +
            '<select class="form-select form-select-sm" id="order-carrier">' +
            '<option value="">Select carrier</option>' +
            '<option value="USPS"' + (order.carrier === 'USPS' ? ' selected' : '') + '>USPS</option>' +
            '<option value="FedEx"' + (order.carrier === 'FedEx' ? ' selected' : '') + '>FedEx</option>' +
            '<option value="UPS"' + (order.carrier === 'UPS' ? ' selected' : '') + '>UPS</option>' +
            '<option value="DHL"' + (order.carrier === 'DHL' ? ' selected' : '') + '>DHL</option>' +
            '</select>' +
            '</div>' +
            '<div class="col-md-8">' +
            '<label class="form-label small">Tracking Number</label>' +
            '<input type="text" class="form-control form-control-sm" id="order-tracking" value="' + escapeHtml(order.trackingNumber || '') + '" placeholder="Enter tracking number">' +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div class="mb-4">' +
            '<h6 class="text-muted mb-2">Items</h6>' +
            '<table class="table table-sm">' +
            '<thead><tr><th>Item</th><th>Size</th><th>Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead>' +
            '<tbody>' +
            (order.items || []).map(function (item) {
                return '<tr>' +
                    '<td>' + escapeHtml(item.name) + '</td>' +
                    '<td>' + (item.size || '—') + '</td>' +
                    '<td>' + item.quantity + '</td>' +
                    '<td class="text-end">$' + item.price.toFixed(2) + '</td>' +
                    '<td class="text-end">$' + (item.price * item.quantity).toFixed(2) + '</td>' +
                    '</tr>';
            }).join('') +
            '</tbody>' +
            '<tfoot>' +
            '<tr><td colspan="4" class="text-end"><strong>Subtotal:</strong></td><td class="text-end">$' + (order.subtotal || 0).toFixed(2) + '</td></tr>' +
            '<tr><td colspan="4" class="text-end"><strong>Shipping:</strong></td><td class="text-end">$' + (order.shipping.cost || 0).toFixed(2) + '</td></tr>' +
            (order.tax > 0 ? '<tr><td colspan="4" class="text-end"><strong>Tax:</strong></td><td class="text-end">$' + (order.tax || 0).toFixed(2) + '</td></tr>' : '') +
            '<tr><td colspan="4" class="text-end"><strong>Total:</strong></td><td class="text-end"><strong>$' + (order.total || 0).toFixed(2) + '</strong></td></tr>' +
            '</tfoot>' +
            '</table>' +
            '</div>' +

            '<div class="mb-3">' +
            '<h6 class="text-muted mb-2">Notes</h6>' +
            '<textarea class="form-control form-control-sm" id="order-notes" rows="3" placeholder="Add internal notes...">' + escapeHtml(order.notes || '') + '</textarea>' +
            '</div>' +

            '<div class="text-end">' +
            '<button class="btn btn-primary" onclick="window.crAdmin.saveOrderChanges()">Save Changes</button>' +
            '</div>' +
            '</div>';

        document.getElementById('order-detail-content').innerHTML = content;
        orderModal.show();
    }

    // Save order changes
    function saveOrderChanges() {
        if (!currentOrder) return;

        var status = document.getElementById('order-status-select').value;
        var carrier = document.getElementById('order-carrier').value;
        var trackingNumber = document.getElementById('order-tracking').value;
        var notes = document.getElementById('order-notes').value;

        updateOrder(currentOrder.id, {
            status: status,
            carrier: carrier,
            trackingNumber: trackingNumber,
            notes: notes
        });

        orderModal.hide();
        loadDashboard();

        alert('Order updated successfully!');
    }

    // Print invoice
    function printInvoice() {
        if (!currentOrder) return;

        var order = currentOrder;
        var printWindow = window.open('', '_blank');
        var date = new Date(order.createdAt);

        var invoiceHTML = '<!DOCTYPE html><html><head>' +
            '<title>Invoice - ' + order.id + '</title>' +
            '<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}' +
            'table{width:100%;border-collapse:collapse;margin:20px 0;}' +
            'th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd;}' +
            'th{background:#f8f9fa;}' +
            '.text-end{text-align:right;}' +
            '.invoice-header{display:flex;justify-content:space-between;margin-bottom:30px;}' +
            '.total-row{font-weight:bold;font-size:1.1em;}' +
            '@media print{body{padding:20px;}}</style>' +
            '</head><body>' +
            '<div class="invoice-header"><div><h1>Invoice</h1><p>Cyrus Reigns Records</p></div>' +
            '<div style="text-align:right;"><p><strong>Invoice #:</strong> ' + order.id + '</p>' +
            '<p><strong>Date:</strong> ' + date.toLocaleDateString() + '</p>' +
            '<p><strong>Status:</strong> ' + order.paymentStatus + '</p></div></div>' +

            '<div style="margin-bottom:30px;"><h3>Bill To:</h3>' +
            '<p>' + order.customer.fullname + '<br>' +
            order.customer.address1 + '<br>' +
            (order.customer.address2 ? order.customer.address2 + '<br>' : '') +
            order.customer.city + ', ' + order.customer.state + ' ' + order.customer.zip + '<br>' +
            order.customer.country + '</p></div>' +

            '<table>' +
            '<thead><tr><th>Item</th><th>Size</th><th>Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead>' +
            '<tbody>' +
            order.items.map(function (item) {
                return '<tr><td>' + item.name + '</td><td>' + (item.size || '—') + '</td>' +
                    '<td>' + item.quantity + '</td><td class="text-end">$' + item.price.toFixed(2) + '</td>' +
                    '<td class="text-end">$' + (item.price * item.quantity).toFixed(2) + '</td></tr>';
            }).join('') +
            '</tbody>' +
            '<tfoot>' +
            '<tr><td colspan="4" class="text-end">Subtotal:</td><td class="text-end">$' + order.subtotal.toFixed(2) + '</td></tr>' +
            '<tr><td colspan="4" class="text-end">Shipping (' + order.shipping.method + '):</td><td class="text-end">$' + order.shipping.cost.toFixed(2) + '</td></tr>' +
            (order.tax > 0 ? '<tr><td colspan="4" class="text-end">Tax:</td><td class="text-end">$' + order.tax.toFixed(2) + '</td></tr>' : '') +
            '<tr class="total-row"><td colspan="4" class="text-end">Total:</td><td class="text-end">$' + order.total.toFixed(2) + '</td></tr>' +
            '</tfoot></table>' +

            '<div style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd;text-align:center;color:#666;">' +
            '<p>Thank you for your order!</p>' +
            '<p>Cyrus Reigns Records - Reigning Over Darkness</p></div>' +
            '</body></html>';

        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function () {
            printWindow.print();
        }, 250);
    }

    // Export orders to CSV
    function exportOrdersCSV() {
        var orders = getOrders();
        if (orders.length === 0) {
            alert('No orders to export');
            return;
        }

        var csv = 'Order ID,Date,Customer,Email,Address,City,State,ZIP,Country,Items,Quantity,Subtotal,Shipping,Tax,Total,Status,Payment Status,Tracking,Carrier,Notes\n';

        orders.forEach(function (order) {
            var itemsSummary = order.items.map(function (item) {
                return item.name + (item.size ? ' (' + item.size + ')' : '');
            }).join('; ');
            var totalQty = order.items.reduce(function (sum, item) { return sum + item.quantity; }, 0);

            csv += '"' + order.id + '",' +
                '"' + new Date(order.createdAt).toLocaleDateString() + '",' +
                '"' + order.customer.fullname + '",' +
                '"' + (order.customer.email || '') + '",' +
                '"' + order.customer.address1 + (order.customer.address2 ? ' ' + order.customer.address2 : '') + '",' +
                '"' + order.customer.city + '",' +
                '"' + (order.customer.state || '') + '",' +
                '"' + order.customer.zip + '",' +
                '"' + order.customer.country + '",' +
                '"' + itemsSummary + '",' +
                totalQty + ',' +
                order.subtotal.toFixed(2) + ',' +
                order.shipping.cost.toFixed(2) + ',' +
                (order.tax || 0).toFixed(2) + ',' +
                order.total.toFixed(2) + ',' +
                '"' + order.status + '",' +
                '"' + order.paymentStatus + '",' +
                '"' + (order.trackingNumber || '') + '",' +
                '"' + (order.carrier || '') + '",' +
                '"' + (order.notes || '').replace(/"/g, '""') + '"\n';
        });

        downloadFile('orders-export-' + new Date().toISOString().split('T')[0] + '.csv', csv, 'text/csv');
    }

    // Backup orders
    function backupOrders() {
        var orders = getOrders();
        var backup = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            orders: orders
        };

        downloadFile('orders-backup-' + new Date().toISOString().split('T')[0] + '.json',
            JSON.stringify(backup, null, 2),
            'application/json');
    }

    // Restore orders from backup
    function restoreOrders(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var backup = JSON.parse(e.target.result);
                if (backup.orders && Array.isArray(backup.orders)) {
                    if (confirm('This will replace all current orders with the backup data. Continue?')) {
                        saveOrders(backup.orders);
                        loadDashboard();
                        alert('Orders restored successfully!');
                    }
                } else {
                    alert('Invalid backup file format');
                }
            } catch (err) {
                alert('Failed to restore backup: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // Download file utility
    function downloadFile(filename, content, contentType) {
        var blob = new Blob([content], { type: contentType });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Tax settings
    function loadTaxSettings() {
        try {
            var settings = localStorage.getItem(TAX_SETTINGS_KEY);
            if (settings) {
                var tax = JSON.parse(settings);
                document.getElementById('tax-us').value = tax.US || 0;
                document.getElementById('tax-ca').value = tax.CA || 0;
                document.getElementById('tax-other').value = tax.OTHER || 0;
            }
        } catch (e) {
            console.error('Failed to load tax settings:', e);
        }
    }

    function saveTaxSettings() {
        var settings = {
            US: parseFloat(document.getElementById('tax-us').value) / 100,
            CA: parseFloat(document.getElementById('tax-ca').value) / 100,
            OTHER: parseFloat(document.getElementById('tax-other').value) / 100
        };

        localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(settings));
        alert('Tax settings saved successfully!');
    }

    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    function init() {
        orderModal = new bootstrap.Modal(document.getElementById('order-modal'));

        // Login form
        document.getElementById('login-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            var password = document.getElementById('admin-password').value;
            var errorEl = document.getElementById('login-error');

            if (await authenticate(password)) {
                errorEl.classList.add('d-none');
                showDashboard();
            } else {
                errorEl.textContent = 'Invalid password';
                errorEl.classList.remove('d-none');
            }
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', logout);

        // Navigation
        document.querySelectorAll('.admin-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var panel = this.dataset.panel;
                document.querySelectorAll('.admin-nav-btn').forEach(function (b) { b.classList.remove('active'); });
                document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('active'); });
                this.classList.add('active');
                document.getElementById('panel-' + panel).classList.add('active');
            });
        });

        // Search and filter
        document.getElementById('search-orders').addEventListener('input', function () {
            var search = this.value;
            var filter = document.getElementById('filter-status').value;
            renderOrders(filter, search);
        });

        document.getElementById('filter-status').addEventListener('change', function () {
            var search = document.getElementById('search-orders').value;
            renderOrders(this.value, search);
        });

        // Buttons
        document.getElementById('export-orders-btn').addEventListener('click', exportOrdersCSV);
        document.getElementById('backup-orders-btn').addEventListener('click', backupOrders);
        document.getElementById('download-backup-btn').addEventListener('click', backupOrders);
        document.getElementById('print-invoice-btn').addEventListener('click', printInvoice);
        document.getElementById('save-tax-settings').addEventListener('click', saveTaxSettings);

        document.getElementById('restore-backup-file').addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                restoreOrders(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Check authentication
        if (isAuthenticated()) {
            showDashboard();
        } else {
            showLogin();
        }
    }

    // Expose functions for onclick handlers
    window.crAdmin = {
        viewOrder: viewOrder,
        saveOrderChanges: saveOrderChanges,
        printInvoice: printInvoice
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
