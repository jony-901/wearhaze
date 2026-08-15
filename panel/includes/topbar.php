<?php
// Shared Topbar - সব পেজে include হবে
$pageTitles = [
  'dashboard' => 'ড্যাশবোর্ড',
  'shareholders' => 'শেয়ারহোল্ডার',
  'transactions' => 'লেনদেন',
  'investments' => 'বিনিয়োগ',
  'products' => 'পণ্য ও ইনভেন্টরি',
  'reports' => 'রিপোর্ট',
  'activity' => 'অ্যাক্টিভিটি লগ',
];
$pageTitle = $pageTitles[basename($_SERVER['PHP_SELF'],'.php')] ?? 'প্যানেল';
?>
<header class="topbar">
  <div class="tb-left">
    <button class="mob-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button>
    <span class="tb-title"><?= $pageTitle ?></span>
  </div>
  <div class="tb-right">
    <span class="tb-time" id="clock"></span>
    <span class="tb-badge"><?= htmlspecialchars($user['name']) ?></span>
  </div>
</header>
