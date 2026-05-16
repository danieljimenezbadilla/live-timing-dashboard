import React, { useMemo } from "react";

function parseLapTimeToMs(t) {
  if (!t) return null;
  const s = String(t).trim();
  const colon = s.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
  if (colon) {
    const [, m, sec, ms] = colon;
    return (+m) * 60000 + (+sec) * 1000 + (ms ? +`0.${ms}` * 1000 : 0);
  }
  const flat = s.match(/^(\d+)(?:\.(\d+))?$/);
  if (flat) {
    const [, sec, ms] = flat;
    return (+sec) * 1000 + (ms ? +`0.${ms}` * 1000 : 0);
  }
  return null;
}

function pickBestLapOverall(cars) {
  let best = null;
  for (const c of cars) {
    const ms = parseLapTimeToMs(c.bestLap);
    if (ms !== null && (!best || ms < best.ms)) best = { ms, time: c.bestLap, car: c };
  }
  return best;
}

const Card = ({ label, value, sub, accent }) => (
  <div className={`stat-card ${accent || ""}`}>
    <div className="stat-card__label">{label}</div>
    <div className="stat-card__value">{value || "—"}</div>
    {sub && <div className="stat-card__sub">{sub}</div>}
  </div>
);

export default function StatsCards({ data }) {
  const cars = data?.cars || [];
  const leader = data?.leader;

  const bestOverall = useMemo(() => pickBestLapOverall(cars), [cars]);
  const onTrack = useMemo(
    () => cars.filter((c) => !/dnf|out|retired|dns|disq/i.test(c.status || "")).length,
    [cars]
  );

  return (
    <section className="stats-grid">
      <Card
        accent="stat-card--leader"
        label="Líder actual"
        value={leader ? `#${leader.carNumber} · ${leader.driver || "—"}` : "—"}
        sub={leader?.vehicle || leader?.team || ""}
      />
      <Card
        label="Vueltas del líder"
        value={leader?.laps ?? "—"}
        sub={leader?.class ? `Clase ${leader.class}` : ""}
      />
      <Card
        accent="stat-card--purple"
        label="Mejor vuelta general"
        value={bestOverall?.time || "—"}
        sub={bestOverall ? `#${bestOverall.car.carNumber} ${bestOverall.car.driver}` : ""}
      />
      <Card
        label="Carros en pista"
        value={`${onTrack} / ${cars.length}`}
        sub="activos / total"
      />
      {data?.event?.timeRemaining ? (
        <Card
          accent="stat-card--time"
          label="Tiempo restante"
          value={data.event.timeRemaining}
          sub={data.event.flag || data.event.status || ""}
        />
      ) : (
        <Card
          label="Estado"
          value={data?.event?.status || data?.event?.flag || "EN VIVO"}
          sub={data?.event?.trackName || ""}
        />
      )}
    </section>
  );
}
