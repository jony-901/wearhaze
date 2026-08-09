/* ═══════════════════════════════════════════════════════
   HAZE — admin.js  |  Full Admin Panel Logic (Async)
   ═══════════════════════════════════════════════════════ */

/* ── UTILS ────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const el = document.getElementById('admin-toast');
  el.textContent = msg;
  el.className = `admin-toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}
function statusBadge(status) {
  const labels = { pending:'Pending', processing:'Processing', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled' };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}
function tagBadge(tag) {
  if (!tag) return '';
  return `<span class="badge badge-${tag.toLowerCase()}">${tag}</span>`;
}
function confirmDel(msg) { return window.confirm(msg || 'Are you sure?'); }

/* ── TIME ─────────────────────────────────────────────── */
function updateTime() {
  const el = document.getElementById('header-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
setInterval(updateTime, 1000);
updateTime();

/* ── AUTH ─────────────────────────────────────────────── */
function checkAuth() {
  if (HazeDB.isAdminLoggedIn()) showApp();
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const pass = document.getElementById('login-pass').value;
  // Use HazeDB.loginUser with the admin email
  const res = await HazeDB.loginUser(HazeDB.ADMIN_EMAIL, pass);
  if (res && res.ok && HazeDB.isAdminLoggedIn()) {
    showApp();
  } else {
    document.getElementById('login-error').style.display = 'block';
    setTimeout(() => document.getElementById('login-error').style.display = 'none', 3000);
  }
});
document.getElementById('login-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  HazeDB.adminLogout();
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
});

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'block';
  const settings = await HazeDB.getSettings();
  document.getElementById('sidebar-store-info').textContent = (settings.storeName || 'HAZE') + '\n' + (settings.email || '');
  await updatePendingBadge();
  navigateTo('dashboard');
}

async function updatePendingBadge() {
  const orders = await HazeDB.getOrders();
  const pending = orders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('sidebar-pending-count');
  badge.textContent = pending;
  badge.style.display = pending > 0 ? 'inline' : 'none';
}

/* ── NAVIGATION ───────────────────────────────────────── */
document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
  link.addEventListener('click', () => navigateTo(link.dataset.page));
});

async function navigateTo(page) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('active');

  const titles = { dashboard:'Dashboard', orders:'Orders', products:'Products', settings:'Settings' };
  document.getElementById('page-title').textContent = titles[page] || page;

  const content = document.getElementById('admin-content');
  content.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--ash)">Loading...</div>';

  if (page === 'dashboard') await renderDashboard();
  else if (page === 'orders') await renderOrders();
  else if (page === 'products') await renderProducts();
  else if (page === 'settings') await renderSettings();
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */
async function renderDashboard() {
  const analytics = await HazeDB.getAnalytics();
  const content = document.getElementById('admin-content');

  content.innerHTML = `
    <!-- STAT CARDS -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-card-icon">💰</div>
        <div class="stat-card-label">Total Revenue</div>
        <div class="stat-card-value">৳ ${analytics.totalRevenue.toLocaleString()}</div>
        <div class="stat-card-sub">All time</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📦</div>
        <div class="stat-card-label">Total Orders</div>
        <div class="stat-card-value">${analytics.totalOrders}</div>
        <div class="stat-card-sub">${analytics.pendingOrders} pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">👕</div>
        <div class="stat-card-label">Products</div>
        <div class="stat-card-value">${analytics.totalProducts}</div>
        <div class="stat-card-sub">${analytics.totalStock} in stock</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">✅</div>
        <div class="stat-card-label">Delivered</div>
        <div class="stat-card-value">${analytics.deliveredOrders}</div>
        <div class="stat-card-sub">orders completed</div>
      </div>
    </div>

    <!-- REVENUE CHART + TOP PRODUCTS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">

      <!-- Chart -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Revenue — Last 7 Days</div>
        </div>
        <div class="panel-body">
          <div class="chart-container" id="revenue-chart"></div>
        </div>
      </div>

      <!-- Top Products -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Top Products</div>
        </div>
        <div class="panel-body" style="padding:0">
          <table class="admin-table">
            <thead>
              <tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody id="top-products-body"></tbody>
          </table>
          ${analytics.topProducts.length === 0 ? '<div style="padding:2rem;text-align:center;color:var(--smoke)">No sales yet</div>' : ''}
        </div>
      </div>
    </div>

    <!-- RECENT ORDERS -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Recent Orders</div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('orders')">View All</button>
      </div>
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead>
            <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr>
          </thead>
          <tbody id="recent-orders-body"></tbody>
        </table>
        ${analytics.recentOrders.length === 0 ? '<div style="padding:2rem;text-align:center;color:var(--smoke)">No orders yet — share your store!</div>' : ''}
      </div>
    </div>
  `;

  // Render chart
  const maxRevenue = Math.max(...analytics.revenueByDay.map(d => d.revenue), 1);
  document.getElementById('revenue-chart').innerHTML = analytics.revenueByDay.map(d => `
    <div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${Math.max(4, (d.revenue / maxRevenue) * 160)}px">
        ${d.revenue > 0 ? `<div class="chart-bar-val">৳${d.revenue}</div>` : ''}
      </div>
      <div class="chart-label">${d.day}</div>
    </div>
  `).join('');

  // Top products
  const tpBody = document.getElementById('top-products-body');
  if (tpBody) {
    tpBody.innerHTML = analytics.topProducts.map(p => `
      <tr>
        <td class="td-bold">${p.name}</td>
        <td>${p.qty}</td>
        <td class="td-accent">৳ ${p.revenue.toLocaleString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--smoke)">—</td></tr>';
  }

  // Recent orders
  const roBody = document.getElementById('recent-orders-body');
  if (roBody) {
    roBody.innerHTML = analytics.recentOrders.map(o => `
      <tr>
        <td class="td-bold">${o.orderId}</td>
        <td>${o.customer.name}<br><small style="color:var(--smoke)">${o.customer.phone}</small></td>
        <td>${o.items.length} item${o.items.length > 1 ? 's' : ''}</td>
        <td class="td-accent">৳ ${o.total.toLocaleString()}</td>
        <td>${statusBadge(o.status)}</td>
        <td style="white-space:nowrap">${fmtDateShort(o.createdAt)}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="showOrderDetail('${o.orderId}')">View</button></td>
      </tr>
    `).join('');
  }
}

/* ══════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════ */
async function renderOrders(filterStatus = 'all', searchQuery = '') {
  const content = document.getElementById('admin-content');
  let orders = await HazeDB.getOrders();

  if (filterStatus !== 'all') orders = orders.filter(o => o.status === filterStatus);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    orders = orders.filter(o =>
      o.orderId.toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.phone.includes(q)
    );
  }

  content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">All Orders (${orders.length})</div>
        <div style="display:flex;gap:0.8rem;flex-wrap:wrap;align-items:center">
          <div class="admin-search">
            <span>🔍</span>
            <input type="text" id="order-search" placeholder="Name, phone, order ID" value="${searchQuery}">
          </div>
          <select class="status-select" id="order-filter">
            <option value="all" ${filterStatus==='all'?'selected':''}>All Status</option>
            <option value="pending" ${filterStatus==='pending'?'selected':''}>Pending</option>
            <option value="processing" ${filterStatus==='processing'?'selected':''}>Processing</option>
            <option value="shipped" ${filterStatus==='shipped'?'selected':''}>Shipped</option>
            <option value="delivered" ${filterStatus==='delivered'?'selected':''}>Delivered</option>
            <option value="cancelled" ${filterStatus==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th><th>Customer</th><th>Items</th>
              <th>Total</th><th>Payment</th><th>Status</th>
              <th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="orders-tbody"></tbody>
        </table>
        ${orders.length === 0 ? '<div style="padding:3rem;text-align:center;color:var(--smoke)">No orders found</div>' : ''}
      </div>
    </div>
  `;

  // Events
  document.getElementById('order-search').addEventListener('input', e => {
    renderOrders(document.getElementById('order-filter').value, e.target.value);
  });
  document.getElementById('order-filter').addEventListener('change', e => {
    renderOrders(e.target.value, document.getElementById('order-search').value);
  });

  // Table rows
  const tbody = document.getElementById('orders-tbody');
  if (tbody && orders.length > 0) {
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td class="td-bold">${o.orderId}</td>
        <td>
          <div style="font-weight:600">${o.customer.name}</div>
          <div style="font-size:0.75rem;color:var(--smoke)">${o.customer.phone}</div>
        </td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${o.items.map(i => `<img src="${i.image}" title="${i.name} (${i.size}×${i.qty})" style="width:32px;height:32px;object-fit:cover;border:1px solid rgba(107,79,160,0.2)">`).join('')}
          </div>
        </td>
        <td class="td-accent">৳ ${o.total.toLocaleString()}</td>
        <td style="text-transform:capitalize">${o.paymentMethod}</td>
        <td>
          <select class="status-select" onchange="updateStatus('${o.orderId}', this.value)">
            ${['pending','processing','shipped','delivered','cancelled'].map(s =>
              `<option value="${s}" ${o.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
            ).join('')}
          </select>
        </td>
        <td style="white-space:nowrap;font-size:0.8rem">${fmtDateShort(o.createdAt)}</td>
        <td>
          <div style="display:flex;gap:0.4rem">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="showOrderDetail('${o.orderId}')" title="View">👁</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteOrder('${o.orderId}')" title="Delete">✕</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

async function updateStatus(orderId, status) {
  await HazeDB.updateOrderStatus(orderId, status, 'Status updated by admin');
  await updatePendingBadge();
  toast(`Order ${orderId} → ${status}`);
}

async function deleteOrder(orderId) {
  if (!confirmDel(`Delete order ${orderId}?`)) return;
  await HazeDB.deleteOrder(orderId);
  toast('Order deleted', 'error');
  await updatePendingBadge();
  await renderOrders();
}

async function showOrderDetail(orderId) {
  const order = await HazeDB.getOrder(orderId);
  if (!order) return;

  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-header">
        <div class="admin-modal-title">Order — ${order.orderId}</div>
        <div class="admin-modal-close" onclick="this.closest('.admin-modal-overlay').remove()">✕</div>
      </div>
      <div class="admin-modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
          <div>
            <div style="font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:0.4rem">Customer</div>
            <div style="font-weight:600">${order.customer.name}</div>
            <div style="color:var(--ash);font-size:0.85rem">${order.customer.phone}</div>
            ${order.customer.email ? `<div style="color:var(--ash);font-size:0.85rem">${order.customer.email}</div>` : ''}
          </div>
          <div>
            <div style="font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:0.4rem">Delivery</div>
            <div style="color:var(--ash);font-size:0.85rem;line-height:1.6">${order.customer.address}, ${order.customer.city}, ${order.customer.district} ${order.customer.zip || ''}</div>
          </div>
          <div>
            <div style="font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:0.4rem">Payment</div>
            <div style="text-transform:capitalize;font-weight:600">${order.paymentMethod}</div>
            ${order.customer.trxid ? `<div style="color:var(--ash);font-size:0.8rem">TrxID: ${order.customer.trxid}</div>` : ''}
          </div>
          <div>
            <div style="font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:0.4rem">Status</div>
            ${statusBadge(order.status)}
          </div>
        </div>

        ${order.customer.notes ? `<div style="background:rgba(0,0,0,0.2);padding:0.8rem;margin-bottom:1rem;font-size:0.85rem;color:var(--ash)">📝 ${order.customer.notes}</div>` : ''}

        <div style="font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:0.8rem">Items</div>
        ${order.items.map(i => `
          <div style="display:flex;align-items:center;gap:1rem;padding:0.7rem 0;border-bottom:1px solid rgba(107,79,160,0.1)">
            <img src="${i.image}" style="width:48px;height:48px;object-fit:cover;border:1px solid rgba(107,79,160,0.2)">
            <div style="flex:1">
              <div style="font-weight:600">${i.name}</div>
              <div style="font-size:0.8rem;color:var(--ash)">Size: ${i.size} × ${i.qty}</div>
            </div>
            <div style="font-weight:700;color:var(--accent)">৳ ${(i.price * i.qty).toLocaleString()}</div>
          </div>
        `).join('')}
        <div style="display:flex;justify-content:space-between;padding:0.7rem 0;border-bottom:1px solid rgba(107,79,160,0.1);font-size:0.85rem;color:var(--ash)"><span>Subtotal</span><span>৳ ${order.subtotal.toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:0.7rem 0;font-size:0.85rem;color:var(--ash)"><span>Shipping</span><span>৳ ${order.shipping}</span></div>
        <div style="display:flex;justify-content:space-between;padding:0.7rem 0;font-weight:700;font-size:1rem;color:var(--ghost)"><span>Total</span><span>৳ ${order.total.toLocaleString()}</span></div>

        <div style="margin-top:1rem">
          <div style="font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:0.6rem">Update Status</div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            ${['processing','shipped','delivered','cancelled'].map(s => `
              <button class="btn btn-sm ${order.status===s?'btn-primary':'btn-secondary'}" onclick="updateStatus('${order.orderId}','${s}');this.closest('.admin-modal-overlay').remove();renderOrders()">
                ${s.charAt(0).toUpperCase()+s.slice(1)}
              </button>`).join('')}
          </div>
        </div>
      </div>
      <div class="admin-modal-footer">
        <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order.orderId}');this.closest('.admin-modal-overlay').remove()">Delete Order</button>
        <button class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ══════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════ */
async function renderProducts() {
  const products = await HazeDB.getProducts();
  const content = document.getElementById('admin-content');

  content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Products (${products.length})</div>
        <button class="btn btn-primary" onclick="showProductModal()">+ Add Product</button>
      </div>
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th><th>Name</th><th>Category</th>
              <th>Price (৳)</th><th>Stock</th><th>Tag</th><th>Featured</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="products-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById('products-tbody');
  if (tbody) {
    tbody.innerHTML = products.map(p => `
      <tr>
        <td><img class="product-thumb" src="${p.image}" alt="${p.name}"></td>
        <td>
          <div class="td-bold">${p.name}</div>
          <div style="font-size:0.75rem;color:var(--smoke)">${p.id}</div>
        </td>
        <td style="text-transform:capitalize">${p.category}</td>
        <td class="td-accent">৳ ${p.price.toLocaleString()}</td>
        <td>
          <span style="color:${p.stock < 5 ? 'var(--danger)' : p.stock < 20 ? 'var(--warning)' : 'var(--success)'};font-weight:600">${p.stock}</span>
        </td>
        <td>${tagBadge(p.tag)}</td>
        <td style="text-align:center">${p.featured ? '⭐' : '—'}</td>
        <td>
          <div style="display:flex;gap:0.4rem">
            <button class="btn btn-secondary btn-sm" onclick="showProductModal('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteProduct('${p.id}')">✕</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

async function showProductModal(productId = null) {
  const product = productId ? await HazeDB.getProduct(productId) : null;
  const isEdit = !!product;
  const p = product || { id:'', name:'', description:'', price:'', priceUSD:'', image:'', category:'tops', tag:'', sizes:'S,M,L,XL', stock:'', featured:false };

  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-header">
        <div class="admin-modal-title">${isEdit ? 'Edit Product' : 'Add Product'}</div>
        <div class="admin-modal-close" onclick="this.closest('.admin-modal-overlay').remove()">✕</div>
      </div>
      <div class="admin-modal-body">
        <div class="admin-form">
          <div class="admin-form-row">
            <div class="form-field">
              <label>Product Name *</label>
              <input type="text" id="pf-name" value="${p.name}" placeholder="e.g. Oversized Tee">
            </div>
            <div class="form-field">
              <label>Category *</label>
              <select id="pf-category">
                <option value="tops" ${p.category==='tops'?'selected':''}>Tops</option>
                <option value="bottoms" ${p.category==='bottoms'?'selected':''}>Bottoms</option>
                <option value="accessories" ${p.category==='accessories'?'selected':''}>Accessories</option>
                <option value="outerwear" ${p.category==='outerwear'?'selected':''}>Outerwear</option>
              </select>
            </div>
          </div>
          <div class="form-field form-field-full">
            <label>Description</label>
            <textarea id="pf-desc" rows="2">${p.description}</textarea>
          </div>
          <div class="admin-form-row">
            <div class="form-field">
              <label>Price (৳) *</label>
              <input type="number" id="pf-price" value="${p.price}" placeholder="850">
            </div>
            <div class="form-field">
              <label>Price (USD)</label>
              <input type="number" id="pf-usd" value="${p.priceUSD}" placeholder="8">
            </div>
          </div>
          <div class="admin-form-row">
            <div class="form-field">
              <label>Stock</label>
              <input type="number" id="pf-stock" value="${p.stock}" placeholder="50">
            </div>
            <div class="form-field">
              <label>Tag</label>
              <select id="pf-tag">
                <option value="" ${!p.tag?'selected':''}>None</option>
                <option value="New" ${p.tag==='New'?'selected':''}>New</option>
                <option value="Popular" ${p.tag==='Popular'?'selected':''}>Popular</option>
                <option value="Limited" ${p.tag==='Limited'?'selected':''}>Limited</option>
              </select>
            </div>
          </div>
          <div class="form-field form-field-full">
            <label>Product Image</label>
            <div class="img-upload-area" id="img-upload-area" onclick="document.getElementById('pf-image-file').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleImgDrop(event)">
              <div id="img-upload-placeholder">
                <div style="font-size:2rem;margin-bottom:0.5rem">📷</div>
                <div style="font-size:0.85rem;color:var(--ash)">Click or drag image here to upload</div>
                <div style="font-size:0.7rem;color:var(--smoke);margin-top:0.3rem">JPG, PNG, WebP — max 5MB</div>
              </div>
              <img id="img-preview" src="${p.image || ''}" style="display:${p.image ? 'block' : 'none'};max-height:180px;max-width:100%;object-fit:contain;margin:auto">
            </div>
            <input type="file" id="pf-image-file" accept="image/*" style="display:none" onchange="uploadProductImage(this)">
            <div id="img-upload-status" style="font-size:0.75rem;margin-top:0.4rem;color:var(--accent)"></div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem">
              <div style="flex:1;height:1px;background:rgba(107,79,160,0.15)"></div>
              <span style="font-size:0.7rem;color:var(--smoke)">or paste URL</span>
              <div style="flex:1;height:1px;background:rgba(107,79,160,0.15)"></div>
            </div>
            <input type="text" id="pf-image" value="${p.image}" placeholder="https://... or images/product.png" style="margin-top:0.5rem">
          </div>
          <div class="form-field form-field-full">
            <label>Available Sizes (comma separated)</label>
            <input type="text" id="pf-sizes" value="${Array.isArray(p.sizes) ? p.sizes.join(',') : p.sizes}" placeholder="S,M,L,XL or One Size">
          </div>
          <div class="form-field form-field-full">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
              <input type="checkbox" id="pf-featured" ${p.featured?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)">
              Show as Featured on Homepage
            </label>
          </div>
        </div>
      </div>
      <div class="admin-modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveProduct('${productId || ''}')">
          ${isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Image URL input preview
  document.getElementById('pf-image').addEventListener('input', e => {
    const preview = document.getElementById('img-preview');
    const placeholder = document.getElementById('img-upload-placeholder');
    if (e.target.value) {
      preview.src = e.target.value;
      preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      preview.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function uploadProductImage(input) {
  const file = input.files[0];
  if (!file) return;
  _doImageUpload(file);
}

function handleImgDrop(event) {
  event.preventDefault();
  document.getElementById('img-upload-area').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) _doImageUpload(file);
}

async function _doImageUpload(file) {
  const status = document.getElementById('img-upload-status');
  const preview = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-upload-placeholder');
  status.textContent = '⏳ Uploading...';
  status.style.color = 'var(--accent)';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('api.php?action=upload_image', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('pf-image').value = data.url;
      preview.src = data.url;
      preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      status.textContent = '✓ Image uploaded!';
      status.style.color = 'var(--success)';
    } else {
      status.textContent = '✕ ' + (data.error || 'Upload failed');
      status.style.color = 'var(--danger)';
    }
  } catch (e) {
    status.textContent = '✕ Upload error';
    status.style.color = 'var(--danger)';
  }
}

async function saveProduct(productId) {
  const name = document.getElementById('pf-name').value.trim();
  const price = parseInt(document.getElementById('pf-price').value);
  if (!name || !price) { toast('Name and price are required', 'error'); return; }

  const data = {
    name,
    description: document.getElementById('pf-desc').value.trim(),
    price,
    priceUSD: parseInt(document.getElementById('pf-usd').value) || 0,
    image: document.getElementById('pf-image').value.trim(),
    category: document.getElementById('pf-category').value,
    tag: document.getElementById('pf-tag').value,
    sizes: document.getElementById('pf-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
    stock: parseInt(document.getElementById('pf-stock').value) || 0,
    featured: document.getElementById('pf-featured').checked
  };

  if (productId) {
    await HazeDB.updateProduct(productId, data);
    toast('Product updated!');
  } else {
    await HazeDB.addProduct({ ...data, id: 'haze-' + Date.now() });
    toast('Product added!');
  }
  document.querySelector('.admin-modal-overlay').remove();
  await renderProducts();
}

async function deleteProduct(id) {
  if (!confirmDel('Delete this product?')) return;
  await HazeDB.deleteProduct(id);
  toast('Product deleted', 'error');
  await renderProducts();
}

/* ══════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════ */
async function renderSettings() {
  const s = await HazeDB.getSettings();
  const content = document.getElementById('admin-content');

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">

      <!-- Store Info -->
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Store Information</div></div>
        <div class="panel-body">
          <div class="admin-form">
            <div class="form-field"><label>Store Name</label><input type="text" id="s-name" value="${s.storeName || ''}"></div>
            <div class="form-field"><label>Tagline</label><input type="text" id="s-tagline" value="${s.tagline || ''}"></div>
            <div class="form-field"><label>Email</label><input type="email" id="s-email" value="${s.email || ''}"></div>
            <div class="form-field"><label>Phone</label><input type="text" id="s-phone" value="${s.phone || ''}"></div>
            <button class="btn btn-primary" onclick="saveStoreSettings()">Save Store Info</button>
          </div>
        </div>
      </div>

      <!-- Payment -->
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Payment Numbers</div></div>
        <div class="panel-body">
          <div class="admin-form">
            <div class="form-field"><label>bKash Number</label><input type="text" id="s-bkash" value="${s.bkash || ''}" placeholder="01XXXXXXXXX"></div>
            <div class="form-field"><label>Nagad Number</label><input type="text" id="s-nagad" value="${s.nagad || ''}" placeholder="01XXXXXXXXX"></div>
            <button class="btn btn-primary" onclick="savePaymentSettings()">Save Payment Info</button>
          </div>
        </div>
      </div>

      <!-- Social Links -->
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Social Media</div></div>
        <div class="panel-body">
          <div class="admin-form">
            <div class="form-field"><label>Instagram URL</label><input type="url" id="s-ig" value="${s.instagram || ''}"></div>
            <div class="form-field"><label>Facebook URL</label><input type="url" id="s-fb" value="${s.facebook || ''}"></div>
            <div class="form-field"><label>TikTok URL</label><input type="url" id="s-tt" value="${s.tiktok || ''}"></div>
            <button class="btn btn-primary" onclick="saveSocialSettings()">Save Social Links</button>
          </div>
        </div>
      </div>

    </div>
  `;
}

async function saveStoreSettings() {
  await HazeDB.updateSettings({
    storeName: document.getElementById('s-name').value,
    tagline: document.getElementById('s-tagline').value,
    email: document.getElementById('s-email').value,
    phone: document.getElementById('s-phone').value
  });
  document.getElementById('sidebar-store-info').textContent = document.getElementById('s-name').value + '\n' + document.getElementById('s-email').value;
  toast('Store info saved!');
}
async function savePaymentSettings() {
  await HazeDB.updateSettings({ bkash: document.getElementById('s-bkash').value, nagad: document.getElementById('s-nagad').value });
  toast('Payment info saved!');
}
async function saveSocialSettings() {
  await HazeDB.updateSettings({ instagram: document.getElementById('s-ig').value, facebook: document.getElementById('s-fb').value, tiktok: document.getElementById('s-tt').value });
  toast('Social links saved!');
}

/* ── BOOT ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', checkAuth);
