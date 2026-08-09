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

/* ── PENDING BADGE ────────────────────────────────────── */
async function updatePendingBadge() {
  try {
    const orders = (await HazeDB.getOrders()) || [];
    const pending = orders.filter(o => o.status === 'pending').length;
    const badge = document.getElementById('sidebar-pending-count');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? 'inline' : 'none';
    }
  } catch(e) {}
}



/* ── NAVIGATION SETUP (safe for any load order) ─────── */
function initSidebarNav() {
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarNav);
} else {
  initSidebarNav();
}


async function navigateTo(page) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('active');

  const titles = { dashboard:'Dashboard', orders:'Orders', products:'Products', coupons:'🏷️ Coupons', settings:'Settings' };
  document.getElementById('page-title').textContent = titles[page] || page;

  const content = document.getElementById('admin-content');
  content.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--ash)">Loading...</div>';

  try {
    if (page === 'dashboard') await renderDashboard();
    else if (page === 'orders')   await renderOrders();
    else if (page === 'products') await renderProducts();
    else if (page === 'coupons')  await renderCoupons();
    else if (page === 'settings') await renderSettings();
  } catch (err) {
    console.error('Page render error:', err);
    content.innerHTML = `
      <div style="padding:3rem 1.5rem;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:0.5rem">⚠️</div>
        <div style="font-size:1.1rem;color:var(--ghost);font-weight:700">Error loading ${page}</div>
        <div style="font-size:0.85rem;color:var(--smoke);margin-top:0.4rem">${err.message || 'Database error'}</div>
        <button class="btn btn-primary" onclick="navigateTo('${page}')" style="margin-top:1.2rem">Retry</button>
      </div>
    `;
  }
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */
async function renderDashboard() {
  const analytics = await HazeDB.getAnalytics();
  // Also directly get product count to ensure accuracy
  try {
    const allProducts = await HazeDB.getProducts();
    analytics.totalProducts = allProducts.length;
    analytics.totalStock = allProducts.reduce((s, p) => s + (parseInt(p.stock) || 0), 0);
  } catch(e) {}
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
      <div class="stat-card" onclick="navigateTo('products')" style="cursor:pointer">
        <div class="stat-card-icon">👕</div>
        <div class="stat-card-label">Products</div>
        <div class="stat-card-value" id="dash-product-count">${analytics.totalProducts}</div>
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

  document.getElementById('order-search').addEventListener('input', e => {
    renderOrders(document.getElementById('order-filter').value, e.target.value);
  });
  document.getElementById('order-filter').addEventListener('change', e => {
    renderOrders(e.target.value, document.getElementById('order-search').value);
  });

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
        ${products.length === 0 ? '<div style="padding:3rem;text-align:center;color:var(--smoke)">No products yet. Click "+ Add Product" to get started!</div>' : ''}
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
  const p = productId ? await HazeDB.getProduct(productId) : {
    name:'', description:'', price:'', originalPrice:'', image:'',
    category:'tops', tag:'', sizes:['S','M','L','XL'], stock:50, featured:false
  };
  const isEdit = !!productId;

  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" style="max-width:640px">
      <div class="admin-modal-header">
        <div class="admin-modal-title">${isEdit ? 'Edit Product' : 'Add New Product'}</div>
        <button class="modal-close" onclick="this.closest('.admin-modal-overlay').remove()">✕</button>
      </div>
      <div class="admin-modal-body">
        <div class="admin-form">
          <div class="admin-form-row">
            <div class="form-field">
              <label>Product Name *</label>
              <input type="text" id="pf-name" value="${p.name}" placeholder="e.g. Oversized Tee">
            </div>
            <div class="form-field">
              <label>Category</label>
              <select id="pf-category" onchange="toggleCustomCategory(this)">
                <option value="tops" ${p.category==='tops'?'selected':''}>Tops (Tees, Hoodies)</option>
                <option value="bottoms" ${p.category==='bottoms'?'selected':''}>Bottoms (Pants, Cargo)</option>
                <option value="accessories" ${p.category==='accessories'?'selected':''}>Accessories (Caps, Bags)</option>
                <option value="outerwear" ${p.category==='outerwear'?'selected':''}>Outerwear (Jackets, Coats)</option>
                <option value="footwear" ${p.category==='footwear'?'selected':''}>Footwear (Shoes, Sneakers)</option>
                <option value="custom" ${!['tops','bottoms','accessories','outerwear','footwear'].includes(p.category)?'selected':''}>Custom (নিজে লিখুন)</option>
              </select>
              <input type="text" id="pf-category-custom"
                style="margin-top:0.4rem;display:${!['tops','bottoms','accessories','outerwear','footwear'].includes(p.category)?'block':'none'}"
                value="${!['tops','bottoms','accessories','outerwear','footwear'].includes(p.category)?p.category:'"}"
                placeholder="Custom category লিখুন (e.g. Joggers)">
            </div>
          </div>
          <div class="form-field form-field-full">
            <label>Description</label>
            <textarea id="pf-desc" rows="2">${p.description || ''}</textarea>
          </div>
          <div class="admin-form-row">
            <div class="form-field">
              <label>Selling Price (৳) * — বিক্রি মূল্য</label>
              <input type="number" id="pf-price" value="${p.price}" placeholder="850">
            </div>
            <div class="form-field">
              <label>Original / Regular Price (৳) — ছাড় দেখাতে</label>
              <input type="number" id="pf-original-price" value="${p.originalPrice || ''}" placeholder="e.g. 1200">
            </div>
          </div>
          <div class="admin-form-row">
            <div class="form-field">
              <label>Stock Quantity</label>
              <input type="number" id="pf-stock" value="${p.stock}" placeholder="50">
            </div>
            <div class="form-field">
              <label>Tag / Badge</label>
              <select id="pf-tag">
                <option value="" ${!p.tag?'selected':''}>None</option>
                <option value="New" ${p.tag==='New'?'selected':''}>New</option>
                <option value="Popular" ${p.tag==='Popular'?'selected':''}>Popular</option>
                <option value="Limited" ${p.tag==='Limited'?'selected':''}>Limited</option>
                <option value="Sale" ${p.tag==='Sale'?'selected':''}>Sale</option>
              </select>
            </div>
          </div>

          <!-- PHOTO UPLOAD SECTION -->
          <div class="form-field form-field-full" style="background:rgba(139,92,246,0.05);padding:1rem;border:1px solid rgba(139,92,246,0.2);border-radius:6px">
            <label style="font-weight:700;color:var(--ghost)">📸 Product Photo — ছবি আপলোড</label>
            <p style="font-size:0.75rem;color:var(--ash);margin-top:0.2rem;margin-bottom:0.8rem">গ্যালারি বা কম্পিউটার থেকে ছবি সিলেক্ট করুন:</p>

            <button type="button" class="btn btn-primary" onclick="document.getElementById('pf-image-file').click()" style="width:100%;padding:0.8rem;font-weight:600;letter-spacing:0.1em">
              📁 Choose Photo File from Device
            </button>
            <input type="file" id="pf-image-file" accept="image/jpeg,image/png,image/webp,image/gif,image/jpg" style="display:none" onchange="uploadProductImage(this)">

            <div id="img-upload-status" style="font-size:0.8rem;margin-top:0.6rem;min-height:1.2em;font-weight:600"></div>

            <div id="img-preview-box" style="margin-top:0.8rem;text-align:center;${p.image ? '' : 'display:none'}">
              <img id="img-preview" src="${p.image || ''}" style="max-height:160px;max-width:100%;object-fit:contain;border:1px solid rgba(139,92,246,0.3);border-radius:4px">
            </div>

            <div style="margin-top:1rem;font-size:0.75rem;color:var(--smoke)">অথবা ছবির Link paste করুন:</div>
            <input type="text" id="pf-image" value="${p.image || ''}" placeholder="https://... অথবা uploads/products/..." style="margin-top:0.3rem">
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
    const previewBox = document.getElementById('img-preview-box');
    const preview = document.getElementById('img-preview');
    if (e.target.value) {
      preview.src = e.target.value;
      previewBox.style.display = 'block';
    } else {
      previewBox.style.display = 'none';
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function uploadProductImage(input) {
  const file = input.files[0];
  if (!file) return;
  _doImageUpload(file);
}

async function _doImageUpload(file) {
  const status = document.getElementById('img-upload-status');
  const previewBox = document.getElementById('img-preview-box');
  const preview = document.getElementById('img-preview');
  status.textContent = '⏳ Uploading photo...';
  status.style.color = 'var(--accent)';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('api.php?action=upload_image', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('pf-image').value = data.url;
      preview.src = data.url;
      if (previewBox) previewBox.style.display = 'block';
      status.textContent = '✓ Photo uploaded successfully!';
      status.style.color = '#4ade80';
    } else {
      // Fallback: Base64
      _readAsBase64(file, status, previewBox, preview);
    }
  } catch (e) {
    _readAsBase64(file, status, previewBox, preview);
  }
}

function _readAsBase64(file, status, previewBox, preview) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    document.getElementById('pf-image').value = dataUrl;
    preview.src = dataUrl;
    if (previewBox) previewBox.style.display = 'block';
    status.textContent = '✓ Photo loaded!';
    status.style.color = '#4ade80';
  };
  reader.readAsDataURL(file);
}

function toggleCustomCategory(sel) {
  const customInput = document.getElementById('pf-category-custom');
  if (!customInput) return;
  customInput.style.display = sel.value === 'custom' ? 'block' : 'none';
  if (sel.value !== 'custom') customInput.value = '';
}

async function saveProduct(productId) {
  const name  = document.getElementById('pf-name').value.trim();
  const price = parseInt(document.getElementById('pf-price').value);
  if (!name || !price) { toast('Name and price are required', 'error'); return; }

  // Determine category: if 'custom' selected, use the text input value
  const catSel = document.getElementById('pf-category').value;
  const catCustom = (document.getElementById('pf-category-custom')?.value || '').trim();
  const finalCategory = (catSel === 'custom' && catCustom) ? catCustom.toLowerCase() : catSel;

  const data = {
    name,
    description: document.getElementById('pf-desc').value.trim(),
    price,
    originalPrice: parseInt(document.getElementById('pf-original-price').value) || 0,
    priceUSD: Math.round(price / 110),
    image:    document.getElementById('pf-image').value.trim(),
    category: finalCategory,
    tag:      document.getElementById('pf-tag').value,
    sizes:    document.getElementById('pf-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
    stock:    parseInt(document.getElementById('pf-stock').value) || 0,
    featured: document.getElementById('pf-featured').checked
  };

  if (productId) {
    await HazeDB.updateProduct(productId, data);
    toast('✓ Product updated!');
  } else {
    await HazeDB.addProduct({ ...data, id: 'haze-' + Date.now() });
    toast('✓ Product added!');
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
        <div class="panel-header"><div class="panel-title">🌐 Social Media Links</div></div>
        <div class="panel-body">
          <div class="admin-form">
            <div class="form-field">
              <label>Instagram URL</label>
              <input type="text" id="s-ig" value="${s.instagram || ''}" placeholder="https://instagram.com/yourhandle">
            </div>
            <div class="form-field">
              <label>Facebook URL</label>
              <input type="text" id="s-fb" value="${s.facebook || ''}" placeholder="https://facebook.com/yourpage">
            </div>
            <div class="form-field">
              <label>TikTok URL</label>
              <input type="text" id="s-tt" value="${s.tiktok || ''}" placeholder="https://tiktok.com/@yourhandle">
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:0.5rem" id="social-save-btn" onclick="saveSocialSettings()">💾 Save Social Links</button>
            <div id="social-save-msg" style="margin-top:0.5rem;font-size:0.8rem;display:none"></div>
          </div>
        </div>
      </div>

      <!-- About Section Image -->
      <div class="panel" style="border:1px solid rgba(139,92,246,0.3)">
        <div class="panel-header" style="background:rgba(139,92,246,0.08)">
          <div class="panel-title">🖼️ "Born from a feeling" Section — ছবি পরিবর্তন</div>
        </div>
        <div class="panel-body">
          <p style="font-size:0.8rem;color:var(--ash);margin-bottom:1rem">এখানে যে ছবি দেবেন সেটাই ওয়েবসাইটের About Section-এ দেখাবে</p>
          ${s.aboutImage ? `<div style="margin-bottom:1rem;text-align:center"><img src="${s.aboutImage}" style="max-height:140px;max-width:100%;object-fit:contain;border:1px solid rgba(139,92,246,0.2);border-radius:4px"></div>` : ''}
          <div class="admin-form">
            <div class="form-field">
              <button type="button" class="btn btn-primary" onclick="document.getElementById('about-img-file').click()" style="width:100%;padding:0.8rem;font-weight:600">
                📁 Choose New Photo from Device
              </button>
              <input type="file" id="about-img-file" accept="image/*" style="display:none" onchange="uploadAboutImage(this)">
              <div id="about-img-status" style="font-size:0.8rem;margin-top:0.5rem;min-height:1em;font-weight:600"></div>
            </div>
            <div class="form-field">
              <label>অথবা Image URL paste করুন</label>
              <input type="text" id="s-about-img" value="${s.aboutImage || ''}" placeholder="https://... অথবা uploads/products/...">
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="saveAboutImageSettings()">💾 Save About Image</button>
          </div>
        </div>
      </div>

    </div>
  `;
}

async function saveStoreSettings() {
  try {
    const res = await HazeDB.updateSettings({
      storeName: document.getElementById('s-name').value.trim(),
      tagline:   document.getElementById('s-tagline').value.trim(),
      email:     document.getElementById('s-email').value.trim(),
      phone:     document.getElementById('s-phone').value.trim()
    });
    if (res && res.ok === false) throw new Error(res.error || 'Failed');
    toast('✓ Store info saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function savePaymentSettings() {
  try {
    const res = await HazeDB.updateSettings({
      bkash: document.getElementById('s-bkash').value.trim(),
      nagad:  document.getElementById('s-nagad').value.trim()
    });
    if (res && res.ok === false) throw new Error(res.error || 'Failed');
    toast('✓ Payment info saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveSocialSettings() {
  const btn = document.getElementById('social-save-btn');
  const msg = document.getElementById('social-save-msg');
  const ig  = document.getElementById('s-ig').value.trim();
  const fb  = document.getElementById('s-fb').value.trim();
  const tt  = document.getElementById('s-tt').value.trim();

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    const res = await HazeDB.updateSettings({ instagram: ig, facebook: fb, tiktok: tt });
    if (!res || res.ok === false) throw new Error(res ? (res.error || 'Save failed') : 'No response from server');
    toast('✓ Social links saved successfully!');
    if (msg) { msg.textContent = '✓ Saved!'; msg.style.color = '#4ade80'; msg.style.display = 'block'; }
  } catch(e) {
    toast('Error saving: ' + e.message, 'error');
    if (msg) { msg.textContent = '✗ ' + e.message; msg.style.color = '#f87171'; msg.style.display = 'block'; }
  }
  if (btn) { btn.disabled = false; btn.textContent = '💾 Save Social Links'; }
}

async function uploadAboutImage(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('about-img-status');
  status.textContent = '⏳ Uploading...';
  status.style.color = 'var(--accent)';

  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch('api.php?action=upload_image', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('s-about-img').value = data.url;
      status.textContent = '✓ Uploaded! Now click Save.';
      status.style.color = '#4ade80';
    } else {
      // Base64 fallback
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('s-about-img').value = e.target.result;
        status.textContent = '✓ Ready! Click Save About Image.';
        status.style.color = '#4ade80';
      };
      reader.readAsDataURL(file);
    }
  } catch(e) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('s-about-img').value = e.target.result;
      status.textContent = '✓ Ready! Click Save About Image.';
      status.style.color = '#4ade80';
    };
    reader.readAsDataURL(file);
  }
}

async function saveAboutImageSettings() {
  const url = document.getElementById('s-about-img').value.trim();
  if (!url) { toast('কোনো ছবি দেননি', 'error'); return; }
  try {
    const res = await HazeDB.updateSettings({ aboutImage: url });
    if (!res || res.ok === false) throw new Error(res ? res.error : 'Failed');
    toast('✓ About section image saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════
   COUPONS PAGE
══════════════════════════════════════════════════════ */
async function renderCoupons() {
  const content = document.getElementById('admin-content');
  const coupons = await HazeDB.getCoupons() || [];

  content.innerHTML = `
    <!-- INLINE CREATE COUPON FORM -->
    <div class="panel" style="margin-bottom:2rem;border:1px solid rgba(139,92,246,0.3)">
      <div class="panel-header" style="background:rgba(139,92,246,0.1)">
        <div class="panel-title">➕ নতুন Coupon Code তৈরি করুন</div>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:1rem;align-items:end">
          <div>
            <label style="font-size:0.75rem;color:var(--smoke);display:block;margin-bottom:0.3rem">Coupon Code *</label>
            <input type="text" id="inline-cp-code" placeholder="e.g. HAZE20"
              style="text-transform:uppercase;font-family:monospace;letter-spacing:0.1em;padding:0.65rem;width:100%;background:rgba(107,79,160,0.08);border:1px solid rgba(107,79,160,0.25);color:var(--ghost);outline:none;box-sizing:border-box"
              oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')">
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--smoke);display:block;margin-bottom:0.3rem">Discount Type *</label>
            <select id="inline-cp-type" style="padding:0.65rem;width:100%;background:rgba(107,79,160,0.08);border:1px solid rgba(107,79,160,0.25);color:var(--ghost);outline:none">
              <option value="percentage">Percentage (%) ছাড়</option>
              <option value="fixed">Fixed Amount (৳) ছাড়</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--smoke);display:block;margin-bottom:0.3rem">Discount Amount *</label>
            <input type="number" id="inline-cp-value" placeholder="e.g. 20 (মানে 20%)" style="padding:0.65rem;width:100%;background:rgba(107,79,160,0.08);border:1px solid rgba(107,79,160,0.25);color:var(--ghost);outline:none;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--smoke);display:block;margin-bottom:0.3rem">Min Order ৳ (0 = কোনো limit নেই)</label>
            <input type="number" id="inline-cp-min" value="0" style="padding:0.65rem;width:100%;background:rgba(107,79,160,0.08);border:1px solid rgba(107,79,160,0.25);color:var(--ghost);outline:none;box-sizing:border-box">
          </div>
          <div>
            <button type="button" class="btn btn-primary" id="inline-cp-btn" onclick="createInlineCoupon()" style="width:100%;padding:0.7rem;font-weight:700">
              ✓ Save Coupon
            </button>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-bottom:1rem">
      <div style="font-weight:700;font-size:1.1rem;color:var(--ghost)">All Coupon Codes</div>
      <div style="font-size:0.8rem;color:var(--smoke)">${coupons.length} coupon${coupons.length!==1?'s':''}</div>
    </div>

    <div class="panel">
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr>
            <th>Code</th><th>Discount</th><th>Min Order</th>
            <th>Used / Max</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${coupons.length === 0
              ? `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--smoke)">No coupons yet. Fill the form above to create your first coupon!</td></tr>`
              : coupons.map(c => `
                <tr>
                  <td><code style="background:rgba(139,92,246,0.15);color:var(--accent);padding:0.3rem 0.8rem;border-radius:4px;font-size:0.9rem;letter-spacing:0.1em;font-weight:700">${c.code}</code></td>
                  <td><strong style="color:#4ade80">${c.discount_type==='percentage' ? c.discount_value+'%' : '৳'+(+c.discount_value).toLocaleString()} OFF</strong></td>
                  <td>${+c.min_order>0 ? '৳'+(+c.min_order).toLocaleString() : 'No Limit'}</td>
                  <td>${c.used_count} / ${+c.max_uses>0 ? c.max_uses : '∞'}</td>
                  <td><span class="badge ${c.is_active ? 'badge-new' : 'badge-cancelled'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="toggleCoupon('${c.id}',${c.is_active?0:1})">${c.is_active?'Disable':'Enable'}</button>
                    <button class="btn btn-danger btn-sm" style="margin-left:0.5rem" onclick="deleteCoupon('${c.id}')">Delete</button>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function createInlineCoupon() {
  const code  = (document.getElementById('inline-cp-code').value || '').trim();
  const type  = document.getElementById('inline-cp-type').value;
  const value = parseFloat(document.getElementById('inline-cp-value').value);
  const min   = parseInt(document.getElementById('inline-cp-min').value) || 0;
  const btn   = document.getElementById('inline-cp-btn');

  if (!code)              { toast('Coupon code লিখুন', 'error'); return; }
  if (!value || value<=0) { toast('Discount amount দিন', 'error'); return; }
  if (type==='percentage' && value>100) { toast('% discount 100-এর বেশি হবে না', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await HazeDB.createCoupon({ code, discountType:type, discountValue:value, minOrder:min, maxUses:0 });
    if (res && res.ok) {
      toast('✓ Coupon "' + code + '" created!');
      await renderCoupons();
    } else {
      toast((res && res.error) || 'Failed to create coupon', 'error');
      btn.disabled = false;
      btn.textContent = '✓ Save Coupon';
    }
  } catch(e) {
    toast('Error: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = '✓ Save Coupon';
  }
}

async function toggleCoupon(id, isActive) {
  await HazeDB.toggleCoupon(id, isActive);
  toast(isActive ? '✓ Coupon enabled' : '✓ Coupon disabled');
  await renderCoupons();
}

async function deleteCoupon(id) {
  if (!confirm('এই coupon delete করবেন?')) return;
  await HazeDB.deleteCoupon(id);
  toast('✓ Coupon deleted');
  await renderCoupons();
}
