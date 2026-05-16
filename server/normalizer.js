// Converts whatever the upstream returns into a stable schema that the
// frontend can rely on:
//
// {
//   event: {
//     name, status, flag, timeRemaining, trackName, totalLaps
//   },
//   leader: {
//     position, carNumber, driver, laps, bestLap, vehicle, class
//   },
//   cars: [
//     {
//       position, carNumber, status, class, classRank, driver,
//       laps, gap, lastLap, bestLap, pitStops, vehicle, team
//     }
//   ],
//   meta: { source, fetchedAt }
// }

import * as cheerio from "cheerio";

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const str = (v) => (v === null || v === undefined ? "" : String(v).trim());

// Try every plausible key name (the upstream schema isn't documented).
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      return obj[k];
    }
  }
  return null;
}

function normalizeCarFromJson(c, idx) {
  return {
    position: num(pick(c, "position", "pos", "Pos", "Position", "rank", "Rank")) ?? idx + 1,
    carNumber: str(pick(c, "carNumber", "number", "no", "No", "carNo", "CarNumber", "racingNumber")),
    status: str(pick(c, "status", "state", "Status", "carStatus")) || "RUN",
    class: str(pick(c, "class", "Class", "category", "Category", "cls")),
    classRank: num(pick(c, "classRank", "classPosition", "classPos", "ClassRank", "rankInClass")),
    driver: str(
      pick(c, "driver", "driverName", "Driver", "name", "Name", "currentDriver", "pilot", "Piloto")
    ),
    laps: num(pick(c, "laps", "Laps", "lap", "lapCount", "completedLaps")) ?? 0,
    gap: str(pick(c, "gap", "Gap", "gapToLeader", "behind", "Behind", "diff")),
    lastLap: str(pick(c, "lastLap", "LastLap", "lastLapTime", "last", "Last")),
    bestLap: str(pick(c, "bestLap", "BestLap", "bestLapTime", "best", "Best", "fastest")),
    pitStops: num(pick(c, "pitStops", "pits", "Pits", "pitCount", "PitStops", "stops")) ?? 0,
    vehicle: str(pick(c, "vehicle", "Vehicle", "car", "Car", "carModel", "model")),
    team: str(pick(c, "team", "Team", "teamName")),
  };
}

function normalizeFromJson(payload, sourceUrl) {
  // The payload could be: array of cars, or { results: [...] }, or { entries: [...] }, etc.
  const list =
    Array.isArray(payload)
      ? payload
      : payload.results || payload.entries || payload.cars || payload.standings ||
        payload.data?.results || payload.data?.entries || [];

  const cars = list.map(normalizeCarFromJson).sort((a, b) => a.position - b.position);

  const eventInfo = payload.event || payload.race || payload.meta || {};
  const event = {
    name: str(pick(eventInfo, "name", "title", "eventName")) || "Live Timing",
    status: str(pick(eventInfo, "status", "state", "flag")),
    flag: str(pick(eventInfo, "flag", "trackStatus")),
    timeRemaining: str(pick(eventInfo, "timeRemaining", "remaining", "timeLeft")),
    trackName: str(pick(eventInfo, "track", "trackName", "circuit")),
    totalLaps: num(pick(eventInfo, "totalLaps", "scheduledLaps")) ?? null,
  };

  const leader = cars[0] || null;

  return {
    event,
    leader,
    cars,
    meta: {
      source: sourceUrl,
      fetchedAt: new Date().toISOString(),
      shape: "json",
    },
  };
}

// HTML parser — works against the rendered results page table.
// Maps cell positions tolerantly using header text when available.
function normalizeFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);

  // Find the most likely results table: the one with the most <tr>.
  let bestTable = null;
  let bestRows = 0;
  $("table").each((_, t) => {
    const rows = $(t).find("tr").length;
    if (rows > bestRows) {
      bestRows = rows;
      bestTable = t;
    }
  });

  let cars = [];
  if (bestTable) {
    const $rows = $(bestTable).find("tr");
    const headers = [];
    $rows
      .first()
      .find("th,td")
      .each((_, th) => headers.push($(th).text().trim().toLowerCase()));

    const indexOfHeader = (...labels) => {
      for (const l of labels) {
        const idx = headers.findIndex((h) => h.includes(l));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const idx = {
      pos: indexOfHeader("pos", "rank", "p"),
      no: indexOfHeader("no", "num", "#", "car"),
      status: indexOfHeader("status", "state"),
      cls: indexOfHeader("class", "cat"),
      classRank: indexOfHeader("class rank", "in class", "cls rank"),
      driver: indexOfHeader("driver", "name", "pilot"),
      laps: indexOfHeader("laps", "lap"),
      gap: indexOfHeader("gap", "behind", "diff"),
      lastLap: indexOfHeader("last"),
      bestLap: indexOfHeader("best", "fast"),
      pits: indexOfHeader("pit", "stops"),
      vehicle: indexOfHeader("vehicle", "car model", "model"),
      team: indexOfHeader("team"),
    };

    $rows.slice(1).each((i, row) => {
      const cells = $(row).find("td");
      if (cells.length === 0) return;
      const cell = (n) => (n >= 0 && cells[n] ? $(cells[n]).text().trim() : "");
      cars.push({
        position: num(cell(idx.pos)) ?? i + 1,
        carNumber: cell(idx.no),
        status: cell(idx.status) || "RUN",
        class: cell(idx.cls),
        classRank: num(cell(idx.classRank)),
        driver: cell(idx.driver),
        laps: num(cell(idx.laps)) ?? 0,
        gap: cell(idx.gap),
        lastLap: cell(idx.lastLap),
        bestLap: cell(idx.bestLap),
        pitStops: num(cell(idx.pits)) ?? 0,
        vehicle: cell(idx.vehicle),
        team: cell(idx.team),
      });
    });
  }

  cars.sort((a, b) => a.position - b.position);

  return {
    event: {
      name: $("title").text().replace(/- Live Timing.*/i, "").trim() || "Live Timing",
      status: "",
      flag: "",
      timeRemaining: "",
      trackName: "",
      totalLaps: null,
    },
    leader: cars[0] || null,
    cars,
    meta: {
      source: sourceUrl,
      fetchedAt: new Date().toISOString(),
      shape: "html",
    },
  };
}

export function normalize({ kind, payload, sourceUrl }) {
  if (kind === "json") return normalizeFromJson(payload, sourceUrl);
  return normalizeFromHtml(payload, sourceUrl);
}
