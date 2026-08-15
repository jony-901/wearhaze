<?php require_once __DIR__.'/includes/auth.php'; requireLogin(); $user=getCurrentUser(); ?>
<!DOCTYPE html><html lang="bn"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>অ্যাক্টিভিটি — Wearhaze Panel</title><meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="/panel/assets/panel.css">
</head><body class="panel-body">
<?php include __DIR__.'/includes/sidebar.php'; ?>
<div class="main-wrap">
<?php include __DIR__.'/includes/topbar.php'; ?>
<div class="content">
  <div class="page-hd"><h2><i class="fas fa-history"></i> অ্যাক্টিভিটি লগ</h2></div>
  <div class="section-card">
    <div id="actList"><div class="loader"><i class="fas fa-spinner fa-spin"></i></div></div>
  </div>
</div></div>

<div id="toast" class="toast hidden"></div>
<div class="sb-overlay hidden" id="sbOverlay"></div>
<script src="/panel/assets/panel.js"></script>
<script>
document.addEventListener('DOMContentLoaded', async ()=>{
  const res=await api('get_activity');
  const div=document.getElementById('actList');
  if(!res||!res.success||!res.data.length){ div.innerHTML='<div class="empty"><i class="fas fa-history"></i><p>কোনো কার্যক্রম নেই।</p></div>'; return; }
  div.innerHTML=res.data.map(l=>`
    <div style="display:flex;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.03)">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--accent-gold);margin-top:6px;flex-shrink:0"></div>
      <div>
        <div style="font-size:13px;font-weight:500"><strong>${l.name||'সিস্টেম'}</strong> — ${l.action}</div>
        ${l.details?`<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${l.details}</div>`:''}
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${fmtDate(l.created_at)} · ${new Date(l.created_at).toLocaleTimeString('bn-BD')}</div>
      </div>
    </div>`).join('');
});
</script></body></html>
