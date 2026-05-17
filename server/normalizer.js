// Converts a WebSocket message from livetiming.azurewebsites.net into the
// stable schema the frontend expects.
//
// Real field names (confirmed from live data):
//   POSITION, RANK, CLASSRANK, STNR (car#), NAME (driver), CLASSNAME,
//   CAR (vehicle), LAPS, GAP, INT, LASTLAPTIME, FASTESTLAP, PITSTOPCOUNT,
//   STATUS (pit/dnf), PRO, CHG, PITSUM, ETA, TOD, TRACKNAME, HEAT, CUP…

const str = (v) => (v == null ? "" : String(v).trim());
const num = (v) => {
  const n = Number(str(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function normalizeCar(entry, idx) {
  const gap = str(entry.GAP ?? entry.INT ?? "");
  // Leader gap value looks like "----LAP 69" — normalize to empty
  const gapClean = /^-{2,}/.test(gap) ? "" : gap;

  return {
    position:  num(entry.POSITION  ?? entry.RANK)    ?? idx + 1,
    carNumber: str(entry.STNR      ?? entry.SNR      ?? entry.NUMBER ?? ""),
    status:    str(entry.STATUS    ?? entry.State     ?? "RUN") || "RUN",
    class:     str(entry.CLASSNAME ?? entry.CLASS     ?? ""),
    classRank: num(entry.CLASSRANK ?? entry.CLASSPOS) ?? null,
    driver:    str(entry.NAME      ?? entry.DRIVER    ?? ""),
    laps:      num(entry.LAPS      ?? entry.LAP)      ?? 0,
    gap:       gapClean,
    lastLap:   str(entry.LASTLAPTIME ?? entry.LASTLAP ?? ""),
    bestLap:   str(entry.FASTESTLAP  ?? entry.BESTLAP ?? ""),
    pitStops:  num(entry.PITSTOPCOUNT ?? entry.PITS)  ?? 0,
    vehicle:   str(entry.CAR       ?? entry.VEHICLE   ?? ""),
    team:      str(entry.TEAM      ?? ""),
  };
}

const FLAG_MAP = { "0": "GREEN", "1": "YELLOW", "2": "RED", "3": "SC", "4": "VSC" };

export function normalize(msg) {
  const rawResult = msg.RESULT ?? [];
  const entries = Array.isArray(rawResult)
    ? rawResult.filter(Boolean)
    : [];

  const cars = entries
    .map((e, i) => (typeof e === "object" && !Array.isArray(e) ? normalizeCar(e, i) : null))
    .filter(Boolean)
    .sort((a, b) => a.position - b.position);

  return {
    event: {
      name:          str(msg.CUP)       || "Live Timing",
      status:        str(msg.HEAT)      || "",
      flag:          FLAG_MAP[str(msg.TRACKSTATE)] || str(msg.TRACKSTATE),
      timeRemaining: str(msg.REMAINING  ?? msg.TIMELEFT ?? ""),
      trackName:     str(msg.TRACKNAME  ?? ""),
      totalLaps:     num(msg.TOTALLAPS) ?? null,
    },
    leader: cars[0] ?? null,
    cars,
    meta: {
      source:    "wss://livetiming.azurewebsites.net/",
      fetchedAt: new Date().toISOString(),
      shape:     "websocket",
    },
  };
}
