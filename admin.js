/**
 * Splendid Puff — Admin Logic (admin.html)
 */

let orders        = [];
let currentFilter = 'all';
let adminUnlocked = false;

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  // Auto-focus PIN input
  document.getElementById('pin-input').focus();
  // Allow Enter key
  document.getElementById('pin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPin();
  });
});

// ── Helpers ────────────────────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => el.className = 'toast', 3000);
}

function formatNaira(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
function getProductName(id) { return CONFIG.PRODUCTS.find(p => p.id === id)?.name || id; }
function getProductEmoji(id) { return CONFIG.PRODUCTS.find(p => p.id === id)?.emoji || ''; }

// ── Persistence ────────────────────────────────────────────────────────
function loadOrders() {
  try { orders = JSON.parse(localStorage.getItem('sp_orders_v2') || '[]'); } catch(e) { orders = []; }
}
function saveOrders() {
  try { localStorage.setItem('sp_orders_v2', JSON.stringify(orders)); } catch(e) {}
}

// ── PIN / Auth ────────────────────────────────────────────────────────
function checkPin() {
  const pin = document.getElementById('pin-input').value;
  if (pin === CONFIG.ADMIN_PIN) {
    adminUnlocked = true;
    document.getElementById('lock-screen').style.display  = 'none';
    document.getElementById('admin-panel').style.display  = 'block';
    refreshAdmin();
  } else {
    const input = document.getElementById('pin-input');
    input.classList.add('shake');
    input.value = '';
    setTimeout(() => input.classList.remove('shake'), 400);
    toast('Incorrect PIN', true);
  }
}

function logout() {
  adminUnlocked = false;
  document.getElementById('admin-panel').style.display  = 'none';
  document.getElementById('lock-screen').style.display  = 'flex';
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-input').focus();
}

// ── Refresh ───────────────────────────────────────────────────────────
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

// ── Filter ────────────────────────────────────────────────────────────
function filterOrders(status, el) {
  currentFilter = status;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderOrders();
}

// ── Render orders ─────────────────────────────────────────────────────
function renderOrders() {
  const list     = document.getElementById('orders-list');
  const filtered = currentFilter === 'all' ? orders : orders.filter(o => o.status === currentFilter);

  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📭</div>No orders here yet</div>`;
    return;
  }

  const pillMap = { pending:'pill-pending', confirmed:'pill-confirmed', ready:'pill-ready', completed:'pill-completed' };
  const nextMap = { pending:'confirmed', confirmed:'ready', ready:'completed' };
  const nextLbl = { pending:'✅ Confirm', confirmed:'🍩 Mark ready', ready:'🎉 Complete' };

  list.innerHTML = filtered.map(o => {
    const isGift = o.orderType === 'gift';
    const itemStr = o.items.map(i => `${getProductEmoji(i.id)} ${getProductName(i.id)} ×${i.qty}`).join(' · ');

    // Build detail grid rows
    let details = '';
    if (isGift) {
      details += `
        <div class="detail-key">Sender</div><div class="detail-val">Anonymous (${o.phone})</div>
        <div class="detail-key">Recipient</div><div class="detail-val">${o.gift?.recipient || '—'}${o.gift?.recipientPhone ? ' · ' + o.gift.recipientPhone : ''}</div>
        <div class="detail-key">Gift note</div><div class="detail-val">${o.gift?.note || '(none)'}</div>
      `;
    } else {
      details += `
        <div class="detail-key">Customer</div><div class="detail-val">${o.name}</div>
        <div class="detail-key">WhatsApp</div><div class="detail-val">${o.phone}</div>
      `;
    }
    details += `
      <div class="detail-key">Pickup</div><div class="detail-val">${o.location}</div>
      <div class="detail-key">Campus</div><div class="detail-val">${o.campus}</div>
      <div class="detail-key">Items</div><div class="detail-val">${itemStr}${o.flavour ? ' · ' + o.flavour : ''}</div>
      <div class="detail-key">Total</div><div class="detail-val">${formatNaira(o.total)}</div>
      ${o.notes ? `<div class="detail-key">Notes</div><div class="detail-val">${o.notes}</div>` : ''}
      <div class="detail-key">Time</div><div class="detail-val">${o.date} ${o.time}</div>
    `;

    return `
      <div class="order-card ${o.status}" id="oc-${o.ref}" onclick="toggleExpand('${o.ref}')">
        <div class="order-top">
          <div>
            ${isGift
              ? `<div class="anon-badge">🕵️ Anonymous gift</div>`
              : ''}
            <div class="order-name">${isGift ? `🎁 For: ${o.gift?.recipient || '?'}` : o.name}</div>
            <div class="order-meta-sm">${o.ref} · ${o.campus} · ${o.time}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="status-pill ${pillMap[o.status]}">${o.status}</span>
            <span class="expand-icon">▼</span>
          </div>
        </div>

        <div class="order-items">${itemStr}${o.flavour ? ' · ' + o.flavour : ''} · ${formatNaira(o.total)}</div>

        <!-- Expandable detail -->
        <div class="order-detail-row" id="detail-${o.ref}">
          <div class="detail-grid">${details}</div>
        </div>

        <div class="order-actions" onclick="event.stopPropagation()">
          ${nextMap[o.status] ? `<div class="action-chip primary" onclick="advanceStatus('${o.ref}')">${nextLbl[o.status]}</div>` : ''}
          <div class="action-chip" onclick="notifyCustomer('${o.ref}')">💬 Notify</div>
          <div class="action-chip" onclick="callCustomer('${o.ref}')">📞 Call</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Expand/collapse order detail ──────────────────────────────────────
function toggleExpand(ref) {
  const card   = document.getElementById('oc-' + ref);
  const detail = document.getElementById('detail-' + ref);
  const isOpen = card.classList.contains('expanded');
  // Close all
  document.querySelectorAll('.order-card.expanded').forEach(c => {
    c.classList.remove('expanded');
    c.querySelector('.order-detail-row')?.classList.remove('open');
  });
  if (!isOpen) {
    card.classList.add('expanded');
    detail.classList.add('open');
  }
}

// ── Advance status ────────────────────────────────────────────────────
function advanceStatus(ref) {
  const next  = { pending:'confirmed', confirmed:'ready', ready:'completed' };
  const order = orders.find(o => o.ref === ref);
  if (!order || !next[order.status]) return;
  order.status = next[order.status];
  saveOrders();
  updateStatusInSheet(ref, order.status);
  updateStats();
  renderOrders();
  toast(`${ref} → ${order.status} ✅`);
}

// ── Notify via WhatsApp ───────────────────────────────────────────────
function notifyCustomer(ref) {
  const o = orders.find(o => o.ref === ref);
  if (!o) return;

  const isGift     = o.orderType === 'gift';
  const senderNum  = o.phone;
  const recipientNum = o.gift?.recipientPhone;

  // Messages to sender
  const senderMsgs = {
    pending:   `Hi! Your anonymous gift order *${ref}* has been confirmed ✅ We're preparing it now 🍩`,
    confirmed: `Hi! Your anonymous gift order *${ref}* is being prepared 🍩`,
    ready:     `Hi! Your anonymous gift order *${ref}* is on the way to the recipient 🎁`,
    completed: `Hi! Your anonymous gift *${ref}* has been delivered successfully 🧡`,
  };

  // Messages to recipient (gift only, with recipient's number)
  const recipientMsgs = {
    ready:     `Hi ${o.gift?.recipient}! 🎁 Someone has sent you an anonymous Splendid Puff surprise! We're delivering to ${o.location} now 🍩🧡`,
    completed: `Hi ${o.gift?.recipient}! We hope you enjoyed your Splendid Puff surprise 🍩🧡`,
  };

  // Normal order messages
  const normalMsgs = {
    pending:   `Hi ${o.name}! Your Splendid Puff order *${ref}* is confirmed ✅ We're preparing it now.`,
    confirmed: `Hi ${o.name}! Your order *${ref}* is being prepared 🍩`,
    ready:     `Hi ${o.name}! Your order *${ref}* is ready 🎉 Come pick it up at ${o.location}!`,
    completed: `Thank you ${o.name}! Your order *${ref}* is complete. Enjoy! 🧡`,
  };

  if (isGift) {
    // Notify sender
    const msg = encodeURIComponent(senderMsgs[o.status] || `Update on gift order *${ref}*.`);
    window.open(`https://wa.me/${senderNum.replace(/\D/g,'')}?text=${msg}`, '_blank');

    // If ready/completed and recipient has a number, offer to notify them too
    if (recipientNum && (o.status === 'ready' || o.status === 'completed')) {
      setTimeout(() => {
        if (confirm(`Also notify the recipient (${o.gift.recipient}) on WhatsApp?`)) {
          const rmsg = encodeURIComponent(recipientMsgs[o.status] || '');
          window.open(`https://wa.me/${recipientNum.replace(/\D/g,'')}?text=${rmsg}`, '_blank');
        }
      }, 500);
    }
  } else {
    const msg = encodeURIComponent(normalMsgs[o.status] || `Update on order *${ref}*.`);
    window.open(`https://wa.me/${o.phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
  }
}

function callCustomer(ref) {
  const o = orders.find(o => o.ref === ref);
  if (!o) return;
  window.open(`tel:${o.phone.replace(/\D/g, '')}`);
}

// ── Sheet sync ────────────────────────────────────────────────────────
async function updateStatusInSheet(ref, status) {
  if (!CONFIG.SHEET_WEBHOOK_URL) return;
  try {
    await fetch(CONFIG.SHEET_WEBHOOK_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateStatus', ref, status }),
    });
  } catch(e) {}
}
