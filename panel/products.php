<?php require_once __DIR__.'/includes/auth.php'; requireLogin(); $user=getCurrentUser(); ?>
<!DOCTYPE html><html lang="bn"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>পণ্য — Wearhaze Panel</title><meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="/panel/assets/panel.css">
</head><body class="panel-body">
<?php include __DIR__.'/includes/sidebar.php'; ?>
<div class="main-wrap">
<?php include __DIR__.'/includes/topbar.php'; ?>
<div class="content">
  <div class="page-hd">
    <h2><i class="fas fa-box-open"></i> পণ্য ও ইনভেন্টরি</h2>
    <button class="btn-primary" onclick="openModal('addProdModal')"><i class="fas fa-plus"></i> নতুন পণ্য</button>
  </div>
  <div class="section-card">
    <div id="prodList" class="tbl-wrap"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
  </div>
</div></div>

<!-- Add Product Modal -->
<div class="modal hidden" id="addProdModal">
  <div class="modal-overlay" onclick="closeModal('addProdModal')"></div>
  <div class="modal-box">
    <div class="modal-hd"><h3><i class="fas fa-box-open"></i> নতুন পণ্য যোগ</h3><button onclick="closeModal('addProdModal')"><i class="fas fa-times"></i></button></div>
    <form id="addProdForm" onsubmit="submitProd(event)">
      <div class="form-row">
        <div class="form-group"><label>পণ্যের নাম *</label><input type="text" name="name" required placeholder="পণ্যের নাম"></div>
        <div class="form-group"><label>ক্যাটাগরি</label><input type="text" name="category" placeholder="যেমন: পোশাক, আনুষঙ্গিক"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ক্রয় মূল্য/পিস (৳) *</label><input type="number" name="purchase_price" required step="0.01" min="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>বিক্রয় মূল্য/পিস (৳)</label><input type="number" name="selling_price" step="0.01" placeholder="0.00"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>পরিমাণ (পিস) *</label><input type="number" name="quantity" required min="1" placeholder="0"></div>
        <div class="form-group"><label>তারিখ *</label><input type="date" name="date" required></div>
      </div>
      <div class="form-group"><label>নোট</label><input type="text" name="note" placeholder="অতিরিক্ত তথ্য"></div>
      <div id="prodErr" class="form-error hidden"></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:13px">পণ্য যোগ করুন</button>
    </form>
  </div>
</div>

<!-- Sell Product Modal -->
<div class="modal hidden" id="sellModal">
  <div class="modal-overlay" onclick="closeModal('sellModal')"></div>
  <div class="modal-box">
    <div class="modal-hd"><h3><i class="fas fa-shopping-cart"></i> বিক্রয় রেকর্ড</h3><button onclick="closeModal('sellModal')"><i class="fas fa-times"></i></button></div>
    <form id="sellForm" onsubmit="submitSell(event)">
      <input type="hidden" name="product_id" id="sellProdId">
      <p id="sellProdName" style="color:var(--accent-gold);font-weight:600;margin-bottom:16px;font-size:14px"></p>
      <div class="form-row">
        <div class="form-group"><label>বিক্রয় পরিমাণ (পিস) *</label><input type="number" name="sold_quantity" id="sellQty" required min="1" placeholder="0"></div>
        <div class="form-group"><label>বিক্রয় মূল্য/পিস (৳) *</label><input type="number" name="selling_price" id="sellPrice" required step="0.01" placeholder="0.00"></div>
      </div>
      <div class="form-group"><label>তারিখ</label><input type="date" name="date" id="sellDate"></div>
      <div id="sellErr" class="form-error hidden"></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:13px">বিক্রয় রেকর্ড করুন</button>
    </form>
  </div>
</div>

<div id="toast" class="toast hidden"></div>
<div class="sb-overlay hidden" id="sbOverlay"></div>
<script src="/panel/assets/panel.js"></script>
<script>
document.addEventListener('DOMContentLoaded',()=>{ setToday('addProdForm','date'); loadProducts(); });

async function loadProducts(){
  const res=await api('get_products');
  if(!res||!res.success) return;
  const {data} = res;
  const div=document.getElementById('prodList');
  if(!data.length){ div.innerHTML='<div class="empty"><i class="fas fa-box-open"></i><p>কোনো পণ্য নেই।</p></div>'; return; }
  div.innerHTML=`<table><thead><tr><th>পণ্য</th><th>ক্যাটাগরি</th><th>ক্রয় মূল্য</th><th>বিক্রয় মূল্য</th><th>মোট স্টক</th><th>বিক্রয়</th><th>অবশিষ্ট</th><th>রাজস্ব</th><th>লাভ</th><th>একশন</th></tr></thead>
  <tbody>${data.map(p=>`<tr>
    <td class="fw6">${p.name}</td>
    <td>${p.category||'—'}</td>
    <td>${fmt(p.purchase_price)}</td>
    <td>${p.selling_price>0?fmt(p.selling_price):'—'}</td>
    <td>${p.quantity} পিস</td>
    <td class="c-green">${p.sold_quantity} পিস</td>
    <td class="${p.remaining==0?'c-red':'c-gold'} fw6">${p.remaining} পিস</td>
    <td class="c-green fw6">${fmt(p.revenue)}</td>
    <td class="${parseFloat(p.profit)>=0?'c-green':'c-red'} fw6">${fmt(p.profit)}</td>
    <td style="white-space:nowrap">
      <button class="btn-success" style="margin-right:4px" onclick="openSell(${p.id},'${p.name.replace(/'/g,'')}',${p.remaining},${p.selling_price||0})" ${p.remaining==0?'disabled':''} title="বিক্রয় রেকর্ড"><i class="fas fa-shopping-cart"></i></button>
      <button class="btn-icon" onclick="delProd(${p.id})" title="মুছুন"><i class="fas fa-trash"></i></button>
    </td>
  </tr>`).join('')}</tbody></table>`;
}

function openSell(id,name,rem,price){
  if(rem===0){ showToast('স্টক শেষ!','error'); return; }
  document.getElementById('sellProdId').value=id;
  document.getElementById('sellProdName').textContent=`পণ্য: ${name} (অবশিষ্ট: ${rem} পিস)`;
  document.getElementById('sellPrice').value=price||'';
  document.getElementById('sellDate').value=new Date().toISOString().split('T')[0];
  openModal('sellModal');
}

async function submitProd(e){
  e.preventDefault();
  const err=document.getElementById('prodErr'); err.classList.add('hidden');
  const data=Object.fromEntries(new FormData(e.target));
  const res=await api('add_product','POST',data);
  if(res&&res.success){ showToast(res.message); closeModal('addProdModal'); e.target.reset(); setToday('addProdForm','date'); loadProducts(); }
  else { err.textContent=res?.error||'সমস্যা হয়েছে।'; err.classList.remove('hidden'); }
}

async function submitSell(e){
  e.preventDefault();
  const err=document.getElementById('sellErr'); err.classList.add('hidden');
  const data=Object.fromEntries(new FormData(e.target));
  const res=await api('sell_product','POST',data);
  if(res&&res.success){ showToast(`বিক্রয় সফল! লাভ: ${fmt(res.profit)}`); closeModal('sellModal'); e.target.reset(); loadProducts(); }
  else { err.textContent=res?.error||'সমস্যা হয়েছে।'; err.classList.remove('hidden'); }
}

async function delProd(id){
  if(!confirm('এই পণ্য মুছবেন?')) return;
  const res=await api('delete_product','POST',{id});
  if(res&&res.success){ showToast(res.message); loadProducts(); }
  else showToast(res?.error||'সমস্যা।','error');
}
</script></body></html>
