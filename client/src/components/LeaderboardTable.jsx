import React, { useEffect, useRef } from "react";

const flagClass = (status) => {
  if (!status) return "";
  const s = status.toUpperCase();
  if (/PIT/.test(s)) return "row--pit";
  if (/DNF|OUT|RETIR/.test(s)) return "row--out";
  if (/DNS|DISQ|DSQ/.test(s)) return "row--dns";
  if (/CHK|FIN/.test(s)) return "row--fin";
  return "";
};

// Format the gap so we always show seconds AND minutes when long enough.
// Inputs we may get: "+1 Lap", "+2.345", "1:23.456", "+1:23.456", "Leader", ""
function formatGap(gap, isLeader) {
  if (isLeader) return "INTERVAL —";
  if (!gap) return "—";
  const s = String(gap).trim();
  if (/leader|líder/i.test(s)) return "—";
  if (/lap/i.test(s)) return s.replace(/^\+?/, "+");
  const colon = s.match(/^\+?(\d+):(\d+(?:\.\d+)?)/);
  if (colon) {
    const m = +colon[1];
    const sec = +colon[2];
    return `+${m}m ${sec.toFixed(3)}s`;
  }
  const flat = s.match(/^\+?(\d+(?:\.\d+)?)/);
  if (flat) {
    const total = +flat[1];
    if (total >= 60) {
      const m = Math.floor(total / 60);
      const sec = total - m * 60;
      return `+${m}m ${sec.toFixed(3)}s`;
    }
    return `+${total.toFixed(3)}s`;
  }
  return s;
}

function DriverRow({ car, isLeader, isBestOverall, prevLastLap }) {
  const justImproved = car.lastLap && prevLastLap && car.lastLap !== prevLastLap;
  return (
    <tr className={`row ${isLeader ? "row--leader" : ""} ${flagClass(car.status)} ${justImproved ? "row--flash" : ""}`}>
      <td className="cell-pos">
        <span className="pos-num">{car.position}</span>
      </td>
      <td className="cell-no">
        <span className="car-no">#{car.carNumber || "—"}</span>
      </td>
      <td className="cell-status">
        <span className={`status-pill status-pill--${flagClass(car.status).replace("row--", "") || "run"}`}>
          {car.status || "RUN"}
        </span>
      </td>
      <td className="cell-class">
        {car.class && <span className="class-tag">{car.class}</span>}
      </td>
      <td className="cell-rank">{car.classRank ?? "—"}</td>
      <td className="cell-driver">
        <div className="driver-main">{car.driver || "—"}</div>
        {car.team && <div className="driver-team">{car.team}</div>}
      </td>
      <td className="cell-laps mono">{car.laps ?? 0}</td>
      <td className={`cell-gap mono ${isLeader ? "cell-gap--leader" : ""}`}>
        {formatGap(car.gap, isLeader)}
      </td>
      <td className="cell-time mono">{car.lastLap || "—"}</td>
      <td className={`cell-time mono ${isBestOverall ? "cell-time--purple" : ""}`}>
        {car.bestLap || "—"}
      </td>
      <td className="cell-pits mono">{car.pitStops ?? 0}</td>
      <td className="cell-vehicle">{car.vehicle || "—"}</td>
    </tr>
  );
}

export default function LeaderboardTable({ cars, bestOverallCarNo }) {
  const prevLastLapMap = useRef(new Map());

  useEffect(() => {
    const next = new Map();
    for (const c of cars) next.set(c.carNumber, c.lastLap);
    prevLastLapMap.current = next;
  });

  if (cars.length === 0) {
    return (
      <div className="empty">
        <p>No hay datos para mostrar con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="leaderboard">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Carro</th>
            <th>Estado</th>
            <th>Clase</th>
            <th>Rank</th>
            <th>Piloto</th>
            <th>Vueltas</th>
            <th>Gap al líder</th>
            <th>Última</th>
            <th>Mejor</th>
            <th>Pits</th>
            <th>Vehículo</th>
          </tr>
        </thead>
        <tbody>
          {cars.map((c) => (
            <DriverRow
              key={`${c.carNumber}-${c.position}`}
              car={c}
              isLeader={c.position === 1}
              isBestOverall={bestOverallCarNo && c.carNumber === bestOverallCarNo}
              prevLastLap={prevLastLapMap.current.get(c.carNumber)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
