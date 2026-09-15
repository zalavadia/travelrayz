/**
 * TRAVELRAYZ — Utility helpers
 */
const TR = {
  debounce(fn, wait = 100) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  throttle(fn, wait = 100) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  },

  formatINR(n) {
    const num = Number(String(n).replace(/[^\d.]/g, '')) || 0;
    return '₹' + num.toLocaleString('en-IN');
  },

  /** Extract a usable number from a price field, or null if it's blank / custom text. */
  parsePriceNumber(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return null;
    if (!/\d/.test(raw)) return null;
    /* Pure custom phrases like "Call for price" should not become 0 */
    if (!/^[\d₹Rs.\s,/-]+$/i.test(raw) && /[a-zA-Z]/.test(raw)) return null;
    const num = Number(raw.replace(/[^\d.]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : null;
  },

  /** Public display label for trip pricing (supports "Message / Call for price"). */
  formatTripPrice(trip) {
    const priceRaw = String(trip?.price || '').trim();
    const discRaw = String(trip?.discountedPrice || '').trim();
    const price = this.parsePriceNumber(priceRaw);
    const disc = this.parsePriceNumber(discRaw);

    if (disc != null && price != null && disc < price) {
      return { kind: 'sale', label: this.formatINR(disc), old: this.formatINR(price), perPerson: true };
    }
    if (price != null) {
      return { kind: 'fixed', label: this.formatINR(price), perPerson: true };
    }
    if (priceRaw) {
      return { kind: 'custom', label: priceRaw, perPerson: false };
    }
    return { kind: 'inquiry', label: 'Message / Call for price', perPerson: false };
  },

  formatDateIN(value, options = {}) {
    if (value == null || value === '') return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
      ...options
    });
  },

  parseDate(value) {
    if (value == null || value === '') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  },

  effectivePrice(trip) {
    const priced = this.formatTripPrice(trip);
    if (priced.kind === 'sale' || priced.kind === 'fixed') {
      return this.parsePriceNumber(trip?.discountedPrice) || this.parsePriceNumber(trip?.price) || 0;
    }
    return 0;
  },

  isSoldOut(trip) {
    return TR.parseBool(trip?.soldOut) || TR.parseBool(trip?.limitedSeats);
  },

  isUpcomingTrip(trip) {
    const d = TR.parseDate(trip?.travelDate);
    if (!d) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  },

  setText(el, text) {
    if (el) el.textContent = text == null ? '' : String(text);
  },

  clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  },

  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null && text !== '') node.textContent = String(text);
    return node;
  },

  parseBool(v) {
    if (typeof v === 'boolean') return v;
    const s = String(v || '').trim().toLowerCase();
    return s === 'yes' || s === 'true' || s === '1';
  },

  splitList(v) {
    if (!v) return [];
    return String(v)
      .split(/[|,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  },

  qs(sel, root = document) {
    return root.querySelector(sel);
  },

  qsa(sel, root = document) {
    return [...root.querySelectorAll(sel)];
  },

  toast(msg, ms = 3200) {
    let el = TR.qs('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms);
  },

  whatsappUrl(phone, text) {
    const p = String(phone || '').replace(/\D/g, '');
    return `https://wa.me/${p}?text=${encodeURIComponent(text || '')}`;
  },

  countdown(targetDate) {
    const end = new Date(targetDate).getTime();
    if (Number.isNaN(end)) return null;
    const diff = end - Date.now();
    if (diff <= 0) return { expired: true, label: 'Trip started' };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { expired: false, label: `${d}d ${h}h ${m}m left` };
  },

  sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  },

  /** Page scroll root — .site-shell when present, otherwise window */
  scrollRoot() {
    return document.querySelector('.site-shell') || window;
  },

  scrollY() {
    const root = document.querySelector('.site-shell');
    return root ? root.scrollTop : window.scrollY;
  },

  onScroll(fn, opts) {
    const root = this.scrollRoot();
    root.addEventListener('scroll', fn, opts || { passive: true });
    return () => root.removeEventListener('scroll', fn);
  }
};
