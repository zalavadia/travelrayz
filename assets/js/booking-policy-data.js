/**
 * TRAVELRAYZ — Default Booking, Cancellation & Refund Policy
 * Overridden by Apps Script when admin saves updates.
 */
const BOOKING_POLICY_DEFAULT = {
  title: 'Booking, Cancellation & Refund Policy — Travelrayz',
  intro:
    'Please read all trip details, inclusions, exclusions and the applicable cancellation policy carefully before making your booking.',
  lastUpdated: 'September 2026',
  sections: [
    {
      heading: '1. Booking Confirmation',
      body:
        'Your booking is confirmed only after the required payment has been received and confirmation issued by Travelrayz. The booking/advance amount is used to block seats and make advance commitments with hotels, transport providers, activity partners and other suppliers.'
    },
    {
      heading: '2. Payment',
      body:
        'The advance amount and balance payment schedule will be communicated for each trip. Balance payment must be completed before the departure date, unless otherwise agreed in writing — failure to pay on time may result in cancellation of the booking, with the advance amount non-refundable.'
    },
    {
      heading: '3. Cancellation by Traveller',
      body:
        'Refunds follow the cancellation terms specified for the respective trip (see sample table below). Trip-specific terms always take priority over this general policy. Any non-refundable amount already paid to hotels, transport providers, ticketing partners, activity providers or other suppliers may be deducted from the applicable refund.'
    },
    {
      heading: '4. No-Show / Early Return',
      body:
        'No refund will be provided for: missing the pickup point/departure, not joining after booking, leaving the trip midway, or opting out of an included activity. Additional expenses arising from such situations are borne by the traveller.'
    },
    {
      heading: '5. Changes to the Itinerary',
      body:
        "Plans may change due to weather, traffic, road conditions, temple timings, government restrictions, safety concerns or other unforeseen circumstances. We'll offer the best possible alternative, but itinerary changes do not automatically qualify for a refund unless the trip is substantially cancelled."
    },
    {
      heading: '6. Cancellation / Rescheduling by Travelrayz',
      body:
        'We may cancel, postpone or reschedule a trip due to insufficient enrollment, weather, safety concerns or circumstances beyond our reasonable control (natural disasters, government restrictions, transport disruptions). In such cases, travellers will be offered a full refund or an alternative departure date.'
    },
    {
      heading: '7. Transport',
      body:
        "Transport arrangements (flights, trains, buses, cabs, or other modes) are booked through the respective service providers/official booking systems. Seat, cabin and berth allocation is subject to the relevant provider and cannot be guaranteed by Travelrayz. For group bookings, travellers may be seated separately — we'll try to keep groups together where possible. Delays, cancellations, route changes or other transport-related disruptions are beyond Travelrayz's control; our team will assist with practical alternatives wherever possible."
    },
    {
      heading: '8. Accommodation & Room Sharing',
      body:
        "Accommodation is as described in trip details. Room sharing, bed allocation and specific preferences are subject to availability and can't always be guaranteed."
    },
    {
      heading: '9. Personal Responsibility',
      body:
        'Travellers are responsible for their belongings, documents, health and safety during the trip. Travel insurance is not included unless specifically mentioned. Travellers are expected to follow the trip schedule, safety instructions and reasonable directions from the Travelrayz team.'
    },
    {
      heading: '10. Refund Processing',
      body:
        'Approved refunds are generally processed within 7–14 business days, depending on the payment method. Applicable payment gateway, bank, ticket cancellation or supplier charges may be deducted.'
    }
  ],
  importantTitle: 'Important',
  importantBody:
    "Every Travelrayz trip may have its own booking and cancellation terms depending on destination, season, transport, accommodation and supplier commitments. Terms on the respective trip page/booking form apply to that trip. This policy should be read together with our Terms of Service. By making a payment, you confirm you've read and understood the applicable trip details, Terms of Service and this Cancellation & Refund Policy, and agree to the same. These terms are governed by the laws of India, with disputes subject to the jurisdiction of courts in Maharashtra, India."
};
