/**
 * TRAVELRAYZ — Gallery masonry + lightbox
 */
const GalleryUI = {
  images: [
    { src: 'assets/images/maharashtra-3-jyotirlinga-poster.png', alt: 'Maharashtra 3 Jyotirlinga Yatra poster' },
    { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', alt: 'Mountain trek sunrise' },
    { src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', alt: 'Alpine peaks adventure' },
    { src: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80', alt: 'Camping under stars' },
    { src: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80', alt: 'Misty mountain trail' },
    { src: 'https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&q=80', alt: 'Forest camping night' },
    { src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80', alt: 'Valley viewpoint' },
    { src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80', alt: 'Lake reflection travel' },
    { src: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&q=80', alt: 'Spiritual temple journey' }
  ],
  index: 0,

  init() {
    this.grid = TR.qs('#gallery-grid');
    this.lightbox = TR.qs('#lightbox');
    if (!this.grid) return;
    this.render();
    this.bindLightbox();
  },

  render() {
    this.grid.innerHTML = this.images
      .map(
        (img, i) => `
      <figure class="gallery-item" data-index="${i}">
        <img src="${img.src}" alt="${TR.sanitize(img.alt)}" loading="lazy" width="600" height="400">
      </figure>`
      )
      .join('');

    TR.qsa('.gallery-item', this.grid).forEach((item) => {
      item.addEventListener('click', () => this.open(Number(item.dataset.index)));
    });
  },

  bindLightbox() {
    if (!this.lightbox) return;
    TR.qs('.lightbox-close', this.lightbox)?.addEventListener('click', () => this.close());
    TR.qs('.lightbox-prev', this.lightbox)?.addEventListener('click', () => this.nav(-1));
    TR.qs('.lightbox-next', this.lightbox)?.addEventListener('click', () => this.nav(1));
    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.nav(-1);
      if (e.key === 'ArrowRight') this.nav(1);
    });
  },

  open(i) {
    this.index = i;
    this.update();
    this.lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.lightbox.classList.remove('open');
    document.body.style.overflow = '';
  },

  nav(dir) {
    this.index = (this.index + dir + this.images.length) % this.images.length;
    this.update();
  },

  update() {
    const img = TR.qs('img', this.lightbox);
    const item = this.images[this.index];
    img.src = item.src;
    img.alt = item.alt;
  }
};
