/**
 * TRAVELRAYZ — Motion: scroll reveal + ambient atmosphere + parallax
 */
const Motion = {
  init() {
    this.injectAmbient();
    this.initReveal();
    this.initParallax();
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

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
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
      const y = window.scrollY;
      layers.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.05;
        el.style.setProperty('--py', `${y * speed}px`);
      });
    }, 16);

    window.addEventListener('scroll', onScroll, { passive: true });
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
