export async function fetch_from_origin({ colo, sentry, request, path, pkg, cors, miss }, originUrl = CDNJS_ORIGIN_URL) {
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

  try {
    const response = await fetch(originUrl + path, request);
    const { status, statusText, url } = response;
    if (status >= 500) {
      sentry.setTags({ colo, status, statusText, url });
      sentry.captureException(new Error(`Origin returned ${status}`));
      // If the first origin failed, try the external fallback
      if (originUrl === CDNJS_ORIGIN_URL) {
        return fetch_from_origin({ colo, sentry, request, path, pkg, cors, miss }, CDNJS_ORIGIN_URL2);
      }
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
  } catch (e) {
    // If the first origin failed, try the external fallback
    if (originUrl === CDNJS_ORIGIN_URL) {
      return fetch_from_origin({ colo, sentry, request, path, pkg, cors, miss }, CDNJS_ORIGIN_URL2);
    }
    return new Response(e.message, { status: 500 });
  }
}
