/**
 * TRAVELRAYZ — Global Configuration
 * Edit this file to update company details, API endpoints, and feature flags.
 * Admin password is client-side only (suitable for simple gate, not high security).
 */
const TRAVELRAYZ_CONFIG = {
  company: {
    name: 'TRAVELRAYZ',
    tagline: 'Travel to Divine. Return with Peace.',
    phone: '7208358868',
    phoneLabel: 'Kiran',
    phone2: '8850824834',
    phone2Label: 'Pratima',
    whatsapp: '917208453777',
    email: 'contact@travelrayz.com',
    address: 'Mumbai, Maharashtra',
    mapsEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.74109995709657!3d19.08219783958221!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000',
    social: {
      instagram: 'https://instagram.com/travelrayzz',
      linkedin: 'https://www.linkedin.com/company/travelrayz/',
      facebook: 'https://facebook.com/travelrayz',
      youtube: 'https://youtube.com/@travelrayz'
    }
  },

  /* Google Apps Script Web App URL — replace after deploying Code.gs */
  sheetsApiUrl: 'https://script.google.com/macros/s/AKfycbwwPKv3T3BGL-IEgl-tdzyWi8iDYm7wXVJow7FO_IxNSwMwd0EjgpE6RvmIYYoNuWTE/exec',

  /* Simple admin gate (change before going live) */
  adminPassword: 'travelrayz2026',

  /* Fallback trip when Sheets is unavailable */
  fallbackTrips: [
    {
      id: '1',
      tripName: 'Maharashtra 3 Jyotirlinga Yatra',
      poster: 'assets/images/maharashtra-3-jyotirlinga-poster.png',
      destination: 'Bhimashankar, Grishneshwar, Trimbakeshwar',
      category: 'Jyotirlinga',
      description:
        'A spiritually enriching journey visiting three sacred Jyotirlingas with luxury Urbania travel and pure veg meals. || हर हर महादेव ||',
      duration: '2 Days / 2 Nights',
      travelDate: '2026-07-31T21:00:00',
      price: '7999',
      seats: '12',
      difficulty: 'Easy',
      vehicle: 'Luxury Urbania',
      inclusions:
        'Luxury Urbania Travel | 1 Night Hotel Stay | 2 Breakfasts & 2 Dinners (Pure Veg) | Experienced Trip Leader & First Aid',
      exclusions: 'Personal expenses | Extra meals | Temple donations',
      pickupPoints: 'Mumbai / Thane (to be confirmed on booking)',
      itinerary:
        'Day 0 Night: Departure 9:00 PM | Day 1: Bhimashankar Darshan & travel | Day 2: Grishneshwar & Trimbakeshwar | Return by 12:00 AM',
      bookingLink: 'https://wa.me/917208453777?text=Hi%20I%20want%20to%20book%20Maharashtra%203%20Jyotirlinga%20Yatra',
      trending: 'Yes',
      featured: 'Yes',
      status: 'Active',
      limitedSeats: 'Yes'
    }
  ]
};

/* Persist settings overrides from admin */
(function loadSavedSettings() {
  try {
    const saved = localStorage.getItem('travelrayz_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(TRAVELRAYZ_CONFIG.company, parsed);
    }
  } catch (e) {
    /* ignore corrupt storage */
  }
})();
