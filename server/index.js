import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { ensureConnected, getCached } from "./livetiming-client.js";
import { normalize } from "./normalizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Debug: shows raw WebSocket data (remove after fixing normalizer)
app.get("/api/debug/:id", (req, res) => {
  const cached = getCached(req.params.id);
  if (!cached) return res.status(404).json({ error: "no data yet" });
  const { RESULT, ...rest } = cached.data;
  const sample = Array.isArray(RESULT)
    ? RESULT.filter(Boolean).slice(0, 2)
    : RESULT;
  res.json({ meta: rest, RESULT_sample: sample, RESULT_length: Array.isArray(RESULT) ? RESULT.length : typeof RESULT });
});

app.get("/api/event/:id", (req, res) => {
  const eventId = req.params.id;

  // Start (or reuse) a WebSocket connection for this event
  ensureConnected(eventId);

  const cached = getCached(eventId);
  if (!cached) {
    // Still connecting — tell the client to retry
    return res.status(202).json({
      error: "connecting",
      message: "Conectando al live timing, reintentá en unos segundos…",
    });
  }

  const staleMs = Date.now() - cached.ts;
  const data = normalize(cached.data);
  if (staleMs > 15000) data.meta.stale = true;

  res.json(data);
});

// Serve React build in production
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(PORT, () => {
  console.log(`Live timing proxy listening on http://localhost:${PORT}`);
});
