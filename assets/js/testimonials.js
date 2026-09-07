/**
 * TRAVELRAYZ — Traveler Stories
 * Data: assets/js/testimonials-data.js + Google Sheets (via admin Testimonials)
 * Layout: compact card grid + reader modal (scales with many reviews)
 */
const TestimonialsUI = {
  PAGE_SIZE: 6,
  visibleCount: 0,
  activeIndex: -1,
  PREVIEW_LENS: [110, 160, 210, 140, 190, 120],

  async init() {
    this.grid = TR.qs('#testimonials-grid');
    if (!this.grid) return;

    this.grid.classList.add('is-content-loading');
    this.grid.setAttribute('aria-busy', 'true');

    const seeded = Array.isArray(TESTIMONIALS_DATA) ? [...TESTIMONIALS_DATA] : [];
    let remote = [];
    if (typeof SheetsAPI !== 'undefined' && SheetsAPI.configured()) {
      try {
        remote = await SheetsAPI.fetchTestimonials();
      } catch (err) {
        console.warn('[TRAVELRAYZ] Testimonials API unavailable.', err);
      }
    }

    const seen = new Set();
    this.items = [...seeded, ...remote].filter((item) => {
      const text = String(item.text || '').trim();
      if (!text) return false;
      const key = `${item.name || ''}|${text}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    this.visibleCount = Math.min(this.PAGE_SIZE, this.items.length);
    this.ensureReader();
    this.bindMasonryResize();
    this.grid.classList.remove('is-content-loading');
    this.grid.removeAttribute('aria-busy');
    this.render();
    this.bindEvents();
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  preview(text, maxLen = 150) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen - 1).replace(/\s+\S*$/, '')}…`;
  },

  bindMasonryResize() {
    if (this.masonryResizeBound) return;
    this.masonryResizeBound = true;
    let timer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => this.layoutMasonry(), 120);
    });
  },

  layoutMasonry() {
    const list = this.masonryGrid || TR.qs('.voice-board__grid', this.grid);
    if (!list) return;
    const items = TR.qsa('.voice-card', list);
    if (!items.length) return;

    const styles = window.getComputedStyle(list);
    const rowH = parseFloat(styles.getPropertyValue('grid-auto-rows')) || 8;
    const gap = parseFloat(styles.rowGap || styles.gap) || 16;

    items.forEach((item) => {
      item.style.gridRowEnd = 'span 1';
      const height = item.getBoundingClientRect().height;
      const span = Math.max(8, Math.ceil((height + gap) / (rowH + gap)));
      item.style.gridRowEnd = `span ${span}`;
    });
  },

  scheduleMasonry() {
    window.requestAnimationFrame(() => {
      this.layoutMasonry();
      window.setTimeout(() => this.layoutMasonry(), 80);
      window.setTimeout(() => this.layoutMasonry(), 280);
    });
  },

  ensureReader() {
    if (this.reader) return;
    let root = TR.qs('#story-reader');
    if (!root) {
      root = document.createElement('div');
      root.id = 'story-reader';
      root.className = 'story-reader';
      root.hidden = true;
      root.innerHTML = `
        <div class="story-reader__backdrop" data-story-close tabindex="-1"></div>
        <div class="story-reader__panel" role="dialog" aria-modal="true" aria-labelledby="story-reader-title">
          <button type="button" class="story-reader__close" data-story-close aria-label="Close story">×</button>
          <div class="story-reader__stars" id="story-reader-stars"></div>
          <p class="story-reader__trip" id="story-reader-trip" hidden></p>
          <blockquote class="story-reader__text" id="story-reader-text"></blockquote>
          <footer class="story-reader__author">
            <span class="story-reader__avatar" id="story-reader-avatar"></span>
            <div>
              <strong id="story-reader-title"></strong>
              <span id="story-reader-sub">TRAVELRAYZ traveler</span>
            </div>
          </footer>
          <div class="story-reader__nav">
            <button type="button" class="story-reader__nav-btn" data-story-prev>Previous</button>
            <span class="story-reader__count" id="story-reader-count"></span>
            <button type="button" class="story-reader__nav-btn" data-story-next>Next</button>
          </div>
        </div>`;
      document.body.appendChild(root);
    }
    this.reader = root;
  },

  buildAuthorPhoto(t, size = 44) {
    const wrap = TR.el('span', 'voice-card__avatar');
    if (t.photo && typeof SheetsAPI !== 'undefined') {
      const img = document.createElement('img');
      img.alt = t.name || 'Traveler';
      img.width = size;
      img.height = size;
      img.loading = 'lazy';
      img.decoding = 'async';
      SheetsAPI.applyDriveImg(img, t.photo, '', { width: 96, upgradeWidth: 200 });
      wrap.appendChild(img);
      return wrap;
    }
    if (t.photo) {
      const img = document.createElement('img');
      img.src = t.photo;
      img.alt = t.name || 'Traveler';
      img.width = size;
      img.height = size;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      wrap.appendChild(img);
      return wrap;
    }
    const initial = TR.el('span', 'voice-card__initial', (t.name || 'T').charAt(0));
    initial.setAttribute('aria-hidden', 'true');
    wrap.appendChild(initial);
    return wrap;
  },

  buildStars(rating, className = 'voice-card__stars') {
    const value = Math.min(5, Math.max(0, Math.round((Number(rating) || 5) * 2) / 2));
    const wrap = TR.el('div', className);
    wrap.setAttribute('aria-label', `${value} out of 5 stars`);
    const full = Math.floor(value);
    const half = value % 1 === 0.5;

    for (let i = 0; i < full; i += 1) {
      wrap.appendChild(TR.el('span', 'star', '★'));
    }
    if (half) {
      const halfStar = TR.el('span', 'star star--half', '★');
      halfStar.setAttribute('aria-hidden', 'true');
      wrap.appendChild(halfStar);
    }
    const filled = full + (half ? 1 : 0);
    for (let i = filled; i < 5; i += 1) {
      wrap.appendChild(TR.el('span', 'star star--empty', '★'));
    }

    const score = TR.el('span', 'voice-card__score', String(value));
    score.setAttribute('aria-hidden', 'true');
    wrap.appendChild(score);
    return wrap;
  },

  bindEvents() {
    if (this.eventsBound || !this.grid) return;
    this.eventsBound = true;

    this.grid.addEventListener('click', (e) => {
      const more = e.target.closest('[data-voice-more]');
      if (more) {
        this.visibleCount = Math.min(this.items.length, this.visibleCount + this.PAGE_SIZE);
        this.render();
        if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
        return;
      }

      const openBtn = e.target.closest('[data-voice-open]');
      if (!openBtn) return;
      const index = Number(openBtn.dataset.voiceOpen);
      if (Number.isNaN(index)) return;
      this.openReader(index);
    });

    this.reader.addEventListener('click', (e) => {
      if (e.target.closest('[data-story-close]')) {
        this.closeReader();
        return;
      }
      if (e.target.closest('[data-story-prev]')) {
        this.openReader(this.activeIndex - 1);
        return;
      }
      if (e.target.closest('[data-story-next]')) {
        this.openReader(this.activeIndex + 1);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!this.reader || this.reader.hidden) return;
      if (e.key === 'Escape') this.closeReader();
      if (e.key === 'ArrowLeft') this.openReader(this.activeIndex - 1);
      if (e.key === 'ArrowRight') this.openReader(this.activeIndex + 1);
    });
  },

  openReader(index) {
    if (!this.items.length) return;
    const total = this.items.length;
    const next = ((index % total) + total) % total;
    const t = this.items[next];
    this.activeIndex = next;
    this.ensureReader();

    const stars = this.reader.querySelector('#story-reader-stars');
    const trip = this.reader.querySelector('#story-reader-trip');
    const text = this.reader.querySelector('#story-reader-text');
    const title = this.reader.querySelector('#story-reader-title');
    const sub = this.reader.querySelector('#story-reader-sub');
    const avatar = this.reader.querySelector('#story-reader-avatar');
    const count = this.reader.querySelector('#story-reader-count');

    TR.clearChildren(stars);
    stars.appendChild(this.buildStars(t.rating, 'voice-card__stars'));
    text.textContent = String(t.text || '').trim();
    title.textContent = t.name || 'Traveler';
    sub.textContent = t.trip || 'Shared a TRAVELRAYZ journey';
    count.textContent = `${next + 1} / ${total}`;

    if (t.trip) {
      trip.hidden = false;
      trip.textContent = t.trip;
    } else {
      trip.hidden = true;
      trip.textContent = '';
    }

    TR.clearChildren(avatar);
    avatar.className = 'story-reader__avatar';
    const photo = this.buildAuthorPhoto(t, 52);
    while (photo.firstChild) avatar.appendChild(photo.firstChild);

    this.reader.hidden = false;
    document.documentElement.classList.add('modal-open');
    this.reader.querySelector('.story-reader__close')?.focus();
  },

  closeReader() {
    if (!this.reader || this.reader.hidden) return;
    this.reader.hidden = true;
    document.documentElement.classList.remove('modal-open');
    this.activeIndex = -1;
  },

  renderCard(t, index) {
    const full = String(t.text || '').trim();
    const maxLen = this.PREVIEW_LENS[index % this.PREVIEW_LENS.length];
    const preview = this.preview(full, maxLen);
    const long = full.length > preview.length + 2;
    const size = maxLen >= 190 ? 'tall' : maxLen <= 120 ? 'short' : 'mid';

    const card = TR.el('article', 'voice-card testimonial-card');
    card.dataset.reveal = '';
    card.dataset.size = size;

    card.appendChild(this.buildStars(t.rating));
    if (t.trip) card.appendChild(TR.el('p', 'voice-card__trip', t.trip));

    const quote = document.createElement('blockquote');
    quote.className = 'voice-card__quote';
    quote.textContent = preview;
    card.appendChild(quote);

    if (long) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'voice-card__open';
      btn.dataset.voiceOpen = String(index);
      btn.textContent = 'Read full story';
      card.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'voice-card__open voice-card__open--quiet';
      btn.dataset.voiceOpen = String(index);
      btn.textContent = 'View';
      btn.setAttribute('aria-label', `View story from ${t.name || 'traveler'}`);
      card.appendChild(btn);
    }

    const author = TR.el('footer', 'voice-card__author');
    author.appendChild(this.buildAuthorPhoto(t));
    const who = TR.el('div');
    who.appendChild(TR.el('strong', '', t.name || 'Traveler'));
    who.appendChild(TR.el('span', '', 'TRAVELRAYZ traveler'));
    author.appendChild(who);
    card.appendChild(author);

    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      this.openReader(index);
    });

    return card;
  },

  render() {
    TR.clearChildren(this.grid);
    this.grid.classList.remove('story-trail');
    this.grid.classList.add('voice-board');

    if (!this.items.length) {
      const empty = TR.el('p', 'gallery-empty', 'No traveler stories yet. Check back soon.');
      this.grid.appendChild(empty);
      return;
    }

    const avg =
      this.items.reduce((sum, t) => sum + (Number(t.rating) || 5), 0) / this.items.length;

    const head = TR.el('div', 'voice-board__head');
    head.dataset.reveal = '';
    head.appendChild(TR.el('p', 'voice-board__kicker', 'Traveler voices'));
    head.appendChild(
      TR.el(
        'p',
        'voice-board__meta',
        `${this.items.length} stories · ${avg.toFixed(1).replace(/\.0$/, '')}★ average`
      )
    );
    this.grid.appendChild(head);

    const list = TR.el('div', 'voice-board__grid');
    this.masonryGrid = list;
    this.items.slice(0, this.visibleCount).forEach((t, index) => {
      list.appendChild(this.renderCard(t, index));
    });
    this.grid.appendChild(list);

    if (this.visibleCount < this.items.length) {
      const actions = TR.el('div', 'voice-board__actions');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.dataset.voiceMore = '';
      btn.textContent = `Show more stories (${this.items.length - this.visibleCount} left)`;
      actions.appendChild(btn);
      this.grid.appendChild(actions);
    }

    this.scheduleMasonry();
  }
};
