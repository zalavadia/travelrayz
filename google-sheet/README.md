# TRAVELRAYZ Google Sheets CMS — Setup Guide

This folder contains the Google Apps Script backend that powers trip management for the TRAVELRAYZ website and admin panel.

## Overview

| Component | Purpose |
|-----------|---------|
| `Code.gs` | Apps Script Web App — CRUD API for the Trips sheet |
| `sample-trips.csv` | Sample row to import into your sheet |

The admin panel (`/admin/`) and public site read trips via `SheetsAPI` in `assets/js/sheets.js`.

---

## Step 1 — Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Name it **TRAVELRAYZ Trips** (or any name you prefer).
3. Rename the first tab to **Trips** (must match exactly).

## Step 2 — Import sample data (optional)

1. Open `sample-trips.csv` from this folder.
2. In Google Sheets: **File → Import → Upload** and select the CSV.
3. Choose **Replace current sheet** or paste into the Trips tab starting at row 1.

If importing manually, ensure row 1 contains these exact headers:

```
Trip Name, Poster, Destination, Category, Description, Duration, Travel Date, Price, Seats, Difficulty, Vehicle, Inclusions, Exclusions, Pickup Points, Itinerary, Booking Link, Trending, Featured, Status, Limited Seats
```

> The Apps Script will auto-create headers if row 1 is empty, but importing the CSV is faster.

## Step 3 — Add the Apps Script

1. In your spreadsheet: **Extensions → Apps Script**.
2. Delete any default code in `Code.gs`.
3. Copy the entire contents of `google-sheet/Code.gs` from this repo and paste it.
4. Click **Save** (💾). Name the project **TRAVELRAYZ CMS**.

## Step 4 — Deploy as Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon ⚙ next to "Select type" → choose **Web app**.
3. Configure:
   - **Description:** TRAVELRAYZ Trips API
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Authorize the script when prompted (Google will show a security warning — click Advanced → Go to TRAVELRAYZ CMS → Allow).
6. Copy the **Web app URL** (ends in `/exec`).

## Step 5 — Connect to the website

1. Open `assets/js/config.js` in this project.
2. Replace the placeholder:

```javascript
sheetsApiUrl: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',
```

with your deployed URL:

```javascript
sheetsApiUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
```

3. Save and refresh the site / admin panel.

## Step 6 — Verify

1. Open `/admin/index.html` and log in (default password: `travelrayz2026`).
2. The Trips panel should load data from your sheet.
3. Try adding a test trip — it should appear in the Google Sheet within a few seconds.

---

## API Reference

### GET — Fetch trips

```
GET {sheetsApiUrl}?action=getTrips
GET {sheetsApiUrl}?action=getTrips&all=1   ← includes inactive (admin)
```

Returns a JSON array of trip objects keyed by column header names, plus `id` (sheet row number).

### POST — Modify trips

Send `Content-Type: text/plain;charset=utf-8` with a JSON body:

**Add trip:**
```json
{ "action": "addTrip", "trip": { "tripName": "...", "destination": "...", ... } }
```

**Update trip:**
```json
{ "action": "updateTrip", "trip": { "id": "2", "tripName": "Updated name", ... } }
```

**Delete trip:**
```json
{ "action": "deleteTrip", "trip": { "id": "2" } }
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Admin shows fallback trips + warning | `sheetsApiUrl` not set or still has placeholder text |
| Saves fail with CORS error | Redeploy Web App; ensure POST uses `text/plain` content type (already handled in `sheets.js`) |
| Empty trips after deploy | Check sheet tab is named **Trips** and has data from row 2 onward |
| "Authorization required" | Redeploy with **Anyone** access; re-authorize the script |
| Changes not reflected | Apps Script caches deployments — create a **New deployment** version after code changes |

---

## Security notes

- The Web App is public (Anyone). Trip data is not secret, but anyone with the URL can read/write if they know the API shape.
- Admin password is client-side only — suitable for a simple gate, not high-security environments.
- Change the default admin password in Settings before going live.
