/**
 * TRAVELRAYZ — Testimonials from Google Sheets, with static fallback
 */
const TestimonialsUI = {
  fallback: [
    {
      name: 'Priya Sharma',
      trip: 'Mumbai · Jyotirlinga Yatra',
      text: 'The 3 Jyotirlinga yatra was beautifully organized. Luxury Urbania, pure veg food, and a calm trip leader — felt premium yet soulful.',
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
      text: 'Spiritual yatra with zero stress. Darshan timings, hotel quality, and the Urbania travel — all top notch.',
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

    let remote = [];
    if (typeof SheetsAPI !== 'undefined') {
      remote = await SheetsAPI.fetchTestimonials();
    }
    this.items = remote.length ? remote : this.fallback;
    this.render();
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  render() {
    this.grid.innerHTML = this.items
      .map((t) => {
        const stars = '★'.repeat(Math.min(5, Math.max(1, t.rating || 5)));
        const photo = t.photo
          ? `<img src="${TR.sanitize(t.photo)}" alt="${TR.sanitize(t.name)}" width="48" height="48" loading="lazy">`
          : `<span class="testimonial-initial" aria-hidden="true">${TR.sanitize((t.name || 'T').charAt(0))}</span>`;
        return `
      <article class="testimonial-card">
        <div class="testimonial-stars">${stars}</div>
        <p>“${TR.sanitize(t.text)}”</p>
        <div class="testimonial-author">
          ${photo}
          <div><strong>${TR.sanitize(t.name)}</strong><span>${TR.sanitize(t.trip || '')}</span></div>
        </div>
      </article>`;
      })
      .join('');
  }
};
