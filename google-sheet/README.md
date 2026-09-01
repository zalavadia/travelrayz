# TRAVELRAYZ Google Sheets CMS — Setup Guide

This folder contains the **Google Apps Script** backend that powers TRAVELRAYZ trips and contact inquiries. There is **no Node.js server** — the static site talks directly to the deployed Web App.

| File | Purpose |
|------|---------|
| `Code.gs` | Apps Script Web App — trips, inquiries, Drive uploads |
| `sample-trips.csv` | Example row for the **Trips** sheet |

Client code lives in `assets/js/sheets.js` (public + admin API) and `assets/js/config.js` (deployment URL + public config only).

---

## Architecture

```
Static site (HTML/JS)  ──GET/POST──►  Apps Script Web App  ──►  Google Sheet
                                              │
                                              └──►  Google Drive (trip images)
```

**Worksheets (required):**

1. **Trips** — full trip database (see column list below)
2. **Inquiries** — contact form submissions from the website

Optional sheets **Gallery** and **Testimonials** are auto-created if you use those admin panels.

---

## 1. Create the Google Sheet

1. Open [Google Sheets](https://sheets.google.com) → **Blank spreadsheet**.
2. Name it **TRAVELRAYZ** (or any name).
3. Rename the first tab to **Trips**.
4. Add a second tab named **Inquiries**.

### Trips columns (row 1 — exact header names)

```
id | slug | title | location | meetingPoint | category | startDate | endDate | duration | price | discountedPrice | seats | maxGroupSize | shortDescription | fullDescription | inclusions | exclusions | itinerary | importantNotes | image | driveFileId | whatsappNumber | featured | soldOut | status | createdAt | updatedAt
```

- Store **inclusions**, **exclusions**, and **itinerary** as **JSON arrays** in each cell, e.g.  
  `["Luxury travel","Pure veg meals","Trip leader"]`
- **status**: `published` (visible on site) or `draft` (admin only)
- Leave **id** empty for new rows — Apps Script generates UUIDs on create

### Inquiries columns (row 1)

```
id | name | email | phone | company | inquiryType | groupSize | destination | message | trip | source | createdAt | status
```

**inquiryType** values: `General Inquiry`, `Group Trip`, `Corporate Outing`, `Custom Trip`, `Collaboration`

### Import sample data (optional)

1. Open `sample-trips.csv` from this folder.
2. **File → Import → Upload** into the **Trips** tab (replace or append from row 2).

---

## 2. Open Apps Script

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete default code in `Code.gs`.
3. Paste the entire contents of `google-sheet/Code.gs` from this repo.
4. **Save** the project (name it **TRAVELRAYZ CMS**).

---

## 3. Set Script Properties

1. In Apps Script: **Project settings** (gear) → **Script properties**.
2. Add:

| Property | Required | Description |
|----------|----------|-------------|
| `ADMIN_SECRET` | **Yes** | Strong random secret for admin login (e.g. 32+ chars). **Never** put this in `config.js` or commit it to git. |
| `DRIVE_FOLDER_ID` | No | Google Drive folder ID for trip images. If omitted, the script creates **TRAVELRAYZ Images** and saves the ID automatically. |

Example: generate a secret locally:

```bash
openssl rand -base64 32
```

Paste the result as `ADMIN_SECRET`.

---

## 4. Set the Drive folder ID (optional)

If you already have a Drive folder for trip photos:

1. Open the folder in Google Drive.
2. Copy the ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
3. Set `DRIVE_FOLDER_ID` in Script Properties to that ID.

Ensure the Google account that deploys the script **owns or can write** to this folder.

---

## 5. Initialise sheets (recommended)

In Apps Script, select function **`setupSheets`** → **Run**.

- Authorise the script (Spreadsheet + Drive scopes).
- This creates/validates **Trips**, **Inquiries**, **Gallery**, and **Testimonials** headers.

---

## 6. Deploy as Web App

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. Settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. **Deploy** → authorise (accept Drive access for uploads).
5. Copy the **Web app URL** (ends in `/exec`).

> After every `Code.gs` change: **Deploy → Manage deployments → Edit → New version → Deploy**.

---

## 7. Add the deployment URL to config.js

Open `assets/js/config.js`:

```javascript
sheetsApiUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
requestTimeoutMs: 30000,
```

Do **not** add `ADMIN_SECRET` here.

---

## 8. Admin login (browser session)

1. Open `/admin/index.html`.
2. Enter the **same value** you set as `ADMIN_SECRET`.
3. The secret is stored in **`sessionStorage`** only for the current browser tab/session.
4. Logout clears it.

This is a **lightweight single-admin gate** — suitable for one trusted operator, not multi-user or high-security production use. The Web App URL is public; anyone who knows the secret can manage trips.

**Failed-attempt protection:** After 5 wrong secrets within ~10 minutes, the API blocks further admin attempts for ~15 minutes.

---

## 9. Test every operation

### Public (no secret)

| Test | How |
|------|-----|
| Get published trips | Open site homepage or `trips.html` — trips should load |
| Get one trip | Click a trip card → `trip-details.html?id=…` |
| Save inquiry | Submit the form on `book.html` — new row in **Inquiries** |

Browser console quick check:

```javascript
fetch('YOUR_WEB_APP_URL?action=getPublishedTrips').then(r => r.json()).then(console.log)
```

Expected:

```json
{ "success": true, "message": "Published trips loaded", "data": { "trips": [ ... ] } }
```

### Admin (requires secret in sessionStorage — use admin UI)

| Test | Admin panel action |
|------|---------------------|
| Validate secret | Log in |
| Get all trips | Trips table loads (includes drafts) |
| Create trip | **+ Add Trip** → Save (status Draft or Published) |
| Update trip | **Edit** → change fields → Save |
| Publish / Unpublish | **Publish** / **Unpublish** buttons in table |
| Delete trip | **Delete** (removes row + trashes Drive image) |
| Upload image | Add poster on trip form (JPG/PNG/WEBP, max 5 MB) |
| Replace image | Edit trip → upload new poster (old Drive file trashed) |

---

## API reference

All responses use:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

Errors: `"success": false`, `"message": "Reason"`, `"data": null`

POST body: JSON with `Content-Type: text/plain;charset=utf-8` (avoids CORS preflight).

### GET (public)

```
?action=getPublishedTrips
?action=getTrip&id={uuid}
?action=getGallery
?action=getTestimonials
```

Legacy alias: `getTrips` → same as `getPublishedTrips`.

### POST

**Public**

```json
{ "action": "saveInquiry", "inquiry": { "name": "...", "phone": "...", "email": "...", "company": "...", "inquiryType": "Corporate Outing", "groupSize": "20", "destination": "Hampi", "message": "...", "source": "contact-form" } }
```

**Admin** — include `"adminSecret": "YOUR_SECRET"`:

```json
{ "action": "validateAdmin", "adminSecret": "..." }
{ "action": "getAllTrips", "adminSecret": "..." }
{ "action": "createTrip", "adminSecret": "...", "trip": { "title": "...", "status": "draft", ... } }
{ "action": "updateTrip", "adminSecret": "...", "trip": { "id": "...", ... } }
{ "action": "publishTrip", "adminSecret": "...", "trip": { "id": "..." } }
{ "action": "unpublishTrip", "adminSecret": "...", "trip": { "id": "..." } }
{ "action": "deleteTrip", "adminSecret": "...", "trip": { "id": "..." } }
{ "action": "uploadImage", "adminSecret": "...", "replaceFileId": "optional-old-id", "file": { "data": "<base64>", "mimeType": "image/jpeg", "filename": "poster.jpg" } }
{ "action": "deleteImage", "adminSecret": "...", "fileId": "..." }
```

**Image upload flow**

1. Admin selects JPG/PNG/WEBP (max 5 MB).
2. Browser compresses and converts to Base64.
3. Apps Script decodes, validates MIME, uploads to Drive, sets link sharing.
4. Returns `data.url` and `data.driveFileId` — saved in **Trips** `image` and `driveFileId` columns.
5. Replacing an image sends `replaceFileId`; the previous file is moved to trash.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Site shows fallback/demo trip | Check `sheetsApiUrl` in `config.js`; redeploy Web App |
| Admin login always fails | Verify `ADMIN_SECRET` in Script Properties matches exactly |
| Locked out after wrong attempts | Wait ~15 minutes |
| `ADMIN_SECRET is not set` | Add Script Property before using admin endpoints |
| CORS / POST errors | Use `text/plain` body (already in `sheets.js`); redeploy with **Anyone** access |
| Images blank on site | Open file in Drive → Share → Anyone with the link |
| Trips empty on site | Set **status** to `published` in sheet or Publish from admin |
| Changes not live | Create **New deployment version** after editing `Code.gs` |

---

## Security notes

- **Never** commit `ADMIN_SECRET` or paste it into public JavaScript, HTML, or `config.js`.
- The Web App is callable by anyone who has the URL — protect writes with `ADMIN_SECRET`.
- Do not log the secret in Apps Script `Logger.log` or client `console.log`.
- Rotate `ADMIN_SECRET` periodically via Script Properties.
- This design is intended for **one admin operator** on a static-hosted marketing site — not a substitute for OAuth, service accounts, or a proper backend.

---

## Static hosting compatibility

No server-side code is required. Deploy the HTML/CSS/JS folder to any static host (GitHub Pages, Netlify, S3, etc.). Only the Apps Script URL in `config.js` must be reachable from visitors' browsers.
