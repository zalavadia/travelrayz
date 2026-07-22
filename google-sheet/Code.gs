/**
 * TRAVELRAYZ — Google Sheets CMS Backend
 * Deploy as Web App (Execute as: Me, Access: Anyone) and paste URL into config.js sheetsApiUrl.
 *
 * GET  ?action=getTrips[&all=1]  → JSON array of trip rows
 * POST { action: addTrip|updateTrip|deleteTrip, trip: {...} }
 */

var SHEET_NAME = 'Trips';

/** Column headers — must match row 1 of the Trips sheet */
var HEADERS = [
  'Trip Name',
  'Poster',
  'Destination',
  'Category',
  'Description',
  'Duration',
  'Travel Date',
  'Price',
  'Seats',
  'Difficulty',
  'Vehicle',
  'Inclusions',
  'Exclusions',
  'Pickup Points',
  'Itinerary',
  'Booking Link',
  'Trending',
  'Featured',
  'Status',
  'Limited Seats'
];

/* ── HTTP handlers ── */

/**
 * Handle GET requests — fetch all trips as JSON.
 * Pass all=1 to include inactive trips (for admin panel).
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action !== 'getTrips') {
      return jsonResponse({ error: 'Unknown action. Use ?action=getTrips' });
    }

    var includeAll = e.parameter.all === '1' || e.parameter.all === 'true';
    var trips = getAllTrips(includeAll);
    return jsonResponse(trips);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/**
 * Handle POST requests — add, update, or delete trips.
 * Client sends Content-Type: text/plain to avoid CORS preflight issues.
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || '';
    var trip = body.trip || {};
    var result;

    switch (action) {
      case 'addTrip':
        result = addTrip(trip);
        break;
      case 'updateTrip':
        result = updateTrip(trip);
        break;
      case 'deleteTrip':
        result = deleteTrip(trip);
        break;
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/* ── Sheet helpers ── */

/** Ensure the Trips sheet exists with correct headers in row 1 */
function ensureSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  /* Write headers if row 1 is empty or mismatched */
  var firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var needsHeaders = firstRow.join('').trim() === '' ||
    firstRow[0] !== HEADERS[0];

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0B1F3A')
      .setFontColor('#FFC107');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/** Read all trip rows and return as array of objects keyed by header name */
function getAllTrips(includeInactive) {
  var sheet = ensureSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var trips = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    /* Skip completely empty rows */
    if (row.join('').trim() === '') continue;

    var obj = rowToObject(row);
    obj.id = String(i + 2); /* Sheet row number as stable ID */
    obj.row = i + 2;

    if (!includeInactive) {
      var status = String(obj['Status'] || obj.status || 'Active').toLowerCase();
      if (status && status !== 'active' && status !== 'open') continue;
    }

    trips.push(obj);
  }

  return trips;
}

/** Convert a sheet row array to a header-keyed object */
function rowToObject(row) {
  var obj = {};
  for (var i = 0; i < HEADERS.length; i++) {
    obj[HEADERS[i]] = row[i] != null ? String(row[i]) : '';
  }
  return obj;
}

/** Map client trip object (camelCase or header keys) to ordered row array */
function tripToRow(trip) {
  var map = {
    'Trip Name': pick(trip, 'Trip Name', 'tripName', 'name'),
    'Poster': pick(trip, 'Poster', 'poster', 'Poster URL'),
    'Destination': pick(trip, 'Destination', 'destination'),
    'Category': pick(trip, 'Category', 'category'),
    'Description': pick(trip, 'Description', 'description'),
    'Duration': pick(trip, 'Duration', 'duration'),
    'Travel Date': pick(trip, 'Travel Date', 'travelDate'),
    'Price': pick(trip, 'Price', 'price'),
    'Seats': pick(trip, 'Seats', 'seats'),
    'Difficulty': pick(trip, 'Difficulty', 'difficulty') || 'Moderate',
    'Vehicle': pick(trip, 'Vehicle', 'vehicle'),
    'Inclusions': pick(trip, 'Inclusions', 'inclusions'),
    'Exclusions': pick(trip, 'Exclusions', 'exclusions'),
    'Pickup Points': pick(trip, 'Pickup Points', 'pickupPoints'),
    'Itinerary': pick(trip, 'Itinerary', 'itinerary'),
    'Booking Link': pick(trip, 'Booking Link', 'bookingLink'),
    'Trending': pick(trip, 'Trending', 'trending') || 'No',
    'Featured': pick(trip, 'Featured', 'featured') || 'No',
    'Status': pick(trip, 'Status', 'status') || 'Active',
    'Limited Seats': pick(trip, 'Limited Seats', 'limitedSeats') || 'No'
  };

  return HEADERS.map(function (h) { return map[h]; });
}

/** Pick first non-empty value from trip object by multiple possible keys */
function pick(trip, /* keys... */) {
  for (var i = 1; i < arguments.length; i++) {
    var k = arguments[i];
    if (trip[k] != null && String(trip[k]).trim() !== '') {
      return String(trip[k]).trim();
    }
  }
  return '';
}

/* ── CRUD operations ── */

/** Append a new trip row */
function addTrip(trip) {
  var sheet = ensureSheet();
  var row = tripToRow(trip);
  sheet.appendRow(row);
  var newRow = sheet.getLastRow();
  return { success: true, id: String(newRow), message: 'Trip added' };
}

/** Update an existing trip by row id */
function updateTrip(trip) {
  var sheet = ensureSheet();
  var rowNum = parseInt(pick(trip, 'id', 'row', 'ID'), 10);

  if (!rowNum || rowNum < 2) {
    throw new Error('Valid trip id (sheet row number) required for update');
  }

  if (rowNum > sheet.getLastRow()) {
    throw new Error('Trip row not found: ' + rowNum);
  }

  var row = tripToRow(trip);
  sheet.getRange(rowNum, 1, 1, HEADERS.length).setValues([row]);
  return { success: true, id: String(rowNum), message: 'Trip updated' };
}

/** Delete a trip row by id */
function deleteTrip(trip) {
  var sheet = ensureSheet();
  var rowNum = parseInt(pick(trip, 'id', 'row', 'ID'), 10);

  if (!rowNum || rowNum < 2) {
    throw new Error('Valid trip id required for delete');
  }

  if (rowNum > sheet.getLastRow()) {
    throw new Error('Trip row not found: ' + rowNum);
  }

  sheet.deleteRow(rowNum);
  return { success: true, message: 'Trip deleted' };
}

/* ── Response helper ── */

/** Return JSON with MIME type suitable for browser fetch (incl. CORS-friendly POST) */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
