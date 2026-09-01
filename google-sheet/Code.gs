/**
 * TRAVELRAYZ — Google Sheets + Drive CMS (Apps Script Web App)
 *
 * Worksheets: Trips, Inquiries (+ optional Gallery, Testimonials for legacy admin)
 *
 * Script Properties (File → Project settings → Script properties):
 *   ADMIN_SECRET      — required; admin API secret (never put in public JS)
 *   DRIVE_FOLDER_ID   — optional; Google Drive folder for trip images
 *
 * Deploy: Execute as Me · Access: Anyone
 * After code changes: Deploy → New deployment (or new version)
 *
 * Lightweight single-admin security: secret in Script Properties, validated per
 * protected POST. Not suitable for multi-user or high-security production use.
 *
 * GET  ?action=getPublishedTrips|getTrip&id=
 * POST { action, adminSecret?, ... }  Content-Type: text/plain;charset=utf-8
 */

var SHEET_TRIPS = 'Trips';
var SHEET_INQUIRIES = 'Inquiries';
var SHEET_GALLERY = 'Gallery';
var SHEET_TESTIMONIALS = 'Testimonials';
var DRIVE_FOLDER_NAME = 'TRAVELRAYZ Images';

var TRIP_HEADERS = [
  'id', 'slug', 'title', 'location', 'meetingPoint', 'category',
  'startDate', 'endDate', 'duration', 'price', 'discountedPrice',
  'seats', 'maxGroupSize', 'shortDescription', 'fullDescription',
  'inclusions', 'exclusions', 'itinerary', 'importantNotes',
  'image', 'driveFileId', 'whatsappNumber', 'featured', 'soldOut',
  'status', 'createdAt', 'updatedAt'
];

var INQUIRY_HEADERS = [
  'id', 'name', 'email', 'phone', 'company', 'inquiryType', 'groupSize', 'destination',
  'message', 'trip', 'source', 'createdAt', 'status'
];

var INQUIRY_TYPES = [
  'General Inquiry', 'Group Trip', 'Corporate Outing', 'Custom Trip', 'Collaboration'
];

var GALLERY_HEADERS = ['ID', 'Src', 'Alt', 'Status'];
var TESTIMONIAL_HEADERS = ['ID', 'Name', 'Text', 'Rating', 'Photo', 'Trip', 'Status'];

var HEADER_STYLE = { weight: 'bold', bg: '#0B1F3A', fg: '#7DD3FC' };

var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

var LOCK_WAIT_MS = 30000;
var FAIL_MAX = 5;
var FAIL_WINDOW_SEC = 600;
var LOCKOUT_SEC = 900;

/* ── HTTP ── */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    var id = (e && e.parameter && e.parameter.id) || '';

    switch (action) {
      case 'getPublishedTrips':
      case 'getTrips':
        return respond(ok('Published trips loaded', { trips: getPublishedTrips() }));
      case 'getTrip':
        if (!id) return respond(fail('Trip id is required'));
        var trip = getTripById(id, false);
        if (!trip) return respond(fail('Trip not found or not published'));
        return respond(ok('Trip loaded', { trip: trip }));
      case 'getGallery':
        return respond(ok('Gallery loaded', { items: getGalleryItems(false) }));
      case 'getTestimonials':
        return respond(ok('Testimonials loaded', { items: getTestimonials(false) }));
      default:
        return respond(fail('Unknown GET action. Use getPublishedTrips or getTrip'));
    }
  } catch (err) {
    return respond(fail(String(err.message || err)));
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var body = parseBody(e);
    var action = body.action || '';

    var writeActions = {
      createTrip: 1, updateTrip: 1, publishTrip: 1, unpublishTrip: 1, deleteTrip: 1,
      uploadImage: 1, deleteImage: 1, saveInquiry: 1,
      addTrip: 1, updateTripLegacy: 1,
      addGallery: 1, deleteGallery: 1, addTestimonial: 1, deleteTestimonial: 1
    };

    if (writeActions[action]) {
      locked = lock.tryLock(LOCK_WAIT_MS);
      if (!locked) return respond(fail('Server busy — please retry'));
    }

    var result;
    switch (action) {
      case 'validateAdmin':
        requireAdmin(body.adminSecret);
        result = ok('Admin secret valid', {});
        break;
      case 'getAllTrips':
        requireAdmin(body.adminSecret);
        result = ok('All trips loaded', { trips: getAllTripsAdmin() });
        break;
      case 'createTrip':
      case 'addTrip':
        requireAdmin(body.adminSecret);
        result = ok('Trip created successfully', { trip: createTrip(body.trip || {}) });
        break;
      case 'updateTrip':
        requireAdmin(body.adminSecret);
        result = ok('Trip updated successfully', { trip: updateTrip(body.trip || {}) });
        break;
      case 'publishTrip':
        requireAdmin(body.adminSecret);
        result = ok('Trip published', { trip: setTripStatus(body.trip || body, 'published') });
        break;
      case 'unpublishTrip':
        requireAdmin(body.adminSecret);
        result = ok('Trip unpublished', { trip: setTripStatus(body.trip || body, 'draft') });
        break;
      case 'deleteTrip':
        requireAdmin(body.adminSecret);
        deleteTrip(body.trip || body);
        result = ok('Trip deleted successfully', {});
        break;
      case 'saveInquiry':
        result = ok('Inquiry saved successfully', { inquiry: saveInquiry(body.inquiry || body) });
        break;
      case 'uploadImage':
        requireAdmin(body.adminSecret);
        result = ok('Image uploaded successfully', uploadImage(body.file || body, body.replaceFileId || ''));
        break;
      case 'deleteImage':
        requireAdmin(body.adminSecret);
        deleteImageById(body.fileId || body.driveFileId || (body.file && body.file.id));
        result = ok('Image deleted successfully', {});
        break;
      case 'addGallery':
        requireAdmin(body.adminSecret);
        result = ok('Gallery item added', addGalleryItem(body.item || {}));
        break;
      case 'deleteGallery':
        requireAdmin(body.adminSecret);
        deleteGalleryItem(body.item || {});
        result = ok('Gallery item deleted', {});
        break;
      case 'addTestimonial':
        requireAdmin(body.adminSecret);
        result = ok('Testimonial added', addTestimonial(body.item || {}));
        break;
      case 'deleteTestimonial':
        requireAdmin(body.adminSecret);
        deleteTestimonial(body.item || {});
        result = ok('Testimonial deleted', {});
        break;
      default:
        result = fail('Unknown action: ' + action);
    }

    return respond(result);
  } catch (err) {
    return respond(fail(String(err.message || err)));
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ── Responses ── */

function ok(message, data) {
  return { success: true, message: message || 'OK', data: data || {} };
}

function fail(message, data) {
  return { success: false, message: message || 'Error', data: data || null };
}

function respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  return {};
}

/* ── Admin security ── */

function requireAdmin(secret) {
  if (isLockedOut()) {
    throw new Error('Too many failed login attempts. Try again in about 15 minutes.');
  }

  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');
  if (!expected) {
    throw new Error('ADMIN_SECRET is not set in Script Properties');
  }

  if (String(secret || '').trim() !== String(expected).trim()) {
    recordFailedAttempt();
    throw new Error('Invalid admin secret');
  }

  clearFailedAttempts();
}

function isLockedOut() {
  var cache = CacheService.getScriptCache();
  return cache.get('ADMIN_LOCKED') === '1';
}

function recordFailedAttempt() {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('ADMIN_FAILS');
  var now = Date.now();
  var list = raw ? JSON.parse(raw) : [];
  list = list.filter(function (t) { return now - t < FAIL_WINDOW_SEC * 1000; });
  list.push(now);
  cache.put('ADMIN_FAILS', JSON.stringify(list), FAIL_WINDOW_SEC);
  if (list.length >= FAIL_MAX) {
    cache.put('ADMIN_LOCKED', '1', LOCKOUT_SEC);
    cache.remove('ADMIN_FAILS');
  }
}

function clearFailedAttempts() {
  var cache = CacheService.getScriptCache();
  cache.remove('ADMIN_FAILS');
  cache.remove('ADMIN_LOCKED');
}

/* ── IDs & slugs ── */

function newId() {
  return Utilities.getUuid();
}

function slugify(text) {
  var s = String(text || '').toLowerCase().trim();
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || ('trip-' + newId().slice(0, 8));
}

function isoNow() {
  return new Date().toISOString();
}

/* ── Drive ── */

function getImageFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DRIVE_FOLDER_ID');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (err) {
      /* folder removed */
    }
  }

  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  props.setProperty('DRIVE_FOLDER_ID', folder.getId());
  return folder;
}

function publicImageUrl(fileId) {
  return 'https://lh3.googleusercontent.com/d/' + fileId;
}

function extractDriveId(urlOrId) {
  var s = String(urlOrId || '').trim();
  if (!s) return '';
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s) && s.indexOf('/') === -1) return s;
  var m = s.match(/[?&]id=([^&]+)/) ||
    s.match(/lh3\.googleusercontent\.com\/d\/([^?/=]+)/) ||
    s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

function trashDriveFile(fileId) {
  if (!fileId) return;
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (err) {
    /* already gone */
  }
}

function validateMime(mime) {
  var m = String(mime || '').toLowerCase();
  if (m === 'image/jpg') m = 'image/jpeg';
  if (!ALLOWED_MIME[m]) {
    throw new Error('Invalid image type. Allowed: JPG, JPEG, PNG, WEBP');
  }
  return m;
}

function uniqueFilename(mime) {
  var ext = ALLOWED_MIME[mime] || 'jpg';
  return 'travelrayz-' + Date.now() + '-' + newId().slice(0, 8) + '.' + ext;
}

/**
 * Upload base64 image. Client sends { data, mimeType, filename? }.
 * Optional replaceFileId deletes the previous Drive file after success.
 */
function uploadImage(file, replaceFileId) {
  var raw = String((file && (file.data || file.base64 || file.contents)) || '').replace(/\s/g, '');
  if (!raw) throw new Error('Image data is required');

  var mime = validateMime((file && file.mimeType) || 'image/jpeg');
  var prefix = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (prefix) {
    mime = validateMime(prefix[1]);
    raw = prefix[2];
  }

  var bytes = Utilities.base64Decode(raw);
  if (!bytes || !bytes.length) throw new Error('Could not decode image');
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large (max 5 MB)');
  }

  var name = String((file && file.filename) || uniqueFilename(mime)).replace(/[^\w.\-]+/g, '_');
  if (!/\.(jpe?g|png|webp)$/i.test(name)) {
    name = uniqueFilename(mime);
  }

  var blob = Utilities.newBlob(bytes, mime, name);
  var driveFile = getImageFolder().createFile(blob);

  try {
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    /* Workspace policy may block — URL may still work for owner */
  }

  var fileId = driveFile.getId();
  var oldId = extractDriveId(replaceFileId);
  if (oldId && oldId !== fileId) {
    trashDriveFile(oldId);
  }

  return {
    id: fileId,
    driveFileId: fileId,
    url: publicImageUrl(fileId),
    name: driveFile.getName()
  };
}

function deleteImageById(fileId) {
  var id = extractDriveId(fileId);
  if (!id) throw new Error('fileId is required');
  trashDriveFile(id);
}

/* ── Sheet helpers ── */

function styleHeaderRow(sheet, count) {
  sheet.getRange(1, 1, 1, count)
    .setFontWeight(HEADER_STYLE.weight)
    .setBackground(HEADER_STYLE.bg)
    .setFontColor(HEADER_STYLE.fg);
  sheet.setFrozenRows(1);
}

function ensureNamedSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var needsHeaders = firstRow.join('').trim() === '' || String(firstRow[0]).trim() !== headers[0];
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function headerMap(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim();
    if (h) map[h] = i + 1;
  }
  return map;
}

function rowToObject(sheet, rowIndex, headers) {
  var width = Math.max(headers.length, sheet.getLastColumn());
  var values = sheet.getRange(rowIndex, 1, rowIndex, width).getValues()[0];
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[i] != null ? String(values[i]) : '';
  }
  obj.id = String(obj.id || '').trim();
  obj.row = rowIndex;
  return obj;
}

function findTripRow(sheet, id) {
  var wanted = String(id || '').trim();
  if (!wanted) return 0;
  var map = headerMap(sheet);
  var idCol = map.id || map.ID;
  if (!idCol) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === wanted) return i + 2;
  }
  return 0;
}

function pick(obj /* keys... */) {
  for (var i = 1; i < arguments.length; i++) {
    var k = arguments[i];
    if (obj[k] != null && String(obj[k]).trim() !== '') return String(obj[k]).trim();
  }
  return '';
}

/* ── JSON list fields ── */

function toJsonList(value) {
  if (value == null || value === '') return '[]';
  if (Array.isArray(value)) return JSON.stringify(value);
  var s = String(value).trim();
  if (!s) return '[]';
  if (s.charAt(0) === '[') {
    try {
      JSON.parse(s);
      return s;
    } catch (err) {
      /* fall through */
    }
  }
  var parts = s.split(/\||\n|,/).map(function (p) { return p.trim(); }).filter(Boolean);
  return JSON.stringify(parts);
}

function parseJsonList(value) {
  var s = String(value || '').trim();
  if (!s) return [];
  if (s.charAt(0) === '[') {
    try {
      var arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : [s];
    } catch (err) {
      return [s];
    }
  }
  return s.split(/\||\n/).map(function (p) { return p.trim(); }).filter(Boolean);
}

/* ── Trip mapping (legacy + new field names) ── */

function normalizeIncomingTrip(trip) {
  var t = trip || {};
  return {
    id: pick(t, 'id', 'ID'),
    slug: pick(t, 'slug'),
    title: pick(t, 'title', 'tripName', 'Trip Name', 'name'),
    location: pick(t, 'location', 'destination', 'Destination'),
    meetingPoint: pick(t, 'meetingPoint', 'pickupPoints', 'Pickup Points'),
    category: pick(t, 'category', 'Category'),
    startDate: pick(t, 'startDate', 'travelDate', 'Travel Date'),
    endDate: pick(t, 'endDate'),
    duration: pick(t, 'duration', 'Duration'),
    price: pick(t, 'price', 'Price'),
    discountedPrice: pick(t, 'discountedPrice'),
    seats: pick(t, 'seats', 'Seats'),
    maxGroupSize: pick(t, 'maxGroupSize'),
    shortDescription: pick(t, 'shortDescription'),
    fullDescription: pick(t, 'fullDescription', 'description', 'Description'),
    inclusions: t.inclusions != null ? t.inclusions : pick(t, 'Inclusions'),
    exclusions: t.exclusions != null ? t.exclusions : pick(t, 'Exclusions'),
    itinerary: t.itinerary != null ? t.itinerary : pick(t, 'Itinerary'),
    importantNotes: pick(t, 'importantNotes', 'difficulty', 'Difficulty', 'vehicle', 'Vehicle'),
    image: pick(t, 'image', 'poster', 'Poster'),
    driveFileId: pick(t, 'driveFileId', 'driveFileID'),
    whatsappNumber: pick(t, 'whatsappNumber'),
    featured: pick(t, 'featured', 'Featured') || 'No',
    soldOut: pick(t, 'soldOut', 'limitedSeats', 'Limited Seats') || 'No',
    status: pick(t, 'status', 'Status') || 'draft'
  };
}

function tripToRow(trip, existing) {
  var n = normalizeIncomingTrip(trip);
  var now = isoNow();
  var id = existing && existing.id ? existing.id : (n.id || newId());
  var title = n.title || 'Untitled Trip';

  if (!n.shortDescription && n.fullDescription) {
    n.shortDescription = n.fullDescription.slice(0, 220);
  }
  if (!n.fullDescription && n.shortDescription) {
    n.fullDescription = n.shortDescription;
  }

  var image = n.image;
  var driveFileId = n.driveFileId || extractDriveId(image);
  if (driveFileId && !image) image = publicImageUrl(driveFileId);

  var featured = /^(yes|true|1)$/i.test(n.featured) ? 'Yes' : 'No';
  var soldOut = /^(yes|true|1)$/i.test(n.soldOut) ? 'Yes' : 'No';
  var status = String(n.status || 'draft').toLowerCase();
  if (status === 'active') status = 'published';

  return {
    id: id,
    slug: n.slug || slugify(title),
    title: title,
    location: n.location,
    meetingPoint: n.meetingPoint,
    category: n.category,
    startDate: n.startDate,
    endDate: n.endDate,
    duration: n.duration,
    price: n.price,
    discountedPrice: n.discountedPrice,
    seats: n.seats,
    maxGroupSize: n.maxGroupSize,
    shortDescription: n.shortDescription,
    fullDescription: n.fullDescription,
    inclusions: toJsonList(n.inclusions),
    exclusions: toJsonList(n.exclusions),
    itinerary: toJsonList(n.itinerary),
    importantNotes: n.importantNotes,
    image: image,
    driveFileId: driveFileId,
    whatsappNumber: n.whatsappNumber,
    featured: featured,
    soldOut: soldOut,
    status: status,
    createdAt: existing && existing.createdAt ? existing.createdAt : now,
    updatedAt: now
  };
}

function rowObjectToArray(obj) {
  return TRIP_HEADERS.map(function (h) { return obj[h] != null ? obj[h] : ''; });
}

function readAllTrips(includeUnpublished) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var trips = [];
  for (var r = 2; r <= lastRow; r++) {
    var obj = rowToObject(sheet, r, TRIP_HEADERS);
    if (String(obj.title || obj.id || '').trim() === '') continue;

    if (!obj.id) {
      obj.id = newId();
      sheet.getRange(r, 1).setValue(obj.id);
    }

    if (!includeUnpublished && String(obj.status).toLowerCase() !== 'published') continue;

    trips.push(enrichTrip(obj));
  }
  return trips;
}

function enrichTrip(obj) {
  obj.inclusionsList = parseJsonList(obj.inclusions);
  obj.exclusionsList = parseJsonList(obj.exclusions);
  obj.itineraryList = parseJsonList(obj.itinerary);
  return obj;
}

function getPublishedTrips() {
  return readAllTrips(false);
}

function getAllTripsAdmin() {
  return readAllTrips(true);
}

function getTripById(id, admin) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var rowNum = findTripRow(sheet, id);
  if (!rowNum) return null;
  var obj = enrichTrip(rowToObject(sheet, rowNum, TRIP_HEADERS));
  if (!admin && String(obj.status).toLowerCase() !== 'published') return null;
  return obj;
}

function writeTripRow(sheet, rowNum, rowObj) {
  sheet.getRange(rowNum, 1, rowNum, TRIP_HEADERS.length).setValues([rowObjectToArray(rowObj)]);
  return enrichTrip(rowObj);
}

function createTrip(trip) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var rowObj = tripToRow(trip, null);
  sheet.appendRow(rowObjectToArray(rowObj));
  return rowObj;
}

function updateTrip(trip) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var id = pick(trip, 'id', 'ID');
  var rowNum = findTripRow(sheet, id);
  if (!rowNum) throw new Error('Trip not found');

  var existing = rowToObject(sheet, rowNum, TRIP_HEADERS);
  var rowObj = tripToRow(trip, existing);

  var oldDriveId = extractDriveId(existing.driveFileId || existing.image);
  var newDriveId = extractDriveId(rowObj.driveFileId || rowObj.image);
  if (oldDriveId && newDriveId && oldDriveId !== newDriveId) {
    trashDriveFile(oldDriveId);
  }

  writeTripRow(sheet, rowNum, rowObj);
  return rowObj;
}

function setTripStatus(tripRef, status) {
  var id = pick(tripRef, 'id', 'ID');
  return updateTrip({ id: id, status: status });
}

function deleteTrip(tripRef) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var id = pick(tripRef, 'id', 'ID');
  var rowNum = findTripRow(sheet, id);
  if (!rowNum) throw new Error('Trip not found');

  var existing = rowToObject(sheet, rowNum, TRIP_HEADERS);
  trashDriveFile(extractDriveId(existing.driveFileId || existing.image));

  sheet.deleteRow(rowNum);
}

/* ── Inquiries ── */

function saveInquiry(inquiry) {
  var sheet = ensureNamedSheet(SHEET_INQUIRIES, INQUIRY_HEADERS);
  var q = inquiry || {};

  var name = trimField(pick(q, 'name'), 120);
  var email = trimField(pick(q, 'email'), 160);
  var phone = trimField(pick(q, 'phone'), 24);
  var company = trimField(pick(q, 'company'), 120);
  var inquiryType = trimField(pick(q, 'inquiryType', 'inquiry_type'), 60);
  var groupSize = trimField(pick(q, 'groupSize', 'group_size'), 8);
  var destination = trimField(pick(q, 'destination', 'preferredDestination'), 160);
  var message = trimField(pick(q, 'message'), 2000);
  var trip = trimField(pick(q, 'trip'), 120);
  var source = trimField(pick(q, 'source') || 'website', 60);

  if (!name || name.length < 2) {
    throw new Error('Name is required (at least 2 characters)');
  }

  var phoneDigits = String(phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    throw new Error('A valid phone number is required');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address');
  }

  if (!inquiryType || INQUIRY_TYPES.indexOf(inquiryType) === -1) {
    throw new Error('Select a valid inquiry type');
  }

  if (!message || message.length < 10) {
    throw new Error('Message must be at least 10 characters');
  }

  if (groupSize) {
    var gs = Number(groupSize);
    if (isNaN(gs) || gs < 1 || gs > 5000) {
      throw new Error('Group size must be between 1 and 5000');
    }
  }

  var row = {
    id: newId(),
    name: name,
    email: email,
    phone: phone,
    company: company,
    inquiryType: inquiryType,
    groupSize: groupSize,
    destination: destination,
    message: message,
    trip: trip || inquiryType,
    source: source,
    createdAt: isoNow(),
    status: 'new'
  };

  sheet.appendRow(INQUIRY_HEADERS.map(function (h) { return row[h] || ''; }));
  return row;
}

function trimField(value, maxLen) {
  var s = String(value == null ? '' : value).trim();
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

/* ── Gallery (optional legacy admin) ── */

function getGalleryItems(includeInactive) {
  var sheet = ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var items = [];
  for (var r = 2; r <= lastRow; r++) {
    var row = sheet.getRange(r, 1, 1, GALLERY_HEADERS.length).getValues()[0];
    var item = { id: String(row[0]), src: String(row[1]), alt: String(row[2]), status: String(row[3] || 'Active') };
    if (!includeInactive) {
      var st = item.status.toLowerCase();
      if (st && st !== 'active' && st !== 'open') continue;
    }
    items.push(item);
  }
  return items;
}

function addGalleryItem(item) {
  var sheet = ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  var id = newId();
  sheet.appendRow([id, pick(item, 'src', 'Src'), pick(item, 'alt', 'Alt'), pick(item, 'status', 'Status') || 'Active']);
  return { id: id };
}

function deleteGalleryItem(item) {
  var sheet = ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  var rowNum = findLegacyRowById(sheet, pick(item, 'id', 'ID'));
  if (!rowNum) throw new Error('Gallery item not found');
  trashDriveFile(extractDriveId(sheet.getRange(rowNum, 2).getValue()));
  sheet.deleteRow(rowNum);
}

/* ── Testimonials (optional legacy admin) ── */

function getTestimonials(includeInactive) {
  var sheet = ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var items = [];
  for (var r = 2; r <= lastRow; r++) {
    var row = sheet.getRange(r, 1, 1, TESTIMONIAL_HEADERS.length).getValues()[0];
    var item = {
      id: String(row[0]), name: String(row[1]), text: String(row[2]),
      rating: String(row[3]), photo: String(row[4]), trip: String(row[5]), status: String(row[6] || 'Active')
    };
    if (!includeInactive) {
      var st = item.status.toLowerCase();
      if (st && st !== 'active' && st !== 'open') continue;
    }
    items.push(item);
  }
  return items;
}

function addTestimonial(item) {
  var sheet = ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  var id = newId();
  sheet.appendRow([
    id, pick(item, 'name', 'Name'), pick(item, 'text', 'Text'),
    pick(item, 'rating', 'Rating') || '5', pick(item, 'photo', 'Photo'),
    pick(item, 'trip', 'Trip'), pick(item, 'status', 'Status') || 'Active'
  ]);
  return { id: id };
}

function deleteTestimonial(item) {
  var sheet = ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  var rowNum = findLegacyRowById(sheet, pick(item, 'id', 'ID'));
  if (!rowNum) throw new Error('Testimonial not found');
  trashDriveFile(extractDriveId(sheet.getRange(rowNum, 5).getValue()));
  sheet.deleteRow(rowNum);
}

function findLegacyRowById(sheet, id) {
  var wanted = String(id || '').trim();
  if (!wanted) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === wanted) return i + 2;
  }
  return 0;
}

/* ── Setup helper (run once from editor) ── */

function setupSheets() {
  ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  ensureNamedSheet(SHEET_INQUIRIES, INQUIRY_HEADERS);
  ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  Logger.log('Sheets ready. Set ADMIN_SECRET and DRIVE_FOLDER_ID in Script Properties, then deploy.');
}
