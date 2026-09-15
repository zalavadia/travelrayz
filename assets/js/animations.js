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
    this.texturePageHeroes();
    this.initReveal();
    this.initParallax();
    this.initCounters();
  },

  _loaderArmed: false,

  initLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader || loader.dataset.armed === '1' || loader.dataset.done === '1') return;
    if (typeof PageLoader !== 'undefined') {
      PageLoader.init();
      this._loaderArmed = true;
    }
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

  texturePageHeroes() {
    TR.qsa('.page-hero').forEach((hero) => {
      if (hero.classList.contains('has-texture')) return;
      hero.classList.add('has-texture');
      const layers = document.createElement('div');
      layers.className = 'page-hero-layers';
      layers.setAttribute('aria-hidden', 'true');
      layers.innerHTML =
        '<div class="page-hero-media"></div>' +
        '<div class="page-hero-shade"></div>' +
        '<div class="page-hero-mesh"></div>';
      hero.prepend(layers);
    });
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

  /** Re-run reveal after dynamic content mounts (trips, gallery). */
  refreshReveal(scope) {
    const root = scope || document;
    const nodes = TR.qsa('.trip-card, .gallery-item, [data-reveal]', root).filter(
      (el) => !el.classList.contains('is-skeleton') && !el.classList.contains('is-visible')
    );
    if (!nodes.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const scrollRoot = document.querySelector('.site-shell') || null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { root: scrollRoot, threshold: 0.08, rootMargin: '0px 0px -4% 0px' }
    );

    nodes.forEach((el, i) => {
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
      el.style.setProperty('--reveal-delay', `${Math.min(i * 70, 420)}ms`);
      io.observe(el);
    });
  },

  initCounters() {
    const section = TR.qs('.home-stats');
    if (!section) return;

    const counters = TR.qsa('.stat-counter', section);
    if (!counters.length) return;

    const finish = (el) => {
      const to = Number(el.dataset.countTo) || 0;
      const suffix = el.dataset.countSuffix || '';
      el.textContent = `${to}${suffix}`;
    };

    const runAll = () => {
      if (section.dataset.countersDone === '1') return;
      section.dataset.countersDone = '1';

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        counters.forEach(finish);
        return;
      }

      const duration = 1800;
      const easeOut = (t) => 1 - (1 - t) ** 4;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = easeOut(progress);
        counters.forEach((el) => {
          const to = Number(el.dataset.countTo) || 0;
          const suffix = el.dataset.countSuffix || '';
          const value = progress >= 1 ? to : Math.round(eased * to);
          el.textContent = `${value}${suffix}`;
        });
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      runAll();
      return;
    }

    const root = document.querySelector('.site-shell') || null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runAll();
          io.disconnect();
        });
      },
      { root, threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
    );

    io.observe(section);
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
      '.trip-card:not(.is-skeleton)',
      '.testimonial-card',
      '.faq-item',
      '.contact-info',
      '.enquiry-form',
      '.gallery-item',
      '.mv-card',
      '.page-hero h1',
      '.page-hero p',
      '.featured-visual',
      '.featured-copy',
      '.cta-panel',
      '.journey-strip',
      '.home-stat',
      '.band-row',
      '.difference-waypoint',
      '.approach-phase',
      '.benefit-panel',
      '.visionary',
      '.story-timeline li',
      '.about-value-list li',
      '.why-started-pillars li',
      '.reach-tile',
      '.pillar-editorial li',
      '.footer-cta',
      '.footer-main'
    ];

    const set = new Set(TR.qsa('[data-reveal]'));
    auto.forEach((sel) => TR.qsa(sel).forEach((el) => set.add(el)));
    return [...set];
  }
};
