import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { fetchEventData } from "./livetiming-client.js";
import { normalize } from "./normalizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple in-memory cache: avoid hammering upstream if the frontend
// has multiple tabs polling the same event.
const cache = new Map(); // eventId -> { ts, data }
const CACHE_MS = 2000;

app.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.get("/api/event/:id", async (req, res) => {
  const eventId = req.params.id;
  const now = Date.now();
  const hit = cache.get(eventId);
  if (hit && now - hit.ts < CACHE_MS) {
    res.set("X-Cache", "HIT");
    return res.json(hit.data);
  }
  try {
    const raw = await fetchEventData(eventId);
    const data = normalize(raw);
    cache.set(eventId, { ts: now, data });
    res.set("X-Cache", "MISS");
    res.json(data);
  } catch (err) {
    console.error(`[event ${eventId}]`, err.message);
    if (hit) {
      res.set("X-Cache", "STALE");
      return res.status(200).json({
        ...hit.data,
        meta: { ...hit.data.meta, stale: true, error: err.message },
      });
    }
    res.status(502).json({
      error: "upstream_unavailable",
      message: err.message,
    });
  }
});

// Serve the React build in production
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(PORT, () => {
  console.log(`Live timing proxy listening on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/event/50`);
});
