/* ═══════════════════════════════════════════════════════
   HAZE — data.js
   Product Database, Cart & Order Storage (localStorage)
   ═══════════════════════════════════════════════════════ */

const HazeDB = (() => {

  // ── DEFAULT PRODUCTS ─────────────────────────────────
  const DEFAULT_PRODUCTS = [
    {
      id: 'haze-tee-001',
      name: 'Oversized Tee',
      description: '100% Cotton · Dropped Shoulder · Screen Printed',
      price: 850,
      priceUSD: 8,
      image: 'images/product-tee.png',
      category: 'tops',
      tag: 'New',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      stock: 50,
      featured: true,
      createdAt: Date.now()
    },
    {
      id: 'haze-hoodie-001',
      name: 'Hoodie',
      description: 'Heavy Fleece · Kangaroo Pocket · Embroidered Logo',
      price: 1800,
      priceUSD: 16,
      image: 'images/product-hoodie.png',
      category: 'tops',
      tag: 'Popular',
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 30,
      featured: true,
      createdAt: Date.now()
    },
    {
      id: 'haze-cargo-001',
      name: 'Cargo Pants',
      description: 'Wide Leg · 6 Pockets · Utility Style',
      price: 2200,
      priceUSD: 20,
      image: 'images/product-cargo.png',
      category: 'bottoms',
      tag: 'Limited',
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 20,
      featured: true,
      createdAt: Date.now()
    },
    {
      id: 'haze-cap-001',
      name: '5-Panel Cap',
      description: 'Embroidered Logo · Adjustable Strap',
      price: 650,
      priceUSD: 6,
      image: 'images/product-cap.png',
      category: 'accessories',
      tag: '',
      sizes: ['One Size'],
      stock: 100,
      featured: true,
      createdAt: Date.now()
    },
    {
      id: 'haze-tote-001',
      name: 'Tote Bag',
      description: 'Canvas · Screen Printed · Large',
      price: 400,
      priceUSD: 4,
      image: 'images/product-tote.png',
      category: 'accessories',
      tag: '',
      sizes: ['One Size'],
      stock: 80,
      featured: true,
      createdAt: Date.now()
    }
  ];

  const ADMIN_DEFAULT_PASSWORD = 'haze2026';
  const ADMIN_EMAIL = 'wearhaze.com@gmail.com';
  const STORE_DEFAULTS = {
    storeName: 'HAZE',
    tagline: 'Wear the Haze',
    email: 'hello@wearhaze.com',
    phone: '+880 1XXX-XXXXXX',
    bkash: '01XXXXXXXXX',
    nagad: '01XXXXXXXXX',
    instagram: 'https://instagram.com/wearhaze',
    facebook: 'https://facebook.com/wearhaze',
    tiktok: 'https://tiktok.com/@wearhaze'
  };

  // ── STORAGE HELPERS ──────────────────────────────────
  function getStore(key, fallback) {
    try {
      const data = localStorage.getItem('haze_' + key);
      return data ? JSON.parse(data) : fallback;
    } catch { return fallback; }
  }
  function setStore(key, value) {
    localStorage.setItem('haze_' + key, JSON.stringify(value));
  }

  // ── INIT ─────────────────────────────────────────────
  function init() {
    if (!localStorage.getItem('haze_products')) setStore('products', DEFAULT_PRODUCTS);
    if (!localStorage.getItem('haze_orders'))   setStore('orders', []);
    if (!localStorage.getItem('haze_cart'))     setStore('cart', []);
    if (!localStorage.getItem('haze_admin_pass')) setStore('admin_pass', ADMIN_DEFAULT_PASSWORD);
    if (!localStorage.getItem('haze_settings')) setStore('settings', STORE_DEFAULTS);
    if (!localStorage.getItem('haze_users'))    setStore('users', []);
  }

  // ── SIMPLE HASH (not cryptographic, just obfuscation) ──
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  // ── USER AUTH ─────────────────────────────────────────
  function getUsers() { return getStore('users', []); }

  function registerUser(name, email, password) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Email already registered.' };
    }
    const user = {
      id: 'u-' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: simpleHash(password),
      role: email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
      createdAt: Date.now()
    };
    users.push(user);
    setStore('users', users);
    // Auto login
    sessionStorage.setItem('haze_user', JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }));
    return { ok: true, user };
  }

  function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user) return { ok: false, error: 'No account found with this email.' };
    if (user.password !== simpleHash(password)) return { ok: false, error: 'Incorrect password.' };
    const session = { id: user.id, name: user.name, email: user.email, role: user.role };
    sessionStorage.setItem('haze_user', JSON.stringify(session));
    // If admin email → also set admin auth
    if (user.email === ADMIN_EMAIL.toLowerCase()) {
      sessionStorage.setItem('haze_admin_auth', 'true');
    }
    return { ok: true, user: session };
  }

  function getCurrentUser() {
    try {
      const data = sessionStorage.getItem('haze_user');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  function isUserLoggedIn() { return !!getCurrentUser(); }

  function isCurrentUserAdmin() {
    const u = getCurrentUser();
    return u && u.email === ADMIN_EMAIL.toLowerCase();
  }

  function logoutUser() {
    sessionStorage.removeItem('haze_user');
    sessionStorage.removeItem('haze_admin_auth');
  }

  function getOrdersByEmail(email) {
    return getOrders().filter(o => o.customer.email && o.customer.email.toLowerCase() === email.toLowerCase());
  }

  function getUserProfile(email) {
    return getUsers().find(u => u.email === email.toLowerCase()) || null;
  }

  // ── PRODUCTS ─────────────────────────────────────────
  function getProducts() {
    return getStore('products', DEFAULT_PRODUCTS);
  }
  function getProduct(id) {
    return getProducts().find(p => p.id === id) || null;
  }
  function addProduct(product) {
    const products = getProducts();
    product.id = product.id || 'haze-' + Date.now();
    product.createdAt = Date.now();
    products.push(product);
    setStore('products', products);
    return product;
  }
  function updateProduct(id, updates) {
    const products = getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates };
    setStore('products', products);
    return products[idx];
  }
  function deleteProduct(id) {
    const products = getProducts().filter(p => p.id !== id);
    setStore('products', products);
  }
  function getFeaturedProducts() {
    return getProducts().filter(p => p.featured);
  }

  // ── CART ──────────────────────────────────────────────
  function getCart() {
    return getStore('cart', []);
  }
  function addToCart(productId, size, qty = 1) {
    const cart = getCart();
    const existing = cart.find(i => i.productId === productId && i.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, size, qty, addedAt: Date.now() });
    }
    setStore('cart', cart);
    return cart;
  }
  function removeFromCart(productId, size) {
    const cart = getCart().filter(i => !(i.productId === productId && i.size === size));
    setStore('cart', cart);
    return cart;
  }
  function updateCartQty(productId, size, qty) {
    const cart = getCart();
    const item = cart.find(i => i.productId === productId && i.size === size);
    if (item) {
      if (qty <= 0) return removeFromCart(productId, size);
      item.qty = qty;
    }
    setStore('cart', cart);
    return cart;
  }
  function clearCart() {
    setStore('cart', []);
  }
  function getCartCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }
  function getCartTotal() {
    const products = getProducts();
    return getCart().reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }
  function getCartItems() {
    const products = getProducts();
    return getCart().map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? { ...item, product } : null;
    }).filter(Boolean);
  }

  // ── ORDERS ───────────────────────────────────────────
  function generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'HZ-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }
  function getOrders() {
    return getStore('orders', []);
  }
  function getOrder(orderId) {
    return getOrders().find(o => o.orderId === orderId) || null;
  }
  function getOrdersByPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    return getOrders().filter(o => o.customer.phone.replace(/\D/g, '').includes(clean));
  }
  function createOrder(customer, paymentMethod) {
    const items = getCartItems();
    if (items.length === 0) return null;
    const order = {
      orderId: generateOrderId(),
      customer: { ...customer },
      items: items.map(i => ({
        productId: i.productId,
        name: i.product.name,
        size: i.size,
        qty: i.qty,
        price: i.product.price,
        image: i.product.image
      })),
      subtotal: getCartTotal(),
      shipping: 80,
      total: getCartTotal() + 80,
      paymentMethod,
      status: 'pending',
      statusHistory: [
        { status: 'pending', date: Date.now(), note: 'Order placed' }
      ],
      createdAt: Date.now()
    };
    const orders = getOrders();
    orders.unshift(order);
    setStore('orders', orders);
    // Update stock
    const products = getProducts();
    order.items.forEach(item => {
      const p = products.find(pp => pp.id === item.productId);
      if (p) p.stock = Math.max(0, p.stock - item.qty);
    });
    setStore('products', products);
    clearCart();
    return order;
  }
  function updateOrderStatus(orderId, status, note = '') {
    const orders = getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return null;
    order.status = status;
    order.statusHistory.push({ status, date: Date.now(), note });
    setStore('orders', orders);
    return order;
  }
  function deleteOrder(orderId) {
    const orders = getOrders().filter(o => o.orderId !== orderId);
    setStore('orders', orders);
  }

  // ── ADMIN AUTH ───────────────────────────────────────
  function adminLogin(password) {
    // Accept admin email user login OR legacy password
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.email === ADMIN_EMAIL.toLowerCase()) {
      sessionStorage.setItem('haze_admin_auth', 'true');
      return true;
    }
    const stored = getStore('admin_pass', ADMIN_DEFAULT_PASSWORD);
    if (password === stored) {
      sessionStorage.setItem('haze_admin_auth', 'true');
      return true;
    }
    return false;
  }
  function isAdminLoggedIn() {
    // Also check if current user is admin email
    if (isCurrentUserAdmin()) return true;
    return sessionStorage.getItem('haze_admin_auth') === 'true';
  }
  function adminLogout() {
    sessionStorage.removeItem('haze_admin_auth');
    logoutUser();
  }
  function changeAdminPassword(oldPass, newPass) {
    const stored = getStore('admin_pass', ADMIN_DEFAULT_PASSWORD);
    if (oldPass !== stored) return false;
    setStore('admin_pass', newPass);
    return true;
  }

  // ── SETTINGS ─────────────────────────────────────────
  function getSettings() {
    return getStore('settings', STORE_DEFAULTS);
  }
  function updateSettings(updates) {
    const settings = { ...getSettings(), ...updates };
    setStore('settings', settings);
    return settings;
  }

  // ── ANALYTICS ────────────────────────────────────────
  function getAnalytics() {
    const orders = getOrders();
    const products = getProducts();
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    // Revenue by day (last 7 days)
    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayRevenue = orders
        .filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd)
        .reduce((s, o) => s + o.total, 0);
      revenueByDay.push({ day: dayStr, revenue: dayRevenue });
    }

    // Top products
    const productSales = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.qty;
        productSales[item.productId].revenue += item.price * item.qty;
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Orders by status
    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

    return {
      totalRevenue,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalProducts: products.length,
      totalStock: products.reduce((s, p) => s + p.stock, 0),
      revenueByDay,
      topProducts,
      statusCounts,
      recentOrders: orders.slice(0, 10)
    };
  }

  // ── INIT ON LOAD ─────────────────────────────────────
  init();

  // ── PUBLIC API ───────────────────────────────────────
  return {
    // Products
    getProducts, getProduct, addProduct, updateProduct, deleteProduct, getFeaturedProducts,
    // Cart
    getCart, addToCart, removeFromCart, updateCartQty, clearCart, getCartCount, getCartTotal, getCartItems,
    // Orders
    getOrders, getOrder, getOrdersByPhone, getOrdersByEmail, createOrder, updateOrderStatus, deleteOrder,
    // Admin
    adminLogin, isAdminLoggedIn, adminLogout, changeAdminPassword,
    // User Auth
    registerUser, loginUser, getCurrentUser, isUserLoggedIn, isCurrentUserAdmin, logoutUser, getUserProfile,
    // Settings
    getSettings, updateSettings,
    // Analytics
    getAnalytics,
    // Utils
    init,
    ADMIN_EMAIL
  };

})();
