// PetToy Store - Customer Module (External JS)
window.configureCategoryApi('Customer');

const renderCustomerNav = () => {
    const cartTotalCount = userCart.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 0), 0);
    const cartBadgeHtml = cartTotalCount > 0 ? `<span class="cart-badge">${cartTotalCount}</span>` : '';
    const isLoggedIn = Boolean(sessionStorage.getItem('loggedInUserId'));
    const authActionLink = isLoggedIn
        ? `<li><a href="javascript:void(0)" onclick="window.handleLogout('../Guest/index.html')" style="color: #fca5a5;">Logout</a></li>`
        : `<li><a href="../Guest/login.html" class="btn" style="padding: 0.45rem 1.2rem;">Login</a></li>`;

    const navItemsHtml = `
        <li><a href="dashboard.html">Dashboard</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="cart.html" style="display: inline-flex; align-items: center; gap: 0.35rem;">Cart ${cartBadgeHtml}</a></li>
        <li><a href="profile.html">Profile</a></li>
        ${authActionLink}
    `;

    window.renderCategoryChrome({
        homeHref: 'dashboard.html',
        navItemsHtml,
        showCartFloat: true,
        defaultActiveFile: 'dashboard.html'
    });
};

window.initCustomerPage = async () => {
    await syncAuthFromServer();
    renderCustomerNav();
    await fetchStoreData({ fetchCart: true });
    renderCustomerNav();
    window.initCustomerSupportChat();
};

// --- CUSTOMER DASHBOARD & DELIVERY TRACKING ---
const renderCustomerOrderRow = (o) => {
    let badgeClass = 'badge-cat';
    const status = o.status || 'Processing';
    if (status === 'Delivered') badgeClass = 'badge-success';
    else if (status === 'Cancelled') badgeClass = 'badge-danger';
    else if (status === 'Processing') badgeClass = 'badge-warning';

    const dest = (o.shipping_city && o.shipping_state) ? `${o.shipping_city}, ${o.shipping_state}` : 'Malaysia';
    const trackNo = o.tracking_number || `JT-MY-${String(o.id).padStart(8, '0')}`;

    return `
        <tr>
            <td>
                <strong>#${escapeHtml(o.id)}</strong><br>
                <code style="font-size: 0.75rem; color: #0284c7; font-weight: 700;">${escapeHtml(trackNo)}</code>
            </td>
            <td>${escapeHtml(formatOrderDate(o.date))}</td>
            <td>
                <strong>${escapeHtml(o.shipping_name || o.paymentName || 'Customer')}</strong><br>
                <small style="color: var(--text-muted);">📍 ${escapeHtml(dest)}</small>
            </td>
            <td style="font-weight: 700; color: var(--primary);">RM${o.total.toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
            <td>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    <button type="button" class="btn btn-outline" style="padding: 0.3rem 0.65rem; font-size: 0.8rem;" onclick="window.openDeliveryTrackingModal('${o.id}')">🚚 Track</button>
                    ${status === 'Processing' ? `<button type="button" class="btn btn-danger" style="padding: 0.3rem 0.65rem; font-size: 0.8rem;" onclick="window.cancelCustomerOrder('${o.id}')">✕ Cancel</button>` : ''}
                    ${status === 'Shipped' ? `<button type="button" class="btn" style="padding: 0.3rem 0.65rem; font-size: 0.8rem; background: #059669;" onclick="window.confirmOrderDelivered('${o.id}')">✅ Delivered</button>` : ''}
                    <button type="button" class="btn" style="padding: 0.3rem 0.65rem; font-size: 0.8rem;" onclick="window.printReceipt('${o.id}')">🖨️ Receipt</button>
                </div>
            </td>
        </tr>
    `;
};

window.initCustomerDashboard = () => {
    const tbody = document.getElementById('customer-orders-tbody');
    if (!tbody) return;
    const userId = String(sessionStorage.getItem('loggedInUserId'));
    const isLoggedIn = Boolean(userId && userId !== 'null');
    if (!isLoggedIn) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2.5rem 1rem;"><div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👋</div><strong>Welcome! Sign in to view your personal orders.</strong><p style="color:var(--text-muted); margin-bottom: 1.25rem;">Log in to track your package deliveries and print official receipts, or browse our toy catalog.</p><div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;"><a href="../Guest/login.html" class="btn">Log In</a><a href="products.html" class="btn btn-outline">Explore Pet Toys</a></div></td></tr>';
        return;
    }

    const ordersToShow = localOrders.filter(o => String(o.user_id) === userId);
    if (ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2.5rem 1rem;"><div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🧸</div><strong>No pet toy orders yet.</strong><p style="color:var(--text-muted); margin-bottom: 1rem;">Explore our best-selling pet toys, chew items, and interactive brain teasers.</p><a href="products.html" class="btn">Explore Pet Toys</a></td></tr>';
        return;
    }

    tbody.innerHTML = [...ordersToShow].reverse().map(renderCustomerOrderRow).join('');
};

window.openDeliveryTrackingModal = (orderId) => {
    const o = localOrders.find(ord => String(ord.id) === String(orderId));
    if (!o) return window.showToast('Order not found.', 'error');

    const user = localUsers.find(u => String(u.id) === String(o.user_id));
    const recipientName = o.shipping_name || (user ? `${user.firstName} ${user.lastName}` : (o.paymentName || 'Valued Customer'));
    const phone = o.shipping_phone || (user ? user.phone : '');
    const fullAddress = o.shipping_address ? `${o.shipping_address}, ${o.shipping_postcode || ''} ${o.shipping_city || ''}, ${o.shipping_state || ''}` : 'Malaysia';

    const modal = document.getElementById('delivery-tracking-modal');
    const body = document.getElementById('delivery-tracking-body');
    if (!modal || !body) return;

    const status = o.status || 'Processing';
    const isCancelled = status.toLowerCase() === 'cancelled';
    let stepIndex = 1;
    if (status === 'Delivered') stepIndex = 4;
    else if (status === 'Shipped') stepIndex = 3;
    else if (!isCancelled) stepIndex = 2;

    const statusBadgeCls = isCancelled
        ? 'badge-danger'
        : (status === 'Delivered' ? 'badge-success' : (status === 'Shipped' ? 'badge-cat' : 'badge-warning'));

    const trackingProgressHtml = isCancelled
        ? `<div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:8px; padding:1rem; margin:1rem 0; font-size:0.9rem;">
                <strong>✕ Order Cancelled</strong>
                <div style="margin-top:0.25rem;">This order was cancelled and any reserved toy inventory has been released. No parcel will be dispatched.</div>
           </div>`
        : `<div class="delivery-stepper">
            <div class="step-item ${stepIndex >= 1 ? 'completed' : ''}"><div class="step-circle">${stepIndex > 1 ? '✓' : '1'}</div><span class="step-label">Order Placed</span></div>
            <div class="step-item ${stepIndex > 2 ? 'completed' : (stepIndex === 2 ? 'active' : '')}"><div class="step-circle">${stepIndex > 2 ? '✓' : '2'}</div><span class="step-label">Quality Check</span></div>
            <div class="step-item ${stepIndex > 3 ? 'completed' : (stepIndex === 3 ? 'active' : '')}"><div class="step-circle">${stepIndex > 3 ? '✓' : '3'}</div><span class="step-label">Shipped</span></div>
            <div class="step-item ${stepIndex === 4 ? 'completed' : ''}"><div class="step-circle">${stepIndex === 4 ? '✓' : '4'}</div><span class="step-label">Delivered</span></div>
        </div>`;

    const courier = o.courier || 'J&T Express';
    const trackNo = o.tracking_number || `JT-MY-${String(o.id).padStart(8, '0')}`;
    const items = Array.isArray(o.items) ? o.items : [];

    const orderItemsHtml = items.length > 0 ? items.map(it => {
        const qty = parseInt(it.quantity, 10) || 1;
        const price = parseFloat(it.price) || 0;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.85rem; color: #f8fafc;">
                <span>• <strong>${qty}×</strong> ${escapeHtml(it.name || 'Toy #' + it.id)}</span>
                <span style="font-weight: 600; color: #38bdf8;">RM${(qty * price).toFixed(2)}</span>
            </div>`;
    }).join('') : '<div style="color: #cbd5e1; font-size: 0.85rem;">Standard Pet Toy Package</div>';

    body.innerHTML = `
        <div class="delivery-tracking-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
                <div>
                    <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8; font-weight: 700;">🧸 PetToy Store Malaysia · Nationwide Delivery</span>
                    <h3 style="color: white; margin: 0.25rem 0 0.5rem; font-size: 1.25rem;">Shipment Tracking</h3>
                </div>
                <span class="badge ${statusBadgeCls}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">${escapeHtml(status)}</span>
            </div>
            <div style="margin: 1rem 0;">
                <div style="font-size: 0.8rem; color: #94a3b8;">Courier Tracking Code (${escapeHtml(courier)})</div>
                <div class="tracking-code-badge">
                    <span>${escapeHtml(trackNo)}</span>
                    <button type="button" data-track="${escapeHtml(trackNo)}" onclick="window.copyTextToClipboard(this.dataset.track, 'Tracking number copied!')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; font-size: 0.9rem; box-shadow: none;" title="Copy tracking code">📋</button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 0.75rem;">
                <div><span style="color: #94a3b8; display: block; font-size: 0.75rem;">RECIPIENT</span><strong>${escapeHtml(recipientName)}</strong> ${phone ? `<small style="color:#cbd5e1;">(${escapeHtml(phone)})</small>` : ''}</div>
                <div><span style="color: #94a3b8; display: block; font-size: 0.75rem;">ORDER NUMBER</span><strong>#${escapeHtml(o.id)}</strong></div>
                <div style="grid-column: span 2;"><span style="color: #94a3b8; display: block; font-size: 0.75rem;">DELIVERY ADDRESS</span><strong>📍 ${escapeHtml(fullAddress)}</strong></div>
            </div>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.15);">
                <span style="color: #94a3b8; display: block; font-size: 0.75rem; margin-bottom: 0.4rem; text-transform: uppercase; font-weight: 700;">Parcel Contents</span>
                ${orderItemsHtml}
            </div>
        </div>
        ${trackingProgressHtml}
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap;">
            ${status === 'Processing' ? `<button type="button" class="btn btn-danger" onclick="window.cancelCustomerOrder('${o.id}', true)">✕ Cancel Order</button>` : ''}
            ${status === 'Shipped' ? `<button type="button" class="btn" style="background: #059669;" onclick="window.confirmOrderDelivered('${o.id}', true)">✅ Delivered</button>` : ''}
            <button type="button" class="btn btn-outline" onclick="window.printReceipt('${o.id}')">🖨️ Print Receipt</button>
            <button type="button" class="btn" onclick="document.getElementById('delivery-tracking-modal').style.display='none'">Close</button>
        </div>
    `;
    modal.style.display = 'flex';
};

window.cancelCustomerOrder = async (orderId, fromModal = false) => {
    if (!confirm('Are you sure you want to cancel this Processing order?')) return;
    const res = await apiCall('cancelOrder', { order_id: orderId });
    if (res.success) {
        window.showToast('Order cancelled and stock restored.');
        await fetchStoreData({ fetchCart: false });
        window.initCustomerDashboard();
        if (fromModal) window.openDeliveryTrackingModal(orderId);
    } else {
        window.showToast(res.error || 'Could not cancel order.', 'error');
    }
};

window.confirmOrderDelivered = async (orderId, fromModal = false) => {
    const res = await apiCall('confirmDelivery', { order_id: orderId });
    if (res.success) {
        window.showToast('Order marked as Delivered! Thank you for shopping with PetToy Store.');
        await fetchStoreData({ fetchCart: false });
        window.initCustomerDashboard();
        if (fromModal) window.openDeliveryTrackingModal(orderId);
    } else {
        window.showToast(res.error || 'Could not update delivery status.', 'error');
    }
};

window.printReceipt = (orderId) => {
    const o = localOrders.find(ord => String(ord.id) === String(orderId));
    if (!o) return window.showToast('Order not found.', 'error');
    const user = localUsers.find(u => String(u.id) === String(o.user_id));
    const customerName = o.shipping_name || (user ? `${user.firstName} ${user.lastName}` : (o.paymentName || 'Valued Customer'));
    const customerEmail = user ? user.email : '';
    const phone = o.shipping_phone || (user ? user.phone : 'N/A');
    const fullAddress = o.shipping_address ? `${o.shipping_address}, ${o.shipping_postcode || ''} ${o.shipping_city || ''}, ${o.shipping_state || ''}` : 'Melaka, Malaysia';
    const courier = o.courier || 'J&T Express';
    const trackNo = o.tracking_number || `JT-MY-${String(o.id).padStart(8, '0')}`;
    const items = Array.isArray(o.items) ? o.items : [];

    const printWin = window.open('', '_blank', 'width=750,height=850');
    if (!printWin) return window.showToast('Please allow popups to print receipt.', 'error');

    const knownShipping = (o.shipping_fee !== undefined && o.shipping_fee !== null && o.shipping_fee !== '') ? parseFloat(o.shipping_fee) : null;
    let subtotalSum = 0;
    let receiptItemsRows = '';
    if (items.length > 0) {
        receiptItemsRows = items.map(it => {
            const qty = parseInt(it.quantity, 10) || 1;
            const price = parseFloat(it.price) || 0;
            const itemSub = qty * price;
            subtotalSum += itemSub;
            return `<tr><td><strong>${escapeHtml(it.name || 'Toy #' + it.id)}</strong><div style="font-size:12px;color:#64748b;">Qty: ${qty} × RM${price.toFixed(2)}</div></td><td style="text-align:right;font-weight:600;">RM${itemSub.toFixed(2)}</td></tr>`;
        }).join('');
    } else {
        const inferredShip = knownShipping !== null ? knownShipping : (o.total >= 80 * 1.06 ? 0.00 : 8.00);
        subtotalSum = Math.max(0, (o.total - inferredShip) / 1.06);
        receiptItemsRows = `<tr><td>PetToy Store Play & Interactive Toys</td><td style="text-align:right;">RM${subtotalSum.toFixed(2)}</td></tr>`;
    }

    const tax = subtotalSum * 0.06;
    const shippingFee = knownShipping !== null ? knownShipping : (subtotalSum >= 80 ? 0.00 : 8.00);

    printWin.document.write(`
        <!DOCTYPE html><html><head><title>Receipt - PetToy Store Order #${o.id}</title>
        <style>body{font-family:system-ui,sans-serif;padding:40px;color:#1e293b;max-width:680px;margin:auto}.header{text-align:center;border-bottom:2px solid #0f172a;padding-bottom:15px;margin-bottom:25px}.logo{font-size:24px;font-weight:900;color:#065f46}.meta-table{width:100%;margin-bottom:25px;font-size:14px}.receipt-table{width:100%;border-collapse:collapse;margin-bottom:20px}.receipt-table th{text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;font-size:13px;text-transform:uppercase}.receipt-table td{padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px}.total-box{margin-top:15px;border-top:2px solid #0f172a;padding-top:10px;font-size:16px;font-weight:800;text-align:right}.delivery-box{background:#f0fdf4;border:1.5px dashed #10b981;border-radius:8px;padding:15px;margin-top:25px;font-size:13px}@media print{.no-print{display:none}}</style>
        </head><body>
        <div class="header"><div class="logo">🧸 PETTOY STORE MALAYSIA</div><div style="font-size:13px;color:#64748b;margin-top:4px;">Nationwide Home Delivery · Premium Toys for Dogs & Cats</div></div>
        <table class="meta-table"><tr><td style="width:55%"><strong>Order ID:</strong> #${o.id}<br><strong>Order Date:</strong> ${formatOrderDate(o.date)}<br><strong>Customer:</strong> ${escapeHtml(customerName)}<br><strong>Phone:</strong> ${escapeHtml(phone)}<br>${customerEmail ? `<strong>Email:</strong> ${escapeHtml(customerEmail)}<br>` : ''}</td>
        <td style="width:45%;text-align:right"><strong>Status:</strong> ${escapeHtml(o.status || 'Processing')}<br><strong>Courier:</strong> ${escapeHtml(courier)}<br><strong>Tracking #:</strong> <code>${escapeHtml(trackNo)}</code></td></tr></table>
        <table class="receipt-table"><thead><tr><th>Item Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${receiptItemsRows}
        <tr><td>Subtotal</td><td style="text-align:right">RM${subtotalSum.toFixed(2)}</td></tr>
        <tr><td>SST (6%)</td><td style="text-align:right">RM${tax.toFixed(2)}</td></tr>
        <tr><td>Nationwide Delivery</td><td style="text-align:right">${shippingFee === 0 ? 'FREE' : `RM${shippingFee.toFixed(2)}`}</td></tr></tbody></table>
        <div class="total-box">Total Paid: RM${o.total.toFixed(2)}</div>
        <div class="delivery-box"><strong>🚚 DELIVERY DISPATCH:</strong> ${escapeHtml(fullAddress)} (${escapeHtml(courier)} · ${escapeHtml(trackNo)})</div>
        <div style="margin-top:30px;text-align:center" class="no-print"><button onclick="window.print()" style="padding:8px 20px;font-weight:700;cursor:pointer">Print Receipt</button></div>
        <script>window.onload=function(){window.print();};<\/script></body></html>
    `);
    printWin.document.close();
};

// --- PRODUCTS, DETAIL, REVIEWS, CART & CHECKOUT ---
const buildProductCardHtml = (p) => {
    const cat = localCategories.find(c => String(c.id) === String(p.category_id) || String(c.name) === String(p.category_id));
    const catName = cat ? cat.name : '';
    const catIcon = catName ? getCategoryIcon(catName) : '';
    let stockBadge = '<span class="badge badge-success"><span class="pulse-dot"></span> In Stock</span>';
    if (p.stock <= 0) stockBadge = '<span class="badge badge-danger">● Out of Stock</span>';
    else if (p.stock <= 5) stockBadge = `<span class="badge badge-warning"><span class="pulse-dot warning"></span> Only ${p.stock} Left!</span>`;

    return `
        <div class="card">
            <div class="card-img-wrapper">
                <img src="${escapeHtml(resolveImageUrl(p.image))}" alt="${escapeHtml(p.name)}" class="card-img" onerror="window.handleImageError(this)">
                <div style="position: absolute; top: 12px; left: 12px; display: flex; gap: 6px; z-index: 2; flex-wrap: wrap;">
                    ${catName ? `<span class="badge badge-cat">${catIcon} ${escapeHtml(catName)}</span>` : ''}
                    ${stockBadge}
                </div>
            </div>
            <div class="card-body">
                <h3 style="margin-bottom: 0.25rem;">${escapeHtml(p.name)}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem; flex-grow: 1;">${escapeHtml(p.description)}</p>
                <div class="price" style="font-size: 1.35rem; font-weight: 800; color: var(--primary);">RM${p.price.toFixed(2)}</div>
                <div class="qty-stepper" style="margin-top: 0.85rem; margin-bottom: 0.75rem;">
                    <button type="button" class="qty-btn" onclick="window.decreaseQty('qty-${p.id}')">−</button>
                    <input type="number" id="qty-${p.id}" value="1" readonly>
                    <button type="button" class="qty-btn" onclick="window.increaseQty('qty-${p.id}', ${p.stock})">+</button>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="window.goToDetails('${p.id}')" class="btn btn-outline" style="flex: 1; padding: 0.6rem 0.5rem; font-size: 0.9rem;">Details</button>
                    <button type="button" onclick="window.addToCart('${p.id}')" class="btn" style="flex: 1.3; padding: 0.6rem 0.5rem; font-size: 0.9rem;${p.stock < 1 ? ' opacity:0.5; cursor:not-allowed;' : ''}" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold Out' : '🛒 Add'}</button>
                </div>
            </div>
        </div>
    `;
};

window.initProductsPage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const matchingCatId = window.resolveCategoryFilterMatch(urlParams.get('cat') || '');

    const filterCat = document.getElementById('filter-cat');
    if (filterCat) {
        filterCat.innerHTML = '<option value="">✨ All Categories</option>' + localCategories.map(c => `<option value="${c.id}" ${matchingCatId === String(c.id) ? 'selected' : ''}>${getCategoryIcon(c.name)} ${escapeHtml(c.name)}</option>`).join('');
        if (matchingCatId) filterCat.value = matchingCatId;
    }
    window.renderProducts();
};

window.renderProducts = () => {
    const container = document.getElementById('products-grid');
    if (!container) return;
    const search = (document.getElementById('search-prod')?.value || '').toLowerCase();
    const filterCatId = document.getElementById('filter-cat')?.value || '';

    let filtered = localProducts.filter(p => String(p.name).toLowerCase().includes(search) || String(p.description || '').toLowerCase().includes(search));
    if (filterCatId !== '') filtered = filtered.filter(p => String(p.category_id) === String(filterCatId));

    const countEl = document.getElementById('products-count');
    if (countEl) countEl.innerText = `${filtered.length} Product${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 3rem 0; color: var(--text-muted); font-size: 1.1rem;">🔍 No pet toys match your search or filter.</p>';
        return;
    }
    container.innerHTML = filtered.map(buildProductCardHtml).join('');
};

window.goToDetails = (id) => { window.location.href = `product-detail.html?id=${id}`; };
window.decreaseQty = (id) => { const el = document.getElementById(id); if (el && parseInt(el.value, 10) > 1) el.value = parseInt(el.value, 10) - 1; };
window.increaseQty = (id, max) => { const el = document.getElementById(id); if (el && parseInt(el.value, 10) < max) el.value = parseInt(el.value, 10) + 1; };

window.addToCart = async (id, specificQty) => {
    const prod = localProducts.find(p => String(p.id) === String(id));
    if (!prod) return window.showToast('Product not found.', 'error');
    let qty = specificQty || parseInt(document.getElementById(`qty-${id}`)?.value || 1, 10);
    if (isNaN(qty) || qty < 1) qty = 1;

    const existing = userCart.find(i => String(i.id) === String(id));
    if ((existing ? existing.quantity : 0) + qty > prod.stock) return window.showToast(`Max stock is ${prod.stock}.`, 'error');

    if (existing) existing.quantity += qty;
    else userCart.push({ id: String(id), name: prod.name, price: prod.price, quantity: qty });

    await syncCartToDB();
    renderCustomerNav();

    const badgeEl = document.querySelector('.cart-badge');
    if (badgeEl) {
        badgeEl.classList.remove('pop-anim');
        void badgeEl.offsetWidth;
        badgeEl.classList.add('pop-anim');
    }
    window.showToast(`Added ${prod.name} to cart! 🧸`);
};

window.updateCartQuantity = async (id, newQty) => {
    const item = userCart.find(i => String(i.id) === String(id));
    const prod = localProducts.find(p => String(p.id) === String(id));
    if (!item) return;
    if (!prod || prod.stock <= 0) {
        userCart = userCart.filter(i => String(i.id) !== String(id));
        await syncCartToDB();
        renderCustomerNav();
        window.renderCart();
        return window.showToast(`"${item.name}" is out of stock and was removed from your cart.`, 'error');
    }
    if (newQty < 1) return;
    item.quantity = newQty > prod.stock ? (window.showToast(`Max stock is ${prod.stock}.`, 'error'), prod.stock) : newQty;
    item.price = prod.price;
    await syncCartToDB();
    renderCustomerNav();
    window.renderCart();
};

window.removeFromCart = async (id) => {
    userCart = userCart.filter(i => String(i.id) !== String(id));
    await syncCartToDB();
    renderCustomerNav();
    window.renderCart();
    window.showToast('Item removed.');
};

window.renderCart = () => {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    let html = '';
    let subtotal = 0;

    if (userCart.length === 0) {
        html = `<tr><td colspan="5" class="text-center" style="padding: 3rem 1rem;"><div style="font-size: 3rem; margin-bottom: 0.75rem;">🛒</div><h3>Your cart is currently empty</h3><p>Looks like you haven't added any pet toys yet.</p><a href="products.html" class="btn">Explore Pet Toys</a></td></tr>`;
    } else {
        userCart.forEach((item) => {
            const prod = localProducts.find(p => String(p.id) === String(item.id));
            item.price = prod ? prod.price : (item.price || 0);
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            html += `<tr>
                <td><div style="display: flex; align-items: center; gap: 1rem;"><img src="${escapeHtml(resolveImageUrl(prod?.image))}" alt="${escapeHtml(item.name)}" class="cart-thumb" onerror="window.handleImageError(this)"><div><strong><a href="product-detail.html?id=${item.id}" style="color: var(--secondary);">${escapeHtml(item.name)}</a></strong>${prod ? `<div style="font-size: 0.8rem; color: var(--text-muted);">Stock: ${prod.stock}</div>` : ''}</div></div></td>
                <td style="font-weight: 500;">RM${item.price.toFixed(2)}</td>
                <td><div class="qty-stepper"><button type="button" class="qty-btn" onclick="window.updateCartQuantity('${item.id}', ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>−</button><input type="number" value="${item.quantity}" readonly><button type="button" class="qty-btn" onclick="window.updateCartQuantity('${item.id}', ${item.quantity + 1})" ${prod && item.quantity >= prod.stock ? 'disabled' : ''}>+</button></div></td>
                <td style="font-weight: 700; color: var(--primary);">RM${itemTotal.toFixed(2)}</td>
                <td><button type="button" class="btn btn-danger" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;" onclick="window.removeFromCart('${item.id}')">Remove</button></td>
            </tr>`;
        });
    }
    container.innerHTML = html;

    const shippingFee = subtotal >= 80 ? 0.00 : (subtotal > 0 ? 8.00 : 0.00);
    const tax = subtotal * 0.06;
    const finalTotal = subtotal + tax + shippingFee;

    const bannerEl = document.getElementById('cart-delivery-banner');
    if (bannerEl) {
        if (subtotal === 0) bannerEl.style.display = 'none';
        else if (subtotal >= 80) {
            bannerEl.style.display = 'block';
            bannerEl.innerHTML = `<div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.75rem 1rem; color: #065f46; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;"><div><span style="font-size: 1.25rem;">🎉</span> <strong>FREE Nationwide Delivery Unlocked!</strong></div><div class="free-shipping-progress" style="width: 140px; margin: 0;"><div class="free-shipping-bar" style="width: 100%;"></div></div></div>`;
        } else {
            const remaining = (80 - subtotal).toFixed(2);
            const percent = Math.min(100, Math.round((subtotal / 80) * 100));
            bannerEl.style.display = 'block';
            bannerEl.innerHTML = `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; color: #1e40af; font-size: 0.9rem;"><div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;"><div>🚚 Add <strong>RM${remaining}</strong> more for <strong>FREE Nationwide Delivery</strong>!</div><strong>RM${subtotal.toFixed(2)} / RM80.00</strong></div><div class="free-shipping-progress"><div class="free-shipping-bar" style="width: ${percent}%;"></div></div></div>`;
        }
    }

    if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').innerText = `RM${subtotal.toFixed(2)}`;
    if (document.getElementById('cart-tax')) document.getElementById('cart-tax').innerText = `RM${tax.toFixed(2)}`;
    if (document.getElementById('cart-shipping')) document.getElementById('cart-shipping').innerHTML = subtotal === 0 ? 'RM0.00' : (subtotal >= 80 ? '<span style="color:#059669; font-weight:700;">FREE (Orders RM80+)</span>' : 'RM8.00 (Flat Rate)');
    if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = `RM${finalTotal.toFixed(2)}`;

    const hasStockIssue = localProducts.length > 0 && userCart.some(item => {
        const p = localProducts.find(pr => String(pr.id) === String(item.id));
        return !p || parseInt(p.stock, 10) <= 0 || item.quantity > parseInt(p.stock, 10);
    });
    const checkoutBtn = document.querySelector('a[href="checkout.html"]');
    if (checkoutBtn) {
        const disabled = userCart.length === 0 || hasStockIssue;
        checkoutBtn.style.pointerEvents = disabled ? 'none' : 'auto';
        checkoutBtn.style.opacity = disabled ? '0.5' : '1';
        checkoutBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        checkoutBtn.title = hasStockIssue ? 'Please adjust out-of-stock or excess quantity items before checkout.' : '';
    }
};

window.formatCardNumber = (input) => {
    const val = input.value.replace(/\D/g, '');
    input.value = (val.match(/.{1,4}/g)?.join(' ') || val).substring(0, 19);
};

window.initCheckoutPage = async () => {
    const userId = sessionStorage.getItem('loggedInUserId');
    document.querySelectorAll('.checkout-auth-banner').forEach(el => el.remove());

    if (!userId || userId === 'null') {
        const warn = document.createElement('div');
        warn.className = 'checkout-auth-banner';
        warn.style.cssText = 'background:#fef3c7; border:1px solid #f59e0b; color:#92400e; padding:1rem; border-radius:8px; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;';
        warn.innerHTML = '<span>⚠️ <strong>Not Signed In:</strong> Please log in to complete checkout.</span> <a href="../Guest/login.html" class="btn" style="padding:0.4rem 1rem; font-size:0.85rem;">Login Now</a>';
        document.querySelector('main')?.prepend(warn);
    }

    const u = localUsers.find(user => String(user.id) === String(userId));
    if (u) {
        const setVal = (id, v) => { const el = document.getElementById(id); if (el && !el.value) el.value = v; };
        setVal('checkout-name', `${u.firstName || ''} ${u.lastName || ''}`.trim());
        setVal('checkout-phone', window.formatMyPhoneDigits(u.phone || ''));
        setVal('checkout-address', u.addr1 || '');
        setVal('checkout-city', u.city || '');
        setVal('checkout-postcode', u.zip || '');

        window.setSelectValueCaseInsensitive(document.getElementById('checkout-state'), u.state || 'Melaka', 'Melaka');
    }
    window.bindMyPhoneInput(document.getElementById('checkout-phone'));

    let subtotal = 0;
    userCart.forEach(i => {
        const prod = localProducts.find(p => String(p.id) === String(i.id));
        if (prod) i.price = prod.price;
        else if (i.price === undefined) i.price = 0;
        subtotal += i.price * i.quantity;
    });
    await syncCartToDB();

    const shippingFee = subtotal >= 80 ? 0.00 : (subtotal > 0 ? 8.00 : 0.00);
    const tax = subtotal * 0.06;
    const total = subtotal + tax + shippingFee;

    if (document.getElementById('checkout-subtotal-display')) document.getElementById('checkout-subtotal-display').innerText = `RM${subtotal.toFixed(2)}`;
    if (document.getElementById('checkout-shipping-display')) document.getElementById('checkout-shipping-display').innerText = shippingFee === 0 ? 'FREE (Orders RM80+)' : 'RM8.00 (Flat Rate)';
    if (document.getElementById('checkout-tax-display')) document.getElementById('checkout-tax-display').innerText = `RM${tax.toFixed(2)}`;
    if (document.getElementById('checkout-total-display')) document.getElementById('checkout-total-display').innerText = `RM${total.toFixed(2)}`;
};

let isSubmittingCheckout = false;

window.handleCheckout = async (event) => {
    event.preventDefault();
    if (isSubmittingCheckout) return;
    if (userCart.length === 0) return window.showToast('Your cart is empty!', 'error');

    const currentUserId = String(sessionStorage.getItem('loggedInUserId'));
    if (!currentUserId || currentUserId === 'null') {
        window.showToast('Please log in to complete checkout.', 'error');
        return setTimeout(() => { window.location.href = '../Guest/login.html'; }, 800);
    }

    const form = event.target;
    const recipientName = form.querySelector('#checkout-name')?.value?.trim();
    const recipientPhone = form.querySelector('#checkout-phone')?.value?.trim();
    const address = form.querySelector('#checkout-address')?.value?.trim();
    const city = form.querySelector('#checkout-city')?.value?.trim();
    const state = form.querySelector('#checkout-state')?.value?.trim();
    const postcode = form.querySelector('#checkout-postcode')?.value?.trim();
    const cardNumber = form.querySelector('#checkout-card')?.value?.replace(/\s/g, '') || '';
    const expiryMonth = form.querySelector('#checkout-exp-month')?.value;
    const expiryYear = form.querySelector('#checkout-exp-year')?.value;
    const cvv = form.querySelector('#checkout-cvv')?.value || '';

    if (!recipientName) return window.showToast('Please enter the recipient full name.', 'error');
    if (!recipientPhone || recipientPhone.length < 8) return window.showToast('Please enter a valid Malaysian contact phone number.', 'error');
    if (!address || !city || !state) return window.showToast('Please complete the delivery address.', 'error');
    if (!postcode || !/^\d{5}$/.test(postcode)) return window.showToast('Please enter a valid 5-digit Malaysian postcode.', 'error');
    if (cardNumber.length !== 16 || !expiryMonth || !expiryYear || cvv.length !== 3) return window.showToast('Please enter valid payment card details.', 'error');

    const now = new Date();
    if (Number(expiryYear) < now.getFullYear() || (Number(expiryYear) === now.getFullYear() && Number(expiryMonth) < now.getMonth() + 1)) {
        return window.showToast('Your payment card has expired.', 'error');
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const origBtnText = submitBtn ? submitBtn.textContent : '';
    isSubmittingCheckout = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processing Order...'; }

    let orderSucceeded = false;
    try {
        await fetchStoreData({ fetchCart: false });
        for (const item of userCart) {
            const prod = localProducts.find(p => String(p.id) === String(item.id));
            if (!prod) return window.showToast(`"${item.name}" is no longer available.`, 'error');
            if (item.quantity > prod.stock) return window.showToast(`Only ${prod.stock} of "${prod.name}" in stock.`, 'error');
            item.price = prod.price;
        }

        const subtotal = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shippingFee = subtotal >= 80 ? 0.00 : 8.00;
        const finalTotal = subtotal + (subtotal * 0.06) + shippingFee;
        const trackingNumber = `JT-MY-${Math.floor(10000000 + Math.random() * 90000000)}`;

        const orderRes = await apiCall('addOrder', {
            order: {
                user_id: currentUserId,
                total: finalTotal,
                shipping_name: recipientName,
                shipping_phone: recipientPhone,
                shipping_address: address,
                shipping_city: city,
                shipping_state: state,
                shipping_postcode: postcode,
                shipping_fee: shippingFee,
                tracking_number: trackingNumber,
                courier: 'J&T Express',
                paymentName: recipientName,
                items: userCart.map(i => ({ ...i }))
            }
        });
        if (!orderRes.success) return window.showToast(orderRes.error || 'Failed to process order.', 'error');

        orderSucceeded = true;
        if (!orderRes.stockDecremented) {
            for (const item of userCart) {
                await apiCall('updateProductStock', { id: item.id, qty: item.quantity });
            }
        }

        userCart = [];
        await syncCartToDB();
        window.showToast(`Order Placed! Tracking: ${orderRes.tracking_number || trackingNumber} 🚚`);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } finally {
        if (!orderSucceeded) {
            isSubmittingCheckout = false;
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
        }
    }
};

// --- PRODUCT DETAIL & REVIEWS ---
const getToyPlayGuide = (productName = '', categoryName = '') => {
    const name = String(productName).toLowerCase();
    const cat = String(categoryName).toLowerCase();
    if (cat.includes('chew') || name.includes('chew') || name.includes('bone') || name.includes('kong') || name.includes('antler')) {
        return { bestFor: 'Heavy Chewer (Power Play)', durability: 'Toughness Rating: 9 / 10', care: 'Dishwasher Safe / Hand Wash', playStyle: 'Treat-Dispensing & Dental Care', pairing: 'Pair with Dental Ridge Teething Bone or Braided Cotton Rope Tug.', pairIds: ['2', '3'] };
    }
    if (cat.includes('plush') || name.includes('plush') || name.includes('squeak') || name.includes('duck')) {
        return { bestFor: 'Gentle to Moderate Cuddler', durability: 'Toughness Rating: 6 / 10', care: 'Reinforced Double-Stitched', playStyle: 'Acoustic Squeakers & Crinkle', pairing: 'Pair with Squeaky Plush Duck or Multi-Squeaker Canvas Octopus.', pairIds: ['4', '21'] };
    }
    if (cat.includes('puzzle') || cat.includes('interactive') || name.includes('puzzle') || name.includes('snuffle')) {
        return { bestFor: 'Mental Stimulation & Brain Gym', durability: 'Skill Level: 2 (Intermediate)', care: 'Wipe Clean with Damp Cloth', playStyle: 'Dry Kibble & Treat Compatible', pairing: 'Pair with Interactive Treat Maze Board and Snuffle Foraging Mat.', pairIds: ['5', '10'] };
    }
    if (cat.includes('wand') || cat.includes('feather') || name.includes('wand') || name.includes('catnip')) {
        return { bestFor: 'High Agility Pounce & Chaser', durability: 'Activity Level: High Energy', care: '100% Organic Catnip Infused', playStyle: 'Predatory Hunting Enrichment', pairing: 'Pair with Telescopic Feather Wand and Collapsible 3-Way Cat Play Tunnel.', pairIds: ['6', '13'] };
    }
    if (cat.includes('ball') || cat.includes('rope') || cat.includes('fetch') || name.includes('ball') || name.includes('rope')) {
        return { bestFor: 'Active Retriever & Tugger', durability: 'Toughness Rating: 8.5 / 10', care: 'Pet-Safe Natural Cotton/Rubber', playStyle: 'Outdoor Fetch & Cardio Play', pairing: 'Pair with High-Bounce Tennis Balls (3-Pack) and Aerobic Fetch Flyer Disc.', pairIds: ['8', '9'] };
    }
    return { bestFor: 'All Breeds & Play Styles', durability: 'Toughness Rating: 7 / 10', care: 'BPA-Free Non-Toxic Material', playStyle: 'Enrichment & Active Play', pairing: 'Pair with KONG Rubber Chew and Treat Dispenser.', pairIds: ['1', '5'] };
};

window.initProductDetailPage = () => {
    const id = String(new URLSearchParams(window.location.search).get('id'));
    const p = localProducts.find(x => String(x.id) === id);
    if (!p) {
        if (document.getElementById('breadcrumb-name')) document.getElementById('breadcrumb-name').innerText = 'Not Found';
        if (document.getElementById('detail-cat-badge')) document.getElementById('detail-cat-badge').innerText = 'Unavailable';
        const sb = document.getElementById('detail-stock-badge');
        if (sb) { sb.className = 'badge badge-danger'; sb.innerText = '● Not Found'; }
        if (document.getElementById('detail-price')) document.getElementById('detail-price').innerText = '';
        if (document.getElementById('detail-image')) document.getElementById('detail-image').src = PLACEHOLDER_IMAGE;
        document.getElementById('detail-name').innerText = 'Product not found';
        document.getElementById('detail-desc').innerHTML = '<p>This product may have been removed or the link is invalid. <a href="products.html">Return to catalog</a>.</p>';
        if (document.getElementById('detail-add-btn')) document.getElementById('detail-add-btn').disabled = true;
        if (document.getElementById('care-grid-container')) document.getElementById('care-grid-container').style.display = 'none';
        if (document.getElementById('pairing-section')) document.getElementById('pairing-section').style.display = 'none';
        if (document.getElementById('add-review-box')) document.getElementById('add-review-box').style.display = 'none';
        return;
    }

    const cat = localCategories.find(c => String(c.id) === String(p.category_id) || String(c.name) === String(p.category_id));
    const catName = cat ? cat.name : 'Pet Toys';

    if (document.getElementById('breadcrumb-name')) document.getElementById('breadcrumb-name').innerText = p.name;
    if (document.getElementById('detail-cat-badge')) document.getElementById('detail-cat-badge').innerHTML = `${getCategoryIcon(catName)} ${escapeHtml(catName)}`;

    const stockBadgeEl = document.getElementById('detail-stock-badge');
    if (stockBadgeEl) {
        stockBadgeEl.className = p.stock <= 0 ? 'badge badge-danger' : (p.stock <= 5 ? 'badge badge-warning' : 'badge badge-success');
        stockBadgeEl.innerHTML = p.stock <= 0 ? '● Out of Stock' : (p.stock <= 5 ? `<span class="pulse-dot warning"></span> Only ${p.stock} Left!` : '<span class="pulse-dot"></span> In Stock');
    }

    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-price').innerText = 'RM' + p.price.toFixed(2);
    document.getElementById('detail-desc').innerHTML = `<p>${escapeHtml(p.description)}</p>`;

    const imgEl = document.getElementById('detail-image');
    if (imgEl) { imgEl.src = resolveImageUrl(p.image); imgEl.onerror = () => window.handleImageError(imgEl); }
    const qtyInput = document.getElementById('detail-qty');
    if (qtyInput) qtyInput.max = p.stock;
    if (document.getElementById('detail-qty-inc')) document.getElementById('detail-qty-inc').onclick = () => window.increaseQty('detail-qty', p.stock);

    const addBtn = document.getElementById('detail-add-btn');
    if (addBtn) {
        addBtn.onclick = () => window.addToCart(p.id, parseInt(document.getElementById('detail-qty')?.value || 1, 10));
        if (p.stock < 1) { addBtn.disabled = true; addBtn.style.opacity = '0.5'; addBtn.style.cursor = 'not-allowed'; addBtn.innerText = 'Sold Out'; }
    }

    const guide = getToyPlayGuide(p.name, catName);
    const careGrid = document.getElementById('care-grid-container');
    if (careGrid) {
        careGrid.innerHTML = `
            <div class="care-card"><div class="care-icon">🛡️</div><div class="care-title">Durability</div><div class="care-val">${escapeHtml(guide.durability)}</div></div>
            <div class="care-card"><div class="care-icon">🧼</div><div class="care-title">Care & Wash</div><div class="care-val">${escapeHtml(guide.care)}</div></div>
            <div class="care-card"><div class="care-icon">🎯</div><div class="care-title">Play Style</div><div class="care-val">${escapeHtml(guide.playStyle)}</div></div>
            <div class="care-card"><div class="care-icon">🐾</div><div class="care-title">Best For</div><div class="care-val">${escapeHtml(guide.bestFor)}</div></div>
        `;
    }

    const pairingSection = document.getElementById('pairing-section');
    const pairingText = document.getElementById('pairing-text');
    const pairingContainer = document.getElementById('pairing-items-container');
    if (pairingSection && pairingText && pairingContainer) {
        pairingText.textContent = guide.pairing;
        let paired = localProducts.filter(item => guide.pairIds.includes(String(item.id)) && String(item.id) !== String(p.id));
        if (paired.length === 0) paired = localProducts.filter(item => String(item.id) !== String(p.id)).slice(0, 2);
        if (paired.length > 0) {
            pairingContainer.innerHTML = paired.map(item => `
                <div style="background: white; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 210px;">
                    <img src="${escapeHtml(resolveImageUrl(item.image))}" alt="${escapeHtml(item.name)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;" onerror="window.handleImageError(this)">
                    <div style="flex-grow: 1;"><div style="font-weight: 700; font-size: 0.88rem;">${escapeHtml(item.name)}</div><div style="font-weight: 800; font-size: 0.82rem; color: var(--primary);">RM${item.price.toFixed(2)}</div></div>
                    <button type="button" class="btn" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" onclick="window.addToCart('${item.id}', 1)" ${item.stock < 1 ? 'disabled' : ''}>${item.stock < 1 ? 'Sold Out' : '+ Add'}</button>
                </div>`).join('');
        } else pairingSection.style.display = 'none';
    }

    window.renderProductReviews(p.id);
};

window.setStarRating = (score) => {
    const hiddenInput = document.getElementById('review-rating');
    if (hiddenInput) hiddenInput.value = score;
    document.querySelectorAll('#star-picker span').forEach((star, idx) => { star.className = idx < score ? 'star-gold' : 'star-muted'; });
};

let isSubmittingReview = false;

window.handleSubmitProductReview = async (event) => {
    event.preventDefault();
    if (isSubmittingReview) return;
    const productId = String(new URLSearchParams(window.location.search).get('id'));
    const userId = String(sessionStorage.getItem('loggedInUserId'));
    if (!userId || userId === 'null') {
        window.showToast('Please log in to submit a review.', 'error');
        return setTimeout(() => { window.location.href = '../Guest/login.html'; }, 900);
    }

    const title = document.getElementById('review-title')?.value?.trim();
    const body = document.getElementById('review-body')?.value?.trim();
    const rating = parseInt(document.getElementById('review-rating')?.value, 10) || 5;
    if (!title || !body) return window.showToast('Please provide both a title and review feedback.', 'error');

    const submitBtn = event.target?.querySelector('button[type="submit"]');
    const origText = submitBtn ? submitBtn.textContent : '';
    isSubmittingReview = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

    try {
        const res = await apiCall('addComment', { comment: { product_id: productId, user_id: userId, title, body, rating } });
        if (res.success) {
            document.getElementById('review-title').value = '';
            document.getElementById('review-body').value = '';
            window.setStarRating(5);
            window.showToast('Review submitted! Thank you for sharing your experience. 🧸');
            await fetchStoreData({ fetchCart: false });
            window.renderProductReviews(productId);
        } else {
            window.showToast(res.error || 'Failed to submit review.', 'error');
        }
    } finally {
        isSubmittingReview = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
    }
};

window.renderProductReviews = (productId) => {
    const listEl = document.getElementById('product-reviews-list');
    const summaryStars = document.getElementById('avg-stars');
    const summaryScore = document.getElementById('avg-score');
    const summaryCount = document.getElementById('reviews-count');
    if (!listEl) return;

    const reviews = localComments.filter(c => String(c.product_id) === String(productId));
    if (reviews.length === 0) {
        listEl.innerHTML = `<div style="background: var(--bg-light); border: 1.5px dashed var(--border-color); border-radius: var(--radius); padding: 2rem; text-align: center;"><div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧸 ⭐</div><h4>No Reviews Yet</h4><p style="margin-bottom:0;">Be the first pet owner to share play notes and toy feedback!</p></div>`;
        if (summaryStars) summaryStars.innerHTML = '★★★★★';
        if (summaryScore) summaryScore.textContent = '5.0';
        if (summaryCount) summaryCount.textContent = '(0 reviews)';
        return;
    }

    const avgRating = (reviews.reduce((sum, r) => sum + (parseInt(r.rating, 10) || 5), 0) / reviews.length).toFixed(1);
    if (summaryScore) summaryScore.textContent = avgRating;
    if (summaryCount) summaryCount.textContent = `(${reviews.length} review${reviews.length > 1 ? 's' : ''})`;
    if (summaryStars) {
        let starStr = '';
        for (let i = 1; i <= 5; i++) starStr += `<span class="${i <= Math.round(avgRating) ? 'star-gold' : 'star-muted'}">★</span>`;
        summaryStars.innerHTML = starStr;
    }

    listEl.innerHTML = reviews.map(c => {
        const rScore = parseInt(c.rating, 10) || 5;
        let starHtml = '';
        for (let i = 1; i <= 5; i++) starHtml += `<span class="${i <= rScore ? 'star-gold' : 'star-muted'}">★</span>`;
        const userName = (c.firstName || c.lastName) ? `${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}` : 'Verified Buyer';
        return `<div class="review-item"><div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;"><div>${starHtml}</div><span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(formatOrderDate(c.date))}</span></div><h4 style="margin-bottom:0.25rem;font-size:1rem;">${escapeHtml(c.title)}</h4><div style="font-size:0.82rem;color:#059669;font-weight:600;margin-bottom:0.5rem;">✓ ${escapeHtml(userName)} · Verified Customer</div><p style="margin-bottom:0;font-size:0.92rem;color:var(--text-dark);">${escapeHtml(c.body)}</p></div>`;
    }).join('');
};

// --- CUSTOMER PROFILE (VIEW MODE / EDIT MODE) ---
const PROFILE_EDITABLE_IDS = ['prof-fname', 'prof-lname', 'prof-phone', 'prof-addr1', 'prof-city', 'prof-state', 'prof-zip'];

window.populateProfileForm = () => {
    const emailInput = document.getElementById('prof-email');
    if (emailInput) emailInput.value = sessionStorage.getItem('loggedInEmail') || '';
    const userId = String(sessionStorage.getItem('loggedInUserId'));
    const user = localUsers.find(u => String(u.id) === userId);
    if (!user) return;

    const fieldValues = {
        'prof-fname': user.firstName || '',
        'prof-lname': user.lastName || '',
        'prof-phone': window.formatMyPhoneDigits(user.phone || ''),
        'prof-addr1': user.addr1 || '',
        'prof-city': user.city || '',
        'prof-zip': user.zip || ''
    };
    Object.entries(fieldValues).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
    const extEl = document.getElementById('prof-phone-ext');
    if (extEl) extEl.value = '+60';
    window.setSelectValueCaseInsensitive(document.getElementById('prof-state'), user.state || '', '');
    const countryEl = document.getElementById('prof-country');
    if (countryEl) countryEl.value = 'Malaysia';
    window.bindMyPhoneInput(document.getElementById('prof-phone'));
};

window.toggleProfileEditMode = (isEditing) => {
    if (isEditing && (!sessionStorage.getItem('loggedInUserId') || sessionStorage.getItem('loggedInUserId') === 'null')) {
        return window.showToast('Please log in to edit your profile.', 'error');
    }
    PROFILE_EDITABLE_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !isEditing; });
    const passSec = document.getElementById('profile-password-section');
    if (passSec) passSec.style.display = isEditing ? 'block' : 'none';
    const editBtn = document.getElementById('profile-edit-btn');
    if (editBtn) editBtn.style.display = isEditing ? 'none' : 'inline-flex';
    const editActions = document.getElementById('profile-edit-actions');
    if (editActions) editActions.style.display = isEditing ? 'flex' : 'none';

    if (!isEditing) {
        ['prof-current-pass', 'prof-new-pass', 'prof-confirm-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        window.checkPasswordMatch();
        window.populateProfileForm();
    }
};

window.checkPasswordMatch = () => {
    const newPass = document.getElementById('prof-new-pass')?.value || '';
    const confirmPass = document.getElementById('prof-confirm-pass')?.value || '';
    const msg = document.getElementById('password-match-msg');
    const saveBtn = document.getElementById('profile-save-btn');
    if (!msg || !saveBtn) return;
    if (newPass || confirmPass) {
        if (newPass.length < 6) {
            msg.textContent = 'New password must be at least 6 characters'; msg.style.color = 'var(--danger)';
            saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed';
        } else if (newPass === confirmPass) {
            msg.textContent = 'Passwords match'; msg.style.color = 'var(--success)';
            saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer';
        } else {
            msg.textContent = 'Passwords do not match'; msg.style.color = 'var(--danger)';
            saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed';
        }
    } else {
        msg.textContent = ''; saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer';
    }
};

let isUpdatingProfile = false;

window.handleUpdateProfile = async (event) => {
    event.preventDefault();
    if (isUpdatingProfile) return;
    const userId = String(sessionStorage.getItem('loggedInUserId'));
    if (!userId || userId === 'null') return window.showToast('Session expired. Please log in again.', 'error');

    const zipVal = document.getElementById('prof-zip')?.value.trim() || '';
    const countryVal = document.getElementById('prof-country')?.value || 'Malaysia';
    const fnameVal = document.getElementById('prof-fname')?.value.trim() || '';
    if (!fnameVal) return window.showToast('First Name is required.', 'error');
    if (zipVal && countryVal === 'Malaysia' && !/^\d{5}$/.test(zipVal)) {
        return window.showToast('Please enter a valid 5-digit Malaysian postcode.', 'error');
    }

    const updatePayload = {
        id: userId,
        firstName: fnameVal,
        lastName: document.getElementById('prof-lname')?.value.trim() || '',
        phoneExt: document.getElementById('prof-phone-ext')?.value || '+60',
        phone: document.getElementById('prof-phone')?.value.trim() || '',
        addr1: document.getElementById('prof-addr1')?.value.trim() || '',
        city: document.getElementById('prof-city')?.value.trim() || '',
        state: document.getElementById('prof-state')?.value.trim() || '',
        zip: zipVal,
        country: countryVal,
        password: '',
        currentPassword: ''
    };

    const currentPass = document.getElementById('prof-current-pass')?.value || '';
    const newPass = document.getElementById('prof-new-pass')?.value || '';
    const confirmPass = document.getElementById('prof-confirm-pass')?.value || '';
    if (currentPass || newPass || confirmPass) {
        if (!currentPass || !newPass || !confirmPass) return window.showToast('Please fill out all 3 password fields to change your password.', 'error');
        if (newPass.length < 6) return window.showToast('New password must be at least 6 characters.', 'error');
        if (newPass !== confirmPass) return window.showToast('Your new passwords do not match.', 'error');
        updatePayload.password = newPass;
        updatePayload.currentPassword = currentPass;
    }

    const saveBtn = document.getElementById('profile-save-btn');
    const origText = saveBtn ? saveBtn.textContent : '';
    isUpdatingProfile = true;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
        const result = await apiCall('updateProfile', { user: updatePayload });
        if (result.success) {
            if (result.token) {
                sessionStorage.setItem('authToken', result.token);
                window.persistFileSession?.();
            }
            window.showToast('Profile successfully updated.');
            await fetchStoreData({ fetchCart: false });
            window.toggleProfileEditMode(false);
        } else {
            window.showToast(result.error || 'Failed to update profile.', 'error');
        }
    } finally {
        isUpdatingProfile = false;
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = origText; }
    }
};

window.initProfilePage = () => {
    document.querySelectorAll('.profile-auth-banner').forEach(el => el.remove());
    const userId = sessionStorage.getItem('loggedInUserId');
    if (!userId || userId === 'null') {
        const warn = document.createElement('div');
        warn.className = 'profile-auth-banner';
        warn.style.cssText = 'background:#fef3c7; border:1px solid #f59e0b; color:#92400e; padding:1rem; border-radius:8px; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;';
        warn.innerHTML = '<span>ℹ️ <strong>Preview Mode:</strong> Log in to view and edit your saved account details.</span> <a href="../Guest/login.html" class="btn" style="padding:0.4rem 1rem; font-size:0.85rem;">Login Now</a>';
        document.querySelector('main')?.prepend(warn);
    }
    window.populateProfileForm();
    window.toggleProfileEditMode(false);
    window.bindMyPhoneInput(document.getElementById('prof-phone'));
};

// --- FLOATING CUSTOMER SUPPORT CHAT WIDGET ---
let customerChatOpen = false;
let customerChatPollTimer = null;
let customerInquiryWatchTimer = null;
let activeCustomerChatInquiryId = null;

const getReplyingInquiries = () => {
    return localInquiries.filter(inq => String(inq.status) === 'Replying');
};

const ensureCustomerInquiryWatcher = () => {
    if (customerInquiryWatchTimer) return;
    customerInquiryWatchTimer = setInterval(async () => {
        const uid = sessionStorage.getItem('loggedInUserId');
        const acctType = (sessionStorage.getItem('accountType') || 'users').toLowerCase();
        if (!uid || uid === 'null' || acctType !== 'users') return;
        if (customerChatOpen) return;
        await fetchStoreData({ fetchCart: false });
        window.initCustomerSupportChat();
    }, 10000);
};

const renderCustomerChatMessages = (inquiry, messages) => {
    const body = document.getElementById('customer-chat-messages');
    const input = document.getElementById('customer-chat-input');
    const sendBtn = document.getElementById('customer-chat-send-btn');
    const endBtn = document.getElementById('customer-chat-end-btn');
    if (!body) return;

    if (!messages || messages.length === 0) {
        body.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:2rem 0.5rem;">Waiting for support staff messages...</div>';
    } else {
        body.innerHTML = messages.map(m => {
            const isStaff = (m.sender_type || m.sender_role) === 'staff';
            return `
                <div class="chat-bubble ${isStaff ? 'chat-bubble-staff' : 'chat-bubble-customer'}">
                    <div class="chat-bubble-meta">${escapeHtml(m.sender_name || (isStaff ? 'Support Staff' : 'You'))}</div>
                    <div>${escapeHtml(m.message)}</div>
                </div>
            `;
        }).join('');
        body.scrollTop = body.scrollHeight;
    }

    const isEnded = inquiry && inquiry.status === 'Ended';
    if (input) input.disabled = isEnded;
    if (sendBtn) sendBtn.disabled = isEnded;
    if (endBtn) endBtn.disabled = isEnded;
    if (isEnded && input) input.placeholder = 'This chat has ended.';
};

window.refreshCustomerChatMessages = async () => {
    if (!activeCustomerChatInquiryId) return;
    const res = await apiCall('getInquiryMessages', { inquiry_id: activeCustomerChatInquiryId });
    if (res.success) {
        renderCustomerChatMessages(res.inquiry, res.messages || []);
        if (res.inquiry && res.inquiry.status === 'Ended') {
            await fetchStoreData({ fetchCart: false });
            window.initCustomerSupportChat();
        }
    }
};

window.toggleCustomerChatPopup = async (forceState) => {
    customerChatOpen = typeof forceState === 'boolean' ? forceState : !customerChatOpen;
    const popup = document.getElementById('customer-chat-popup');
    if (popup) popup.style.display = customerChatOpen ? 'flex' : 'none';
    if (customerChatOpen) {
        await window.refreshCustomerChatMessages();
    }
};

window.sendCustomerChatReply = async (event) => {
    event?.preventDefault();
    const input = document.getElementById('customer-chat-input');
    const msg = input?.value.trim() || '';
    if (!msg || !activeCustomerChatInquiryId) return;
    input.value = '';
    const res = await apiCall('sendInquiryReply', { inquiry_id: activeCustomerChatInquiryId, message: msg });
    if (res.success) {
        await window.refreshCustomerChatMessages();
    } else {
        window.showToast(res.error || 'Could not send message.', 'error');
    }
};

window.endCustomerChat = async () => {
    if (!activeCustomerChatInquiryId) return;
    const res = await apiCall('endInquiryChat', { inquiry_id: activeCustomerChatInquiryId });
    if (res.success) {
        window.showToast('Support chat ended.');
        customerChatOpen = false;
        if (customerChatPollTimer) { clearInterval(customerChatPollTimer); customerChatPollTimer = null; }
        await fetchStoreData({ fetchCart: false });
        window.initCustomerSupportChat();
    } else {
        window.showToast(res.error || 'Failed to end chat.', 'error');
    }
};

window.switchCustomerChatThread = async (inqId) => {
    activeCustomerChatInquiryId = String(inqId);
    await window.refreshCustomerChatMessages();
};

window.initCustomerSupportChat = () => {
    const uid = sessionStorage.getItem('loggedInUserId');
    const acctType = (sessionStorage.getItem('accountType') || 'users').toLowerCase();
    const existingRoot = document.getElementById('customer-chat-widget-root');
    if (!uid || uid === 'null' || acctType !== 'users') {
        if (existingRoot) existingRoot.remove();
        if (customerInquiryWatchTimer) { clearInterval(customerInquiryWatchTimer); customerInquiryWatchTimer = null; }
        return;
    }

    ensureCustomerInquiryWatcher();

    const replyingList = getReplyingInquiries();
    if (replyingList.length === 0) {
        activeCustomerChatInquiryId = null;
        if (existingRoot) existingRoot.remove();
        if (customerChatPollTimer) { clearInterval(customerChatPollTimer); customerChatPollTimer = null; }
        return;
    }

    if (!activeCustomerChatInquiryId || !replyingList.some(x => String(x.id) === String(activeCustomerChatInquiryId))) {
        activeCustomerChatInquiryId = String(replyingList[0].id);
    }
    const activeInq = replyingList.find(x => String(x.id) === String(activeCustomerChatInquiryId)) || replyingList[0];

    let root = existingRoot;
    if (!root) {
        root = document.createElement('div');
        root.id = 'customer-chat-widget-root';
        root.innerHTML = `
            <button type="button" id="customer-chat-fab" class="chat-fab" title="Chat with Staff" onclick="window.toggleCustomerChatPopup()">
                💬
                <span id="customer-chat-fab-badge" class="chat-fab-badge">${replyingList.length}</span>
            </button>
            <div id="customer-chat-popup" class="chat-popup" style="display: none;">
                <div class="chat-sticky-header">
                    <div style="min-width: 0; flex: 1;">
                        <strong style="font-size: 0.95rem; display: block;">💬 Staff Support</strong>
                        <small style="color: #94a3b8; font-size: 0.72rem;">Live inquiry conversation</small>
                        <select id="customer-chat-thread-select" onchange="window.switchCustomerChatThread(this.value)" style="display:none; margin-top:0.35rem; width:100%; padding:0.2rem 0.4rem; font-size:0.75rem; border-radius:6px;"></select>
                    </div>
                    <button type="button" id="customer-chat-end-btn" class="chat-end-btn" onclick="window.endCustomerChat()">End Chat</button>
                </div>
                <div id="customer-chat-messages" class="chat-messages"></div>
                <form class="chat-input-bar" onsubmit="window.sendCustomerChatReply(event)">
                    <input type="text" id="customer-chat-input" placeholder="Type your reply..." style="flex: 1; padding: 0.55rem 0.75rem;" required>
                    <button type="submit" id="customer-chat-send-btn" class="btn" style="padding: 0.55rem 0.9rem; font-size: 0.85rem;">Send</button>
                </form>
            </div>
        `;
        document.body.appendChild(root);
    }

    const badgeEl = document.getElementById('customer-chat-fab-badge');
    if (badgeEl) badgeEl.textContent = String(replyingList.length);

    const threadSel = document.getElementById('customer-chat-thread-select');
    if (threadSel) {
        if (replyingList.length > 1) {
            threadSel.style.display = 'block';
            threadSel.innerHTML = replyingList.map(inq =>
                `<option value="${inq.id}" ${String(inq.id) === String(activeInq.id) ? 'selected' : ''}>#${inq.id}: ${escapeHtml(String(inq.message || '').slice(0, 28))}</option>`
            ).join('');
        } else {
            threadSel.style.display = 'none';
        }
    }

    const popup = document.getElementById('customer-chat-popup');
    if (popup) popup.style.display = customerChatOpen ? 'flex' : 'none';

    const localMsgs = localInquiryMessages.filter(m => String(m.inquiry_id) === String(activeInq.id));
    renderCustomerChatMessages(activeInq, localMsgs);

    if (!customerChatPollTimer) {
        customerChatPollTimer = setInterval(() => {
            if (customerChatOpen) window.refreshCustomerChatMessages();
        }, 4000);
    }
};
