import React, { useEffect, useRef, useState } from "react";

const PIT_BADGE_MS = 45000; // show "PIT IN" badge for 45s after entry

const flagClass = (status) => {
  if (!status) return "";
  const s = status.toUpperCase();
  if (/PIT/.test(s)) return "row--pit";
  if (/DNF|OUT|RETIR/.test(s)) return "row--out";
  if (/DNS|DISQ|DSQ/.test(s)) return "row--dns";
  if (/CHK|FIN/.test(s)) return "row--fin";
  return "";
};

const isPitStatus = (s) => /pit/i.test(s || "");

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

function parseGapToSec(gap) {
  if (!gap) return null;
  const s = String(gap).trim();
  if (/lap/i.test(s)) return null;
  const colon = s.match(/^\+?(\d+):(\d+(?:\.\d+)?)/);
  if (colon) return (+colon[1]) * 60 + +colon[2];
  const flat = s.match(/^\+?(\d+(?:\.\d+)?)/);
  if (flat) return +flat[1];
  return null;
}

function podiumClass(pos) {
  if (pos === 1) return "pos-num--p1";
  if (pos === 2) return "pos-num--p2";
  if (pos === 3) return "pos-num--p3";
  return "";
}

function GapTrend({ gap, prevGap, isLeader }) {
  if (isLeader || !gap) return null;
  const curr = parseGapToSec(gap);
  const prev = parseGapToSec(prevGap);
  if (curr === null || prev === null) return null;
  const delta = curr - prev;
  if (Math.abs(delta) < 0.05) return null; // ignore noise < 50ms
  const closing = delta < 0;
  return (
    <span className={`gap-trend gap-trend--${closing ? "closing" : "growing"}`}>
      {closing ? "▼" : "▲"}
      <span className="gap-delta">{Math.abs(delta).toFixed(2)}s</span>
    </span>
  );
}

function DriverRow({ car, isLeader, isBestOverall, prevLastLap, prevGap, pitEntryTs, expanded, onToggle }) {
  const justImproved = car.lastLap && prevLastLap && car.lastLap !== prevLastLap;
  const rowStatus = flagClass(car.status);
  const statusLabel = rowStatus.replace("row--", "") || "run";
  const colSpan = 7;
  const rowPodium = car.position === 2 ? "row--p2" : car.position === 3 ? "row--p3" : "";
  const showPitBadge = pitEntryTs && (Date.now() - pitEntryTs) < PIT_BADGE_MS;

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
          <div className="status-cell">
            <span className={`status-pill status-pill--${statusLabel}`}>
              {car.status || "RUN"}
            </span>
            {showPitBadge && <span className="pit-badge">PIT IN</span>}
          </div>
        </td>
        <td className="cell-class col-hide-mobile">
          {car.class && <span className="class-tag">{car.class}</span>}
        </td>
        <td className="cell-rank col-hide-mobile">{car.classRank ?? "—"}</td>
        <td className="cell-driver">
          <div className="driver-main">
            {car.driver || "—"}
            {showPitBadge && <span className="pit-badge pit-badge--mobile col-hide-desktop">PIT IN</span>}
          </div>
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
          <div className="gap-cell">
            <span>{formatGap(car.gap, isLeader)}</span>
            <GapTrend gap={car.gap} prevGap={prevGap} isLeader={isLeader} />
          </div>
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
  const prevGapMap     = useRef(new Map());
  const prevStatusMap  = useRef(new Map());
  const pitEntryMap    = useRef(new Map()); // carNumber → timestamp of pit entry
  const [expandedCar, setExpandedCar] = useState(null);

  // Capture prev values BEFORE updating (read first, then write)
  const prevGaps     = prevGapMap.current;
  const prevStatuses = prevStatusMap.current;

  useEffect(() => {
    const nextLap    = new Map();
    const nextGap    = new Map();
    const nextStatus = new Map();

    for (const c of cars) {
      nextLap.set(c.carNumber, c.lastLap);
      nextGap.set(c.carNumber, c.gap);

      // Detect pit entry: prev NOT pit, current IS pit
      const wasPit = isPitStatus(prevStatusMap.current.get(c.carNumber));
      const nowPit = isPitStatus(c.status);
      if (nowPit && !wasPit) {
        pitEntryMap.current.set(c.carNumber, Date.now());
      }
      // Clear badge once car leaves pit
      if (!nowPit && wasPit) {
        pitEntryMap.current.delete(c.carNumber);
      }

      nextStatus.set(c.carNumber, c.status);
    }

    prevLastLapMap.current = nextLap;
    prevGapMap.current     = nextGap;
    prevStatusMap.current  = nextStatus;
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
              prevGap={prevGaps.get(c.carNumber)}
              pitEntryTs={pitEntryMap.current.get(c.carNumber)}
              expanded={expandedCar === c.carNumber}
              onToggle={() => setExpandedCar(prev => prev === c.carNumber ? null : c.carNumber)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
