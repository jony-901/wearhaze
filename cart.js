/* ═══════════════════════════════════════════════════════
   HAZE — cart.js  |  Cart Drawer + Logic
   ═══════════════════════════════════════════════════════ */

const HazeCart = (() => {

  /* ── RENDER CART DRAWER ─────────────────────────────── */
  function renderDrawer() {
    const items = HazeDB.getCartItems();
    const total = HazeDB.getCartTotal();
    const count = HazeDB.getCartCount();

    // Update badge
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    const body = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');
    if (!body) return;

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🌫️</div>
          <p>Your cart is empty.</p>
          <span>lost in the haze?</span>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    body.innerHTML = items.map(item => `
      <div class="cart-item" id="cart-item-${item.productId}-${item.size}">
        <div class="cart-item-img">
          <img src="${item.product.image}" alt="${item.product.name}" loading="lazy">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.product.name}</div>
          <div class="cart-item-size">Size: ${item.size}</div>
          <div class="cart-item-price">৳ ${(item.product.price * item.qty).toLocaleString()}</div>
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" onclick="HazeCart.changeQty('${item.productId}','${item.size}',${item.qty - 1})">−</button>
          <span class="cart-qty">${item.qty}</span>
          <button class="cart-qty-btn" onclick="HazeCart.changeQty('${item.productId}','${item.size}',${item.qty + 1})">+</button>
          <button class="cart-remove" onclick="HazeCart.remove('${item.productId}','${item.size}')">✕</button>
        </div>
      </div>
    `).join('');

    document.getElementById('cart-total-amt').textContent = '৳ ' + total.toLocaleString();
    document.getElementById('cart-shipping-amt').textContent = '৳ 80';
    document.getElementById('cart-grand-total').textContent = '৳ ' + (total + 80).toLocaleString();
  }

  /* ── ADD TO CART ────────────────────────────────────── */
  function add(productId, size) {
    if (!size) { showSizeAlert(); return; }
    HazeDB.addToCart(productId, size, 1);
    renderDrawer();
    openDrawer();
    showAddedToast();
  }

  /* ── REMOVE ─────────────────────────────────────────── */
  function remove(productId, size) {
    HazeDB.removeFromCart(productId, size);
    renderDrawer();
  }

  /* ── CHANGE QTY ─────────────────────────────────────── */
  function changeQty(productId, size, newQty) {
    if (newQty <= 0) { remove(productId, size); return; }
    HazeDB.updateCartQty(productId, size, newQty);
    renderDrawer();
  }

  /* ── OPEN / CLOSE DRAWER ────────────────────────────── */
  function openDrawer() {
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('cart-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ── TOAST ──────────────────────────────────────────── */
  function showAddedToast() {
    const toast = document.getElementById('haze-toast');
    if (!toast) return;
    toast.textContent = '✓ Added to cart';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
  function showSizeAlert() {
    const toast = document.getElementById('haze-toast');
    if (!toast) return;
    toast.textContent = '⚠ Please select a size';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  /* ── INIT ───────────────────────────────────────────── */
  function init() {
    renderDrawer();
    // Cart icon toggle
    document.querySelectorAll('.cart-toggle').forEach(btn => {
      btn.addEventListener('click', openDrawer);
    });
    // Overlay close
    const overlay = document.getElementById('cart-overlay');
    if (overlay) overlay.addEventListener('click', closeDrawer);
    // Close btn
    const closeBtn = document.getElementById('cart-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    // Checkout btn
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (HazeDB.getCartCount() === 0) return;
        window.location.href = 'checkout.html';
      });
    }
  }

  return { add, remove, changeQty, openDrawer, closeDrawer, renderDrawer, init };
})();

document.addEventListener('DOMContentLoaded', HazeCart.init);
