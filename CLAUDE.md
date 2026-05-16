# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live timing dashboard for motorsport races, pulling data from `https://livetiming.azurewebsites.net`. Two packages:

- **`server/`** — Node.js + Express proxy (port 4000). Handles CORS, endpoint auto-discovery, in-memory caching, normalization, and serves the production client build.
- **`client/`** — React + Vite frontend (port 5173). Leaderboard with auto-refresh every 5s.

The `mnt/` directory is an archived output copy — ignore it.

## Commands

### Development (two terminals)
```bash
# Terminal 1 — backend
cd server && npm install && npm run dev   # → http://localhost:4000

# Terminal 2 — frontend
cd client && npm install && npm run dev   # → http://localhost:5173
```
Vite proxies `/api/*` → `http://localhost:4000` via `client/vite.config.js`.

### Production build (single service)
```bash
npm run build   # installs deps + runs vite build → client/dist/
npm start       # node server/index.js — serves API + static client
```

### Deploy to Render
Render reads `render.yaml` automatically. Build command: `npm run build`. Start command: `npm start`.

## Architecture

### Data flow
```
livetiming.azurewebsites.net → livetiming-client.js → normalizer.js → index.js (Express)
                                                                              ↓
                                                         api.js (client) → useLiveTiming.js → App.jsx
```

### Server: endpoint auto-discovery (`livetiming-client.js`)
The upstream site is a SPA — it doesn't serve data on its main URL. The client tries a prioritized list (`CANDIDATE_PATHS`) of potential API paths for each event ID, caches the first one that works (`workingPathByEvent` Map), and returns either JSON or HTML to the normalizer.

To add a newly discovered endpoint, prepend it to `CANDIDATE_PATHS` in `livetiming-client.js`.

### Server: normalization (`normalizer.js`)
Converts heterogeneous upstream responses into a stable schema:
```js
{ event, leader, cars: [...], meta: { source, fetchedAt, shape } }
```
The `pick()` helper tries multiple key aliases (e.g. `driver` / `driverName` / `pilot`) for resilience against undocumented schema changes. HTML responses are scraped with Cheerio by finding the table with the most rows and mapping columns by header text.

### Server: caching (`index.js`)
2-second in-memory cache keyed by `eventId`. On upstream failure, returns stale data with `meta.stale: true` and `X-Cache: STALE` header instead of a 502.

### Client: polling (`useLiveTiming.js`)
Custom hook that polls `/api/event/:id` every `intervalMs` (default 5000ms, set in `App.jsx`). Uses `AbortController` to cancel in-flight requests when the event ID changes or the component unmounts. Returns `{ data, loading, error, lastUpdated, refresh }`.

### Client: best lap highlighting (`App.jsx`)
`parseLapTimeToMs()` converts lap time strings (`"1:23.456"` or `"83.456"`) to milliseconds. The car with the overall best lap (`bestOverallCarNo`) is passed to `LeaderboardTable` and highlighted in purple.
