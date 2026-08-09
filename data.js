/* ═══════════════════════════════════════════════════════
   HAZE — data.js
   Product Database, Cart & Order Storage (Async via API)
   ═══════════════════════════════════════════════════════ */

const HazeDB = (() => {

  const API_URL = 'api.php';
  const ADMIN_EMAIL = 'wearhaze.com@gmail.com';

  // Helper to make API requests
  async function apiCall(action, payload = {}) {
    payload.action = action;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  }

  // ── CART (Still kept in localStorage) ──────────────────
  function getCart() {
    try { return JSON.parse(localStorage.getItem('haze_cart') || '[]'); } catch { return []; }
  }
  function setCart(cart) {
    localStorage.setItem('haze_cart', JSON.stringify(cart));
  }
  function addToCart(productId, size, qty = 1) {
    const cart = getCart();
    const existing = cart.find(i => i.productId === productId && i.size === size);
    if (existing) existing.qty += qty;
    else cart.push({ productId, size, qty, addedAt: Date.now() });
    setCart(cart);
    return cart;
  }
  function removeFromCart(productId, size) {
    const cart = getCart().filter(i => !(i.productId === productId && i.size === size));
    setCart(cart);
    return cart;
  }
  function updateCartQty(productId, size, qty) {
    const cart = getCart();
    const item = cart.find(i => i.productId === productId && i.size === size);
    if (item) {
      if (qty <= 0) return removeFromCart(productId, size);
      item.qty = qty;
    }
    setCart(cart);
    return cart;
  }
  function clearCart() { setCart([]); }
  function getCartCount() { return getCart().reduce((sum, i) => sum + i.qty, 0); }
  
  async function getCartTotal() {
    const products = await getProducts();
    return getCart().reduce((sum, item) => {
      const p = products.find(prod => prod.id === item.productId);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
  }
  async function getCartItems() {
    const products = await getProducts();
    return getCart().map(item => {
      const p = products.find(prod => prod.id === item.productId);
      return p ? { ...item, product: p } : null;
    }).filter(Boolean);
  }

  // ── PRODUCTS ─────────────────────────────────────────
  async function getProducts() {
    const data = await apiCall('get_products');
    return data || [];
  }
  async function getProduct(id) {
    const products = await getProducts();
    return products.find(p => p.id === id) || null;
  }
  async function addProduct(product) {
    product.id = product.id || 'haze-' + Date.now();
    product.createdAt = Date.now();
    return await apiCall('add_product', product);
  }
  async function updateProduct(id, updates) {
    updates.id = id;
    return await apiCall('update_product', updates);
  }
  async function deleteProduct(id) {
    return await apiCall('delete_product', { id });
  }
  async function getFeaturedProducts() {
    const products = await getProducts();
    return products.filter(p => p.featured);
  }

  // ── ORDERS ───────────────────────────────────────────
  function generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'HZ-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }
  async function getOrders() {
    return await apiCall('get_orders') || [];
  }
  async function getOrder(orderId) {
    const orders = await getOrders();
    return orders.find(o => o.orderId === orderId) || null;
  }
  async function getOrdersByPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    const orders = await getOrders();
    return orders.filter(o => o.customer.phone.replace(/\D/g, '').includes(clean));
  }
  async function getOrdersByEmail(email) {
    return await apiCall('get_orders', { email }) || [];
  }
  async function createOrder(customer, paymentMethod) {
    const items = await getCartItems();
    if (items.length === 0) return null;
    const subtotal = await getCartTotal();
    const discount = customer.discount || 0;
    const couponCode = customer.couponCode || '';
    const total = Math.max(0, subtotal - discount + 80);
    const order = {
      orderId: generateOrderId(),
      customer,
      items: items.map(i => ({
        productId: i.productId, name: i.product.name, size: i.size,
        qty: i.qty, price: i.product.price, image: i.product.image
      })),
      subtotal, shipping: 80, discount, couponCode, total,
      paymentMethod, status: 'pending',
      statusHistory: [{ status: 'pending', date: Date.now(), note: 'Order placed' }],
      createdAt: Date.now()
    };
    await apiCall('create_order', order);
    clearCart();
    return order;
  }
  async function updateOrderStatus(orderId, status, note = '') {
    return await apiCall('update_order_status', { orderId, status, note });
  }
  async function deleteOrder(orderId) {
    return await apiCall('delete_order', { orderId });
  }

  // ── USER AUTH (Session stored in JS, real auth in PHP) ─
  function getCurrentUser() {
    try {
      const data = sessionStorage.getItem('haze_user');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }
  function isUserLoggedIn() { return !!getCurrentUser(); }
  function isCurrentUserAdmin() {
    const u = getCurrentUser();
    return u && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }
  function logoutUser() {
    sessionStorage.removeItem('haze_user');
    sessionStorage.removeItem('haze_admin_auth');
  }
  async function registerUser(name, email, password) {
    const res = await apiCall('register', {
      id: 'u-' + Date.now(), name, email, password,
      role: email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
      createdAt: Date.now()
    });
    if (res && res.ok) {
      const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';
      sessionStorage.setItem('haze_user', JSON.stringify({ name, email, role }));
      if (role === 'admin') sessionStorage.setItem('haze_admin_auth', 'true');
    }
    return res;
  }
  async function loginUser(email, password) {
    const res = await apiCall('login', { email, password });
    if (res && res.ok) {
      sessionStorage.setItem('haze_user', JSON.stringify(res.user));
      if (res.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || res.user.role === 'admin') {
        sessionStorage.setItem('haze_admin_auth', 'true');
      }
    }
    return res;
  }
  async function getUserProfile(email) {
    const users = await apiCall('get_users') || [];
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  // ── ADMIN AUTH ───────────────────────────────────────
  // Note: For full security, admin endpoints should verify token/session on PHP side.
  // This is a minimal client-side approach suitable for the current architecture.
  function isAdminLoggedIn() {
    if (isCurrentUserAdmin()) return true;
    return sessionStorage.getItem('haze_admin_auth') === 'true';
  }
  function adminLogout() {
    logoutUser();
  }

  // ── SETTINGS ─────────────────────────────────────────
  async function getSettings() {
    const res = await apiCall('get_settings');
    return res || {};
  }
  async function updateSettings(settingsObj) {
    return await apiCall('update_settings', { settings: settingsObj });
  }

  // ── ANALYTICS ────────────────────────────────────────
  async function getAnalytics() {
    let orders = [];
    let products = [];
    try { orders = (await getOrders()) || []; } catch(e){}
    try { products = (await getProducts()) || []; } catch(e){}
    if (!Array.isArray(orders)) orders = [];
    if (!Array.isArray(products)) products = [];

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayRevenue = orders.filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd).reduce((s, o) => s + (o.total || 0), 0);
      revenueByDay.push({ day: dayStr, revenue: dayRevenue });
    }

    const productSales = {};
    orders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
          productSales[item.productId].qty += (item.qty || 0);
          productSales[item.productId].revenue += (item.price || 0) * (item.qty || 0);
        });
      }
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

    return {
      totalRevenue, totalOrders, pendingOrders, deliveredOrders,
      totalProducts: products.length,
      totalStock: products.reduce((s, p) => s + (p.stock || 0), 0),
      revenueByDay, topProducts, statusCounts,
      recentOrders: orders.slice(0, 10)
    };
  }

  // ── COUPONS ──────────────────────────────────────────
  async function getCoupons() {
    const res = await apiCall('get_coupons');
    return res || [];
  }
  async function createCoupon(couponData) {
    return await apiCall('create_coupon', couponData);
  }
  async function toggleCoupon(id, isActive) {
    return await apiCall('toggle_coupon', { id, is_active: isActive });
  }
  async function deleteCoupon(id) {
    return await apiCall('delete_coupon', { id });
  }
  async function validateCoupon(code, total) {
    return await apiCall('validate_coupon', { code, total });
  }

  // ── INIT ─────────────────────────────────────────────
  function init() {
    // API backend doesn't need client-side init loading like localStorage did,
    // but this func is kept for compatibility if needed.
  }

  // ── PUBLIC API ───────────────────────────────────────
  return {
    getProducts, getProduct, addProduct, updateProduct, deleteProduct, getFeaturedProducts,
    getCart, addToCart, removeFromCart, updateCartQty, clearCart, getCartCount, getCartTotal, getCartItems,
    getOrders, getOrder, getOrdersByPhone, getOrdersByEmail, createOrder, updateOrderStatus, deleteOrder,
    isAdminLoggedIn, adminLogout,
    registerUser, loginUser, getCurrentUser, isUserLoggedIn, isCurrentUserAdmin, logoutUser, getUserProfile,
    getSettings, updateSettings, getAnalytics,
    getCoupons, createCoupon, toggleCoupon, deleteCoupon, validateCoupon,
    init, ADMIN_EMAIL
  };

})();

