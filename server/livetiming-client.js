import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const BASE_URL = "https://livetiming.azurewebsites.net";

const cache = new Map();    // eventId -> { data, ts }
const sessions = new Map(); // eventId -> browser | "connecting"

export function ensureConnected(eventId) {
  if (!sessions.has(eventId)) _connect(eventId);
}

export function getCached(eventId) {
  return cache.get(eventId) ?? null;
}

async function _connect(eventId) {
  sessions.set(eventId, "connecting");
  console.log(`[pup:${eventId}] launching browser…`);

  try {
    const execPath = await chromium.executablePath();
    console.log(`[pup:${eventId}] executablePath: ${execPath}`);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: execPath,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");

    cdp.on("Network.webSocketFrameReceived", ({ response }) => {
      const payload = response?.payloadData;
      if (!payload) return;
      try {
        const msg = JSON.parse(payload);
        if (!msg.EXPORTID) return;

        if (!cache.has(eventId)) {
          const result = Array.isArray(msg.RESULT) ? msg.RESULT.filter(Boolean) : [];
          console.log(`[pup:${eventId}] first data — ${result.length} entries`);
          if (result[0]) console.log(`[pup:${eventId}] sample[0]:`, JSON.stringify(result[0]).slice(0, 400));
        }
        cache.set(eventId, { data: msg, ts: Date.now() });
      } catch {
        // ignore non-JSON frames
      }
    });

    browser.on("disconnected", () => {
      console.log(`[pup:${eventId}] browser disconnected, reconnecting in 10s`);
      sessions.delete(eventId);
      setTimeout(() => _connect(eventId), 10000);
    });

    sessions.set(eventId, browser);

    await page.goto(`${BASE_URL}/event=${eventId}?config=w3`, {
      waitUntil: "load",
      timeout: 30000,
    });

    console.log(`[pup:${eventId}] page loaded — intercepting WebSocket`);

  } catch (e) {
    console.error(`[pup:${eventId}] error:`, e.message);
    sessions.delete(eventId);
    setTimeout(() => _connect(eventId), 10000);
  }
}
