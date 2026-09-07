/**
 * TRAVELRAYZ — Traveler Stories from Google Sheets (admin Testimonials)
 * Public page shows only real reviews uploaded in Admin. No demo fallbacks.
 */
const TestimonialsUI = {
  async init() {
    this.grid = TR.qs('#testimonials-grid');
    if (!this.grid) return;

    this.grid.classList.add('is-content-loading');
    this.grid.setAttribute('aria-busy', 'true');

    let remote = [];
    if (typeof SheetsAPI !== 'undefined' && SheetsAPI.configured()) {
      try {
        remote = await SheetsAPI.fetchTestimonials();
      } catch (err) {
        console.warn('[TRAVELRAYZ] Testimonials API unavailable.', err);
      }
    }

    const seen = new Set();
    this.items = remote.filter((item) => {
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
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  buildAuthorPhoto(t) {
    const wrap = TR.el('span', 'testimonial-avatar');
    if (t.photo && typeof SheetsAPI !== 'undefined') {
      const img = document.createElement('img');
      img.alt = t.name || 'Traveler';
      img.width = 48;
      img.height = 48;
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
      img.width = 48;
      img.height = 48;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      wrap.appendChild(img);
      return wrap;
    }
    const initial = TR.el('span', 'testimonial-initial', (t.name || 'T').charAt(0));
    initial.setAttribute('aria-hidden', 'true');
    wrap.appendChild(initial);
    return wrap;
  },

  render() {
    TR.clearChildren(this.grid);

    if (!this.items.length) {
      const empty = TR.el('p', 'gallery-empty', 'No traveler stories yet. Check back soon.');
      this.grid.appendChild(empty);
      return;
    }

    this.items.forEach((t) => {
      const card = TR.el('article', 'testimonial-card');
      card.dataset.reveal = '';
      card.appendChild(TR.el('div', 'testimonial-stars', '★'.repeat(Math.min(5, Math.max(1, t.rating || 5)))));
      card.appendChild(TR.el('p', '', `“${t.text}”`));

      const author = TR.el('div', 'testimonial-author');
      author.appendChild(this.buildAuthorPhoto(t));
      const meta = TR.el('div');
      meta.appendChild(TR.el('strong', '', t.name || 'Traveler'));
      if (t.trip) meta.appendChild(TR.el('span', '', t.trip));
      author.appendChild(meta);
      card.appendChild(author);
      this.grid.appendChild(card);
    });
  }
};
