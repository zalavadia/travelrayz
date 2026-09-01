/**
 * TRAVELRAYZ — Contact form → Google Sheets Inquiries
 */
const ContactUI = {
  submitting: false,

  INQUIRY_TYPES: [
    'General Inquiry',
    'Group Trip',
    'Corporate Outing',
    'Custom Trip',
    'Collaboration'
  ],

  init() {
    this.form = TR.qs('#contact-form');
    if (!this.form) return;

    this.submitBtn = TR.qs('#contact-submit', this.form);
    this.successPanel = TR.qs('#contact-success');
    this.errorPanel = TR.qs('#contact-error');
    this.errorMsg = TR.qs('#contact-error-msg');

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    TR.qsa('[data-contact-retry]').forEach((btn) => {
      btn.addEventListener('click', () => this.hideError());
    });
  },

  hideError() {
    this.errorPanel?.classList.add('hidden');
    this.form?.classList.remove('hidden');
  },

  showSuccess() {
    this.form.classList.add('hidden');
    this.errorPanel?.classList.add('hidden');
    this.successPanel?.classList.remove('hidden');
    this.successPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  showError(msg) {
    TR.setText(this.errorMsg, msg);
    this.errorPanel?.classList.remove('hidden');
    this.errorPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  setLoading(on) {
    if (!this.submitBtn) return;
    this.submitBtn.disabled = on;
    const label = this.submitBtn.querySelector('.btn-label');
    const spinner = this.submitBtn.querySelector('.btn-spinner');
    if (label) label.textContent = on ? 'Sending…' : 'Send Inquiry';
    spinner?.classList.toggle('hidden', !on);
  },

  clearFieldErrors() {
    TR.qsa('.field-error', this.form).forEach((el) => el.remove());
    TR.qsa('.is-invalid', this.form).forEach((el) => el.classList.remove('is-invalid'));
  },

  setFieldError(input, message) {
    input.classList.add('is-invalid');
    const err = TR.el('span', 'field-error', message);
    err.setAttribute('role', 'alert');
    input.closest('.form-group')?.appendChild(err);
  },

  validate() {
    this.clearFieldErrors();
    let valid = true;

    const get = (name) => (this.form.elements[name]?.value || '').trim();

    const name = get('name');
    const email = get('email');
    const phone = get('phone');
    const inquiryType = get('inquiryType');
    const message = get('message');

    const nameEl = this.form.elements.name;
    const emailEl = this.form.elements.email;
    const phoneEl = this.form.elements.phone;
    const typeEl = this.form.elements.inquiryType;
    const msgEl = this.form.elements.message;

    if (name.length < 2) {
      this.setFieldError(nameEl, 'Enter your full name (at least 2 characters).');
      valid = false;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      this.setFieldError(phoneEl, 'Enter a valid phone number (10 digits or more).');
      valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setFieldError(emailEl, 'Enter a valid email address.');
      valid = false;
    }

    if (!inquiryType || !this.INQUIRY_TYPES.includes(inquiryType)) {
      this.setFieldError(typeEl, 'Select an inquiry type.');
      valid = false;
    }

    if (message.length < 10) {
      this.setFieldError(msgEl, 'Message must be at least 10 characters.');
      valid = false;
    }

    const groupSize = get('groupSize');
    if (groupSize && (Number(groupSize) < 1 || Number(groupSize) > 5000)) {
      this.setFieldError(this.form.elements.groupSize, 'Group size must be between 1 and 5000.');
      valid = false;
    }

    return valid;
  },

  collectPayload() {
    const get = (name) => (this.form.elements[name]?.value || '').trim();
    return {
      name: get('name'),
      email: get('email'),
      phone: get('phone'),
      company: get('company'),
      inquiryType: get('inquiryType'),
      groupSize: get('groupSize'),
      destination: get('destination'),
      message: get('message'),
      source: 'contact-form',
      trip: get('inquiryType')
    };
  },

  async handleSubmit(e) {
    e.preventDefault();
    if (this.submitting) return;
    if (!this.validate()) return;

    if (typeof SheetsAPI === 'undefined' || !SheetsAPI.configured()) {
      this.showError('Inquiry service is not configured yet. Please WhatsApp or call us directly.');
      return;
    }

    this.submitting = true;
    this.setLoading(true);
    this.errorPanel?.classList.add('hidden');

    try {
      await SheetsAPI.saveInquiry(this.collectPayload());
      this.form.reset();
      this.showSuccess();
      TR.toast('Inquiry sent successfully!');
    } catch (err) {
      console.error('[TRAVELRAYZ] Inquiry failed', err);
      this.showError(err.message || 'Could not send your inquiry. Please try again or contact us on WhatsApp.');
    } finally {
      this.submitting = false;
      this.setLoading(false);
    }
  }
};
