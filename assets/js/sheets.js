/**
 * TRAVELRAYZ — Google Sheets CMS client
 * Talks to Apps Script Web App (GET public · POST JSON as text/plain).
 *
 * Admin credentials: sessionStorage only (never in config.js).
 */
const SheetsAPI = {
  ADMIN_USER_KEY: 'travelrayz_admin_user_id',
  ADMIN_PASSWORD_KEY: 'travelrayz_admin_password',
  ADMIN_AUTH_KEY: 'travelrayz_admin_auth',

  FALLBACK_TRIPS: [
    {
      id: 'demo-1',
      title: 'Maharashtra 3 Jyotirlinga Yatra',
      image: 'assets/images/hero-spiritual.jpg',
      location: 'Bhimashankar, Grishneshwar, Trimbakeshwar',
      category: 'Spiritual Yatras',
      fullDescription:
        'A spiritually enriching journey visiting three sacred Jyotirlingas with luxury Urbania travel and pure veg meals.',
      duration: '2 Days / 2 Nights',
      startDate: '2026-07-31T21:00:00',
      price: '7999',
      seats: '12',
      meetingPoint: 'Mumbai / Thane (confirmed on booking)',
      inclusions: '["Luxury Urbania Travel","1 Night Hotel Stay","Pure Veg Meals","Trip Leader & First Aid"]',
      exclusions: '["Personal expenses","Extra meals","Temple donations"]',
      itinerary: '["Day 0: Departure 9 PM","Day 1: Bhimashankar Darshan","Day 2: Grishneshwar & Trimbakeshwar"]',
      whatsappNumber: '917208453777',
      featured: 'Yes',
      soldOut: 'No',
      status: 'published'
    }
  ],

  configured() {
    const url = TRAVELRAYZ_CONFIG.sheetsApiUrl;
    return !!(url && !url.includes('YOUR_GOOGLE'));
  },

  endpoint() {
    if (!this.configured()) {
      throw new Error('Configure sheetsApiUrl in config.js first.');
    }
    return TRAVELRAYZ_CONFIG.sheetsApiUrl;
  },

  timeoutMs() {
    return Number(TRAVELRAYZ_CONFIG.requestTimeoutMs) || 30000;
  },

  getAdminCredentials() {
    try {
      return {
        userId: sessionStorage.getItem(this.ADMIN_USER_KEY) || '',
        password: sessionStorage.getItem(this.ADMIN_PASSWORD_KEY) || ''
      };
    } catch (_) {
      return { userId: '', password: '' };
    }
  },

  setAdminCredentials(userId, password) {
    sessionStorage.setItem(this.ADMIN_USER_KEY, userId);
    sessionStorage.setItem(this.ADMIN_PASSWORD_KEY, password);
    sessionStorage.setItem(this.ADMIN_AUTH_KEY, '1');
  },

  clearAdminCredentials() {
    sessionStorage.removeItem(this.ADMIN_USER_KEY);
    sessionStorage.removeItem(this.ADMIN_PASSWORD_KEY);
    sessionStorage.removeItem(this.ADMIN_AUTH_KEY);
    sessionStorage.removeItem('travelrayz_admin_secret');
  },

  hasAdminCredentials() {
    const { userId, password } = this.getAdminCredentials();
    return !!(userId && password);
  },

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  },

  unwrap(json) {
    if (json && json.success === false) {
      throw new Error(json.message || 'Request failed');
    }
    if (json && json.success === true) {
      return json.data != null ? json.data : {};
    }
    /* Legacy flat responses */
    if (json && json.error) throw new Error(json.error);
    return json;
  },

  rowsOf(data) {
    if (Array.isArray(data)) return data;
    if (data && data.trips) return data.trips;
    if (data && data.items) return data.items;
    return [];
  },

  parseListField(value) {
    const raw = value != null ? String(value).trim() : '';
    if (!raw) return '';
    if (raw.startsWith('[')) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.join(' | ');
      } catch (_) {}
    }
    return raw;
  },

  listToJsonField(value) {
    if (value == null || value === '') return '[]';
    if (Array.isArray(value)) return JSON.stringify(value);
    const s = String(value).trim();
    if (s.startsWith('[')) return s;
    return JSON.stringify(
      s.split(/\||\n/).map((p) => p.trim()).filter(Boolean)
    );
  },

  extractDriveId(urlOrId) {
    const s = String(urlOrId || '').trim();
    if (!s) return '';
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s) && !s.includes('/')) return s;
    const m =
      s.match(/[?&]id=([^&]+)/) ||
      s.match(/lh3\.googleusercontent\.com\/d\/([^?/=]+)/) ||
      s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : '';
  },

  driveImageUrl(id, width = 640) {
    return `https://lh3.googleusercontent.com/d/${id}=w${width}`;
  },

  driveThumbUrl(id, width = 400) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
  },

  resolveImageUrl(urlOrId, width = 640) {
    const s = String(urlOrId || '').trim();
    if (!s) return '';
    if (s.startsWith('assets/') || s.startsWith('/') || s.startsWith('data:')) return s;
    const id = this.extractDriveId(s);
    if (id) return this.driveImageUrl(id, width);
    return s;
  },

  imageProxyUrl(urlOrId) {
    const id = this.extractDriveId(urlOrId);
    if (!id || !this.configured()) return '';
    return `${this.endpoint()}?action=getImage&id=${encodeURIComponent(id)}`;
  },

  applyDriveImg(img, urlOrId, fallback = 'assets/images/logo-mark.png', options = {}) {
    const { width = 640, upgradeWidth = 960, eager = false } = options;
    const id = this.extractDriveId(urlOrId);

    img.referrerPolicy = 'no-referrer';
    if (eager) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }

    const posterWrap = img.closest('.trip-poster, .trip-detail-hero, .gallery-item');

    const setLoading = (on) => {
      img.classList.toggle('is-img-loading', on);
      posterWrap?.classList.toggle('is-poster-loading', on);
    };

    if (!id) {
      if (fallback) img.src = fallback;
      return;
    }

    const fast = this.driveThumbUrl(id, Math.min(width, 420));
    const target = this.driveImageUrl(id, width);
    const upgrade = upgradeWidth > width ? this.driveImageUrl(id, upgradeWidth) : '';
    let stage = 'fast';

    const preloadUpgrade = () => {
      if (!upgrade || img.dataset.imgUpgraded === '1') return;
      img.dataset.imgUpgraded = '1';
      const hi = new Image();
      hi.referrerPolicy = 'no-referrer';
      hi.onload = () => {
        if (img.isConnected) img.src = upgrade;
      };
      hi.src = upgrade;
    };

    img.addEventListener('load', () => {
      setLoading(false);
      if (stage === 'fast' && img.src.includes('thumbnail')) {
        img.src = target;
        stage = 'target';
        return;
      }
      preloadUpgrade();
    });

    img.addEventListener('error', () => {
      if (stage === 'fast') {
        stage = 'target';
        img.src = target;
        return;
      }
      if (stage === 'target') {
        const proxy = this.imageProxyUrl(id);
        if (proxy) {
          stage = 'proxy';
          img.src = proxy;
          return;
        }
      }
      setLoading(false);
      if (fallback) {
        img.src = fallback;
        img.classList.add('is-fallback');
      }
    });

    setLoading(true);
    img.src = fast;
  },

  whatsappLink(number, tripTitle) {
    const digits = String(number || TRAVELRAYZ_CONFIG.company.whatsapp || '').replace(/\D/g, '');
    if (!digits) return '';
    const text = encodeURIComponent(
      tripTitle ? `Hi TRAVELRAYZ! I want to book: ${tripTitle}` : 'Hi TRAVELRAYZ! I want to plan a trip.'
    );
    return `https://wa.me/${digits}?text=${text}`;
  },

  /** Map sheet row (new or legacy schema) → UI trip object */
  normalizeTrip(row, index = 0) {
    const get = (...keys) => {
      for (const k of keys) {
        if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
      }
      return '';
    };

    const title = get('title', 'Trip Name', 'tripName', 'name');
    const statusRaw = get('status', 'Status').toLowerCase();
    const published = statusRaw === 'published' || statusRaw === 'active' || statusRaw === 'open';
    const featured = get('featured', 'Featured');
    const soldOut = get('soldOut', 'Limited Seats', 'limitedSeats');
    const whatsapp = get('whatsappNumber') || TRAVELRAYZ_CONFIG.company.whatsapp;

    return {
      id: get('id', 'ID') || String(index + 1),
      slug: get('slug'),
      tripName: title,
      poster: this.resolveImageUrl(get('driveFileId') || get('image', 'Poster', 'poster')),
      destination: get('location', 'Destination', 'destination'),
      category: get('category', 'Category'),
      description: get('fullDescription', 'shortDescription', 'Description', 'description'),
      shortDescription: get('shortDescription'),
      duration: get('duration', 'Duration'),
      travelDate: get('startDate', 'Travel Date', 'travelDate'),
      endDate: get('endDate'),
      price: get('price', 'Price'),
      discountedPrice: get('discountedPrice'),
      seats: get('seats', 'Seats'),
      maxGroupSize: get('maxGroupSize'),
      inclusions: this.parseListField(get('inclusions', 'Inclusions') || row.inclusionsList),
      exclusions: this.parseListField(get('exclusions', 'Exclusions') || row.exclusionsList),
      pickupPoints: get('meetingPoint', 'Pickup Points', 'pickupPoints'),
      itinerary: this.parseListField(get('itinerary', 'Itinerary') || row.itineraryList),
      importantNotes: get('importantNotes'),
      bookingLink: get('bookingLink') || this.whatsappLink(whatsapp, title),
      whatsappNumber: whatsapp,
      driveFileId: get('driveFileId'),
      trending: get('Trending', 'trending'),
      featured,
      soldOut,
      status: published ? 'Active' : get('status', 'Status') || 'Draft',
      limitedSeats: /^(yes|true|1)$/i.test(soldOut) ? 'Yes' : get('Limited Seats', 'limitedSeats') || 'No',
      difficulty: get('Difficulty', 'difficulty') || 'Moderate',
      vehicle: get('Vehicle', 'vehicle'),
      createdAt: get('createdAt'),
      updatedAt: get('updatedAt')
    };
  },

  /** Map admin/UI trip → API payload (new schema) */
  toApiTrip(trip) {
    const t = trip || {};
    const title = t.title || t.tripName || '';
    const status = String(t.status || 'draft').toLowerCase();
    const normalizedStatus =
      status === 'active' ? 'published' : status === 'inactive' ? 'draft' : status || 'draft';

    return {
      id: t.id,
      slug: t.slug,
      title,
      location: t.location || t.destination || '',
      meetingPoint: t.meetingPoint || t.pickupPoints || '',
      category: t.category || '',
      startDate: t.startDate || t.travelDate || '',
      endDate: t.endDate || '',
      duration: t.duration || '',
      price: t.price || '',
      discountedPrice: t.discountedPrice || '',
      seats: t.seats || '',
      maxGroupSize: t.maxGroupSize || '',
      shortDescription: t.shortDescription || (t.description || '').slice(0, 220),
      fullDescription: t.fullDescription || t.description || '',
      inclusions: this.listToJsonField(t.inclusions),
      exclusions: this.listToJsonField(t.exclusions),
      itinerary: this.listToJsonField(t.itinerary),
      importantNotes: t.importantNotes || [t.difficulty, t.vehicle].filter(Boolean).join(' · '),
      image: t.image || t.poster || '',
      driveFileId: t.driveFileId || this.extractDriveId(t.image || t.poster) || '',
      whatsappNumber: t.whatsappNumber || TRAVELRAYZ_CONFIG.company.whatsapp || '',
      featured: t.featured || 'No',
      soldOut: t.soldOut || t.limitedSeats || 'No',
      status: normalizedStatus
    };
  },

  normalizeGallery(row, index = 0) {
    const get = (...keys) => {
      for (const k of keys) {
        if (row[k] != null && String(row[k]).trim() !== '') return row[k];
      }
      return '';
    };
    return {
      id: String(get('id', 'ID') || index + 1),
      src: this.resolveImageUrl(get('src', 'Src', 'url', 'URL')),
      alt: get('alt', 'Alt') || 'TRAVELRAYZ journey photo',
      status: get('status', 'Status') || 'Active'
    };
  },

  normalizeTestimonial(row, index = 0) {
    const get = (...keys) => {
      for (const k of keys) {
        if (row[k] != null && String(row[k]).trim() !== '') return row[k];
      }
      return '';
    };
    return {
      id: String(get('id', 'ID') || index + 1),
      name: get('name', 'Name'),
      text: get('text', 'Text'),
      rating: Number(get('rating', 'Rating')) || 5,
      photo: this.resolveImageUrl(get('photo', 'Photo'), 200),
      trip: get('trip', 'Trip'),
      status: get('status', 'Status') || 'Active'
    };
  },

  isActive(status) {
    const s = String(status || '').toLowerCase();
    return !s || s === 'active' || s === 'published' || s === 'open';
  },

  async get(action, extra = '') {
    const res = await this.fetchWithTimeout(`${this.endpoint()}?action=${encodeURIComponent(action)}${extra}`);
    if (!res.ok) throw new Error('Fetch failed');
    return this.unwrap(await res.json());
  },

  async post(payload, { admin = false } = {}) {
    const body = { ...payload };
    if (admin) {
      const { userId, password } = this.getAdminCredentials();
      if (!userId || !password) throw new Error('Admin login required — log in again');
      body.adminUserId = userId;
      body.adminPassword = password;
    }
    const res = await this.fetchWithTimeout(this.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Request failed');
    return this.unwrap(await res.json());
  },

  async validateAdmin(userId, password) {
    return this.post({ action: 'validateAdmin', adminUserId: userId, adminPassword: password });
  },

  async getPublishedTripsData() {
    try {
      return await this.get('getPublishedTrips');
    } catch (_) {
      return await this.get('getTrips');
    }
  },

  async fetchTrips(options = {}) {
    const { strict = false } = options;
    if (!this.configured()) {
      return this.FALLBACK_TRIPS.map((t, i) => this.normalizeTrip(t, i));
    }
    try {
      const data = await this.getPublishedTripsData();
      const trips = this.rowsOf(data).map((r, i) => this.normalizeTrip(r, i));
      return trips.filter((t) => this.isActive(t.status));
    } catch (err) {
      console.warn('[TRAVELRAYZ] Sheets unavailable.', err);
      if (strict) throw new Error(err.message || 'Could not load trips. Check your connection and try again.');
      return this.FALLBACK_TRIPS.map((t, i) => this.normalizeTrip(t, i));
    }
  },

  async fetchTripById(id, options = {}) {
    const { strict = false } = options;
    if (!id) {
      if (strict) throw new Error('Trip id is required');
      return null;
    }
    if (!this.configured()) {
      const trip = this.FALLBACK_TRIPS.find((t) => String(t.id) === String(id));
      return trip ? this.normalizeTrip(trip) : null;
    }
    try {
      try {
        const data = await this.get('getTrip', `&id=${encodeURIComponent(id)}`);
        const row = data.trip || data;
        if (row && (row.title || row.tripName || row['Trip Name'])) {
          const trip = this.normalizeTrip(row);
          return this.isActive(trip.status) ? trip : null;
        }
      } catch (_) {
        /* Legacy deployments only expose getTrips — fall through */
      }

      const data = await this.getPublishedTripsData();
      const trip = this.rowsOf(data)
        .map((r, i) => this.normalizeTrip(r, i))
        .find((t) => String(t.id) === String(id));

      if (!trip || !this.isActive(trip.status)) return null;
      return trip;
    } catch (err) {
      console.warn('[TRAVELRAYZ] Trip fetch failed.', err);
      if (strict) throw new Error(err.message || 'Could not load trip details. Check your connection and try again.');
      return null;
    }
  },

  async getAllAdmin() {
    if (!this.configured()) {
      return this.FALLBACK_TRIPS.map((t, i) => this.normalizeTrip(t, i));
    }
    const data = await this.post({ action: 'getAllTrips' }, { admin: true });
    return this.rowsOf(data).map((r, i) => this.normalizeTrip(r, i));
  },

  async saveTrip(trip, method = 'create') {
    const apiTrip = this.toApiTrip(trip);
    if (method === 'delete') {
      return this.post({ action: 'deleteTrip', trip: { id: trip.id } }, { admin: true });
    }
    if (method === 'update') {
      return this.post({ action: 'updateTrip', trip: apiTrip }, { admin: true });
    }
    return this.post({ action: 'createTrip', trip: apiTrip }, { admin: true });
  },

  async publishTrip(id) {
    return this.post({ action: 'publishTrip', trip: { id } }, { admin: true });
  },

  async unpublishTrip(id) {
    return this.post({ action: 'unpublishTrip', trip: { id } }, { admin: true });
  },

  async saveInquiry(inquiry) {
    return this.post({ action: 'saveInquiry', inquiry });
  },

  async uploadImage(dataUrl, filename = 'image.jpg', replaceFileId = '') {
    const raw = String(dataUrl || '');
    const match = raw.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const data = match ? match[2] : raw.replace(/^data:[^,]*,/, '');
    if (!data) throw new Error('No image data to upload');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(mimeType.toLowerCase())) {
      throw new Error('Allowed formats: JPG, JPEG, PNG, WEBP');
    }

    const result = await this.post(
      {
        action: 'uploadImage',
        replaceFileId: replaceFileId || '',
        file: { data, mimeType, filename }
      },
      { admin: true }
    );

    if (!result.url) throw new Error('Upload did not return a Drive URL');
    return result;
  },

  async deleteImage(fileId) {
    return this.post({ action: 'deleteImage', fileId }, { admin: true });
  },

  async fetchGallery(all = false) {
    if (!this.configured()) return [];
    try {
      const data = await this.get('getGallery', all ? '&all=1' : '');
      const items = this.rowsOf(data).map((r, i) => this.normalizeGallery(r, i));
      return all ? items : items.filter((item) => this.isActive(item.status) && item.src);
    } catch (err) {
      console.warn('[TRAVELRAYZ] Gallery unavailable.', err);
      return [];
    }
  },

  async addGalleryItem(item) {
    return this.post({ action: 'addGallery', item }, { admin: true });
  },

  async deleteGalleryItem(item) {
    return this.post({ action: 'deleteGallery', item }, { admin: true });
  },

  async fetchTestimonials(all = false) {
    if (!this.configured()) return [];
    try {
      const data = await this.get('getTestimonials', all ? '&all=1' : '');
      const items = this.rowsOf(data).map((r, i) => this.normalizeTestimonial(r, i));
      return all ? items : items.filter((item) => this.isActive(item.status) && item.text);
    } catch (err) {
      console.warn('[TRAVELRAYZ] Testimonials unavailable.', err);
      return [];
    }
  },

  async addTestimonial(item) {
    return this.post({ action: 'addTestimonial', item }, { admin: true });
  },

  async deleteTestimonial(item) {
    return this.post({ action: 'deleteTestimonial', item }, { admin: true });
  }
};
