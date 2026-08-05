// Authenticated JSON entry point used only by the Vercel server-side proxy.
// Keep the existing HTML doGet() web app unchanged for rollback compatibility.
function doPost(e) {
  try {
    var request = JSON.parse(e && e.postData && e.postData.contents || "{}");
    var expectedToken = PropertiesService.getScriptProperties().getProperty("BHARAT_PAINTS_API_TOKEN");

    // One-time deployment bootstrap. Once the property exists this path is
    // permanently locked and the regular token check below applies.
    if (request.action === "bootstrapApiToken" && !expectedToken) {
      var bootstrapToken = String(request.payload && request.payload.token || "");
      if (bootstrapToken.length < 32) {
        return jsonApiResponse_(false, null, "INVALID_TOKEN", "API token must be at least 32 characters.");
      }
      PropertiesService.getScriptProperties().setProperty("BHARAT_PAINTS_API_TOKEN", bootstrapToken);
      return jsonApiResponse_(true, { configured: true }, "", "");
    }

    if (!expectedToken || request.token !== expectedToken) {
      return jsonApiResponse_(false, null, "UNAUTHORIZED", "Invalid API token.");
    }

    var payload = request.payload || {};
    var handlers = {
      getProductImages: function () { return getProductImages(payload.productName); },
      getProductImageData: function () { return getProductImageData(payload.fileId); },
      uploadProductImage: function () {
        return uploadProductImage(payload.productName, payload.slot, payload.base64, payload.mimeType, payload.fileName);
      },
      deleteProductImage: function () { return deleteProductImage(payload.productName, payload.slot); },
      getAppSettings: function () { return getAppSettings(); }
    };

    if (!handlers[request.action]) {
      return jsonApiResponse_(false, null, "UNKNOWN_ACTION", "Unknown inventory action.");
    }

    var result = handlers[request.action]();
    if (!result || result.success !== true) {
      return jsonApiResponse_(false, null, "ACTION_FAILED", result && result.message || "Request failed.");
    }
    return jsonApiResponse_(true, result.data, "", "");
  } catch (error) {
    return jsonApiResponse_(false, null, "REQUEST_FAILED", error && error.message || "Unexpected API error.");
  }
}

function jsonApiResponse_(ok, data, code, message) {
  var body = ok
    ? { ok: true, data: data === undefined ? null : data, error: null }
    : { ok: false, data: null, error: { code: code, message: String(message || "Request failed.") } };
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run through the Apps Script API during deployment. The token is stored in
// Script Properties and is never returned or written to source control.
function configureApiToken(token) {
  if (!token || String(token).length < 32) throw new Error("API token must be at least 32 characters.");
  PropertiesService.getScriptProperties().setProperty("BHARAT_PAINTS_API_TOKEN", String(token));
  return true;
}
