// =====================================================================================
// BHARAT PAINTS INVENTORY DASHBOARD — PHASE 1
// Apps Script backend (Code.gs)
//
// WHAT THIS FILE PRESERVES FROM THE ORIGINAL Code.gs:
//   - doGet()              (same behaviour: serves Chatbot.html, ALLOWALL framing)
//   - showChatbot()        (same behaviour: opens as a sheet sidebar)
//   - onOpen()              (same menu concept, extended with new setup items)
//   - setupStockAssistant() (same name + same core behaviour: stores the spreadsheet ID
//                             in Script Properties so the web app always finds the sheet)
//   - askAI(userMessage)    (same name + same chat-style behaviour, kept for backward
//                             compatibility; internally repointed to the CORRECT sheet
//                             and CORRECT columns — see "RISKS FOUND" below)
//
// WHAT WAS FIXED (full detail is in SETUP_NOTES.md):
//   1. BP_CONFIG.SHEET_NAME was "Summary" (capital S). The workbook's real tabs are
//      "Input" and "summary" (lower-case) — no tab is literally named "Summary".
//      getSheetByName() is exact-match, so this could silently fail depending on the
//      live tab's exact spelling. Fixed with getSheetCI_(), a case-insensitive lookup
//      that also accepts either name, so it keeps working regardless of tab casing.
//   2. The column-header aliases used by findColumn_ (e.g. "showroom qty") never
//      matched the real headers ("Showroom", "Godown 3", "Gopal Kunj", "Total",
//      "Req Qty", "Min Qty"), so header detection silently failed and the code fell
//      back to hard-coded columns A/C/E/G/I/K — which do NOT line up with the real
//      "Input" sheet layout (that fallback would have read the Rate column as
//      "Showroom stock"). Fixed by correcting the alias lists and the fallback
//      column indexes to match the verified real layout of "Input".
//   3. "Input" (1,900 products, live formulas fed by 'Day Book') is more complete
//      than "summary" (1,223 products — a filtered subset) and matches the "Order"
//      sheet's Req Qty column exactly (443/443 rows, zero mismatches when checked).
//      "Input" is therefore used as the single source of truth for the dashboard,
//      search, and order screens. No new totals are invented — everything is a live
//      read of Input's existing Showroom / Godown 3 / Gopal Kunj / Total / Req Qty /
//      Min Qty columns, which are themselves existing formulas fed by 'Day Book'.
//
// NOTHING in 'Day Book', 'Input', 'summary', 'Detailed Stock', 'Stock Ledger',
// 'Order', 'Sales', 'DayBook_Backend', 'Summary temp' or 'DASHBOARD' is modified,
// reformatted, reordered, or deleted by this script. This file only READS those
// sheets, and only WRITES to two brand-new sheets it creates itself:
// "Product_Images" and "App_Settings".
// =====================================================================================


// -------------------------------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------------------------------
var CONFIG = {
  // Existing, preserved product + live stock source (see analysis above).
  PRODUCT_SHEET_NAMES: ["Input"],           // tried in order, case-insensitive
  LEGACY_SUMMARY_SHEET_NAMES: ["summary", "Summary"], // only used by legacy askAI() fallback

  // New sheets this script owns and auto-creates.
  IMAGES_SHEET: "Product_Images",
  SETTINGS_SHEET: "App_Settings",

  // Drive folder this script owns and auto-creates.
  DRIVE_FOLDER_NAME: "Bharat Paints Product Images",

  SPREADSHEET_ID_PROPERTY: "BHARAT_PAINTS_SPREADSHEET_ID",
  DRIVE_FOLDER_ID_PROPERTY: "BHARAT_PAINTS_DRIVE_FOLDER_ID",

  // Real, verified header names on the "Input" sheet (row 1).
  // Index is 0-based, matching sheet.getValues() array positions.
  PRODUCT_COLUMNS: {
    PRODUCT:  { index: 0, aliases: ["product name", "product", "item name", "item"] },
    MRP:      { index: 1, aliases: ["mrp"] },
    RATE:     { index: 2, aliases: ["rate", "selling rate", "sale rate"] },
    SHOWROOM: { index: 3, aliases: ["showroom"] },
    GODOWN3:  { index: 4, aliases: ["godown 3", "godown3"] },
    GOPAL:    { index: 5, aliases: ["gopal kunj", "gopalkunj"] },
    TOTAL:    { index: 7, aliases: ["total"] },
    REQ_QTY:  { index: 8, aliases: ["req qty", "required qty", "order needed", "shortage qty", "short qty"] },
    MIN_QTY:  { index: 9, aliases: ["min qty", "minimum qty", "reorder level"] }
  },

  MAX_SEARCH_RESULTS: 30,
  MAX_ORDER_ITEMS: 600,
  MAX_IMAGE_BYTES: 2 * 1024 * 1024,   // safe hard ceiling after client-side compression
  MAX_LOGO_BYTES: 3 * 1024 * 1024,    // 3 MB for the logo
  DASHBOARD_CACHE_SECONDS: 120,
  SETTINGS_CACHE_SECONDS: 300
};

// Only these are accepted for product photos. HEIC/HEIF (default iPhone
// camera format) is explicitly rejected with a clear message, since it
// cannot be decoded by <canvas>/<img> in the browser or previewed reliably —
// this was one of the root causes of "pictures not working".
var ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

var PRODUCT_IMAGES_HEADERS = [
  "Product Name",
  "Image 1 File ID", "Image 1 URL",
  "Image 2 File ID", "Image 2 URL",
  "Image 3 File ID", "Image 3 URL",
  "Updated At", "Updated By"
];

var DEFAULT_APP_SETTINGS = {
  APP_TITLE: "Bharat Paints",
  SPLASH_LINE: "Serving Karnal Since 1976",
  LOGO_FILE_ID: "",
  LOGO_URL: ""
};


// =====================================================================================
// PRESERVED ENTRY POINTS
// =====================================================================================

// ------------------------------------------------------------
// RUN THIS ONCE FROM THE APPS SCRIPT EDITOR (name preserved).
// Saves the spreadsheet ID for reliable web-app use AND makes
// sure Product_Images / App_Settings / the Drive folder exist.
// Safe to re-run any number of times — it never deletes or
// overwrites existing data.
// ------------------------------------------------------------
function setupStockAssistant() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      "Open this Apps Script from the Bharat Paints Google Sheet, then run setupStockAssistant again."
    );
  }

  PropertiesService.getScriptProperties().setProperty(
    CONFIG.SPREADSHEET_ID_PROPERTY,
    ss.getId()
  );

  var report = ensureAppInfrastructure_(ss);

  return "Setup complete. Spreadsheet connected: " + ss.getName() +
    "\nProduct_Images sheet: " + report.imagesSheetStatus +
    "\nApp_Settings sheet: " + report.settingsSheetStatus +
    "\nDrive folder: " + report.folderStatus +
    "\nProducts synced into Product_Images: " + report.productsAdded + " new, " +
    report.productsAlreadyPresent + " already present.";
}


// ------------------------------------------------------------
// WEB APP (name preserved; behaviour preserved for every existing caller —
// the branches below are new and only trigger for new query parameters
// that nothing before this update ever sent).
//
// PWA NOTE: Apps Script serves the actual page content from a sandboxed
// script.googleusercontent.com URL that is a DIFFERENT origin than this
// script's own .../exec URL. Browsers only allow a Service Worker to be
// registered from a script hosted on the SAME origin as the page that
// registers it (this is a hard rule, not a bug) — so a real, working
// Service Worker cannot be activated on this hosting model. The ?page=sw
// endpoint below is still implemented correctly and kept for completeness /
// forward-compatibility, but expect it to be inactive in practice. The
// ?page=manifest style approach isn't used either — the manifest is instead
// inlined as a data: URI directly in Chatbot.html, which has no such
// same-origin restriction and is the more reliable choice here.
// ------------------------------------------------------------
function doGet(e) {
  var page = e && e.parameter ? e.parameter.page : null;

  if (page === "sw") {
    return ContentService
      .createTextOutput(buildServiceWorkerScript_())
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  var template = HtmlService.createTemplateFromFile("Chatbot");
  template.execUrl = ScriptApp.getService().getUrl();

  return template.evaluate()
    .setTitle("Bharat Paints Inventory Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ------------------------------------------------------------
// Service worker source, served (best-effort — see note on doGet above) via
// GET .../exec?page=sw. Written as a normal, correct cache-first service
// worker so it is ready to work immediately if ever hosted somewhere the
// same-origin restriction does not apply.
// ------------------------------------------------------------
function buildServiceWorkerScript_() {
  return [
    "var BP_CACHE = 'bharat-paints-v1';",
    "",
    "self.addEventListener('install', function(event) {",
    "  self.skipWaiting();",
    "});",
    "",
    "self.addEventListener('activate', function(event) {",
    "  event.waitUntil(",
    "    caches.keys().then(function(names) {",
    "      return Promise.all(names.filter(function(n) { return n !== BP_CACHE; }).map(function(n) { return caches.delete(n); }));",
    "    }).then(function() { return self.clients.claim(); })",
    "  );",
    "});",
    "",
    "// Cache-first for GET requests, falling back to the network and then",
    "// updating the cache with whatever the network returns. This covers the",
    "// single-file app shell (HTML with its inlined CSS/JS) so a repeat visit",
    "// can render instantly from cache.",
    "self.addEventListener('fetch', function(event) {",
    "  if (event.request.method !== 'GET') return;",
    "",
    "  event.respondWith(",
    "    caches.open(BP_CACHE).then(function(cache) {",
    "      return cache.match(event.request).then(function(cached) {",
    "        var networkFetch = fetch(event.request).then(function(response) {",
    "          if (response && response.status === 200) {",
    "            cache.put(event.request, response.clone());",
    "          }",
    "          return response;",
    "        }).catch(function() { return cached; });",
    "",
    "        return cached || networkFetch;",
    "      });",
    "    })",
    "  );",
    "});"
  ].join("\n");
}


// ------------------------------------------------------------
// OPTIONAL: OPEN AS GOOGLE SHEETS SIDEBAR (name preserved)
// ------------------------------------------------------------
function showChatbot() {
  // Uses the same templated evaluation as doGet() now that Chatbot.html
  // contains a <?= execUrl ?> scriptlet (used to build the PWA manifest) —
  // createHtmlOutputFromFile() would print that scriptlet as literal text
  // instead of evaluating it, which would break the sidebar.
  var template = HtmlService.createTemplateFromFile("Chatbot");
  template.execUrl = ScriptApp.getService().getUrl();

  var html = template.evaluate()
    .setTitle("Bharat Paints Inventory Dashboard")
    .setWidth(430);

  SpreadsheetApp.getUi().showSidebar(html);
}


// ------------------------------------------------------------
// MENU (name preserved, items extended)
// Only one onOpen() exists in this project — if you already
// have another onOpen() elsewhere, merge the menu items instead
// of keeping two onOpen() functions (two onOpen()s is a common
// cause of a menu only half-working).
// ------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Bharat Paints")
    .addItem("Open Inventory Dashboard", "showChatbot")
    .addItem("Run First-Time Setup", "setupStockAssistant")
    .addItem("Sync New Products into Product_Images", "syncProductImagesMenu_")
    .addToUi();
}

function syncProductImagesMenu_() {
  var ss = getSpreadsheet_();
  var result = syncProductImagesFromMaster_(ss);
  SpreadsheetApp.getUi().alert(
    "Sync complete.\n\nNew products added: " + result.added +
    "\nAlready present: " + result.alreadyPresent
  );
}


// =====================================================================================
// INFRASTRUCTURE SETUP (idempotent — safe to re-run)
// =====================================================================================

function ensureAppInfrastructure_(ss) {
  var imagesSheet = ensureProductImagesSheet_(ss);
  var settingsSheet = ensureAppSettingsSheet_(ss);
  var folder = ensureDriveFolder_();

  var syncResult = syncProductImagesFromMaster_(ss);

  return {
    imagesSheetStatus: imagesSheet.wasCreated ? "created" : "already existed (untouched)",
    settingsSheetStatus: settingsSheet.wasCreated ? "created" : "already existed (untouched)",
    folderStatus: folder.wasCreated ? "created" : "already existed (reused)",
    productsAdded: syncResult.added,
    productsAlreadyPresent: syncResult.alreadyPresent
  };
}


function ensureProductImagesSheet_(ss) {
  var sheet = ss.getSheetByName(CONFIG.IMAGES_SHEET);
  var wasCreated = false;

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.IMAGES_SHEET);
    wasCreated = true;
  }

  // Only ever write the header row if the sheet is genuinely empty.
  // This guarantees repeated setup runs cannot damage existing rows.
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, PRODUCT_IMAGES_HEADERS.length).setValues([PRODUCT_IMAGES_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, PRODUCT_IMAGES_HEADERS.length).setFontWeight("bold");
    sheet.setColumnWidths(1, 1, 260);
  }

  return { sheet: sheet, wasCreated: wasCreated };
}


function ensureAppSettingsSheet_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  var wasCreated = false;

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SETTINGS_SHEET);
    wasCreated = true;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
  }

  // Add any DEFAULT_APP_SETTINGS keys that are missing, without touching
  // keys that already have a value (so admin edits are never overwritten).
  var existing = readSettingsMap_(sheet);
  var keysToAdd = [];

  Object.keys(DEFAULT_APP_SETTINGS).forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(existing, key)) {
      keysToAdd.push([key, DEFAULT_APP_SETTINGS[key]]);
    }
  });

  if (keysToAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, keysToAdd.length, 2).setValues(keysToAdd);
  }

  return { sheet: sheet, wasCreated: wasCreated };
}


function ensureDriveFolder_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty(CONFIG.DRIVE_FOLDER_ID_PROPERTY);

  if (savedId) {
    try {
      var byId = DriveApp.getFolderById(savedId);
      return { folder: byId, wasCreated: false };
    } catch (e) {
      // Saved ID no longer valid (folder deleted) — fall through and re-find/create.
    }
  }

  var existingFolders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);

  if (existingFolders.hasNext()) {
    var found = existingFolders.next();
    props.setProperty(CONFIG.DRIVE_FOLDER_ID_PROPERTY, found.getId());
    return { folder: found, wasCreated: false };
  }

  // Try to create the folder next to the spreadsheet for tidiness; fall back to root.
  var created;
  try {
    var ss = getSpreadsheet_();
    var ssFile = DriveApp.getFileById(ss.getId());
    var parents = ssFile.getParents();

    if (parents.hasNext()) {
      created = parents.next().createFolder(CONFIG.DRIVE_FOLDER_NAME);
    } else {
      created = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    }
  } catch (e) {
    created = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  }

  props.setProperty(CONFIG.DRIVE_FOLDER_ID_PROPERTY, created.getId());
  return { folder: created, wasCreated: true };
}


// Adds any product from Input that is missing from Product_Images.
// Never removes or edits an existing Product_Images row.
function syncProductImagesFromMaster_(ss) {
  var imagesSheet = ss.getSheetByName(CONFIG.IMAGES_SHEET) || ensureProductImagesSheet_(ss).sheet;
  var products = readProductMaster_(ss);

  var existingNames = {};
  var lastRow = imagesSheet.getLastRow();

  if (lastRow > 1) {
    var existingValues = imagesSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    existingValues.forEach(function(row) {
      var name = String(row[0] || "").trim();
      if (name) existingNames[normalizeProductKey_(name)] = true;
    });
  }

  var rowsToAdd = [];

  products.forEach(function(p) {
    var key = normalizeProductKey_(p.name);
    if (!existingNames[key]) {
      rowsToAdd.push([p.name, "", "", "", "", "", "", "", ""]);
      existingNames[key] = true; // guard against duplicate product names inside Input itself
    }
  });

  if (rowsToAdd.length > 0) {
    imagesSheet.getRange(imagesSheet.getLastRow() + 1, 1, rowsToAdd.length, PRODUCT_IMAGES_HEADERS.length)
      .setValues(rowsToAdd);
  }

  return {
    added: rowsToAdd.length,
    alreadyPresent: products.length - rowsToAdd.length
  };
}

// Public wrapper callable from the Settings screen ("Sync Products Now").
function syncProductImagesFromMaster() {
  try {
    var ss = getSpreadsheet_();
    var result = syncProductImagesFromMaster_(ss);
    return makeResponse_(true, "", {
      added: result.added,
      alreadyPresent: result.alreadyPresent
    });
  } catch (error) {
    return makeResponse_(false, "Sync failed: " + error.message, null);
  }
}


// =====================================================================================
// SPREADSHEET / SHEET HELPERS
// =====================================================================================

function getSpreadsheet_() {
  var spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(CONFIG.SPREADSHEET_ID_PROPERTY);

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    PropertiesService.getScriptProperties().setProperty(
      CONFIG.SPREADSHEET_ID_PROPERTY,
      activeSpreadsheet.getId()
    );
    return activeSpreadsheet;
  }

  throw new Error("Spreadsheet is not connected. Run setupStockAssistant() once from the Apps Script editor.");
}


// Case-insensitive sheet lookup that tries a list of candidate names in order.
// This is what makes the app resilient to the "Summary" vs "summary" tab-naming
// mismatch found in the original code (see header notes above).
function getSheetCI_(ss, candidateNames) {
  var all = ss.getSheets();

  for (var c = 0; c < candidateNames.length; c++) {
    var exact = ss.getSheetByName(candidateNames[c]);
    if (exact) return exact;
  }

  for (var c2 = 0; c2 < candidateNames.length; c2++) {
    var target = candidateNames[c2].toLowerCase();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName().toLowerCase() === target) {
        return all[i];
      }
    }
  }

  return null;
}

function getProductSheet_(ss) {
  var sheet = getSheetCI_(ss, CONFIG.PRODUCT_SHEET_NAMES);

  if (!sheet) {
    throw new Error(
      'Could not find the product sheet ("Input"). The tab may have been renamed. ' +
      "Ask an administrator to check the sheet name."
    );
  }

  return sheet;
}


// Resolves real column positions by header name, falling back to the verified
// fixed positions from CONFIG.PRODUCT_COLUMNS if a header can't be matched by name.
function resolveProductColumns_(headerRow) {
  var normalizedHeaders = headerRow.map(normalizeText_);
  var resolved = {};

  Object.keys(CONFIG.PRODUCT_COLUMNS).forEach(function(key) {
    var def = CONFIG.PRODUCT_COLUMNS[key];
    var foundIndex = -1;

    for (var i = 0; i < normalizedHeaders.length; i++) {
      if (def.aliases.indexOf(normalizedHeaders[i]) !== -1) {
        foundIndex = i;
        break;
      }
    }

    resolved[key] = foundIndex !== -1 ? foundIndex : def.index;
  });

  return resolved;
}


// Reads the full live product master from "Input": product name + live stock
// per location + total + order-needed + min qty. Skips blank-name rows
// (this also naturally skips the helper "Total" row at Input row 2).
function readProductMaster_(ss) {
  var sheet = getProductSheet_(ss);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    throw new Error('The "Input" sheet has no product data.');
  }

  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  var headerRow = values[0];
  var col = resolveProductColumns_(headerRow);

  var products = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var name = String(row[col.PRODUCT] || "").trim();

    if (!name) continue;

    products.push({
      name: name,
      rowNumber: r + 1,
      mrp: safeNumber_(row[col.MRP]),
      rate: safeNumber_(row[col.RATE]),
      showroom: safeNumber_(row[col.SHOWROOM]),
      godown3: safeNumber_(row[col.GODOWN3]),
      gopalKunj: safeNumber_(row[col.GOPAL]),
      total: safeNumber_(row[col.TOTAL]),
      reqQty: safeNumber_(row[col.REQ_QTY]),
      minQty: safeNumber_(row[col.MIN_QTY])
    });
  }

  return products;
}


function readSettingsMap_(sheet) {
  var lastRow = sheet.getLastRow();
  var map = {};

  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  values.forEach(function(row) {
    var key = String(row[0] || "").trim();
    if (key) map[key] = row[1] === undefined || row[1] === null ? "" : String(row[1]);
  });

  return map;
}


function readProductImagesMap_(ss) {
  var sheet = ss.getSheetByName(CONFIG.IMAGES_SHEET);
  var map = {};

  if (!sheet) return map;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, PRODUCT_IMAGES_HEADERS.length).getValues();

  values.forEach(function(row, i) {
    var name = String(row[0] || "").trim();
    if (!name) return;

    map[normalizeProductKey_(name)] = {
      rowNumber: i + 2,
      name: name,
      slot1: { fileId: String(row[1] || ""), url: String(row[2] || "") },
      slot2: { fileId: String(row[3] || ""), url: String(row[4] || "") },
      slot3: { fileId: String(row[5] || ""), url: String(row[6] || "") },
      updatedAt: row[7] ? String(row[7]) : "",
      updatedBy: String(row[8] || "")
    };
  });

  return map;
}


function findProductImageRow_(sheet, productName) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var target = normalizeProductKey_(productName);

  for (var i = 0; i < values.length; i++) {
    if (normalizeProductKey_(values[i][0]) === target) {
      return i + 2;
    }
  }

  return -1;
}


// =====================================================================================
// DASHBOARD API
// =====================================================================================

function getDashboardData() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("bp_dashboard_v1");

    if (cached) {
      var parsed = JSON.parse(cached);
      parsed.fromCache = true;
      return makeResponse_(true, "", parsed);
    }

    var ss = getSpreadsheet_();
    var products = readProductMaster_(ss);
    var settings = getSettingsInternal_(ss);

    var totals = { showroom: 0, godown3: 0, gopalKunj: 0, total: 0, itemsToOrder: 0 };

    products.forEach(function(p) {
      totals.showroom += p.showroom;
      totals.godown3 += p.godown3;
      totals.gopalKunj += p.gopalKunj;
      totals.total += p.total;
      if (p.reqQty > 0) totals.itemsToOrder++;
    });

    var payload = {
      appTitle: settings.APP_TITLE,
      splashLine: settings.SPLASH_LINE,
      logoUrl: settings.LOGO_URL,
      totalProducts: products.length,
      showroomStock: totals.showroom,
      godown3Stock: totals.godown3,
      gopalKunjStock: totals.gopalKunj,
      totalStock: totals.total,
      itemsToOrder: totals.itemsToOrder,
      generatedAt: new Date().toISOString(),
      fromCache: false
    };

    cache.put("bp_dashboard_v1", JSON.stringify(payload), CONFIG.DASHBOARD_CACHE_SECONDS);

    return makeResponse_(true, "", payload);
  } catch (error) {
    return makeResponse_(false, "Unable to load dashboard data. " + error.message, null);
  }
}


// =====================================================================================
// PRODUCT SEARCH API
// =====================================================================================

function searchProducts(query) {
  try {
    var question = String(query || "").trim();

    if (!question) {
      return makeResponse_(true, "", { results: [], totalMatches: 0 });
    }

    var ss = getSpreadsheet_();
    var products = readProductMaster_(ss);
    var imagesMap = readProductImagesMap_(ss);

    var queryWords = extractProductWords_(question);
    var matches = [];

    products.forEach(function(item) {
      var productText = normalizeText_(item.name);
      var score = productMatchScore_(queryWords, productText);
      if (score > 0) matches.push({ score: score, item: item });
    });

    matches.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name);
    });

    var limited = matches.slice(0, CONFIG.MAX_SEARCH_RESULTS);

    var results = limited.map(function(match) {
      var item = match.item;
      var images = imagesMap[normalizeProductKey_(item.name)];
      var photoFileIds = [];

      if (images) {
        [images.slot1, images.slot2, images.slot3].forEach(function(slot) {
          if (slot && slot.fileId) photoFileIds.push(slot.fileId);
        });
      }

      return {
        product: item.name,
        showroom: item.showroom,
        godown3: item.godown3,
        gopalKunj: item.gopalKunj,
        total: item.total,
        orderNeeded: item.reqQty,
        minQty: item.minQty,
        mrp: item.mrp,
        rate: item.rate,
        // Only File IDs are sent here — small and fast. The browser resolves
        // each one to real image bytes on demand via getProductImageData(),
        // which does not depend on Drive public-sharing succeeding.
        photoFileIds: photoFileIds
      };
    });

    return makeResponse_(true, "", {
      results: results,
      totalMatches: matches.length,
      truncated: matches.length > limited.length
    });
  } catch (error) {
    return makeResponse_(false, "Search failed. " + error.message, null);
  }
}


// =====================================================================================
// ITEMS TO ORDER API
// =====================================================================================

function getItemsToOrder() {
  try {
    var ss = getSpreadsheet_();
    var products = readProductMaster_(ss);

    var items = products
      .filter(function(p) { return p.reqQty > 0; })
      .map(function(p) {
        return {
          product: p.name,
          total: p.total,
          minQty: p.minQty,
          orderNeeded: p.reqQty
        };
      })
      .sort(function(a, b) { return b.orderNeeded - a.orderNeeded; });

    var limited = items.slice(0, CONFIG.MAX_ORDER_ITEMS);

    return makeResponse_(true, "", {
      items: limited,
      totalCount: items.length,
      truncated: items.length > limited.length
    });
  } catch (error) {
    return makeResponse_(false, "Unable to load items to order. " + error.message, null);
  }
}


// =====================================================================================
// PICTURE MANAGER API
// =====================================================================================

function listProductsForPictureManager(query) {
  try {
    var question = String(query || "").trim();
    var ss = getSpreadsheet_();
    var products = readProductMaster_(ss);
    var imagesMap = readProductImagesMap_(ss);

    var pool = products;

    if (question) {
      var queryWords = extractProductWords_(question);
      var matches = [];

      products.forEach(function(item) {
        var score = productMatchScore_(queryWords, normalizeText_(item.name));
        if (score > 0) matches.push({ score: score, item: item });
      });

      matches.sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.name.localeCompare(b.item.name);
      });

      pool = matches.slice(0, 25).map(function(m) { return m.item; });
    } else {
      pool = products.slice(0, 25);
    }

    var list = pool.map(function(p) {
      var img = imagesMap[normalizeProductKey_(p.name)];
      var photoCount = 0;
      if (img) {
        [img.slot1, img.slot2, img.slot3].forEach(function(s) { if (s && s.url) photoCount++; });
      }
      return { product: p.name, photoCount: photoCount };
    });

    return makeResponse_(true, "", { products: list });
  } catch (error) {
    return makeResponse_(false, "Unable to load products. " + error.message, null);
  }
}


function getProductImages(productName) {
  try {
    var name = String(productName || "").trim();
    if (!name) throw new Error("No product selected.");

    var ss = getSpreadsheet_();
    var imagesMap = readProductImagesMap_(ss);
    var record = imagesMap[normalizeProductKey_(name)];

    var result = record || {
      product: name,
      slot1: { fileId: "", url: "" },
      slot2: { fileId: "", url: "" },
      slot3: { fileId: "", url: "" },
      updatedAt: "",
      updatedBy: ""
    };

    // Return only IDs/metadata here. Each image is loaded separately through
    // getProductImageData(fileId), keeping this response small and reliable.
    return makeResponse_(true, "", result);
  } catch (error) {
    return makeResponse_(false, "Unable to load pictures. " + error.message, null);
  }
}


// slotIndex: 1, 2 or 3. imageDataBase64: base64 string WITHOUT the
// data:...;base64, prefix (the browser strips this before calling in).
function uploadProductImage(productName, slotIndex, imageDataBase64, mimeType, fileName) {
  Logger.log("uploadProductImage() called. product=" + productName + ", slot=" + slotIndex +
    ", mimeType=" + mimeType + ", fileName=" + fileName +
    ", base64Length=" + (imageDataBase64 ? imageDataBase64.length : 0));

  try {
    var name = String(productName || "").trim();
    var slot = parseInt(slotIndex, 10);

    if (!name) throw new Error("Please choose a product first.");
    if (slot < 1 || slot > 3) throw new Error("Invalid picture slot.");
    if (!imageDataBase64) throw new Error("No picture data received.");

    var cleanMime = String(mimeType || "").toLowerCase().trim();
    Logger.log("Cleaned MIME type: " + cleanMime);

    if (cleanMime.indexOf("heic") !== -1 || cleanMime.indexOf("heif") !== -1) {
      throw new Error("HEIC photos from the iPhone camera are not supported. Please switch your phone camera format to Most Compatible (JPG), or pick an existing JPG/PNG from the gallery.");
    }

    if (!isSupportedImageMime_(cleanMime)) {
      throw new Error("Unsupported image type (" + (cleanMime || "unknown") + "). Please use JPG, PNG or WEBP.");
    }

    var approxBytes = Math.floor(imageDataBase64.length * 0.75);
    if (approxBytes > CONFIG.MAX_IMAGE_BYTES) {
      throw new Error("This picture is too large even after compression. Please try a different photo.");
    }

    var ss = getSpreadsheet_();
    var imagesSheet = ss.getSheetByName(CONFIG.IMAGES_SHEET) || ensureProductImagesSheet_(ss).sheet;
    var folder = ensureDriveFolder_().folder;

    var rowNumber = findProductImageRow_(imagesSheet, name);

    if (rowNumber === -1) {
      // Self-heals a product that was added after the last sync — does not
      // create a duplicate because we just confirmed no row exists for it
      // (name match now uses normalizeProductKey_, which also fixes rows
      // being missed due to extra spaces or case differences).
      imagesSheet.appendRow([name, "", "", "", "", "", "", "", ""]);
      rowNumber = imagesSheet.getLastRow();
    }

    var existingRow = imagesSheet.getRange(rowNumber, 1, 1, PRODUCT_IMAGES_HEADERS.length).getValues()[0];
    var idCol = slot === 1 ? 2 : (slot === 2 ? 4 : 6);   // 1-based columns B/D/F
    var urlCol = idCol + 1;                               // C/E/G
    var oldFileId = String(existingRow[idCol - 1] || "");

    var decoded = Utilities.base64Decode(imageDataBase64);
    Logger.log("Decoded byte length: " + decoded.length);
    Logger.log("Drive folder ID: " + folder.getId() + " (" + folder.getName() + ")");
    Logger.log("Product_Images row number for this product: " + rowNumber);

    var blob = Utilities.newBlob(decoded, cleanMime, fileName || (name + "-slot" + slot + ".jpg"));

    // STEP 1 — create the NEW file first. If anything below fails, the old
    // picture in this slot (if any) has not been touched yet.
    var newFile;
    try {
      newFile = folder.createFile(blob);
      newFile.setName(name + " - Photo " + slot + " - " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss"));
      Logger.log("Drive file created. fileId=" + newFile.getId());
    } catch (createError) {
      Logger.log("Drive file creation FAILED: " + createError.message);
      throw new Error("Could not save the picture to Drive. " + createError.message);
    }

    // Best-effort public link, kept only as a secondary/backup URL — display
    // in the app never depends on this succeeding. This used to be swallowed
    // silently, which was the main reason pictures uploaded fine but never
    // actually displayed (see fetchImageDataUrl_ / getProductImageData,
    // which read the file through the script's own Drive access instead).
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareError) {
      // Fine — the app does not require this to succeed.
    }

    var newUrl = buildDriveViewUrl_(newFile.getId());

    // STEP 2 — write to the sheet. If this throws, remove the orphan file
    // we just created so nothing is left dangling with no sheet reference,
    // and the old picture is still completely intact.
    try {
      imagesSheet.getRange(rowNumber, idCol).setValue(newFile.getId());
      imagesSheet.getRange(rowNumber, urlCol).setValue(newUrl);
      imagesSheet.getRange(rowNumber, 8).setValue(new Date());
      imagesSheet.getRange(rowNumber, 9).setValue(getActiveUserEmail_());
      Logger.log("Product_Images row " + rowNumber + " updated (column " + idCol + "/" + urlCol + ").");
    } catch (writeError) {
      Logger.log("Product_Images write FAILED: " + writeError.message);
      trashDriveFileSafe_(newFile.getId());
      throw new Error("Could not update Product_Images. " + writeError.message);
    }

    // STEP 3 — only now that the new file exists AND the sheet is confirmed
    // updated, retire the old picture for this slot.
    if (oldFileId && oldFileId !== newFile.getId()) {
      trashDriveFileSafe_(oldFileId);
    }

    // Keep the upload response small. The browser already has a local preview,
    // and persistent display is loaded separately by getProductImageData(fileId).
    var finalResult = makeResponse_(true, "Picture " + slot + " saved.", {
      slot: slot,
      fileId: newFile.getId(),
      url: newUrl,
      version: Date.now()
    });
    Logger.log("uploadProductImage() final result: " + JSON.stringify(finalResult));
    return finalResult;
  } catch (error) {
    Logger.log("uploadProductImage() FAILED: " + error.message);
    var errorResult = makeResponse_(false, "Could not save the picture. " + error.message, null);
    Logger.log("uploadProductImage() final result: " + JSON.stringify(errorResult));
    return errorResult;
  }
}


function deleteProductImage(productName, slotIndex) {
  try {
    var name = String(productName || "").trim();
    var slot = parseInt(slotIndex, 10);

    if (!name) throw new Error("Please choose a product first.");
    if (slot < 1 || slot > 3) throw new Error("Invalid picture slot.");

    var ss = getSpreadsheet_();
    var imagesSheet = ss.getSheetByName(CONFIG.IMAGES_SHEET);
    if (!imagesSheet) throw new Error("Product_Images sheet not found. Run setup first.");

    var rowNumber = findProductImageRow_(imagesSheet, name);
    if (rowNumber === -1) {
      return makeResponse_(true, "Nothing to delete.", { slot: slot });
    }

    var idCol = slot === 1 ? 2 : (slot === 2 ? 4 : 6);
    var urlCol = idCol + 1;

    var row = imagesSheet.getRange(rowNumber, 1, 1, PRODUCT_IMAGES_HEADERS.length).getValues()[0];
    var oldFileId = String(row[idCol - 1] || "");

    imagesSheet.getRange(rowNumber, idCol).setValue("");
    imagesSheet.getRange(rowNumber, urlCol).setValue("");
    imagesSheet.getRange(rowNumber, 8).setValue(new Date());
    imagesSheet.getRange(rowNumber, 9).setValue(getActiveUserEmail_());

    if (oldFileId) trashDriveFileSafe_(oldFileId);

    return makeResponse_(true, "Picture " + slot + " deleted.", { slot: slot });
  } catch (error) {
    return makeResponse_(false, "Could not delete the picture. " + error.message, null);
  }
}


function trashDriveFileSafe_(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
  } catch (e) {
    // File already deleted/moved by someone else — safe to ignore.
  }
}


function buildDriveViewUrl_(fileId) {
  // Kept only as a secondary/best-effort URL (e.g. for opening the sheet's
  // Image URL column directly). The app itself never depends on this
  // rendering correctly — see getProductImageData() below.
  return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
}


// =====================================================================================
// RELIABLE IMAGE SERVING (root-cause fix for Product Pictures not displaying)
//
// Root cause: pictures were uploaded fine (Drive file created, sheet updated),
// but were rendered in the browser as
//   https://drive.google.com/thumbnail?id=...
// which only works if the file is actually shared "Anyone with the link" —
// and the code that set that sharing was wrapped in a try/catch that
// silently swallowed any failure. On accounts/domains where public sharing
// is restricted (or the call simply failed), the file stayed Private, so
// the URL never rendered — showing a broken image or a Google sign-in wall,
// while everything else (the sheet row, the File ID) looked correct.
//
// Fix: read the file through the SCRIPT's own Drive access (DriveApp),
// which works regardless of public sharing, and hand the browser a
// self-contained base64 data: URL. This removes the dependency on Drive
// sharing entirely for anything the app displays.
// =====================================================================================

function getProductImageData(fileId) {
  try {
    var id = String(fileId || "").trim();
    if (!id) throw new Error("No picture selected.");
    return makeResponse_(true, "", fetchImageDataUrl_(id));
  } catch (error) {
    return makeResponse_(false, "Could not load this picture. " + error.message, null);
  }
}

function fetchImageDataUrl_(fileId) {
  var file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (e) {
    throw new Error("This picture is missing from Drive (it may have been deleted).");
  }

  var blob = file.getBlob();
  var mime = blob.getContentType() || "image/jpeg";
  var bytes = blob.getBytes();

  // Safety net only — our own uploads are compressed to well under this by
  // the browser before they ever reach here.
  if (bytes.length > 6 * 1024 * 1024) {
    return { dataUrl: "", fallbackUrl: buildDriveViewUrl_(fileId), tooLarge: true };
  }

  var base64 = Utilities.base64Encode(bytes);
  return {
    dataUrl: "data:" + mime + ";base64," + base64,
    fallbackUrl: buildDriveViewUrl_(fileId),
    tooLarge: false
  };
}

function isSupportedImageMime_(mimeType) {
  return ALLOWED_IMAGE_MIME_TYPES.indexOf(String(mimeType || "").toLowerCase().trim()) !== -1;
}

// Consistent product-matching key for the picture workflow: trims outer
// spaces, collapses repeated/irregular internal spaces, and uppercases for
// comparison only — the ORIGINAL product name is always what gets displayed
// and stored, this is purely a lookup key. Fixes rows being missed (and a
// duplicate row silently created) whenever a product name in Product_Images
// had slightly different spacing/case than the same name in Input.
function normalizeProductKey_(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}


// =====================================================================================
// SETTINGS API
// =====================================================================================

function getSettingsInternal_(ss) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("bp_settings_v1");

  if (cached) return JSON.parse(cached);

  var sheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET) || ensureAppSettingsSheet_(ss).sheet;
  var map = readSettingsMap_(sheet);

  var merged = {
    APP_TITLE: map.APP_TITLE || DEFAULT_APP_SETTINGS.APP_TITLE,
    SPLASH_LINE: map.SPLASH_LINE || DEFAULT_APP_SETTINGS.SPLASH_LINE,
    LOGO_FILE_ID: map.LOGO_FILE_ID || "",
    LOGO_URL: map.LOGO_URL || ""
  };

  cache.put("bp_settings_v1", JSON.stringify(merged), CONFIG.SETTINGS_CACHE_SECONDS);
  return merged;
}

function clearSettingsCache_() {
  CacheService.getScriptCache().remove("bp_settings_v1");
  CacheService.getScriptCache().remove("bp_dashboard_v1");
}

function getAppSettings() {
  try {
    var ss = getSpreadsheet_();
    return makeResponse_(true, "", getSettingsInternal_(ss));
  } catch (error) {
    return makeResponse_(false, "Unable to load settings. " + error.message, null);
  }
}


function saveAppSettings(appTitle, splashLine) {
  try {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET) || ensureAppSettingsSheet_(ss).sheet;

    upsertSettingValue_(sheet, "APP_TITLE", String(appTitle || DEFAULT_APP_SETTINGS.APP_TITLE).trim());
    upsertSettingValue_(sheet, "SPLASH_LINE", String(splashLine || DEFAULT_APP_SETTINGS.SPLASH_LINE).trim());

    clearSettingsCache_();

    return makeResponse_(true, "Settings saved.", getSettingsInternal_(ss));
  } catch (error) {
    return makeResponse_(false, "Could not save settings. " + error.message, null);
  }
}


function uploadLogo(imageDataBase64, mimeType, fileName) {
  try {
    if (!imageDataBase64) throw new Error("No logo data received.");

    var validMime = String(mimeType || "").indexOf("image/") === 0;
    if (!validMime) throw new Error("Only image files are allowed for the logo.");

    var approxBytes = Math.floor(imageDataBase64.length * 0.75);
    if (approxBytes > CONFIG.MAX_LOGO_BYTES) {
      throw new Error("Logo file is too large. Please use an image under 3 MB.");
    }

    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET) || ensureAppSettingsSheet_(ss).sheet;
    var folder = ensureDriveFolder_().folder;

    var settings = getSettingsInternal_(ss);
    var oldFileId = settings.LOGO_FILE_ID;

    var decoded = Utilities.base64Decode(imageDataBase64);
    var blob = Utilities.newBlob(decoded, mimeType, fileName || "bharat-paints-logo.png");

    var newFile = folder.createFile(blob);
    newFile.setName("Bharat Paints Logo");

    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareError) {
      // ignore if domain policy restricts sharing
    }

    var newUrl = buildDriveViewUrl_(newFile.getId());

    upsertSettingValue_(sheet, "LOGO_FILE_ID", newFile.getId());
    upsertSettingValue_(sheet, "LOGO_URL", newUrl);

    clearSettingsCache_();

    if (oldFileId && oldFileId !== newFile.getId()) {
      trashDriveFileSafe_(oldFileId);
    }

    return makeResponse_(true, "Logo updated.", { logoUrl: newUrl });
  } catch (error) {
    return makeResponse_(false, "Could not save the logo. " + error.message, null);
  }
}


function upsertSettingValue_(sheet, key, value) {
  var lastRow = sheet.getLastRow();
  var found = -1;

  if (lastRow >= 2) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0] || "").trim() === key) {
        found = i + 2;
        break;
      }
    }
  }

  if (found === -1) {
    sheet.appendRow([key, value]);
  } else {
    sheet.getRange(found, 2).setValue(value);
  }
}


// =====================================================================================
// LEGACY CHAT-STYLE ASSISTANT (askAI) — name + behaviour preserved for backward
// compatibility, internally repointed to the correct "Input" sheet and columns.
// =====================================================================================

function askAI(userMessage) {
  var question = String(userMessage || "").trim();

  if (!question) {
    return makeResponse_(false, "Please type a product name or stock question.");
  }

  try {
    var ss = getSpreadsheet_();
    var products = readProductMaster_(ss);
    var answer = answerQuestion_(question, products, getProductSheet_(ss).getName());

    return makeResponse_(true, answer);
  } catch (error) {
    return makeResponse_(
      false,
      "Unable to read live stock data.\n\n" + error.message +
      "\n\nRun setupStockAssistant() once from Apps Script, then deploy a new web-app version."
    );
  }
}


function answerQuestion_(question, products, sheetName) {
  var query = normalizeText_(question);

  if (containsAny_(query, ["help", "what can you do", "how to use", "commands"])) {
    return helpMessage_(products, sheetName);
  }

  if (containsAny_(query, ["items to order", "item to order", "need to order", "order items", "order now", "low stock", "shortage", "short stock"])) {
    return orderItemsMessage_(products);
  }

  if (containsAny_(query, ["overall total stock", "overall stock", "all stock total", "total stock all"])) {
    return overallTotalsMessage_(products);
  }

  if (containsAny_(query, ["total showroom stock", "showroom total stock", "total shop stock", "shop total stock"])) {
    return locationTotalMessage_(products, "showroom", "Shop / Showroom");
  }

  if (containsAny_(query, ["total godown 3 stock", "godown 3 total stock", "total godown3 stock"])) {
    return locationTotalMessage_(products, "godown3", "Godown 3");
  }

  if (containsAny_(query, ["total gopal kunj stock", "gopal kunj total stock"])) {
    return locationTotalMessage_(products, "gopalKunj", "Gopal Kunj");
  }

  return productSearchMessage_(question, products);
}


function productSearchMessage_(question, products) {
  var queryWords = extractProductWords_(question);

  if (queryWords.length === 0) {
    return "Please type a product name, for example:\nApex Ultima 20L";
  }

  var matches = [];

  products.forEach(function(item) {
    var score = productMatchScore_(queryWords, normalizeText_(item.name));
    if (score > 0) matches.push({ score: score, item: item });
  });

  matches.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.name.localeCompare(b.item.name);
  });

  if (matches.length === 0) {
    return 'No product matched "' + question + '".\n\nTry a shorter name, for example:\n• Apex 20L\n• Royale 10L\n• GIO Aroma';
  }

  var bestScore = matches[0].score;
  var selected = matches.filter(function(m) { return m.score >= Math.max(0.45, bestScore - 0.18); }).slice(0, 12);

  var lines = [];
  lines.push(selected.length === 1 ? "Stock found" : selected.length + " matching products found");

  selected.forEach(function(match) { lines.push(formatProduct_(match.item)); });

  if (matches.length > selected.length) {
    lines.push("More matches exist. Type the product size or complete name for a narrower result.");
  }

  return lines.join("\n\n");
}


function formatProduct_(item) {
  var lines = [
    "📦 " + item.name,
    "Shop / Showroom: " + item.showroom,
    "Godown 3: " + item.godown3,
    "Gopal Kunj: " + item.gopalKunj,
    "Total Stock: " + item.total
  ];

  if (item.reqQty > 0) lines.push("Order Needed: " + item.reqQty);
  if (item.mrp) lines.push("MRP: ₹" + item.mrp);
  if (item.rate) lines.push("Selling Rate: ₹" + item.rate);

  return lines.join("\n");
}


function orderItemsMessage_(products) {
  var items = products
    .filter(function(p) { return p.reqQty > 0; })
    .sort(function(a, b) { return b.reqQty - a.reqQty; });

  if (items.length === 0) {
    return "No positive Req Qty was found on the Input sheet.";
  }

  var shown = items.slice(0, 40);
  var lines = ["🛒 Items requiring order: " + items.length];

  shown.forEach(function(item, index) {
    lines.push((index + 1) + ". " + item.name + " — Stock: " + formatNumber_(item.total) + " | Order: " + formatNumber_(item.reqQty));
  });

  if (items.length > shown.length) lines.push("Showing first " + shown.length + " items.");

  return lines.join("\n");
}


function overallTotalsMessage_(products) {
  var totals = { showroom: 0, godown3: 0, gopalKunj: 0, total: 0 };

  products.forEach(function(item) {
    totals.showroom += item.showroom;
    totals.godown3 += item.godown3;
    totals.gopalKunj += item.gopalKunj;
    totals.total += item.total;
  });

  return [
    "📊 Bharat Paints Stock Summary",
    "Products: " + products.length,
    "Shop / Showroom: " + formatNumber_(totals.showroom),
    "Godown 3: " + formatNumber_(totals.godown3),
    "Gopal Kunj: " + formatNumber_(totals.gopalKunj),
    "Total Quantity: " + formatNumber_(totals.total)
  ].join("\n");
}


function locationTotalMessage_(products, key, label) {
  var total = 0;
  var productsWithStock = 0;

  products.forEach(function(item) {
    var qty = item[key];
    total += qty;
    if (qty !== 0) productsWithStock++;
  });

  return [
    "📍 " + label,
    "Total quantity: " + formatNumber_(total),
    "Products with non-zero stock: " + productsWithStock
  ].join("\n");
}


function helpMessage_(products, sheetName) {
  return [
    "Bharat Paints Stock Assistant",
    "",
    "Try:",
    "• Apex Ultima 20L",
    "• Show stock of Royale 10L",
    "• Items to order",
    "• Total showroom stock",
    "• Total Godown 3 stock",
    "• Total Gopal Kunj stock",
    "• Overall total stock",
    "",
    "Data source: " + sheetName,
    "Products loaded: " + products.length,
    "",
    "No AI API is used."
  ].join("\n");
}


// =====================================================================================
// SHARED SEARCH / TEXT HELPERS
// =====================================================================================

function extractProductWords_(question) {
  var ignored = {
    "what": true, "is": true, "the": true, "stock": true, "of": true, "show": true,
    "tell": true, "me": true, "check": true, "find": true, "available": true,
    "availability": true, "quantity": true, "qty": true, "how": true, "much": true,
    "please": true, "product": true, "item": true, "items": true, "in": true,
    "at": true, "for": true, "from": true, "shop": true, "showroom": true,
    "godown": true, "godown3": true, "gopal": true, "kunj": true, "total": true,
    "balance": true, "kitna": true, "kitni": true, "hai": true, "ka": true,
    "ki": true, "ke": true, "maal": true, "batao": true, "dikhao": true
  };

  return normalizeText_(question)
    .split(" ")
    .filter(function(word) { return word && !ignored[word]; });
}


function productMatchScore_(queryWords, productText) {
  if (!queryWords.length || !productText) return 0;

  var matched = 0;
  var weighted = 0;

  queryWords.forEach(function(word) {
    if (productText.indexOf(word) !== -1) {
      matched++;
      weighted += word.length >= 4 ? 1.25 : 1;
    }
  });

  if (matched === 0) return 0;

  var score = weighted / queryWords.length;
  var phrase = queryWords.join(" ");

  if (productText.indexOf(phrase) !== -1) score += 0.75;
  if (matched === queryWords.length) score += 0.5;

  return score;
}


function normalizeText_(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/litres?/g, "l")
    .replace(/liters?/g, "l")
    .replace(/kgs?/g, "kg")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function containsAny_(text, phrases) {
  return phrases.some(function(phrase) { return text.indexOf(normalizeText_(phrase)) !== -1; });
}


function safeNumber_(value) {
  if (value === "" || value === null || value === undefined) return 0;
  var n = Number(value);
  return isNaN(n) ? 0 : n;
}


function formatNumber_(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}


function getActiveUserEmail_() {
  try {
    var email = Session.getActiveUser().getEmail();
    return email || "Unknown";
  } catch (e) {
    return "Unknown";
  }
}


function makeResponse_(success, message, data) {
  return {
    success: success,
    message: String(message || ""),
    data: data === undefined ? null : data
  };
}


// =====================================================================================
// TESTS — RUN FROM APPS SCRIPT EDITOR
// =====================================================================================

function testConnection() {
  var ss = getSpreadsheet_();
  var products = readProductMaster_(ss);

  Logger.log({
    spreadsheet: ss.getName(),
    sheet: getProductSheet_(ss).getName(),
    productsFound: products.length,
    firstProduct: products[0]
  });
}

function testDashboard() {
  Logger.log(JSON.stringify(getDashboardData(), null, 2));
}

function testSearch() {
  Logger.log(JSON.stringify(searchProducts("apex 20l"), null, 2));
}

function testOrderItems() {
  Logger.log(JSON.stringify(getItemsToOrder(), null, 2));
}


// =====================================================================================
// PRODUCT PICTURE SYSTEM DIAGNOSTIC
// Run this from the Apps Script editor (function dropdown -> testProductImageSystem
// -> Run) any time picture upload/display seems broken. It creates and removes a
// tiny throwaway test image, so it is always safe to run.
// =====================================================================================

function testProductImageSystem() {
  var lines = ["BHARAT PAINTS - PRODUCT PICTURE SYSTEM DIAGNOSTIC", ""];
  var allPassed = true;

  function report(label, passed, detail) {
    allPassed = allPassed && passed;
    lines.push((passed ? "[PASS] " : "[FAIL] ") + label + (detail ? " -- " + detail : ""));
  }

  function finish() {
    lines.push("");
    lines.push(allPassed ? "ALL REQUIRED CHECKS PASSED." : "SOME CHECKS FAILED -- see [FAIL] lines above.");
    var reportText = lines.join("\n");
    Logger.log(reportText);
    return reportText;
  }

  var ss;
  try {
    ss = getSpreadsheet_();
    report("Spreadsheet connection", true, ss.getName());
  } catch (e) {
    report("Spreadsheet connection", false, e.message);
    return finish();
  }

  // 1. Product_Images sheet exists
  var sheet = ss.getSheetByName(CONFIG.IMAGES_SHEET);
  report("Product_Images sheet exists", !!sheet);
  if (!sheet) return finish();

  // 2. Required headers exist and match the expected layout/order
  var headerRow = sheet.getRange(1, 1, 1, PRODUCT_IMAGES_HEADERS.length).getValues()[0];
  var headersMatch = PRODUCT_IMAGES_HEADERS.every(function(h, i) {
    return String(headerRow[i] || "").trim() === h;
  });
  report("Product_Images headers match expected layout", headersMatch,
    headersMatch ? "" : "found: " + JSON.stringify(headerRow));

  // 3. Drive folder exists / is reachable
  var folderInfo;
  try {
    folderInfo = ensureDriveFolder_();
    report("Drive folder reachable", true, folderInfo.folder.getName());
  } catch (e) {
    report("Drive folder reachable", false, e.message);
    return finish();
  }

  // 4. Script can create a small test file (proves Drive write permission)
  var testFile = null;
  try {
    var testBlob = Utilities.newBlob(
      Utilities.base64Decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
      "image/png",
      "bp-diagnostic-test.png"
    );
    testFile = folderInfo.folder.createFile(testBlob);
    report("Create a test file in the Drive folder", true, testFile.getId());
  } catch (e) {
    report("Create a test file in the Drive folder", false, e.message);
    return finish();
  }

  // 5. Script can read the created file back (proves Drive read permission)
  try {
    var readBack = DriveApp.getFileById(testFile.getId()).getBlob();
    report("Read the test file back from Drive", readBack.getBytes().length > 0,
      readBack.getBytes().length + " bytes");
  } catch (e) {
    report("Read the test file back from Drive", false, e.message);
  }

  // 6. getProductImageData() proxy resolves the test file to a data URL
  try {
    var resolved = fetchImageDataUrl_(testFile.getId());
    report("getProductImageData() proxy resolves a data URL", !!resolved.dataUrl,
      resolved.dataUrl ? ("data URL length " + resolved.dataUrl.length) : "no data URL returned");
  } catch (e) {
    report("getProductImageData() proxy resolves a data URL", false, e.message);
  }

  // 7. Script can save AND retrieve a File ID in Product_Images, then clean up
  try {
    var testRowNum = sheet.getLastRow() + 1;
    sheet.getRange(testRowNum, 1, 1, 2).setValues([["__BP_DIAGNOSTIC_TEST__", testFile.getId()]]);
    var readValue = sheet.getRange(testRowNum, 2).getValue();
    report("Save + retrieve a File ID in Product_Images", readValue === testFile.getId());
    sheet.deleteRow(testRowNum);
    report("Diagnostic test row removed from the sheet", true);
  } catch (e) {
    report("Save + retrieve a File ID in Product_Images", false, e.message);
  }

  // 8. Public Drive sharing (informational only -- the app no longer depends on this)
  try {
    testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    lines.push("[INFO] Public link-sharing is available on this account (optional -- the app uses getProductImageData() instead, which does not need it).");
  } catch (e) {
    lines.push("[INFO] Public link-sharing is blocked on this account/domain (fine -- the app uses getProductImageData() instead, which does not need it).");
  }

  // 9. Remove the test file so nothing is left behind
  try {
    testFile.setTrashed(true);
    report("Test file removed from Drive", true);
  } catch (e) {
    report("Test file removed from Drive", false, e.message);
  }

  return finish();
}