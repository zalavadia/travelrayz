/**
 * TRAVELRAYZ — Public site configuration & API endpoint
 *
 * Admin secret lives in Google Apps Script Script Properties only.
 * Enter it on the admin login screen; it is kept in sessionStorage for the session.
 */
const TRAVELRAYZ_CONFIG = {
  /** Google Apps Script Web App URL (ends in /exec) */
  sheetsApiUrl:
    'https://script.google.com/macros/s/AKfycbwwPKv3T3BGL-IEgl-tdzyWi8iDYm7wXVJow7FO_IxNSwMwd0EjgpE6RvmIYYoNuWTE/exec',

  /** Fetch timeout for Sheets API calls (milliseconds) */
  requestTimeoutMs: 30000,

  /** Public company information (safe to expose on the static site) */
  company: {
    name: 'TRAVELRAYZ',
    tagline: 'Travel to Divine. Return with Peace.',
    taglineAlt: 'Beyond the Workplace. Stronger Together.',
    headline: 'Creating Experiences That Strengthen Teams Beyond the Workplace',
    vision:
      'To inspire meaningful connections, healthier workplaces, and stronger teams by helping people reconnect with nature, with each other, and themselves through transformative travel experiences.',
    mission:
      'To design safe, engaging, and purpose-driven experiences that foster team bonding, employee well-being, personal growth, and work-life balance through curated retreats, treks, and corporate outings.',
    founders: {
      pratima: {
        name: 'Pratima Jadhav',
        role: 'HR Manager and Co-Founder',
        phone: '8850824834',
        phoneDisplay: '+91 88508 24834'
      },
      kiran: {
        name: 'Kiran Chormare',
        role: 'Software Engineer and Co-Founder',
        phone: '7208358868',
        phoneDisplay: '+91 72083 58868'
      }
    },
    phone: '7208358868',
    phoneDisplay: '+91 72083 58868',
    phoneLabel: 'Kiran',
    phone2: '8850824834',
    phone2Display: '+91 88508 24834',
    phone2Label: 'Pratima',
    whatsapp: '917208453777',
    whatsappDisplay: '+91 72084 53777',
    email: 'contact@travelrayz.com',
    address: 'Mumbai, Maharashtra',
    website: 'https://www.travelrayz.com',
    websiteLabel: 'www.travelrayz.com',
    mapsEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.74109995709657!3d19.08219783958221!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000',
    social: {
      instagram: 'https://instagram.com/travelrayzz',
      instagramHandle: '@travelrayzz',
      linkedin: 'https://www.linkedin.com/company/travelrayz/',
      linkedinLabel: 'Travelrayz',
      facebook: 'https://facebook.com/travelrayz',
      youtube: 'https://youtube.com/@travelrayz'
    }
  }
};

/* Persist non-secret settings overrides from admin (contact details, social links) */
(function loadSavedSettings() {
  try {
    const saved = localStorage.getItem('travelrayz_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.social && TRAVELRAYZ_CONFIG.company.social) {
        Object.assign(TRAVELRAYZ_CONFIG.company.social, parsed.social);
        delete parsed.social;
      }
      Object.assign(TRAVELRAYZ_CONFIG.company, parsed);
    }
  } catch (e) {
    /* ignore corrupt storage */
  }
})();
