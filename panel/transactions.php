<?php require_once __DIR__.'/includes/auth.php'; requireLogin(); $user=getCurrentUser(); ?>
<!DOCTYPE html><html lang="bn"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>লেনদেন — Wearhaze Panel</title><meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="/panel/assets/panel.css">
</head><body class="panel-body">
<?php include __DIR__.'/includes/sidebar.php'; ?>
<div class="main-wrap">
<?php include __DIR__.'/includes/topbar.php'; ?>
<div class="content">
  <div class="page-hd">
    <h2><i class="fas fa-exchange-alt"></i> লেনদেন ইতিহাস</h2>
    <button class="btn-primary" onclick="openModal('addTxnModal')"><i class="fas fa-plus"></i> নতুন লেনদেন</button>
  </div>

  <div class="filter-bar">
    <select id="fType" class="f-select" onchange="loadTxns()"><option value="">সব ধরন</option><option value="income">আয়</option><option value="expense">ব্যয়</option></select>
    <select id="fCat" class="f-select" onchange="loadTxns()">
      <option value="">সব ক্যাটাগরি</option>
      <option value="investment">বিনিয়োগ</option><option value="product_purchase">পণ্য ক্রয়</option>
      <option value="sale">বিক্রয়</option><option value="salary">বেতন</option>
      <option value="marketing">মার্কেটিং</option><option value="rent">ভাড়া</option><option value="other">অন্যান্য</option>
    </select>
    <input type="date" id="fStart" class="f-input" onchange="loadTxns()">
    <input type="date" id="fEnd" class="f-input" onchange="loadTxns()">
    <input type="text" id="fSearch" class="f-input f-search" placeholder="🔍 সার্চ..." oninput="debounce()">
    <button class="btn-sm" onclick="clearF()"><i class="fas fa-times"></i> পরিষ্কার</button>
  </div>

  <div class="section-card">
    <div id="txnList" class="tbl-wrap"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
    <div id="pagination" class="pagination"></div>
  </div>
</div></div>

<!-- Add Transaction Modal -->
<div class="modal hidden" id="addTxnModal">
  <div class="modal-overlay" onclick="closeModal('addTxnModal')"></div>
  <div class="modal-box">
    <div class="modal-hd"><h3><i class="fas fa-plus-circle"></i> নতুন লেনদেন</h3><button onclick="closeModal('addTxnModal')"><i class="fas fa-times"></i></button></div>
    <form id="addTxnForm" onsubmit="submitTxn(event)">
      <div class="form-row">
        <div class="form-group"><label>ধরন *</label><select name="type" required><option value="income">আয়</option><option value="expense">ব্যয়</option></select></div>
        <div class="form-group"><label>ক্যাটাগরি *</label>
          <select name="category" required>
            <option value="investment">বিনিয়োগ</option><option value="product_purchase">পণ্য ক্রয়</option>
            <option value="sale">বিক্রয়</option><option value="salary">বেতন</option>
            <option value="marketing">মার্কেটিং</option><option value="rent">ভাড়া</option><option value="other">অন্যান্য</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>পরিমাণ (৳) *</label><input type="number" name="amount" required step="0.01" min="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>তারিখ *</label><input type="date" name="date" required></div>
      </div>
      <div class="form-group"><label>বিবরণ *</label><input type="text" name="description" required placeholder="লেনদেনের বিবরণ লিখুন"></div>
      <div class="form-group"><label>রেফারেন্স নম্বর</label><input type="text" name="reference_no" placeholder="ঐচ্ছিক"></div>
      <div id="txnErr" class="form-error hidden"></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:13px">লেনদেন যোগ করুন</button>
    </form>
  </div>
</div>

<div id="toast" class="toast hidden"></div>
<div class="sb-overlay hidden" id="sbOverlay"></div>
<script src="/panel/assets/panel.js"></script>
<script>
const CAT = {investment:'বিনিয়োগ',product_purchase:'পণ্য ক্রয়',sale:'বিক্রয়',salary:'বেতন',marketing:'মার্কেটিং',rent:'ভাড়া',profit:'লাভ',other:'অন্যান্য'};
let curPage=1, st=null;

document.addEventListener('DOMContentLoaded', ()=>{ setToday('addTxnForm','date'); loadTxns(); });

function debounce(){ clearTimeout(st); st=setTimeout(()=>{curPage=1;loadTxns();},500); }
function clearF(){ ['fType','fCat','fStart','fEnd','fSearch'].forEach(id=>{ const el=document.getElementById(id); if(el.tagName==='SELECT') el.value=''; else el.value=''; }); curPage=1; loadTxns(); }

async function loadTxns() {
  const type=document.getElementById('fType').value;
  const cat=document.getElementById('fCat').value;
  const start=document.getElementById('fStart').value;
  const end=document.getElementById('fEnd').value;
  const search=document.getElementById('fSearch').value;
  let q=`get_transactions&page=${curPage}`;
  if(type) q+=`&type=${type}`;
  if(cat) q+=`&category=${cat}`;
  if(start) q+=`&start=${start}`;
  if(end) q+=`&end=${end}`;
  if(search) q+=`&search=${encodeURIComponent(search)}`;
  const res = await api(q);
  if(!res||!res.success) return;
  const {data, total, pages} = res;
  const div = document.getElementById('txnList');
  if(!data.length){ div.innerHTML='<div class="empty"><i class="fas fa-receipt"></i><p>কোনো লেনদেন পাওয়া যায়নি।</p></div>'; document.getElementById('pagination').innerHTML=''; return; }
  div.innerHTML=`<table><thead><tr><th>তারিখ</th><th>বিবরণ</th><th>ক্যাটাগরি</th><th>ধরন</th><th>রেফ.</th><th>পরিমাণ</th><th>যোগকারী</th><th></th></tr></thead>
  <tbody>${data.map(t=>`<tr>
    <td>${fmtDate(t.txn_date)}</td>
    <td style="max-width:180px;white-space:normal;font-size:13px">${t.description}</td>
    <td>${CAT[t.category]||t.category}</td>
    <td><span class="badge ${t.type==='income'?'b-green':'b-red'}">${t.type==='income'?'আয়':'ব্যয়'}</span></td>
    <td>${t.reference_no||'—'}</td>
    <td class="${t.type==='income'?'c-green':'c-red'} fw6">${fmt(t.amount)}</td>
    <td>${t.by_name||'—'}</td>
    <td><button class="btn-icon" onclick="delTxn(${t.id})" title="মুছুন"><i class="fas fa-trash"></i></button></td>
  </tr>`).join('')}</tbody></table>`;
  // Pagination
  const pg=document.getElementById('pagination');
  if(pages<=1){pg.innerHTML='';return;}
  pg.innerHTML=Array.from({length:pages},(_,i)=>`<button class="pg-btn ${i+1===curPage?'active':''}" onclick="goPage(${i+1})">${i+1}</button>`).join('');
}

function goPage(p){ curPage=p; loadTxns(); }

async function submitTxn(e){
  e.preventDefault();
  const err=document.getElementById('txnErr'); err.classList.add('hidden');
  const data=Object.fromEntries(new FormData(e.target));
  const res=await api('add_transaction','POST',data);
  if(res&&res.success){ showToast(res.message); closeModal('addTxnModal'); e.target.reset(); setToday('addTxnForm','date'); loadTxns(); }
  else { err.textContent=res?.error||'সমস্যা হয়েছে।'; err.classList.remove('hidden'); }
}

async function delTxn(id){
  if(!confirm('এই লেনদেন মুছবেন?')) return;
  const res=await api('delete_transaction','POST',{id});
  if(res&&res.success){ showToast(res.message); loadTxns(); }
  else showToast(res?.error||'সমস্যা।','error');
}
</script></body></html>
