# Splendid Puff — Campus Ordering System

Mobile-first ordering app for Splendid Puff Nigeria. Built for Minna and Zaria campuses.

## Features

- **Customer ordering** — select products, sizes, campus, flavour
- **Anonymous gifting** — send puff-puff to someone with a secret note
- **Bank transfer payment** — customer uploads receipt screenshot
- **Order tracking** — live status via order reference
- **Admin panel** — PIN-protected, advance order status, tap to send WhatsApp updates
- **Google Sheets sync** — all orders saved to a central spreadsheet (optional)

## Setup

### 1. Update config.js

Open `config.js` and fill in:

| Setting | Description |
|---|---|
| `WHATSAPP_NUMBER` | Your number in international format e.g. `2348012345678` |
| `BANK_ACCOUNT_NUMBER` | Your bank account number |
| `BANK_NAME` | Your bank name |
| `BANK_ACCOUNT_HOLDER` | Account holder name |
| `ADMIN_PIN` | Your chosen 4–6 digit PIN |
| `SHEET_WEBHOOK_URL` | Apps Script deployment URL (see below) |

### 2. Google Sheets backend (optional but recommended)

1. Go to [script.google.com](https://script.google.com) and create a new project
2. Paste the contents of `google-apps-script.js` into the editor
3. Click **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment URL
5. Paste it into `config.js` as `SHEET_WEBHOOK_URL`

Orders will now save to your Google Sheet automatically. The sheet gets two tabs:
- **Orders** — one row per order with colour-coded status
- **Dashboard** — live summary stats

### 3. Deploy

Upload the four files to any static host:
- [GitHub Pages](https://pages.github.com) (free)
- [Netlify](https://netlify.com) (free)
- Any web hosting

## Files

| File | Purpose |
|---|---|
| `index.html` | App structure and markup |
| `style.css` | All styling (Splendid Puff brand colours) |
| `config.js` | Business settings — edit this |
| `app.js` | Application logic |
| `google-apps-script.js` | Paste into Google Apps Script for sheet sync |

## Admin Panel

- Navigate to the **Admin** tab
- Enter your PIN (default: `1234` — change in config.js)
- See all orders with status pipeline: `Pending → Confirmed → Ready → Completed`
- Tap **Notify** to send a pre-written WhatsApp message to the customer
- Tap **Call** to dial the customer directly

## Offline mode

If `SHEET_WEBHOOK_URL` is left empty, orders are saved to browser localStorage on the device used. This is fine for single-device use (your phone). For multi-device access, connect Google Sheets.

---

Built for Splendid Puff Nigeria 🧡 Instagram: [@splendidpuff](https://instagram.com/splendidpuff)
