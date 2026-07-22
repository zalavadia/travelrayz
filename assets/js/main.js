/**
 * TRAVELRAYZ — Forms, FAQ, dark mode, chrome UI
 */
const AppChrome = {
  init() {
    this.bindNav();
    this.bindScroll();
    this.bindFAQ();
    this.bindForms();
    this.bindDarkMode();
    this.bindFloat();
    this.injectCompany();
    this.weather();
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
    const progress = TR.qs('.scroll-progress');
    const topBtn = TR.qs('.float-top');
    const sticky = TR.qs('.sticky-book');

    const onScroll = () => {
      const y = window.scrollY;
      nav?.classList.toggle('scrolled', y > 40);
      topBtn?.classList.toggle('visible', y > 500);
      sticky?.classList.toggle('visible', y > 700 && y < document.body.scrollHeight - 900);

      if (progress && TRAVELRAYZ_CONFIG.features.scrollProgress) {
        const h = document.documentElement.scrollHeight - innerHeight;
        progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      }
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
      Motion.confetti();
      TR.toast('Thank you! Opening WhatsApp…');
      setTimeout(() => {
        window.open(`https://wa.me/${wa}?text=${text}`, '_blank', 'noopener');
        enquiry.reset();
      }, 700);
    });

    const news = TR.qs('#newsletter-form');
    news?.addEventListener('submit', (e) => {
      e.preventDefault();
      TR.toast('Subscribed! Welcome to TRAVELRAYZ.');
      news.reset();
    });
  },

  bindDarkMode() {
    if (!TRAVELRAYZ_CONFIG.features.darkMode) return;
    const saved = localStorage.getItem('travelrayz_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    TR.qs('#theme-toggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      if (next === 'light') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('travelrayz_theme', next === 'light' ? '' : 'dark');
    });
  },

  bindFloat() {
    TR.qs('.float-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
  },

  async weather() {
    if (!TRAVELRAYZ_CONFIG.features.weatherWidget) return;
    const el = TR.qs('#weather-widget');
    if (!el) return;
    try {
      /* Open-Meteo — no API key required */
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=19.076&longitude=72.8777&current=temperature_2m,weather_code'
      );
      const data = await res.json();
      const t = Math.round(data.current.temperature_2m);
      el.innerHTML = `🌤 Mumbai · ${t}°C`;
      el.hidden = false;
    } catch (_) {
      el.hidden = true;
    }
  }
};

/** Boot sequence */
document.addEventListener('DOMContentLoaded', async () => {
  AppChrome.init();
  Motion.init();
  GalleryUI.init();
  await TripsUI.init({ featuredSlider: !!TR.qs('#featured-swiper') });

  const year = TR.qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  if (typeof Swiper !== 'undefined' && TR.qs('#testimonials-swiper')) {
    new Swiper('#testimonials-swiper', {
      loop: true,
      autoplay: { delay: 4000 },
      slidesPerView: 1,
      spaceBetween: 24,
      pagination: { el: '#testimonials-swiper .swiper-pagination', clickable: true },
      breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
    });
  }

  /* Deep-link trip modal */
  const hash = location.hash.match(/trip-(.+)/);
  if (hash) {
    setTimeout(() => TripsUI.openModal(hash[1]), 800);
  }
});
