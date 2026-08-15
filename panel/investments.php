<?php require_once __DIR__.'/includes/auth.php'; requireLogin(); $user=getCurrentUser(); ?>
<!DOCTYPE html><html lang="bn"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>বিনিয়োগ — Wearhaze Panel</title><meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="/panel/assets/panel.css">
</head><body class="panel-body">
<?php include __DIR__.'/includes/sidebar.php'; ?>
<div class="main-wrap">
<?php include __DIR__.'/includes/topbar.php'; ?>
<div class="content">
  <div class="page-hd">
    <h2><i class="fas fa-hand-holding-usd"></i> বিনিয়োগ ট্র্যাকিং</h2>
    <button class="btn-primary" onclick="openModal('addInvModal')"><i class="fas fa-plus"></i> নতুন বিনিয়োগ</button>
  </div>
  <div class="section-card">
    <div id="invList" class="tbl-wrap"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
  </div>
</div></div>

<!-- Add Investment Modal -->
<div class="modal hidden" id="addInvModal">
  <div class="modal-overlay" onclick="closeModal('addInvModal')"></div>
  <div class="modal-box">
    <div class="modal-hd"><h3><i class="fas fa-hand-holding-usd"></i> নতুন বিনিয়োগ</h3><button onclick="closeModal('addInvModal')"><i class="fas fa-times"></i></button></div>
    <form id="addInvForm" onsubmit="submitInv(event)">
      <div class="form-group"><label>শিরোনাম *</label><input type="text" name="title" required placeholder="যেমন: পণ্য স্টক, অফিস সরঞ্জাম"></div>
      <div class="form-row">
        <div class="form-group"><label>পরিমাণ (৳) *</label><input type="number" name="amount" required step="0.01" min="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>তারিখ *</label><input type="date" name="date" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ক্যাটাগরি</label>
          <select name="category"><option value="inventory">ইনভেন্টরি</option><option value="marketing">মার্কেটিং</option><option value="infrastructure">ইনফ্রাস্ট্রাকচার</option><option value="other">অন্যান্য</option></select>
        </div>
        <div class="form-group"><label>স্ট্যাটাস</label>
          <select name="status"><option value="active">সক্রিয়</option><option value="returned">ফেরত পাওয়া</option><option value="partial">আংশিক ফেরত</option></select>
        </div>
      </div>
      <div class="form-group"><label>নোট</label><textarea name="note" placeholder="বিস্তারিত বিবরণ (ঐচ্ছিক)" rows="3"></textarea></div>
      <div id="invErr" class="form-error hidden"></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:13px">বিনিয়োগ রেকর্ড করুন</button>
    </form>
  </div>
</div>

<div id="toast" class="toast hidden"></div>
<div class="sb-overlay hidden" id="sbOverlay"></div>
<script src="/panel/assets/panel.js"></script>
<script>
const STATUS = {active:'সক্রিয়',returned:'ফেরত পাওয়া',partial:'আংশিক ফেরত'};
const STATUS_CLS = {active:'b-green',returned:'b-blue',partial:'b-gold'};

document.addEventListener('DOMContentLoaded',()=>{ setToday('addInvForm','date'); loadInvestments(); });

async function loadInvestments(){
  const res = await api('get_investments');
  if(!res||!res.success) return;
  const {data, total} = res;
  const div = document.getElementById('invList');
  if(!data.length){ div.innerHTML='<div class="empty"><i class="fas fa-hand-holding-usd"></i><p>কোনো বিনিয়োগ নেই।</p></div>'; return; }
  div.innerHTML=`<div style="padding:14px 20px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-muted)">মোট বিনিয়োগ: <strong class="c-gold">${fmt(total)}</strong></div>
  <table><thead><tr><th>শিরোনাম</th><th>ক্যাটাগরি</th><th>পরিমাণ</th><th>তারিখ</th><th>স্ট্যাটাস</th><th>নোট</th><th>যোগকারী</th><th></th></tr></thead>
  <tbody>${data.map(i=>`<tr>
    <td class="fw6">${i.title}</td>
    <td>${i.category}</td>
    <td class="c-gold fw6">${fmt(i.amount)}</td>
    <td>${fmtDate(i.inv_date)}</td>
    <td><span class="badge ${STATUS_CLS[i.status]||'b-blue'}">${STATUS[i.status]||i.status}</span></td>
    <td style="max-width:150px;white-space:normal;font-size:12px;color:var(--text-muted)">${i.note||'—'}</td>
    <td>${i.by_name||'—'}</td>
    <td><button class="btn-icon" onclick="delInv(${i.id})" title="মুছুন"><i class="fas fa-trash"></i></button></td>
  </tr>`).join('')}</tbody></table>`;
}

async function submitInv(e){
  e.preventDefault();
  const err=document.getElementById('invErr'); err.classList.add('hidden');
  const data=Object.fromEntries(new FormData(e.target));
  const res=await api('add_investment','POST',data);
  if(res&&res.success){ showToast(res.message); closeModal('addInvModal'); e.target.reset(); setToday('addInvForm','date'); loadInvestments(); }
  else { err.textContent=res?.error||'সমস্যা হয়েছে।'; err.classList.remove('hidden'); }
}

async function delInv(id){
  if(!confirm('এই বিনিয়োগ মুছবেন?')) return;
  const res=await api('delete_investment','POST',{id});
  if(res&&res.success){ showToast(res.message); loadInvestments(); }
  else showToast(res?.error||'সমস্যা।','error');
}
</script></body></html>
