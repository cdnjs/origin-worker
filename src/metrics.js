import { Registry } from "promjs/registry";

export function createMetrics() {
  const registry = new Registry();

  const requests_total = registry.create(
    "counter",
    "cdnjs_worker_requests_total",
    "HTTP requests against the worker"
  );
  const kv_misses_total = registry.create(
    "counter",
    "cdnjs_worker_kv_misses_total",
    "cdnjs files that were missing in KV"
  );
  const invalid_metadata_total = registry.create(
    "counter",
    "cdnjs_worker_invalid_metadata_total",
    "cdnjs files that have missing or malformed metadata"
  );
  const encodings_total = registry.create(
    "counter",
    "cdnjs_worker_encodings_total",
    "client accept-encoding headers"
  );

  return {
    registry,
    requests_total,
    kv_misses_total,
    invalid_metadata_total,
    encodings_total,
  };
}

export async function sendMetrics(registry) {
  if (typeof METRICS_URL === "undefined") {
    return;
  }
  if (Math.random() < 0.01) {
    return fetch(METRICS_URL, {
      method: "POST",
      headers: {
        "CF-Access-Client-Id": METRICS_CLIENT_ID,
        "CF-Access-Client-Secret": METRICS_CLIENT_SECRET,
        "User-Agent": "cdnjs-worker-files",
      },
      body: registry.metrics(),
    });
  }
}
