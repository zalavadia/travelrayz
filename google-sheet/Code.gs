/**
 * TRAVELRAYZ — Google Sheets + Drive CMS (Apps Script Web App)
 *
 * Worksheets: Trips, Inquiries (+ optional Gallery, Testimonials for legacy admin)
 *
 * Script Properties (File → Project settings → Script properties):
 *   ADMIN_USER_ID     — required; admin login ID
 *   ADMIN_PASSWORD    — required; admin login password (never put in public JS)
 *   DRIVE_FOLDER_ID   — optional; Google Drive folder for trip images
 *
 * Deploy: Execute as Me · Access: Anyone
 * After code changes: Deploy → New deployment (or new version)
 *
 * Lightweight single-admin security: credentials in Script Properties, validated per
 * protected POST. Not suitable for multi-user or high-security production use.
 *
 * GET  ?action=getPublishedTrips|getTrip&id=|getSiteStats|getBookingPolicy
 * POST { action, adminUserId?, adminPassword?, ... }  Content-Type: text/plain;charset=utf-8
 *
 * Homepage counters are stored in Script Properties:
 *   SITE_STAT_HAPPY, SITE_STAT_TRIPS, SITE_STAT_HAPPY_LABEL,
 *   SITE_STAT_TRIPS_LABEL, SITE_STAT_NOTE, SITE_STAT_SUFFIX
 * Booking policy JSON: SITE_BOOKING_POLICY
 */

var SHEET_TRIPS = "Trips";
var SHEET_INQUIRIES = "Inquiries";
var SHEET_GALLERY = "Gallery";
var SHEET_TESTIMONIALS = "Testimonials";
var DRIVE_FOLDER_NAME = "TRAVELRAYZ Images";

var TRIP_HEADERS = [
  "id",
  "slug",
  "title",
  "location",
  "meetingPoint",
  "category",
  "startDate",
  "endDate",
  "duration",
  "price",
  "discountedPrice",
  "seats",
  "maxGroupSize",
  "shortDescription",
  "fullDescription",
  "inclusions",
  "exclusions",
  "itinerary",
  "importantNotes",
  "image",
  "driveFileId",
  "whatsappNumber",
  "featured",
  "soldOut",
  "status",
  "createdAt",
  "updatedAt"
];

var INQUIRY_HEADERS = [
  "id",
  "name",
  "email",
  "phone",
  "company",
  "inquiryType",
  "groupSize",
  "destination",
  "message",
  "trip",
  "source",
  "createdAt",
  "status"
];

var INQUIRY_TYPES = [
  "General Inquiry",
  "Group Trip",
  "Corporate Outing",
  "Custom Trip",
  "Collaboration"
];

var GALLERY_HEADERS = ["ID", "Src", "Alt", "Status"];
var TESTIMONIAL_HEADERS = [
  "ID",
  "Name",
  "Text",
  "Rating",
  "Photo",
  "Trip",
  "Status"
];

var HEADER_STYLE = { weight: "bold", bg: "#0B1F3A", fg: "#7DD3FC" };

var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var ALLOWED_MIME = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

var LOCK_WAIT_MS = 30000;
var FAIL_MAX = 5;
var FAIL_WINDOW_SEC = 600;
var LOCKOUT_SEC = 900;

/* ── HTTP ── */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "";
    var id = (e && e.parameter && e.parameter.id) || "";

    switch (action) {
      case "getPublishedTrips":
      case "getTrips":
        return respond(
          ok("Published trips loaded", { trips: getPublishedTrips() })
        );
      case "getTrip":
        if (!id) return respond(fail("Trip id is required"));
        var trip = getTripById(id, false);
        if (!trip) return respond(fail("Trip not found or not published"));
        return respond(ok("Trip loaded", { trip: trip }));
      case "getGallery":
        var allGallery = e && e.parameter && e.parameter.all === "1";
        return respond(
          ok("Gallery loaded", { items: getGalleryItems(allGallery) })
        );
      case "getTestimonials":
        var allTestimonials = e && e.parameter && e.parameter.all === "1";
        return respond(
          ok("Testimonials loaded", {
            items: getTestimonials(allTestimonials)
          })
        );
      case "getImage":
        if (!id) return respond(fail("Image id is required"));
        return serveDriveImage(id);
      case "getSiteStats":
        return respond(ok("Site stats loaded", { stats: getSiteStats() }));
      case "getBookingPolicy":
        return respond(
          ok("Booking policy loaded", { policy: getBookingPolicy() })
        );
      default:
        return respond(
          fail("Unknown GET action. Use getPublishedTrips or getTrip")
        );
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
    var action = body.action || "";

    var writeActions = {
      createTrip: 1,
      updateTrip: 1,
      publishTrip: 1,
      unpublishTrip: 1,
      deleteTrip: 1,
      uploadImage: 1,
      deleteImage: 1,
      saveInquiry: 1,
      addTrip: 1,
      updateTripLegacy: 1,
      addGallery: 1,
      deleteGallery: 1,
      addTestimonial: 1,
      deleteTestimonial: 1,
      saveSiteStats: 1,
      saveBookingPolicy: 1
    };

    if (writeActions[action]) {
      locked = lock.tryLock(LOCK_WAIT_MS);
      if (!locked) return respond(fail("Server busy — please retry"));
    }

    var result;
    switch (action) {
      case "validateAdmin":
        requireAdmin(body);
        result = ok("Admin credentials valid", {});
        break;
      case "getAllTrips":
        requireAdmin(body);
        result = ok("All trips loaded", { trips: getAllTripsAdmin() });
        break;
      case "createTrip":
      case "addTrip":
        requireAdmin(body);
        result = ok("Trip created successfully", {
          trip: createTrip(body.trip || {})
        });
        break;
      case "updateTrip":
        requireAdmin(body);
        result = ok("Trip updated successfully", {
          trip: updateTrip(body.trip || {})
        });
        break;
      case "publishTrip":
        requireAdmin(body);
        result = ok("Trip published", {
          trip: setTripStatus(body.trip || body, "published")
        });
        break;
      case "unpublishTrip":
        requireAdmin(body);
        result = ok("Trip unpublished", {
          trip: setTripStatus(body.trip || body, "draft")
        });
        break;
      case "deleteTrip":
        requireAdmin(body);
        deleteTrip(body.trip || body);
        result = ok("Trip deleted successfully", {});
        break;
      case "saveInquiry":
        result = ok("Inquiry saved successfully", {
          inquiry: saveInquiry(body.inquiry || body)
        });
        break;
      case "uploadImage":
        requireAdmin(body);
        result = ok(
          "Image uploaded successfully",
          uploadImage(body.file || body, body.replaceFileId || "")
        );
        break;
      case "deleteImage":
        requireAdmin(body);
        deleteImageById(
          body.fileId || body.driveFileId || (body.file && body.file.id)
        );
        result = ok("Image deleted successfully", {});
        break;
      case "addGallery":
        requireAdmin(body);
        result = ok("Gallery item added", addGalleryItem(body.item || {}));
        break;
      case "deleteGallery":
        requireAdmin(body);
        deleteGalleryItem(body.item || {});
        result = ok("Gallery item deleted", {});
        break;
      case "addTestimonial":
        requireAdmin(body);
        result = ok("Testimonial added", addTestimonial(body.item || {}));
        break;
      case "deleteTestimonial":
        requireAdmin(body);
        deleteTestimonial(body.item || {});
        result = ok("Testimonial deleted", {});
        break;
      case "saveSiteStats":
        requireAdmin(body);
        result = ok("Site stats saved", {
          stats: saveSiteStats(body.stats || {})
        });
        break;
      case "saveBookingPolicy":
        requireAdmin(body);
        result = ok("Booking policy saved", {
          policy: saveBookingPolicy(body.policy || {})
        });
        break;
      default:
        result = fail("Unknown action: " + action);
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
  return { success: true, message: message || "OK", data: data || {} };
}

function fail(message, data) {
  return { success: false, message: message || "Error", data: data || null };
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  return {};
}

/* ── Admin security ── */

function requireAdmin(body) {
  if (isLockedOut()) {
    throw new Error(
      "Too many failed login attempts. Try again in about 15 minutes."
    );
  }

  body = body || {};
  var props = PropertiesService.getScriptProperties();
  var expectedUser = String(props.getProperty("ADMIN_USER_ID") || "").trim();
  var expectedPass = String(props.getProperty("ADMIN_PASSWORD") || "").trim();
  var userId = String(body.adminUserId || "").trim();
  var password = String(body.adminPassword || "").trim();
  var legacySecret = String(body.adminSecret || "").trim();

  if (!expectedUser || !expectedPass) {
    var legacyExpected = String(props.getProperty("ADMIN_SECRET") || "").trim();
    if (legacyExpected && legacySecret === legacyExpected) {
      clearFailedAttempts();
      return;
    }
    throw new Error(
      "ADMIN_USER_ID and ADMIN_PASSWORD are not set in Script Properties"
    );
  }

  if (userId !== expectedUser || password !== expectedPass) {
    recordFailedAttempt();
    throw new Error("Invalid admin ID or password");
  }

  clearFailedAttempts();
}

function isLockedOut() {
  var cache = CacheService.getScriptCache();
  return cache.get("ADMIN_LOCKED") === "1";
}

function recordFailedAttempt() {
  var cache = CacheService.getScriptCache();
  var raw = cache.get("ADMIN_FAILS");
  var now = Date.now();
  var list = raw ? JSON.parse(raw) : [];
  list = list.filter(function (t) {
    return now - t < FAIL_WINDOW_SEC * 1000;
  });
  list.push(now);
  cache.put("ADMIN_FAILS", JSON.stringify(list), FAIL_WINDOW_SEC);
  if (list.length >= FAIL_MAX) {
    cache.put("ADMIN_LOCKED", "1", LOCKOUT_SEC);
    cache.remove("ADMIN_FAILS");
  }
}

function clearFailedAttempts() {
  var cache = CacheService.getScriptCache();
  cache.remove("ADMIN_FAILS");
  cache.remove("ADMIN_LOCKED");
}

/* ── IDs & slugs ── */

function newId() {
  return Utilities.getUuid();
}

function slugify(text) {
  var s = String(text || "")
    .toLowerCase()
    .trim();
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "trip-" + newId().slice(0, 8);
}

function isoNow() {
  return new Date().toISOString();
}

/* ── Drive ── */

function getImageFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("DRIVE_FOLDER_ID");
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (err) {
      /* folder removed */
    }
  }

  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  props.setProperty("DRIVE_FOLDER_ID", folder.getId());
  return folder;
}

function publicImageUrl(fileId) {
  return "https://lh3.googleusercontent.com/d/" + fileId + "=w800";
}

function serveDriveImage(fileId) {
  var id = extractDriveId(fileId);
  if (!id) throw new Error("Invalid image id");
  return DriveApp.getFileById(id).getBlob();
}

function normalizeImageField(image, driveFileId) {
  var driveId = extractDriveId(driveFileId || image);
  if (driveId) return publicImageUrl(driveId);
  return String(image || "").trim();
}

function extractDriveId(urlOrId) {
  var s = String(urlOrId || "").trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s) && s.indexOf("/") === -1) return s;
  var m =
    s.match(/[?&]id=([^&]+)/) ||
    s.match(/lh3\.googleusercontent\.com\/d\/([^?/=]+)/) ||
    s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : "";
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
  var m = String(mime || "").toLowerCase();
  if (m === "image/jpg") m = "image/jpeg";
  if (!ALLOWED_MIME[m]) {
    throw new Error("Invalid image type. Allowed: JPG, JPEG, PNG, WEBP");
  }
  return m;
}

function uniqueFilename(mime) {
  var ext = ALLOWED_MIME[mime] || "jpg";
  return "travelrayz-" + Date.now() + "-" + newId().slice(0, 8) + "." + ext;
}

/**
 * Upload base64 image. Client sends { data, mimeType, filename? }.
 * Optional replaceFileId deletes the previous Drive file after success.
 */
function uploadImage(file, replaceFileId) {
  var raw = String(
    (file && (file.data || file.base64 || file.contents)) || ""
  ).replace(/\s/g, "");
  if (!raw) throw new Error("Image data is required");

  var mime = validateMime((file && file.mimeType) || "image/jpeg");
  var prefix = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (prefix) {
    mime = validateMime(prefix[1]);
    raw = prefix[2];
  }

  var bytes = Utilities.base64Decode(raw);
  if (!bytes || !bytes.length) throw new Error("Could not decode image");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5 MB)");
  }

  var name = String((file && file.filename) || uniqueFilename(mime)).replace(
    /[^\w.\-]+/g,
    "_"
  );
  if (!/\.(jpe?g|png|webp)$/i.test(name)) {
    name = uniqueFilename(mime);
  }

  var blob = Utilities.newBlob(bytes, mime, name);
  var driveFile = getImageFolder().createFile(blob);

  try {
    driveFile.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
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
  if (!id) throw new Error("fileId is required");
  trashDriveFile(id);
}

/* ── Sheet helpers ── */

function styleHeaderRow(sheet, count) {
  sheet
    .getRange(1, 1, 1, count)
    .setFontWeight(HEADER_STYLE.weight)
    .setBackground(HEADER_STYLE.bg)
    .setFontColor(HEADER_STYLE.fg);
  sheet.setFrozenRows(1);
}

function ensureNamedSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (!headers || !headers.length) {
    throw new Error("Sheet headers are not configured for " + name);
  }

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  var firstRow = headerRange.getValues()[0];
  var firstHeader = String(firstRow[0] || "")
    .trim()
    .toLowerCase();
  var expectedHeader = String(headers[0] || "")
    .trim()
    .toLowerCase();
  var needsHeaders =
    firstRow.join("").trim() === "" ||
    firstHeader !== expectedHeader ||
    sheet.getLastColumn() < headers.length;

  if (needsHeaders) {
    headerRange.setValues([headers.slice()]);
    styleHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function headerMap(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  /* getRange(row, column, numRows, numColumns) — not end-row/end-col */
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || "").trim();
    if (h) map[h] = i + 1;
  }
  return map;
}

function rowToObject(sheet, rowIndex, headers) {
  var width = Math.max(headers.length, sheet.getLastColumn());
  var values = sheet.getRange(rowIndex, 1, 1, width).getValues()[0];
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[i] != null ? String(values[i]) : "";
  }
  obj.id = String(obj.id || "").trim();
  obj.row = rowIndex;
  return obj;
}

function findTripRow(sheet, id) {
  var wanted = String(id || "").trim();
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
    if (obj[k] != null && String(obj[k]).trim() !== "")
      return String(obj[k]).trim();
  }
  return "";
}

/* ── JSON list fields ── */

function toJsonList(value) {
  if (value == null || value === "") return "[]";
  if (Array.isArray(value)) return JSON.stringify(value);
  var s = String(value).trim();
  if (!s) return "[]";
  if (s.charAt(0) === "[") {
    try {
      JSON.parse(s);
      return s;
    } catch (err) {
      /* fall through */
    }
  }
  var parts = s
    .split(/\||\n|,/)
    .map(function (p) {
      return p.trim();
    })
    .filter(Boolean);
  return JSON.stringify(parts);
}

/** Day-wise itinerary: store and return exactly as entered (no trim). */
function toPlainItinerary(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map(function (part) {
        return part == null ? "" : String(part);
      })
      .join("\n");
  }
  var s = String(value);
  if (s.charAt(0) === "[") {
    try {
      var arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr
          .map(function (part) {
            return part == null ? "" : String(part);
          })
          .join("\n");
      }
    } catch (err) {
      /* keep raw text */
    }
  }
  return s;
}

function pickRaw(obj /* keys... */) {
  for (var i = 1; i < arguments.length; i++) {
    var k = arguments[i];
    if (obj != null && Object.prototype.hasOwnProperty.call(obj, k)) {
      return obj[k] == null ? "" : String(obj[k]);
    }
  }
  return "";
}

function parseJsonList(value) {
  var s = String(value || "").trim();
  if (!s) return [];
  if (s.charAt(0) === "[") {
    try {
      var arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : [s];
    } catch (err) {
      return [s];
    }
  }
  return s
    .split(/\||\n/)
    .map(function (p) {
      return p.trim();
    })
    .filter(Boolean);
}

/* ── Trip mapping (legacy + new field names) ── */

function normalizeIncomingTrip(trip) {
  var t = trip || {};
  return {
    id: pick(t, "id", "ID"),
    slug: pick(t, "slug"),
    title: pick(t, "title", "tripName", "Trip Name", "name"),
    location: pick(t, "location", "destination", "Destination"),
    meetingPoint: pick(t, "meetingPoint", "pickupPoints", "Pickup Points"),
    category: pick(t, "category", "Category"),
    startDate: pick(t, "startDate", "travelDate", "Travel Date"),
    endDate: pick(t, "endDate"),
    duration: pick(t, "duration", "Duration"),
    price: pick(t, "price", "Price"),
    discountedPrice: pick(t, "discountedPrice"),
    seats: pick(t, "seats", "Seats"),
    maxGroupSize: pick(t, "maxGroupSize"),
    shortDescription: pick(t, "shortDescription"),
    fullDescription: pick(t, "fullDescription", "description", "Description"),
    inclusions: t.inclusions != null ? t.inclusions : pick(t, "Inclusions"),
    exclusions: t.exclusions != null ? t.exclusions : pick(t, "Exclusions"),
    itinerary:
      t != null && Object.prototype.hasOwnProperty.call(t, "itinerary")
        ? toPlainItinerary(t.itinerary)
        : pickRaw(t, "Itinerary"),
    importantNotes: pick(
      t,
      "importantNotes",
      "difficulty",
      "Difficulty",
      "vehicle",
      "Vehicle"
    ),
    image: pick(t, "image", "poster", "Poster"),
    driveFileId: pick(t, "driveFileId", "driveFileID"),
    whatsappNumber: pick(t, "whatsappNumber"),
    featured: pick(t, "featured", "Featured") || "No",
    soldOut: pick(t, "soldOut", "limitedSeats", "Limited Seats") || "No",
    status: pick(t, "status", "Status") || "draft"
  };
}

function coalesceField(incoming, existing, key, fallback, options) {
  var opts = options || {};
  var v = incoming != null ? String(incoming).trim() : "";
  if (v) return v;
  /* Empty string is intentional when the client sent that field */
  if (opts.allowClear && opts.present) return "";
  if (
    existing &&
    existing[key] != null &&
    String(existing[key]).trim() !== ""
  ) {
    return String(existing[key]).trim();
  }
  return fallback != null ? fallback : "";
}

function rawHasField(raw, keys) {
  if (!raw) return false;
  for (var i = 0; i < keys.length; i++) {
    if (Object.prototype.hasOwnProperty.call(raw, keys[i])) return true;
  }
  return false;
}

function tripToRow(trip, existing) {
  var raw = trip || {};
  var n = normalizeIncomingTrip(trip);
  var ex = existing || {};
  var now = isoNow();
  var id = coalesceField(n.id, ex, "id", "") || newId();
  var title = coalesceField(n.title, ex, "title", "Untitled Trip");

  var shortDescription = coalesceField(
    n.shortDescription,
    ex,
    "shortDescription",
    "",
    {
      allowClear: true,
      present: rawHasField(raw, ["shortDescription"])
    }
  );
  var fullDescription = coalesceField(
    n.fullDescription,
    ex,
    "fullDescription",
    "",
    {
      allowClear: true,
      present: rawHasField(raw, [
        "fullDescription",
        "description",
        "Description"
      ])
    }
  );
  if (!shortDescription && fullDescription && !rawHasField(raw, ["shortDescription"])) {
    shortDescription = fullDescription.slice(0, 220);
  }
  if (!fullDescription && shortDescription && !rawHasField(raw, ["fullDescription", "description", "Description"])) {
    fullDescription = shortDescription;
  }

  var image = normalizeImageField(
    coalesceField(n.image, ex, "image", ""),
    coalesceField(
      n.driveFileId,
      ex,
      "driveFileId",
      extractDriveId(n.image || ex.image)
    )
  );
  var driveFileId = extractDriveId(
    coalesceField(n.driveFileId, ex, "driveFileId", "") ||
      n.image ||
      ex.image ||
      image
  );

  var featuredRaw = coalesceField(n.featured, ex, "featured", "No");
  var soldOutRaw = coalesceField(n.soldOut, ex, "soldOut", "No");
  var featured = /^(yes|true|1)$/i.test(featuredRaw) ? "Yes" : "No";
  var soldOut = /^(yes|true|1)$/i.test(soldOutRaw) ? "Yes" : "No";
  var status = coalesceField(n.status, ex, "status", "draft").toLowerCase();
  if (status === "active") status = "published";

  var clearList = function (incoming, existingVal, keys) {
    if (rawHasField(raw, keys)) {
      return toJsonList(incoming);
    }
    if (incoming != null && String(incoming).trim() !== "") {
      return toJsonList(incoming);
    }
    return toJsonList(existingVal);
  };

  return {
    id: id,
    slug: coalesceField(n.slug, ex, "slug", slugify(title)),
    title: title,
    location: coalesceField(n.location, ex, "location", ""),
    meetingPoint: coalesceField(n.meetingPoint, ex, "meetingPoint", "", {
      allowClear: true,
      present: rawHasField(raw, ["meetingPoint", "pickupPoints", "Pickup Points"])
    }),
    category: coalesceField(n.category, ex, "category", "", {
      allowClear: true,
      present: rawHasField(raw, ["category", "Category"])
    }),
    startDate: coalesceField(n.startDate, ex, "startDate", "", {
      allowClear: true,
      present: rawHasField(raw, ["startDate", "travelDate", "Travel Date"])
    }),
    endDate: coalesceField(n.endDate, ex, "endDate", "", {
      allowClear: true,
      present: rawHasField(raw, ["endDate"])
    }),
    duration: coalesceField(n.duration, ex, "duration", "", {
      allowClear: true,
      present: rawHasField(raw, ["duration", "Duration"])
    }),
    price: coalesceField(n.price, ex, "price", "", {
      allowClear: true,
      present: rawHasField(raw, ["price", "Price"])
    }),
    discountedPrice: coalesceField(n.discountedPrice, ex, "discountedPrice", "", {
      allowClear: true,
      present: rawHasField(raw, ["discountedPrice"])
    }),
    seats: coalesceField(n.seats, ex, "seats", "", {
      allowClear: true,
      present: rawHasField(raw, ["seats", "Seats"])
    }),
    maxGroupSize: coalesceField(n.maxGroupSize, ex, "maxGroupSize", "", {
      allowClear: true,
      present: rawHasField(raw, ["maxGroupSize"])
    }),
    shortDescription: shortDescription,
    fullDescription: fullDescription,
    inclusions: clearList(n.inclusions, ex.inclusions, [
      "inclusions",
      "Inclusions"
    ]),
    exclusions: clearList(n.exclusions, ex.exclusions, [
      "exclusions",
      "Exclusions"
    ]),
    itinerary: (function () {
      if (rawHasField(raw, ["itinerary", "Itinerary"])) {
        return toPlainItinerary(n.itinerary);
      }
      if (n.itinerary != null) {
        return toPlainItinerary(n.itinerary);
      }
      return toPlainItinerary(ex.itinerary);
    })(),
    importantNotes: coalesceField(n.importantNotes, ex, "importantNotes", "", {
      allowClear: true,
      present: rawHasField(raw, [
        "importantNotes",
        "difficulty",
        "Difficulty",
        "vehicle",
        "Vehicle"
      ])
    }),
    image: image,
    driveFileId: driveFileId,
    whatsappNumber: coalesceField(n.whatsappNumber, ex, "whatsappNumber", "", {
      allowClear: true,
      present: rawHasField(raw, ["whatsappNumber"])
    }),
    featured: featured,
    soldOut: soldOut,
    status: status,
    createdAt: coalesceField(ex.createdAt, ex, "createdAt", now) || now,
    updatedAt: now
  };
}

function rowObjectToArray(obj) {
  return TRIP_HEADERS.map(function (h) {
    var val = obj[h];
    if (val == null) return "";
    if (Array.isArray(val)) return JSON.stringify(val);
    return val;
  });
}

function readAllTrips(includeUnpublished) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var trips = [];
  for (var r = 2; r <= lastRow; r++) {
    var obj = rowToObject(sheet, r, TRIP_HEADERS);
    if (String(obj.title || obj.id || "").trim() === "") continue;

    if (!obj.id) {
      obj.id = newId();
      sheet.getRange(r, 1).setValue(obj.id);
    }

    if (!includeUnpublished && String(obj.status).toLowerCase() !== "published")
      continue;

    trips.push(enrichTrip(obj));
  }
  return trips;
}

function enrichTrip(obj) {
  obj.inclusionsList = parseJsonList(obj.inclusions);
  obj.exclusionsList = parseJsonList(obj.exclusions);
  obj.itineraryList = parseJsonList(obj.itinerary);
  obj.image = normalizeImageField(obj.image, obj.driveFileId);
  obj.driveFileId =
    extractDriveId(obj.driveFileId || obj.image) || obj.driveFileId || "";
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
  if (!admin && String(obj.status).toLowerCase() !== "published") return null;
  return obj;
}

function writeTripRow(sheet, rowNum, rowObj) {
  var row = rowObjectToArray(rowObj);
  if (row.length !== TRIP_HEADERS.length) {
    throw new Error(
      "Trip row has " +
        row.length +
        " values but " +
        TRIP_HEADERS.length +
        " columns are required"
    );
  }
  /* numRows must be 1 — getRange(r,c,numRows,numColumns), not end coordinates */
  sheet.getRange(rowNum, 1, 1, TRIP_HEADERS.length).setValues([row]);
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
  var id = pick(trip, "id", "ID");
  var rowNum = findTripRow(sheet, id);
  if (!rowNum) throw new Error("Trip not found");

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
  var id = pick(tripRef, "id", "ID");
  return updateTrip({ id: id, status: status });
}

function deleteTrip(tripRef) {
  var sheet = ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  var id = pick(tripRef, "id", "ID");
  var rowNum = findTripRow(sheet, id);
  if (!rowNum) throw new Error("Trip not found");

  var existing = rowToObject(sheet, rowNum, TRIP_HEADERS);
  trashDriveFile(extractDriveId(existing.driveFileId || existing.image));

  sheet.deleteRow(rowNum);
}

/* ── Inquiries ── */

function saveInquiry(inquiry) {
  var sheet = ensureNamedSheet(SHEET_INQUIRIES, INQUIRY_HEADERS);
  var q = inquiry || {};

  var name = trimField(pick(q, "name"), 120);
  var email = trimField(pick(q, "email"), 160);
  var phone = trimField(pick(q, "phone"), 24);
  var company = trimField(pick(q, "company"), 120);
  var inquiryType = trimField(pick(q, "inquiryType", "inquiry_type"), 60);
  var groupSize = trimField(pick(q, "groupSize", "group_size"), 8);
  var destination = trimField(
    pick(q, "destination", "preferredDestination"),
    160
  );
  var message = trimField(pick(q, "message"), 2000);
  var trip = trimField(pick(q, "trip"), 120);
  var source = trimField(pick(q, "source") || "website", 60);

  if (!name || name.length < 2) {
    throw new Error("Name is required (at least 2 characters)");
  }

  var phoneDigits = String(phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    throw new Error("A valid phone number is required");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }

  if (!inquiryType || INQUIRY_TYPES.indexOf(inquiryType) === -1) {
    throw new Error("Select a valid inquiry type");
  }

  if (!message || message.length < 10) {
    throw new Error("Message must be at least 10 characters");
  }

  if (groupSize) {
    var gs = Number(groupSize);
    if (isNaN(gs) || gs < 1 || gs > 5000) {
      throw new Error("Group size must be between 1 and 5000");
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
    status: "new"
  };

  sheet.appendRow(
    INQUIRY_HEADERS.map(function (h) {
      return row[h] || "";
    })
  );
  return row;
}

function trimField(value, maxLen) {
  var s = String(value == null ? "" : value).trim();
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
    var item = {
      id: String(row[0]),
      src: normalizeImageField(String(row[1]), String(row[1])),
      alt: String(row[2]),
      status: String(row[3] || "Active")
    };
    if (!includeInactive) {
      var st = item.status.toLowerCase();
      if (st && st !== "active" && st !== "open") continue;
    }
    items.push(item);
  }
  return items;
}

function addGalleryItem(item) {
  var sheet = ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  var id = newId();
  var src = normalizeImageField(
    pick(item, "src", "Src"),
    pick(item, "src", "Src")
  );
  sheet.appendRow([
    id,
    src,
    pick(item, "alt", "Alt"),
    pick(item, "status", "Status") || "Active"
  ]);
  return { id: id };
}

function deleteGalleryItem(item) {
  var sheet = ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  var rowNum = findLegacyRowById(sheet, pick(item, "id", "ID"));
  if (!rowNum) throw new Error("Gallery item not found");
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
    var row = sheet
      .getRange(r, 1, 1, TESTIMONIAL_HEADERS.length)
      .getValues()[0];
    var item = {
      id: String(row[0]),
      name: String(row[1]),
      text: String(row[2]),
      rating: String(row[3]),
      photo: normalizeImageField(String(row[4]), String(row[4])),
      trip: String(row[5]),
      status: String(row[6] || "Active")
    };
    if (!includeInactive) {
      var st = item.status.toLowerCase();
      if (st && st !== "active" && st !== "open") continue;
    }
    items.push(item);
  }
  return items;
}

function addTestimonial(item) {
  var sheet = ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  var id = newId();
  var photo = normalizeImageField(
    pick(item, "photo", "Photo"),
    pick(item, "photo", "Photo")
  );
  sheet.appendRow([
    id,
    pick(item, "name", "Name"),
    pick(item, "text", "Text"),
    pick(item, "rating", "Rating") || "5",
    photo,
    pick(item, "trip", "Trip"),
    pick(item, "status", "Status") || "Active"
  ]);
  return { id: id };
}

function deleteTestimonial(item) {
  var sheet = ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  var rowNum = findLegacyRowById(sheet, pick(item, "id", "ID"));
  if (!rowNum) throw new Error("Testimonial not found");
  trashDriveFile(extractDriveId(sheet.getRange(rowNum, 5).getValue()));
  sheet.deleteRow(rowNum);
}

function findLegacyRowById(sheet, id) {
  var wanted = String(id || "").trim();
  if (!wanted) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === wanted) return i + 2;
  }
  return 0;
}

/* ── Homepage counters (Script Properties) ── */

function defaultSiteStats() {
  return {
    happyTravellers: 162,
    tripsCompleted: 13,
    happyLabel: "Happy Travellers",
    tripsLabel: "Trips & treks completed",
    note: "And the journey is still growing",
    suffix: "+"
  };
}

function getSiteStats() {
  var props = PropertiesService.getScriptProperties();
  var defaults = defaultSiteStats();
  var happy = Number(props.getProperty("SITE_STAT_HAPPY"));
  var trips = Number(props.getProperty("SITE_STAT_TRIPS"));
  return {
    happyTravellers: !isNaN(happy) && happy >= 0 ? happy : defaults.happyTravellers,
    tripsCompleted: !isNaN(trips) && trips >= 0 ? trips : defaults.tripsCompleted,
    happyLabel: String(props.getProperty("SITE_STAT_HAPPY_LABEL") || defaults.happyLabel).trim() || defaults.happyLabel,
    tripsLabel: String(props.getProperty("SITE_STAT_TRIPS_LABEL") || defaults.tripsLabel).trim() || defaults.tripsLabel,
    note: String(props.getProperty("SITE_STAT_NOTE") || defaults.note),
    suffix: props.getProperty("SITE_STAT_SUFFIX") != null
      ? String(props.getProperty("SITE_STAT_SUFFIX"))
      : defaults.suffix
  };
}

function saveSiteStats(stats) {
  var incoming = stats || {};
  var current = getSiteStats();
  var next = {
    happyTravellers: incoming.happyTravellers != null && String(incoming.happyTravellers).trim() !== ""
      ? Math.max(0, Math.round(Number(incoming.happyTravellers)) || 0)
      : current.happyTravellers,
    tripsCompleted: incoming.tripsCompleted != null && String(incoming.tripsCompleted).trim() !== ""
      ? Math.max(0, Math.round(Number(incoming.tripsCompleted)) || 0)
      : current.tripsCompleted,
    happyLabel: incoming.happyLabel != null
      ? String(incoming.happyLabel).trim() || current.happyLabel
      : current.happyLabel,
    tripsLabel: incoming.tripsLabel != null
      ? String(incoming.tripsLabel).trim() || current.tripsLabel
      : current.tripsLabel,
    note: incoming.note != null ? String(incoming.note) : current.note,
    suffix: incoming.suffix != null ? String(incoming.suffix) : current.suffix
  };

  PropertiesService.getScriptProperties().setProperties(
    {
      SITE_STAT_HAPPY: String(next.happyTravellers),
      SITE_STAT_TRIPS: String(next.tripsCompleted),
      SITE_STAT_HAPPY_LABEL: next.happyLabel,
      SITE_STAT_TRIPS_LABEL: next.tripsLabel,
      SITE_STAT_NOTE: next.note,
      SITE_STAT_SUFFIX: next.suffix
    },
    false
  );
  return next;
}

/* ── Booking / Cancellation / Refund policy (Script Properties) ── */

function defaultBookingPolicy() {
  return {
    title: "Booking, Cancellation & Refund Policy — Travelrayz",
    intro:
      "Please read all trip details, inclusions, exclusions and the applicable cancellation policy carefully before making your booking.",
    lastUpdated: "September 2026",
    sections: [
      {
        heading: "1. Booking Confirmation",
        body:
          "Your booking is confirmed only after the required payment has been received and confirmation issued by Travelrayz. The booking/advance amount is used to block seats and make advance commitments with hotels, transport providers, activity partners and other suppliers."
      },
      {
        heading: "2. Payment",
        body:
          "The advance amount and balance payment schedule will be communicated for each trip. Balance payment must be completed before the departure date, unless otherwise agreed in writing — failure to pay on time may result in cancellation of the booking, with the advance amount non-refundable."
      },
      {
        heading: "3. Cancellation by Traveller",
        body:
          "Refunds follow the cancellation terms specified for the respective trip. Trip-specific terms always take priority over this general policy. Any non-refundable amount already paid to hotels, transport providers, ticketing partners, activity providers or other suppliers may be deducted from the applicable refund."
      },
      {
        heading: "4. No-Show / Early Return",
        body:
          "No refund will be provided for: missing the pickup point/departure, not joining after booking, leaving the trip midway, or opting out of an included activity. Additional expenses arising from such situations are borne by the traveller."
      },
      {
        heading: "5. Changes to the Itinerary",
        body:
          "Plans may change due to weather, traffic, road conditions, temple timings, government restrictions, safety concerns or other unforeseen circumstances. We'll offer the best possible alternative, but itinerary changes do not automatically qualify for a refund unless the trip is substantially cancelled."
      },
      {
        heading: "6. Cancellation / Rescheduling by Travelrayz",
        body:
          "We may cancel, postpone or reschedule a trip due to insufficient enrollment, weather, safety concerns or circumstances beyond our reasonable control (natural disasters, government restrictions, transport disruptions). In such cases, travellers will be offered a full refund or an alternative departure date."
      },
      {
        heading: "7. Transport",
        body:
          "Transport arrangements (flights, trains, buses, cabs, or other modes) are booked through the respective service providers/official booking systems. Seat, cabin and berth allocation is subject to the relevant provider and cannot be guaranteed by Travelrayz. For group bookings, travellers may be seated separately — we'll try to keep groups together where possible. Delays, cancellations, route changes or other transport-related disruptions are beyond Travelrayz's control; our team will assist with practical alternatives wherever possible."
      },
      {
        heading: "8. Accommodation & Room Sharing",
        body:
          "Accommodation is as described in trip details. Room sharing, bed allocation and specific preferences are subject to availability and can't always be guaranteed."
      },
      {
        heading: "9. Personal Responsibility",
        body:
          "Travellers are responsible for their belongings, documents, health and safety during the trip. Travel insurance is not included unless specifically mentioned. Travellers are expected to follow the trip schedule, safety instructions and reasonable directions from the Travelrayz team."
      },
      {
        heading: "10. Refund Processing",
        body:
          "Approved refunds are generally processed within 7–14 business days, depending on the payment method. Applicable payment gateway, bank, ticket cancellation or supplier charges may be deducted."
      }
    ],
    importantTitle: "Important",
    importantBody:
      "Every Travelrayz trip may have its own booking and cancellation terms depending on destination, season, transport, accommodation and supplier commitments. Terms on the respective trip page/booking form apply to that trip. This policy should be read together with our Terms of Service. By making a payment, you confirm you've read and understood the applicable trip details, Terms of Service and this Cancellation & Refund Policy, and agree to the same. These terms are governed by the laws of India, with disputes subject to the jurisdiction of courts in Maharashtra, India."
  };
}

function normalizeBookingPolicy(raw) {
  var defaults = defaultBookingPolicy();
  var p = raw || {};
  var sections = [];
  var list = p.sections;
  if (Object.prototype.toString.call(list) !== "[object Array]") list = [];
  for (var i = 0; i < list.length; i++) {
    var s = list[i] || {};
    var heading = String(s.heading || "").trim();
    var body = String(s.body || "").trim();
    if (!heading && !body) continue;
    sections.push({ heading: heading, body: body });
  }
  if (!sections.length) sections = defaults.sections;
  return {
    title: String(p.title || "").trim() || defaults.title,
    intro: p.intro != null ? String(p.intro) : defaults.intro,
    lastUpdated: String(p.lastUpdated || "").trim() || defaults.lastUpdated,
    sections: sections,
    importantTitle: String(p.importantTitle || "").trim() || defaults.importantTitle,
    importantBody: p.importantBody != null ? String(p.importantBody) : defaults.importantBody
  };
}

function getBookingPolicy() {
  var raw = PropertiesService.getScriptProperties().getProperty("SITE_BOOKING_POLICY");
  if (!raw) return defaultBookingPolicy();
  try {
    return normalizeBookingPolicy(JSON.parse(raw));
  } catch (err) {
    return defaultBookingPolicy();
  }
}

function saveBookingPolicy(policy) {
  var next = normalizeBookingPolicy(policy);
  PropertiesService.getScriptProperties().setProperty(
    "SITE_BOOKING_POLICY",
    JSON.stringify(next)
  );
  return next;
}

/* ── Setup helper (run once from editor) ── */

function setupSheets() {
  ensureNamedSheet(SHEET_TRIPS, TRIP_HEADERS);
  ensureNamedSheet(SHEET_INQUIRIES, INQUIRY_HEADERS);
  ensureNamedSheet(SHEET_GALLERY, GALLERY_HEADERS);
  ensureNamedSheet(SHEET_TESTIMONIALS, TESTIMONIAL_HEADERS);
  Logger.log(
    "Sheets ready. Set ADMIN_USER_ID, ADMIN_PASSWORD and DRIVE_FOLDER_ID in Script Properties, then deploy."
  );
}
