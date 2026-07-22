# TRAVELRAYZ

**Travel to Divine. Return with Peace.**

Premium static website for treks, weekend trips, camping, Jyotirlinga yatras and spiritual tours.

Built with **HTML5 · CSS3 · Vanilla JavaScript** — no React, Angular, Vue, Bootstrap, Tailwind, jQuery, PHP, Firebase or backend database.

Deploy by uploading files to Hostinger, Netlify, GitHub Pages, or any static host.

---

## Quick start

1. Open `index.html` in a browser, **or** serve locally:

```bash
npx serve .
# or: python3 -m http.server 5500
```

2. Default upcoming trip (Maharashtra 3 Jyotirlinga Yatra) loads from fallback data in `assets/js/config.js` until Google Sheets is connected.

3. Admin panel: open `/admin/` — password `travelrayz2026` (change in `config.js`).

---

## Folder structure

```
travelrayz/
├── index.html
├── treks.html · tours.html · upcoming-trips.html
├── gallery.html · about.html · testimonials.html
├── contact.html · book.html · privacy.html · terms.html
├── favicon.svg · robots.txt · sitemap.xml · README.md
├── assets/
│   ├── css/          # Modular stylesheets
│   ├── js/           # config, utils, sheets, trips, gallery, animations, main
│   ├── images/       # Poster + hero artwork
│   ├── videos/       # Optional hero drone video (hero-drone.mp4)
│   └── icons/
├── admin/            # Password-gated CMS UI
└── google-sheet/     # Apps Script + sample CSV + setup guide
```

---

## Design system

| Token | Value |
|--------|--------|
| Primary | `#0B1F3A` |
| Accent | `#FF7A00` |
| Gold | `#FFC107` |
| Background | `#F8FAFC` |
| Dark | `#08111F` |
| Text | `#1E293B` |
| Headings | Cinzel |
| Subheads | Montserrat |
| Body | Poppins |

Glassmorphism cards, soft shadows, rounded corners, dark mode toggle.

---

## Features

- Full-screen hero with video/image fallback, rotating headlines, floating stats, parallax, clouds
- Upcoming trips from **Google Sheets** (Apps Script JSON API) with search, filters, countdown, tilt cards
- Trip details modal: inclusions, itinerary, WhatsApp book, share, copy link, print/PDF itinerary
- Categories, featured Swiper slider, Pinterest masonry gallery + lightbox
- Why Choose Us, testimonials slider, FAQ accordion, contact + maps + enquiry (WhatsApp + confetti)
- Floating WhatsApp / Call / Back to top, sticky Book Now, scroll progress, animated cursor
- Loader, GSAP / AOS / Swiper / ScrollReveal motion
- SEO: meta, Open Graph, Twitter, JSON-LD, robots.txt, sitemap.xml, lazy images
- Admin: trips CRUD, gallery, testimonials, settings, JSON export

---

## Google Sheets CMS setup

Follow **`google-sheet/README.md`**. Summary:

1. Create a Google Sheet named **Trips** (or let the script create it).
2. Import `google-sheet/sample-trips.csv` or paste headers from the README.
3. Extensions → Apps Script → paste `Code.gs` → Deploy → **Web app** → Execute as *Me* → Who has access: *Anyone*.
4. Copy the Web App URL into `assets/js/config.js`:

```js
sheetsApiUrl: 'https://script.google.com/macros/s/XXXX/exec',
```

5. Reload the site — cards generate from sheet rows where `Status` is Active.

### Sheet columns

Trip Name · Poster · Destination · Category · Description · Duration · Travel Date · Price · Seats · Difficulty · Vehicle · Inclusions · Exclusions · Pickup Points · Itinerary · Booking Link · Trending · Featured · Status · Limited Seats

---

## Admin panel

1. Visit `/admin/index.html`
2. Login with password from `TRAVELRAYZ_CONFIG.adminPassword`
3. Manage trips (requires Sheets URL for live save), gallery & testimonials (localStorage), company settings
4. Export JSON backups from the Export tab

> Client-side password is a simple gate, not high security. Change the default before sharing publicly.

---

## Configuration

Edit **`assets/js/config.js`**:

- Company phones, WhatsApp, email, social, maps embed
- `sheetsApiUrl`
- `adminPassword`
- Feature flags (dark mode, cursor, confetti, weather, sticky book, scroll progress)
- `fallbackTrips` used when Sheets is offline

---

## Hero video (optional)

Place a compressed MP4 at:

```
assets/videos/hero-drone.mp4
```

If missing or failing, the premium mountain SVG/image is shown automatically.

---

## Deployment

### Netlify
Drag the project folder to [Netlify Drop](https://app.netlify.com/drop), or connect a Git repo. Publish directory = project root.

### GitHub Pages
Push repo → Settings → Pages → Deploy from branch `/` (root).

### Hostinger / cPanel
Upload all files via File Manager or FTP into `public_html`. Ensure `index.html` is at the root.

### Custom domain
Point DNS to your host, then update canonical URLs in HTML, `sitemap.xml`, and `robots.txt` from `https://travelrayz.com` to your domain.

---

## Performance tips

- Keep hero video under ~3–5 MB; prefer WebM/MP4 H.264
- Compress poster/gallery images (WebP where possible)
- CDNs already load GSAP, AOS, Swiper, fonts with `defer` / `preconnect`
- Scroll handlers are throttled/debounced

---

## Contact (defaults)

- **Phone:** 7208358868 / 8850824834
- **Email:** hello@travelrayz.com
- **Tagline:** Travel to Divine. Return with Peace.

---

## License

© TRAVELRAYZ. All rights reserved. Built for static hosting.
