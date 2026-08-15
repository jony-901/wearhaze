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
  h += '<div class="admin-modal-footer"><button class="btn btn-danger btn-sm" onclick="deleteOrder(\'' + order.orderId + '\');this.closest(\'.admin-modal-overlay\').remove()">Delete Order</button><button class="btn btn-secondary" style="background:rgba(255,184,0,.15);color:#FFB800;border:1px solid rgba(255,184,0,.3)" onclick="printInvoice(\'' + order.orderId + '\')">🧾 Print Invoice</button><button class="btn btn-secondary" onclick="this.closest(\'.admin-modal-overlay\').remove()">Close</button></div></div>';

  var overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = h;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

async function printInvoice(orderId) {
  var order = await HazeDB.getOrder(orderId);
  if (!order) { toast('Order not found', 'error'); return; }
  var cust  = order.customer || {};
  var s     = (await HazeDB.getSettings()) || {};
  var logoSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAAAAAMCCAYAAAD3crQGAAAQAElEQVR4AeydBYAcRfbGv5q1uDshIYRgwYMEd3cOd7fDDj30uD/HcXf44XK4E5wgCU6IEuLEibtnN7I2/X9f9fTsrCW7yW6yu/lmu7qqXr2S/vXs7rxX1TWxQC8REAEREAEREAEREAEREAEREAEREIG6TiCIQS8REAEREAEREAEREAEREAEREAEREIE6TgCQA6DO32JdoAiIgAiIgAiIgAiIgAiIgAiIwCZPwADIAWAQdIiACIiACIiACIiACIiACIiACIhAXSbAa5MDgBQUREAEREAEREAEREAEREAEREAERKDuEvBXJgeAx6CTCIiACIiACIiACIiACIiACIiACNRVAuF1yQEQctBZBERABERABERABERABERABERABOomgcRVyQGQAKFIBERABERABERABERABERABERABOoigeia5ACISCgWAREQAREQAREQAREQAREQAREQgbpHIHlFcgAkUSghAiIgAiIgAiIgAiIgAiIgAiIgAnWNQNH1yAFQxEIpERABERABERABERABERABERABEahbBFKuRg6AFBhKioAIiIAIiIAIiIAIiIAIiIAIiEBdIpB6LXIApNJQWgREQAREQAREQAREQAREQAREQATqDoFiVyIHQDEcyoiACIiACIiACIiACIiACIiACIhAXSFQ/DrkACjOQzkREAEREAEREAEREAEREAEREAERqBsESlyFHAAlgCgrAiIgAiIgAiIgAiIgAiIgAiIgAnWBQMlrkAOgJBHlRUAEREAEREAEREAEREAEREAERKD2Eyh1BXIAlEIigQiIgAiIgAiIgAiIgAiIgAiIgAjUdgKlxy8HQGkmkoiACIiACIiACIiACIiACIiACIhA7SZQxujlACgDikQiIAIiIAIiIAIiIAIiIAIiIAIiUJsJlDV2OQDKoiKZCIiACIiACIiACIiACIiACIiACNReAmWOXA6AMrFIKAIiIAIiIAIiIAIiIAIiIAIiIAK1lUDZ45YDoGwukoqACIiACIiACIiACIiACIiACIhA7SRQzqjlACgHjMQiIAIiIAIiIAIiIAIiIAIiIAIiUBsJlDdmOQDKIyO5CIiACIiACIiACIiACIiACIiACNQ+AuWOWA6ActGoQAREQAREQAREQAREQAREQAREQARqG4HyxysHQPlsVCICIiACIiACIiACIiACIiACIiACtYvAGkYrB8Aa4KhIBERABERABERABERABERABERABGoTgTWNVQ6ANdFRmQiIgAiIgAiIgAiIgAiIgAiIgAjUHgJrHKkcAGvEo0IREAEREAEREAEREAEREAEREAERqC0E1jxOOQDWzEelIiACIiACIiACIiACIiACIiACIlA7CKxllHIArAWQikVABERABERABERABERABERABESgNhBY2xjlAFgbIZWLgAiIgAiIgAiIgAiIgAiIgAiIQM0nsNYRygGwVkRSEAEREAEREAEREAEREAEREAEREIGaTmDt45MDYO2MpCECIiACIiACIiACIiACIiACIiACNZtABUYnB0AFIElFBERABERABERABERABERABERABGoygYqMTQ6AilCSjgiIgAiIgAiIgAiIgAiIgAiIgAjUXAIVGpkcABXCJCUREAEREAEREAEREAEREAEREAERqKkEKjYuOQAqxklaIiACIiACIiACIiACIiACIiACIlAzCVRwVHIAVBCU1ERABERABERABERABERABERABESgJhKo6JjkAKgoKemJgAiIgAiIgAiIgAiIgAiIgAiIQM0jUOERyQFQYVRSFAEREAEREAEREAEREAEREAEREIGaRqDi45EDoOKspCkCIiACIiACIiACIiACIiACIiACNYtAJUYjB0AlYElVBERABERABERABERABERABERABGoSgcqMRQ6AytCSrgiIgAiIgAiIgAiIgAiIgAiIgAjUHAKVGokcAJXCJWUREAEREAEREAEREAEREAEREAERqCkEKjcOOQAqx0vaIiACIiACIiACIiACIiACIiACIlAzCFRyFHIAVBKY1EVABERABERABERABERABERABESgJhCo7BjkAKgsMemLgAiIgAiIgAiIgAiIgAiIgAiIwMYnUOkRyAFQaWSqIAIiIAIiIAIiIAIiIAIiIAIiIAIbm0Dl+5cDoPLMVEMEREAEREAEREAEREAEREAEREAENi6BdehdDoB1gKYqIiACIiACIiACIiACIiACIiACIrAxCaxL33IArAs11REBERABERABERABERABERABERCBjUdgnXqWA2CdsKmSCIiACIiACIiACIiACIiACIiACGwsAuvWb51wAASzbkZ8WAbiv6X7EPxm6V8t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77z3Rut/E+4YDbc/AbF6TWssAjkAauyt0cBEQAREQAREQAREQAREQAREoPIEYpmN0O70F70TwGXUg17VTyCW2QANuh2KVkf9HS6WXv0drmMPcgCsIzhVEwEREAEREAEREAEREAEREIGaSiCtUVtsdsnn6HBeL7Q99XmFambQ4YKPsdlFnyKtfoua+pbw45IDwGPQSQREQAREQAREQAREQAREQATqFgGuBGi49eFouvsFCtXMoEHXA1GTZ/6jd7YcABEJxSIgAiIgAiIgAiIgAiIgAiIgAiKwbgRqRS05AGrFbdIgRUAEREAEREAEREAEREAEREAEai6B2jEyOQBqx33SKEVABERABERABERABERABERABGoqgVoyLjkAasmN0jBFQAREQAREQAREQAREQAREQARqJoHaMio5AGrLndI4RUAEREAEREAEREAEREAEREAEaiKBWjMmOQBqza3SQEVABERABERABERABERABERABGoegdozIjkAas+90khFQAREQAREQAREQAREQAREQARqGoFaNB45AGrRzdJQRUAEREAEREAEREAEREAEREAEahaB2jQaOQBq093SWEVABERABERABERABERABERABGoSgVo1FjkAatXt0mBFQAREQAREQAREQAREQAREQARqDoHaNRI5AGrX/dJoRUAEREAEREAEREAEREAEREAEagqBWjYOOQBq2Q3TcEVABERABERABERABERABERABGoGgdo2CjkAatsd03hFQAREQAREQAREQAREQAREQARqAoFaNwY5AGrdLdOARUAEREAEREAEREAEREAEREAENj6B2jcCOQBq3z3TiEVABERABERABERABERABERABDY2gVrYvxwAtfCmacgiIAIiIAIiIAIiIAIiIAIiIAIbl0Bt7F0OgNp41zRmERABERABERABERABERABERCBjUmgVvYtB0CtvG0atAiIgAiIgAiIgAiIgAiIgAiIwMYjUDt7lgOgdt43jVoEREAEREAEREAEREAEREAERGBjEail/coBUEtvnIYtAiIgAiIgAiIgAiIgAiIgAiKwcQjU1l7lAKitd07jFgEREAEREAEREAEREAEREAER2BgEam2fcgDU2lungYuACIiACIiACIiACIiACIiACGx4ArW3RzkAau+908hFQAREQAREQAREQAREQAREQAQ2NIFa3J8cALX45mnoIiACIiACIiACIiACIiACIiACG5ZAbe5NDoDafPc0dhEQAREQAREQAREQAREQAREQgQ1JoFb3JQdArb59GrwIiIAIiIAIiIAIiIAIiIAIiMCGI1C7e5IDoHbfP43MaCfiAAAQAElEQVReBERABERABERABERABERABERgQxGo5f3IAVDLb6CGLwIiIAIiIAIiIAIiIAIiIAIisGEI1PZe5ACo7XdQ4xcBERABERABERABERABERABEdgQBGp9H3IA1PpbqAsQAREQAREQAREQAREQAREQARGofgK1v4e64QBY2AeY/H8KYqD3gN4Deg/oPaD3gN4Deg/oPaD3gN4Deg/oPVA974GKci3MqbGegjriAPgKmPQ3BTHQe0DvAb0H9B7Qe0DvAb0H9B7Qe0DvAb0H9B6olvdAhW3Ogmw5AGosAQ1MBERABERABERABERABERABERABNZMoE6U1o0VAHXiVugiREAEREAEREAEREAEREAEREAEaiaBujGquuEAaHkosOUdCmKg94DeA3oP6D2g94DeA3oP6D2g94DeA3oP6D1Q9e+ByjBNa1RjvQV1wwHQ+lig2/0KYqD3gN4Deg/oPaD3gN4Deg/oPaD3gN4Deg/oPVDl74FK2ZvpjeUAqLEENDAREAEREAEREAEREAEREAEREAERKJ9AnSmpGysA6szt0IWIgAiIgAiIgAiIgAiIgAiIgAjULAJ1ZzRyANSde6krEQEREAEREAEREAEREAEREAERqGoCdag9OQDq0M3UpYiACIiACIiACIiACIiACIiACFQtgbrUmhwAdelu6lpEQAREQAREQAREQAREQAREQASqkkCdaksOgDp1O3UxIiACIiACIiACIiACIiACIiACVUegbrUkB0Ddup+6GhEQAREQAREQAREQAREQAREQgaoiUMfakQOgjt1QXY4IiIAIiIAIiIAIiIAIiIAIiEDVEKhrrcgBUNfuqK5HBERABERABERABERABERABESgKgjUuTbkAKhzt1QXJAIiIAIiIAIiIAIiIAIiIAIisP4E6l4LcgDUvXuqKxIBERABERABERABERABERABEVhfAnWwvhwAdfCm6pJEQAREQAREQAREQAREQAREQATWj0BdrC0HQF28q7omERABERABERABERABERABERCB9SFQJ+vKAVAnb6suSgREQAREQAREQAREQAREQAREYN0J1M2acgDUzfuqqxIBERABERABERABERABERABEVhXAnW0nhwAdfTG6rJEQAREQAREQAREQAREQAREQATWjUBdrSUHQF29s7ouERABERABERABERABERABERCBdSFQZ+vIAVBnb60uTAREQAREQAREQAREQAREQAREoPIE6m4NOQDq7r3VlYmACIiACIiACIiACIiACIiACFSWQB3WlwOgDt9cXZoIiIAIiIAIiIAIiIAIiIAIiEDlCNRlbTkA6vLd1bWJgAiIgAiIgAiIgAiIgAiIgAhUhkCd1pUDoE7fXl2cCIiACIiACIiACIiACIiACIhAxQnUbU05AOr2/dXViYAIiIAIiIAIiIAIiIAIiIAIVJRAHdeTA6CO32BdngiIgAiIgAiIgAiIgAiIgAiIQMUI1HUtOQDq+h3W9YmACIiACIiACIiACIiACIiACFSEQJ3XkQOgzt9iXaAIiIAIiIAIiIAIiIAIiIAIiMDaCdR9DTkA6v491hWKgAiIgAiIgAiIgAiIgAiIgAisjcAmUC4HwCZwk3WJIiACIiACIiACIiACIiACIiACayawKZTKAbAp3GVdowiIgAiIgAiIgAiIgAiIgAiIwJoIbBJlcgBsErdZFykCIiACIiACIiACIiACIiACIlA+gU2jRA6ATeM+6ypFQAREQAREQAREQAREQAREQATKI7CJyOUA2ERutC5TBERABERABERABERABERABESgbAKbilQOgE3lTus6RUAEREAEREAEREAEREAEREAEyiKwycjkANhkbrUuVAREQAREQAREQAREQAREQAREoDSBTUciB8Cmc691pSIgAiIgAiIgAiIgAiIgAiIgAiUJbEJ5OQA2oZutSxUBERABERABERABERABERABEShOYFPKyQGwKd1tXasIiIAIiIAIiIAIiIAIiIAIiEAqgU0qLQfAJnW7dbEiIAIiIAIiIAIiIAIiIAIiIAJFBDatlBwAm9b91tWKgAiIgAiIgAiIgAiIgAiIgAhEBDaxWA6ATeyG63JFQAREQAREQAREQAREQAREQARCApvaWQ6ATe2O63pFQAREQAREQAREQAREQAREQARIYJMLcgBscrdcFywCIiACIiACIiACIiACIiACIgBsegzkANj07rmuWAREQAREQAREQAREQAREQAREYBMk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0VhFQAREQAQ2TQKZ5vTOSE+v8xcfi8XAiYZN4Vrr/M3UBYqACNQVApv8dcgBsMm/BQRABERABERABERABERABERABDYFArpGOQD0HhABERABERABERABERABERABEaj7BHSFkANAbwIREAEREAEREAEREAEREAEREIE6T0AXCDkA9CYQAREQAREQAREQAREQAREQARGo8wR0gUZAKwAMgg4REAEREAEREAEREAEREAEREIG6TEDXRgJyAJCCggiIgAiIgAiIgAiIgAiIgAiIQN0loCvzBOQA8Bh0EgEREAEREAEREAEREAEREAERqKsEdF0hATkAQg46i4AIiIAIiIAIiIAIiIAIiIAI1E0CuqoEATkAEiAUiYAIiIAIiIAIiIAIiIAIiIAI1EUCuqaIgBwAEQnFIiACIiACIiACIiACIiACIiACdY+ArihJQA6AJAolREAEREAEREAEREAEREAEREAE6hoBXU8RATkAilgoJQIiIAIiIAIiIAIiIAIiIAIiULcI6GpSCMgBkAJDSREQAREQAREQAREQAREQAREQgbpEQNeSSqDOOACCIMCKFSuQk5OTDKtXr0691mR65cqVSR3qr1q1Klm2pkTJPuLx+JrUK1zGdjmGBQsWYMaMGZg3b56/FsrLaiQaP6+3qsaQ2g/7jfogH+ZTy0umWV6WPuUcI9tgXLJeRfOp7bCttQX2VVhYWNHmvR7fK1G7BQUFXrYhT7m5ucn3ZH5+foW6pl40Zr5/KlSphBLfP+QVtUPWJVSUFQEREAEREAEREAEREIHaS0AjL0agzjgAaMCde+65OO2005Lhb3/7W7GLZYbG3VlnnZXUof5dd92Fihg+8+fPx9lnn52sO27cODa5XmHWrFm45pprcPrpp+Okk07CscceixNOOMH3wfEvXbq0VPsXXHCBLz/vvPPA+qUU1lOwcOFCPyayYZg9e/YaW1y0aBGuvvpqPybqL1++3OuT10UXXeTl55xzjpety2nZsmW+DbZdkXDmmWfi999/r1RXDz30ULKPAQMGVKpuVSi/8MILyf6/+OKLCjX55ZdfJuvce++9yMvLq1C9VKVJkyYh9feGrFPLlRYBERABERABERABERCB2kxAYy9OoM44ADjjO3jwYAwaNCgZevXqBRr8qZc8ZMgQ/Pzzz0kd6lfUWKSTgfVZhyE7Ozu16UqnBw4c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RogQTpcDgr39GPQlARIgARIgARIgARIgARL4XAJ+pbPPzZHpScAfAtj5oEe/0bJ24zZtWZApfRp/Yn6e983/7kj7boNlzvxlSviMLDBFNwzj8zINZGpYm2AryrYt6knGdKkESoh+QydK194jZNDwyTJ09FTp2X+M9Og/Wq+RkCB+HGnaoLpgaoerq6t+yncFc0v8eLFl34Fj0rnHMBV/tGAu/csXr6Rsqe+VoBxdxwuRBxaaBEiABEiABEiABEiABEjgmxGgAuCboQ99D4YIniB+bMmcMa383LS2Es4jydf4ixUrumC6Qt5cWaV5oxoSI3q0r/GYAPPEDgP1alWUAT3bCpQBxYvmlzixYwqmK8C0HtNNYEbfslltyZQhtZUlB6wn2rdsINUqlZa0aZIrZUAcqV65jAzo1V6KFM5j16oiwMIEo0AWhQRIgARIgARIgARIgARI4NsRoALg27EPdU+OHj2q/NyktjSpX1WSJk7w1eqP1e2bNKgmtaqVFUzh+GoP+kjGzs5OEjFieL3dYLEi+aWxqneHVg21RQLWo8DUD5TVXjbu7mGkYL4cilU1xayWnlYQJUpEK0WBvXTB3I/FIwESIAESIAESIAESIAES+IYEqAD4hvD5aBIIXQRYWxIgARIgARIgARIgARIggW9JgAqAb0mfzyaB0ESAdSUBEiABEiABEiABEiABEvimBKgA+Kb4+XASCD0EWFMSIAESIAESIAESIAESIIFvS4AKgG/Ln08ngdBCgPUkARIgARIgARIgARIgARL4xgSoAPjGDcDHk0DoIMBakgAJkAAJkAAJkAAJkAAJfGsCVAB86xbg80kgNBBgHUmABEiABEiABEiABEiABL45ASoAvnkTsAAk4PgEWEMSIAESIAESIAESIAESIIFvT4AKgG/fBiwBCTg6AdaPBEiABEiABEiABEiABEggGBCgAiAYNAKLQAKOTYC1IwESIAESIAESIAESIAESCA4EqAAIDq3AMpCAIxNg3UiABEiABEiABEiABEiABIIFASoAgkUzsBAk4LgEWDMSIAESIAESIAESIAESIIHgQYAKgODRDiwFCTgqAdaLBEiABEiABEiABEiABEggmBCgAiCYNASLQQKOSYC1IgESIAESIAESIAESIAESCC4EqAAILi3BcpCAIxJgnUiABEiABEiABEiABEiABIINASoAgk1TsCAk4HgEWCMSIAESIAESIAESIAESIIHgQ4AKgODTFiwJCTgaAdaHBEiABEiABEiABEiABEggGBGgAiAYNQaLQgKORYC1IQESIAESIAESIAESIAESCE4EqAAITq3BspCAIxFgXUiABEiABEiABEiABEiABIIVASoAglVzsDAk4DgEWBMSIAESIAESIAESIAESIIHgRYAKgODVHiwNCTgKAdaDBEiABEiABEiABEiABEggmBGgAiCYNQiLQwKOQYC1IAESIAESIAESIAESIAESCG4EqAAIbi3C8pCAIxBgHUiABEiABEiABEiABEiABIIdASoAgl2TsEAkEPIJsAYkQAIkQAIkQAIkQAIkQALBjwAVAMGvTVgiEgjpBFh+EiABEiABEiABEiABEiCBYEiACoBg2CgsEgmEbAIsPQmQAAmQAAmQAAmQAAmQQHAkQAVAcGwVlokEQjIBlp0ESIAESIAESIAESIAESCBYEqACIFg2CwtFAiGXAEtOAiRAAiRAAiRAAiRAAiQQPAlQARA824WlIoGQSoDlJgESIAESIAESIAESIAESCKYEqAAIpg3DYpFAyCTAUpMACZAACZAACZAACZAACQRXAlQABNeWYblIICQSYJlJgARIgARIgARIgARIgASCLQEqAIJt07BgJBDyCLDEJEACJEACJEACJEACJEACwZeAQysA3r9/L15edGTAPvB/6gP8vPH7hn2AfYB9gH2AfYB9gH2AfSBU9AHImnDBV9S3XzKHVAB4eXnJOw9P7Tw8PYWODNgH/h99gM9gP2MfYB9gH2AfYB9gH2AfYB8IHX0A8qbZ1iFJEeBQCoD3SsnhqQV+LwlJjaCKzX8SCPkEWAMSIAESIAESIAESIAESCEUE3isB1MvrvR549lKD0CGh6g6lAIDw76kaICSAZxlJwNEIsD4kQAIkQAIkQAIkQAIkEFoJeHh6SUhQAjiMAgCwvSj8h9bPG+v97QmwBCRAAiRAAiRAAiRAAiQQqglACRDcLdEdRgEA2KG6t7HyJPBNCfDhJEACJEACJEACJEACJEACnsF8KoBDKAC8MPmCfY0ESODbEeCTSYAESIAESIAESIAESIAEJLiLpg6hAHhP039+1EjgmxLgw0mABEiABEiABEiABEiABEQpAN4HawwOoQAI1oRZOBJwfAKsIQmQAAmQAAmQAAmQAAmQ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SIAESIAESIAESIAESMCRCVAB4Mity7qRQFAIMC4JkAAJkAAJkAAJkAAJkIBDE6ACwKGbl5UjgcATYEwSIAESIAESIAESIAESIAHHJkAFgGO3L2tHAoElwHgkQAIkQAIkQAIkQAIkQAIOToAKAAdvYFaPBAJHgLFIgARIgARIgARIgARIgAQcnQAVAI7ewqwfCQSGAOOQAAmQAAmQAAmQAAmQAAk4PAEqABy+iVlBEvg4AcYgARIgARIgARIgARIgARJwfAJUADh+G7OGJPAxAgwnARIgARIgARIgARIgARIIBQSoAAgFjcwqkkDABBhKAiRAAiRAAiRAAiRAAiQQGghQARAaWpl1JIGACDCMBEiABEiABEiABEiABEggVBCgAiBUNDMrSQL+E2AICZAACZAACZAACZAACZBA6CBABUDoaGfWkgT8I0B/EiABEiABEiABEiABEiCBUEKACoBQ0tCsJgnYJ0BfEiABEiABEiABEiABEiCB0EKACoDQ0tKsJwnYI0A/EiABEiABEiABEiABEiCBUEOACoBQ09SsKAn4JUAfEiABEiABEiABEiABEiCB0EOACoDQ09asKQnYEuA9CZAACZAACZAACZAACZBAKCJABUAoamxWlQSsCfCOBEiABEiABEiABEiABEggNBGgAiA0tTbrSgKWBHhNAiRAAiRAAiRAAiRAAiQQqghQARCqmpuVJYEPBHhFAiRAAiRAAiRAAiRAAiQQughQARC62pu1JQGTAM8kQAIkQAIkQAIkQAIkQAKhjAAVAKGswVldEvAmwCMJkAAJkAAJkAAJkAAJkEBoI0AFQGhrcdaXBECAjgRIgARIgARIgARIgARIINQRcAgFwI4dO2TixIl0ZMA+EMg+wM8Lvy/YB9gH2AfYB9gH2AfYB9gH2Ae+Th948eJFsFUsOIQCYP369dK3b186MmAfCFwfICdyYh9gH2AfYB9gH2AfYB9gH2Af+Ep94Pnz51QABFsCLBgJhDoCrDAJkAAJkAAJkAAJkAAJkEBoJOAQFgChseFYZxL4ZAJMSAIkQAIkQAIkQAIkQAIkECoJUAEQKpudlQ7NBFh3EiABEiABEiABEiABEiCB0EmACoDQ2e6sdeglwJqTAAmQAAmQAAmQAAmQAAmEUgJUAITShme1QysB1psESIAESIAESIAESIAESCC0EqACILS2POsd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fLgNjBj1nQ0cMsLWbTi61gcjR4+3AYOH29qjCCDsM/9//o3/0QQ6DndcLEcAgcwX2OsHLt9++2179NFHberUqZm2g3nz5tlbb71lO3fuTLOg/v7779uPP/6Y5jB37tzkfCxdutSuueYa+/rrr61GjRrWokULmzBhgt12223Wt2/fDF0TkzcW5hMEAML8BJE9BBBAAAEEEEAgVGDUmO9tz549dtnFF9iTj9xtt1x/pd1+c1vr3OleFwzYtXu3fT78myy/Yd28ZZvppt7Ms6P5t3nLVv+Gfe/RrMo6CCAQgQIrV660oUOHWvPmze2vv/7610ewevVqV2jfsmVLmttau3atrV692k477TRbsmTJQUOnTp3cerqe3n333bZ+/Xrr3LmzDR482N577z3r2bOnu9YqALDbv666xFHwQQAgCk4ih4AAAggggAACsSGwa/ceW79hkzvYpo3rW3z8gVu5PHly27VXtTDP82zV6rW2YeNml27b9h22YNHSg2raExL22tJlK2zpPyv2F+Rd8uSP1WvW2bjvf7aff5tmmzYduMHem5hoy5avMhXglXjRkmW2fOVqTSYPW7dus2nTZ9nobyfY9BmzbOvW7cnLEhP3uX4LNvkBAM1cvOQf//sqTSYPW/zggh5z+Oa7Cfa1v425GXgkIXllJhBAIOwE4uPj7YknnrA+ffq4683HH3/8r/KY6F+HXnvtNVu8eLGdeuqpbluelzIYuXDhQjf/lFNOsQIFChw05MqVyy1Xup9//tkqVapkd955p8XFJV1XmzZtahdccIHNmDEjU1stuJ1m40fS0WVjBtg1AggggAACCCCAQMYEcufKaUWKFHKJJ/78u233C/fuy/4PBQEeuvcWe/yhDlaoYAE3d868hfbG271s5Dfj3ffgY+OmzfbBR59a7z6fpSigq/n/d9//ZM+9/I59/uU31m/gMHu665v23fhJtsuvBdvh77PPgM9t/oIlblPDv/rO3vS3ry8KDvww8Td7vtu79mGfQfblqLH+PgbZs8+/ZRMmTTY996+atP6DhtucuQu1io34epyfv95ueseOnTbsq29d+h4fDrARo8b5w1jr/u5H9sY7vWzd+g0uHR8IIBB5AgULFjQVxsuXL+8K7sER7Nq1y7+WbTdde4J5hxtPnDjRBgwYYA0bNrRWrVqlmTxo4l+2bFmbPn26jR071iZN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';
  var storeName = s.storeName || 'WEAR HAZE';
  var storeEmail = s.email || 'wearhaze.com@gmail.com';
  var storePhone = s.phone || '';
  var bkash = s.bkash || '';
  var nagad = s.nagad || '';

  var itemRows = (order.items || []).map(function(item) {
    return '<tr><td style="padding:.6rem .5rem;border-bottom:1px solid #e5e7eb">' + item.name + '<br><span style="color:#6b7280;font-size:.78rem">Size: ' + item.size + '</span></td>'
      + '<td style="padding:.6rem .5rem;border-bottom:1px solid #e5e7eb;text-align:center">' + item.qty + '</td>'
      + '<td style="padding:.6rem .5rem;border-bottom:1px solid #e5e7eb;text-align:right">৳ ' + item.price.toLocaleString() + '</td>'
      + '<td style="padding:.6rem .5rem;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700">৳ ' + (item.price * item.qty).toLocaleString() + '</td></tr>';
  }).join('');

  var payContact = order.paymentMethod === 'bkash' ? (bkash ? 'bKash: ' + bkash : '') : order.paymentMethod === 'nagad' ? (nagad ? 'Nagad: ' + nagad : '') : '';

  var invoiceDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  var statusColor = order.status === 'delivered' ? '#16a34a' : order.status === 'cancelled' ? '#dc2626' : order.status === 'shipped' ? '#2563eb' : '#d97706';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ' + order.orderId + '</title>'
    + '<style>'
    + 'body{font-family:Arial,sans-serif;color:#111;margin:0;padding:0;background:#fff}'
    + '.invoice{max-width:720px;margin:0 auto;padding:2.5rem}'
    + '@media print{body{margin:0} .no-print{display:none} .invoice{padding:1.5rem}}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'th{background:#111;color:#FFB800;padding:.6rem .5rem;text-align:left;font-size:.8rem;letter-spacing:.07em;text-transform:uppercase}'
    + 'th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:center}'
    + 'th:nth-child(3),th:nth-child(4){text-align:right}'
    + '.total-row td{padding:.5rem;font-size:.9rem;border-bottom:1px solid #e5e7eb}'
    + '</style></head><body>'
    + '<div class="invoice">'
    // HEADER
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:3px solid #FFB800">'
    + '<div style="display:flex;align-items:center;gap:1rem">'
    + '<img src="' + logoSrc + '" style="height:80px;max-width:180px;object-fit:contain" onerror="this.style.display=\'none\'">'
    + '<div><div style="font-size:1.6rem;font-weight:900;letter-spacing:.08em">' + storeName.toUpperCase() + '</div>'
    + (storePhone ? '<div style="color:#6b7280;font-size:.82rem">' + storePhone + '</div>' : '')
    + '<div style="color:#6b7280;font-size:.82rem">' + storeEmail + '</div></div></div>'
    + '<div style="text-align:right">'
    + '<div style="font-size:1.1rem;font-weight:800;color:#FFB800;letter-spacing:.05em">INVOICE</div>'
    + '<div style="font-size:.9rem;font-weight:700;margin-top:.2rem">' + order.orderId + '</div>'
    + '<div style="color:#6b7280;font-size:.8rem;margin-top:.2rem">' + invoiceDate + '</div>'
    + '<div style="margin-top:.4rem;display:inline-block;background:' + statusColor + ';color:#fff;padding:.2rem .6rem;border-radius:3px;font-size:.72rem;font-weight:700;text-transform:uppercase">' + order.status + '</div>'
    + '</div></div>'
    // CUSTOMER & DELIVERY
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:1.5rem">'
    + '<div><div style="font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;margin-bottom:.4rem">Bill To</div>'
    + '<div style="font-weight:700;font-size:1rem">' + cust.name + '</div>'
    + '<div style="color:#6b7280;font-size:.85rem;margin-top:.2rem">' + cust.phone + '</div>'
    + (cust.email ? '<div style="color:#6b7280;font-size:.85rem">' + cust.email + '</div>' : '')
    + '</div>'
    + '<div><div style="font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;margin-bottom:.4rem">Ship To</div>'
    + '<div style="color:#374151;font-size:.88rem;line-height:1.7">' + (cust.address || '') + '<br>' + (cust.city || '') + (cust.district ? ', ' + cust.district : '') + (cust.zip ? ' - ' + cust.zip : '') + '</div>'
    + '</div></div>'
    // PAYMENT INFO
    + '<div style="margin-bottom:1.5rem;padding:.8rem;background:#f9fafb;border-radius:6px;font-size:.84rem">'
    + '<span style="font-weight:600">Payment:</span> ' + order.paymentMethod.toUpperCase()
    + (cust.trxid ? ' &nbsp;|&nbsp; <span style="font-weight:600">TrxID:</span> ' + cust.trxid : '')
    + (payContact ? ' &nbsp;|&nbsp; ' + payContact : '')
    + (cust.couponCode ? ' &nbsp;|&nbsp; <span style="font-weight:600">Coupon:</span> ' + cust.couponCode : '')
    + '</div>'
    // ITEMS TABLE
    + '<table style="margin-bottom:1.2rem"><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>'
    + itemRows + '</tbody></table>'
    // TOTALS
    + '<div style="display:flex;justify-content:flex-end"><table style="width:280px">'
    + '<tr class="total-row"><td style="color:#6b7280">Subtotal</td><td style="text-align:right">৳ ' + (order.subtotal||0).toLocaleString() + '</td></tr>'
    + (order.discount > 0 ? '<tr class="total-row"><td style="color:#16a34a">Discount</td><td style="text-align:right;color:#16a34a">- ৳ ' + order.discount.toLocaleString() + '</td></tr>' : '')
    + '<tr class="total-row"><td style="color:#6b7280">Shipping</td><td style="text-align:right">৳ ' + (order.shipping||0) + '</td></tr>'
    + '<tr><td style="padding:.7rem .5rem;font-weight:800;font-size:1.05rem">Grand Total</td><td style="padding:.7rem .5rem;text-align:right;font-weight:800;font-size:1.05rem;color:#111">৳ ' + (order.total||0).toLocaleString() + '</td></tr>'
    + '</table></div>'
    + (cust.notes ? '<div style="margin-top:1rem;padding:.8rem;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;font-size:.84rem;color:#92400e">📝 Note: ' + cust.notes + '</div>' : '')
    // FOOTER
    + '<div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:.78rem">'
    + 'Thank you for shopping with ' + storeName + ' · wearhaze.com</div>'
    + '<div class="no-print" style="text-align:center;margin-top:1.5rem">'
    + '<button onclick="window.print()" style="background:#FFB800;color:#111;border:none;padding:.7rem 2rem;font-weight:800;font-size:.95rem;border-radius:6px;cursor:pointer;margin-right:.5rem">🖨️ Print</button>'
    + '<button onclick="window.close()" style="background:#f3f4f6;color:#374151;border:none;padding:.7rem 1.5rem;font-weight:600;font-size:.9rem;border-radius:6px;cursor:pointer">Close</button>'
    + '</div></div></body></html>';

  var win = window.open('', '_blank', 'width=780,height=900,scrollbars=yes');
  win.document.write(html);
  win.document.close();
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

  // NAVBAR LOGO
  var navLogoHtml = '';
  navLogoHtml += '<p style="font-size:.8rem;color:var(--ash);margin-bottom:.8rem">Navbar-এ যে লোগো/টেক্সট দেখায় সেটা এখান থেকে পরিবর্তন করুন। Image দিলে image দেখাবে, না দিলে text দেখাবে।</p>';
  navLogoHtml += field('c-nav-logo-text', '🔤 Logo Text (যেমন: HAZE)', s.navLogoText || 'HAZE');
  navLogoHtml += '<label style="font-size:.75rem;color:var(--ash);display:block;margin-top:.8rem;margin-bottom:.25rem">🖼️ Logo Image (থাকলে text-এর বদলে image দেখাবে)</label>';
  navLogoHtml += imgUploadBox('nav-logo-preview', 'nav-logo-file', s.navLogoImage||'', 'contentUploadNavLogo');
  if (s.navLogoImage) {
    navLogoHtml += '<button type="button" onclick="clearNavLogo()" style="margin-top:.5rem;background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3);padding:.4rem .9rem;border-radius:4px;font-size:.75rem;cursor:pointer">🗑️ Remove Image (text এ ফিরে যাও)</button>';
  }
  h += panel('🔷', 'Navbar Logo', navLogoHtml, 'save-nav-logo-btn', 'saveContentNavLogo');

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

  // STATS
  var statsHtml = '';
  statsHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">';
  statsHtml += field('c-stat1-num', 'Stat 1 Number', s.stat1Num || '5');
  statsHtml += field('c-stat1-label', 'Stat 1 Label', s.stat1Label || 'Products in Drop 01');
  statsHtml += field('c-stat2-num', 'Stat 2 Number', s.stat2Num || '100');
  statsHtml += field('c-stat2-label', 'Stat 2 Label', s.stat2Label || 'Cotton Premium');
  statsHtml += field('c-stat3-num', 'Stat 3 Number', s.stat3Num || '850');
  statsHtml += field('c-stat3-label', 'Stat 3 Label', s.stat3Label || 'Starting Price');
  statsHtml += field('c-stat4-num', 'Stat 4 Number', s.stat4Num || '2026');
  statsHtml += field('c-stat4-label', 'Stat 4 Label', s.stat4Label || 'Established');
  statsHtml += '</div>';
  h += panel('📊', 'Stats Section', statsHtml, 'save-stats-btn', 'saveContentStats');

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

async function saveContentNavLogo() {
  try {
    var text  = document.getElementById('c-nav-logo-text').value.trim() || 'HAZE';
    var img   = document.getElementById('nav-logo-preview');
    var imgSrc = (img && img.tagName === 'IMG') ? img.src : '';
    // Only save image if it's a real data/url (not the placeholder div)
    var imgVal = (imgSrc && imgSrc !== window.location.href) ? imgSrc : '';
    await HazeDB.updateSettings({ navLogoText: text, navLogoImage: imgVal });
    // Update navbar immediately on this tab
    updateNavLogo({ navLogoText: text, navLogoImage: imgVal });
    toast('✓ Navbar logo saved!');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

function contentUploadNavLogo(input) {
  if (!input.files[0]) return;
  contentCompressImage(input.files[0], async function(b64) {
    // Show preview
    var prev = document.getElementById('nav-logo-preview');
    if (prev) {
      var img = new Image();
      img.src = b64;
      img.style = 'height:70px;width:90px;object-fit:contain;border-radius:4px;border:1px solid rgba(139,92,246,.3)';
      img.id = 'nav-logo-preview';
      prev.parentNode.replaceChild(img, prev);
    }
  });
}

async function clearNavLogo() {
  try {
    await HazeDB.updateSettings({ navLogoImage: '' });
    updateNavLogo({ navLogoImage: '', navLogoText: document.getElementById('c-nav-logo-text')?.value || 'HAZE' });
    toast('✓ Logo image removed!');
    await renderContent();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
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

async function saveContentStats() {
  try {
    await HazeDB.updateSettings({
      stat1Num: document.getElementById('c-stat1-num').value.trim(),
      stat1Label: document.getElementById('c-stat1-label').value.trim(),
      stat2Num: document.getElementById('c-stat2-num').value.trim(),
      stat2Label: document.getElementById('c-stat2-label').value.trim(),
      stat3Num: document.getElementById('c-stat3-num').value.trim(),
      stat3Label: document.getElementById('c-stat3-label').value.trim(),
      stat4Num: document.getElementById('c-stat4-num').value.trim(),
      stat4Label: document.getElementById('c-stat4-label').value.trim()
    });
    toast('✓ Stats saved!');
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

  // Site Logo
  h += '<div class="panel" style="border:1px solid rgba(255,184,0,.35);grid-column:1/-1"><div class="panel-header" style="background:rgba(255,184,0,.08)"><div class="panel-title">🏷️ Site Logo (Browser Tab & Google Search)</div></div><div class="panel-body">';
  h += '<div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">';
  h += '<div style="text-align:center"><p style="font-size:.75rem;color:var(--ash);margin-bottom:.5rem">Current Logo</p>';
  h += '<img id="logo-preview" src="images/logo.png?v=' + Date.now() + '" style="height:80px;width:80px;object-fit:contain;border-radius:8px;border:1px solid rgba(255,184,0,.3);background:rgba(0,0,0,.3)">';
  h += '</div>';
  h += '<div style="flex:1;min-width:200px">';
  h += '<p style="font-size:.82rem;color:var(--smoke);margin-bottom:1rem">এখানে আপনার logo upload করুন। এটা browser tab icon এবং Google search-এ দেখাবে।</p>';
  h += '<label style="display:block;cursor:pointer;background:var(--accent);color:#fff;padding:.7rem 1.2rem;border-radius:6px;font-size:.82rem;font-weight:700;text-align:center;width:fit-content" id="logo-upload-label">';
  h += '📁 Choose Logo File';
  h += '<input type="file" id="logo-file-input" accept="image/*" style="display:none" onchange="uploadSiteLogo(this)">';
  h += '</label>';
  h += '<div id="logo-upload-status" style="margin-top:.6rem;font-size:.82rem;font-weight:600;min-height:1.2em"></div>';
  h += '</div></div></div></div>';




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

async function uploadSiteLogo(input) {
  var file = input.files[0];
  if (!file) return;
  var status = document.getElementById('logo-upload-status');
  var lbl    = document.getElementById('logo-upload-label');
  status.textContent = '⏳ Uploading...';
  status.style.color = 'var(--accent)';
  if (lbl) lbl.style.opacity = '0.6';
  var formData = new FormData();
  formData.append('logo', file);
  try {
    var res  = await fetch('api.php?action=upload_logo', { method: 'POST', body: formData });
    var data = await res.json();
    if (data.ok) {
      status.textContent = '✓ Logo saved! Browser tab icon updated.';
      status.style.color = '#4ade80';
      var preview = document.getElementById('logo-preview');
      if (preview) preview.src = data.url;
      toast('✓ Site logo updated!');
    } else {
      status.textContent = '✗ ' + (data.error || 'Upload failed');
      status.style.color = '#f87171';
      toast('Error: ' + (data.error || 'Upload failed'), 'error');
    }
  } catch(e) {
    status.textContent = '✗ Network error: ' + e.message;
    status.style.color = '#f87171';
    toast('Error: ' + e.message, 'error');
  }
  if (lbl) lbl.style.opacity = '1';
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
