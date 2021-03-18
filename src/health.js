import { fetch_from_origin } from "./origin.js";

const TEST_FILE = "hi-sven/1.1.14/index.js";

async function originOk(sentry, request) {
  const cors = false;
  const miss = (resp) => resp;
  const response = await fetch_from_origin({
    colo: request.cf.colo,
    sentry,
    request,
    path: "/ajax/libs/" + TEST_FILE + "?" + Date.now(),
    pkg: "hi-sven",
    cors,
    miss
  });
  if (!response.ok) {
    sentry.setTags({ colo: request.cf.colo });
    sentry.captureException(new Error(`Origin returned ${response.status}`));
    console.error(await response.text());
    return false;
  } else {
    return true;
  }
}

async function kvOk(sentry, request) {
  const MAX_ATTEMPTS = 3;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const { value, metadata } = await CDNJS_FILES.getWithMetadata(
        TEST_FILE,
        "arrayBuffer"
      );
      return value !== null && metadata !== null;
    } catch (e) {
      if (i === MAX_ATTEMPTS - 1) {
        sentry.setTags({ colo: request.cf.colo });
        sentry.captureException(e);
        return false;
      }
    }
  }
}

function err(msg) {
  return new Response(msg, { status: 500 });
}

export async function handleHealthRequest(sentry, request) {
  if (!(await originOk(sentry, request))) {
    return err("origin not OK");
  }
  if (!(await kvOk(sentry, request))) {
    return err("KV not OK");
  }
  return new Response("OK");
}
