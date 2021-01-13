import { createMetrics, sendMetrics } from "./metrics.js";
import { handleHealthRequest } from "./health.js";
import { handleHomepageRequest } from "./homepage.js";
import { initSentry } from "@cloudflare/worker-sentry";
import { SWF_XSS_REGEX, EXTS, ALIASES } from "./constants.js";

const MAX_ATTEMPTS = 3;

addEventListener("fetch", (event) => {
  const sentry = initSentry(event, { environment: ENV });
  event.respondWith(handleRequest(event.request, sentry));
});

async function handleRequest(request, sentry) {
  const { pathname } = new URL(request.url);
  if (
    pathname === "/" ||
    pathname === "/logo.svg" ||
    pathname === "/cf.core.css"
  ) {
    return handleHomepageRequest(request);
  }
  if (pathname === "/_health") {
    return handleHealthRequest(sentry, request);
  }

  const {
    registry,
    requests_total,
    kv_misses_total,
    invalid_metadata_total,
    encodings_total,
  } = createMetrics();

  const { cf } = request;
  let colo, clientAcceptEncoding;
  if (cf !== undefined) {
    colo = cf.colo;
    clientAcceptEncoding = cf.clientAcceptEncoding;
  }

  async function ok(msg, headers) {
    const status = 200;
    requests_total.inc({ env: ENV, status, colo });
    await sendMetrics(registry);
    return new Response(msg, { status, headers, encodeBody: "manual" });
  }

  async function miss(resp, pkg) {
    const { status } = resp;
    requests_total.inc({ env: ENV, status, colo });
    if (status === 200) {
      // Not in KV but exists at origin.
      kv_misses_total.inc({ env: ENV, status, pkg, colo });
    }
    await sendMetrics(registry);
    return resp;
  }

  async function forbid(reason, msg = "invalid request") {
    const status = 403;
    requests_total.inc({ env: ENV, status, colo, reason });
    await sendMetrics(registry);
    const headers = { "cf-cdnjs-via": "cfworker" }
    return new Response(msg, { status, headers });
  }

  async function not_found({ reason = "", msg = "resource not found" } = {}) {
    const status = 404;
    requests_total.inc({ env: ENV, status, colo, reason });
    await sendMetrics(registry);
    const headers = { "cf-cdnjs-via": "cfworker" }
    return new Response(msg, { status, headers });
  }

  async function err(msg = "something went wrong") {
    const status = 500;
    requests_total.inc({ env: ENV, status, colo });
    await sendMetrics(registry);
    const headers = { "cf-cdnjs-via": "cfworker" }
    return new Response(`internal error: ${msg}`, { status, headers });
  }

  async function invalid_metadata(kv_key) {
    invalid_metadata_total.inc({ env: ENV, key: kv_key, colo });
    await sendMetrics(registry);
    return err("invalid metadata");
  }

  async function fetch_from_origin(request, path, pkg, cors) {
    // Make request headers mutable by re-constructing the Request.
    request = new Request(request);

    // Add Access headers
    request.headers.set("CF-Access-Client-Id", ORIGIN_CLIENT_ID);
    request.headers.set("CF-Access-Client-Secret", ORIGIN_CLIENT_SECRET);

    // Add eyeball accept-encoding header
    request.headers.set(
      "Accept-Encoding",
      request.headers.get("cf-client-accept-encoding")
    );

    const response = await fetch(CDNJS_ORIGIN_URL + path, request);
    const { status, statusText, url } = response;
    if (status >= 500) {
      sentry.setTags({ colo, status, statusText, url });
      sentry.captureException(new Error(`Origin returned ${status}`));
    }

    const new_response = new Response(response.body, response);
    new_response.headers.delete("set-cookie");
    new_response.headers.set("cf-cdnjs-via", "cfworker");
    new_response.headers.set("X-Content-Type-Options", "nosniff");

    if (cors) {
      new_response.headers.set("Access-Control-Allow-Origin", "*");
      new_response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    }

    return miss(new_response, pkg);
  }

  try {
    // Naive protection from swf xss injection.
    // This is legacy compatability for the cdn-js-nginx config.
    const swf = new RegExp(SWF_XSS_REGEX);
    if (swf.test(request.url)) {
      return forbid("SWF_XSS");
    }

    // Return 404 for favicon
    if (pathname === "/favicon.ico") {
      return not_found();
    }

    const path_regex = new RegExp(
      `^/ajax/libs/(?<pkg>[a-zA-Z0-9._-]+)/(?<version>[^/]+)/(?<filepath>.+)$`
    ).exec(pathname);

    if (path_regex === null) {
      // Unknown request.
      return not_found({ reason: "MALFORMED_URL" });
    }

    let { pkg } = path_regex.groups;
    const { version, filepath } = path_regex.groups;

    // Check for package alias.
    const pkg_alias = ALIASES[pkg];
    if (pkg_alias !== undefined) {
      pkg = pkg_alias;
    }

    // Validate the file extension.
    const ext = filepath.split(".").pop();
    const ext_info = EXTS[ext];
    if (ext_info === undefined) {
      return forbid("INVALID_FILE_TYPE", "invalid file type");
    }

    let kv_key = [pkg, version, filepath].join("/");
    const { cors, compressed, content_type } = ext_info;

    // Initialize response headers, set content-type.
    let resp_headers = new Headers();

    // look for accept-encoding in cf object first
    const encodings =
      clientAcceptEncoding !== undefined
        ? clientAcceptEncoding
        : request.headers.get("cf-client-accept-encoding");

    if (encodings !== null) {
      if (encodings.includes("*")) {
        encodings_total.inc({ env: ENV, encoding: "*" });
      }
      if (encodings.includes("gzip")) {
        encodings_total.inc({ env: ENV, encoding: "gzip" });
      }
      if (encodings.includes("br")) {
        encodings_total.inc({ env: ENV, encoding: "br" });
      }
      if (encodings.includes("deflate")) {
        encodings_total.inc({ env: ENV, encoding: "deflate" });
      }
    }

    // Check if file will be compressed in KV,
    // altering kv_key/updating headers if necessary.
    if (compressed) {
      if (
        encodings !== null &&
        (encodings.includes("br") || encodings.includes("*"))
      ) {
        // favor br if it can be any encoding
        kv_key += ".br";
        resp_headers.set("Content-Encoding", "br");
      } else {
        // if no accept-encoding or not br, try to fetch gzip
        // regardless of encoding since FL will uncompress if needed
        kv_key += ".gz";
        resp_headers.set("Content-Encoding", "gzip");
      }
    }

    // Check that the key's length does not exceed
    // KV's maximum key length limit.
    if (kv_key.length > 512) {
      return not_found({ reason: "KEY_TOO_LONG" });
    }

    // Fetch from KV and return the file if it exists.
    let value = null;
    let metadata = null;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const res = await CDNJS_FILES.getWithMetadata(kv_key, "arrayBuffer");
        value = res.value;
        metadata = res.metadata;
        break;
      } catch (e) {
        if (i === MAX_ATTEMPTS - 1) {
          // No more attempts, fetch from origin.
          sentry.setTags({ colo });
          sentry.captureException(e);
          return fetch_from_origin(request, pathname, pkg, cors);
        }
      }
    }

    if (value === null) {
      // KV miss, fetch from origin.
      return fetch_from_origin(request, pathname, pkg, cors);
    }

    // Validate metadata.
    if (
      metadata === null ||
      metadata.etag === undefined ||
      metadata.last_modified === undefined
    ) {
      return invalid_metadata(kv_key);
    }

    // Set headers.
    resp_headers.set("ETag", `"${metadata.etag}"`);
    resp_headers.set("Last-Modified", metadata.last_modified);
    resp_headers.set("Content-Type", `${content_type}; charset=utf-8`);
    resp_headers.set("Content-Length", value.byteLength);
    resp_headers.set("Cache-Control", "no-transform, public, max-age=30672000");
    resp_headers.set("Timing-Allow-Origin", "*");
    resp_headers.set("cf-cdnjs-via", "cfworker/kv");
    resp_headers.set("X-Content-Type-Options", "nosniff");

    if (cors) {
      resp_headers.set("Access-Control-Allow-Origin", "*");
      resp_headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    }

    // Note: not setting 'Expires' header for now, not sure if FL will do it.
    return ok(value, resp_headers);
  } catch (e) {
    sentry.setTags({ colo });
    sentry.captureException(e);
    return ENV === "production" ? err() : err(e.stack);
  }
}
