/* ═══════════════════════════════════════════════════════
   HAZE — admin.js v11 | Complete Admin Panel
   Written fresh — no template literal bugs
   ═══════════════════════════════════════════════════════ */

/* ── UTILS ──────────────────────────────────────── */
function toast(msg, type) {
  var el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'admin-toast ' + (type || 'success') + ' show';
  setTimeout(function(){ el.classList.remove('show'); }, 3000);
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function fmtDateShort(ts) {
  return new Date(ts).toLocaleDateString('en-GB', {day:'numeric',month:'short'});
}
function statusBadge(s) {
  var m = {pending:'Pending',processing:'Processing',shipped:'Shipped',delivered:'Delivered',cancelled:'Cancelled'};
  return '<span class="badge badge-' + s + '">' + (m[s]||s) + '</span>';
}
function tagBadge(t) {
  if (!t) return '';
  return '<span class="badge badge-' + t.toLowerCase() + '">' + t + '</span>';
}
function confirmDel(msg) { return window.confirm(msg || 'Are you sure?'); }

/* ── TIME ───────────────────────────────────────── */
function updateTime() {
  var el = document.getElementById('header-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
setInterval(updateTime, 60000);

/* ── PENDING BADGE ──────────────────────────────── */
async function updatePendingBadge() {
  try {
    var orders = (await HazeDB.getOrders()) || [];
    var pending = orders.filter(function(o){ return o.status === 'pending'; }).length;
    var badge = document.getElementById('sidebar-pending-count');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? 'inline' : 'none';
    }
  } catch(e) {}
}

/* ── NAVIGATION ─────────────────────────────────── */
async function navigateTo(page) {
  try {
    document.querySelectorAll('.sidebar-link').forEach(function(l){ l.classList.remove('active'); });
    var al = document.querySelector('.sidebar-link[data-page="' + page + '"]');
    if (al) al.classList.add('active');
    var te = document.getElementById('page-title');
    if (te) te.textContent = {dashboard:'Dashboard',orders:'Orders',products:'Products',coupons:'Coupons',settings:'Settings',content:'Website Content'}[page] || page;
    var c = document.getElementById('admin-content');
    if (!c) return;
    c.innerHTML = '<div style="padding:3rem;text-align:center;color:#9d8fc0">Loading...</div>';
    if (page === 'dashboard') await renderDashboard();
    else if (page === 'orders') await renderOrders();
    else if (page === 'products') await renderProducts();
    else if (page === 'coupons') await renderCoupons();
    else if (page === 'settings') await renderSettings();
    else if (page === 'content') await renderContent();
  } catch (err) {
    console.error('Page error:', err);
    var c2 = document.getElementById('admin-content');
    if (c2) c2.innerHTML = '<div style="padding:3rem;text-align:center"><div style="font-size:2rem;margin-bottom:1rem">⚠️</div><div style="color:#e8e0f0;font-weight:700">Error: ' + page + '</div><div style="color:#9d8fc0;font-size:.85rem;margin:.5rem 0 1.5rem">' + (err.message||'Unknown') + '</div><button onclick="navigateTo(\'' + page + '\')" style="background:#8b5cf6;color:#fff;border:none;padding:.7rem 1.5rem;cursor:pointer">Retry</button></div>';
  }
}

/* ══════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════ */
async function renderDashboard() {
  var c = document.getElementById('admin-content');
  if (!c) return;

  var orders = [], products = [];
  try { orders = (await HazeDB.getOrders()) || []; } catch(e) {}
  try { products = (await HazeDB.getProducts()) || []; } catch(e) {}
  if (!Array.isArray(orders)) orders = [];
  if (!Array.isArray(products)) products = [];

  var totalRev = 0, pending = 0, delivered = 0;
  orders.forEach(function(o) {
    totalRev += (o.total || 0);
    if (o.status === 'pending') pending++;
    if (o.status === 'delivered') delivered++;
  });
  var totalStock = 0;
  products.forEach(function(p) { totalStock += (parseInt(p.stock) || 0); });

  // Revenue chart data
  var chartDays = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var dayLabel = d.toLocaleDateString('en-US', {weekday:'short'});
    var ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var de = ds + 86400000;
    var dayRev = 0;
    orders.forEach(function(o) { if (o.createdAt >= ds && o.createdAt < de) dayRev += (o.total||0); });
    chartDays.push({day: dayLabel, rev: dayRev});
  }
  var maxRev = 1;
  chartDays.forEach(function(d) { if (d.rev > maxRev) maxRev = d.rev; });

  // Top products
  var ps = {};
  orders.forEach(function(o) {
    (o.items || []).forEach(function(item) {
      var key = item.productId || item.name;
      if (!ps[key]) ps[key] = {name: item.name || 'Unknown', qty: 0, revenue: 0};
      ps[key].qty += (item.qty || 0);
      ps[key].revenue += (item.price || 0) * (item.qty || 0);
    });
  });
  var topProds = Object.values(ps).sort(function(a,b){ return b.revenue - a.revenue; }).slice(0, 5);

  // Recent orders
  var recent = orders.slice().sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); }).slice(0, 10);

  // Build HTML
  var h = '';
  h += '<div class="stat-cards">';
  h += '<div class="stat-card"><div class="stat-card-icon">💰</div><div class="stat-card-label">Total Revenue</div><div class="stat-card-value">৳ ' + totalRev.toLocaleString() + '</div><div class="stat-card-sub">All time</div></div>';
  h += '<div class="stat-card"><div class="stat-card-icon">📦</div><div class="stat-card-label">Total Orders</div><div class="stat-card-value">' + orders.length + '</div><div class="stat-card-sub">' + pending + ' pending</div></div>';
  h += '<div class="stat-card" onclick="navigateTo(\'products\')" style="cursor:pointer"><div class="stat-card-icon">👕</div><div class="stat-card-label">Products</div><div class="stat-card-value">' + products.length + '</div><div class="stat-card-sub">' + totalStock + ' in stock</div></div>';
  h += '<div class="stat-card"><div class="stat-card-icon">✅</div><div class="stat-card-label">Delivered</div><div class="stat-card-value">' + delivered + '</div><div class="stat-card-sub">orders completed</div></div>';
  h += '</div>';

  // Chart + Top Products
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">';
  h += '<div class="panel"><div class="panel-header"><div class="panel-title">Revenue — Last 7 Days</div></div><div class="panel-body"><div class="chart-container">';
  chartDays.forEach(function(d) {
    var barH = Math.max(4, Math.round((d.rev / maxRev) * 160));
    h += '<div class="chart-bar-wrap"><div class="chart-bar" style="height:' + barH + 'px">';
    if (d.rev > 0) h += '<div class="chart-bar-val">৳' + d.rev + '</div>';
    h += '</div><div class="chart-label">' + d.day + '</div></div>';
  });
  h += '</div></div></div>';

  h += '<div class="panel"><div class="panel-header"><div class="panel-title">Top Products</div></div><div class="panel-body" style="padding:0"><table class="admin-table"><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>';
  if (topProds.length === 0) {
    h += '<tr><td colspan="3" style="text-align:center;color:var(--smoke);padding:1.5rem">No sales yet</td></tr>';
  } else {
    topProds.forEach(function(p) {
      h += '<tr><td class="td-bold">' + p.name + '</td><td>' + p.qty + '</td><td class="td-accent">৳ ' + p.revenue.toLocaleString() + '</td></tr>';
    });
  }
  h += '</tbody></table></div></div></div>';

  // Recent Orders
  h += '<div class="panel"><div class="panel-header"><div class="panel-title">Recent Orders</div><button class="btn btn-secondary btn-sm" onclick="navigateTo(\'orders\')">View All</button></div><div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>';
  if (recent.length === 0) {
    h += '<tr><td colspan="7" style="text-align:center;color:var(--smoke);padding:2rem">No orders yet</td></tr>';
  } else {
    recent.forEach(function(o) {
      var cust = o.customer || {};
      h += '<tr>';
      h += '<td class="td-bold">' + (o.orderId||'-') + '</td>';
      h += '<td>' + (cust.name||'-') + '<br><small style="color:var(--smoke)">' + (cust.phone||'') + '</small></td>';
      h += '<td>' + (o.items||[]).length + '</td>';
      h += '<td class="td-accent">৳ ' + (o.total||0).toLocaleString() + '</td>';
      h += '<td>' + statusBadge(o.status) + '</td>';
      h += '<td style="white-space:nowrap">' + fmtDateShort(o.createdAt) + '</td>';
      h += '<td><button class="btn btn-secondary btn-sm" onclick="showOrderDetail(\'' + o.orderId + '\')">View</button></td>';
      h += '</tr>';
    });
  }
  h += '</tbody></table></div></div>';

  c.innerHTML = h;
  updateTime();
}

/* ══════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════ */
async function renderOrders(filterStatus, searchQuery) {
  filterStatus = filterStatus || 'all';
  searchQuery = searchQuery || '';
  var c = document.getElementById('admin-content');
  var orders = (await HazeDB.getOrders()) || [];
  if (filterStatus !== 'all') orders = orders.filter(function(o){ return o.status === filterStatus; });
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    orders = orders.filter(function(o){
      return o.orderId.toLowerCase().indexOf(q) >= 0 || o.customer.name.toLowerCase().indexOf(q) >= 0 || o.customer.phone.indexOf(q) >= 0;
    });
  }

  var h = '<div class="panel"><div class="panel-header"><div class="panel-title">All Orders (' + orders.length + ')</div>';
  h += '<div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center">';
  h += '<div class="admin-search"><span>🔍</span><input type="text" id="order-search" placeholder="Name, phone, order ID" value="' + searchQuery + '"></div>';
  h += '<select class="status-select" id="order-filter">';
  ['all','pending','processing','shipped','delivered','cancelled'].forEach(function(s){
    h += '<option value="' + s + '"' + (filterStatus===s?' selected':'') + '>' + (s==='all'?'All Status':s.charAt(0).toUpperCase()+s.slice(1)) + '</option>';
  });
  h += '</select></div></div>';
  h += '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';

  if (orders.length === 0) {
    h += '<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--smoke)">No orders found</td></tr>';
  } else {
    orders.forEach(function(o) {
      var imgs = '';
      (o.items||[]).forEach(function(i){
        imgs += '<img src="' + i.image + '" title="' + i.name + ' (' + i.size + 'x' + i.qty + ')" style="width:32px;height:32px;object-fit:cover;border:1px solid rgba(107,79,160,.2)">';
      });
      var statusOpts = '';
      ['pending','processing','shipped','delivered','cancelled'].forEach(function(s){
        statusOpts += '<option value="' + s + '"' + (o.status===s?' selected':'') + '>' + s.charAt(0).toUpperCase()+s.slice(1) + '</option>';
      });
      h += '<tr>';
      h += '<td class="td-bold">' + o.orderId + '</td>';
      h += '<td><div style="font-weight:600">' + o.customer.name + '</div><div style="font-size:.75rem;color:var(--smoke)">' + o.customer.phone + '</div></td>';
      h += '<td><div style="display:flex;gap:4px;flex-wrap:wrap">' + imgs + '</div></td>';
      h += '<td class="td-accent">৳ ' + o.total.toLocaleString() + '</td>';
      h += '<td style="text-transform:capitalize">' + o.paymentMethod + '</td>';
      h += '<td><select class="status-select" onchange="updateStatus(\'' + o.orderId + '\',this.value)">' + statusOpts + '</select></td>';
      h += '<td style="white-space:nowrap;font-size:.8rem">' + fmtDateShort(o.createdAt) + '</td>';
      h += '<td><div style="display:flex;gap:.4rem"><button class="btn btn-secondary btn-sm btn-icon" onclick="showOrderDetail(\'' + o.orderId + '\')" title="View">👁</button><button class="btn btn-danger btn-sm btn-icon" onclick="deleteOrder(\'' + o.orderId + '\')" title="Delete">✕</button></div></td>';
      h += '</tr>';
    });
  }
  h += '</tbody></table></div></div>';
  c.innerHTML = h;

  document.getElementById('order-search').addEventListener('input', function(e){
    renderOrders(document.getElementById('order-filter').value, e.target.value);
  });
  document.getElementById('order-filter').addEventListener('change', function(e){
    renderOrders(e.target.value, document.getElementById('order-search').value);
  });
}

async function updateStatus(orderId, status) {
  await HazeDB.updateOrderStatus(orderId, status, 'Status updated by admin');
  await updatePendingBadge();
  toast('Order ' + orderId + ' → ' + status);
}

async function deleteOrder(orderId) {
  if (!confirmDel('Delete order ' + orderId + '?')) return;
  await HazeDB.deleteOrder(orderId);
  toast('Order deleted', 'error');
  await updatePendingBadge();
  await renderOrders();
}

async function showOrderDetail(orderId) {
  var order = await HazeDB.getOrder(orderId);
  if (!order) return;
  var cust = order.customer || {};
  var h = '<div class="admin-modal" style="max-width:640px">';
  h += '<div class="admin-modal-header"><div class="admin-modal-title">Order — ' + order.orderId + '</div><div class="admin-modal-close" onclick="this.closest(\'.admin-modal-overlay\').remove()">✕</div></div>';
  h += '<div class="admin-modal-body">';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">';
  h += '<div><div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:.4rem">Customer</div><div style="font-weight:600">' + cust.name + '</div><div style="color:var(--ash);font-size:.85rem">' + cust.phone + '</div>';
  if (cust.email) h += '<div style="color:var(--ash);font-size:.85rem">' + cust.email + '</div>';
  h += '</div>';
  h += '<div><div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:.4rem">Delivery</div><div style="color:var(--ash);font-size:.85rem;line-height:1.6">' + (cust.address||'') + ', ' + (cust.city||'') + ', ' + (cust.district||'') + ' ' + (cust.zip||'') + '</div></div>';
  h += '<div><div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:.4rem">Payment</div><div style="text-transform:capitalize;font-weight:600">' + order.paymentMethod + '</div>';
  if (cust.trxid) h += '<div style="color:var(--ash);font-size:.8rem">TrxID: ' + cust.trxid + '</div>';
  h += '</div>';
  h += '<div><div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:.4rem">Status</div>' + statusBadge(order.status) + '</div>';
  h += '</div>';
  if (cust.notes) h += '<div style="background:rgba(0,0,0,.2);padding:.8rem;margin-bottom:1rem;font-size:.85rem;color:var(--ash)">📝 ' + cust.notes + '</div>';
  h += '<div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:.8rem">Items</div>';
  (order.items||[]).forEach(function(item) {
    h += '<div style="display:flex;align-items:center;gap:1rem;padding:.7rem 0;border-bottom:1px solid rgba(107,79,160,.1)">';
    h += '<img src="' + item.image + '" style="width:48px;height:48px;object-fit:cover;border:1px solid rgba(107,79,160,.2)">';
    h += '<div style="flex:1"><div style="font-weight:600">' + item.name + '</div><div style="font-size:.8rem;color:var(--ash)">Size: ' + item.size + ' × ' + item.qty + '</div></div>';
    h += '<div style="font-weight:700;color:var(--accent)">৳ ' + (item.price * item.qty).toLocaleString() + '</div></div>';
  });
  h += '<div style="display:flex;justify-content:space-between;padding:.7rem 0;border-bottom:1px solid rgba(107,79,160,.1);font-size:.85rem;color:var(--ash)"><span>Subtotal</span><span>৳ ' + (order.subtotal||0).toLocaleString() + '</span></div>';
  h += '<div style="display:flex;justify-content:space-between;padding:.7rem 0;font-size:.85rem;color:var(--ash)"><span>Shipping</span><span>৳ ' + (order.shipping||0) + '</span></div>';
  h += '<div style="display:flex;justify-content:space-between;padding:.7rem 0;font-weight:700;font-size:1rem;color:var(--ghost)"><span>Total</span><span>৳ ' + (order.total||0).toLocaleString() + '</span></div>';
  h += '<div style="margin-top:1rem"><div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--smoke);margin-bottom:.6rem">Update Status</div><div style="display:flex;gap:.5rem;flex-wrap:wrap">';
  ['processing','shipped','delivered','cancelled'].forEach(function(s) {
    h += '<button class="btn btn-sm ' + (order.status===s?'btn-primary':'btn-secondary') + '" onclick="updateStatus(\'' + order.orderId + '\',\'' + s + '\');this.closest(\'.admin-modal-overlay\').remove();renderOrders()">' + s.charAt(0).toUpperCase()+s.slice(1) + '</button>';
  });
  h += '</div></div></div>';
  h += '<div class="admin-modal-footer"><button class="btn btn-danger btn-sm" onclick="deleteOrder(\'' + order.orderId + '\');this.closest(\'.admin-modal-overlay\').remove()">Delete Order</button><button class="btn btn-secondary" onclick="this.closest(\'.admin-modal-overlay\').remove()">Close</button></div></div>';

  var overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = h;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

/* ══════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════ */
async function renderProducts() {
  var products = (await HazeDB.getProducts()) || [];
  // Auto-seed: if DB is empty, insert the hardcoded shop products
  if (products.length === 0 && typeof HazeDB.seedProducts === 'function') {
    await HazeDB.seedProducts();
    products = (await HazeDB.getProducts()) || [];
  }
  var c = document.getElementById('admin-content');
  var h = '<div class="panel"><div class="panel-header"><div class="panel-title">Products (' + products.length + ')</div><button class="btn btn-primary" onclick="showProductModal()">+ Add Product</button></div>';
  h += '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price (৳)</th><th>Stock</th><th>Tag</th><th>Featured</th><th>Actions</th></tr></thead><tbody>';
  if (products.length === 0) {
    h += '<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--smoke)">No products yet. Click "+ Add Product" to get started!</td></tr>';
  } else {
    products.forEach(function(p) {
      var stockColor = p.stock < 5 ? 'var(--danger)' : p.stock < 20 ? 'var(--warning)' : 'var(--success)';
      h += '<tr>';
      h += '<td><img class="product-thumb" src="' + p.image + '" alt="' + p.name + '"></td>';
      h += '<td><div class="td-bold">' + p.name + '</div><div style="font-size:.75rem;color:var(--smoke)">' + p.id + '</div></td>';
      h += '<td style="text-transform:capitalize">' + p.category + '</td>';
      h += '<td class="td-accent">৳ ' + p.price.toLocaleString() + '</td>';
      h += '<td><span style="color:' + stockColor + ';font-weight:600">' + p.stock + '</span></td>';
      h += '<td>' + tagBadge(p.tag) + '</td>';
      h += '<td style="text-align:center">' + (p.featured ? '⭐' : '—') + '</td>';
      h += '<td><div style="display:flex;gap:.4rem"><button class="btn btn-secondary btn-sm" onclick="showProductModal(\'' + p.id + '\')">Edit</button><button class="btn btn-danger btn-sm btn-icon" onclick="deleteProduct(\'' + p.id + '\')">✕</button></div></td>';
      h += '</tr>';
    });
  }
  h += '</tbody></table></div></div>';
  c.innerHTML = h;
}

var KNOWN_CATS = ['tops','bottoms','accessories','outerwear','footwear'];

async function showProductModal(productId) {
  var p;
  if (productId) {
    p = await HazeDB.getProduct(productId);
  } else {
    p = {name:'',description:'',price:'',originalPrice:'',image:'',category:'tops',tag:'',sizes:['S','M','L','XL'],stock:50,featured:false};
  }
  var isEdit = !!productId;
  var isCustomCat = KNOWN_CATS.indexOf(p.category) < 0;
  var sizesStr = Array.isArray(p.sizes) ? p.sizes.join(',') : (p.sizes || '');

  var h = '<div class="admin-modal" style="max-width:640px">';
  h += '<div class="admin-modal-header"><div class="admin-modal-title">' + (isEdit ? 'Edit Product' : 'Add New Product') + '</div><button class="modal-close" onclick="this.closest(\'.admin-modal-overlay\').remove()">✕</button></div>';
  h += '<div class="admin-modal-body"><div class="admin-form">';

  // Row 1: Name + Category
  h += '<div class="admin-form-row"><div class="form-field"><label>Product Name *</label><input type="text" id="pf-name" value="' + (p.name||'') + '" placeholder="e.g. Oversized Tee"></div>';
  h += '<div class="form-field"><label>Category</label><select id="pf-category" onchange="toggleCustomCategory(this)">';
  h += '<option value="tops"' + (p.category==='tops'?' selected':'') + '>Tops (Tees, Hoodies)</option>';
  h += '<option value="bottoms"' + (p.category==='bottoms'?' selected':'') + '>Bottoms (Pants, Cargo)</option>';
  h += '<option value="accessories"' + (p.category==='accessories'?' selected':'') + '>Accessories (Caps, Bags)</option>';
  h += '<option value="outerwear"' + (p.category==='outerwear'?' selected':'') + '>Outerwear (Jackets, Coats)</option>';
  h += '<option value="footwear"' + (p.category==='footwear'?' selected':'') + '>Footwear (Shoes, Sneakers)</option>';
  h += '<option value="custom"' + (isCustomCat?' selected':'') + '>Custom (নিজে লিখুন)</option>';
  h += '</select>';
  h += '<input type="text" id="pf-category-custom" style="margin-top:.4rem;display:' + (isCustomCat?'block':'none') + '" value="' + (isCustomCat ? (p.category||'') : '') + '" placeholder="Custom category (e.g. Joggers)">';
  h += '</div></div>';

  // Description
  h += '<div class="form-field form-field-full"><label>Description</label><textarea id="pf-desc" rows="2">' + (p.description||'') + '</textarea></div>';

  // Row 2: Price + Original Price
  h += '<div class="admin-form-row"><div class="form-field"><label>Selling Price (৳) *</label><input type="number" id="pf-price" value="' + (p.price||'') + '" placeholder="850"></div>';
  h += '<div class="form-field"><label>Original Price (৳) — ছাড় দেখাতে</label><input type="number" id="pf-original-price" value="' + (p.originalPrice||'') + '" placeholder="e.g. 1200"></div></div>';

  // Row 3: Stock + Tag
  h += '<div class="admin-form-row"><div class="form-field"><label>Stock Quantity</label><input type="number" id="pf-stock" value="' + (p.stock||'') + '" placeholder="50"></div>';
  h += '<div class="form-field"><label>Tag / Badge</label><select id="pf-tag">';
  h += '<option value=""' + (!p.tag?' selected':'') + '>None</option>';
  ['New','Popular','Limited','Sale'].forEach(function(t){
    h += '<option value="' + t + '"' + (p.tag===t?' selected':'') + '>' + t + '</option>';
  });
  h += '</select></div></div>';

  // Photo upload
  h += '<div class="form-field form-field-full" style="background:rgba(139,92,246,.05);padding:1rem;border:1px solid rgba(139,92,246,.2);border-radius:6px">';
  h += '<label style="font-weight:700;color:var(--ghost)">📸 Product Photo</label>';
  h += '<p style="font-size:.75rem;color:var(--ash);margin-top:.2rem;margin-bottom:.8rem">ছবি সিলেক্ট করুন:</p>';
  h += '<button type="button" class="btn btn-primary" onclick="document.getElementById(\'pf-image-file\').click()" style="width:100%;padding:.8rem;font-weight:600">📁 Choose Photo</button>';
  h += '<input type="file" id="pf-image-file" accept="image/*" style="display:none" onchange="uploadProductImage(this)">';
  h += '<div id="img-upload-status" style="font-size:.8rem;margin-top:.6rem;min-height:1.2em;font-weight:600"></div>';
  h += '<div id="img-preview-box" style="margin-top:.8rem;text-align:center;' + (p.image ? '' : 'display:none') + '"><img id="img-preview" src="' + (p.image||'') + '" style="max-height:160px;max-width:100%;object-fit:contain;border:1px solid rgba(139,92,246,.3);border-radius:4px"></div>';
  h += '<div style="margin-top:1rem;font-size:.75rem;color:var(--smoke)">অথবা ছবির Link paste করুন:</div>';
  h += '<input type="text" id="pf-image" value="' + (p.image||'') + '" placeholder="https://..." style="margin-top:.3rem">';
  h += '</div>';

  // Sizes
  h += '<div class="form-field form-field-full"><label>Available Sizes (comma separated)</label><input type="text" id="pf-sizes" value="' + sizesStr + '" placeholder="S,M,L,XL"></div>';

  // Featured
  h += '<div class="form-field form-field-full"><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer"><input type="checkbox" id="pf-featured"' + (p.featured?' checked':'') + ' style="width:16px;height:16px;accent-color:var(--accent)"> Show as Featured on Homepage</label></div>';

  h += '</div></div>'; // end admin-form, admin-modal-body
  h += '<div class="admin-modal-footer"><button class="btn btn-secondary" onclick="this.closest(\'.admin-modal-overlay\').remove()">Cancel</button>';
  h += '<button class="btn btn-primary" onclick="saveProduct(\'' + (productId||'') + '\')">' + (isEdit?'Save Changes':'Add Product') + '</button></div></div>';

  var overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = h;
  document.body.appendChild(overlay);

  // Image URL preview listener
  document.getElementById('pf-image').addEventListener('input', function(e){
    var box = document.getElementById('img-preview-box');
    var prev = document.getElementById('img-preview');
    if (e.target.value) { prev.src = e.target.value; box.style.display = 'block'; }
    else { box.style.display = 'none'; }
  });

  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

function toggleCustomCategory(sel) {
  var ci = document.getElementById('pf-category-custom');
  if (!ci) return;
  ci.style.display = sel.value === 'custom' ? 'block' : 'none';
  if (sel.value !== 'custom') ci.value = '';
}

async function uploadProductImage(input) {
  var file = input.files[0];
  if (!file) return;
  var status = document.getElementById('img-upload-status');
  var previewBox = document.getElementById('img-preview-box');
  var preview = document.getElementById('img-preview');
  status.textContent = '⏳ Uploading...';
  status.style.color = 'var(--accent)';

  var formData = new FormData();
  // Read as base64 for preview and AI
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = async function() {
      // Resize image to max 800px width/height for database storage
      var canvas = document.createElement('canvas');
      var max = 800;
      var width = img.width;
      var height = img.height;
      
      if (width > height) {
        if (width > max) { height *= max / width; width = max; }
      } else {
        if (height > max) { width *= max / height; height = max; }
      }
      
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG Base64
      var b64 = canvas.toDataURL('image/jpeg', 0.85);
      
      document.getElementById('pf-image').value = b64;
      preview.src = b64;
      if (previewBox) previewBox.style.display = 'block';
      status.textContent = '✓ Photo processed and ready for Database!';
      status.style.color = '#4ade80';

      // Trigger AI suggestion (runs in background)
      generateAIProductDetails(b64);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function generateAIProductDetails(base64Image) {
  var s = await HazeDB.getSettings();
  if (!s || !s.geminiKey) return; // No key, do nothing

  // Ensure name/desc are empty before auto-filling
  var nameEl = document.getElementById('pf-name');
  var descEl = document.getElementById('pf-desc');
  if (nameEl.value.trim() !== '') return; // Don't overwrite if user already typed something

  var status = document.getElementById('img-upload-status');
  status.innerHTML = '✨ AI is thinking... <span style="font-size:0.7rem;color:var(--ash)">(Suggesting name & description)</span>';
  status.style.color = '#a855f7'; // purple

  try {
    var b64Data = base64Image.split(',')[1];
    var mime = base64Image.split(',')[0].split(':')[1].split(';')[0];
    
    var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + s.geminiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Act as a modern streetwear clothing brand copywriter. Analyze this clothing item. Give me a JSON object with 'name' (a short, catchy product name) and 'description' (a brief 1-2 sentence description highlighting the style and vibe). No markdown, just raw JSON." },
            { inline_data: { mime_type: mime, data: b64Data } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });
    
    var data = await res.json();
    if (!res.ok || data.error) throw new Error((data.error && data.error.message) || 'API Request Failed');
    if (!data.candidates || !data.candidates[0]) throw new Error('No response from AI (Safety block or empty)');
    
    var text = data.candidates[0].content.parts[0].text;
    var result;
    try {
      result = JSON.parse(text);
    } catch(err) {
      // fallback cleanup just in case
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(text);
    }
    
    if (result.name) nameEl.value = result.name;
    if (result.description) descEl.value = result.description;
    
    status.innerHTML = '✨ AI Auto-Filled!';
    status.style.color = '#4ade80';
    toast('✓ AI suggestion applied!');
    
  } catch(e) {
    console.error('AI Error:', e);
    status.innerHTML = '⚠️ AI Failed: <span style="font-size:0.7rem">' + e.message + '</span>';
    status.style.color = '#f87171'; // red
  }
}

async function saveProduct(productId) {
  var name = document.getElementById('pf-name').value.trim();
  var price = parseInt(document.getElementById('pf-price').value);
  if (!name || !price) { toast('Name and price required', 'error'); return; }

  var catSel = document.getElementById('pf-category').value;
  var catCustomEl = document.getElementById('pf-category-custom');
  var catCustom = catCustomEl ? catCustomEl.value.trim() : '';
  var finalCat = (catSel === 'custom' && catCustom) ? catCustom.toLowerCase() : catSel;

  var data = {
    name: name,
    description: document.getElementById('pf-desc').value.trim(),
    price: price,
    originalPrice: parseInt(document.getElementById('pf-original-price').value) || 0,
    priceUSD: Math.round(price / 110),
    image: document.getElementById('pf-image').value.trim(),
    category: finalCat,
    tag: document.getElementById('pf-tag').value,
    sizes: document.getElementById('pf-sizes').value.split(',').map(function(s){return s.trim();}).filter(Boolean),
    stock: parseInt(document.getElementById('pf-stock').value) || 0,
    featured: document.getElementById('pf-featured').checked
  };

  if (productId) {
    await HazeDB.updateProduct(productId, data);
    toast('✓ Product updated!');
  } else {
    await HazeDB.addProduct(Object.assign({id: 'haze-' + Date.now()}, data));
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

/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════
   WEBSITE CONTENT MANAGER
══════════════════════════════════════════════════ */
async function renderContent() {
  var s = (await HazeDB.getSettings()) || {};
  var c = document.getElementById('admin-content');

  function field(id, label, val, type, placeholder) {
    type = type || 'text';
    return '<div class="form-field"><label>' + label + '</label><input type="' + type + '" id="' + id + '" value="' + (val||'').replace(/"/g,'&quot;') + '" placeholder="' + (placeholder||'') + '"></div>';
  }
  function textarea(id, label, val) {
    return '<div class="form-field"><label>' + label + '</label><textarea id="' + id + '" rows="3" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--white);padding:.6rem;font-size:.85rem;border-radius:4px;resize:vertical;box-sizing:border-box">' + (val||'') + '</textarea></div>';
  }
  function imgUploadBox(previewId, fileId, currentImg, changeFn) {
    var h = '';
    h += '<div style="display:flex;align-items:center;gap:1rem;margin-top:.5rem">';
    if (currentImg) h += '<img id="' + previewId + '" src="' + currentImg + '" style="height:70px;width:90px;object-fit:cover;border-radius:4px;border:1px solid rgba(139,92,246,.3)">';
    else h += '<div id="' + previewId + '" style="height:70px;width:90px;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.15);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--ash)">No img</div>';
    h += '<label style="cursor:pointer;background:var(--accent);color:#fff;padding:.45rem .9rem;border-radius:4px;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase">📷 Change<input type="file" id="' + fileId + '" accept="image/*" style="display:none" onchange="' + changeFn + '(this)"></label>';
    h += '</div>';
    return h;
  }
  function panel(icon, title, content, saveId, saveFn) {
    return '<div class="panel" style="margin-bottom:1.5rem"><div class="panel-header"><div class="panel-title">' + icon + ' ' + title + '</div></div><div class="panel-body"><div class="admin-form">' + content + '<button class="btn btn-primary" id="' + saveId + '" onclick="' + saveFn + '()" style="width:100%;margin-top:.5rem;padding:.75rem">💾 Save ' + title + '</button></div></div></div>';
  }

  var h = '';

  // HERO
  var heroHtml = '';
  heroHtml += field('c-hero-title',   '🔤 Brand Name / Headline',    s.heroTitle   || 'HAZE');
  heroHtml += field('c-hero-tagline', '✏️ Tagline (below headline)', s.heroTagline || 'Wear the Haze');
  heroHtml += field('c-hero-cta',     '🔘 Button Text',              s.heroCTA     || 'Explore Drop 01');
  heroHtml += '<label style="font-size:.75rem;color:var(--ash);display:block;margin-top:.5rem;margin-bottom:.25rem">🖼️ Background Image</label>';
  heroHtml += imgUploadBox('hero-bg-preview', 'hero-bg-file', s.heroBgImage||'', 'contentUploadHeroBg');
  h += panel('🏠', 'Hero Section', heroHtml, 'save-hero-btn', 'saveContentHero');

  // ABOUT
  var aboutHtml = '';
  aboutHtml += field('c-about-heading',   '📌 Heading',           s.aboutHeading   || 'Born from a feeling.');
  aboutHtml += textarea('c-about-text1',  '📝 Paragraph 1',       s.aboutText1     || 'HAZE was born from that moment between dreaming and waking...');
  aboutHtml += textarea('c-about-text2',  '📝 Paragraph 2',       s.aboutText2     || 'Not fully corporate. Not fully street...');
  aboutHtml += field('c-about-highlight', '✨ Highlight Text',     s.aboutHighlight || 'Just vibes.\nJust HAZE.');
  aboutHtml += '<label style="font-size:.75rem;color:var(--ash);display:block;margin-top:.5rem;margin-bottom:.25rem">🖼️ About Image</label>';
  aboutHtml += imgUploadBox('about-img-preview-c', 'about-img-file-c', s.aboutImage||'', 'contentUploadAbout');
  h += panel('ℹ️', 'About Section', aboutHtml, 'save-about-btn', 'saveContentAbout');

  // SHOP
  var shopHtml = '';
  shopHtml += field('c-shop-title',    '📌 Section Title',    s.shopTitle    || 'Drop 01: Void');
  shopHtml += field('c-shop-subtitle', '📝 Subtitle Text',    s.shopSubtitle || 'Where darkness meets design. Limited pieces, unlimited vibe.');
  h += panel('🛍️', 'Shop Section', shopHtml, 'save-shop-btn', 'saveContentShop');

  // MARQUEE
  var marqHtml = textarea('c-marquee', '📢 Running Text (dots will separate each phrase)', s.marqueeText || 'Wear the Haze · Blur the Lines · Own Your Fog · Lost in the Haze · Just. Haze.');
  h += panel('💬', 'Marquee (Running Banner)', marqHtml, 'save-marq-btn', 'saveContentMarquee');

  // BRAND QUOTE
  var quoteHtml = '';
  quoteHtml += field('c-quote-text',   '💬 Quote Text',   s.quoteText   || 'Blur the\nLines.');
  quoteHtml += field('c-quote-author', '✍️ Author/Credit', s.quoteAuthor || '— HAZE, Drop 01: VOID');
  h += panel('✨', 'Brand Quote Section', quoteHtml, 'save-quote-btn', 'saveContentQuote');

  c.innerHTML = '<div style="max-width:720px">' + h + '</div>';
}

// ── CONTENT SAVE FUNCTIONS ──────────────────────────────────

function contentCompressImage(file, callback) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var max = 1200; var w = img.width, hi = img.height;
      if (w > hi) { if (w > max) { hi *= max/w; w = max; } }
      else { if (hi > max) { w *= max/hi; hi = max; } }
      canvas.width = w; canvas.height = hi;
      canvas.getContext('2d').drawImage(img, 0, 0, w, hi);
      callback(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function contentUploadHeroBg(input) {
  if (!input.files[0]) return;
  contentCompressImage(input.files[0], async function(b64) {
    document.getElementById('hero-bg-preview').src = b64;
    await HazeDB.updateSettings({ heroBgImage: b64 });
    toast('✓ Hero background updated!');
  });
}
function contentUploadAbout(input) {
  if (!input.files[0]) return;
  contentCompressImage(input.files[0], async function(b64) {
    document.getElementById('about-img-preview-c').src = b64;
    await HazeDB.updateSettings({ aboutImage: b64 });
    toast('✓ About image updated!');
  });
}

async function saveContentHero() {
  try {
    await HazeDB.updateSettings({
      heroTitle:   document.getElementById('c-hero-title').value.trim(),
      heroTagline: document.getElementById('c-hero-tagline').value.trim(),
      heroCTA:     document.getElementById('c-hero-cta').value.trim()
    });
    toast('✓ Hero section saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveContentAbout() {
  try {
    await HazeDB.updateSettings({
      aboutHeading:   document.getElementById('c-about-heading').value.trim(),
      aboutText1:     document.getElementById('c-about-text1').value.trim(),
      aboutText2:     document.getElementById('c-about-text2').value.trim(),
      aboutHighlight: document.getElementById('c-about-highlight').value.trim()
    });
    toast('✓ About section saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveContentShop() {
  try {
    await HazeDB.updateSettings({
      shopTitle:    document.getElementById('c-shop-title').value.trim(),
      shopSubtitle: document.getElementById('c-shop-subtitle').value.trim()
    });
    toast('✓ Shop section saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveContentMarquee() {
  try {
    await HazeDB.updateSettings({ marqueeText: document.getElementById('c-marquee').value.trim() });
    toast('✓ Marquee text saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveContentQuote() {
  try {
    await HazeDB.updateSettings({
      quoteText:   document.getElementById('c-quote-text').value.trim(),
      quoteAuthor: document.getElementById('c-quote-author').value.trim()
    });
    toast('✓ Quote saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */
async function renderSettings() {
  var s = (await HazeDB.getSettings()) || {};
  var c = document.getElementById('admin-content');
  var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">';

  // Store Info
  h += '<div class="panel"><div class="panel-header"><div class="panel-title">Store Information</div></div><div class="panel-body"><div class="admin-form">';
  h += '<div class="form-field"><label>Store Name</label><input type="text" id="s-name" value="' + (s.storeName||'') + '"></div>';
  h += '<div class="form-field"><label>Tagline</label><input type="text" id="s-tagline" value="' + (s.tagline||'') + '"></div>';
  h += '<div class="form-field"><label>Email</label><input type="email" id="s-email" value="' + (s.email||'') + '"></div>';
  h += '<div class="form-field"><label>Phone</label><input type="text" id="s-phone" value="' + (s.phone||'') + '"></div>';
  h += '<button class="btn btn-primary" onclick="saveStoreSettings()">Save Store Info</button>';
  h += '</div></div></div>';

  // Payment
  h += '<div class="panel"><div class="panel-header"><div class="panel-title">Payment Numbers</div></div><div class="panel-body"><div class="admin-form">';
  h += '<div class="form-field"><label>bKash Number</label><input type="text" id="s-bkash" value="' + (s.bkash||'') + '" placeholder="01XXXXXXXXX"></div>';
  h += '<div class="form-field"><label>Nagad Number</label><input type="text" id="s-nagad" value="' + (s.nagad||'') + '" placeholder="01XXXXXXXXX"></div>';
  h += '<button class="btn btn-primary" onclick="savePaymentSettings()">Save Payment Info</button>';
  h += '</div></div></div>';

  // Social
  h += '<div class="panel"><div class="panel-header"><div class="panel-title">🌐 Social Media Links</div></div><div class="panel-body"><div class="admin-form">';
  h += '<div class="form-field"><label>Instagram URL</label><input type="text" id="s-ig" value="' + (s.instagram||'') + '" placeholder="https://instagram.com/..."></div>';
  h += '<div class="form-field"><label>Facebook URL</label><input type="text" id="s-fb" value="' + (s.facebook||'') + '" placeholder="https://facebook.com/..."></div>';
  h += '<div class="form-field"><label>TikTok URL</label><input type="text" id="s-tt" value="' + (s.tiktok||'') + '" placeholder="https://tiktok.com/..."></div>';
  h += '<button class="btn btn-primary" style="width:100%;margin-top:.5rem" id="social-save-btn" onclick="saveSocialSettings()">💾 Save Social Links</button>';
  h += '<div id="social-save-msg" style="margin-top:.5rem;font-size:.8rem;display:none"></div>';
  h += '</div></div></div>';

  // About Image
  h += '<div class="panel" style="border:1px solid rgba(139,92,246,.3)"><div class="panel-header" style="background:rgba(139,92,246,.08)"><div class="panel-title">🖼️ About Section — ছবি পরিবর্তন</div></div><div class="panel-body">';
  h += '<p style="font-size:.8rem;color:var(--ash);margin-bottom:1rem">এখানে যে ছবি দেবেন সেটাই About Section-এ দেখাবে</p>';
  if (s.aboutImage) h += '<div style="margin-bottom:1rem;text-align:center"><img src="' + s.aboutImage + '" style="max-height:140px;max-width:100%;object-fit:contain;border:1px solid rgba(139,92,246,.2);border-radius:4px"></div>';
  h += '<div class="admin-form"><div class="form-field">';
  h += '<button type="button" class="btn btn-primary" onclick="document.getElementById(\'about-img-file\').click()" style="width:100%;padding:.8rem;font-weight:600">📁 Choose New Photo</button>';
  h += '<input type="file" id="about-img-file" accept="image/*" style="display:none" onchange="uploadAboutImage(this)">';
  h += '<div id="about-img-status" style="font-size:.8rem;margin-top:.5rem;min-height:1em;font-weight:600"></div></div>';
  h += '<div class="form-field"><label>অথবা Image URL</label><input type="text" id="s-about-img" value="' + (s.aboutImage||'') + '" placeholder="https://..."></div>';
  h += '<button class="btn btn-primary" style="width:100%" onclick="saveAboutImageSettings()">💾 Save About Image</button>';
  h += '</div></div></div>';


  h += '</div>'; // end 2-col grid

  // --- LOOKBOOK MANAGER (full width below) ---
  var lookbookItems = s.lookbookItems;
  if (typeof lookbookItems === 'string') {
    try { lookbookItems = JSON.parse(lookbookItems); } catch(e) { lookbookItems = null; }
  }
  if (!lookbookItems || !Array.isArray(lookbookItems)) {
    lookbookItems = [
      { id: 'lb-tshirt', img: 'images/product-tee.png',    label: 'T-Shirt', category: 't-shirt' },
      { id: 'lb-hoodie', img: 'images/product-hoodie.png', label: 'Hoodie',  category: 'hoodie'  },
      { id: 'lb-cargo',  img: 'images/product-cargo.png',  label: 'Cargo',   category: 'cargo'   },
      { id: 'lb-cap',    img: 'images/product-cap.png',    label: 'Cap',     category: 'cap'     }
    ];
  }

  h += '<div class="panel" style="border:1px solid rgba(139,92,246,.4);margin-top:1.5rem">';
  h += '<div class="panel-header" style="background:rgba(139,92,246,.1)"><div class="panel-title">🖼️ Lookbook Manager</div></div>';
  h += '<div class="panel-body">';
  h += '<p style="font-size:.8rem;color:var(--ash);margin-bottom:1.5rem">Lookbook section-এর ছবি পরিবর্তন করুন, নতুন আইটেম যুক্ত করুন বা মুছুন।</p>';

  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem">';
  for (var i = 0; i < lookbookItems.length; i++) {
    var item = lookbookItems[i];
    h += '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden">';
    h += '<div style="position:relative;aspect-ratio:2/3;overflow:hidden">';
    h += '<img src="' + item.img + '" id="lb-img-prev-' + i + '" style="width:100%;height:100%;object-fit:cover;filter:brightness(.75)" onerror="this.src=\'images/product-tee.png\'">';
    h += '<label style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);cursor:pointer;opacity:0;transition:.2s" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">';
    h += '<span style="background:var(--accent);color:#fff;padding:.4rem .8rem;border-radius:4px;font-size:.65rem;letter-spacing:.1em">📷 Change</span>';
    h += '<input type="file" accept="image/*" style="display:none" onchange="changeLookbookPhoto(this,' + i + ')">';
    h += '</label></div>';
    h += '<div style="padding:.75rem">';
    h += '<input type="text" value="' + item.label + '" id="lb-label-' + i + '" placeholder="Label" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--white);padding:.4rem .6rem;font-size:.8rem;border-radius:4px;box-sizing:border-box;margin-bottom:.5rem">';
    h += '<select id="lb-cat-' + i + '" style="width:100%;background:rgba(13,11,18,.95);border:1px solid rgba(255,255,255,.1);color:var(--ash);padding:.4rem .6rem;font-size:.75rem;border-radius:4px;box-sizing:border-box;margin-bottom:.6rem">';
    ['t-shirt','hoodie','cargo','cap'].forEach(function(cat) {
      h += '<option value="' + cat + '"' + (item.category===cat?' selected':'') + '>' + cat.charAt(0).toUpperCase()+cat.slice(1) + '</option>';
    });
    h += '</select>';
    h += '<div style="display:flex;gap:.4rem">';
    h += '<button class="btn btn-primary" style="flex:1;padding:.4rem;font-size:.7rem" onclick="saveLookbookItem(' + i + ')">💾</button>';
    h += '<button onclick="deleteLookbookItem(' + i + ')" style="padding:.4rem .6rem;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171;font-size:.8rem;border-radius:4px;cursor:pointer">🗑</button>';
    h += '</div></div></div>';
  }
  h += '</div>';

  // Add new
  h += '<div style="border:1px dashed rgba(139,92,246,.4);border-radius:8px;padding:1.2rem">';
  h += '<div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:1rem">+ নতুন Lookbook Item যুক্ত করুন</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:.75rem">';
  h += '<div><label style="font-size:.7rem;color:var(--ash);display:block;margin-bottom:.3rem">Photo</label>';
  h += '<button type="button" class="btn btn-primary" style="width:100%;padding:.5rem;font-size:.75rem" onclick="document.getElementById(\'lb-new-file\').click()">📁 Choose</button>';
  h += '<input type="file" id="lb-new-file" accept="image/*" style="display:none" onchange="previewNewLookbook(this)">';
  h += '<img id="lb-new-preview" style="display:none;height:50px;width:50px;object-fit:cover;border-radius:4px;margin-top:.4rem;border:1px solid rgba(139,92,246,.4)">';
  h += '<input type="hidden" id="lb-new-img-data"></div>';
  h += '<div><label style="font-size:.7rem;color:var(--ash);display:block;margin-bottom:.3rem">Label</label>';
  h += '<input type="text" id="lb-new-label" placeholder="e.g. Summer Drop" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--white);padding:.5rem;font-size:.8rem;border-radius:4px;box-sizing:border-box"></div>';
  h += '<div><label style="font-size:.7rem;color:var(--ash);display:block;margin-bottom:.3rem">Category</label>';
  h += '<select id="lb-new-cat" style="width:100%;background:rgba(13,11,18,.95);border:1px solid rgba(255,255,255,.1);color:var(--ash);padding:.5rem;font-size:.8rem;border-radius:4px;box-sizing:border-box">';
  h += '<option value="t-shirt">T-Shirt</option><option value="hoodie">Hoodie</option><option value="cargo">Cargo</option><option value="cap">Cap</option>';
  h += '</select></div></div>';
  h += '<button class="btn btn-primary" style="width:100%;padding:.6rem" onclick="addLookbookItem()">+ Add to Lookbook</button>';
  h += '</div>';

  h += '</div></div>'; // end lookbook panel

  c.innerHTML = h;
}

/* ══════════════════════════════════════════════════
   LOOKBOOK MANAGER
══════════════════════════════════════════════════ */

async function getLookbookItems() {
  var s = (await HazeDB.getSettings()) || {};
  var items = s.lookbookItems;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch(e) { items = null; }
  }
  return items || [
    { id: 'lb-tshirt', img: 'images/product-tee.png',    label: 'T-Shirt', category: 't-shirt' },
    { id: 'lb-hoodie', img: 'images/product-hoodie.png', label: 'Hoodie',  category: 'hoodie'  },
    { id: 'lb-cargo',  img: 'images/product-cargo.png',  label: 'Cargo',   category: 'cargo'   },
    { id: 'lb-cap',    img: 'images/product-cap.png',    label: 'Cap',     category: 'cap'     }
  ];
}

function changeLookbookPhoto(input, idx) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = async function() {
      var canvas = document.createElement('canvas');
      var max = 800;
      var w = img.width, h = img.height;
      if (w > h) { if (w > max) { h *= max/w; w = max; } }
      else { if (h > max) { w *= max/h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var b64 = canvas.toDataURL('image/jpeg', 0.85);

      // Update preview immediately
      var preview = document.getElementById('lb-img-prev-' + idx);
      if (preview) preview.src = b64;

      // Save to settings
      try {
        var items = await getLookbookItems();
        items[idx].img = b64;
        await HazeDB.updateSettings({ lookbookItems: JSON.stringify(items) });
        toast('✓ Photo changed!');
      } catch(e) { toast('Error: ' + e.message, 'error'); }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveLookbookItem(idx) {
  try {
    var items = await getLookbookItems();
    items[idx].label    = document.getElementById('lb-label-' + idx).value.trim();
    items[idx].category = document.getElementById('lb-cat-' + idx).value;
    await HazeDB.updateSettings({ lookbookItems: JSON.stringify(items) });
    toast('✓ Lookbook item saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteLookbookItem(idx) {
  if (!confirmDel('এই Lookbook item মুছে ফেলবেন?')) return;
  try {
    var items = await getLookbookItems();
    items.splice(idx, 1);
    await HazeDB.updateSettings({ lookbookItems: JSON.stringify(items) });
    toast('✓ Deleted!');
    await renderSettings();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

function previewNewLookbook(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var max = 800;
      var w = img.width, h = img.height;
      if (w > h) { if (w > max) { h *= max/w; w = max; } }
      else { if (h > max) { w *= max/h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var b64 = canvas.toDataURL('image/jpeg', 0.85);
      document.getElementById('lb-new-img-data').value = b64;
      var prev = document.getElementById('lb-new-preview');
      prev.src = b64;
      prev.style.display = 'block';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function addLookbookItem() {
  var imgData = document.getElementById('lb-new-img-data').value;
  var label   = document.getElementById('lb-new-label').value.trim();
  var cat     = document.getElementById('lb-new-cat').value;
  if (!imgData) { toast('Please choose a photo first!', 'error'); return; }
  if (!label)   { toast('Please enter a label!', 'error'); return; }
  try {
    var items = await getLookbookItems();
    items.push({ id: 'lb-' + Date.now(), img: imgData, label: label, category: cat });
    await HazeDB.updateSettings({ lookbookItems: JSON.stringify(items) });
    toast('✓ Lookbook item added!');
    await renderSettings();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveStoreSettings() {
  try {
    await HazeDB.updateSettings({
      storeName: document.getElementById('s-name').value.trim(),
      tagline: document.getElementById('s-tagline').value.trim(),
      email: document.getElementById('s-email').value.trim(),
      phone: document.getElementById('s-phone').value.trim()
    });
    toast('✓ Store info saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function savePaymentSettings() {
  try {
    await HazeDB.updateSettings({
      bkash: document.getElementById('s-bkash').value.trim(),
      nagad: document.getElementById('s-nagad').value.trim()
    });
    toast('✓ Payment info saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function saveSocialSettings() {
  var btn = document.getElementById('social-save-btn');
  var msg = document.getElementById('social-save-msg');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var res = await HazeDB.updateSettings({
      instagram: document.getElementById('s-ig').value.trim(),
      facebook: document.getElementById('s-fb').value.trim(),
      tiktok: document.getElementById('s-tt').value.trim()
    });
    if (!res || res.ok === false) throw new Error(res ? (res.error||'Failed') : 'No response');
    toast('✓ Social links saved!');
    if (msg) { msg.textContent = '✓ Saved!'; msg.style.color = '#4ade80'; msg.style.display = 'block'; }
  } catch(e) {
    toast('Error: ' + e.message, 'error');
    if (msg) { msg.textContent = '✗ ' + e.message; msg.style.color = '#f87171'; msg.style.display = 'block'; }
  }
  if (btn) { btn.disabled = false; btn.textContent = '💾 Save Social Links'; }
}

async function uploadAboutImage(input) {
  var file = input.files[0];
  if (!file) return;
  var status = document.getElementById('about-img-status');
  status.textContent = '⏳ Uploading...';
  status.style.color = 'var(--accent)';
  var formData = new FormData();
  formData.append('image', file);
  try {
    var res = await fetch('api.php?action=upload_image', {method:'POST', body:formData});
    var data = await res.json();
    if (data.ok) {
      document.getElementById('s-about-img').value = data.url;
      status.textContent = '✓ Uploaded! Click Save.';
      status.style.color = '#4ade80';
      return;
    }
  } catch(e) {}
  var reader = new FileReader();
  reader.onload = function(ev) {
    document.getElementById('s-about-img').value = ev.target.result;
    status.textContent = '✓ Ready! Click Save.';
    status.style.color = '#4ade80';
  };
  reader.readAsDataURL(file);
}

async function saveAboutImageSettings() {
  var url = document.getElementById('s-about-img').value.trim();
  if (!url) { toast('ছবি দেননি', 'error'); return; }
  try {
    await HazeDB.updateSettings({aboutImage: url});
    toast('✓ About image saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}



/* ══════════════════════════════════════════════════
   COUPONS
══════════════════════════════════════════════════ */
async function renderCoupons() {
  var c = document.getElementById('admin-content');
  var coupons = (await HazeDB.getCoupons()) || [];

  var h = '<div class="panel" style="margin-bottom:2rem;border:1px solid rgba(139,92,246,.3)"><div class="panel-header" style="background:rgba(139,92,246,.1)"><div class="panel-title">➕ নতুন Coupon তৈরি করুন</div></div><div class="panel-body">';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;align-items:end">';
  h += '<div><label style="font-size:.75rem;color:var(--smoke);display:block;margin-bottom:.3rem">Coupon Code *</label><input type="text" id="inline-cp-code" placeholder="e.g. HAZE20" style="text-transform:uppercase;font-family:monospace;letter-spacing:.1em;padding:.65rem;width:100%;background:rgba(107,79,160,.08);border:1px solid rgba(107,79,160,.25);color:var(--ghost);outline:none;box-sizing:border-box" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,\'\')"></div>';
  h += '<div><label style="font-size:.75rem;color:var(--smoke);display:block;margin-bottom:.3rem">Discount Type *</label><select id="inline-cp-type" style="padding:.65rem;width:100%;background:rgba(107,79,160,.08);border:1px solid rgba(107,79,160,.25);color:var(--ghost);outline:none"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (৳)</option></select></div>';
  h += '<div><label style="font-size:.75rem;color:var(--smoke);display:block;margin-bottom:.3rem">Discount Amount *</label><input type="number" id="inline-cp-value" placeholder="e.g. 20" style="padding:.65rem;width:100%;background:rgba(107,79,160,.08);border:1px solid rgba(107,79,160,.25);color:var(--ghost);outline:none;box-sizing:border-box"></div>';
  h += '<div><label style="font-size:.75rem;color:var(--smoke);display:block;margin-bottom:.3rem">Min Order ৳</label><input type="number" id="inline-cp-min" value="0" style="padding:.65rem;width:100%;background:rgba(107,79,160,.08);border:1px solid rgba(107,79,160,.25);color:var(--ghost);outline:none;box-sizing:border-box"></div>';
  h += '<div><button type="button" class="btn btn-primary" id="inline-cp-btn" onclick="createInlineCoupon()" style="width:100%;padding:.7rem;font-weight:700">✓ Save Coupon</button></div>';
  h += '</div></div></div>';

  h += '<div style="margin-bottom:1rem"><div style="font-weight:700;font-size:1.1rem;color:var(--ghost)">All Coupon Codes</div><div style="font-size:.8rem;color:var(--smoke)">' + coupons.length + ' coupon' + (coupons.length!==1?'s':'') + '</div></div>';
  h += '<div class="panel"><div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Used/Max</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  if (coupons.length === 0) {
    h += '<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--smoke)">No coupons yet</td></tr>';
  } else {
    coupons.forEach(function(cp) {
      var discTxt = cp.discount_type === 'percentage' ? cp.discount_value + '%' : '৳' + (+cp.discount_value).toLocaleString();
      h += '<tr>';
      h += '<td><code style="background:rgba(139,92,246,.15);color:var(--accent);padding:.3rem .8rem;border-radius:4px;font-size:.9rem;letter-spacing:.1em;font-weight:700">' + cp.code + '</code></td>';
      h += '<td><strong style="color:#4ade80">' + discTxt + ' OFF</strong></td>';
      h += '<td>' + (+cp.min_order > 0 ? '৳' + (+cp.min_order).toLocaleString() : 'No Limit') + '</td>';
      h += '<td>' + cp.used_count + ' / ' + (+cp.max_uses > 0 ? cp.max_uses : '∞') + '</td>';
      h += '<td><span class="badge ' + (cp.is_active ? 'badge-new' : 'badge-cancelled') + '">' + (cp.is_active ? 'Active' : 'Inactive') + '</span></td>';
      h += '<td><button class="btn btn-secondary btn-sm" onclick="toggleCoupon(\'' + cp.id + '\',' + (cp.is_active?0:1) + ')">' + (cp.is_active?'Disable':'Enable') + '</button> <button class="btn btn-danger btn-sm" onclick="deleteCoupon(\'' + cp.id + '\')">Delete</button></td>';
      h += '</tr>';
    });
  }
  h += '</tbody></table></div></div>';
  c.innerHTML = h;
}

async function createInlineCoupon() {
  var code = (document.getElementById('inline-cp-code').value || '').trim();
  var type = document.getElementById('inline-cp-type').value;
  var value = parseFloat(document.getElementById('inline-cp-value').value);
  var min = parseInt(document.getElementById('inline-cp-min').value) || 0;
  var btn = document.getElementById('inline-cp-btn');
  if (!code) { toast('Coupon code দিন', 'error'); return; }
  if (!value || value <= 0) { toast('Discount amount দিন', 'error'); return; }
  if (type === 'percentage' && value > 100) { toast('100% এর বেশি হবে না', 'error'); return; }
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    var res = await HazeDB.createCoupon({code:code, discountType:type, discountValue:value, minOrder:min, maxUses:0});
    if (res && res.ok) { toast('✓ Coupon "' + code + '" created!'); await renderCoupons(); }
    else { toast((res && res.error) || 'Failed', 'error'); btn.disabled = false; btn.textContent = '✓ Save Coupon'; }
  } catch(e) { toast('Error: ' + e.message, 'error'); btn.disabled = false; btn.textContent = '✓ Save Coupon'; }
}

async function toggleCoupon(id, isActive) {
  await HazeDB.toggleCoupon(id, isActive);
  toast(isActive ? '✓ Coupon enabled' : '✓ Coupon disabled');
  await renderCoupons();
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  await HazeDB.deleteCoupon(id);
  toast('✓ Coupon deleted');
  await renderCoupons();
}
