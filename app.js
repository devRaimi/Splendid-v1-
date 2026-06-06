/**
 * Splendid Puff — Main Application Logic
 * Reads all settings from config.js (CONFIG object)
 */

// ── State ──────────────────────────────────────────────────────────────
let cart = {};
let selectedFlavour = CONFIG.FLAVOURS[0];
let selectedCampus  = CONFIG.CAMPUSES[0];
let receiptFile     = null;
let receiptBase64   = null;
let currentFilter   = 'all';
let orders          = [];
let adminUnlocked   = false;

// ── Helpers ────────────────────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => el.className = 'toast', 3000);
}

function genRef() {
  return 'SP-' + String(orders.length + 1).padStart(4, '0');
}

function cartTotal() {
  return Object.values(cart).reduce((s, i) => s + (i.qty * i.price), 0);
}

function formatNaira(n) {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function getProductName(id) {
  return CONFIG.PRODUCTS.find(p => p.id === id)?.name || id;
}

function getProductEmoji(id) {
  return CONFIG.PRODUCTS.find(p => p.id === id)?.emoji || '';
}

// ── Persistence ────────────────────────────────────────────────────────
function saveOrders() {
  try { localStorage.setItem('sp_orders_v2', JSON.stringify(orders)); } catch(e) {}
}

function loadOrders() {
  try {
    const raw = localStorage.getItem('sp_orders_v2');
    orders = raw ? JSON.parse(raw) : [];
  } catch(e) { orders = []; }
}

// ── Google Sheets sync ────────────────────────────────────────────────
async function syncToSheet(order) {
  if (!CONFIG.SHEET_WEBHOOK_URL) return;
  try {
    const payload = {
      action: 'addOrder',
      ref:    order.ref,
      name:   order.name,
      phone:  order.phone,
      campus: order.campus,
      location: order.location,
      items:  order.items.map(i => `${getProductEmoji(i.id)} ${getProductName(i.id)} x${i.qty} (${i.sizeLabel})`).join(' | '),
      flavour: order.flavour || '',
      total:  order.total,
      notes:  order.notes || '',
      gift:   order.gift ? `For: ${order.gift.recipient}${order.gift.note ? ' | Note: ' + order.gift.note : ''}` : '',
      receipt: receiptBase64 || '',
      time:   order.time,
      date:   order.date,
      status: order.status,
    };
    await fetch(CONFIG.SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch(e) {
    console.warn('Sheet sync failed:', e);
  }
}

async function updateStatusInSheet(ref, status) {
  if (!CONFIG.SHEET_WEBHOOK_URL) return;
  try {
    await fetch(CONFIG.SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateStatus', ref, status }),
    });
  } catch(e) {}
}

// ── Init ──────────────────────────────────────────────────────────────
function init() {
  loadOrders();
  buildProducts();
  buildFlavours();
  buildCampusTags();
  populateBankDetails();
}

function populateBankDetails() {
  document.getElementById('bank-acct-display').textContent   = CONFIG.BANK_ACCOUNT_NUMBER;
  document.getElementById('bank-name-display').innerHTML     = `<strong>Bank:</strong> ${CONFIG.BANK_NAME}`;
  document.getElementById('bank-holder-display').innerHTML   = `<strong>Account name:</strong> ${CONFIG.BANK_ACCOUNT_HOLDER}`;
}

// ── Product Grid ──────────────────────────────────────────────────────
function buildProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = CONFIG.PRODUCTS.map(p => `
    <div class="product-card" id="card-${p.id}">
      <div class="product-emoji">${p.emoji}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-hint">${p.sizes[0].label.split('(')[0].trim()} from ${formatNaira(p.sizes[0].price)}</div>
      <select class="size-select" onchange="onSizeChange('${p.id}',this)">
        <option value="">Choose size</option>
        ${p.sizes.map(s => `<option value="${s.price}" data-label="${s.label}">${s.label} — ${formatNaira(s.price)}</option>`).join('')}
      </select>
      <div class="qty-row">
        <button class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button>
        <span class="qty-val" id="qty-${p.id}">0</span>
        <button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>
      </div>
    </div>
  `).join('');
}

function onSizeChange(id, sel) {
  const price = parseInt(sel.value) || 0;
  const sizeLabel = sel.options[sel.selectedIndex]?.dataset.label || '';
  if (!cart[id]) cart[id] = { qty: 0, price: 0, sizeLabel: '' };
  cart[id].price     = price;
  cart[id].sizeLabel = sizeLabel.split('—')[0].trim();
  if (price && cart[id].qty === 0) { cart[id].qty = 1; }
  if (!price)                      { cart[id].qty = 0; }
  document.getElementById('qty-' + id).textContent = cart[id].qty;
  document.getElementById('card-' + id).classList.toggle('has-item', price > 0 && cart[id].qty > 0);
  checkFlavourVisibility();
}

function changeQty(id, delta) {
  if (!cart[id] || !cart[id].price) { toast('Please choose a size first 👆'); return; }
  cart[id].qty = Math.max(0, (cart[id].qty || 0) + delta);
  if (cart[id].qty === 0) {
    cart[id].price = 0;
    const sel = document.querySelector(`#card-${id} .size-select`);
    if (sel) sel.value = '';
    document.getElementById('card-' + id).classList.remove('has-item');
  }
  document.getElementById('qty-' + id).textContent = cart[id].qty;
  checkFlavourVisibility();
}

function checkFlavourVisibility() {
  const hasPuff = cart['puff'] && cart['puff'].qty > 0;
  document.getElementById('flavour-wrap').style.display = hasPuff ? 'block' : 'none';
}

// ── Flavours & Campus ─────────────────────────────────────────────────
function buildFlavours() {
  const row = document.getElementById('flavour-tags');
  row.innerHTML = CONFIG.FLAVOURS.map((f, i) =>
    `<span class="tag ${i === 0 ? 'selected' : ''}" onclick="pickFlavour(this,'${f}')">${f}</span>`
  ).join('');
}

function buildCampusTags() {
  // Tags are hardcoded in HTML; just ensure first is selected.
}

function pickFlavour(el, val) {
  document.querySelectorAll('#flavour-tags .tag').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  selectedFlavour = val;
}

function pickCampus(el, val) {
  document.querySelectorAll('.nav + * .tag-row .tag, #step-1 .tag-row:nth-of-type(2) .tag').forEach(t => t.classList.remove('selected'));
  // simpler: all campus tags
  el.closest('.tag-row').querySelectorAll('.tag').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  selectedCampus = val;
}

// ── Gift toggle ───────────────────────────────────────────────────────
function toggleGift() {
  const on = document.getElementById('gift-check').checked;
  document.getElementById('gift-fields').style.display = on ? 'block' : 'none';
  document.getElementById('gift-card').classList.toggle('on', on);
}

// ── Navigation ────────────────────────────────────────────────────────
function showTab(tab, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'admin') refreshAdmin();
}

function goStep(n) {
  if (n === 2) {
    if (cartTotal() === 0) { toast('Please select at least one item 🛍', true); return; }
    buildSummaryCard();
  }
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + n).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Summary ───────────────────────────────────────────────────────────
function buildSummaryCard() {
  const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const card  = document.getElementById('order-summary-card');
  card.innerHTML = items.map(([id, v]) => `
    <div class="summary-row">
      <div>
        <span>${getProductEmoji(id)} ${getProductName(id)} × ${v.qty}</span>
        <div class="summary-row-label">${v.sizeLabel}${id === 'puff' ? ' · ' + selectedFlavour : ''}</div>
      </div>
      <span>${formatNaira(v.qty * v.price)}</span>
    </div>
  `).join('') + `<div class="summary-row total"><span>Total</span><span>${formatNaira(cartTotal())}</span></div>`;
}

// ── Upload ────────────────────────────────────────────────────────────
function handleUpload(input) {
  const file = input.files[0];
  if (!file) return;
  receiptFile = file;
  document.getElementById('upload-filename').textContent = '✅ ' + file.name;
  document.getElementById('upload-zone').classList.add('has-file');
  // Convert to base64 for sheet sync
  const reader = new FileReader();
  reader.onload = e => { receiptBase64 = e.target.result; };
  reader.readAsDataURL(file);
}

// ── Submit order ──────────────────────────────────────────────────────
async function submitOrder() {
  const name     = document.getElementById('cust-name').value.trim();
  const phone    = document.getElementById('cust-phone').value.trim();
  const location = document.getElementById('cust-location').value.trim();

  if (!name)     { toast('Please enter your name', true); return; }
  if (!phone)    { toast('Please enter your WhatsApp number', true); return; }
  if (!location) { toast('Please enter your pickup location', true); return; }
  if (!receiptFile) { toast('Please upload your payment receipt', true); return; }

  const btn = document.getElementById('btn-submit');
  btn.disabled    = true;
  btn.textContent = 'Placing order...';

  const isGift = document.getElementById('gift-check').checked;
  const ref    = genRef();

  const order = {
    ref,
    name,
    phone,
    location,
    campus:  selectedCampus,
    flavour: selectedFlavour,
    items:   Object.entries(cart)
               .filter(([, v]) => v.qty > 0)
               .map(([id, v]) => ({ id, qty: v.qty, price: v.price, sizeLabel: v.sizeLabel })),
    total:   cartTotal(),
    notes:   document.getElementById('cust-notes').value,
    gift:    isGift
               ? { recipient: document.getElementById('recipient-name').value, note: document.getElementById('gift-note').value }
               : null,
    status:  'pending',
    time:    new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
    date:    new Date().toLocaleDateString('en-NG'),
  };

  orders.unshift(order);
  saveOrders();
  await syncToSheet(order);

  document.getElementById('success-ref').textContent = ref;
  btn.disabled    = false;
  btn.textContent = 'Place order';
  goStep(3);
}

// ── WhatsApp ──────────────────────────────────────────────────────────
function openWhatsApp() {
  const ref = document.getElementById('success-ref').textContent;
  const msg = encodeURIComponent(`Hi Splendid Puff! 🧡 I just placed order *${ref}*. Please confirm receipt. Thank you!`);
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

// ── Reset order ───────────────────────────────────────────────────────
function resetOrder() {
  cart          = {};
  receiptFile   = null;
  receiptBase64 = null;
  selectedFlavour = CONFIG.FLAVOURS[0];
  selectedCampus  = CONFIG.CAMPUSES[0];

  document.getElementById('gift-check').checked  = false;
  document.getElementById('gift-fields').style.display = 'none';
  document.getElementById('gift-card').classList.remove('on');
  document.getElementById('flavour-wrap').style.display = 'none';
  document.getElementById('upload-zone').classList.remove('has-file');
  document.getElementById('upload-filename').textContent = '';
  document.getElementById('cust-name').value = '';
  document.getElementById('cust-phone').value = '';
  document.getElementById('cust-location').value = '';
  document.getElementById('cust-notes').value = '';

  buildProducts();
  buildFlavours();
  goStep(1);
}

// ── Track order ───────────────────────────────────────────────────────
function trackOrder() {
  const ref = document.getElementById('track-input').value.trim().toUpperCase();
  const el  = document.getElementById('track-result');
  if (!ref) { el.innerHTML = ''; return; }
  const order = orders.find(o => o.ref === ref);
  if (!order) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div>No order found for <strong>${ref}</strong>.<br>Double-check your reference.</div>`;
    return;
  }
  const steps = [
    { key: 'pending',   label: 'Order received',     sub: 'Awaiting our confirmation'   },
    { key: 'confirmed', label: 'Confirmed',           sub: 'We\'re preparing your order' },
    { key: 'ready',     label: 'Ready for pickup',   sub: `Head to ${order.location}`   },
    { key: 'completed', label: 'Completed',           sub: 'Enjoy your puff-puff! 🧡'   },
  ];
  const currentIdx = steps.findIndex(s => s.key === order.status);
  el.innerHTML = `
    <div class="track-card">
      <div class="track-card-header">
        <div class="track-name">${order.name}</div>
        <div class="track-ref-sm">${order.ref} · ${order.campus} · ${order.date}</div>
      </div>
      <div class="track-card-body">
        <div class="status-stepper">
          ${steps.map((s, i) => `
            <div class="step-row ${i <= currentIdx ? 'done' : ''}">
              <div class="step-dot ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}">
                ${i < currentIdx ? '✓' : i + 1}
              </div>
              <div>
                <div class="step-text-label">${s.label}</div>
                <div class="step-text-sub">${i === currentIdx ? s.sub : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

// ── Admin ─────────────────────────────────────────────────────────────
function checkAdminPin() {
  const pin = document.getElementById('admin-pin-input').value;
  if (pin === CONFIG.ADMIN_PIN) {
    adminUnlocked = true;
    document.getElementById('admin-lock-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    refreshAdmin();
  } else {
    toast('Incorrect PIN', true);
    document.getElementById('admin-pin-input').value = '';
  }
}

function refreshAdmin() {
  if (!adminUnlocked) return;
  loadOrders();
  updateStats();
  renderOrders();
}

function updateStats() {
  document.getElementById('stat-total').textContent   = orders.length;
  document.getElementById('stat-pending').textContent = orders.filter(o => o.status === 'pending').length;
  document.getElementById('stat-revenue').textContent =
    formatNaira(orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0));
}

function filterOrders(status, el) {
  currentFilter = status;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderOrders();
}

function renderOrders() {
  const list     = document.getElementById('orders-list');
  const filtered = currentFilter === 'all' ? orders : orders.filter(o => o.status === currentFilter);
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📭</div>No orders here yet</div>`;
    return;
  }
  const pillMap  = { pending: 'pill-pending', confirmed: 'pill-confirmed', ready: 'pill-ready', completed: 'pill-completed' };
  const nextMap  = { pending: 'confirmed', confirmed: 'ready', ready: 'completed' };
  const nextLbl  = { pending: '✅ Confirm', confirmed: '🍩 Mark ready', ready: '🎉 Complete' };

  list.innerHTML = filtered.map(o => `
    <div class="order-card ${o.status}">
      <div class="order-top">
        <div>
          <div class="order-name">${o.name}</div>
          <div class="order-meta-sm">${o.ref} · ${o.campus} · ${o.time}</div>
        </div>
        <span class="status-pill ${pillMap[o.status]}">${o.status}</span>
      </div>
      ${o.gift ? `<div class="gift-badge">🎁 Gift for ${o.gift.recipient}${o.gift.note ? ': "' + o.gift.note + '"' : ''}</div>` : ''}
      <div class="order-items">
        ${o.items.map(i => `${getProductEmoji(i.id)} ${getProductName(i.id)} ×${i.qty}`).join(' · ')}
        ${o.flavour ? ' · ' + o.flavour : ''} · ${formatNaira(o.total)}
      </div>
      <div style="font-size:12px;color:var(--gray-400);margin-bottom:10px">📍 ${o.location}${o.notes ? ' · 📝 ' + o.notes : ''}</div>
      <div class="order-actions">
        ${nextMap[o.status] ? `<div class="action-chip primary" onclick="advanceStatus('${o.ref}')">${nextLbl[o.status]}</div>` : ''}
        <div class="action-chip" onclick="notifyCustomer('${o.ref}')">💬 Notify</div>
        <div class="action-chip" onclick="callCustomer('${o.ref}')">📞 Call</div>
      </div>
    </div>
  `).join('');
}

function advanceStatus(ref) {
  const nextMap = { pending: 'confirmed', confirmed: 'ready', ready: 'completed' };
  const order   = orders.find(o => o.ref === ref);
  if (!order || !nextMap[order.status]) return;
  order.status = nextMap[order.status];
  saveOrders();
  updateStatusInSheet(ref, order.status);
  updateStats();
  renderOrders();
  toast(`Order ${ref} marked as ${order.status} ✅`);
}

function notifyCustomer(ref) {
  const order = orders.find(o => o.ref === ref);
  if (!order) return;
  const msgs = {
    pending:   `Hi ${order.name}! Your Splendid Puff order *${ref}* has been confirmed ✅ We're preparing it now. 🍩`,
    confirmed: `Hi ${order.name}! Your order *${ref}* is being prepared right now 🍩 We'll let you know when it's ready!`,
    ready:     `Hi ${order.name}! Your Splendid Puff order *${ref}* is READY 🎉 Come pick it up at ${order.location}!`,
    completed: `Thank you ${order.name}! Your Splendid Puff order *${ref}* is complete. Hope you enjoy it! 🧡`,
  };
  const msg = encodeURIComponent(msgs[order.status] || `Update on your Splendid Puff order *${ref}*.`);
  window.open(`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

function callCustomer(ref) {
  const order = orders.find(o => o.ref === ref);
  if (!order) return;
  window.open(`tel:${order.phone.replace(/\D/g, '')}`);
}

// ── Boot ──────────────────────────────────────────────────────────────
init();
