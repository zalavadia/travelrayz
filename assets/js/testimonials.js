/**
 * TRAVELRAYZ — Traveler Stories
 * Data: assets/js/testimonials-data.js + Google Sheets (via admin Testimonials)
 * Layout: echo-trail of pull quotes with expandable full stories
 */
const TestimonialsUI = {
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

    this.grid.classList.remove('is-content-loading');
    this.grid.removeAttribute('aria-busy');
    this.render();
    this.bindExpand();
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  pullQuote(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const sentence = clean.match(/^.{24,168}?[.!?…](?:\s|$)/);
    if (sentence) return sentence[0].trim();
    if (clean.length <= 150) return clean;
    return `${clean.slice(0, 148).replace(/\s+\S*$/, '')}…`;
  },

  needsExpand(full, pull) {
    return String(full || '').replace(/\s+/g, ' ').trim().length > String(pull || '').length + 12;
  },

  buildAuthorPhoto(t) {
    const wrap = TR.el('span', 'story-echo__avatar');
    if (t.photo && typeof SheetsAPI !== 'undefined') {
      const img = document.createElement('img');
      img.alt = t.name || 'Traveler';
      img.width = 52;
      img.height = 52;
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
      img.width = 52;
      img.height = 52;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      wrap.appendChild(img);
      return wrap;
    }
    const initial = TR.el('span', 'story-echo__initial', (t.name || 'T').charAt(0));
    initial.setAttribute('aria-hidden', 'true');
    wrap.appendChild(initial);
    return wrap;
  },

  buildStars(rating) {
    const value = Math.min(5, Math.max(0, Math.round((Number(rating) || 5) * 2) / 2));
    const wrap = TR.el('div', 'story-echo__stars');
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

    const score = TR.el('span', 'story-echo__score', String(value));
    score.setAttribute('aria-hidden', 'true');
    wrap.appendChild(score);
    return wrap;
  },

  bindExpand() {
    if (this.expandBound || !this.grid) return;
    this.expandBound = true;
    this.grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-story-expand]');
      if (!btn) return;
      const article = btn.closest('.story-echo');
      if (!article) return;
      const open = article.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Show less' : 'Read the full story';
    });
  },

  render() {
    TR.clearChildren(this.grid);
    this.grid.classList.add('story-trail');

    if (!this.items.length) {
      const empty = TR.el('p', 'gallery-empty', 'No traveler stories yet. Check back soon.');
      this.grid.appendChild(empty);
      return;
    }

    const avg =
      this.items.reduce((sum, t) => sum + (Number(t.rating) || 5), 0) / this.items.length;

    const intro = TR.el('div', 'story-trail__intro');
    intro.dataset.reveal = '';
    intro.appendChild(TR.el('p', 'story-trail__kicker', 'Echoes from the trail'));
    intro.appendChild(
      TR.el(
        'p',
        'story-trail__avg',
        `${this.items.length} voices · ${avg.toFixed(1).replace(/\.0$/, '')}★ average`
      )
    );
    this.grid.appendChild(intro);

    this.items.forEach((t, index) => {
      const full = String(t.text || '').trim();
      const pull = this.pullQuote(full);
      const expandable = this.needsExpand(full, pull);
      const side = index % 2 === 0 ? 'left' : 'right';
      const feature = index === 0;

      const article = TR.el(
        'article',
        `story-echo testimonial-card${feature ? ' story-echo--feature' : ''} story-echo--${side}`
      );
      article.dataset.reveal = '';
      article.style.setProperty('--echo-i', String(index));

      const marker = TR.el('div', 'story-echo__marker');
      marker.setAttribute('aria-hidden', 'true');
      marker.appendChild(TR.el('span', '', String(index + 1).padStart(2, '0')));
      article.appendChild(marker);

      const body = TR.el('div', 'story-echo__body');

      const meta = TR.el('div', 'story-echo__meta');
      meta.appendChild(this.buildStars(t.rating));
      if (t.trip) {
        meta.appendChild(TR.el('span', 'story-echo__trip', t.trip));
      }
      body.appendChild(meta);

      const quote = document.createElement('blockquote');
      quote.className = 'story-echo__pull';
      quote.textContent = pull;
      body.appendChild(quote);

      if (expandable) {
        const fullEl = TR.el('p', 'story-echo__full', full);
        fullEl.id = `story-full-${index}`;
        body.appendChild(fullEl);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'story-echo__more';
        btn.dataset.storyExpand = '';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', fullEl.id);
        btn.textContent = 'Read the full story';
        body.appendChild(btn);
      } else if (full && full !== pull) {
        body.appendChild(TR.el('p', 'story-echo__full is-always', full));
      }

      const author = TR.el('footer', 'story-echo__author');
      author.appendChild(this.buildAuthorPhoto(t));
      const who = TR.el('div', 'story-echo__who');
      who.appendChild(TR.el('strong', '', t.name || 'Traveler'));
      who.appendChild(TR.el('span', '', 'Shared a TRAVELRAYZ journey'));
      author.appendChild(who);
      body.appendChild(author);

      article.appendChild(body);
      this.grid.appendChild(article);
    });
  }
};
