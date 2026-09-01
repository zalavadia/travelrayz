# TRAVELRAYZ — Static site + Google Sheets CMS

**Travel to Divine. Return with Peace.**

Premium static website for corporate outings, treks, spiritual yatras, camping and weekend trips. Built with **HTML5, CSS3, and vanilla JavaScript** — no Node.js server required for hosting.

---

## Architecture

| Layer | Role |
|--------|------|
| **Static HTML/CSS/JS** | Public site + admin UI (hosted on any static host) |
| **Google Apps Script** | JSON API (`Code.gs`) — trips, inquiries, uploads |
| **Google Sheets** | Trip calendar + inquiry inbox |
| **Google Drive** | Trip cover images (via Apps Script upload) |

The website is fully static. All dynamic data comes from your deployed Apps Script Web App URL in `assets/js/config.js`.

---

## Local setup

1. Clone or download this repository.

2. Serve locally (recommended — some features need HTTP, not `file://`):

```bash
npx serve .
# or
python3 -m http.server 5500
```

3. Open `http://localhost:3000` (or `:5500`).

4. Edit `assets/js/config.js` and set `sheetsApiUrl` to your deployed Apps Script Web App URL (ends in `/exec`).

5. Admin panel: open `/admin/` — log in with the secret stored in Apps Script Script Properties (`ADMIN_SECRET`). The secret is **never** in public JavaScript.

---

## Google Sheet setup

See **`google-sheet/README.md`** for the full guide. Summary:

1. Create a Google Sheet (e.g. **TRAVELRAYZ CMS**).
2. The script creates/validates tabs: **Trips**, **Inquiries** (+ optional Gallery, Testimonials).
3. Optionally import `google-sheet/sample-trips.csv` into **Trips**.

### Trips tab

Uses the new schema (27 columns): `id`, `slug`, `title`, `location`, `meetingPoint`, `category`, dates, pricing, descriptions, inclusions, exclusions, itinerary, `image`, `driveFileId`, `featured`, `soldOut`, `status` (`published` / `draft`), etc.

### Inquiries tab (row 1 headers)

```
id | name | email | phone | company | inquiryType | groupSize | destination | message | trip | source | createdAt | status
```

---

## Apps Script setup

1. In the spreadsheet: **Extensions → Apps Script**.
2. Replace default code with `google-sheet/Code.gs` from this repo.
3. Save the project (e.g. **TRAVELRAYZ CMS**).

---

## Script Properties

In Apps Script: **Project settings → Script properties**, add:

| Property | Required | Purpose |
|----------|----------|---------|
| `ADMIN_SECRET` | Yes | Admin login password (validated server-side only) |
| `DRIVE_FOLDER_ID` | Yes (for uploads) | Google Drive folder ID for trip/gallery images |

Never commit secrets to git or public JavaScript.

---

## Google Drive folder setup

1. Create a folder in Google Drive (e.g. **TRAVELRAYZ Media**).
2. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
3. Set `DRIVE_FOLDER_ID` in Script Properties.
4. Ensure the Apps Script deployment runs as **you** so it can write to that folder.

---

## Admin secret setup

1. Choose a strong secret (e.g. 20+ random characters).
2. Add `ADMIN_SECRET` in Script Properties with that value.
3. Open `admin/index.html` on your site and log in.
4. The secret is stored in **`sessionStorage` only** for the browser session and cleared on logout.

---

## Apps Script deployment

1. In Apps Script: **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone** (required for public site + admin API from browser).
5. Deploy and copy the **Web app URL** (ends in `/exec`).
6. Paste into `assets/js/config.js`:

```js
sheetsApiUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
```

7. After code changes, create a **New deployment** (or manage versions) so the live URL picks up updates.

Run `setupSheets()` once from the Apps Script editor to create/validate sheet headers.

---

## Static hosting deployment

The site is a folder of static files. No build step. No Node.js on the server.

### 1. GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from branch**.
3. Branch: `main`, folder: `/ (root)`.
4. Site URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
5. Set `sheetsApiUrl` in `config.js` before pushing.
6. Update canonical URLs in HTML / `sitemap.xml` / `robots.txt` if using a custom domain.

### 2. Netlify

1. Drag the project folder to [Netlify Drop](https://app.netlify.com/drop), **or** connect your Git repo.
2. **Publish directory:** project root (`.`).
3. **Build command:** none.
4. `_redirects` in the repo redirects `/upcoming-trips.html` → `/trips.html`.
5. Add your custom domain under **Domain settings** if needed.
6. Ensure `assets/js/config.js` has the live Apps Script URL.

### 3. Hostinger shared hosting

1. Log in to hPanel → **File Manager** (or use FTP).
2. Upload all files into `public_html` (keep folder structure: `assets/`, `admin/`, etc.).
3. Confirm `index.html` is at `public_html/index.html`.
4. Edit `public_html/assets/js/config.js` on the server (or upload after editing locally) with your Apps Script URL.
5. Point your domain A record to Hostinger; enable SSL in hPanel.
6. Test: `https://yourdomain.com/trips.html` and `https://yourdomain.com/admin/`.

---

## Updating the Apps Script URL

1. Deploy a new Web App version in Apps Script (or use an existing deployment URL).
2. Edit **`assets/js/config.js`** → `sheetsApiUrl`.
3. Re-upload / redeploy the static site so visitors get the updated file.
4. Hard-refresh the browser (Ctrl+Shift+R) to bypass cache.

---

## Common errors and fixes

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Trips show fallback/demo data only | Wrong or missing `sheetsApiUrl` | Set URL in `config.js`; redeploy static site |
| `Unknown action` / API errors | Old Apps Script deployment | Redeploy latest `Code.gs`; use `getTrips` fallback is built into client |
| Admin login fails | Wrong `ADMIN_SECRET` or not set | Set Script Property; redeploy Web App |
| Admin “Configure sheetsApiUrl” | Placeholder URL in config | Replace `YOUR_GOOGLE` placeholder with `/exec` URL |
| Image upload fails | Missing `DRIVE_FOLDER_ID` or file > 5 MB | Set folder ID; compress image in admin (auto-compress enabled) |
| Contact form error | Old inquiry schema on sheet | Update **Inquiries** row 1 headers; redeploy `Code.gs` |
| CORS / fetch failed | Web app not deployed as “Anyone” | Redeploy with public access |
| Published trip not on site | Status not `published` / `Active` | Publish in admin; refresh `trips.html` |
| `trip-details.html` not found | Trip unpublished or wrong ID | Use link from trips grid; check sheet status |

---

## Security limitations (single-admin CMS)

This is a **lightweight CMS** for a single operator — not enterprise-grade security:

- Admin secret is validated by Apps Script but transmitted over HTTPS per session (stored in `sessionStorage`).
- The Web App is public (“Anyone”) so the endpoint is discoverable; protection relies on `ADMIN_SECRET` and server-side checks.
- No rate limiting on public inquiry POSTs beyond basic validation (consider Apps Script quotas).
- Sheet data is only as private as your Google account sharing settings.
- Do **not** put `ADMIN_SECRET`, service account keys, or API keys in `config.js` or public repos.

For a small travel brand with one admin, this is appropriate; for multi-tenant or high-security use, migrate to a proper backend.

---

## Project structure

```
travelrayz/
├── index.html              # Home
├── trips.html              # Trip calendar (API)
├── trip-details.html       # Single trip (API)
├── about.html · gallery.html · contact.html
├── treks.html · tours.html · book.html   # Legacy/category pages
├── upcoming-trips.html     # Redirect → trips.html
├── privacy.html · terms.html · testimonials.html
├── admin/                  # Password-gated CMS (noindex)
├── assets/
│   ├── css/
│   ├── js/
│   │   ├── config.js       # Public config + Apps Script URL
│   │   ├── sheets.js       # API client
│   │   ├── trips.js · gallery.js · contact.js
│   │   └── gallery-data.js # Editable gallery content
│   └── images/
├── google-sheet/Code.gs    # Apps Script backend
├── robots.txt · sitemap.xml · _redirects
└── README.md
```

---

## Public pages (main nav)

Home · Trips · About · Gallery · Contact — admin is **not** linked in public navigation.

---

## Official contact (defaults in config.js)

- **Pratima:** +91 88508 24834  
- **Kiran:** +91 72083 58868  
- **WhatsApp:** +91 72084 53777  
- **Email:** contact@travelrayz.com  
- **Instagram:** @travelrayzz  
- **LinkedIn:** [Travelrayz](https://www.linkedin.com/company/travelrayz/)  
- **Location:** Mumbai, Maharashtra  

---

## License

© TRAVELRAYZ. All rights reserved.
