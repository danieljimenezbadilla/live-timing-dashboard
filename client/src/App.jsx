import React, { useMemo, useState } from "react";
import { useLiveTiming } from "./hooks/useLiveTiming";
import StatusBar from "./components/StatusBar";
import StatsCards from "./components/StatsCards";
import Filters from "./components/Filters";
import LeaderboardTable from "./components/LeaderboardTable";

function parseLapTimeToMs(t) {
  if (!t) return null;
  const s = String(t).trim();
  const colon = s.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
  if (colon) return (+colon[1]) * 60000 + (+colon[2]) * 1000 + (colon[3] ? +`0.${colon[3]}` * 1000 : 0);
  const flat = s.match(/^(\d+)(?:\.(\d+))?$/);
  if (flat) return (+flat[1]) * 1000 + (flat[2] ? +`0.${flat[2]}` * 1000 : 0);
  return null;
}

export default function App() {
  const [eventId, setEventId] = useState("50");
  const { data, loading, error, lastUpdated, refresh } = useLiveTiming(eventId, 5000);

  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");

  const cars = data?.cars || [];

  const classes = useMemo(() => {
    const set = new Set();
    for (const c of cars) if (c.class) set.add(c.class);
    return [...set].sort();
  }, [cars]);

  const bestOverallCarNo = useMemo(() => {
    let best = null;
    for (const c of cars) {
      const ms = parseLapTimeToMs(c.bestLap);
      if (ms !== null && (!best || ms < best.ms)) best = { ms, no: c.carNumber };
    }
    return best?.no || null;
  }, [cars]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cars.filter((c) => {
      if (classFilter !== "ALL" && c.class !== classFilter) return false;
      if (!q) return true;
      return (
        (c.carNumber || "").toLowerCase().includes(q) ||
        (c.driver || "").toLowerCase().includes(q) ||
        (c.class || "").toLowerCase().includes(q) ||
        (c.vehicle || "").toLowerCase().includes(q) ||
        (c.team || "").toLowerCase().includes(q)
      );
    });
  }, [cars, query, classFilter]);

  const stale = data?.meta?.stale;

  return (
    <div className="app">
      <StatusBar
        lastUpdated={lastUpdated}
        loading={loading && !data}
        error={error}
        stale={stale}
        onRefresh={refresh}
        eventId={eventId}
        setEventId={setEventId}
      />

      {error && !data && (
        <div className="banner banner--error">
          <strong>Error:</strong> {error}
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}

      {stale && (
        <div className="banner banner--warn">
          Mostrando datos en caché — la fuente no responde en este momento.
        </div>
      )}

      {loading && !data && (
        <div className="banner banner--info">Cargando datos del evento…</div>
      )}

      {data && (
        <>
          <StatsCards data={data} />
          <Filters
            query={query}
            setQuery={setQuery}
            classFilter={classFilter}
            setClassFilter={setClassFilter}
            classes={classes}
          />
          <LeaderboardTable cars={filtered} bestOverallCarNo={bestOverallCarNo} />
          <footer className="footer">
            Fuente: <code>{data.meta?.source}</code> · Formato: <code>{data.meta?.shape}</code>
          </footer>
        </>
      )}
    </div>
  );
}
