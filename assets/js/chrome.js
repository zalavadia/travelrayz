/**
 * TRAVELRAYZ — Shared navbar + footer + WhatsApp button
 * Mounts into #site-nav / #site-footer placeholders. body[data-page] marks the active link.
 */
const SiteChrome = {
  mount() {
    const page = document.body.getAttribute('data-page') || '';

    const navHost = document.getElementById('site-nav');
    if (navHost) navHost.outerHTML = this.navHTML(page).trim();

    const footHost = document.getElementById('site-footer');
    if (footHost) footHost.outerHTML = this.footerHTML().trim();

    if (!document.querySelector('.float-btns')) {
      document.body.insertAdjacentHTML('beforeend', this.whatsappHTML());
    }

    if (typeof ThemeUI !== 'undefined') ThemeUI.syncToggles();
  },

  isActive(page, names) {
    return names.indexOf(page) !== -1 ? ' class="active"' : '';
  },

  ariaCurrent(page, names) {
    return names.indexOf(page) !== -1 ? ' aria-current="page"' : '';
  },

  themeToggleHTML(extraClass = '') {
    const cls = `theme-toggle${extraClass ? ` ${extraClass}` : ''}`;
    return `<button class="${cls}" type="button" aria-label="Switch to light theme" title="Light theme" aria-pressed="false">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"/></svg>
        </button>`;
  },

  logoHTML(href = 'index.html', label = 'TRAVELRAYZ home') {
    return `<a class="logo" href="${href}" aria-label="${label}">
        <img class="logo-mark" src="assets/images/logo-mark.png" alt="" width="44" height="44" aria-hidden="true">
        <span class="logo-word" aria-hidden="true"><span class="logo-travel">TRAVEL</span><span class="logo-rayz">RAYZ</span></span>
      </a>`;
  },

  navHTML(page) {
    const home = this.isActive(page, ['home']);
    const trips = this.isActive(page, ['trips', 'trip-detail', 'treks', 'tours', 'book']);
    const gallery = this.isActive(page, ['gallery']);
    const about = this.isActive(page, ['about']);
    const contact = this.isActive(page, ['contact']);

    return `
  <header class="navbar" id="navbar">
    <div class="nav-inner">
      ${this.logoHTML('index.html', 'TRAVELRAYZ home')}
      <nav class="nav-links" aria-label="Primary">
        <a${home} href="index.html"${this.ariaCurrent(page, ['home'])}>Home</a>
        <a${trips} href="trips.html"${this.ariaCurrent(page, ['trips', 'treks', 'tours'])}>Trips</a>
        <a${about} href="about.html"${this.ariaCurrent(page, ['about'])}>About</a>
        <a${gallery} href="gallery.html"${this.ariaCurrent(page, ['gallery'])}>Gallery</a>
        <a${contact} href="contact.html"${this.ariaCurrent(page, ['contact'])}>Contact</a>
        <div class="nav-mobile-actions">
          ${this.themeToggleHTML('theme-toggle--mobile')}
        </div>
      </nav>
      <div class="nav-actions">
        ${this.themeToggleHTML('theme-toggle--desktop')}
        <a class="btn btn-primary" href="trips.html">Explore Trips</a>
        <button class="nav-toggle" type="button" aria-label="Open menu"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>`;
  },

  footerHTML() {
    const raw = (typeof TRAVELRAYZ_CONFIG !== 'undefined' && TRAVELRAYZ_CONFIG.company.mission)
      ? TRAVELRAYZ_CONFIG.company.mission
      : 'Helping organizations build stronger teams, healthier workplaces, and more engaged employees through meaningful experiences beyond the workplace.';
    const mission = typeof TR !== 'undefined' ? TR.sanitize(raw) : raw;

    return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          ${this.logoHTML('index.html', 'TRAVELRAYZ home')}
          <p>${mission}</p>
          <div class="social-links">
            <a data-social="linkedin" href="#" aria-label="LinkedIn" target="_blank" rel="noopener"></a>
            <a data-social="instagram" href="#" aria-label="Instagram" target="_blank" rel="noopener"></a>
            <a data-social="youtube" href="#" aria-label="YouTube" target="_blank" rel="noopener"></a>
          </div>
        </div>
        <div>
          <h4>Quick Links</h4>
          <div class="footer-links">
            <a href="trips.html">Upcoming Trips</a>
            <a href="treks.html">Treks</a>
            <a href="tours.html">Tours</a>
            <a href="gallery.html">Gallery</a>
            <a href="about.html">About</a>
          </div>
        </div>
        <div>
          <h4>Company</h4>
          <div class="footer-links">
            <a href="testimonials.html">Testimonials</a>
            <a href="contact.html">Contact</a>
            <a href="terms.html">Terms</a>
            <a href="privacy.html">Privacy</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="year"></span> TRAVELRAYZ. All rights reserved.</span>
        <span>Travel to Divine. Return with Peace.</span>
      </div>
    </div>
  </footer>`;
  },

  whatsappHTML() {
    return `
  <div class="float-btns">
    <a class="float-btn float-whatsapp" data-whatsapp-link href="#" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
      <span class="fw-circle" aria-hidden="true"></span>
      <span class="float-label">Talk to us?</span>
    </a>
  </div>`;
  }
};
