// Maintains persistent WebSocket connections to livetiming.azurewebsites.net
// and caches the latest message per event ID.
//
// The upstream pushes full state on connect and incremental updates thereafter.
// Our HTTP API (/api/event/:id) simply returns the latest cached snapshot.

import { WebSocket } from "ws";

const WS_URL = "wss://livetiming.azurewebsites.net/";
const RECONNECT_MS = 3000;

// eventId -> { data: Object, ts: number }
const cache = new Map();
// eventId -> WebSocket
const sockets = new Map();

export function ensureConnected(eventId) {
  if (!sockets.has(eventId)) _connect(eventId);
}

export function getCached(eventId) {
  return cache.get(eventId) ?? null;
}

function _connect(eventId) {
  const ws = new WebSocket(WS_URL, {
    headers: {
      "Origin": "https://livetiming.azurewebsites.net",
      "User-Agent": "Mozilla/5.0 (LiveTimingProxy)",
    },
  });

  sockets.set(eventId, ws);

  ws.on("open", () => {
    console.log(`[ws:${eventId}] connected`);
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      // Log RESULT structure once so we can see the format in Render logs
      if (!cache.has(eventId) && msg.RESULT !== undefined) {
        const sample = Array.isArray(msg.RESULT)
          ? msg.RESULT.find((x) => x != null)
          : msg.RESULT;
        console.log(`[ws:${eventId}] RESULT sample:`, JSON.stringify(sample).slice(0, 400));
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
    // 'close' fires after 'error', so reconnect is handled there
  });
}
