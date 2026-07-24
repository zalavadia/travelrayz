/**
 * TRAVELRAYZ — Trip cards, filters, modal, share, PDF
 */
const TripsUI = {
  trips: [],
  filtered: [],
  activeFilter: 'all',
  searchQuery: '',

  async init(options = {}) {
    this.grid = TR.qs(options.grid || '#trips-grid');
    this.modal = TR.qs('#trip-modal');
    if (!this.grid) return;

    this.trips = await SheetsAPI.fetchTrips();
    this.filtered = [...this.trips];
    this.bindToolbar();
    this.render();
    this.initCountdowns();
  },

  bindToolbar() {
    const search = TR.qs('#trip-search');
    if (search) {
      search.addEventListener(
        'input',
        TR.debounce((e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this.applyFilters();
        }, 200)
      );
    }

    TR.qsa('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        TR.qsa('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.dataset.filter || 'all';
        this.applyFilters();
      });
    });
  },

  applyFilters() {
    this.filtered = this.trips.filter((t) => {
      const cat = (t.category || '').toLowerCase();
      const matchCat =
        this.activeFilter === 'all' ||
        cat.includes(this.activeFilter.toLowerCase()) ||
        (this.activeFilter === 'featured' && TR.parseBool(t.featured)) ||
        (this.activeFilter === 'trending' && TR.parseBool(t.trending));

      const hay = `${t.tripName} ${t.destination} ${t.category}`.toLowerCase();
      const matchSearch = !this.searchQuery || hay.includes(this.searchQuery);
      return matchCat && matchSearch;
    });
    this.render();
  },

  render() {
    if (!this.grid) return;
    if (!this.filtered.length) {
      this.grid.innerHTML = `<div class="trips-empty">No trips found. Check back soon or contact us for custom tours.</div>`;
      return;
    }

    this.grid.innerHTML = this.filtered.map((t) => this.cardHTML(t)).join('');
    this.bindCards();
    this.initTilt();
  },

  cardHTML(t) {
    const badges = [];
    if (TR.parseBool(t.trending)) badges.push('<span class="badge badge-trending">Trending</span>');
    if (TR.parseBool(t.featured)) badges.push('<span class="badge badge-featured">Featured</span>');
    if (TR.parseBool(t.limitedSeats) || Number(t.seats) <= 8) {
      badges.push('<span class="badge badge-limited">Limited Seats</span>');
    }

    const cd = TR.countdown(t.travelDate);
    const poster = t.poster || 'assets/images/maharashtra-3-jyotirlinga-poster.png';

    return `
      <article class="trip-card" data-id="${TR.sanitize(t.id)}">
        <div class="trip-poster">
          <img src="${TR.sanitize(poster)}" alt="${TR.sanitize(t.tripName)}" loading="lazy" width="600" height="400">
          <div class="trip-badges">${badges.join('')}</div>
        </div>
        <div class="trip-body">
          <div class="trip-category">${TR.sanitize(t.category || 'Tour')}</div>
          <h3>${TR.sanitize(t.tripName)}</h3>
          <div class="trip-meta">
            <span>📍 ${TR.sanitize(t.destination)}</span>
            <span>⏱ ${TR.sanitize(t.duration)}</span>
            <span>${TR.sanitize(t.difficulty)}</span>
            <span>🪑 ${TR.sanitize(t.seats)} seats</span>
          </div>
          <div class="trip-footer">
            <div class="trip-price">${TR.formatINR(t.price)} <small>/ head</small></div>
            <button class="btn btn-primary btn-sm book-btn" type="button">Book Now</button>
          </div>
          ${cd ? `<div class="countdown" data-date="${TR.sanitize(t.travelDate)}">${cd.label}</div>` : ''}
        </div>
      </article>`;
  },

  bindCards() {
    TR.qsa('.trip-card', this.grid).forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.book-btn')) {
          const trip = this.trips.find((t) => t.id === card.dataset.id);
          if (trip) this.openBooking(trip);
          return;
        }
        this.openModal(card.dataset.id);
      });
    });
  },

  openBooking(trip) {
    const raw = (trip.bookingLink || '').trim();
    const hasLink = raw && !/^(na|n\/a|none|-)$/i.test(raw);
    const link = hasLink
      ? raw
      : TR.whatsappUrl(
          TRAVELRAYZ_CONFIG.company.whatsapp,
          `Hi TRAVELRAYZ! I want to book: ${trip.tripName}`
        );
    window.open(link, '_blank', 'noopener');
  },

  openModal(id) {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip || !this.modal) return;

    const inclusions = TR.splitList(trip.inclusions);
    const exclusions = TR.splitList(trip.exclusions || 'Personal expenses | Extra activities');
    const poster = trip.poster || 'assets/images/maharashtra-3-jyotirlinga-poster.png';

    this.modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" type="button" aria-label="Close">✕</button>
        <div class="modal-hero">
          <img src="${TR.sanitize(poster)}" alt="${TR.sanitize(trip.tripName)}">
        </div>
        <div class="modal-content">
          <div class="trip-category">${TR.sanitize(trip.category)}</div>
          <h2 id="modal-title">${TR.sanitize(trip.tripName)}</h2>
          <p>${TR.sanitize(trip.description)}</p>
          <div class="modal-meta">
            <span>📍 ${TR.sanitize(trip.destination)}</span>
            <span>⏱ ${TR.sanitize(trip.duration)}</span>
            <span>📅 ${TR.sanitize(trip.travelDate)}</span>
            <span>${TR.sanitize(trip.vehicle)}</span>
            <span>${TR.sanitize(trip.difficulty)}</span>
            <span>🪑 ${TR.sanitize(trip.seats)} seats left</span>
          </div>
          <div class="modal-grid">
            <div class="modal-block">
              <h4>Inclusions</h4>
              <ul>${inclusions.map((i) => `<li>${TR.sanitize(i)}</li>`).join('')}</ul>
            </div>
            <div class="modal-block">
              <h4>Exclusions</h4>
              <ul>${exclusions.map((i) => `<li>${TR.sanitize(i)}</li>`).join('')}</ul>
            </div>
            <div class="modal-block">
              <h4>Pickup Points</h4>
              <p>${TR.sanitize(trip.pickupPoints || 'Shared on booking confirmation')}</p>
            </div>
            <div class="modal-block">
              <h4>Itinerary</h4>
              <p>${TR.sanitize(trip.itinerary || 'Detailed itinerary shared after booking.')}</p>
            </div>
          </div>
          <div class="modal-actions">
            <div class="modal-price">${TR.formatINR(trip.price)} <small>/ head</small></div>
            <button class="btn btn-primary" type="button" data-action="book">Book Now</button>
            <button class="btn btn-dark" type="button" data-action="whatsapp">WhatsApp</button>
            <button class="btn btn-dark" type="button" data-action="share">Share</button>
            <button class="btn btn-dark" type="button" data-action="copy">Copy Link</button>
            <button class="btn btn-dark" type="button" data-action="pdf">Download PDF</button>
          </div>
        </div>
      </div>`;

    this.modal.classList.add('open');
    document.documentElement.classList.add('modal-open');

    TR.qs('.modal-close', this.modal).addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    TR.qs('[data-action="book"]', this.modal).addEventListener('click', () => this.openBooking(trip));
    TR.qs('[data-action="whatsapp"]', this.modal).addEventListener('click', () => this.openBooking(trip));
    TR.qs('[data-action="share"]', this.modal).addEventListener('click', () => this.shareTrip(trip));
    TR.qs('[data-action="copy"]', this.modal).addEventListener('click', () => this.copyLink(trip));
    TR.qs('[data-action="pdf"]', this.modal).addEventListener('click', () => this.downloadPDF(trip));
  },

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('open');
    document.documentElement.classList.remove('modal-open');
  },

  async shareTrip(trip) {
    const url = `${location.origin}${location.pathname}#trip-${trip.id}`;
    const data = {
      title: trip.tripName,
      text: `${trip.tripName} — ${TR.formatINR(trip.price)} | TRAVELRAYZ`,
      url
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (_) {}
    } else {
      this.copyLink(trip);
    }
  },

  async copyLink(trip) {
    const url = `${location.origin}${location.pathname}#trip-${trip.id}`;
    try {
      await navigator.clipboard.writeText(url);
      TR.toast('Link copied!');
    } catch (_) {
      TR.toast(url);
    }
  },

  downloadPDF(trip) {
    const win = window.open('', '_blank');
    if (!win) {
      TR.toast('Allow popups to download itinerary');
      return;
    }
    const inclusions = TR.splitList(trip.inclusions).map((i) => `<li>${TR.sanitize(i)}</li>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>${TR.sanitize(trip.tripName)} — Itinerary</title>
      <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#1e293b;line-height:1.6}
      h1{font-size:1.6rem} .meta{color:#64748b;font-size:.95rem} .price{font-size:1.4rem;color:#38bdf8}</style>
      </head><body>
      <h1>${TR.sanitize(trip.tripName)}</h1>
      <p class="meta">${TR.sanitize(trip.destination)} · ${TR.sanitize(trip.duration)} · ${TR.sanitize(trip.travelDate)}</p>
      <p>${TR.sanitize(trip.description)}</p>
      <p class="price">${TR.formatINR(trip.price)} / head</p>
      <h3>Inclusions</h3><ul>${inclusions}</ul>
      <h3>Itinerary</h3><p>${TR.sanitize(trip.itinerary || '')}</p>
      <h3>Vehicle</h3><p>${TR.sanitize(trip.vehicle)}</p>
      <hr><p>TRAVELRAYZ — Travel to Divine. Return with Peace.<br>
      ${TR.sanitize(TRAVELRAYZ_CONFIG.company.phone)} / ${TR.sanitize(TRAVELRAYZ_CONFIG.company.phone2)}</p>
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`);
    win.document.close();
  },

  initTilt() {
    if (window.matchMedia('(hover: none)').matches) return;
    TR.qsa('.trip-card', this.grid).forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const rx = ((y - r.height / 2) / r.height) * -8;
        const ry = ((x - r.width / 2) / r.width) * 8;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  },

  initCountdowns() {
    setInterval(() => {
      TR.qsa('.countdown').forEach((el) => {
        const cd = TR.countdown(el.dataset.date);
        if (cd) el.textContent = cd.label;
      });
    }, 60000);
  }
};
