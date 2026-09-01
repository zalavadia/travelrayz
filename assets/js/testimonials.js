/**
 * TRAVELRAYZ — Testimonials from Google Sheets, with static fallback
 */
const TestimonialsUI = {
  fallback: [
    {
      name: 'Priya Sharma',
      trip: 'Mumbai · Jyotirlinga Yatra',
      text: 'The 3 Jyotirlinga yatra was beautifully organized. Comfortable group travel, quality meals, and a calm trip leader — felt premium yet soulful.',
      rating: 5,
      photo: ''
    },
    {
      name: 'Arjun Mehta',
      trip: 'Pune · Weekend Trek',
      text: "Best weekend trek I've done. Safety first, great group vibes, and views that stay with you.",
      rating: 5,
      photo: ''
    },
    {
      name: 'Neha Patil',
      trip: 'Thane · Family Tour',
      text: 'Family trip was seamless. Kids loved camping, elders loved the comfort. TRAVELRAYZ handled everything.',
      rating: 5,
      photo: ''
    },
    {
      name: 'Rahul Desai',
      trip: 'Nashik · Camping Tour',
      text: 'Camping under the stars was magical. Bonfire, music, and hot dinner — everything was perfectly arranged.',
      rating: 5,
      photo: ''
    },
    {
      name: 'Sunita Kulkarni',
      trip: 'Kolhapur · Spiritual Tour',
      text: 'Spiritual yatra with zero stress. Darshan timings, hotel quality, and comfortable travel — all top notch.',
      rating: 5,
      photo: ''
    },
    {
      name: 'Vikram Joshi',
      trip: 'Aurangabad · Adventure Tour',
      text: 'Booked through WhatsApp, got instant confirmation. The team is responsive and genuinely cares about your experience.',
      rating: 5,
      photo: ''
    }
  ],

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
    this.items = [...remote, ...this.fallback].filter((item) => {
      const key = `${item.name || ''}|${item.text || ''}`.toLowerCase();
      if (!key || key === '|' || seen.has(key)) return false;
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
      const empty = TR.el('p', 'gallery-empty', 'No testimonials yet. Check back soon.');
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
