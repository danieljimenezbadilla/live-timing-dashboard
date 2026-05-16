// Connects to wss://livetiming.azurewebsites.net/ and caches live data.
//
// The upstream requires Azure session cookies (TiPMix / x-ms-routing-name)
// that are set by the initial HTTP page load. We fetch the page first to
// obtain those cookies, then open the WebSocket with them.

import { WebSocket } from "ws";

const BASE = "https://livetiming.azurewebsites.net";
const WS_URL = "wss://livetiming.azurewebsites.net/";
const RECONNECT_MS = 5000;

// eventId -> { data: Object, ts: number }
const cache = new Map();
// eventId -> WebSocket | "connecting"
const sockets = new Map();

export function ensureConnected(eventId) {
  if (!sockets.has(eventId)) _connect(eventId);
}

export function getCached(eventId) {
  return cache.get(eventId) ?? null;
}

async function fetchCookies(eventId) {
  try {
    const res = await fetch(`${BASE}/event=${eventId}?config=w3`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });
    const raw = res.headers.get("set-cookie") ?? "";
    // Extract individual cookie name=value pairs
    const cookies = [...raw.matchAll(/([^,;\s]+=[^,;]+)/g)]
      .map((m) => m[1].trim())
      .filter((c) => !/(path|domain|expires|samesite|secure|httponly)/i.test(c));
    console.log(`[ws:${eventId}] cookies obtained:`, cookies.join("; ").slice(0, 120));
    return cookies.join("; ");
  } catch (e) {
    console.warn(`[ws:${eventId}] cookie fetch failed:`, e.message);
    return "";
  }
}

async function _connect(eventId) {
  sockets.set(eventId, "connecting");

  const cookie = await fetchCookies(eventId);

  const ws = new WebSocket(WS_URL, {
    headers: {
      "Origin": BASE,
      "Cookie": cookie,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    },
  });

  sockets.set(eventId, ws);

  ws.on("open", () => {
    console.log(`[ws:${eventId}] connected`);
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!cache.has(eventId)) {
        const result = Array.isArray(msg.RESULT) ? msg.RESULT.filter(Boolean) : [];
        console.log(`[ws:${eventId}] first message — RESULT entries: ${result.length}, sample:`, JSON.stringify(result[0]).slice(0, 300));
      }
      cache.set(eventId, { data: msg, ts: Date.now() });
    } catch (e) {
      console.error(`[ws:${eventId}] parse error:`, e.message);
    }
  });

  ws.on("close", (code) => {
    console.log(`[ws:${eventId}] closed (${code}), reconnecting in ${RECONNECT_MS}ms`);
    sockets.delete(eventId);
    setTimeout(() => _connect(eventId), RECONNECT_MS);
  });

  ws.on("error", (err) => {
    console.error(`[ws:${eventId}] error:`, err.message);
  });
}
