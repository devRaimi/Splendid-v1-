/**
 * ┌─────────────────────────────────────────────────┐
 * │         SPLENDID PUFF — CONFIGURATION           │
 * │  Edit this file to update business settings.   │
 * └─────────────────────────────────────────────────┘
 *
 * GOOGLE SHEETS SETUP:
 * 1. Copy the Apps Script from google-apps-script.js into a new
 *    Apps Script project (script.google.com)
 * 2. Deploy it as a Web App (Execute as: Me, Access: Anyone)
 * 3. Paste the deployment URL below as SHEET_WEBHOOK_URL
 *
 * ADMIN PIN: Change ADMIN_PIN to your preferred 4–6 digit code.
 */

const CONFIG = {
  // ── Business info ─────────────────────────────────────────────
  BUSINESS_NAME: "Splendid Puff Nigeria",
  WHATSAPP_NUMBER: "2349040233239",   // International format, no +

  // ── Bank details ─────────────────────────────────────────────
  BANK_ACCOUNT_NUMBER: "8115781078",
  BANK_NAME: "Palmpay",
  BANK_ACCOUNT_HOLDER: "Splendid Puff",

  // ── Admin ────────────────────────────────────────────────────
  ADMIN_PIN: "1234",

  // ── Google Sheets webhook ────────────────────────────────────
  // Paste your Apps Script Web App deployment URL here.
  // Leave as empty string "" to use localStorage only (offline mode).
  SHEET_WEBHOOK_URL: "https://script.google.com/macros/library/d/1FkGdrAE3CEgSzSrDIZDiPYHh_SLTnIPXLD6MTspklBBit_9GSDX5y4nA/1",
  // SHEET_WEBHOOK_UR: 'https://script.google.com/macros/s/AKfycbwEg8xmkq-i1mKalJFv8ptD5xiYozj2RyYtKOzb8x56W0GrxUVA9k_G-_kHbHba7JcxMQ/exec',
  // SHEET_WEBHOOK_UR: '',

  // ── Products ─────────────────────────────────────────────────
  PRODUCTS: [
    {
      id: "puff",
      name: "Puff-Puff",
      emoji: "🍩",
      hasFlavour: true,
      sizes: [
        { label: "Small (5 pcs)", price: 300 },
        { label: "Medium (10 pcs)", price: 550 },
        { label: "Large (20 pcs)", price: 1000 },
      ]
    },
    {
      id: "zobo",
      name: "Zobo Drink",
      emoji: "🥤",
      hasFlavour: false,
      sizes: [
        { label: "Small (35cl)", price: 300 },
        { label: "Large (50cl)", price: 500 },
      ]
    },
    {
      id: "kebab",
      name: "Peppered Kebab",
      emoji: "🍢",
      hasFlavour: false,
      sizes: [
        { label: "2 sticks", price: 400 },
        { label: "4 sticks", price: 750 },
      ]
    }
  ],

  // ── Campuses ─────────────────────────────────────────────────
  CAMPUSES: ["Minna", "Zaria"],

  // ── Puff flavours ────────────────────────────────────────────
  FLAVOURS: ["Classic", "Coconut", "Cinnamon", "Spicy", "Mixed"],
};
