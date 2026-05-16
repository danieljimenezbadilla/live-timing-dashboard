// Fetches live-timing data from livetiming.azurewebsites.net.
//
// The public page is a SPA — it loads its data client-side from an
// internal endpoint that isn't documented. This module tries a list of
// candidate endpoints, caches whichever one works, and returns the raw
// payload to the normalizer.
//
// If you inspect DevTools → Network on the real page and find the exact
// endpoint, just add it to the top of CANDIDATE_PATHS — it will be tried
// first.

import fetch from "node-fetch";

const BASE = "https://livetiming.azurewebsites.net";

// Ordered list of candidate paths. The {id} placeholder is replaced
// with the event id. First successful one is cached.
const CANDIDATE_PATHS = [
  // Most likely REST shapes
  "/api/events/{id}/results",
  "/api/events/{id}",
  "/api/event/{id}",
  "/api/event/{id}/results",
  "/events/{id}/results.json",
  "/events/{id}.json",
  "/event/{id}.json",
  "/data/event/{id}",
  "/data/events/{id}",
  // HTML fallback (we parse it)
  "/events/{id}/results",
  "/event={id}?config=w3",
];

const COMMON_HEADERS = {
  Accept:
    "application/json, text/javascript, text/html;q=0.9, */*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (LiveTimingDashboard Proxy) Node/Express",
  "Accept-Language": "en-US,en;q=0.9",
};

// Per-event cache of the working endpoint so we don't probe every poll.
const workingPathByEvent = new Map();

async function tryFetch(url) {
  const res = await fetch(url, {
    headers: COMMON_HEADERS,
    redirect: "follow",
  });
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  return { ok: res.ok, status: res.status, contentType, text, url };
}

function looksLikeJson(contentType, text) {
  if (contentType.includes("application/json")) return true;
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksLikeRealHtmlPayload(contentType, text) {
  // The SPA shell is ~ a few hundred bytes with no <tr>/<table> rows.
  // A real results page contains a table or many rows.
  if (!contentType.includes("text/html")) return false;
  return /<tr[\s>]/i.test(text) || /class="[^"]*(?:row|car|driver|entry)/i.test(text);
}

/**
 * Fetches event data. Returns { kind: "json"|"html", payload, sourceUrl }.
 * Throws if nothing usable was found.
 */
export async function fetchEventData(eventId) {
  // Prefer cached path if we previously found one for this event.
  const cached = workingPathByEvent.get(eventId);
  const order = cached
    ? [cached, ...CANDIDATE_PATHS.filter((p) => p !== cached)]
    : CANDIDATE_PATHS;

  const errors = [];
  for (const path of order) {
    const url = BASE + path.replace("{id}", encodeURIComponent(eventId));
    try {
      const r = await tryFetch(url);
      if (!r.ok) {
        errors.push(`${r.status} ${url}`);
        continue;
      }
      if (looksLikeJson(r.contentType, r.text)) {
        try {
          const payload = JSON.parse(r.text);
          workingPathByEvent.set(eventId, path);
          return { kind: "json", payload, sourceUrl: url };
        } catch (e) {
          errors.push(`bad-json ${url}`);
          continue;
        }
      }
      if (looksLikeRealHtmlPayload(r.contentType, r.text)) {
        workingPathByEvent.set(eventId, path);
        return { kind: "html", payload: r.text, sourceUrl: url };
      }
      errors.push(`empty-shell ${url}`);
    } catch (e) {
      errors.push(`err ${url}: ${e.message}`);
    }
  }
  throw new Error(
    `No usable live-timing endpoint found for event ${eventId}. Tried:\n  ${errors.join("\n  ")}`
  );
}
