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
