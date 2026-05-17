import React, { useEffect, useRef, useState } from "react";

const flagClass = (status) => {
  if (!status) return "";
  const s = status.toUpperCase();
  if (/PIT/.test(s)) return "row--pit";
  if (/DNF|OUT|RETIR/.test(s)) return "row--out";
  if (/DNS|DISQ|DSQ/.test(s)) return "row--dns";
  if (/CHK|FIN/.test(s)) return "row--fin";
  return "";
};

function formatGap(gap, isLeader) {
  if (isLeader) return "—";
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

function podiumClass(pos) {
  if (pos === 1) return "pos-num--p1";
  if (pos === 2) return "pos-num--p2";
  if (pos === 3) return "pos-num--p3";
  return "";
}

function DriverRow({ car, isLeader, isBestOverall, prevLastLap, expanded, onToggle }) {
  const justImproved = car.lastLap && prevLastLap && car.lastLap !== prevLastLap;
  const rowStatus = flagClass(car.status);
  const statusLabel = rowStatus.replace("row--", "") || "run";
  const colSpan = 7;
  const rowPodium = car.position === 2 ? "row--p2" : car.position === 3 ? "row--p3" : "";

  return (
    <>
      <tr
        className={`row ${isLeader ? "row--leader" : ""} ${rowPodium} ${rowStatus} ${justImproved ? "row--flash" : ""} ${expanded ? "row--expanded" : ""}`}
        onClick={onToggle}
      >
        <td className="cell-pos">
          <span className={`pos-num ${podiumClass(car.position)}`}>{car.position}</span>
        </td>
        <td className="cell-no">
          <span className="car-no">#{car.carNumber || "—"}</span>
        </td>
        <td className="cell-status col-hide-mobile">
          <span className={`status-pill status-pill--${statusLabel}`}>
            {car.status || "RUN"}
          </span>
        </td>
        <td className="cell-class col-hide-mobile">
          {car.class && <span className="class-tag">{car.class}</span>}
        </td>
        <td className="cell-rank col-hide-mobile">{car.classRank ?? "—"}</td>
        <td className="cell-driver">
          <div className="driver-main">{car.driver || "—"}</div>
          {car.team && <div className="driver-team">{car.team}</div>}
          {car.class && (
            <div className="driver-class-mobile">
              <span className={`status-pill-sm status-pill--${statusLabel}`}>{car.status || "RUN"}</span>
              <span className="class-tag-sm">{car.class}</span>
            </div>
          )}
        </td>
        <td className="cell-laps mono col-hide-sm">{car.laps ?? 0}</td>
        <td className={`cell-gap mono ${isLeader ? "cell-gap--leader" : ""}`}>
          {formatGap(car.gap, isLeader)}
        </td>
        <td className="cell-time mono col-hide-mobile">{car.lastLap || "—"}</td>
        <td className={`cell-time mono ${isBestOverall ? "cell-time--purple" : ""}`}>
          {car.bestLap || "—"}
        </td>
        <td className="cell-pits mono col-hide-mobile">{car.pitStops ?? 0}</td>
        <td className="cell-vehicle col-hide-mobile">{car.vehicle || "—"}</td>
        <td className="cell-expand col-show-mobile">
          <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
        </td>
      </tr>

      {expanded && (
        <tr className="row-detail col-show-mobile-row">
          <td colSpan={colSpan}>
            <div className="row-detail__grid">
              <div className="row-detail__item">
                <span className="row-detail__label">Última vuelta</span>
                <span className="row-detail__value mono">{car.lastLap || "—"}</span>
              </div>
              <div className="row-detail__item">
                <span className="row-detail__label">Pits</span>
                <span className="row-detail__value mono">{car.pitStops ?? 0}</span>
              </div>
              <div className="row-detail__item">
                <span className="row-detail__label">Vueltas</span>
                <span className="row-detail__value mono">{car.laps ?? 0}</span>
              </div>
              <div className="row-detail__item">
                <span className="row-detail__label">Rank clase</span>
                <span className="row-detail__value mono">{car.classRank ?? "—"}</span>
              </div>
              <div className="row-detail__item row-detail__item--wide">
                <span className="row-detail__label">Vehículo</span>
                <span className="row-detail__value">{car.vehicle || "—"}</span>
              </div>
              {car.team && (
                <div className="row-detail__item row-detail__item--wide">
                  <span className="row-detail__label">Equipo</span>
                  <span className="row-detail__value">{car.team}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LeaderboardTable({ cars, bestOverallCarNo }) {
  const prevLastLapMap = useRef(new Map());
  const [expandedCar, setExpandedCar] = useState(null);

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
            <th className="col-hide-mobile">Estado</th>
            <th className="col-hide-mobile">Clase</th>
            <th className="col-hide-mobile">Rank</th>
            <th>Piloto</th>
            <th className="col-hide-sm">Vlts</th>
            <th>Gap</th>
            <th className="col-hide-mobile">Última</th>
            <th>Mejor</th>
            <th className="col-hide-mobile">Pits</th>
            <th className="col-hide-mobile">Vehículo</th>
            <th className="col-show-mobile"></th>
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
              expanded={expandedCar === c.carNumber}
              onToggle={() => setExpandedCar(prev => prev === c.carNumber ? null : c.carNumber)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
