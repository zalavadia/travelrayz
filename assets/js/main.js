/**
 * TRAVELRAYZ — Forms, FAQ, chrome UI
 */
const AppChrome = {
  init() {
    this.bindNav();
    this.bindScroll();
    this.bindFAQ();
    this.bindForms();
    this.injectCompany();
  },

  bindNav() {
    const toggle = TR.qs('.nav-toggle');
    const links = TR.qs('.nav-links');
    toggle?.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links?.classList.toggle('open');
    });
    TR.qsa('.nav-links a').forEach((a) =>
      a.addEventListener('click', () => {
        toggle?.classList.remove('open');
        links?.classList.remove('open');
      })
    );
  },

  bindScroll() {
    const nav = TR.qs('.navbar');
    const onScroll = () => {
      nav?.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', TR.throttle(onScroll, 16), { passive: true });
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
    enquiry?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(enquiry);
      const name = fd.get('name');
      const phone = fd.get('phone');
      const message = fd.get('message');
      const trip = fd.get('trip') || 'General enquiry';

      const text = `New enquiry from ${name}%0APhone: ${phone}%0ATrip: ${trip}%0AMessage: ${message}`;
      const wa = TRAVELRAYZ_CONFIG.company.whatsapp;
      TR.toast('Thank you! Opening WhatsApp…');
      setTimeout(() => {
        window.open(`https://wa.me/${wa}?text=${text}`, '_blank', 'noopener');
        enquiry.reset();
      }, 500);
    });
  },

  injectCompany() {
    const c = TRAVELRAYZ_CONFIG.company;
    TR.qsa('[data-company-phone]').forEach((el) => {
      el.textContent = c.phone;
      if (el.tagName === 'A') el.href = `tel:${c.phone}`;
    });
    TR.qsa('[data-company-phone2]').forEach((el) => {
      el.textContent = c.phone2;
      if (el.tagName === 'A') el.href = `tel:${c.phone2}`;
    });
    TR.qsa('[data-company-email]').forEach((el) => {
      el.textContent = c.email;
      if (el.tagName === 'A') el.href = `mailto:${c.email}`;
    });
    TR.qsa('[data-company-address]').forEach((el) => {
      el.textContent = c.address;
    });
    TR.qsa('[data-whatsapp-link]').forEach((el) => {
      el.href = TR.whatsappUrl(c.whatsapp, 'Hi TRAVELRAYZ! I want to plan a trip.');
    });
    TR.qsa('[data-social="instagram"]').forEach((el) => (el.href = c.social.instagram));
    TR.qsa('[data-social="facebook"]').forEach((el) => (el.href = c.social.facebook));
    TR.qsa('[data-social="youtube"]').forEach((el) => (el.href = c.social.youtube));
    const map = TR.qs('#google-map');
    if (map && c.mapsEmbed) map.src = c.mapsEmbed;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  AppChrome.init();
  Motion.init();

  if (typeof GalleryUI !== 'undefined') GalleryUI.init();
  if (typeof TripsUI !== 'undefined') {
    await TripsUI.init();
    const hash = location.hash.match(/trip-(.+)/);
    if (hash) {
      setTimeout(() => TripsUI.openModal(hash[1]), 400);
    }
  }

  /* Re-scan after dynamic trip/gallery content mounts */
  Motion.initReveal();

  const year = TR.qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());
});
