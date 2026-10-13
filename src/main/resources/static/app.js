// ---------- helpers ----------
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '₹' + Number(n).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const LOW = 10, FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="#f1f3f5"/><text x="50%" y="50%" fill="#adb5bd" font-family="sans-serif" text-anchor="middle">No image</text></svg>');
const S = { token: localStorage.token, role: localStorage.role, user: localStorage.user, page: 0, apage: 0, cache: {}, editId: null, delId: null };

function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + (type === 'ok' ? '' : 'error'); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 3500);
}
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(S.token && { Authorization: 'Bearer ' + S.token }) } });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401 && S.token) { logout(); throw new Error('Session expired. Please sign in again.'); }
  if (!res.ok) throw new Error(j.data && typeof j.data === 'object' ? Object.values(j.data).join(', ') : j.message || 'Request failed');
  return j.data;
}
const loading = '<div class="loading"><div class="spin"></div>Loading…</div>';
const stockBadge = n => n === 0 ? '<span class="badge b-out">Out of stock</span>' : n <= LOW ? `<span class="badge b-low">Low stock · ${n}</span>` : `<span class="badge b-ok">In stock · ${n}</span>`;
const pager = (el, page, pages, fn) => {
  el.innerHTML = pages <= 1 ? '' : `<button class="btn sm" ${page === 0 ? 'disabled' : ''} data-p="${page - 1}">‹ Prev</button>` +
    Array.from({ length: pages }, (_, i) => `<button class="btn sm ${i === page ? 'on' : ''}" data-p="${i}">${i + 1}</button>`).join('') +
    `<button class="btn sm" ${page >= pages - 1 ? 'disabled' : ''} data-p="${page + 1}">Next ›</button>`;
  el.querySelectorAll('button').forEach(b => b.onclick = () => fn(+b.dataset.p));
};

/* ---------- Authentication ---------- */

async function authenticate(mode) {
  const usernameInput = document.getElementById('au');
  const passwordInput = document.getElementById('ap');
  const loginBtn = document.getElementById('loginBtn');
  const regBtn = document.getElementById('regBtn');

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  // Validate fields
  if (!username || !password) {
    toast('Please enter both username and password.', 'error');
    if (!username) usernameInput.focus();
    else passwordInput.focus();
    return;
  }

  if (mode === 'register' && password.length < 6) {
    toast('Password must contain at least 6 characters.', 'error');
    passwordInput.focus();
    return;
  }

  loginBtn.disabled = true;
  regBtn.disabled = true;

  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'Authentication API not found. Check your Spring Boot controller.'
        );
      }

      const fieldErrors = result.data && typeof result.data === 'object'
        ? Object.values(result.data).join(', ') : '';
      throw new Error(
        fieldErrors ||
        result.message ||
        result.error ||
        `Request failed with status ${response.status}`
      );
    }

    const data = result.data ?? result;

    // Registration can succeed without automatically logging in.
    if (mode === 'register' && !data.token) {
      toast('Account created. Please sign in.');
      passwordInput.value = '';
      usernameInput.focus();
      return;
    }

    if (!data.token || !data.username) {
      throw new Error(
        'Unexpected response from server. Check your authentication API.'
      );
    }

    // Save login session
    S.token = data.token;
    S.role = data.role || 'USER';
    S.user = data.username;

    localStorage.setItem('token', S.token);
    localStorage.setItem('role', S.role);
    localStorage.setItem('user', S.user);

    passwordInput.value = '';

    toast(
      mode === 'register'
        ? 'Account created successfully!'
        : `Welcome back, ${S.user}!`
    );

    boot();

  } catch (error) {
    console.error('Authentication failed:', error);
    toast(error.message || 'Unable to connect to the server.', 'error');
  } finally {
    loginBtn.disabled = false;
    regBtn.disabled = false;
  }
}

/* Attach each button exactly once */
document.getElementById('loginBtn').onclick = () => {
  authenticate('login');
};

document.getElementById('regBtn').onclick = () => {
  authenticate('register');
};

/* Press Enter in the password field to sign in */
document.getElementById('ap').onkeydown = event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    authenticate('login');
  }
};



/* ---------- session & navigation (these were missing) ---------- */
const VIEWS = ['catalog', 'orders', 'admin'];
const isAdmin = () => /ADMIN/i.test(String(S.role || ''));

function boot() {
  const loggedIn = !!S.token;
  $('#auth').hidden = loggedIn;
  $('#topbar').hidden = !loggedIn;
  if (!loggedIn) { VIEWS.forEach(v => $('#' + v).hidden = true); return; }
  $('#userChip').textContent = `${S.user || ''} · ${S.role || 'USER'}`;
  $('#adminTab').hidden = !isAdmin();
  renderCartBadge();
  loadCategories();
  show('catalog');
}

function logout() {
  ['token', 'role', 'user'].forEach(k => localStorage.removeItem(k));
  S.token = S.role = S.user = null; S.cache = {};
  $$('.modal').forEach(m => m.hidden = true);
  boot();
}

function show(view) {
  if (view === 'admin' && !isAdmin()) view = 'catalog';
  VIEWS.forEach(v => $('#' + v).hidden = v !== view);
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'catalog') loadProducts(S.page);
  else if (view === 'orders') loadMyOrders();
  else if (view === 'admin') loadAdmin(S.apage);
}

async function loadCategories() {
  try {
    const list = await api('/products/categories');
    const cats = (Array.isArray(list) ? list : []).map(c => typeof c === 'string' ? c : c._id || c.name).filter(Boolean);
    const cur = $('#cat').value;
    $('#cat').innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
    $('#cat').value = cur;
    $('#catList').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  } catch (e) { /* category filter is optional */ }
}

// ---------- catalog ----------
async function loadProducts(page = 0) {
  S.page = page; $('#grid').innerHTML = loading;
  const p = new URLSearchParams({ page, size: 8, sort: $('#sort').value, lowStock: $('#low').checked });
  [['q', '#q'], ['category', '#cat'], ['minPrice', '#minP'], ['maxPrice', '#maxP']].forEach(([k, id]) => $(id).value && p.set(k, $(id).value));
  try {
    const d = await api('/products?' + p);
    $('#grid').innerHTML = d.items.length ? d.items.map(card).join('') :
      '<div class="empty"><b>No products found</b>Try adjusting your search or filters.</div>';
    d.items.forEach(p => S.cache[p.id] = p);
    $$('.pcard').forEach(c => c.onclick = () => openDetail(c.dataset.id));
    syncCardActions();
    pager($('#pager'), d.page, d.totalPages, loadProducts);
  } catch (e) { $('#grid').innerHTML = `<div class="empty"><b>Something went wrong</b>${esc(e.message)}</div>`; }
}
const card = p => `<article class="pcard" data-id="${p.id}"><img src="${esc(p.image) || FALLBACK}" onerror="this.src=FALLBACK" alt="">
  <div class="pbody"><span class="cat">${esc(p.category)}</span><h3>${esc(p.name)}</h3><div class="muted">${esc(p.brand)} · ★ ${p.rating.toFixed(1)}</div>
  <div class="meta"><span class="price">${money(p.price)}</span>${stockBadge(p.stock)}</div><div class="cardact" data-act="${p.id}"></div></div></article>`;
async function openDetail(id) {
  try {
    const p = await api('/products/' + id);
    $('#detailBody').innerHTML = `<div class="detail"><img src="${esc(p.image) || FALLBACK}" onerror="this.src=FALLBACK" alt="">
      <p><span class="cat">${esc(p.category)}</span></p><h2>${esc(p.name)}</h2><p class="muted">${esc(p.brand)} · ★ ${p.rating.toFixed(1)} · Added ${new Date(p.createdAt).toLocaleDateString()}</p>
      <p>${esc(p.description) || 'No description.'}</p><div class="meta"><span class="price">${money(p.price)}</span>${stockBadge(p.stock)}</div></div>
      <div class="row end" style="margin-top:16px"><button class="btn" data-close>Close</button><button class="btn primary" id="detAdd" ${p.stock === 0 ? 'disabled' : ''}>Add to cart</button></div>`;
    $('#detailModal').hidden = false; $('#detAdd').onclick = () => addToCart(p);
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- admin ----------
async function loadAdmin(page = 0) {
  S.apage = page; $('#prodTable').innerHTML = `<tr><td>${loading}</td></tr>`;
  try {
    const [st, d] = await Promise.all([api('/products/stats'), api(`/products?page=${page}&size=8&sort=createdAt,desc`)]);
    const o = st.overview || {};
    $('#stats').innerHTML = [['Total products', o.totalProducts || 0], ['Average price', money(o.avgPrice || 0)], ['Units in stock', o.totalUnits || 0],
      ['Low stock', st.lowStockCount], ['Out of stock', st.outOfStockCount]].map(([l, v]) => `<div class="card stat"><span class="muted">${l}</span><b>${v}</b></div>`).join('');
    $('#catTable').innerHTML = '<thead><tr><th>Category</th><th>Products</th><th>Avg price</th><th>Total stock</th></tr></thead><tbody>' +
      st.byCategory.map(c => `<tr><td>${esc(c._id)}</td><td>${c.count}</td><td>${money(c.avgPrice)}</td><td>${c.totalStock}</td></tr>`).join('') + '</tbody>';
    $('#prodTable').innerHTML = d.items.length ? '<thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>' +
      d.items.map(p => `<tr><td><img src="${esc(p.image) || FALLBACK}" onerror="this.src=FALLBACK" alt="">${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${stockBadge(p.stock)}</td>
      <td><button class="btn sm" data-edit="${p.id}">Edit</button> <button class="btn sm danger" data-del="${p.id}" data-name="${esc(p.name)}">Delete</button></td></tr>`).join('') + '</tbody>'
      : '<tr><td><div class="empty"><b>No products yet</b>Click “Add product” to create one.</div></td></tr>';
    $$('[data-edit]').forEach(b => b.onclick = () => openForm(d.items.find(p => p.id === b.dataset.edit)));
    $$('[data-del]').forEach(b => b.onclick = () => askDelete('product', b.dataset.del, 'Delete product?', `“${b.dataset.name}” will be permanently removed.`));
    pager($('#apager'), d.page, d.totalPages, loadAdmin); loadAdminOrders();
  } catch (e) { toast(e.message, 'error'); }
}
const F = { n: '#fn', c: '#fc', b: '#fb', p: '#fp', s: '#fs', r: '#fr', i: '#fi', d: '#fd' };
function openForm(p) {
  S.editId = p?.id || null; $('#formTitle').textContent = p ? 'Edit product' : 'Add product'; $('#formErr').textContent = ''; $('#ff').value = '';
  const v = p || {}; $(F.n).value = v.name || ''; $(F.c).value = v.category || ''; $(F.b).value = v.brand || ''; $(F.p).value = v.price ?? '';
  $(F.s).value = v.stock ?? ''; $(F.r).value = v.rating ?? ''; $(F.i).value = v.image || ''; $(F.d).value = v.description || ''; preview(); $('#formModal').hidden = false;
}
function preview() { const u = $(F.i).value, img = $('#prev'); img.style.display = u ? 'block' : 'none'; img.src = u; $('#prevTxt').hidden = !!u; }
async function save() {
  const btn = $('#saveBtn'); btn.disabled = true;
  const body = JSON.stringify({ name: $(F.n).value, category: $(F.c).value, brand: $(F.b).value, price: $(F.p).value === '' ? null : +$(F.p).value,
    stock: $(F.s).value === '' ? null : +$(F.s).value, rating: +$(F.r).value || 0, image: $(F.i).value, description: $(F.d).value });
  try {
    await api('/products' + (S.editId ? '/' + S.editId : ''), { method: S.editId ? 'PUT' : 'POST', body });
    $('#formModal').hidden = true; toast(S.editId ? 'Product updated' : 'Product created'); loadAdmin(S.apage); loadCategories();
  } catch (e) { $('#formErr').textContent = e.message; } finally { btn.disabled = false; }
}
async function confirmDelete() {
  try {
    if (S.delMode === 'product') { await api('/products/' + S.delId, { method: 'DELETE' }); toast('Product deleted'); loadAdmin(S.apage); loadCategories(); }
    else if (S.delMode === 'order') { await api('/orders/' + S.delId, { method: 'DELETE' }); toast('Order deleted'); loadMyOrders(); }
    else { await api('/orders/mine', { method: 'DELETE' }); toast('All orders deleted'); loadMyOrders(); }
  } catch (e) { toast(e.message, 'error'); } finally { $('#confirmModal').hidden = true; }
}

// ---------- events ----------
$('#logoutBtn').onclick = logout; $$('.tab').forEach(t => t.onclick = () => show(t.dataset.view));
let timer; $$('#q,#minP,#maxP').forEach(el => el.oninput = () => { clearTimeout(timer); timer = setTimeout(() => loadProducts(), 300); });
$$('#cat,#sort,#low').forEach(el => el.onchange = () => loadProducts());
$('#addBtn').onclick = () => openForm(); $('#saveBtn').onclick = save; $('#confirmBtn').onclick = confirmDelete; $(F.i).oninput = preview;
$('#ff').onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 1_500_000) return toast('Image must be under 1.5 MB', 'error');
  const r = new FileReader(); r.onload = () => { $(F.i).value = r.result; preview(); }; r.readAsDataURL(f); };
document.addEventListener('click', e => { if (e.target.hasAttribute('data-close') || e.target.classList.contains('modal')) $$('.modal').forEach(m => m.hidden = true); });

// ---------- cart ----------
const FREE_SHIP = 999, SHIP_FEE = 49;
const getCart = () => JSON.parse(localStorage.cart || '{}');
const setCart = c => { localStorage.cart = JSON.stringify(c); renderCartBadge(); syncCardActions(); };
const renderCartBadge = () => $('#cartCount').textContent = Object.values(getCart()).reduce((a, i) => a + i.qty, 0);
function totals(c) {
  const sub = Object.values(c).reduce((a, i) => a + i.price * i.qty, 0), ship = sub === 0 || sub >= FREE_SHIP ? 0 : SHIP_FEE;
  return { sub, ship, total: sub + ship };
}
function addToCart(p) {
  if (!p) return; const c = getCart(), cur = c[p.id]?.qty || 0;
  if (cur + 1 > p.stock) return toast(`Only ${p.stock} in stock`, 'error');
  c[p.id] = { id: p.id, name: p.name, price: p.price, image: p.image, stock: p.stock, qty: cur + 1 };
  setCart(c); toast(p.name + ' added to cart');
}
function openCart() {
  const c = getCart(), items = Object.values(c), t = totals(c);
  $('#cartItems').innerHTML = items.length ? items.map(i => `<div class="citem"><img src="${esc(i.image) || FALLBACK}" onerror="this.src=FALLBACK" alt="">
    <div class="grow"><b>${esc(i.name)}</b><div class="muted">${money(i.price)}</div>
    <div class="qty"><button class="btn sm" data-q="${i.id}" data-d="-1">−</button><span>${i.qty}</span><button class="btn sm" data-q="${i.id}" data-d="1">+</button></div></div>
    <button class="btn ghost sm" data-rm="${i.id}">Remove</button></div>`).join('')
    : '<div class="empty"><b>Your cart is empty</b>Add some products to get started.</div>';
  $('#cartFoot').innerHTML = items.length ? `<div class="sumrow"><span>Subtotal</span><span>${money(t.sub)}</span></div>
    <div class="sumrow"><span>Shipping</span><span>${t.ship ? money(t.ship) : 'Free'}</span></div>
    <div class="sumrow tot"><span>Total</span><span>${money(t.total)}</span></div><button class="btn primary" id="toCheckout">Proceed to checkout</button>` : '';
  $$('[data-q]').forEach(b => b.onclick = () => { const i = c[b.dataset.q]; i.qty += +b.dataset.d;
    if (i.qty <= 0) delete c[i.id]; else if (i.qty > i.stock) { i.qty = i.stock; toast(`Only ${i.stock} in stock`, 'error'); } setCart(c); openCart(); });
  $$('[data-rm]').forEach(b => b.onclick = () => { delete c[b.dataset.rm]; setCart(c); openCart(); });
  if ($('#toCheckout')) $('#toCheckout').onclick = openCheckout;
  $('#cartModal').hidden = false;
}

// ---------- checkout ----------
const payMethod = () => document.querySelector('input[name=pay]:checked').value;
function openCheckout() {
  const t = totals(getCart()); $('#cartModal').hidden = true; $('#ckErr').textContent = ''; showPayFields();
  $('#ck_name').value ||= S.user || '';
  $('#ckSummary').innerHTML = `<div class="sumrow"><span>Subtotal</span><span>${money(t.sub)}</span></div><div class="sumrow"><span>Shipping</span><span>${t.ship ? money(t.ship) : 'Free'}</span></div><div class="sumrow tot"><span>Total payable</span><span>${money(t.total)}</span></div>`;
  $('#checkoutModal').hidden = false;
}
function showPayFields() { ['UPI', 'CARD', 'COD'].forEach(m => $('#pay' + m).hidden = m !== payMethod()); }
function validateCheckout() {
  const m = payMethod();
  if (!$('#ck_name').value.trim()) return 'Full name is required';
  if (!/^[0-9+ -]{10,15}$/.test($('#ck_phone').value.trim())) return 'Enter a valid phone number';
  if ($('#ck_addr').value.trim().length < 5) return 'Delivery address is required';
  if (m === 'UPI' && !/^[\w.-]+@\w+$/.test($('#ck_upi').value.trim())) return 'Enter a valid UPI ID (name@bank)';
  if (m === 'CARD') {
    if (!/^\d{16}$/.test($('#ck_card').value.replace(/\s/g, ''))) return 'Card number must be 16 digits';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test($('#ck_exp').value.trim())) return 'Expiry must be in MM/YY format';
    if (!/^\d{3,4}$/.test($('#ck_cvv').value)) return 'Enter a valid CVV';
  }
  return '';
}
async function placeOrder() {
  const err = validateCheckout(); $('#ckErr').textContent = err; if (err) return;
  const btn = $('#payBtn'); btn.disabled = true; btn.textContent = 'Processing…';
  const items = Object.values(getCart()).map(i => ({ productId: i.id, quantity: i.qty }));
  try {
    await new Promise(r => setTimeout(r, 900));   // simulated payment processing
    const o = await api('/orders', { method: 'POST', body: JSON.stringify({ items, name: $('#ck_name').value, phone: $('#ck_phone').value,
      address: $('#ck_addr').value, paymentMethod: payMethod() }) });
    setCart({}); $('#checkoutModal').hidden = true;
    $('#doneTxt').textContent = `Order #${o.id.slice(-6).toUpperCase()} · ${money(o.total)} · ${o.paymentMethod === 'COD' ? 'Pay on delivery' : 'Payment successful'}`;
    $('#doneModal').hidden = false; if (!$('#catalog').hidden) loadProducts(S.page);
  } catch (e) { $('#ckErr').textContent = e.message; } finally { btn.disabled = false; btn.textContent = 'Place order'; }
}

// ---------- orders ----------
const stCls = s => ({ DELIVERED: 'b-ok', PAID: 'b-ok', SHIPPED: 'b-ok', PLACED: 'b-low', CANCELLED: 'b-out' }[s] || 'b-low');
async function loadMyOrders() {
  $('#orderList').innerHTML = loading;
  try {
    const o = (await api('/orders/mine')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));   // newest first
    $('#clearOrders').hidden = !o.length;
    $('#orderList').innerHTML = o.length ? o.map(x => `<details class="card ocard"><summary>
      <div><b>Order #${x.id.slice(-6).toUpperCase()}</b><div class="muted">${new Date(x.createdAt).toLocaleString()} · ${x.paymentMethod} · ${x.items.reduce((a, i) => a + i.quantity, 0)} items</div></div>
      <div class="osum"><span class="badge ${stCls(x.status)}">${x.status}</span><b>${money(x.total)}</b><button class="btn sm danger" data-delord="${x.id}">Delete</button></div></summary>
      ${x.items.map(i => `<div class="oline"><img src="${esc(i.image) || FALLBACK}" onerror="this.src=FALLBACK" alt=""><span class="grow">${esc(i.name)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></div>`).join('')}
      <div class="sumrow tot"><span>Total</span><span>${money(x.total)}</span></div></details>`).join('')
      : '<div class="empty"><b>No orders yet</b>Your orders will appear here.</div>';
    $$('[data-delord]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); askDelete('order', b.dataset.delord, 'Delete this order?', 'This removes the order from your history.'); });
  } catch (e) { toast(e.message, 'error'); }
}
async function loadAdminOrders() {
  try {
    const o = await api('/orders');
    $('#ordTable').innerHTML = o.length ? '<thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>' +
      o.map(x => `<tr><td>#${x.id.slice(-6).toUpperCase()}</td><td>${esc(x.customerName)}<div class="muted">${esc(x.phone)}</div></td><td>${new Date(x.createdAt).toLocaleDateString()}</td>
      <td>${x.items.reduce((a, i) => a + i.quantity, 0)}</td><td>${money(x.total)}</td><td>${x.paymentMethod}</td>
      <td><select data-st="${x.id}">${['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') + '</tbody>'
      : '<tr><td><div class="empty"><b>No orders yet</b>Customer orders will show up here.</div></td></tr>';
    $$('[data-st]').forEach(s => s.onchange = async () => { try { await api(`/orders/${s.dataset.st}/status?status=${s.value}`, { method: 'PUT' }); toast('Order status updated'); } catch (e) { toast(e.message, 'error'); } });
  } catch (e) { toast(e.message, 'error'); }
}
$('#cartBtn').onclick = openCart; $('#payBtn').onclick = placeOrder; $$('input[name=pay]').forEach(r => r.onchange = showPayFields);
$('#viewOrders').addEventListener('click', () => show('orders'));


// ---------- card cart controls (add / quantity / remove) ----------
function cardAction(p) {
  const q = getCart()[p.id]?.qty || 0;
  return q ? `<div class="cardqty"><button class="btn sm" data-cq="${p.id}" data-d="-1">−</button><span>${q} in cart</span><button class="btn sm" data-cq="${p.id}" data-d="1">+</button><button class="btn sm rm" data-crm="${p.id}">Remove</button></div>`
           : `<button class="btn primary sm addbtn" data-add="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>`;
}
function syncCardActions() {
  $$('[data-act]').forEach(el => {
    const p = S.cache[el.dataset.act]; if (!p) return; el.innerHTML = cardAction(p);
    const stop = fn => e => { e.stopPropagation(); fn(); };
    el.querySelectorAll('[data-add]').forEach(b => b.onclick = stop(() => addToCart(p)));
    el.querySelectorAll('[data-cq]').forEach(b => b.onclick = stop(() => +b.dataset.d > 0 ? addToCart(p) : changeQty(p.id, -1)));
    el.querySelectorAll('[data-crm]').forEach(b => b.onclick = stop(() => removeFromCart(p.id)));
  });
}
function changeQty(id, d) { const c = getCart(); if (!c[id]) return; c[id].qty += d; if (c[id].qty <= 0) delete c[id]; setCart(c); }
function removeFromCart(id) { const c = getCart(), n = c[id]?.name; delete c[id]; setCart(c); toast((n || 'Item') + ' removed from cart'); }
// ---------- shared delete confirmation ----------
function askDelete(mode, id, title, text) { S.delMode = mode; S.delId = id; $('#confirmTitle').textContent = title; $('#confirmTxt').textContent = text; $('#confirmModal').hidden = false; }
$('#clearOrders').onclick = () => askDelete('allOrders', null, 'Delete all orders?', 'Your entire order history will be removed. This cannot be undone.');

boot();