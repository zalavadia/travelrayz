/**
 * TRAVELRAYZ — Motion: GSAP, AOS, ScrollReveal, cursor, magnetic, confetti
 */
const Motion = {
  init() {
    this.hideLoader();
    this.initHeroVideo();
    this.initAOS();
    this.initScrollReveal();
    this.initGSAP();
    this.initHeroText();
    this.initCounters();
    this.initMagnetic();
    this.initRipple();
    this.initCursor();
    this.initMouseGlow();
    this.initParallax();
  },

  hideLoader() {
    const loader = TR.qs('#page-loader');
    window.addEventListener('load', () => {
      setTimeout(() => loader && loader.classList.add('hidden'), 600);
    });
    setTimeout(() => loader && loader.classList.add('hidden'), 3500);
  },

  initHeroVideo() {
    const video = TR.qs('.hero-media video');
    if (!video) return;
    const markFailed = () => video.setAttribute('data-failed', 'true');
    const markOk = () => video.removeAttribute('data-failed');
    video.addEventListener('error', markFailed);
    video.querySelectorAll('source').forEach((s) => s.addEventListener('error', markFailed));
    video.addEventListener('loadeddata', () => {
      if (video.readyState >= 2) markOk();
    });
    video.play?.().then(markOk).catch(markFailed);
  },

  initAOS() {
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800, once: true, offset: 60, easing: 'ease-out-cubic' });
    }
  },

  initScrollReveal() {
    if (typeof ScrollReveal === 'undefined') return;
    const sr = ScrollReveal({ distance: '40px', duration: 900, easing: 'cubic-bezier(0.22,1,0.36,1)', reset: false });
    sr.reveal('.section-header', { origin: 'bottom' });
    sr.reveal('.why-card', { interval: 80 });
    sr.reveal('.category-card', { interval: 70 });
  },

  initGSAP() {
    if (typeof gsap === 'undefined') return;
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    gsap.from('.hero-brand', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.3 });
    gsap.from('.hero-tagline', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.5 });
    gsap.from('.hero-ctas .btn', { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.9 });
    gsap.from('.stat-pill', { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, delay: 1.1 });
  },

  initHeroText() {
    const el = TR.qs('#hero-rotating');
    if (!el) return;
    const phrases = ['Explore Nature', 'Travel Better', 'Create Memories'];
    let i = 0;

    const show = () => {
      el.innerHTML = `<span>${phrases[i]}</span>`;
      const span = el.querySelector('span');
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(span, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
        setTimeout(() => {
          gsap.to(span, {
            y: -40,
            opacity: 0,
            duration: 0.5,
            ease: 'power3.in',
            onComplete: () => {
              i = (i + 1) % phrases.length;
              show();
            }
          });
        }, 2400);
      } else {
        setTimeout(() => {
          i = (i + 1) % phrases.length;
          show();
        }, 2800);
      }
    };
    show();
  },

  initCounters() {
    const counters = TR.qsa('[data-count]');
    if (!counters.length) return;

    const animate = (el) => {
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(target * eased).toLocaleString('en-IN') + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              animate(e.target);
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((c) => io.observe(c));
    } else {
      counters.forEach(animate);
    }
  },

  initMagnetic() {
    if (window.matchMedia('(hover: none)').matches) return;
    TR.qsa('.magnetic, .btn-primary').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.25}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  },

  initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = e.clientX - r.left - size / 2 + 'px';
      ripple.style.top = e.clientY - r.top - size / 2 + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  },

  initCursor() {
    if (!TRAVELRAYZ_CONFIG.features.animatedCursor) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    });

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    };
    loop();

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .trip-card, .gallery-item')) ring.classList.add('hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .trip-card, .gallery-item')) ring.classList.remove('hover');
    });
  },

  initMouseGlow() {
    const glow = document.createElement('div');
    glow.className = 'mouse-glow';
    document.body.appendChild(glow);
    document.body.classList.add('has-glow');
    document.addEventListener(
      'mousemove',
      TR.throttle((e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
      }, 30)
    );
  },

  initParallax() {
    const layers = TR.qsa('[data-parallax]');
    if (!layers.length) return;
    window.addEventListener(
      'scroll',
      TR.throttle(() => {
        const y = window.scrollY;
        layers.forEach((el) => {
          const speed = Number(el.dataset.parallax) || 0.2;
          el.style.transform = `translateY(${y * speed}px)`;
        });
      }, 16)
    );
  },

  confetti() {
    if (!TRAVELRAYZ_CONFIG.features.confetti) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      c: ['#FF7A00', '#FFC107', '#0B1F3A', '#fff'][Math.floor(Math.random() * 4)],
      vy: 2 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      r: Math.random() * Math.PI
    }));

    let frames = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.05;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frames++;
      if (frames < 180) requestAnimationFrame(draw);
      else canvas.remove();
    };
    draw();
  }
};
