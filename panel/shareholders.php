<?php
require_once __DIR__ . '/includes/auth.php';
requireLogin();
$user = getCurrentUser();
$isAdmin = isAdmin();
?>
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>শেয়ারহোল্ডার — Wearhaze Panel</title>
  <meta name="robots" content="noindex, nofollow">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/panel/assets/panel.css">
</head>
<body class="panel-body">
<?php include __DIR__ . '/includes/sidebar.php'; ?>
<div class="main-wrap">
<?php include __DIR__ . '/includes/topbar.php'; ?>
<div class="content">

  <div class="page-hd">
    <h2><i class="fas fa-users"></i> শেয়ারহোল্ডার</h2>
    <?php if($isAdmin): ?>
    <button class="btn-primary" onclick="openModal('addPartnerModal')"><i class="fas fa-plus"></i> নতুন পার্টনার</button>
    <?php endif; ?>
  </div>

  <div class="mini-grid" id="miniGrid">
    <div class="mini-card"><span class="mini-val" id="mPartners">—</span><span class="mini-lbl">মোট পার্টনার</span></div>
    <div class="mini-card"><span class="mini-val" id="mInvested">—</span><span class="mini-lbl">মোট বিনিয়োগ</span></div>
    <div class="mini-card"><span class="mini-val" id="mActive">—</span><span class="mini-lbl">সক্রিয়</span></div>
  </div>

  <div class="sh-grid" id="shGrid"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
</div></div>

<!-- Add Partner Modal (Admin only) -->
<?php if($isAdmin): ?>
<div class="modal hidden" id="addPartnerModal">
  <div class="modal-overlay" onclick="closeModal('addPartnerModal')"></div>
  <div class="modal-box">
    <div class="modal-hd"><h3><i class="fas fa-user-plus"></i> নতুন পার্টনার</h3><button onclick="closeModal('addPartnerModal')"><i class="fas fa-times"></i></button></div>
    <form id="addPartnerForm" onsubmit="submitPartner(event)">
      <div class="form-row">
        <div class="form-group"><label>নাম *</label><input type="text" name="name" required placeholder="পূর্ণ নাম"></div>
        <div class="form-group"><label>ইমেইল *</label><input type="email" name="email" required placeholder="email@example.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ফোন</label><input type="tel" name="phone" placeholder="01XXXXXXXXX"></div>
        <div class="form-group"><label>ভূমিকা</label><select name="role"><option value="partner">পার্টনার</option><option value="admin">অ্যাডমিন</option></select></div>
      </div>
      <div class="form-group"><label>পাসওয়ার্ড *</label><input type="password" name="password" required minlength="6" placeholder="শক্তিশালী পাসওয়ার্ড"></div>
      <div id="partnerErr" class="form-error hidden"></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:13px">পার্টনার যোগ করুন</button>
    </form>
  </div>
</div>
<?php endif; ?>

<!-- Add Investment Modal -->
<div class="modal hidden" id="addInvModal">
  <div class="modal-overlay" onclick="closeModal('addInvModal')"></div>
  <div class="modal-box">
    <div class="modal-hd"><h3><i class="fas fa-money-bill-wave"></i> <span id="invModalTitle">বিনিয়োগ যোগ</span></h3><button onclick="closeModal('addInvModal')"><i class="fas fa-times"></i></button></div>
    <form id="addInvForm" onsubmit="submitInvestment(event)">
      <input type="hidden" name="user_id" id="invUserId">
      <div class="form-row">
        <div class="form-group"><label>পরিমাণ (৳) *</label><input type="number" name="amount" required step="0.01" min="1" placeholder="0.00"></div>
        <div class="form-group"><label>তারিখ *</label><input type="date" name="date" required></div>
      </div>
      <div class="form-group"><label>নোট</label><input type="text" name="note" placeholder="কোন কিস্তি, কোন মাস ইত্যাদি"></div>
      <div id="invErr" class="form-error hidden"></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:13px">বিনিয়োগ রেকর্ড করুন</button>
    </form>
  </div>
</div>

<div id="toast" class="toast hidden"></div>
<div class="sb-overlay hidden" id="sbOverlay"></div>
<script src="/panel/assets/panel.js"></script>
<script>
const IS_ADMIN = <?= $isAdmin ? 'true' : 'false' ?>;

document.addEventListener('DOMContentLoaded', loadShareholders);

async function loadShareholders() {
  const res = await api('get_shareholders');
  if(!res||!res.success) return;
  const {data:sh, totalInvestment} = res;

  document.getElementById('mPartners').textContent = sh.length;
  document.getElementById('mInvested').textContent = fmt(totalInvestment);
  document.getElementById('mActive').textContent = sh.filter(s=>s.is_active==1).length;

  const grid = document.getElementById('shGrid');
  if(!sh.length) { grid.innerHTML='<div class="empty"><i class="fas fa-users-slash"></i><p>কোনো পার্টনার নেই।</p></div>'; return; }

  grid.innerHTML = sh.map(s => {
    const init = s.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    return `<div class="sh-card ${s.is_active==0?'inactive':''}">
      <div class="sh-avatar">${init}</div>
      <div class="sh-name">${s.name} <span class="badge ${s.role==='admin'?'b-gold':'b-blue'}">${s.role==='admin'?'অ্যাডমিন':'পার্টনার'}</span></div>
      <div class="sh-email">${s.email}${s.phone?' · '+s.phone:''}</div>
      <div class="sh-bar"><div class="sh-fill" style="width:${s.share_pct}%"></div></div>
      <div class="sh-stats">
        <div class="sh-stat"><span class="sh-sl">বিনিয়োগ</span><span class="sh-sv">${fmt(s.total_invested)}</span></div>
        <div class="sh-stat"><span class="sh-sl">শেয়ার</span><span class="sh-sv">${s.share_pct}%</span></div>
      </div>
      <div class="sh-actions">
        <button class="btn-success" onclick="openInvModal(${s.id},'${s.name.replace(/'/g,'')}')"><i class="fas fa-plus"></i> বিনিয়োগ</button>
        ${IS_ADMIN ? `<button class="btn-danger" onclick="togglePartner(${s.id},${s.is_active})">${s.is_active==1?'<i class="fas fa-ban"></i> নিষ্ক্রিয়':'<i class="fas fa-check"></i> সক্রিয়'}</button>` : ''}
      </div>
      ${s.is_active==0?'<span class="badge b-red" style="margin-top:8px">নিষ্ক্রিয়</span>':''}
    </div>`;
  }).join('');
}

function openInvModal(id, name) {
  document.getElementById('invUserId').value = id;
  document.getElementById('invModalTitle').textContent = name+'-এর বিনিয়োগ';
  document.querySelector('#addInvForm [name="date"]').value = new Date().toISOString().split('T')[0];
  openModal('addInvModal');
}

async function submitPartner(e) {
  e.preventDefault();
  const err = document.getElementById('partnerErr');
  err.classList.add('hidden');
  const data = Object.fromEntries(new FormData(e.target));
  const res = await api('add_shareholder','POST',data);
  if(res&&res.success) { showToast(res.message); closeModal('addPartnerModal'); e.target.reset(); loadShareholders(); }
  else { err.textContent=res?.error||'সমস্যা হয়েছে।'; err.classList.remove('hidden'); }
}

async function submitInvestment(e) {
  e.preventDefault();
  const err = document.getElementById('invErr');
  err.classList.add('hidden');
  const data = Object.fromEntries(new FormData(e.target));
  const res = await api('add_partner_investment','POST',data);
  if(res&&res.success) { showToast(res.message); closeModal('addInvModal'); e.target.reset(); loadShareholders(); }
  else { err.textContent=res?.error||'সমস্যা হয়েছে।'; err.classList.remove('hidden'); }
}

async function togglePartner(id, cur) {
  if(!confirm(cur==1?'নিষ্ক্রিয় করবেন?':'পুনরায় সক্রিয় করবেন?')) return;
  const res = await api('toggle_partner','POST',{id, is_active: cur==1?0:1});
  if(res&&res.success) { showToast(res.message); loadShareholders(); }
  else showToast(res?.error||'সমস্যা।','error');
}
</script>
</body></html>
