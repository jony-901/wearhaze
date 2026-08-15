<?php
require_once __DIR__ . '/includes/auth.php';
requireLogin();
$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ড্যাশবোর্ড — Wearhaze Panel</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="/panel/assets/panel.css">
</head>
<body class="panel-body">

<!-- Sidebar -->
<aside class="sidebar" id="sidebar">
  <div class="sb-head">
    <div class="sb-brand">
      <div class="sb-icon"><i class="fas fa-store"></i></div>
      <div><span class="sb-title">Wearhaze</span><span class="sb-sub">Business Panel</span></div>
    </div>
  </div>
  <nav class="sb-nav">
    <span class="nav-label">মেইন মেনু</span>
    <a href="dashboard.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='dashboard.php'?'active':'' ?>"><i class="fas fa-chart-pie"></i><span>ড্যাশবোর্ড</span></a>
    <a href="shareholders.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='shareholders.php'?'active':'' ?>"><i class="fas fa-users"></i><span>শেয়ারহোল্ডার</span></a>
    <a href="transactions.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='transactions.php'?'active':'' ?>"><i class="fas fa-exchange-alt"></i><span>লেনদেন</span></a>
    <a href="investments.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='investments.php'?'active':'' ?>"><i class="fas fa-hand-holding-usd"></i><span>বিনিয়োগ</span></a>
    <a href="products.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='products.php'?'active':'' ?>"><i class="fas fa-box-open"></i><span>পণ্য / ইনভেন্টরি</span></a>
    <span class="nav-label">বিশ্লেষণ</span>
    <a href="reports.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='reports.php'?'active':'' ?>"><i class="fas fa-chart-bar"></i><span>রিপোর্ট</span></a>
    <a href="activity.php" class="nav-link <?= basename($_SERVER['PHP_SELF'])==='activity.php'?'active':'' ?>"><i class="fas fa-history"></i><span>অ্যাক্টিভিটি</span></a>
  </nav>
  <div class="sb-foot">
    <div class="sb-user">
      <div class="sb-avatar"><?= strtoupper(substr($user['name'],0,1)) ?></div>
      <div><span class="sb-uname"><?= htmlspecialchars($user['name']) ?></span><span class="sb-urole"><?= $user['role']==='admin'?'অ্যাডমিন':'পার্টনার' ?></span></div>
    </div>
    <a href="/panel/logout.php" class="btn-logout" title="লগআউট"><i class="fas fa-sign-out-alt"></i></a>
  </div>
</aside>

<!-- Main Content -->
<div class="main-wrap">
  <header class="topbar">
    <div class="tb-left">
      <button class="mob-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button>
      <span class="tb-title" id="pageTitle">ড্যাশবোর্ড</span>
    </div>
    <div class="tb-right">
      <span class="tb-time" id="clock"></span>
      <span class="tb-badge"><?= htmlspecialchars($user['name']) ?></span>
    </div>
  </header>

  <div class="content">
    <!-- SLOT: এখানে প্রতিটি পেজের কন্টেন্ট আসবে -->
    <?php if(basename($_SERVER['PHP_SELF'])==='dashboard.php'): ?>
    <!-- Dashboard Content -->
    <div class="stat-grid" id="statGrid">
      <?php
      $cards = [
        ['id'=>'statInv','label'=>'মোট বিনিয়োগ','icon'=>'fa-wallet','cls'=>'blue'],
        ['id'=>'statSales','label'=>'মোট বিক্রয়','icon'=>'fa-shopping-cart','cls'=>'green'],
        ['id'=>'statProfit','label'=>'মোট লাভ','icon'=>'fa-chart-line','cls'=>'gold'],
        ['id'=>'statBal','label'=>'বর্তমান ব্যালেন্স','icon'=>'fa-piggy-bank','cls'=>'purple'],
        ['id'=>'statExp','label'=>'মোট খরচ','icon'=>'fa-receipt','cls'=>'red'],
        ['id'=>'statPurchase','label'=>'পণ্য ক্রয়','icon'=>'fa-box','cls'=>'teal'],
      ];
      foreach($cards as $c): ?>
      <div class="stat-card <?= $c['cls'] ?>">
        <div class="stat-icon"><i class="fas <?= $c['icon'] ?>"></i></div>
        <div class="stat-info">
          <span class="stat-label"><?= $c['label'] ?></span>
          <span class="stat-val" id="<?= $c['id'] ?>">লোড...</span>
        </div>
      </div>
      <?php endforeach; ?>
    </div>

    <div class="chart-grid">
      <div class="chart-card big">
        <div class="chart-hd">
          <h3><i class="fas fa-chart-area"></i> মাসিক বিক্রয় ও খরচ</h3>
          <select id="chartYear" onchange="loadMonthlyChart()">
            <?php for($y=date('Y');$y>=2023;$y--): ?>
            <option value="<?=$y?>"><?=$y?></option>
            <?php endfor; ?>
          </select>
        </div>
        <canvas id="monthlyChart"></canvas>
      </div>
      <div class="chart-card small">
        <div class="chart-hd"><h3><i class="fas fa-users"></i> পার্টনার বিনিয়োগ</h3></div>
        <canvas id="partnerChart"></canvas>
      </div>
    </div>

    <div class="section-card">
      <div class="sec-hd">
        <h3><i class="fas fa-clock"></i> সাম্প্রতিক লেনদেন</h3>
        <a href="transactions.php" class="btn-sm">সব দেখুন <i class="fas fa-arrow-right"></i></a>
      </div>
      <div id="recentTxns" class="tbl-wrap"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
    </div>
    <?php endif; ?>
  </div>
</div>

<!-- Toast -->
<div id="toast" class="toast hidden"></div>

<!-- Sidebar overlay (mobile) -->
<div class="sb-overlay hidden" id="sbOverlay"></div>

<script src="/panel/assets/panel.js"></script>
<?php if(basename($_SERVER['PHP_SELF'])==='dashboard.php'): ?>
<script>
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadMonthlyChart();
});

async function loadDashboard() {
  const res = await api('dashboard_summary');
  if(!res || !res.success) return;
  const d = res.data;
  document.getElementById('statInv').textContent = fmt(d.totalInvestment);
  document.getElementById('statSales').textContent = fmt(d.totalSales);
  document.getElementById('statProfit').textContent = fmt(d.profit);
  document.getElementById('statBal').textContent = fmt(d.balance);
  document.getElementById('statExp').textContent = fmt(d.totalExpense);
  document.getElementById('statPurchase').textContent = fmt(d.totalPurchase);

  const rtDiv = document.getElementById('recentTxns');
  if(!d.recentTransactions.length) {
    rtDiv.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>কোনো লেনদেন নেই।</p></div>'; return;
  }
  const catLabels = {investment:'বিনিয়োগ',product_purchase:'পণ্য ক্রয়',sale:'বিক্রয়',salary:'বেতন',marketing:'মার্কেটিং',rent:'ভাড়া',other:'অন্যান্য'};
  rtDiv.innerHTML = `<table><thead><tr><th>তারিখ</th><th>বিবরণ</th><th>ক্যাটাগরি</th><th>ধরন</th><th>পরিমাণ</th></tr></thead><tbody>
    ${d.recentTransactions.map(t=>`<tr>
      <td>${fmtDate(t.txn_date)}</td>
      <td>${t.description}</td>
      <td>${catLabels[t.category]||t.category}</td>
      <td><span class="badge ${t.type==='income'?'b-green':'b-red'}">${t.type==='income'?'আয়':'ব্যয়'}</span></td>
      <td class="${t.type==='income'?'c-green':'c-red'} fw6">${fmt(t.amount)}</td>
    </tr>`).join('')}
  </tbody></table>`;

  loadPartnerChart();
}

let monthChart=null, partChart=null;

async function loadMonthlyChart() {
  const year = document.getElementById('chartYear').value;
  const res = await api('monthly_chart&year='+year);
  if(!res || !res.success) return;
  const months = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];
  const salesArr = Array(12).fill(0);
  const expArr = Array(12).fill(0);
  res.sales.forEach(r => salesArr[r.m-1] = parseFloat(r.t));
  res.expenses.forEach(r => expArr[r.m-1] = parseFloat(r.t));
  if(monthChart) monthChart.destroy();
  monthChart = new Chart(document.getElementById('monthlyChart'),{
    type:'line',
    data:{labels:months,datasets:[
      {label:'বিক্রয়',data:salesArr,borderColor:'#2ecc87',backgroundColor:'rgba(46,204,135,0.08)',tension:0.4,fill:true,pointRadius:4,pointBackgroundColor:'#2ecc87'},
      {label:'খরচ',data:expArr,borderColor:'#ff5c6a',backgroundColor:'rgba(255,92,106,0.08)',tension:0.4,fill:true,pointRadius:4,pointBackgroundColor:'#ff5c6a'}
    ]},
    options:{responsive:true,plugins:{legend:{labels:{color:'#8b8fb5',font:{family:'Inter'}}}},
      scales:{x:{ticks:{color:'#555878'},grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#555878',callback:v=>'৳'+v.toLocaleString()},grid:{color:'rgba(255,255,255,0.04)'}}}}
  });
}

async function loadPartnerChart() {
  const res = await api('get_shareholders');
  if(!res || !res.success) return;
  const partners = res.data.filter(p=>p.total_invested>0);
  if(!partners.length) return;
  const colors=['#f5c842','#4f8ef5','#2ecc87','#9b59b6','#ff5c6a','#1abc9c'];
  if(partChart) partChart.destroy();
  partChart = new Chart(document.getElementById('partnerChart'),{
    type:'doughnut',
    data:{labels:partners.map(p=>p.name),datasets:[{data:partners.map(p=>p.total_invested),backgroundColor:colors.slice(0,partners.length),borderColor:'#161830',borderWidth:3}]},
    options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:'#8b8fb5',padding:12,font:{family:'Inter',size:11}}},tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)} (${parseFloat(ctx.parsed).toFixed(1)}%)`}}},cutout:'65%'}
  });
}
</script>
<?php endif; ?>
</body>
</html>
