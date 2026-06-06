/**
 * ════════════════════════════════════════════════════════════════
 *  SPLENDID PUFF — Google Apps Script (Backend)
 *  Paste this entire file into https://script.google.com
 *  Then: Deploy → New Deployment → Web App
 *        Execute as: Me
 *        Who has access: Anyone
 *  Copy the deployment URL into config.js → SHEET_WEBHOOK_URL
 * ════════════════════════════════════════════════════════════════
 *
 *  This creates two sheets:
 *    📋 Orders     — one row per order
 *    📊 Dashboard  — live summary stats (auto-updated)
 */

// ── CONFIG ─────────────────────────────────────────────────────────────
const SHEET_NAME_ORDERS    = "Orders";
const SHEET_NAME_DASHBOARD = "Dashboard";

// ── Entry point ────────────────────────────────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    let result;

    if (data.action === "addOrder") {
      result = addOrder(data);
    } else if (data.action === "updateStatus") {
      result = updateStatus(data.ref, data.status);
    } else {
      result = { ok: false, error: "Unknown action" };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ── Add order ──────────────────────────────────────────────────────────
function addOrder(data) {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = getOrCreateSheet(ss, SHEET_NAME_ORDERS);

  // Write headers if sheet is new
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Ref", "Date", "Time", "Name", "WhatsApp", "Campus",
      "Pickup Location", "Items", "Flavour", "Total (₦)",
      "Notes", "Gift", "Status", "Receipt"
    ]);
    sheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#BC4600").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.ref,
    data.date,
    data.time,
    data.name,
    data.phone,
    data.campus,
    data.location,
    data.items,
    data.flavour || "",
    data.total,
    data.notes || "",
    data.gift || "",
    "pending",
    data.receipt ? "Uploaded" : "None",
  ]);

  updateDashboard(ss);
  return { ok: true, ref: data.ref };
}

// ── Update status ──────────────────────────────────────────────────────
function updateStatus(ref, status) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return { ok: false, error: "Orders sheet not found" };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === ref) {
      sheet.getRange(i + 1, 13).setValue(status); // Column M = Status
      // Colour-code the row by status
      const colours = { pending: "#FEF4E0", confirmed: "#F5EDE7", ready: "#E8F5EE", completed: "#F0EDE9" };
      sheet.getRange(i + 1, 1, 1, 14).setBackground(colours[status] || "#FFFFFF");
      updateDashboard(ss);
      return { ok: true };
    }
  }
  return { ok: false, error: "Ref not found" };
}

// ── Dashboard ──────────────────────────────────────────────────────────
function updateDashboard(ss) {
  const ordersSheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!ordersSheet) return;

  const dash = getOrCreateSheet(ss, SHEET_NAME_DASHBOARD);
  dash.clearContents();

  const data   = ordersSheet.getDataRange().getValues().slice(1); // skip header
  const total  = data.length;
  const statusCounts = { pending: 0, confirmed: 0, ready: 0, completed: 0 };
  let   revenue = 0;

  data.forEach(row => {
    const status = row[12];
    if (statusCounts.hasOwnProperty(status)) statusCounts[status]++;
    if (status === "completed") revenue += Number(row[9]) || 0;
  });

  dash.getRange("A1:B8").setValues([
    ["Splendid Puff — Dashboard", ""],
    ["Last updated", new Date().toLocaleString()],
    ["", ""],
    ["Total orders",     total],
    ["Pending",          statusCounts.pending],
    ["Confirmed",        statusCounts.confirmed],
    ["Ready",            statusCounts.ready],
    ["Completed revenue (₦)", revenue],
  ]);

  dash.getRange("A1:B1").merge().setFontWeight("bold").setBackground("#BC4600").setFontColor("#FFFFFF").setFontSize(14);
  dash.getRange("A4:A8").setFontWeight("bold");
  dash.autoResizeColumns(1, 2);
}

// ── Utility ────────────────────────────────────────────────────────────
function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ── Test from Apps Script editor ───────────────────────────────────────
function testAddOrder() {
  addOrder({
    ref: "SP-TEST", date: "06/06/2026", time: "12:00", name: "Test Customer",
    phone: "08012345678", campus: "Minna", location: "Faculty of Science",
    items: "🍩 Puff-Puff x2 (Medium 10 pcs)", flavour: "Classic",
    total: 1100, notes: "", gift: "", receipt: ""
  });
}
