import React, { useEffect, useState } from "react";

export default function StatusBar({ lastUpdated, loading, error, stale, onRefresh, eventId, setEventId }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = lastUpdated ? Math.floor((now - lastUpdated.getTime()) / 1000) : null;

  const state = error ? "error" : stale ? "stale" : loading ? "loading" : "live";
  const label =
    state === "error"
      ? "DESCONECTADO"
      : state === "stale"
      ? "DATOS EN CACHÉ"
      : state === "loading"
      ? "CONECTANDO"
      : "EN VIVO";

  return (
    <header className="statusbar">
      <div className="statusbar__brand">
        <span className="statusbar__logo">◆</span>
        <span className="statusbar__title">LIVE TIMING</span>
        <span className="statusbar__divider" />
        <label className="statusbar__event">
          Evento
          <input
            type="number"
            value={eventId}
            onChange={(e) => setEventId(e.target.value.replace(/[^0-9]/g, "") || "50")}
            min="1"
            aria-label="ID del evento"
          />
        </label>
      </div>
      <div className="statusbar__right">
        <div className={`statusbar__state statusbar__state--${state}`}>
          <span className="dot" />
          {label}
        </div>
        <div className="statusbar__updated">
          {lastUpdated ? `Actualizado hace ${secs}s` : "—"}
        </div>
        <button className="statusbar__refresh" onClick={onRefresh} aria-label="Refrescar">
          ⟳
        </button>
      </div>
    </header>
  );
}
