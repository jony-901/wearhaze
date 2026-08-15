<?php
require_once __DIR__ . '/includes/auth.php';
startPanelSession();
// ইতিমধ্যে লগইন থাকলে dashboard-এ পাঠাও
if (isLoggedIn()) {
    header('Location: /panel/dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wearhaze Business Panel — লগইন</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Wearhaze প্রাইভেট বিজনেস প্যানেল">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/panel/assets/panel.css">
</head>
<body class="login-body">

<div class="login-bg">
  <div class="orb o1"></div>
  <div class="orb o2"></div>
  <div class="orb o3"></div>
  <div class="grid-lines"></div>
</div>

<div class="login-wrap">
  <div class="login-card">

    <div class="login-logo">
      <div class="logo-icon"><i class="fas fa-store"></i></div>
      <h1>Wearhaze</h1>
      <p>বিজনেস ম্যানেজমেন্ট প্যানেল</p>
      <div class="priv-badge"><i class="fas fa-lock"></i> শুধুমাত্র অনুমোদিত প্রবেশ</div>
    </div>

    <form id="loginForm" autocomplete="off">
      <div class="field-group">
        <label for="email"><i class="fas fa-envelope"></i> ইমেইল ঠিকানা</label>
        <input type="email" id="email" name="email" placeholder="আপনার ইমেইল" required autofocus>
      </div>
      <div class="field-group">
        <label for="password"><i class="fas fa-lock"></i> পাসওয়ার্ড</label>
        <div class="pass-wrap">
          <input type="password" id="password" name="password" placeholder="পাসওয়ার্ড" required>
          <button type="button" id="togglePass" tabindex="-1"><i class="fas fa-eye"></i></button>
        </div>
      </div>
      <div id="loginMsg" class="msg-box hidden"></div>
      <button type="submit" class="btn-login" id="loginBtn">
        <span id="loginBtnText">লগইন করুন</span>
        <i class="fas fa-arrow-right" id="loginArrow"></i>
        <i class="fas fa-spinner fa-spin hidden" id="loginSpinner"></i>
      </button>
    </form>

    <div class="login-footer">
      <span>wearhaze.com &copy; <?= date('Y') ?></span>
    </div>
  </div>
</div>

<script>
const API = '/panel/api/panel_api.php';

document.getElementById('togglePass').addEventListener('click', function() {
  const p = document.getElementById('password');
  const i = this.querySelector('i');
  p.type = p.type === 'password' ? 'text' : 'password';
  i.className = p.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const msg = document.getElementById('loginMsg');
  const text = document.getElementById('loginBtnText');
  const arrow = document.getElementById('loginArrow');
  const spin = document.getElementById('loginSpinner');

  btn.disabled = true;
  text.textContent = 'লগইন হচ্ছে...';
  arrow.classList.add('hidden');
  spin.classList.remove('hidden');
  msg.classList.add('hidden');

  const res = await fetch(API + '?action=login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    })
  }).then(r => r.json()).catch(() => ({error: 'নেটওয়ার্ক সমস্যা।'}));

  btn.disabled = false;
  text.textContent = 'লগইন করুন';
  arrow.classList.remove('hidden');
  spin.classList.add('hidden');

  if (res.success) {
    text.textContent = '✓ সফল! যাচ্ছি...';
    btn.style.background = 'linear-gradient(135deg,#2ecc87,#27ae60)';
    setTimeout(() => window.location.href = '/panel/dashboard.php', 600);
  } else {
    msg.textContent = res.error || 'লগইন ব্যর্থ।';
    msg.className = 'msg-box error';
  }
});
</script>
</body>
</html>
