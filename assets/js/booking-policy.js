/**
 * TRAVELRAYZ — Booking / Cancellation / Refund policy renderer
 */
const BookingPolicyUI = {
  async init() {
    this.root = TR.qs('#booking-policy-content');
    if (!this.root) return;

    this.render(BOOKING_POLICY_DEFAULT);
    if (typeof SheetsAPI === 'undefined' || !SheetsAPI.configured()) return;

    try {
      const policy = await SheetsAPI.fetchBookingPolicy();
      if (policy) this.render(policy);
    } catch (err) {
      console.warn('[TRAVELRAYZ] Booking policy API unavailable.', err);
    }
  },

  render(policy) {
    const p = SheetsAPI?.normalizeBookingPolicy
      ? SheetsAPI.normalizeBookingPolicy(policy)
      : policy;
    if (!p || !this.root) return;

    TR.clearChildren(this.root);

    if (p.lastUpdated) {
      const updated = TR.el('p', 'policy-updated');
      const em = document.createElement('em');
      em.textContent = `Last updated: ${p.lastUpdated}`;
      updated.appendChild(em);
      this.root.appendChild(updated);
    }

    if (p.intro) {
      this.root.appendChild(TR.el('p', 'policy-intro', p.intro));
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
      this.root.appendChild(block);
    });

    if (p.importantTitle || p.importantBody) {
      const box = TR.el('div', 'policy-important');
      if (p.importantTitle) box.appendChild(TR.el('h2', '', p.importantTitle));
      if (p.importantBody) box.appendChild(TR.el('p', '', p.importantBody));
      this.root.appendChild(box);
    }

    const titleEl = TR.qs('#policy-page-title');
    if (titleEl && p.title) TR.setText(titleEl, p.title);

    const docTitle = p.title
      ? `${p.title.replace(/\s*—\s*Travelrayz$/i, '')} | TRAVELRAYZ`
      : document.title;
    document.title = docTitle;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof BookingPolicyUI !== 'undefined') BookingPolicyUI.init();
});
