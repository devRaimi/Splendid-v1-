/**
 * Splendid Puff — Customer App Logic (index.html)
 */

// ── State ──────────────────────────────────────────────────────────────
let cart          = {};
let orderType     = 'normal';   // 'normal' | 'gift'
let selectedFlavour = CONFIG.FLAVOURS[0];
let selectedCampus  = CONFIG.CAMPUSES[0];
let receiptFile     = null;
let receiptBase64   = null;
let orders          = [];

// ── Boot ──────────────────────────────────────────────────────────────
function init() {
  loadOrders();
  buildProducts();
  buildFlavourTags();
  buildCampusTags();
  populateBankDetails();
}

// ── Helpers ────────────────────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => el.className = 'toast', 3000);
}

function formatNaira(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
function cartTotal()    { return Object.values(cart).reduce((s, i) => s + (i.qty * i.price), 0); }
function getProduct(id) { return CONFIG.PRODUCTS.find(p => p.id === id); }
function genRef()       { return 'SP-' + String(orders.length + 1).padStart(4, '0'); }

// ── Persistence ────────────────────────────────────────────────────────
function loadOrders() {
  try { orders = JSON.parse(localStorage.getItem('sp_orders_v2') || '[]'); } catch(e) { orders = []; }
}
function saveOrders() {
  try { localStorage.setItem('sp_orders_v2', JSON.stringify(orders)); } catch(e) {}
}

// ── Order type ─────────────────────────────────────────────────────────
function setOrderType(type) {
  orderType = type;
  document.getElementById('type-normal').classList.toggle('selected', type === 'normal');
  document.getElementById('type-gift').classList.toggle('selected', type === 'gift');
  document.getElementById('gift-notice').style.display = type === 'gift' ? 'flex' : 'none';
}

// ── Products ──────────────────────────────────────────────────────────
function buildProducts() {
  document.getElementById('product-grid').innerHTML = CONFIG.PRODUCTS.map(p => `
    <div class="product-card" id="card-${p.id}">
      <div class="product-emoji">${p.emoji}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-hint">From ${formatNaira(p.sizes[0].price)}</div>
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
  const label = sel.options[sel.selectedIndex]?.dataset.label || '';
  if (!cart[id]) cart[id] = { qty: 0, price: 0, sizeLabel: '' };
  cart[id].price     = price;
  cart[id].sizeLabel = label.split('—')[0].trim();
  if (price && cart[id].qty === 0) cart[id].qty = 1;
  if (!price) cart[id].qty = 0;
  document.getElementById('qty-' + id).textContent = cart[id].qty;
  document.getElementById('card-' + id).classList.toggle('has-item', price > 0 && cart[id].qty > 0);
  checkFlavourVisibility();
}

function changeQty(id, delta) {
  if (!cart[id] || !cart[id].price) { toast('Choose a size first 👆'); return; }
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
function buildFlavourTags() {
  document.getElementById('flavour-tags').innerHTML = CONFIG.FLAVOURS.map((f, i) =>
    `<span class="tag ${i === 0 ? 'selected' : ''}" onclick="pickFlavour(this,'${f}')">${f}</span>`
  ).join('');
}

function buildCampusTags() {
  document.getElementById('campus-tags').innerHTML = CONFIG.CAMPUSES.map((c, i) =>
    `<span class="tag ${i === 0 ? 'selected' : ''}" onclick="pickCampus(this,'${c}')">${c}</span>`
  ).join('');
}

function pickFlavour(el, val) {
  document.querySelectorAll('#flavour-tags .tag').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected'); selectedFlavour = val;
}

function pickCampus(el, val) {
  document.querySelectorAll('#campus-tags .tag').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected'); selectedCampus = val;
}

// ── Bank details ───────────────────────────────────────────────────────
function populateBankDetails() {
  document.getElementById('bank-acct-display').textContent  = CONFIG.BANK_ACCOUNT_NUMBER;
  document.getElementById('bank-name-display').innerHTML    = `<strong>Bank:</strong> ${CONFIG.BANK_NAME}`;
  document.getElementById('bank-holder-display').innerHTML  = `<strong>Account name:</strong> ${CONFIG.BANK_ACCOUNT_HOLDER}`;
}

// ── Navigation ────────────────────────────────────────────────────────
function showTab(tab, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
}

function goStep(n) {
  if (n === 2) {
    if (cartTotal() === 0) { toast('Please select at least one item 🛍', true); return; }
    // Show correct fields for order type
    document.getElementById('normal-fields').style.display = orderType === 'normal' ? 'block' : 'none';
    document.getElementById('gift-fields').style.display   = orderType === 'gift'   ? 'block' : 'none';
    buildSummaryCard();
  }
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + n).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Summary ───────────────────────────────────────────────────────────
function buildSummaryCard() {
  const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
  document.getElementById('order-summary-card').innerHTML =
    items.map(([id, v]) => `
      <div class="summary-row">
        <div>
          <span>${getProduct(id).emoji} ${getProduct(id).name} × ${v.qty}</span>
          <div class="summary-row-label">${v.sizeLabel}${id === 'puff' ? ' · ' + selectedFlavour : ''}</div>
        </div>
        <span>${formatNaira(v.qty * v.price)}</span>
      </div>
    `).join('') +
    `<div class="summary-row total"><span>Total</span><span>${formatNaira(cartTotal())}</span></div>`;
}

// ── Upload ────────────────────────────────────────────────────────────
function handleUpload(input) {
  const file = input.files[0]; if (!file) return;
  receiptFile = file;
  document.getElementById('upload-filename').textContent = '✅ ' + file.name;
  document.getElementById('upload-zone').classList.add('has-file');
  const reader = new FileReader();
  reader.onload = e => { receiptBase64 = e.target.result; };
  reader.readAsDataURL(file);
}

// ── Submit ────────────────────────────────────────────────────────────
async function submitOrder() {
  if (!receiptFile) { toast('Please upload your payment receipt', true); return; }

  let name, phone, location, notes, gift = null;

  if (orderType === 'normal') {
    name     = document.getElementById('cust-name').value.trim();
    phone    = document.getElementById('cust-phone').value.trim();
    location = document.getElementById('cust-location').value.trim();
    notes    = document.getElementById('cust-notes').value.trim();
    if (!name)     { toast('Please enter your name', true); return; }
    if (!phone)    { toast('Please enter your WhatsApp number', true); return; }
    if (!location) { toast('Please enter your pickup location', true); return; }
  } else {
    // Anonymous gift
    phone    = document.getElementById('sender-phone').value.trim();
    const recipientName  = document.getElementById('recipient-name').value.trim();
    const recipientPhone = document.getElementById('recipient-phone').value.trim();
    location = document.getElementById('recipient-location').value.trim();
    const giftNote = document.getElementById('gift-note').value.trim();
    if (!phone)         { toast('Please enter your WhatsApp number', true); return; }
    if (!recipientName) { toast("Please enter the recipient's name", true); return; }
    if (!location)      { toast('Please enter the delivery location', true); return; }
    name  = 'Anonymous';
    notes = '';
    gift  = { recipient: recipientName, recipientPhone, note: giftNote };
  }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = 'Placing order...';

  const ref   = genRef();
  const order = {
    ref, name, phone, location, campus: selectedCampus,
    flavour: selectedFlavour,
    items: Object.entries(cart).filter(([,v]) => v.qty > 0)
      .map(([id, v]) => ({ id, qty: v.qty, price: v.price, sizeLabel: v.sizeLabel })),
    total: cartTotal(), notes,
    orderType,   // 'normal' | 'gift'
    gift,        // null for normal orders
    status: 'pending',
    time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('en-NG'),
  };

  orders.unshift(order);
  saveOrders();
  await syncToSheet(order);

  document.getElementById('success-ref').textContent = ref;
  if (orderType === 'gift') {
    document.getElementById('success-title').textContent = 'Gift sent! 🎁';
    document.getElementById('success-msg').textContent   = 'Your anonymous gift is on the way. We\'ll confirm on WhatsApp.';
  } else {
    document.getElementById('success-title').textContent = 'Order received! 🎉';
    document.getElementById('success-msg').textContent   = 'We\'ve got your order and will confirm on WhatsApp shortly.';
  }

  btn.disabled = false; btn.textContent = 'Place order';
  goStep(3);
}

// ── WhatsApp ──────────────────────────────────────────────────────────
function openWhatsApp() {
  const ref = document.getElementById('success-ref').textContent;
  const msg = orderType === 'gift'
    ? `Hi Splendid Puff! 🧡 I just sent an anonymous gift order *${ref}*. Please confirm receipt!`
    : `Hi Splendid Puff! 🧡 I just placed order *${ref}*. Please confirm receipt. Thank you!`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Track ─────────────────────────────────────────────────────────────
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
    { key: 'pending',   label: 'Order received',    sub: 'Awaiting confirmation'       },
    { key: 'confirmed', label: 'Confirmed',          sub: 'We\'re preparing your order' },
    { key: 'ready',     label: 'Ready for pickup',  sub: `Head to ${order.location}`   },
    { key: 'completed', label: 'Completed',          sub: 'Enjoy! 🧡'                  },
  ];
  const ci = steps.findIndex(s => s.key === order.status);
  const isGift = order.orderType === 'gift';

  el.innerHTML = `
    <div class="track-card">
      <div class="track-card-header">
        <div class="track-name">${isGift ? '🎁 Anonymous Gift' : order.name}</div>
        <div class="track-ref-sm">${order.ref} · ${order.campus} · ${order.date}</div>
      </div>
      <div class="track-card-body">
        <div class="status-stepper">
          ${steps.map((s, i) => `
            <div class="step-row ${i <= ci ? 'done' : ''}">
              <div class="step-dot ${i < ci ? 'done' : i === ci ? 'current' : ''}">${i < ci ? '✓' : i + 1}</div>
              <div>
                <div class="step-text-label">${s.label}</div>
                <div class="step-text-sub">${i === ci ? s.sub : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

// ── Reset ─────────────────────────────────────────────────────────────
function resetOrder() {
  cart = {}; receiptFile = null; receiptBase64 = null;
  orderType = 'normal';
  selectedFlavour = CONFIG.FLAVOURS[0];
  selectedCampus  = CONFIG.CAMPUSES[0];
  ['cust-name','cust-phone','cust-location','cust-notes',
   'sender-phone','recipient-name','recipient-phone','recipient-location','gift-note']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('gift-notice').style.display   = 'none';
  document.getElementById('flavour-wrap').style.display  = 'none';
  document.getElementById('upload-zone').classList.remove('has-file');
  document.getElementById('upload-filename').textContent = '';
  document.getElementById('type-normal').classList.add('selected');
  document.getElementById('type-gift').classList.remove('selected');
  buildProducts(); buildFlavourTags(); buildCampusTags();
  goStep(1);
}

// ── Google Sheets sync ────────────────────────────────────────────────
async function syncToSheet(order) {
  if (!CONFIG.SHEET_WEBHOOK_URL) return;
  try {
    const giftStr = order.gift
      ? `For: ${order.gift.recipient}${order.gift.recipientPhone ? ' ('+order.gift.recipientPhone+')' : ''}${order.gift.note ? ' | Note: '+order.gift.note : ''}`
      : '';
    await fetch(CONFIG.SHEET_WEBHOOK_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:   'addOrder',
        ref:      order.ref,
        date:     order.date,
        time:     order.time,
        name:     order.name,
        phone:    order.phone,
        campus:   order.campus,
        location: order.location,
        items:    order.items.map(i => `${getProduct(i.id).emoji} ${getProduct(i.id).name} x${i.qty} (${i.sizeLabel})`).join(' | '),
        flavour:  order.flavour || '',
        total:    order.total,
        notes:    order.notes || '',
        orderType: order.orderType,
        gift:     giftStr,
        receipt:  receiptBase64 || '',
        status:   order.status,
      }),
    });
  } catch(e) { console.warn('Sheet sync failed:', e); }
}

init();
