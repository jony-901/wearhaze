<?php
// Shared Sidebar - সব পেজে include হবে
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
$navItems = [
  ['page'=>'dashboard','icon'=>'fa-chart-pie','label'=>'ড্যাশবোর্ড'],
  ['page'=>'shareholders','icon'=>'fa-users','label'=>'শেয়ারহোল্ডার'],
  ['page'=>'transactions','icon'=>'fa-exchange-alt','label'=>'লেনদেন'],
  ['page'=>'investments','icon'=>'fa-hand-holding-usd','label'=>'বিনিয়োগ'],
  ['page'=>'products','icon'=>'fa-box-open','label'=>'পণ্য / ইনভেন্টরি'],
];
$analyticItems = [
  ['page'=>'reports','icon'=>'fa-chart-bar','label'=>'রিপোর্ট'],
  ['page'=>'activity','icon'=>'fa-history','label'=>'অ্যাক্টিভিটি লগ'],
];
?>
<aside class="sidebar" id="sidebar">
  <div class="sb-head">
    <div class="sb-brand">
      <div class="sb-icon"><i class="fas fa-store"></i></div>
      <div><span class="sb-title">Wearhaze</span><span class="sb-sub">Business Panel</span></div>
    </div>
  </div>
  <nav class="sb-nav">
    <span class="nav-label">মেইন মেনু</span>
    <?php foreach($navItems as $item): ?>
    <a href="/panel/<?= $item['page'] ?>.php" class="nav-link <?= $currentPage===$item['page']?'active':'' ?>">
      <i class="fas <?= $item['icon'] ?>"></i><span><?= $item['label'] ?></span>
    </a>
    <?php endforeach; ?>
    <span class="nav-label">বিশ্লেষণ</span>
    <?php foreach($analyticItems as $item): ?>
    <a href="/panel/<?= $item['page'] ?>.php" class="nav-link <?= $currentPage===$item['page']?'active':'' ?>">
      <i class="fas <?= $item['icon'] ?>"></i><span><?= $item['label'] ?></span>
    </a>
    <?php endforeach; ?>
  </nav>
  <div class="sb-foot">
    <div class="sb-user">
      <div class="sb-avatar"><?= strtoupper(substr($user['name'],0,1)) ?></div>
      <div>
        <span class="sb-uname"><?= htmlspecialchars($user['name']) ?></span>
        <span class="sb-urole"><?= $user['role']==='admin'?'অ্যাডমিন':'পার্টনার' ?></span>
      </div>
    </div>
    <a href="/panel/logout.php" class="btn-logout" title="লগআউট"><i class="fas fa-sign-out-alt"></i></a>
  </div>
</aside>
