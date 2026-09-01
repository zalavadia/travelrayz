/**
 * TRAVELRAYZ — Trip listing, detail page, filters (Sheets API)
 * User content from Google Sheets is rendered with textContent / safe DOM only.
 */
const TripsUI = {
  DEFAULT_POSTER: 'assets/images/maharashtra-3-jyotirlinga-poster.png',

  trips: [],
  filtered: [],
  loadError: null,

  searchQuery: '',
  categoryFilter: '',
  upcomingFilter: 'all',
  featuredOnly: false,
  sortBy: 'date-asc',
  activeFilter: 'all',

  limit: 0,
  isFullListing: false,

  async init(options = {}) {
    this.grid = TR.qs(options.grid || '#trips-grid');
    this.errorPanel = TR.qs('#trips-error');
    this.errorMsg = TR.qs('#trips-error-msg');
    this.limit = Number(options.limit) > 0 ? Number(options.limit) : 0;
    this.isFullListing = document.body.dataset.page === 'trips';
    if (!this.grid) return;

    const params = new URLSearchParams(location.search);
    this.activeFilter = options.filter || params.get('filter') || 'all';
    if (this.activeFilter === 'featured') this.featuredOnly = true;

    this.showSkeleton(this.limit || 6);
    try {
      this.trips = await SheetsAPI.fetchTrips({ strict: this.isFullListing });
      this.loadError = null;
      this.hideListError();
    } catch (err) {
      this.loadError = err.message || 'Could not load trips.';
      this.trips = [];
      this.showListError(this.loadError);
      return;
    }

    this.bindToolbar();
    this.syncFilterPills();
    this.applyFilters();
    if (this.limit && !this.filtered.length && this.activeFilter === 'featured') {
      this.activeFilter = 'all';
      this.featuredOnly = false;
      this.applyFilters();
    }
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  syncFilterPills() {
    TR.qsa('.filter-pill').forEach((p) => {
      p.classList.toggle('active', (p.dataset.filter || 'all') === this.activeFilter);
    });
  },

  showSkeleton(count = 6) {
    if (!this.grid) return;
    const n = Math.min(Math.max(count, 3), 8);
    this.grid.classList.add('is-content-loading');
    this.grid.classList.remove('hidden');
    this.grid.setAttribute('aria-busy', 'true');
    TR.clearChildren(this.grid);
    for (let i = 0; i < n; i += 1) {
      const card = TR.el('article', 'trip-card is-skeleton');
      card.setAttribute('aria-hidden', 'true');
      const poster = TR.el('div', 'trip-poster skeleton-shimmer');
      const body = TR.el('div', 'trip-body');
      body.appendChild(TR.el('div', 'sk-line sk-line--short skeleton-shimmer'));
      body.appendChild(TR.el('div', 'sk-line sk-line--title skeleton-shimmer'));
      body.appendChild(TR.el('div', 'sk-line skeleton-shimmer'));
      body.appendChild(TR.el('div', 'sk-line sk-line--short skeleton-shimmer'));
      card.append(poster, body);
      this.grid.appendChild(card);
    }
  },

  showListError(msg) {
    if (this.errorPanel) {
      TR.setText(this.errorMsg, msg);
      this.errorPanel.classList.remove('hidden');
    }
    if (this.grid) {
      this.grid.classList.add('hidden');
      this.grid.removeAttribute('aria-busy');
    }
  },

  hideListError() {
    this.errorPanel?.classList.add('hidden');
    this.grid?.classList.remove('hidden');
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

    TR.qs('#trips-retry')?.addEventListener('click', () => this.init({ limit: this.limit }));

    TR.qsa('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        TR.qsa('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.dataset.filter || 'all';
        this.featuredOnly = this.activeFilter === 'featured';
        this.applyFilters();
      });
    });
  },

  applyFilters() {
    this.filtered = this.trips.filter((t) => {
      const hay = `${t.tripName || ''} ${t.destination || ''}`.toLowerCase();
      if (this.searchQuery && !hay.includes(this.searchQuery)) return false;
      if (this.categoryFilter && t.category !== this.categoryFilter) return false;

      const upcoming = TR.isUpcomingTrip(t);
      if (this.upcomingFilter === 'upcoming' && !upcoming) return false;
      if (this.upcomingFilter === 'past' && upcoming) return false;

      if (this.featuredOnly || this.activeFilter === 'featured') {
        if (!TR.parseBool(t.featured)) return false;
      } else if (!this.matchLegacyFilter(t)) {
        return false;
      }

      return true;
    });

    this.sortFiltered();
    this.render();
  },

  matchLegacyFilter(t) {
    if (this.activeFilter === 'all' || !this.activeFilter) return true;
    const cat = (t.category || '').toLowerCase();
    if (this.activeFilter === 'featured') return TR.parseBool(t.featured);
    if (this.activeFilter === 'trending') return TR.parseBool(t.trending);
    return cat.includes(this.activeFilter.toLowerCase());
  },

  sortFiltered() {
    const byDate = (a, b) => {
      const da = TR.parseDate(a.travelDate);
      const db = TR.parseDate(b.travelDate);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    };
    const byPrice = (a, b) => TR.effectivePrice(a) - TR.effectivePrice(b);

    switch (this.sortBy) {
      case 'date-desc':
        this.filtered.sort((a, b) => -byDate(a, b));
        break;
      case 'price-asc':
        this.filtered.sort(byPrice);
        break;
      case 'price-desc':
        this.filtered.sort((a, b) => -byPrice(a, b));
        break;
      default:
        this.filtered.sort(byDate);
    }
  },

  render() {
    if (!this.grid) return;
    this.grid.classList.remove('is-content-loading');
    this.grid.removeAttribute('aria-busy');

    TR.clearChildren(this.grid);

    if (!this.filtered.length) {
      const empty = TR.el('div', 'trips-empty');
      TR.setText(
        empty,
        this.trips.length
          ? 'No trips match your filters. Try adjusting search or filters.'
          : 'No trips are published yet. Check back soon or contact us for custom tours.'
      );
      this.grid.appendChild(empty);
      return;
    }

    const list = this.limit ? this.filtered.slice(0, this.limit) : this.filtered;
    list.forEach((trip) => this.grid.appendChild(this.buildTripCard(trip)));
    this.grid.classList.add('content-enter');
    this.bindCards();
    this.initTilt();
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  appendBadge(parent, label, className) {
    const span = TR.el('span', `badge ${className}`, label);
    parent.appendChild(span);
  },

  posterImg(trip, className) {
    const img = document.createElement('img');
    img.className = className || '';
    img.alt = trip.tripName || 'Trip cover';
    img.loading = 'lazy';
    img.width = 600;
    img.height = 400;
    img.src = trip.poster || this.DEFAULT_POSTER;
    img.addEventListener('error', () => {
      img.src = this.DEFAULT_POSTER;
    });
    return img;
  },

  buildPriceBlock(trip, className) {
    const wrap = TR.el('div', className || 'trip-price');
    const price = Number(String(trip.price || '').replace(/[^\d.]/g, '')) || 0;
    const disc = Number(String(trip.discountedPrice || '').replace(/[^\d.]/g, '')) || 0;

    if (disc > 0 && disc < price) {
      const old = TR.el('span', 'trip-price-old', TR.formatINR(price));
      wrap.appendChild(old);
      wrap.appendChild(document.createTextNode(` ${TR.formatINR(disc)} `));
    } else {
      wrap.appendChild(document.createTextNode(`${TR.formatINR(price)} `));
    }
    const small = TR.el('small', '', '/ head');
    wrap.appendChild(small);
    return wrap;
  },

  buildTripCard(trip) {
    const article = TR.el('article', 'trip-card');
    article.dataset.id = trip.id;

    const posterWrap = TR.el('div', 'trip-poster');
    posterWrap.appendChild(this.posterImg(trip));

    const badges = TR.el('div', 'trip-badges');
    if (TR.parseBool(trip.featured)) this.appendBadge(badges, 'Featured', 'badge-featured');
    if (TR.isSoldOut(trip)) this.appendBadge(badges, 'Sold Out', 'badge-soldout');
    if (badges.childElementCount) posterWrap.appendChild(badges);

    const body = TR.el('div', 'trip-body');
    body.appendChild(TR.el('div', 'trip-category', trip.category || 'Tour'));
    body.appendChild(TR.el('h3', '', trip.tripName || 'Untitled trip'));

    const meta = TR.el('div', 'trip-meta');
    if (trip.destination) {
      const loc = TR.el('span', '', '');
      loc.appendChild(document.createTextNode(`📍 ${trip.destination}`));
      meta.appendChild(loc);
    }
    if (trip.travelDate) {
      const start = TR.el('span', '', '');
      start.appendChild(document.createTextNode(`📅 ${TR.formatDateIN(trip.travelDate)}`));
      meta.appendChild(start);
    }
    if (trip.endDate) {
      const end = TR.el('span', '', '');
      end.appendChild(document.createTextNode(`→ ${TR.formatDateIN(trip.endDate)}`));
      meta.appendChild(end);
    }
    if (trip.duration) {
      meta.appendChild(TR.el('span', '', `⏱ ${trip.duration}`));
    }
    if (trip.seats != null && trip.seats !== '') {
      const seatsLabel = TR.isSoldOut(trip) ? 'Sold out' : `${trip.seats} seats left`;
      meta.appendChild(TR.el('span', '', `🪑 ${seatsLabel}`));
    }
    body.appendChild(meta);

    const shortDesc = trip.shortDescription || (trip.description || '').slice(0, 160);
    body.appendChild(TR.el('p', 'trip-card-desc', shortDesc));

    const footer = TR.el('div', 'trip-footer');
    footer.appendChild(this.buildPriceBlock(trip));

    const actions = TR.el('div', 'trip-card-actions');
    const detailsBtn = TR.el('button', 'btn btn-outline btn-sm trip-details-btn', 'View Details');
    detailsBtn.type = 'button';
    const bookBtn = TR.el('button', 'btn btn-primary btn-sm trip-book-btn', TR.isSoldOut(trip) ? 'Enquire' : 'Book Now');
    bookBtn.type = 'button';
    actions.append(detailsBtn, bookBtn);
    footer.appendChild(actions);
    body.appendChild(footer);

    article.append(posterWrap, body);
    return article;
  },

  tripUrl(trip) {
    if (!trip || !trip.id) return 'trips.html';
    return `trip-details.html?id=${encodeURIComponent(trip.id)}`;
  },

  tripBookingMessage(trip) {
    const title = trip.tripName || 'this trip';
    const start = TR.formatDateIN(trip.travelDate) || 'the scheduled date';
    return `Hello TRAVELRAYZ, I am interested in ${title} starting on ${start}. Please share booking details.`;
  },

  openBooking(trip) {
    const wa = TRAVELRAYZ_CONFIG.company.whatsapp;
    window.open(TR.whatsappUrl(wa, this.tripBookingMessage(trip)), '_blank', 'noopener');
  },

  bindCards() {
    TR.qsa('.trip-card', this.grid).forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const trip = this.trips.find((t) => String(t.id) === card.dataset.id);
        if (trip) window.location.href = this.tripUrl(trip);
      });
      card.querySelector('.trip-details-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const trip = this.trips.find((t) => String(t.id) === card.dataset.id);
        if (trip) window.location.href = this.tripUrl(trip);
      });
      card.querySelector('.trip-book-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const trip = this.trips.find((t) => String(t.id) === card.dataset.id);
        if (trip) this.openBooking(trip);
      });
    });
  },

  /* ── Trip detail page ── */

  async initDetail() {
    this.detailRoot = TR.qs('#trip-detail');
    if (!this.detailRoot) return;

    const id = new URLSearchParams(location.search).get('id')?.trim();
    if (!id) {
      this.renderDetailError(
        'No trip selected',
        'Open a trip from the Trips page or use a link with a valid trip id.',
        false
      );
      return;
    }

    this.renderDetailLoading();

    try {
      const trip = await SheetsAPI.fetchTripById(id, { strict: true });
      if (!trip) {
        this.renderDetailError(
          'Trip not found',
          'This trip may be unpublished, removed, or the link is incorrect.',
          true
        );
        return;
      }

      let related = [];
      try {
        const all = await SheetsAPI.fetchTrips({ strict: false });
        related = all
          .filter((t) => String(t.id) !== String(trip.id))
          .filter((t) => !trip.category || t.category === trip.category)
          .slice(0, 3);
        if (related.length < 3) {
          const extra = all
            .filter((t) => String(t.id) !== String(trip.id) && !related.some((r) => r.id === t.id))
            .slice(0, 3 - related.length);
          related = related.concat(extra);
        }
      } catch (_) {
        related = [];
      }

      this.renderDetail(trip, related);
      document.title = `${trip.tripName} | TRAVELRAYZ`;
      const desc = TR.qs('meta[name="description"]');
      if (desc) {
        desc.setAttribute(
          'content',
          `${trip.tripName} — ${trip.destination || 'TRAVELRAYZ trip'}. ${TR.formatINR(TR.effectivePrice(trip))} per head.`
        );
      }
      const crumb = TR.qs('.breadcrumb [aria-current="page"]');
      if (crumb) TR.setText(crumb, trip.tripName || 'Details');
      if (typeof Motion !== 'undefined') Motion.refreshReveal(this.detailRoot);
    } catch (err) {
      this.renderDetailError(
        'Could not load trip',
        err.message || 'Network error. Check your connection and try again.',
        true,
        () => this.initDetail()
      );
    }
  },

  renderDetailLoading() {
    TR.clearChildren(this.detailRoot);
    const wrap = TR.el('div', 'trip-detail-loading');
    const logo = document.createElement('img');
    logo.src = 'assets/images/logo-mark.png';
    logo.alt = '';
    logo.width = 56;
    logo.height = 56;
    logo.className = 'trip-detail-loading-logo';
    wrap.appendChild(logo);
    wrap.appendChild(TR.el('p', '', 'Loading trip details…'));
    this.detailRoot.appendChild(wrap);
  },

  renderDetailError(title, message, showBrowse, onRetry) {
    TR.clearChildren(this.detailRoot);
    const box = TR.el('div', 'error-state');
    box.appendChild(TR.el('span', 'error-state__icon', '✦'));
    box.appendChild(TR.el('h2', 'trip-detail-error-title', title));
    box.appendChild(TR.el('p', '', message));
    const actions = TR.el('div', 'trip-detail-error-actions');
    if (onRetry) {
      const retry = TR.el('button', 'btn btn-primary', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', onRetry);
      actions.appendChild(retry);
    }
    if (showBrowse) {
      const link = TR.el('a', 'btn btn-outline', 'Browse Trips');
      link.href = 'trips.html';
      actions.appendChild(link);
    }
    box.appendChild(actions);
    this.detailRoot.appendChild(box);
  },

  appendMetaItem(parent, icon, text) {
    if (!text) return;
    const span = TR.el('span', '', '');
    span.appendChild(document.createTextNode(`${icon} ${text}`));
    parent.appendChild(span);
  },

  appendListSection(parent, title, items, listClass) {
    if (!items.length) return;
    const block = TR.el('div', 'modal-block');
    block.appendChild(TR.el('h2', '', title));
    const ul = TR.el('ul', listClass || '');
    items.forEach((item) => {
      ul.appendChild(TR.el('li', '', item));
    });
    block.appendChild(ul);
    parent.appendChild(block);
  },

  renderDetail(trip, related = []) {
    TR.clearChildren(this.detailRoot);

    const article = TR.el('article', 'trip-detail');
    article.dataset.reveal = '';

    const hero = TR.el('div', 'trip-detail-hero');
    hero.appendChild(this.posterImg(trip));
    const heroBadges = TR.el('div', 'trip-badges');
    if (TR.parseBool(trip.featured)) this.appendBadge(heroBadges, 'Featured', 'badge-featured');
    if (TR.isSoldOut(trip)) this.appendBadge(heroBadges, 'Sold Out', 'badge-soldout');
    if (heroBadges.childElementCount) hero.appendChild(heroBadges);
    article.appendChild(hero);

    const body = TR.el('div', 'trip-detail-body');
    body.appendChild(TR.el('p', 'trip-category', trip.category || 'Tour'));
    body.appendChild(TR.el('h1', '', trip.tripName || 'Trip'));

    const meta = TR.el('div', 'modal-meta trip-detail-meta');
    this.appendMetaItem(meta, '📍', trip.destination);
    if (trip.travelDate) {
      const dateRange = trip.endDate
        ? `${TR.formatDateIN(trip.travelDate)} – ${TR.formatDateIN(trip.endDate)}`
        : TR.formatDateIN(trip.travelDate);
      this.appendMetaItem(meta, '📅', dateRange);
    }
    this.appendMetaItem(meta, '⏱', trip.duration);
    this.appendMetaItem(meta, '📌', trip.pickupPoints || 'Shared on booking confirmation');
    const seatsText = TR.isSoldOut(trip)
      ? 'Sold out'
      : trip.seats != null && trip.seats !== ''
        ? `${trip.seats} seats remaining`
        : '';
    this.appendMetaItem(meta, '🪑', seatsText);
    body.appendChild(meta);

    const pricing = TR.el('div', 'trip-detail-pricing');
    pricing.appendChild(this.buildPriceBlock(trip, 'modal-price'));
    body.appendChild(pricing);

    const fullDesc = trip.description || trip.shortDescription || '';
    if (fullDesc) {
      const descWrap = TR.el('div', 'trip-detail-desc');
      fullDesc.split(/\n+/).filter(Boolean).forEach((para) => {
        descWrap.appendChild(TR.el('p', '', para.trim()));
      });
      body.appendChild(descWrap);
    }

    const grid = TR.el('div', 'modal-grid');
    this.appendListSection(grid, 'Inclusions', TR.splitList(trip.inclusions));
    this.appendListSection(grid, 'Exclusions', TR.splitList(trip.exclusions));
    body.appendChild(grid);

    const itineraryItems = TR.splitList(trip.itinerary);
    if (itineraryItems.length) {
      const itBlock = TR.el('div', 'modal-block trip-detail-itinerary');
      itBlock.appendChild(TR.el('h2', '', 'Day-wise itinerary'));
      const ol = TR.el('ol', 'itinerary-list');
      itineraryItems.forEach((day) => ol.appendChild(TR.el('li', '', day)));
      itBlock.appendChild(ol);
      body.appendChild(itBlock);
    }

    if (trip.importantNotes) {
      const notes = TR.el('div', 'modal-block trip-detail-notes');
      notes.appendChild(TR.el('h2', '', 'Important notes'));
      trip.importantNotes.split(/\n+/).filter(Boolean).forEach((line) => {
        notes.appendChild(TR.el('p', '', line.trim()));
      });
      body.appendChild(notes);
    }

    const actions = TR.el('div', 'trip-detail-actions modal-actions');
    const waBtn = TR.el('a', 'btn btn-primary', 'Book on WhatsApp');
    waBtn.href = TR.whatsappUrl(TRAVELRAYZ_CONFIG.company.whatsapp, this.tripBookingMessage(trip));
    waBtn.target = '_blank';
    waBtn.rel = 'noopener';
    const contactBtn = TR.el('a', 'btn btn-outline', 'Contact us');
    contactBtn.href = 'contact.html';
    actions.append(waBtn, contactBtn);
    body.appendChild(actions);

    article.appendChild(body);
    this.detailRoot.appendChild(article);

    if (related.length) {
      const section = TR.el('section', 'trip-detail-related');
      section.appendChild(TR.el('h2', '', 'Related trips'));
      const gridRel = TR.el('div', 'trips-grid trips-grid--related');
      related.forEach((t) => {
        const mini = this.buildTripCard(t);
        mini.classList.add('trip-card--mini');
        gridRel.appendChild(mini);
      });
      section.appendChild(gridRel);
      this.detailRoot.appendChild(section);
      this.bindRelatedCards(related, gridRel);
    }

    const contactCta = TR.el('section', 'trip-detail-contact');
    contactCta.appendChild(TR.el('h2', '', 'Need help planning?'));
    contactCta.appendChild(
      TR.el(
        'p',
        '',
        'Our team is based in Mumbai and happy to answer questions about dates, pickups, and group bookings.'
      )
    );
    const ctaActions = TR.el('div', 'trip-detail-contact-actions');
    const waCta = TR.el('a', 'btn btn-primary', `WhatsApp ${TRAVELRAYZ_CONFIG.company.whatsappDisplay || '+91 72084 53777'}`);
    waCta.href = TR.whatsappUrl(TRAVELRAYZ_CONFIG.company.whatsapp, this.tripBookingMessage(trip));
    waCta.target = '_blank';
    waCta.rel = 'noopener';
    const phoneCta = TR.el('a', 'btn btn-outline', TRAVELRAYZ_CONFIG.company.phoneDisplay || '+91 72083 58868');
    phoneCta.href = `tel:+91${TRAVELRAYZ_CONFIG.company.phone}`;
    ctaActions.append(waCta, phoneCta);
    contactCta.appendChild(ctaActions);
    this.detailRoot.appendChild(contactCta);
  },

  bindRelatedCards(related, grid) {
    TR.qsa('.trip-card', grid).forEach((card) => {
      const trip = related.find((t) => String(t.id) === card.dataset.id);
      if (!trip) return;
      card.querySelector('.trip-details-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = this.tripUrl(trip);
      });
      card.querySelector('.trip-book-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBooking(trip);
      });
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        window.location.href = this.tripUrl(trip);
      });
    });
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
  }
};
