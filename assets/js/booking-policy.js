/**
 * TRAVELRAYZ — Booking / Cancellation / Refund policy renderer + modal
 */
const BookingPolicyUI = {
  cache: null,
  loading: null,
  lastFocus: null,

  async init() {
    this.root = TR.qs('#booking-policy-content');
    if (this.root) {
      this.render(BOOKING_POLICY_DEFAULT, this.root, { updatePageChrome: true });
      try {
        const policy = await this.loadPolicy();
        if (policy) this.render(policy, this.root, { updatePageChrome: true });
      } catch (err) {
        console.warn('[TRAVELRAYZ] Booking policy API unavailable.', err);
      }
    }
  },

  normalize(policy) {
    if (SheetsAPI?.normalizeBookingPolicy) {
      return SheetsAPI.normalizeBookingPolicy(policy);
    }
    return policy;
  },

  async loadPolicy() {
    if (this.cache) return this.cache;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      let policy = BOOKING_POLICY_DEFAULT;
      if (typeof SheetsAPI !== 'undefined' && SheetsAPI.configured()) {
        try {
          policy = await SheetsAPI.fetchBookingPolicy();
        } catch (err) {
          console.warn('[TRAVELRAYZ] Booking policy API unavailable.', err);
        }
      }
      this.cache = this.normalize(policy || BOOKING_POLICY_DEFAULT);
      this.loading = null;
      return this.cache;
    })();

    return this.loading;
  },

  render(policy, root, options = {}) {
    const p = this.normalize(policy);
    if (!p || !root) return p;

    TR.clearChildren(root);

    if (p.lastUpdated) {
      const updated = TR.el('p', 'policy-updated');
      const em = document.createElement('em');
      em.textContent = `Last updated: ${p.lastUpdated}`;
      updated.appendChild(em);
      root.appendChild(updated);
    }

    if (p.intro) {
      root.appendChild(TR.el('p', 'policy-intro', p.intro));
    }

    (p.sections || []).forEach((section) => {
      if (!section?.heading && !section?.body) return;
      const block = TR.el('div', 'policy-section');
      if (section.heading) block.appendChild(TR.el('h2', '', section.heading));
      if (section.body) {
        String(section.body)
          .split(/\n{2,}/)
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((part) => {
            block.appendChild(TR.el('p', '', part));
          });
      }
      root.appendChild(block);
    });

    if (p.importantTitle || p.importantBody) {
      const box = TR.el('div', 'policy-important');
      if (p.importantTitle) box.appendChild(TR.el('h2', '', p.importantTitle));
      if (p.importantBody) box.appendChild(TR.el('p', '', p.importantBody));
      root.appendChild(box);
    }

    if (options.updatePageChrome) {
      const titleEl = TR.qs('#policy-page-title');
      if (titleEl && p.title) TR.setText(titleEl, p.title);

      document.title = p.title
        ? `${p.title.replace(/\s*—\s*Travelrayz$/i, '')} | TRAVELRAYZ`
        : document.title;
    }

    return p;
  },

  ensureModal() {
    let overlay = TR.qs('#policy-modal');
    if (overlay) return overlay;

    overlay = TR.el('div', 'modal-overlay policy-modal-overlay');
    overlay.id = 'policy-modal';
    overlay.setAttribute('aria-hidden', 'true');

    const modal = TR.el('div', 'modal policy-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'policy-modal-title');

    const closeBtn = TR.el('button', 'modal-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close policy');

    const content = TR.el('div', 'modal-content policy-modal-content');
    content.appendChild(TR.el('h2', 'policy-modal-heading', ''));
    content.lastChild.id = 'policy-modal-title';

    const body = TR.el('div', 'policy-content policy-modal-body');
    body.id = 'policy-modal-body';
    body.setAttribute('aria-live', 'polite');
    body.appendChild(TR.el('p', '', 'Loading policy…'));
    content.appendChild(body);

    modal.append(closeBtn, content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => this.closeModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        this.closeModal();
      }
    });

    return overlay;
  },

  async openModal() {
    const overlay = this.ensureModal();
    const titleEl = TR.qs('#policy-modal-title', overlay);
    const body = TR.qs('#policy-modal-body', overlay);
    if (!body) return;

    this.lastFocus = document.activeElement;
    this.render(BOOKING_POLICY_DEFAULT, body);
    if (titleEl) TR.setText(titleEl, BOOKING_POLICY_DEFAULT.title || 'Booking Policy');

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    TR.qs('.modal-close', overlay)?.focus();

    try {
      const policy = await this.loadPolicy();
      if (!overlay.classList.contains('open')) return;
      this.render(policy, body);
      if (titleEl && policy?.title) TR.setText(titleEl, policy.title);
    } catch (err) {
      console.warn('[TRAVELRAYZ] Could not refresh policy modal.', err);
    }
  },

  closeModal() {
    const overlay = TR.qs('#policy-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    if (this.lastFocus && typeof this.lastFocus.focus === 'function') {
      this.lastFocus.focus();
    }
    this.lastFocus = null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof BookingPolicyUI !== 'undefined') BookingPolicyUI.init();
});
