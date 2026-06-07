/**
 * ════════════════════════════════════════════════════════════════
 *  SPLENDID PUFF — Google Apps Script (Backend) v2
 *
 *  SETUP STEPS:
 *  1. Paste this into your Apps Script project (script.google.com)
 *  2. Set SPREADSHEET_ID below (see instructions)
 *  3. Run setupSheets() once manually to create the tabs
 *  4. Deploy as Web App (Execute as: Me, Access: Anyone)
 *  5. Paste the deployment URL into config.js → SHEET_WEBHOOK_URL
 * ════════════════════════════════════════════════════════════════
 *
 *  HOW TO FIND YOUR SPREADSHEET ID:
 *  Open your "ORDERING SYSTEM" Google Sheet.
 *  The URL looks like:
 *  https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 *  Copy the long string between /d/ and /edit — that's your ID.
 */
 
// ── ⚠️  SET THIS TO YOUR SPREADSHEET ID ──────────────────────────────
const SPREADSHEET_ID = "1lK1rWDMZiWcQysZ0WoE-3JuOWp7cX8O90-B5kZqQMP8";
// ─────────────────────────────────────────────────────────────────────
 
const SHEET_NAME_ORDERS    = "Orders";
const SHEET_NAME_DASHBOARD = "Dashboard";
 
// ── Get spreadsheet (works from Web App context) ───────────────────────
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
 
// ── doGet: health check (visit the URL in browser to test) ────────────
function doGet(e) {
  try {
    const ss    = getSpreadsheet();
    const count = (ss.getSheetByName(SHEET_NAME_ORDERS)?.getLastRow() || 1) - 1;
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        message: "Splendid Puff backend is live 🧡",
        spreadsheet: ss.getName(),
        orderCount: count
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
 
// ── doPost: receives orders and status updates ─────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
 
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
 
    if (data.action === "addOrder") {
      result = addOrder(data);
    } else if (data.action === "updateStatus") {
      result = updateOrderStatus(data.ref, data.status);
    } else {
      result = { ok: false, error: "Unknown action: " + data.action };
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
 
// ── Add a new order row ────────────────────────────────────────────────
function addOrder(data) {
  const ss    = getSpreadsheet();
  const sheet = getOrCreateOrdersSheet(ss);
 
  sheet.appendRow([
    data.ref        || "",
    data.date       || "",
    data.time       || "",
    data.name       || "",
    data.phone      || "",
    data.campus     || "",
    data.location   || "",
    data.items      || "",
    data.flavour    || "",
    Number(data.total) || 0,
    data.notes      || "",
    data.gift       || "",
    "pending",
    data.receipt ? "Uploaded" : "None",
  ]);
 
  updateDashboard(ss);
  return { ok: true, ref: data.ref };
}
 
// ── Update order status ────────────────────────────────────────────────
function updateOrderStatus(ref, status) {
  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return { ok: false, error: "Orders sheet not found" };
 
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === ref) {
      sheet.getRange(i + 1, 13).setValue(status);
      const colours = {
        pending:   "#FEF4E0",
        confirmed: "#F5EDE7",
        ready:     "#E8F5EE",
        completed: "#F0EDE9"
      };
      sheet.getRange(i + 1, 1, 1, 14).setBackground(colours[status] || "#FFFFFF");
      updateDashboard(ss);
      return { ok: true, ref, status };
    }
  }
  return { ok: false, error: "Order ref not found: " + ref };
}
 
// ── Create/verify Orders sheet with headers ────────────────────────────
function getOrCreateOrdersSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_ORDERS);
  }
  if (sheet.getLastRow() === 0) {
    writeOrderHeaders(sheet);
  }
  return sheet;
}
 
function writeOrderHeaders(sheet) {
  const headers = [
    "Ref", "Date", "Time", "Name", "WhatsApp", "Campus",
    "Pickup Location", "Items", "Flavour", "Total (₦)",
    "Notes", "Gift", "Status", "Receipt"
  ];
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#BC4600")
    .setFontColor("#FFFFFF")
    .setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 80);   // Ref
  sheet.setColumnWidth(4, 140);  // Name
  sheet.setColumnWidth(5, 120);  // WhatsApp
  sheet.setColumnWidth(7, 180);  // Location
  sheet.setColumnWidth(8, 260);  // Items
  sheet.setColumnWidth(11, 160); // Notes
  sheet.setColumnWidth(12, 200); // Gift
}
 
// ── Dashboard sheet ────────────────────────────────────────────────────
function updateDashboard(ss) {
  const ordersSheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!ordersSheet) return;
 
  let dash = ss.getSheetByName(SHEET_NAME_DASHBOARD);
  if (!dash) dash = ss.insertSheet(SHEET_NAME_DASHBOARD);
  dash.clearContents().clearFormats();
 
  const rows = ordersSheet.getLastRow() > 1
    ? ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, 14).getValues()
    : [];
 
  const counts   = { pending: 0, confirmed: 0, ready: 0, completed: 0 };
  let   revenue  = 0;
  let   todayRev = 0;
  const today    = new Date().toLocaleDateString("en-NG");
 
  rows.forEach(row => {
    const status = String(row[12]).toLowerCase();
    if (counts.hasOwnProperty(status)) counts[status]++;
    const total  = Number(row[9]) || 0;
    if (status === "completed") revenue += total;
    if (String(row[1]) === today && status !== "completed") todayRev += total;
  });
 
  const tableData = [
    ["Splendid Puff — Order Dashboard", ""],
    ["Last updated", new Date().toLocaleString("en-NG")],
    ["", ""],
    ["ORDERS", "COUNT"],
    ["Total orders", rows.length],
    ["⏳ Pending", counts.pending],
    ["✅ Confirmed", counts.confirmed],
    ["🍩 Ready", counts.ready],
    ["🎉 Completed", counts.completed],
    ["", ""],
    ["REVENUE", "₦ AMOUNT"],
    ["Completed revenue", revenue],
    ["Today pipeline value", todayRev],
  ];
 
  dash.getRange(1, 1, tableData.length, 2).setValues(tableData);
 
  // Styling
  dash.getRange("A1:B1").merge()
    .setBackground("#BC4600").setFontColor("#FFFFFF")
    .setFontWeight("bold").setFontSize(14).setHorizontalAlignment("center");
  dash.getRange("A2:B2").setFontColor("#888888").setFontSize(10);
  dash.getRange("A4:B4").setFontWeight("bold").setBackground("#f0ede9");
  dash.getRange("A11:B11").setFontWeight("bold").setBackground("#f0ede9");
  dash.getRange("B5:B9").setNumberFormat("#,##0");
  dash.getRange("B12:B13").setNumberFormat("₦#,##0");
  dash.autoResizeColumns(1, 2);
  dash.setColumnWidth(1, 200);
}
 
// ── Run this ONCE manually to set up both sheets ───────────────────────
function setupSheets() {
  const ss = getSpreadsheet();
  getOrCreateOrdersSheet(ss);
  updateDashboard(ss);
  Logger.log("✅ Done! Orders and Dashboard tabs created.");
}
 
// ── Test function: run from the Apps Script editor ─────────────────────
function testAddOrder() {
  const result = addOrder({
    ref:      "SP-TEST",
    date:     new Date().toLocaleDateString("en-NG"),
    time:     new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
    name:     "Test Customer",
    phone:    "08012345678",
    campus:   "Minna",
    location: "Faculty of Science, Block A",
    items:    "🍩 Puff-Puff x2 (Medium 10 pcs) | 🥤 Zobo x1 (Large 50cl)",
    flavour:  "Classic",
    total:    1400,
    notes:    "No pepper",
    gift:     "",
    receipt:  ""
  });
  Logger.log(JSON.stringify(result));
}
 