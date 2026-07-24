/**
 * TRAVELRAYZ — Motion: scroll reveal + ambient atmosphere + parallax
 */
const Motion = {
  init() {
    // Keep page-reveal off <body> so it never creates a fixed containing block
    if (document.body.classList.contains('page-reveal')) {
      document.body.classList.remove('page-reveal');
      document.getElementById('main')?.classList.add('page-reveal');
    }
    // Loader may already be armed from main.js — safe to call again (no-ops if gone)
    this.initLoader();
    this.injectAmbient();
    this.initReveal();
    this.initParallax();
  },

  _loaderArmed: false,

  initLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader || this._loaderArmed || loader.dataset.done) return;
    this._loaderArmed = true;

    let finished = false;
    const hide = () => {
      if (finished || !loader.isConnected || loader.dataset.done) return;
      finished = true;
      loader.dataset.done = '1';
      loader.classList.add('is-done');
      document.documentElement.classList.add('is-loaded');
      setTimeout(() => {
        if (loader.isConnected) loader.remove();
      }, 550);
    };

    // Don't wait for window "load" — fonts/maps/iframes can delay it indefinitely.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduce ? 80 : 650;
    setTimeout(hide, delay);
    setTimeout(hide, 2200); // hard failsafe
  },

  injectAmbient() {
    if (document.querySelector('.ambient')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ambient';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<span class="ambient-orb ambient-orb-1"></span>' +
      '<span class="ambient-orb ambient-orb-2"></span>' +
      '<span class="ambient-orb ambient-orb-3"></span>' +
      '<span class="ambient-beam"></span>' +
      '<span class="ambient-beam ambient-beam-2"></span>';
    document.body.prepend(wrap);
  },

  initReveal() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = this.collectTargets();

    if (reduce) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const root = document.querySelector('.site-shell') || null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { root, threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
    );

    targets.forEach((el, i) => {
      if (el.classList.contains('is-visible')) return;
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
      if (!el.style.getPropertyValue('--reveal-delay')) {
        const stagger = Math.min((i % 6) * 80, 320);
        el.style.setProperty('--reveal-delay', `${stagger}ms`);
      }
      io.observe(el);
    });
  },

  initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layers = TR.qsa('[data-parallax]');
    if (!layers.length) return;

    const onScroll = TR.throttle(() => {
      const y = TR.scrollY();
      layers.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.05;
        el.style.setProperty('--py', `${y * speed}px`);
      });
    }, 16);

    TR.onScroll(onScroll);
    onScroll();
  },

  collectTargets() {
    const auto = [
      '.section-header',
      '.about-image',
      '.about-content',
      '.category-card',
      '.why-card',
      '.trip-card',
      '.testimonial-card',
      '.faq-item',
      '.contact-info',
      '.enquiry-form',
      '.gallery-item',
      '.mv-card',
      '.page-hero h1',
      '.page-hero p'
    ];

    const set = new Set(TR.qsa('[data-reveal]'));
    auto.forEach((sel) => TR.qsa(sel).forEach((el) => set.add(el)));
    return [...set];
  }
};
