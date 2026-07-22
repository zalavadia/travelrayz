/**
 * TRAVELRAYZ Admin Panel
 * Pure static CMS — auth via sessionStorage, trips via Google Sheets API,
 * gallery/testimonials/settings via localStorage.
 */
const AdminApp = {
  AUTH_KEY: 'travelrayz_admin_auth',
  GALLERY_KEY: 'travelrayz_gallery',
  TESTIMONIALS_KEY: 'travelrayz_testimonials',
  SETTINGS_KEY: 'travelrayz_settings',
  PASSWORD_KEY: 'travelrayz_admin_password',

  trips: [],
  filteredTrips: [],
  editingTripId: null,
  sheetsConfigured: false,

  /* ── Boot ── */
  init() {
    this.cacheDOM();
    this.bindAuth();
    this.bindNavigation();
    this.bindTrips();
    this.bindGallery();
    this.bindTestimonials();
    this.bindSettings();
    this.bindExport();

    if (this.isAuthenticated()) {
      this.showDashboard();
    }
  },

  cacheDOM() {
    this.loginScreen = document.getElementById('login-screen');
    this.dashboard = document.getElementById('dashboard');
    this.loginForm = document.getElementById('login-form');
    this.logoutBtn = document.getElementById('logout-btn');
    this.sheetsWarning = document.getElementById('sheets-warning');
    this.toastEl = document.getElementById('toast');
  },

  /* ── Auth ── */

  /** localStorage override takes precedence over config.js default */
  getAdminPassword() {
    return localStorage.getItem(this.PASSWORD_KEY) || TRAVELRAYZ_CONFIG.adminPassword;
  },

  isAuthenticated() {
    return sessionStorage.getItem(this.AUTH_KEY) === '1';
  },

  bindAuth() {
    this.loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('login-password');
      if (input.value === this.getAdminPassword()) {
        sessionStorage.setItem(this.AUTH_KEY, '1');
        input.value = '';
        this.showDashboard();
        this.toast('Welcome back!', 'success');
      } else {
        this.toast('Incorrect password', 'error');
        input.select();
      }
    });

    this.logoutBtn?.addEventListener('click', () => {
      sessionStorage.removeItem(this.AUTH_KEY);
      this.dashboard.classList.add('hidden');
      this.loginScreen.classList.remove('hidden');
      this.toast('Logged out');
    });
  },

  showDashboard() {
    this.loginScreen.classList.add('hidden');
    this.dashboard.classList.remove('hidden');
    this.checkSheetsConfig();
    this.loadTrips();
    this.renderGallery();
    this.renderTestimonials();
    this.loadSettingsForm();
  },

  checkSheetsConfig() {
    const url = TRAVELRAYZ_CONFIG.sheetsApiUrl;
    this.sheetsConfigured = !!(url && !url.includes('YOUR_GOOGLE'));
    this.sheetsWarning?.classList.toggle('hidden', this.sheetsConfigured);
  },

  /* ── Navigation ── */
  bindNavigation() {
    TR.qsa('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        TR.qsa('.nav-item').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        TR.qsa('.panel').forEach((p) => p.classList.remove('active'));
        document.getElementById(`panel-${panel}`)?.classList.add('active');
      });
    });
  },

  /* ── Trips ── */
  bindTrips() {
    document.getElementById('trip-add-btn')?.addEventListener('click', () => this.openTripForm());
    document.getElementById('trip-form')?.addEventListener('submit', (e) => this.saveTripForm(e));
    document.getElementById('trip-search')?.addEventListener('input', TR.debounce(() => this.filterTrips(), 200));
    document.getElementById('trip-filter-category')?.addEventListener('change', () => this.filterTrips());
    document.getElementById('trip-filter-status')?.addEventListener('change', () => this.filterTrips());

    /* Modal close handlers */
    TR.qsa('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => this.closeTripModal());
    });
  },

  async loadTrips() {
    try {
      this.trips = await SheetsAPI.getAllAdmin();
      this.populateCategoryFilter();
      this.filterTrips();
    } catch (err) {
      console.error(err);
      this.toast('Failed to load trips', 'error');
    }
  },

  populateCategoryFilter() {
    const select = document.getElementById('trip-filter-category');
    if (!select) return;
    const cats = [...new Set(this.trips.map((t) => t.category).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All categories</option>' +
      cats.map((c) => `<option value="${TR.sanitize(c)}">${TR.sanitize(c)}</option>`).join('');
  },

  filterTrips() {
    const search = (document.getElementById('trip-search')?.value || '').trim().toLowerCase();
    const category = document.getElementById('trip-filter-category')?.value || '';
    const status = document.getElementById('trip-filter-status')?.value || '';

    this.filteredTrips = this.trips.filter((t) => {
      const hay = `${t.tripName} ${t.destination} ${t.category}`.toLowerCase();
      const matchSearch = !search || hay.includes(search);
      const matchCat = !category || t.category === category;
      const matchStatus = !status || (t.status || 'Active') === status;
      return matchSearch && matchCat && matchStatus;
    });

    this.renderTripsTable();
  },

  renderTripsTable() {
    const tbody = document.getElementById('trips-tbody');
    if (!tbody) return;

    if (!this.filteredTrips.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No trips match your filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.filteredTrips.map((t) => {
      const statusClass = (t.status || 'Active').toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
      const dateStr = t.travelDate ? new Date(t.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      return `
        <tr data-id="${TR.sanitize(t.id)}">
          <td class="trip-name-cell">${TR.sanitize(t.tripName)}</td>
          <td>${TR.sanitize(t.destination)}</td>
          <td>${TR.sanitize(t.category || '—')}</td>
          <td>${dateStr}</td>
          <td>${TR.formatINR(t.price)}</td>
          <td><span class="status-badge ${statusClass}">${TR.sanitize(t.status || 'Active')}</span></td>
          <td class="table-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-edit="${TR.sanitize(t.id)}">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete="${TR.sanitize(t.id)}">Delete</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const trip = this.trips.find((t) => String(t.id) === btn.dataset.edit);
        if (trip) this.openTripForm(trip);
      });
    });

    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => this.deleteTrip(btn.dataset.delete));
    });
  },

  openTripForm(trip = null) {
    this.editingTripId = trip ? trip.id : null;
    const form = document.getElementById('trip-form');
    const title = document.getElementById('trip-form-title');
    title.textContent = trip ? 'Edit Trip' : 'Add Trip';
    form.reset();
    document.getElementById('trip-id').value = trip?.id || '';

    if (trip) {
      const fields = {
        'trip-name': trip.tripName,
        'trip-destination': trip.destination,
        'trip-poster': trip.poster,
        'trip-category': trip.category,
        'trip-duration': trip.duration,
        'trip-date': this.toDatetimeLocal(trip.travelDate),
        'trip-price': trip.price,
        'trip-seats': trip.seats,
        'trip-description': trip.description,
        'trip-vehicle': trip.vehicle,
        'trip-booking': trip.bookingLink,
        'trip-inclusions': trip.inclusions,
        'trip-exclusions': trip.exclusions,
        'trip-pickup': trip.pickupPoints,
        'trip-itinerary': trip.itinerary,
        'trip-difficulty': trip.difficulty || 'Moderate',
        'trip-trending': TR.parseBool(trip.trending) ? 'Yes' : 'No',
        'trip-featured': TR.parseBool(trip.featured) ? 'Yes' : 'No',
        'trip-status': trip.status || 'Active',
        'trip-limited': TR.parseBool(trip.limitedSeats) ? 'Yes' : 'No'
      };
      Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
      });
    }

    document.getElementById('trip-modal')?.classList.remove('hidden');
  },

  closeTripModal() {
    document.getElementById('trip-modal')?.classList.add('hidden');
    this.editingTripId = null;
  },

  /** Convert ISO/date string to datetime-local input value */
  toDatetimeLocal(val) {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  collectTripFromForm() {
    const g = (id) => document.getElementById(id)?.value?.trim() ?? '';
    return {
      id: g('trip-id') || undefined,
      tripName: g('trip-name'),
      destination: g('trip-destination'),
      poster: g('trip-poster'),
      category: g('trip-category'),
      duration: g('trip-duration'),
      travelDate: g('trip-date'),
      price: g('trip-price'),
      seats: g('trip-seats'),
      description: g('trip-description'),
      vehicle: g('trip-vehicle'),
      bookingLink: g('trip-booking'),
      inclusions: g('trip-inclusions'),
      exclusions: g('trip-exclusions'),
      pickupPoints: g('trip-pickup'),
      itinerary: g('trip-itinerary'),
      difficulty: g('trip-difficulty'),
      trending: g('trip-trending'),
      featured: g('trip-featured'),
      status: g('trip-status'),
      limitedSeats: g('trip-limited')
    };
  },

  async saveTripForm(e) {
    e.preventDefault();

    if (!this.sheetsConfigured) {
      this.toast('Configure sheetsApiUrl in config.js to save trips', 'error');
      return;
    }

    const trip = this.collectTripFromForm();
    const isUpdate = !!this.editingTripId;
    const btn = document.getElementById('trip-save-btn');

    try {
      btn.disabled = true;
      btn.textContent = 'Saving…';
      await SheetsAPI.saveTrip(trip, isUpdate ? 'update' : 'create');
      this.toast(isUpdate ? 'Trip updated successfully!' : 'Trip added successfully!', 'success');
      this.closeTripModal();
      await this.loadTrips();
    } catch (err) {
      console.error(err);
      this.toast(err.message || 'Save failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Trip';
    }
  },

  async deleteTrip(id) {
    if (!this.sheetsConfigured) {
      this.toast('Configure sheetsApiUrl to delete trips', 'error');
      return;
    }
    const trip = this.trips.find((t) => String(t.id) === String(id));
    if (!trip) return;
    if (!confirm(`Delete "${trip.tripName}"? This cannot be undone.`)) return;

    try {
      await SheetsAPI.saveTrip({ id: trip.id }, 'delete');
      this.toast('Trip deleted', 'success');
      await this.loadTrips();
    } catch (err) {
      console.error(err);
      this.toast('Delete failed', 'error');
    }
  },

  /* ── Gallery (localStorage) ── */
  bindGallery() {
    document.getElementById('gallery-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const src = document.getElementById('gallery-src').value.trim();
      const alt = document.getElementById('gallery-alt').value.trim();
      if (!src || !alt) return;

      const items = this.getGallery();
      items.push({ src, alt });
      this.saveGallery(items);
      document.getElementById('gallery-form').reset();
      this.renderGallery();
      this.toast('Image added to gallery', 'success');
    });
  },

  getGallery() {
    try {
      const raw = localStorage.getItem(this.GALLERY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveGallery(items) {
    localStorage.setItem(this.GALLERY_KEY, JSON.stringify(items));
  },

  renderGallery() {
    const list = document.getElementById('gallery-list');
    if (!list) return;
    const items = this.getGallery();

    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No gallery images yet. Add one above.</p>';
      return;
    }

    list.innerHTML = items.map((item, i) => `
      <div class="gallery-card">
        <img src="${TR.sanitize(item.src)}" alt="${TR.sanitize(item.alt)}" loading="lazy">
        <div class="gallery-card-info">${TR.sanitize(item.alt)}</div>
        <button type="button" class="btn btn-danger btn-sm" data-remove="${i}">Remove</button>
      </div>
    `).join('');

    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.remove);
        const updated = this.getGallery();
        updated.splice(idx, 1);
        this.saveGallery(updated);
        this.renderGallery();
        this.toast('Image removed');
      });
    });
  },

  /* ── Testimonials (localStorage) ── */
  bindTestimonials() {
    document.getElementById('testimonial-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const item = {
        name: document.getElementById('test-name').value.trim(),
        text: document.getElementById('test-text').value.trim(),
        rating: Number(document.getElementById('test-rating').value) || 5,
        photo: document.getElementById('test-photo').value.trim(),
        trip: document.getElementById('test-trip').value.trim()
      };
      const items = this.getTestimonials();
      items.push(item);
      this.saveTestimonials(items);
      document.getElementById('testimonial-form').reset();
      document.getElementById('test-rating').value = '5';
      this.renderTestimonials();
      this.toast('Testimonial added', 'success');
    });
  },

  getTestimonials() {
    try {
      const raw = localStorage.getItem(this.TESTIMONIALS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveTestimonials(items) {
    localStorage.setItem(this.TESTIMONIALS_KEY, JSON.stringify(items));
  },

  renderTestimonials() {
    const list = document.getElementById('testimonials-list');
    if (!list) return;
    const items = this.getTestimonials();

    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No testimonials yet.</p>';
      return;
    }

    list.innerHTML = items.map((t, i) => {
      const stars = '★'.repeat(Math.min(5, Math.max(1, t.rating || 5)));
      const photo = t.photo
        ? `<img src="${TR.sanitize(t.photo)}" alt="">`
        : '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Ccircle cx=%2224%22 cy=%2224%22 r=%2224%22 fill=%22%23132238%22/%3E%3Ctext x=%2224%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2218%22%3E👤%3C/text%3E%3C/svg%3E" alt="">';
      return `
        <div class="testimonial-card-admin">
          ${photo}
          <div class="content">
            <div class="stars">${stars}</div>
            <p>"${TR.sanitize(t.text)}"</p>
            <div class="meta"><strong>${TR.sanitize(t.name)}</strong>${t.trip ? ` · ${TR.sanitize(t.trip)}` : ''}</div>
          </div>
          <button type="button" class="btn btn-danger btn-sm" data-remove="${i}">Remove</button>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.remove);
        const updated = this.getTestimonials();
        updated.splice(idx, 1);
        this.saveTestimonials(updated);
        this.renderTestimonials();
        this.toast('Testimonial removed');
      });
    });
  },

  /* ── Settings (localStorage) ── */
  bindSettings() {
    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  },

  loadSettingsForm() {
    const c = TRAVELRAYZ_CONFIG.company;
    const map = {
      'set-name': c.name,
      'set-tagline': c.tagline,
      'set-phone': c.phone,
      'set-phone2': c.phone2,
      'set-whatsapp': c.whatsapp,
      'set-email': c.email,
      'set-address': c.address,
      'set-maps': c.mapsEmbed,
      'set-instagram': c.social?.instagram,
      'set-facebook': c.social?.facebook,
      'set-youtube': c.social?.youtube
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    });
  },

  saveSettings() {
    const g = (id) => document.getElementById(id)?.value?.trim() ?? '';
    const settings = {
      name: g('set-name'),
      tagline: g('set-tagline'),
      phone: g('set-phone'),
      phone2: g('set-phone2'),
      whatsapp: g('set-whatsapp'),
      email: g('set-email'),
      address: g('set-address'),
      mapsEmbed: g('set-maps'),
      social: {
        instagram: g('set-instagram'),
        facebook: g('set-facebook'),
        youtube: g('set-youtube')
      }
    };

    /* Nested social object merges correctly via Object.assign in config.js */
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify({
      name: settings.name,
      tagline: settings.tagline,
      phone: settings.phone,
      phone2: settings.phone2,
      whatsapp: settings.whatsapp,
      email: settings.email,
      address: settings.address,
      mapsEmbed: settings.mapsEmbed,
      social: settings.social
    }));

    /* Merge into live config so export reflects current values */
    Object.assign(TRAVELRAYZ_CONFIG.company, settings);
    if (settings.social) Object.assign(TRAVELRAYZ_CONFIG.company.social, settings.social);

    const newPass = g('set-admin-pass');
    if (newPass) {
      localStorage.setItem(this.PASSWORD_KEY, newPass);
      document.getElementById('set-admin-pass').value = '';
      this.toast('Settings & password saved!', 'success');
    } else {
      this.toast('Settings saved!', 'success');
    }
  },

  /* ── Export ── */
  bindExport() {
    document.getElementById('export-trips')?.addEventListener('click', () => {
      this.downloadJSON('travelrayz-trips.json', this.trips);
      this.toast('Trips JSON downloaded', 'success');
    });

    document.getElementById('export-settings')?.addEventListener('click', () => {
      const settings = {
        company: TRAVELRAYZ_CONFIG.company,
        adminPasswordOverride: !!localStorage.getItem(this.PASSWORD_KEY),
        exportedAt: new Date().toISOString()
      };
      this.downloadJSON('travelrayz-settings.json', settings);
      this.toast('Settings JSON downloaded', 'success');
    });
  },

  downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  /* ── Toast (admin-specific styling) ── */
  toast(msg, type = '') {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.className = 'toast show' + (type ? ` ${type}` : '');
    clearTimeout(this.toastEl._t);
    this.toastEl._t = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => AdminApp.init());
