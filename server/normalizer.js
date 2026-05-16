// Converts a WebSocket message from livetiming.azurewebsites.net into the
// stable schema the frontend expects:
//
// { event, leader, cars[], meta }
//
// The upstream RESULT field is a sparse 1-indexed array. Each entry is either
// an array of positional values or an object — we handle both. Unknown fields
// are mapped to "—" so the UI never breaks regardless of schema changes.

const str = (v) => (v == null ? "" : String(v).trim());
const num = (v) => {
  const n = Number(str(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// ----- Object-shaped RESULT entry ----------------------------------------
const OBJ_KEYS = {
  position:   ["POS", "Pos", "pos", "POSITION", "rank"],
  carNumber:  ["SNR", "BIB", "NUMBER", "No", "no", "CAR"],
  status:     ["STATUS", "State", "state"],
  class:      ["CLASS", "Class", "CATEGORY"],
  classRank:  ["CLASSPOS", "ClassPos", "classRank", "POSINCLASS"],
  driver:     ["DRIVER", "Driver", "NAME", "Pilot"],
  laps:       ["LAPS", "Laps", "LAP"],
  gap:        ["GAP", "Gap", "BEHIND", "DIFF"],
  lastLap:    ["LASTLAP", "LastLap", "LAST"],
  bestLap:    ["BESTLAP", "BestLap", "BEST", "FASTEST"],
  pitStops:   ["PITSTOPS", "Pits", "PITS", "STOPS"],
  vehicle:    ["VEHICLE", "Vehicle", "CAR_MODEL", "MODEL"],
  team:       ["TEAM", "Team"],
};

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

function carFromObject(entry, idx) {
  return {
    position:  num(pick(entry, OBJ_KEYS.position))  ?? idx + 1,
    carNumber: str(pick(entry, OBJ_KEYS.carNumber)),
    status:    str(pick(entry, OBJ_KEYS.status))    || "RUN",
    class:     str(pick(entry, OBJ_KEYS.class)),
    classRank: num(pick(entry, OBJ_KEYS.classRank)),
    driver:    str(pick(entry, OBJ_KEYS.driver)),
    laps:      num(pick(entry, OBJ_KEYS.laps))      ?? 0,
    gap:       str(pick(entry, OBJ_KEYS.gap)),
    lastLap:   str(pick(entry, OBJ_KEYS.lastLap)),
    bestLap:   str(pick(entry, OBJ_KEYS.bestLap)),
    pitStops:  num(pick(entry, OBJ_KEYS.pitStops))  ?? 0,
    vehicle:   str(pick(entry, OBJ_KEYS.vehicle)),
    team:      str(pick(entry, OBJ_KEYS.team)),
  };
}

// ----- Array-shaped RESULT entry -----------------------------------------
// Common column orders seen in similar timing systems. We try each mapping
// until we get at least a car number or driver name.
const ARRAY_MAPPINGS = [
  // [pos, carNo, class, classRank, driver, laps, gap, lastLap, bestLap, pits, vehicle, team, status]
  { position:0, carNumber:1, class:2, classRank:3, driver:4, laps:5, gap:6, lastLap:7, bestLap:8, pitStops:9, vehicle:10, team:11, status:12 },
  // [pos, carNo, driver, class, laps, gap, lastLap, bestLap, pits, status]
  { position:0, carNumber:1, driver:2, class:3, laps:4, gap:5, lastLap:6, bestLap:7, pitStops:8, status:9 },
  // [carNo, pos, driver, class, laps, gap, lastLap, bestLap, pits, status]
  { carNumber:0, position:1, driver:2, class:3, laps:4, gap:5, lastLap:6, bestLap:7, pitStops:8, status:9 },
];

function carFromArray(arr, positionFallback) {
  for (const map of ARRAY_MAPPINGS) {
    const get = (k) => (map[k] != null ? arr[map[k]] : undefined);
    const carNo = str(get("carNumber"));
    const driver = str(get("driver"));
    if (!carNo && !driver) continue;
    return {
      position:  num(get("position"))  ?? positionFallback,
      carNumber: carNo,
      status:    str(get("status"))    || "RUN",
      class:     str(get("class")),
      classRank: num(get("classRank")),
      driver:    driver,
      laps:      num(get("laps"))      ?? 0,
      gap:       str(get("gap")),
      lastLap:   str(get("lastLap")),
      bestLap:   str(get("bestLap")),
      pitStops:  num(get("pitStops"))  ?? 0,
      vehicle:   str(get("vehicle")),
      team:      str(get("team")),
    };
  }
  // Unknown format — log raw and return a placeholder so the UI doesn't crash
  console.warn("[normalizer] unknown array format:", JSON.stringify(arr).slice(0, 200));
  return null;
}

// ----- Main export --------------------------------------------------------
export function normalize(msg) {
  const resultRaw = msg.RESULT ?? [];
  // RESULT is 1-indexed sparse array → filter out nulls/undefineds
  const entries = Array.isArray(resultRaw)
    ? resultRaw.map((e, i) => ({ e, i })).filter(({ e }) => e != null)
    : [];

  const cars = entries
    .map(({ e, i }) =>
      typeof e === "object" && !Array.isArray(e)
        ? carFromObject(e, i)
        : Array.isArray(e)
        ? carFromArray(e, i)
        : null
    )
    .filter(Boolean)
    .sort((a, b) => a.position - b.position);

  const trackState = str(msg.TRACKSTATE);
  const flagMap = { "0": "GREEN", "1": "YELLOW", "2": "RED", "3": "SC", "4": "VSC" };

  const event = {
    name:          str(msg.CUP)       || "Live Timing",
    status:        str(msg.HEAT)      || "",
    flag:          flagMap[trackState] || trackState,
    timeRemaining: str(msg.REMAINING) || str(msg.TIMELEFT) || "",
    trackName:     str(msg.TRACKNAME) || "",
    totalLaps:     num(msg.TOTALLAPS) ?? null,
  };

  return {
    event,
    leader: cars[0] ?? null,
    cars,
    meta: {
      source: "wss://livetiming.azurewebsites.net/",
      fetchedAt: new Date().toISOString(),
      shape: "websocket",
    },
  };
}
