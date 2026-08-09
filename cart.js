/* ═══════════════════════════════════════════════════════
   HAZE — cart.js  |  Cart Drawer + Logic
   ═══════════════════════════════════════════════════════ */

const HazeCart = (() => {

  /* ── RENDER CART DRAWER ─────────────────────────────── */
  async function renderDrawer() {
    const items = await HazeDB.getCartItems();
    const total = await HazeDB.getCartTotal();
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
  async function add(productId, size) {
    if (!size) { showSizeAlert(); return; }
    // Fetch product info from DB to store with cart item
    let productInfo = null;
    try {
      const p = await HazeDB.getProduct(productId);
      if (p) productInfo = { name: p.name, price: p.price, image: p.image };
    } catch(e) {}
    // Also try reading from the product card DOM as fallback
    if (!productInfo) {
      const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
      if (card) {
        const nameEl  = card.querySelector('.product-name');
        const imgEl   = card.querySelector('.product-image img');
        const priceEl = card.querySelector('.product-price');
        const priceText = priceEl ? priceEl.textContent.replace(/[^\d]/g, '') : '0';
        productInfo = {
          name:  nameEl  ? nameEl.textContent.trim()  : productId,
          image: imgEl   ? imgEl.src                  : 'images/product-tee.png',
          price: parseInt(priceText) || 0
        };
      }
    }
    HazeDB.addToCart(productId, size, 1, productInfo);
    await renderDrawer();
    openDrawer();
    showAddedToast();
  }

  /* ── REMOVE ─────────────────────────────────────────── */
  async function remove(productId, size) {
    HazeDB.removeFromCart(productId, size);
    await renderDrawer();
  }

  /* ── CHANGE QTY ─────────────────────────────────────── */
  async function changeQty(productId, size, newQty) {
    if (newQty <= 0) { await remove(productId, size); return; }
    HazeDB.updateCartQty(productId, size, newQty);
    await renderDrawer();
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
