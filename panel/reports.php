<?php require_once __DIR__.'/includes/auth.php'; requireLogin(); $user=getCurrentUser(); ?>
<!DOCTYPE html><html lang="bn"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>রিপোর্ট — Wearhaze Panel</title><meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="/panel/assets/panel.css">
</head><body class="panel-body">
<?php include __DIR__.'/includes/sidebar.php'; ?>
<div class="main-wrap">
<?php include __DIR__.'/includes/topbar.php'; ?>
<div class="content">
  <div class="page-hd">
    <h2><i class="fas fa-chart-bar"></i> আর্থিক রিপোর্ট</h2>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <input type="date" id="rStart" class="f-input">
      <span style="color:var(--text-muted)">থেকে</span>
      <input type="date" id="rEnd" class="f-input">
      <button class="btn-primary" onclick="loadReports()"><i class="fas fa-search"></i> দেখুন</button>
      <button class="btn-sm" onclick="clearReport()"><i class="fas fa-times"></i></button>
    </div>
  </div>
  <div id="reportContent"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
</div></div>

<div id="toast" class="toast hidden"></div>
<div class="sb-overlay hidden" id="sbOverlay"></div>
<script src="/panel/assets/panel.js"></script>
<script>
const CAT={investment:'বিনিয়োগ',product_purchase:'পণ্য ক্রয়',sale:'বিক্রয়',salary:'বেতন',marketing:'মার্কেটিং',rent:'ভাড়া',profit:'লাভ',other:'অন্যান্য'};

document.addEventListener('DOMContentLoaded', loadReports);

function clearReport(){ document.getElementById('rStart').value=''; document.getElementById('rEnd').value=''; loadReports(); }

async function loadReports(){
  const start=document.getElementById('rStart').value;
  const end=document.getElementById('rEnd').value;
  let q='get_reports';
  if(start&&end) q+=`&start=${start}&end=${end}`;
  const res=await api(q);
  if(!res||!res.success) return;
  const d=res.data;
  const profitColor=d.netProfit>=0?'c-green':'c-red';
  document.getElementById('reportContent').innerHTML=`
    <div class="stat-grid">
      <div class="stat-card blue"><div class="stat-icon"><i class="fas fa-wallet"></i></div><div class="stat-info"><span class="stat-label">পার্টনার বিনিয়োগ</span><span class="stat-val">${fmt(d.totalInvestments)}</span></div></div>
      <div class="stat-card green"><div class="stat-icon"><i class="fas fa-arrow-up"></i></div><div class="stat-info"><span class="stat-label">মোট আয়</span><span class="stat-val">${fmt(d.totalIncome)}</span></div></div>
      <div class="stat-card red"><div class="stat-icon"><i class="fas fa-arrow-down"></i></div><div class="stat-info"><span class="stat-label">মোট খরচ</span><span class="stat-val">${fmt(d.totalExpense)}</span></div></div>
      <div class="stat-card green"><div class="stat-icon"><i class="fas fa-shopping-cart"></i></div><div class="stat-info"><span class="stat-label">মোট বিক্রয়</span><span class="stat-val">${fmt(d.totalSales)}</span></div></div>
      <div class="stat-card teal"><div class="stat-icon"><i class="fas fa-box"></i></div><div class="stat-info"><span class="stat-label">পণ্য ক্রয়</span><span class="stat-val">${fmt(d.totalPurchases)}</span></div></div>
      <div class="stat-card ${d.netProfit>=0?'gold':'red'}"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-info"><span class="stat-label">নিট লাভ/ক্ষতি</span><span class="stat-val">${fmt(d.netProfit)}</span></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:4px">
      <div class="section-card">
        <div class="sec-hd"><h3><i class="fas fa-list"></i> ক্যাটাগরিভিত্তিক বিশ্লেষণ</h3></div>
        <table><thead><tr><th>ক্যাটাগরি</th><th>ধরন</th><th>মোট</th><th>সংখ্যা</th></tr></thead>
        <tbody>${d.categoryBreakdown.map(c=>`<tr>
          <td>${CAT[c.category]||c.category}</td>
          <td><span class="badge ${c.type==='income'?'b-green':'b-red'}">${c.type==='income'?'আয়':'ব্যয়'}</span></td>
          <td class="${c.type==='income'?'c-green':'c-red'} fw6">${fmt(c.total)}</td>
          <td>${c.cnt}টি</td>
        </tr>`).join('')}</tbody></table>
      </div>
      <div class="section-card">
        <div class="sec-hd"><h3><i class="fas fa-users"></i> পার্টনারভিত্তিক বিনিয়োগ</h3></div>
        <table><thead><tr><th>নাম</th><th>বিনিয়োগ</th></tr></thead>
        <tbody>${d.partnerInvestments.map(p=>`<tr><td class="fw6">${p.name}</td><td class="c-gold fw6">${fmt(p.invested)}</td></tr>`).join('')}</tbody></table>
      </div>
    </div>`;
}
</script></body></html>
