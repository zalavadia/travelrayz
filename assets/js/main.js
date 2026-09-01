/**
 * TRAVELRAYZ — Forms, FAQ, chrome UI
 */
const AppChrome = {
  init() {
    if (typeof SiteChrome !== 'undefined') SiteChrome.mount();
    this.lockShell();
    this.bindTheme();
    this.bindNav();
    this.bindScroll();
    this.bindFAQ();
    this.bindForms();
    this.injectCompany();
  },

  /**
   * Move page content into .site-shell so window/body never scroll.
   * Navbar stays a sibling → position:fixed sticks to the viewport on mobile.
   */
  lockShell() {
    if (document.querySelector('.site-shell')) return;

    const shell = document.createElement('div');
    shell.className = 'site-shell';

    const stayOnBody = (el) => {
      if (!el || el.nodeType !== 1) return false;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK') return true;
      if (el.classList.contains('navbar')) return true;
      if (el.classList.contains('skip-link')) return true;
      if (el.classList.contains('ambient')) return true;
      if (el.classList.contains('page-loader')) return true;
      if (el.classList.contains('float-btns')) return true;
      if (el.classList.contains('toast')) return true;
      if (el.id === 'trip-modal' || el.id === 'lightbox') return true;
      return false;
    };

    const move = [];
    [...document.body.children].forEach((el) => {
      if (!stayOnBody(el)) move.push(el);
    });
    move.forEach((el) => shell.appendChild(el));

    const nav = TR.qs('.navbar');
    if (nav) nav.after(shell);
    else document.body.prepend(shell);

    // Overlays must sit on body (outside overflow scrollport)
    ['#trip-modal', '#lightbox', '.float-btns'].forEach((sel) => {
      const el = TR.qs(sel);
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
    });

    document.documentElement.classList.add('has-shell');
  },

  getStoredTheme() {
    if (typeof ThemeUI !== 'undefined') return ThemeUI.getCurrentTheme();
    try {
      const saved = localStorage.getItem('travelrayz-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) {}
    return 'dark';
  },

  applyTheme(theme) {
    if (typeof ThemeUI !== 'undefined') ThemeUI.applyTheme(theme);
  },

  bindTheme() {
    if (typeof ThemeUI !== 'undefined') ThemeUI.syncToggles();
  },

  bindNav() {
    const toggle = TR.qs('.nav-toggle');
    const links = TR.qs('.nav-links');
    const navbar = TR.qs('.navbar');
    if (!toggle || !links) return;

    if (navbar && navbar.parentElement !== document.body) {
      document.body.prepend(navbar);
    }

    const mq = window.matchMedia('(max-width: 1024px)');

    const setOpen = (open) => {
      toggle.classList.toggle('open', open);
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('nav-open', open);
    };

    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    TR.qsa('a', links).forEach((a) => a.addEventListener('click', () => setOpen(false)));

    mq.addEventListener('change', () => {
      if (!mq.matches) setOpen(false);
    });
  },

  bindScroll() {
    const nav = TR.qs('.navbar');
    const onScroll = () => {
      nav?.classList.toggle('scrolled', TR.scrollY() > 40);
    };
    TR.onScroll(TR.throttle(onScroll, 16));
    onScroll();
  },

  bindFAQ() {
    TR.qsa('.faq-item').forEach((item) => {
      const btn = TR.qs('.faq-question', item);
      btn?.addEventListener('click', () => {
        const open = item.classList.contains('open');
        TR.qsa('.faq-item').forEach((i) => i.classList.remove('open'));
        if (!open) item.classList.add('open');
      });
    });
  },

  bindForms() {
    const enquiry = TR.qs('#enquiry-form');
    enquiry?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (enquiry.dataset.submitting === '1') return;
      const fd = new FormData(enquiry);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const message = String(fd.get('message') || '').trim();
      const trip = String(fd.get('trip') || 'General enquiry').trim();

      if (name.length < 2 || phone.replace(/\D/g, '').length < 10 || message.length < 10) {
        TR.toast('Please fill name, phone, and a message (10+ characters).');
        return;
      }

      enquiry.dataset.submitting = '1';
      const btn = enquiry.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;

      let saved = false;
      if (typeof SheetsAPI !== 'undefined' && SheetsAPI.configured()) {
        try {
          await SheetsAPI.saveInquiry({
            name,
            phone,
            message,
            trip,
            inquiryType: 'General Inquiry',
            source: 'book-form'
          });
          saved = true;
          TR.toast('Thank you! We received your enquiry.');
        } catch (err) {
          console.warn('[TRAVELRAYZ] Inquiry save failed, opening WhatsApp.', err);
        }
      }

      if (!saved) {
        if (SheetsAPI?.configured?.()) TR.toast('Opening WhatsApp as backup…');
        else TR.toast('Thank you! Opening WhatsApp…');
      }

      const text = `Hello TRAVELRAYZ, I would like to enquire.\nName: ${name}\nPhone: ${phone}\nTrip: ${trip}\n${message}`;
      const wa = TRAVELRAYZ_CONFIG.company.whatsapp;
      setTimeout(() => {
        window.open(TR.whatsappUrl(wa, text), '_blank', 'noopener');
        if (saved) enquiry.reset();
        enquiry.dataset.submitting = '0';
        if (btn) btn.disabled = false;
      }, saved ? 400 : 500);
    });
  },

  injectCompany() {
    const c = TRAVELRAYZ_CONFIG.company;
    TR.qsa('[data-company-phone]').forEach((el) => {
      el.textContent = c.phoneDisplay || c.phone;
      const tel = c.phone.startsWith('+') ? c.phone : `+91${c.phone}`;
      if (el.tagName === 'A') el.href = `tel:${tel.replace(/\s/g, '')}`;
      else {
        const parent = el.closest('a.reach-tile--phone, a.footer-chip');
        if (parent) parent.href = `tel:${tel.replace(/\s/g, '')}`;
      }
    });
    TR.qsa('[data-company-phone2]').forEach((el) => {
      el.textContent = c.phone2Display || c.phone2;
      const tel = c.phone2.startsWith('+') ? c.phone2 : `+91${c.phone2}`;
      if (el.tagName === 'A') el.href = `tel:${tel.replace(/\s/g, '')}`;
      else {
        const parent = el.closest('a.reach-tile--phone, a.footer-chip');
        if (parent) parent.href = `tel:${tel.replace(/\s/g, '')}`;
      }
    });
    TR.qsa('[data-company-email]').forEach((el) => {
      el.textContent = c.email;
      if (el.tagName === 'A') el.href = `mailto:${c.email}`;
      else {
        const parent = el.closest('a[href^="mailto"], a.footer-chip--email');
        if (parent) parent.href = `mailto:${c.email}`;
      }
    });
    TR.qsa('[data-company-whatsapp]').forEach((el) => {
      el.textContent = c.whatsappDisplay || c.whatsapp.replace(/^91/, '');
    });
    TR.qsa('[data-company-website-label]').forEach((el) => {
      el.textContent = c.websiteLabel || c.website;
      const parent = el.closest('a');
      if (parent && c.website) parent.href = c.website;
    });
    TR.qsa('[data-social-instagram-handle]').forEach((el) => {
      el.textContent = c.social.instagramHandle || '@travelrayzz';
    });
    TR.qsa('[data-social-linkedin-label]').forEach((el) => {
      el.textContent = c.social.linkedinLabel || 'Travelrayz';
    });
    TR.qsa('[data-company-address]').forEach((el) => {
      el.textContent = c.address;
    });
    TR.qsa('[data-company-tagline]').forEach((el) => {
      el.textContent = c.tagline;
    });
    TR.qsa('[data-company-mission]').forEach((el) => {
      el.textContent = c.mission || c.tagline;
    });
    TR.qsa('[data-whatsapp-link]').forEach((el) => {
      el.href = TR.whatsappUrl(c.whatsapp, 'Hi TRAVELRAYZ! I want to plan a trip.');
    });
    TR.qsa('[data-social="instagram"]').forEach((el) => (el.href = c.social.instagram));
    TR.qsa('[data-social="linkedin"]').forEach((el) => (el.href = c.social.linkedin || '#'));
    TR.qsa('[data-social="facebook"]').forEach((el) => (el.href = c.social.facebook));
    TR.qsa('[data-social="youtube"]').forEach((el) => (el.href = c.social.youtube));
    const map = TR.qs('#google-map');
    if (map && c.mapsEmbed) map.src = c.mapsEmbed;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Dismiss loader first so a later init error can't leave it stuck
  try {
    Motion.initLoader();
  } catch (_) {}

  try {
    AppChrome.init();
  } catch (err) {
    console.error('[TRAVELRAYZ] AppChrome init failed', err);
  }

  try {
    Motion.init();
  } catch (err) {
    console.error('[TRAVELRAYZ] Motion init failed', err);
  }

  if (typeof ContactUI !== 'undefined') ContactUI.init();
  if (typeof GalleryUI !== 'undefined') {
    GalleryUI.init({
      limit: Number(document.body.dataset.galleryLimit) || 0
    });
  }
  if (typeof TestimonialsUI !== 'undefined') TestimonialsUI.init();
  if (typeof TripsUI !== 'undefined') {
    if (document.body.dataset.page === 'trip-detail') {
      await TripsUI.initDetail();
    } else if (TR.qs('#trips-grid')) {
      await TripsUI.init({
        filter: document.body.dataset.tripsFilter || '',
        limit: Number(document.body.dataset.tripsLimit) || 0
      });
    }
  }

  /* Re-scan after dynamic trip/gallery content mounts */
  if (typeof Motion !== 'undefined') Motion.refreshReveal();

  const year = TR.qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());
});
