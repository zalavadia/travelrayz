/**
 * TRAVELRAYZ Admin — trip CMS dashboard
 * Auth: ADMIN_SECRET validated via Apps Script, stored in sessionStorage only.
 */
const AdminApp = {
  AUTH_KEY: 'travelrayz_admin_auth',
  GALLERY_KEY: 'travelrayz_gallery',
  TESTIMONIALS_KEY: 'travelrayz_testimonials',
  SETTINGS_KEY: 'travelrayz_settings',

  trips: [],
  filteredTrips: [],
  editingTripId: null,
  editingDriveFileId: '',
  formSnapshot: '',
  slugManual: false,
  saving: false,
  uploading: false,
  sheetsConfigured: false,
  loadError: null,

  init() {
    this.cacheDOM();
    this.checkSheetsConfig();
    this.bindAuth();
    this.bindNavigation();
    this.bindUploads();
    this.bindTrips();
    this.bindGallery();
    this.bindTestimonials();
    this.bindSettings();
    this.bindExport();
    this.bindConfirmModal();

    if (this.isAuthenticated()) {
      this.showDashboard();
    } else {
      SheetsAPI.clearAdminSecret();
    }
  },

  cacheDOM() {
    this.loginScreen = document.getElementById('login-screen');
    this.dashboard = document.getElementById('dashboard');
    this.loginForm = document.getElementById('login-form');
    this.loginError = document.getElementById('login-error');
    this.logoutBtn = document.getElementById('logout-btn');
    this.sheetsWarning = document.getElementById('sheets-warning');
    this.toastEl = document.getElementById('toast');
    this.tripsError = document.getElementById('trips-error');
    this.tripsContent = document.getElementById('trips-content');
    this.tripsEmpty = document.getElementById('trips-empty');
    this.confirmModal = document.getElementById('confirm-modal');
  },

  /* ── Auth ── */

  isAuthenticated() {
    return sessionStorage.getItem(this.AUTH_KEY) === '1' && !!SheetsAPI.getAdminSecret();
  },

  bindAuth() {
    const toggle = document.getElementById('login-toggle-pw');
    const input = document.getElementById('login-password');
    toggle?.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.querySelector('.icon-eye')?.classList.toggle('hidden', show);
      toggle.querySelector('.icon-eye-off')?.classList.toggle('hidden', !show);
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    this.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.setLoginError('');
      const secret = (input?.value || '').trim();
      if (!secret) {
        this.setLoginError('Enter the admin secret.');
        return;
      }
      if (!this.sheetsConfigured) {
        this.setLoginError('Configure sheetsApiUrl in config.js first.');
        return;
      }
      this.setLoginLoading(true);
      try {
        await SheetsAPI.validateAdmin(secret);
        SheetsAPI.setAdminSecret(secret);
        input.value = '';
        this.showDashboard();
        this.toast('Welcome back!', 'success');
      } catch (err) {
        this.setLoginError(err.message || 'Incorrect admin secret. Please try again.');
        input.select();
      } finally {
        this.setLoginLoading(false);
      }
    });

    this.logoutBtn?.addEventListener('click', () => {
      SheetsAPI.clearAdminSecret();
      this.dashboard.classList.add('hidden');
      this.loginScreen.classList.remove('hidden');
      this.toast('Logged out');
    });
  },

  setLoginError(msg) {
    if (!this.loginError) return;
    if (msg) {
      this.loginError.textContent = msg;
      this.loginError.classList.remove('hidden');
    } else {
      this.loginError.textContent = '';
      this.loginError.classList.add('hidden');
    }
  },

  setLoginLoading(on) {
    const btn = document.getElementById('login-submit');
    if (!btn) return;
    btn.disabled = on;
    btn.querySelector('.btn-label').textContent = on ? 'Verifying…' : 'Enter Dashboard';
    btn.querySelector('.btn-spinner')?.classList.toggle('hidden', !on);
  },

  showDashboard() {
    this.loginScreen.classList.add('hidden');
    this.dashboard.classList.remove('hidden');
    this.checkSheetsConfig();
    this.loadTrips();
    this.migrateLocalMedia().finally(() => {
      this.renderGallery();
      this.renderTestimonials();
    });
    this.loadSettingsForm();
  },

  checkSheetsConfig() {
    this.sheetsConfigured = SheetsAPI.configured();
    this.sheetsWarning?.classList.toggle('hidden', this.sheetsConfigured);
  },

  /* ── Navigation ── */
  bindNavigation() {
    TR.qsa('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        TR.qsa('.nav-item').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        TR.qsa('.panel').forEach((p) => p.classList.remove('active'));
        document.getElementById(`panel-${btn.dataset.panel}`)?.classList.add('active');
      });
    });
  },

  /* ── Confirm modal ── */
  bindConfirmModal() {
    this.confirmModal?.querySelectorAll('[data-confirm-cancel]').forEach((el) => {
      el.addEventListener('click', () => {
        if (typeof this.confirmModal?._reject === 'function') {
          this.confirmModal._reject();
        } else {
          this.hideConfirm();
        }
      });
    });
  },

  confirm(message, title = 'Confirm action') {
    return new Promise((resolve) => {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      const ok = document.getElementById('confirm-ok');
      const handler = () => {
        ok.removeEventListener('click', handler);
        this.hideConfirm();
        resolve(true);
      };
      ok.addEventListener('click', handler);
      this.confirmModal?.classList.remove('hidden');
      this.confirmModal._reject = () => {
        ok.removeEventListener('click', handler);
        this.hideConfirm();
        resolve(false);
      };
    });
  },

  hideConfirm() {
    this.confirmModal?.classList.add('hidden');
  },

  /* ── Slug ── */
  slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'trip';
  },

  bindSlugAuto() {
    const title = document.getElementById('trip-title');
    const slug = document.getElementById('trip-slug');
    if (!title || !slug) return;
    title.addEventListener('input', () => {
      if (!this.slugManual) slug.value = this.slugify(title.value);
    });
    slug.addEventListener('input', () => {
      this.slugManual = slug.value.trim().length > 0;
    });
  },

  /* ── Uploads ── */
  bindUploads() {
    TR.qsa('[data-upload]').forEach((field) => this.setupUploadField(field));
  },

  setupUploadField(field) {
    const fileInput = field.querySelector('input[type="file"]');
    const triggers = field.querySelectorAll('[data-upload-trigger]');
    const clearBtn = field.querySelector('[data-upload-clear]');
    const drop = field.querySelector('.upload-drop');
    const preset = field.dataset.upload || '';

    const handleFile = async (file) => {
      if (!file || this.uploading) return;
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        this.toast('Allowed formats: JPG, JPEG, PNG, WEBP', 'error');
        return;
      }
      let workFile = file;
      if (file.size > 5 * 1024 * 1024) {
        this.toast('Compressing large image…');
        try {
          const dataUrl = await this.compressImage(file, this.uploadOptionsFor(preset));
          workFile = await this.dataUrlToFile(dataUrl, file.name);
        } catch (err) {
          this.toast(err.message || 'Could not compress image', 'error');
          return;
        }
      }
      if (workFile.size > 5 * 1024 * 1024) {
        this.toast('Image must be 5 MB or smaller after compression', 'error');
        return;
      }

      const previewUrl = URL.createObjectURL(workFile);
      this.setUploadPreview(field, previewUrl, workFile.name, workFile.size);

      if (preset === 'trip-cover') {
        try {
          this.uploading = true;
          this.setUploadProgress(field, 10, 'Compressing…');
          const dataUrl = await this.compressImage(workFile, this.uploadOptionsFor(preset));
          this.setUploadProgress(field, 45, 'Uploading to Drive…');
          const replaceId = this.editingDriveFileId || '';
          const uploaded = await this.ensureDriveUrl(dataUrl, workFile.name, replaceId, (pct) => {
            this.setUploadProgress(field, 45 + pct * 0.55, 'Uploading to Drive…');
          });
          document.getElementById('trip-poster').value = uploaded.url;
          document.getElementById('trip-drive-file-id').value = uploaded.driveFileId;
          this.editingDriveFileId = uploaded.driveFileId;
          this.setUploadPreview(field, uploaded.url, workFile.name, workFile.size);
          this.setUploadProgress(field, 100, 'Done');
          this.toast('Cover image uploaded', 'success');
        } catch (err) {
          this.toast(err.message || 'Upload failed', 'error');
        } finally {
          this.uploading = false;
          this.hideUploadProgress(field);
          URL.revokeObjectURL(previewUrl);
        }
      } else {
        try {
          const dataUrl = await this.compressImage(workFile, this.uploadOptionsFor(preset));
          const hidden = field.querySelector('input[type="hidden"]');
          if (hidden) hidden.value = dataUrl;
          this.setUploadPreview(field, previewUrl, workFile.name, workFile.size);
        } catch (err) {
          this.toast(err.message || 'Could not process image', 'error');
        }
      }
    };

    triggers.forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput?.click();
      });
    });

    fileInput?.addEventListener('change', async () => {
      await handleFile(fileInput.files?.[0]);
      fileInput.value = '';
    });

    clearBtn?.addEventListener('click', () => {
      if (preset === 'trip-cover') {
        document.getElementById('trip-poster').value = '';
        document.getElementById('trip-drive-file-id').value = '';
        this.editingDriveFileId = '';
      } else {
        const hidden = field.querySelector('input[type="hidden"]');
        if (hidden) hidden.value = '';
      }
      this.clearUploadField(field);
    });

    if (drop) {
      ['dragenter', 'dragover'].forEach((evt) => {
        drop.addEventListener(evt, (e) => {
          e.preventDefault();
          drop.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach((evt) => {
        drop.addEventListener(evt, (e) => {
          e.preventDefault();
          drop.classList.remove('dragover');
        });
      });
      drop.addEventListener('drop', (e) => handleFile(e.dataTransfer?.files?.[0]));
    }
  },

  uploadOptionsFor(preset) {
    if (preset === 'trip-cover') return { maxWidth: 1600, maxHeight: 1600, quality: 0.82, maxBytes: 4.5 * 1024 * 1024 };
    if (preset === 'test-photo') return { maxWidth: 800, maxHeight: 800, quality: 0.8, maxBytes: 3 * 1024 * 1024 };
    return { maxWidth: 1800, maxHeight: 1800, quality: 0.82, maxBytes: 4.5 * 1024 * 1024 };
  },

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  setUploadPreview(field, url, name, size) {
    const preview = field.querySelector('[data-upload-preview]');
    const placeholder = field.querySelector('[data-upload-placeholder]');
    const clearBtn = field.querySelector('[data-upload-clear]');
    const meta = field.querySelector('[data-upload-meta]');
    const img = preview?.querySelector('img');
    if (img) img.src = url;
    preview?.classList.remove('hidden');
    placeholder?.classList.add('hidden');
    clearBtn?.classList.remove('hidden');
    if (meta && name) {
      meta.textContent = `${name} · ${this.formatFileSize(size || 0)}`;
      meta.classList.remove('hidden');
    }
  },

  clearUploadField(field) {
    const preview = field.querySelector('[data-upload-preview]');
    const placeholder = field.querySelector('[data-upload-placeholder]');
    const clearBtn = field.querySelector('[data-upload-clear]');
    const meta = field.querySelector('[data-upload-meta]');
    preview?.querySelector('img')?.removeAttribute('src');
    preview?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
    clearBtn?.classList.add('hidden');
    meta?.classList.add('hidden');
    this.hideUploadProgress(field);
  },

  setUploadProgress(field, pct, label) {
    const wrap = field.querySelector('[data-upload-progress]');
    const bar = field.querySelector('[data-upload-bar]');
    const status = field.querySelector('[data-upload-status]');
    wrap?.classList.remove('hidden');
    if (bar) bar.style.width = `${Math.min(100, pct)}%`;
    if (status && label) status.textContent = label;
  },

  hideUploadProgress(field) {
    field.querySelector('[data-upload-progress]')?.classList.add('hidden');
    const bar = field.querySelector('[data-upload-bar]');
    if (bar) bar.style.width = '0%';
  },

  async dataUrlToFile(dataUrl, filename) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  },

  isRemoteUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  },

  async ensureDriveUrl(value, filename = 'image.jpg', replaceFileId = '', onProgress) {
    const src = String(value || '').trim();
    if (!src) return { url: '', driveFileId: '' };
    if (this.isRemoteUrl(src)) return { url: src, driveFileId: replaceFileId || '' };
    if (!this.sheetsConfigured) throw new Error('Configure sheetsApiUrl first');
    if (onProgress) onProgress(0.5);
    const uploaded = await SheetsAPI.uploadImage(src, filename, replaceFileId);
    if (onProgress) onProgress(1);
    return { url: uploaded.url, driveFileId: uploaded.driveFileId || uploaded.id || '' };
  },

  compressImage(file, { maxWidth = 1400, maxHeight = 1400, quality = 0.78, maxBytes = 4.5 * 1024 * 1024 } = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image'));
        img.onload = () => {
          let scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
          let q = quality;
          const encode = () => {
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const mime = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
            return canvas.toDataURL(mime, q);
          };
          let dataUrl = encode();
          let tries = 0;
          while (tries < 10) {
            const approxBytes = (dataUrl.length * 3) / 4;
            if (approxBytes <= maxBytes) break;
            tries += 1;
            if (q > 0.45) q -= 0.08;
            else scale *= 0.85;
            dataUrl = encode();
          }
          const approxBytes = (dataUrl.length * 3) / 4;
          if (approxBytes > 5 * 1024 * 1024) reject(new Error('Image still too large after compression'));
          else resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /* ── Trips ── */
  bindTrips() {
    document.getElementById('trip-add-btn')?.addEventListener('click', () => this.openTripForm());
    document.getElementById('trip-add-empty')?.addEventListener('click', () => this.openTripForm());
    document.getElementById('trip-form')?.addEventListener('submit', (e) => this.saveTripForm(e));
    document.getElementById('trip-search')?.addEventListener('input', TR.debounce(() => this.filterTrips(), 200));
    document.getElementById('trip-filter-category')?.addEventListener('change', () => this.filterTrips());
    document.getElementById('trip-filter-status')?.addEventListener('change', () => this.filterTrips());
    document.getElementById('trips-retry-btn')?.addEventListener('click', () => this.loadTrips());

    TR.qsa('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => this.requestCloseTripModal());
    });

    this.bindSlugAuto();
  },

  isPublished(t) {
    return /^(active|published)$/i.test(t.status || '');
  },

  isSoldOut(t) {
    return TR.parseBool(t.soldOut) || TR.parseBool(t.limitedSeats);
  },

  isUpcoming(t) {
    if (!t.travelDate) return false;
    const d = new Date(t.travelDate);
    return !Number.isNaN(d.getTime()) && d >= new Date();
  },

  updateStats() {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const published = this.trips.filter((t) => this.isPublished(t));
    const drafts = this.trips.filter((t) => !this.isPublished(t));
    const upcoming = published.filter((t) => this.isUpcoming(t));
    const soldOut = this.trips.filter((t) => this.isSoldOut(t));
    const seats = upcoming.filter((t) => !this.isSoldOut(t)).reduce((sum, t) => sum + (Number(t.seats) || 0), 0);

    set('stat-total', this.trips.length);
    set('stat-published', published.length);
    set('stat-drafts', drafts.length);
    set('stat-upcoming', upcoming.length);
    set('stat-soldout', soldOut.length);
    set('stat-seats', seats || 0);
  },

  showTripsError(msg) {
    this.loadError = msg;
    this.tripsError?.classList.remove('hidden');
    this.tripsContent?.classList.add('hidden');
    const el = document.getElementById('trips-error-msg');
    if (el) el.textContent = msg;
  },

  hideTripsError() {
    this.loadError = null;
    this.tripsError?.classList.add('hidden');
    this.tripsContent?.classList.remove('hidden');
  },

  async loadTrips(showSkeleton = true) {
    if (!this.sheetsConfigured) {
      this.trips = await SheetsAPI.getAllAdmin();
      this.updateStats();
      this.populateCategoryFilter();
      this.filterTrips();
      return;
    }
    this.hideTripsError();
    if (showSkeleton) this.showTripsTableSkeleton();
    try {
      this.trips = await SheetsAPI.getAllAdmin();
      this.updateStats();
      this.populateCategoryFilter();
      this.filterTrips();
    } catch (err) {
      console.error(err);
      this.showTripsError(err.message || 'Could not load trips from Google Sheets.');
      this.toast('Failed to load trips', 'error');
    }
  },

  showTripsTableSkeleton() {
    const tbody = document.getElementById('trips-tbody');
    if (!tbody) return;
    tbody.closest('table')?.classList.remove('hidden');
    this.tripsEmpty?.classList.add('hidden');
    tbody.closest('table')?.classList.add('admin-table-skeleton');
    tbody.innerHTML = Array.from({ length: 5 }, () => `
      <tr class="is-skeleton" aria-hidden="true">
        <td><span class="sk-cell sk-cell--wide skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--med skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--short skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--short skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--short skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--short skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--badge skeleton-shimmer"></span></td>
        <td><span class="sk-cell sk-cell--med skeleton-shimmer"></span></td>
      </tr>`).join('');
  },

  populateCategoryFilter() {
    const select = document.getElementById('trip-filter-category');
    if (!select) return;
    const cats = [...new Set(this.trips.map((t) => t.category).filter(Boolean))].sort();
    const cur = select.value;
    select.innerHTML = '<option value="">All categories</option>' +
      cats.map((c) => `<option value="${TR.sanitize(c)}">${TR.sanitize(c)}</option>`).join('');
    if (cur) select.value = cur;
  },

  filterTrips() {
    const search = (document.getElementById('trip-search')?.value || '').trim().toLowerCase();
    const category = document.getElementById('trip-filter-category')?.value || '';
    const status = document.getElementById('trip-filter-status')?.value || '';

    this.filteredTrips = this.trips.filter((t) => {
      const hay = `${t.tripName} ${t.destination} ${t.category} ${t.slug || ''}`.toLowerCase();
      const matchSearch = !search || hay.includes(search);
      const matchCat = !category || t.category === category;
      const matchStatus =
        !status ||
        (status === 'Published' && this.isPublished(t)) ||
        (status === 'Draft' && !this.isPublished(t));
      return matchSearch && matchCat && matchStatus;
    });

    this.renderTripsTable();
  },

  renderTripsTable() {
    const tbody = document.getElementById('trips-tbody');
    const table = document.getElementById('trips-table');
    if (!tbody) return;
    tbody.closest('table')?.classList.remove('admin-table-skeleton');

    if (!this.trips.length) {
      table?.classList.add('hidden');
      this.tripsEmpty?.classList.remove('hidden');
      tbody.innerHTML = '';
      return;
    }

    table?.classList.remove('hidden');
    this.tripsEmpty?.classList.add('hidden');

    if (!this.filteredTrips.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No trips match your filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.filteredTrips.map((t) => {
      const published = this.isPublished(t);
      const statusLabel = published ? 'Published' : 'Draft';
      const statusClass = published ? 'status-active' : 'status-inactive';
      const featured = TR.parseBool(t.featured);
      const soldOut = this.isSoldOut(t);
      const dateStr = t.travelDate
        ? new Date(t.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const price = t.discountedPrice && Number(t.discountedPrice) > 0
        ? `<s class="price-old">${TR.formatINR(t.price)}</s> ${TR.formatINR(t.discountedPrice)}`
        : TR.formatINR(t.price);
      return `
        <tr data-id="${TR.sanitize(t.id)}">
          <td class="trip-name-cell">
            ${TR.sanitize(t.tripName)}
            ${featured ? '<span class="tag tag-featured">Featured</span>' : ''}
            ${soldOut ? '<span class="tag tag-soldout">Sold out</span>' : ''}
          </td>
          <td>${TR.sanitize(t.destination || '—')}</td>
          <td>${TR.sanitize(t.category || '—')}</td>
          <td>${dateStr}</td>
          <td>${price}</td>
          <td>${TR.sanitize(t.seats || '—')}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td class="table-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-edit="${TR.sanitize(t.id)}" title="Edit">Edit</button>
            <button type="button" class="btn btn-ghost btn-sm" data-duplicate="${TR.sanitize(t.id)}" title="Duplicate">Copy</button>
            ${published
              ? `<button type="button" class="btn btn-ghost btn-sm" data-unpublish="${TR.sanitize(t.id)}">Unpub</button>`
              : `<button type="button" class="btn btn-ghost btn-sm" data-publish="${TR.sanitize(t.id)}">Publish</button>`}
            <button type="button" class="btn btn-ghost btn-sm" data-toggle-featured="${TR.sanitize(t.id)}" title="Toggle featured">${featured ? '★' : '☆'}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-toggle-soldout="${TR.sanitize(t.id)}" title="Toggle sold out">${soldOut ? '✓ Full' : 'Seats'}</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete="${TR.sanitize(t.id)}">Del</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const trip = this.trips.find((t) => String(t.id) === btn.dataset.edit);
        if (trip) this.openTripForm(trip);
      });
    });
    tbody.querySelectorAll('[data-duplicate]').forEach((btn) => {
      btn.addEventListener('click', () => this.duplicateTrip(btn.dataset.duplicate));
    });
    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => this.deleteTrip(btn.dataset.delete));
    });
    tbody.querySelectorAll('[data-publish]').forEach((btn) => {
      btn.addEventListener('click', () => this.togglePublish(btn.dataset.publish, true));
    });
    tbody.querySelectorAll('[data-unpublish]').forEach((btn) => {
      btn.addEventListener('click', () => this.togglePublish(btn.dataset.unpublish, false));
    });
    tbody.querySelectorAll('[data-toggle-featured]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggleTripFlag(btn.dataset.toggleFeatured, 'featured'));
    });
    tbody.querySelectorAll('[data-toggle-soldout]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggleTripFlag(btn.dataset.toggleSoldout, 'soldOut'));
    });
  },

  async togglePublish(id, publish) {
    if (!this.sheetsConfigured) return;
    try {
      if (publish) await SheetsAPI.publishTrip(id);
      else await SheetsAPI.unpublishTrip(id);
      this.toast(publish ? 'Trip published — visible on public site' : 'Trip unpublished', 'success');
      await this.loadTrips(false);
    } catch (err) {
      this.toast(err.message || 'Status update failed', 'error');
    }
  },

  async toggleTripFlag(id, field) {
    const trip = this.trips.find((t) => String(t.id) === String(id));
    if (!trip || !this.sheetsConfigured) return;
    const current = field === 'featured' ? TR.parseBool(trip.featured) : this.isSoldOut(trip);
    const payload = this.tripToPayload(trip);
    if (field === 'featured') payload.featured = current ? 'No' : 'Yes';
    else {
      payload.soldOut = current ? 'No' : 'Yes';
      payload.limitedSeats = payload.soldOut;
    }
    try {
      await SheetsAPI.saveTrip(payload, 'update');
      this.toast('Trip updated', 'success');
      await this.loadTrips(false);
    } catch (err) {
      this.toast(err.message || 'Update failed', 'error');
    }
  },

  tripToPayload(trip) {
    return {
      id: trip.id,
      slug: trip.slug,
      tripName: trip.tripName,
      destination: trip.destination,
      poster: trip.poster,
      driveFileId: trip.driveFileId,
      category: trip.category,
      duration: trip.duration,
      travelDate: trip.travelDate,
      endDate: trip.endDate,
      price: trip.price,
      discountedPrice: trip.discountedPrice,
      seats: trip.seats,
      maxGroupSize: trip.maxGroupSize,
      shortDescription: trip.shortDescription,
      description: trip.description,
      inclusions: trip.inclusions,
      exclusions: trip.exclusions,
      pickupPoints: trip.pickupPoints,
      itinerary: trip.itinerary,
      importantNotes: trip.importantNotes,
      whatsappNumber: trip.whatsappNumber,
      featured: trip.featured,
      soldOut: trip.soldOut || trip.limitedSeats,
      status: this.isPublished(trip) ? 'published' : 'draft'
    };
  },

  async duplicateTrip(id) {
    const trip = this.trips.find((t) => String(t.id) === String(id));
    if (!trip) return;
    const copy = { ...trip };
    delete copy.id;
    copy.tripName = `${trip.tripName} (Copy)`;
    copy.slug = this.slugify(copy.tripName);
    copy.status = 'draft';
    copy.featured = 'No';
    try {
      await SheetsAPI.saveTrip(this.tripToPayload(copy), 'create');
      this.toast('Trip duplicated as draft', 'success');
      await this.loadTrips(false);
    } catch (err) {
      this.toast(err.message || 'Duplicate failed', 'error');
    }
  },

  openTripForm(trip = null) {
    this.editingTripId = trip ? trip.id : null;
    this.editingDriveFileId = trip?.driveFileId || '';
    this.slugManual = !!trip?.slug;
    const form = document.getElementById('trip-form');
    const titleEl = document.getElementById('trip-form-title');
    titleEl.textContent = trip ? 'Edit Trip' : 'Add Trip';
    form.reset();
    this.clearUploadField(document.querySelector('[data-upload="trip-cover"]'));

    document.getElementById('trip-id').value = trip?.id || '';
    document.getElementById('trip-drive-file-id').value = trip?.driveFileId || '';
    document.getElementById('trip-poster').value = trip?.poster || '';

    if (trip) {
      document.getElementById('trip-title').value = trip.tripName || '';
      document.getElementById('trip-slug').value = trip.slug || '';
      document.getElementById('trip-location').value = trip.destination || '';
      document.getElementById('trip-meeting-point').value = trip.pickupPoints || '';
      document.getElementById('trip-category').value = trip.category || '';
      document.getElementById('trip-duration').value = trip.duration || '';
      document.getElementById('trip-start-date').value = this.toDatetimeLocal(trip.travelDate);
      document.getElementById('trip-end-date').value = this.toDatetimeLocal(trip.endDate);
      document.getElementById('trip-price').value = trip.price || '';
      document.getElementById('trip-discounted-price').value = trip.discountedPrice || '';
      document.getElementById('trip-seats').value = trip.seats || '';
      document.getElementById('trip-max-group').value = trip.maxGroupSize || '';
      document.getElementById('trip-short-desc').value = trip.shortDescription || '';
      document.getElementById('trip-full-desc').value = trip.description || '';
      document.getElementById('trip-inclusions').value = trip.inclusions || '';
      document.getElementById('trip-exclusions').value = trip.exclusions || '';
      document.getElementById('trip-itinerary').value = trip.itinerary || '';
      document.getElementById('trip-notes').value = trip.importantNotes || '';
      document.getElementById('trip-whatsapp').value = trip.whatsappNumber || TRAVELRAYZ_CONFIG.company.whatsapp || '';
      document.getElementById('trip-featured').checked = TR.parseBool(trip.featured);
      document.getElementById('trip-sold-out').checked = this.isSoldOut(trip);
      document.getElementById('trip-status').value = this.isPublished(trip) ? 'Published' : 'Draft';
      if (trip.poster) {
        const field = document.querySelector('[data-upload="trip-cover"]');
        this.setUploadPreview(field, trip.poster, 'cover.jpg', 0);
      }
    } else {
      document.getElementById('trip-whatsapp').value = TRAVELRAYZ_CONFIG.company.whatsapp || '';
      document.getElementById('trip-status').value = 'Draft';
    }

    this.formSnapshot = this.getFormSnapshot();
    document.getElementById('trip-modal')?.classList.remove('hidden');
  },

  getFormSnapshot() {
    return JSON.stringify(this.collectTripFromForm());
  },

  hasUnsavedChanges() {
    return this.formSnapshot && this.formSnapshot !== JSON.stringify(this.collectTripFromForm());
  },

  async requestCloseTripModal() {
    if (this.hasUnsavedChanges()) {
      const ok = await this.confirm('You have unsaved changes. Discard them?', 'Unsaved changes');
      if (!ok) return;
    }
    this.closeTripModal();
  },

  closeTripModal() {
    document.getElementById('trip-modal')?.classList.add('hidden');
    this.editingTripId = null;
    this.formSnapshot = '';
    this.slugManual = false;
  },

  toDatetimeLocal(val) {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val).slice(0, 16);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  collectTripFromForm() {
    const g = (id) => document.getElementById(id)?.value?.trim() ?? '';
    const cb = (id) => document.getElementById(id)?.checked || false;
    return {
      id: g('trip-id') || undefined,
      slug: g('trip-slug') || this.slugify(g('trip-title')),
      tripName: g('trip-title'),
      destination: g('trip-location'),
      poster: g('trip-poster'),
      driveFileId: g('trip-drive-file-id'),
      category: g('trip-category'),
      duration: g('trip-duration'),
      travelDate: g('trip-start-date'),
      endDate: g('trip-end-date'),
      price: g('trip-price'),
      discountedPrice: g('trip-discounted-price'),
      seats: g('trip-seats'),
      maxGroupSize: g('trip-max-group'),
      shortDescription: g('trip-short-desc'),
      description: g('trip-full-desc'),
      inclusions: g('trip-inclusions'),
      exclusions: g('trip-exclusions'),
      pickupPoints: g('trip-meeting-point'),
      itinerary: g('trip-itinerary'),
      importantNotes: g('trip-notes'),
      whatsappNumber: g('trip-whatsapp'),
      featured: cb('trip-featured') ? 'Yes' : 'No',
      soldOut: cb('trip-sold-out') ? 'Yes' : 'No',
      limitedSeats: cb('trip-sold-out') ? 'Yes' : 'No',
      status: g('trip-status') === 'Published' ? 'published' : 'draft'
    };
  },

  async saveTripForm(e) {
    e.preventDefault();
    if (this.saving) return;
    if (!this.sheetsConfigured) {
      this.toast('Configure sheetsApiUrl in config.js', 'error');
      return;
    }

    const trip = this.collectTripFromForm();
    if (!trip.tripName || !trip.destination) {
      this.toast('Title and location are required', 'error');
      return;
    }

    const isUpdate = !!this.editingTripId;
    const btn = document.getElementById('trip-save-btn');
    this.saving = true;
    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Saving…';
    btn.querySelector('.btn-spinner')?.classList.remove('hidden');

    try {
      if (trip.poster && trip.poster.startsWith('data:')) {
        const uploaded = await this.ensureDriveUrl(trip.poster, 'cover.jpg', trip.driveFileId);
        trip.poster = uploaded.url;
        trip.driveFileId = uploaded.driveFileId;
      }
      await SheetsAPI.saveTrip(trip, isUpdate ? 'update' : 'create');
      this.toast(
        isUpdate ? 'Trip updated successfully' : 'Trip created successfully',
        'success'
      );
      if (trip.status === 'published') {
        this.toast('Published — refresh the public Trips page to see it live', 'success');
      }
      this.closeTripModal();
      await this.loadTrips(false);
    } catch (err) {
      console.error(err);
      this.toast(err.message || 'Save failed', 'error');
    } finally {
      this.saving = false;
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = 'Save Trip';
      btn.querySelector('.btn-spinner')?.classList.add('hidden');
    }
  },

  async deleteTrip(id) {
    if (!this.sheetsConfigured) return;
    const trip = this.trips.find((t) => String(t.id) === String(id));
    if (!trip) return;
    const ok = await this.confirm(
      `Delete "${trip.tripName}"? This removes the trip and cannot be undone.`,
      'Delete trip'
    );
    if (!ok) return;
    try {
      await SheetsAPI.saveTrip({ id: trip.id }, 'delete');
      this.toast('Trip deleted', 'success');
      await this.loadTrips(false);
    } catch (err) {
      this.toast(err.message || 'Delete failed', 'error');
    }
  },

  /* ── Gallery ── */
  bindGallery() {
    document.getElementById('gallery-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const src = document.getElementById('gallery-src').value.trim();
      const alt = document.getElementById('gallery-alt').value.trim();
      if (!src || !alt) return;
      if (!this.sheetsConfigured) {
        this.toast('Configure sheetsApiUrl first', 'error');
        return;
      }
      try {
        const url = (await this.ensureDriveUrl(src, 'gallery.jpg')).url;
        await SheetsAPI.addGalleryItem({ src: url, alt, status: 'Active' });
        document.getElementById('gallery-form').reset();
        this.clearUploadField(document.querySelector('[data-upload="gallery-src"]'));
        await this.renderGallery();
        this.toast('Image added', 'success');
      } catch (err) {
        this.toast(err.message || 'Save failed', 'error');
      }
    });
  },

  getGallery() {
    try {
      return JSON.parse(localStorage.getItem(this.GALLERY_KEY) || '[]');
    } catch {
      return [];
    }
  },

  async renderGallery() {
    const list = document.getElementById('gallery-list');
    if (!list) return;
    let items = [];
    if (this.sheetsConfigured) {
      try {
        items = await SheetsAPI.fetchGallery(true);
      } catch {
        list.innerHTML = '<p class="empty-state">Could not load gallery.</p>';
        return;
      }
    } else items = this.getGallery();

    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No gallery images yet.</p>';
      return;
    }
    list.innerHTML = items.map((item) => `
      <div class="gallery-card">
        <img src="${TR.sanitize(item.src)}" alt="${TR.sanitize(item.alt)}" loading="lazy">
        <div class="gallery-card-info">${TR.sanitize(item.alt)}</div>
        <button type="button" class="btn btn-danger btn-sm" data-remove-id="${TR.sanitize(item.id)}">Remove</button>
      </div>`).join('');
    list.querySelectorAll('[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await this.confirm('Remove this gallery image?', 'Remove image');
        if (!ok) return;
        try {
          await SheetsAPI.deleteGalleryItem({ id: btn.dataset.removeId });
          this.toast('Removed');
          await this.renderGallery();
        } catch (err) {
          this.toast(err.message || 'Remove failed', 'error');
        }
      });
    });
  },

  /* ── Testimonials ── */
  bindTestimonials() {
    document.getElementById('testimonial-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.sheetsConfigured) return;
      try {
        const photoRaw = document.getElementById('test-photo').value.trim();
        const photo = photoRaw ? (await this.ensureDriveUrl(photoRaw, 'testimonial.jpg')).url : '';
        await SheetsAPI.addTestimonial({
          name: document.getElementById('test-name').value.trim(),
          text: document.getElementById('test-text').value.trim(),
          rating: Number(document.getElementById('test-rating').value) || 5,
          photo,
          trip: document.getElementById('test-trip').value.trim(),
          status: 'Active'
        });
        document.getElementById('testimonial-form').reset();
        document.getElementById('test-rating').value = '5';
        this.clearUploadField(document.querySelector('[data-upload="test-photo"]'));
        await this.renderTestimonials();
        this.toast('Testimonial added', 'success');
      } catch (err) {
        this.toast(err.message || 'Save failed', 'error');
      }
    });
  },

  getTestimonials() {
    try {
      return JSON.parse(localStorage.getItem(this.TESTIMONIALS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  async renderTestimonials() {
    const list = document.getElementById('testimonials-list');
    if (!list) return;
    let items = this.sheetsConfigured ? await SheetsAPI.fetchTestimonials(true).catch(() => null) : this.getTestimonials();
    if (items === null) {
      list.innerHTML = '<p class="empty-state">Could not load testimonials.</p>';
      return;
    }
    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No testimonials yet.</p>';
      return;
    }
    list.innerHTML = items.map((t) => `
      <div class="testimonial-card-admin">
        ${t.photo ? `<img src="${TR.sanitize(t.photo)}" alt="">` : '<span class="avatar-ph">👤</span>'}
        <div class="content">
          <div class="stars">${'★'.repeat(Math.min(5, t.rating || 5))}</div>
          <p>"${TR.sanitize(t.text)}"</p>
          <div class="meta"><strong>${TR.sanitize(t.name)}</strong>${t.trip ? ` · ${TR.sanitize(t.trip)}` : ''}</div>
        </div>
        <button type="button" class="btn btn-danger btn-sm" data-remove-id="${TR.sanitize(t.id)}">Remove</button>
      </div>`).join('');
    list.querySelectorAll('[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await this.confirm('Remove this testimonial?', 'Remove testimonial');
        if (!ok) return;
        try {
          await SheetsAPI.deleteTestimonial({ id: btn.dataset.removeId });
          await this.renderTestimonials();
          this.toast('Removed');
        } catch (err) {
          this.toast(err.message || 'Remove failed', 'error');
        }
      });
    });
  },

  async migrateLocalMedia() {
    if (!this.sheetsConfigured) return;
    const localGallery = this.getGallery();
    if (localGallery.length) {
      try {
        if (!(await SheetsAPI.fetchGallery(true)).length) {
          for (const item of localGallery) {
            const src = item.src ? (await this.ensureDriveUrl(item.src, 'gallery.jpg')).url : '';
            if (src) await SheetsAPI.addGalleryItem({ src, alt: item.alt || 'Photo', status: 'Active' });
          }
          localStorage.removeItem(this.GALLERY_KEY);
        }
      } catch (e) {
        console.error(e);
      }
    }
  },

  /* ── Settings ── */
  bindSettings() {
    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  },

  loadSettingsForm() {
    const c = TRAVELRAYZ_CONFIG.company;
    const map = {
      'set-name': c.name, 'set-tagline': c.tagline, 'set-phone': c.phone, 'set-phone2': c.phone2,
      'set-whatsapp': c.whatsapp, 'set-email': c.email, 'set-address': c.address, 'set-maps': c.mapsEmbed,
      'set-instagram': c.social?.instagram, 'set-linkedin': c.social?.linkedin,
      'set-facebook': c.social?.facebook, 'set-youtube': c.social?.youtube
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    });
  },

  saveSettings() {
    const g = (id) => document.getElementById(id)?.value?.trim() ?? '';
    const settings = {
      name: g('set-name'), tagline: g('set-tagline'), phone: g('set-phone'), phone2: g('set-phone2'),
      whatsapp: g('set-whatsapp'), email: g('set-email'), address: g('set-address'), mapsEmbed: g('set-maps'),
      social: { ...TRAVELRAYZ_CONFIG.company.social, instagram: g('set-instagram'), linkedin: g('set-linkedin'), facebook: g('set-facebook'), youtube: g('set-youtube') }
    };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    Object.assign(TRAVELRAYZ_CONFIG.company, settings);
    if (settings.social) Object.assign(TRAVELRAYZ_CONFIG.company.social, settings.social);
    this.toast('Settings saved', 'success');
  },

  /* ── Export ── */
  bindExport() {
    document.getElementById('export-trips')?.addEventListener('click', () => {
      this.downloadJSON('travelrayz-trips.json', this.trips);
      this.toast('Trips exported', 'success');
    });
    document.getElementById('export-settings')?.addEventListener('click', () => {
      this.downloadJSON('travelrayz-settings.json', { company: TRAVELRAYZ_CONFIG.company, exportedAt: new Date().toISOString() });
      this.toast('Settings exported', 'success');
    });
  },

  downloadJSON(filename, data) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  toast(msg, type = '') {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.className = 'toast show' + (type ? ` ${type}` : '');
    clearTimeout(this.toastEl._t);
    this.toastEl._t = setTimeout(() => this.toastEl.classList.remove('show'), 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => AdminApp.init());

window.addEventListener('beforeunload', (e) => {
  if (AdminApp.hasUnsavedChanges?.()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
