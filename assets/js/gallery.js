/**
 * TRAVELRAYZ — Gallery masonry, filters, accessible lightbox
 * Data: assets/js/gallery-data.js + Google Sheets (via sheets.js)
 */
const GalleryUI = {
  FALLBACK_IMAGE: 'assets/images/logo-mark.png',
  allItems: [],
  visibleItems: [],
  activeCategory: 'all',
  index: 0,
  limit: 0,

  touchStartX: 0,
  touchStartY: 0,

  async init(options = {}) {
    this.grid = TR.qs('#gallery-grid');
    this.lightbox = TR.qs('#lightbox');
    this.filtersRoot = TR.qs('#gallery-filters');
    this.limit = Number(options.limit) > 0 ? Number(options.limit) : 0;
    if (!this.grid) return;

    this.bindLightbox();
    this.bindFilterEvents();
    this.showSkeleton();

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    await new Promise((r) => setTimeout(r, reduce ? 40 : 380));

    const staticItems = Array.isArray(GALLERY_DATA?.items) ? [...GALLERY_DATA.items] : [];
    let remoteItems = [];

    if (typeof SheetsAPI !== 'undefined' && SheetsAPI.configured()) {
      try {
        remoteItems = (await SheetsAPI.fetchGallery()).map((item) => ({
          src: SheetsAPI.resolveImageUrl(item.src),
          alt: item.alt || 'TRAVELRAYZ journey photo',
          caption: item.alt || 'TRAVELRAYZ journey photo',
          category: item.category || 'Highlights'
        }));
      } catch (err) {
        console.warn('[TRAVELRAYZ] Gallery API unavailable.', err);
      }
    }

    const seen = new Set();
    this.allItems = [...remoteItems, ...staticItems].filter((item) => {
      const key = item.src || item.alt;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    this.buildFilterButtons();
    this.applyFilter();
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  bindFilterEvents() {
    if (!this.filtersRoot || this.filtersBound || this.limit) return;
    this.filtersBound = true;
    this.filtersRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-gallery-filter]');
      if (!btn) return;
      this.activeCategory = btn.dataset.galleryFilter || 'all';
      TR.qsa('[data-gallery-filter]', this.filtersRoot).forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      this.applyFilter();
    });
  },

  buildFilterButtons() {
    if (!this.filtersRoot || this.limit) return;
    TR.clearChildren(this.filtersRoot);

    const allBtn = this.makeFilterButton('all', 'All');
    allBtn.classList.toggle('active', this.activeCategory === 'all');
    this.filtersRoot.appendChild(allBtn);

    const cats = new Set(GALLERY_DATA?.categories || []);
    this.allItems.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    [...cats].forEach((cat) => {
      const btn = this.makeFilterButton(cat, cat);
      btn.classList.toggle('active', this.activeCategory === cat);
      this.filtersRoot.appendChild(btn);
    });
  },

  makeFilterButton(value, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-pill';
    btn.dataset.galleryFilter = value;
    btn.textContent = label;
    return btn;
  },

  applyFilter() {
    let items = this.allItems;
    if (this.activeCategory !== 'all') {
      items = items.filter((item) => item.category === this.activeCategory);
    }
    this.visibleItems = this.limit ? items.slice(0, this.limit) : items;
    this.render();
  },

  showSkeleton() {
    const n = this.limit || 9;
    this.grid.classList.add('is-content-loading');
    this.grid.setAttribute('aria-busy', 'true');
    TR.clearChildren(this.grid);
    for (let i = 0; i < n; i += 1) {
      const fig = TR.el('figure', 'gallery-item is-skeleton');
      fig.setAttribute('aria-hidden', 'true');
      fig.appendChild(TR.el('div', 'skeleton-shimmer gallery-skel'));
      this.grid.appendChild(fig);
    }
  },

  render() {
    this.grid.classList.remove('is-content-loading');
    this.grid.removeAttribute('aria-busy');
    TR.clearChildren(this.grid);

    if (!this.visibleItems.length) {
      const empty = TR.el('p', 'gallery-empty');
      TR.setText(empty, 'No photos in this category yet. Check back soon.');
      this.grid.appendChild(empty);
      return;
    }

    this.visibleItems.forEach((item, i) => {
      this.grid.appendChild(this.buildGalleryItem(item, i));
    });

    this.grid.classList.add('content-enter');
    if (typeof Motion !== 'undefined') Motion.refreshReveal(this.grid);
  },

  buildGalleryItem(item, index) {
    const fig = TR.el('figure', 'gallery-item');
    fig.dataset.index = String(index);
    fig.dataset.reveal = '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-item-btn';
    btn.setAttribute('aria-label', `View image: ${item.alt || item.caption || 'Gallery photo'}`);

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 600;
    img.height = 400;
    img.alt = item.alt || item.caption || 'TRAVELRAYZ journey photo';
    if (typeof SheetsAPI !== 'undefined') {
      SheetsAPI.applyDriveImg(img, item.src, this.FALLBACK_IMAGE, { width: 480, upgradeWidth: 800 });
    } else {
      img.src = item.src || this.FALLBACK_IMAGE;
    }

    btn.appendChild(img);

    if (item.caption) {
      const cap = TR.el('figcaption', 'gallery-caption', item.caption);
      btn.appendChild(cap);
    }

    btn.addEventListener('click', () => this.open(index));
    fig.appendChild(btn);
    return fig;
  },

  bindLightbox() {
    if (!this.lightbox) return;

    this.lbImage = TR.qs('.lightbox-image', this.lightbox);
    this.lbCaption = TR.qs('.lightbox-caption', this.lightbox);
    this.lbCounter = TR.qs('.lightbox-counter', this.lightbox);
    this.lbClose = TR.qs('.lightbox-close', this.lightbox);

    this.lbClose?.addEventListener('click', () => this.close());
    TR.qs('.lightbox-prev', this.lightbox)?.addEventListener('click', () => this.nav(-1));
    TR.qs('.lightbox-next', this.lightbox)?.addEventListener('click', () => this.nav(1));

    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox || e.target.classList.contains('lightbox-backdrop')) this.close();
    });

    this._onKeydown = (e) => {
      if (!this.lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.nav(-1);
      if (e.key === 'ArrowRight') this.nav(1);
    };
    document.addEventListener('keydown', this._onKeydown);

    const stage = TR.qs('.lightbox-stage', this.lightbox) || this.lightbox;
    stage.addEventListener(
      'touchstart',
      (e) => {
        if (!this.lightbox.classList.contains('open')) return;
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
      },
      { passive: true }
    );
    stage.addEventListener(
      'touchend',
      (e) => {
        if (!this.lightbox.classList.contains('open')) return;
        const dx = e.changedTouches[0].screenX - this.touchStartX;
        const dy = e.changedTouches[0].screenY - this.touchStartY;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        this.nav(dx > 0 ? -1 : 1);
      },
      { passive: true }
    );
  },

  open(i) {
    if (!this.visibleItems.length) return;
    this.index = i;
    this.updateLightbox();
    this.lightbox.classList.add('open');
    this.lightbox.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    this.lbClose?.focus();
  },

  close() {
    this.lightbox.classList.remove('open');
    this.lightbox.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
  },

  nav(dir) {
    if (!this.visibleItems.length) return;
    this.index = (this.index + dir + this.visibleItems.length) % this.visibleItems.length;
    this.updateLightbox();
  },

  updateLightbox() {
    const item = this.visibleItems[this.index];
    if (!item || !this.lbImage) return;

    this.lbImage.classList.remove('is-fallback');
    this.lbImage.alt = item.alt || item.caption || 'Gallery photo';
    if (typeof SheetsAPI !== 'undefined') {
      SheetsAPI.applyDriveImg(this.lbImage, item.src, this.FALLBACK_IMAGE, { width: 960, upgradeWidth: 1280, eager: true });
    } else {
      this.lbImage.src = item.src || this.FALLBACK_IMAGE;
    }

    TR.setText(this.lbCaption, item.caption || item.alt || '');
    TR.setText(this.lbCounter, `${this.index + 1} / ${this.visibleItems.length}`);

    const title = TR.qs('#lightbox-title', this.lightbox);
    if (title) TR.setText(title, item.caption || item.alt || 'Gallery image');
  }
};
