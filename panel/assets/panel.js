// ================================================================
// Wearhaze Panel — Core JS Utilities
// ================================================================

const API = '/panel/api/panel_api.php';

const CAT_LABELS = {
  investment:       'বিনিয়োগ',
  product_purchase: 'পণ্য ক্রয়',
  sale:             'বিক্রয়',
  salary:           'বেতন',
  marketing:        'মার্কেটিং',
  rent:             'ভাড়া',
  profit:           'লাভ',
  other:            'অন্যান্য'
};

// ---- API Wrapper ----
async function api(action, method = 'GET', body = null) {
  const url = `${API}?action=${action}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(url, opts);
    if (r.status === 401) { window.location.href = '/panel/'; return null; }
    return await r.json();
  } catch (e) {
    console.error('API error:', e);
    showToast('নেটওয়ার্ক সমস্যা হয়েছে।', 'error');
    return null;
  }
}

// ---- Money Formatter ----
function fmt(n) {
  return '৳' + parseFloat(n || 0).toLocaleString('bn-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// ---- Date Formatter ----
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- DateTime Formatter ----
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString('bn-BD', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ---- Toast Notification ----
let _toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(_toastTimer);
  t.className = 'toast ' + type;
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  t.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
  t.classList.remove('hidden');
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ---- Modal Helpers ----
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
}

// ---- Clock ----
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// ---- Sidebar Toggle ----
document.addEventListener('DOMContentLoaded', () => {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sbOverlay');

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    overlay?.classList.remove('hidden');
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    overlay?.classList.add('hidden');
  }

  toggle?.addEventListener('click', () => {
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay?.addEventListener('click', closeSidebar);
});

// ---- Close modals on Escape ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => {
      m.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }
});

// ---- Close modals on overlay click ----
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    const modal = e.target.closest('.modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }
});

// ---- Set Today's Date ----
function setToday(formId, fieldName) {
  const form = document.getElementById(formId);
  if (!form) return;
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (field) field.value = new Date().toISOString().split('T')[0];
}

// ---- Pagination Renderer ----
function renderPagination(container, currentPage, totalPages, onPageChange) {
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let html = '';
  html += `<button class="pg-btn" ${currentPage===1?'disabled':''} onclick="${onPageChange}(${currentPage-1})"><i class="fas fa-chevron-left"></i></button>`;
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
      html += `<button class="pg-btn ${i===currentPage?'active':''}" onclick="${onPageChange}(${i})">${i}</button>`;
    } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
      html += `<span class="pg-btn" style="pointer-events:none">…</span>`;
    }
  }
  html += `<button class="pg-btn" ${currentPage===totalPages?'disabled':''} onclick="${onPageChange}(${currentPage+1})"><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}
