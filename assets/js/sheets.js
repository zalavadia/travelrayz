/**
 * TRAVELRAYZ — Google Sheets CMS client
 * Talks to Apps Script Web App (GET/POST JSON).
 */
const SheetsAPI = {
  normalizeTrip(row, index = 0) {
    const get = (...keys) => {
      for (const k of keys) {
        if (row[k] != null && String(row[k]).trim() !== '') return row[k];
      }
      return '';
    };

    return {
      id: String(get('id', 'ID', 'row') || index + 1),
      tripName: get('Trip Name', 'tripName', 'name'),
      poster: get('Poster', 'poster', 'Poster URL'),
      destination: get('Destination', 'destination'),
      category: get('Category', 'category'),
      description: get('Description', 'description'),
      duration: get('Duration', 'duration'),
      travelDate: get('Travel Date', 'travelDate'),
      price: get('Price', 'price'),
      seats: get('Seats', 'seats', 'Seats Left'),
      difficulty: get('Difficulty', 'difficulty') || 'Moderate',
      vehicle: get('Vehicle', 'vehicle'),
      inclusions: get('Inclusions', 'inclusions'),
      exclusions: get('Exclusions', 'exclusions'),
      pickupPoints: get('Pickup Points', 'pickupPoints'),
      itinerary: get('Itinerary', 'itinerary'),
      bookingLink: get('Booking Link', 'bookingLink'),
      trending: get('Trending', 'trending'),
      featured: get('Featured', 'featured'),
      status: get('Status', 'status') || 'Active',
      limitedSeats: get('Limited Seats', 'limitedSeats')
    };
  },

  async fetchTrips() {
    const url = TRAVELRAYZ_CONFIG.sheetsApiUrl;
    if (!url || url.includes('YOUR_GOOGLE')) {
      return TRAVELRAYZ_CONFIG.fallbackTrips.map((t, i) => this.normalizeTrip(t, i));
    }

    try {
      const res = await fetch(`${url}?action=getTrips`, { method: 'GET' });
      if (!res.ok) throw new Error('Sheets fetch failed');
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.trips || data.data || [];
      const trips = rows.map((r, i) => this.normalizeTrip(r, i));
      return trips.filter((t) => {
        const s = String(t.status || '').toLowerCase();
        return !s || s === 'active' || s === 'open';
      });
    } catch (err) {
      console.warn('[TRAVELRAYZ] Sheets unavailable, using fallback.', err);
      return TRAVELRAYZ_CONFIG.fallbackTrips.map((t, i) => this.normalizeTrip(t, i));
    }
  },

  async saveTrip(trip, method = 'create') {
    const url = TRAVELRAYZ_CONFIG.sheetsApiUrl;
    if (!url || url.includes('YOUR_GOOGLE')) {
      throw new Error('Configure sheetsApiUrl in config.js first.');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: method === 'update' ? 'updateTrip' : method === 'delete' ? 'deleteTrip' : 'addTrip', trip })
    });

    if (!res.ok) throw new Error('Save failed');
    return res.json();
  },

  async getAllAdmin() {
    const url = TRAVELRAYZ_CONFIG.sheetsApiUrl;
    if (!url || url.includes('YOUR_GOOGLE')) {
      return TRAVELRAYZ_CONFIG.fallbackTrips.map((t, i) => this.normalizeTrip(t, i));
    }
    const res = await fetch(`${url}?action=getTrips&all=1`);
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data.trips || data.data || [];
    return rows.map((r, i) => this.normalizeTrip(r, i));
  }
};
