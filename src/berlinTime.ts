// Europe/Berlin wall-clock <-> UTC-instant conversion.
//
// StudyLife's server is naive-local Europe/Berlin: every DateTime it sends or expects carries no
// offset in JSON and means Berlin wall-clock, regardless of what timezone the machine running
// this extension happens to be in. `new Date(ms).toISOString()` is UTC, and a plain
// `new Date(...)` local-getter dance silently uses whatever zone Raycast is running in - both are
// wrong, and wrong in different, unpredictable ways depending on where the machine is. Getting
// this backwards books a session at the wrong hour, or buckets it into the wrong calendar day
// when computing today's hours (sessionHistory.ts).
//
// Both directions here go through Intl.DateTimeFormat with timeZone: "Europe/Berlin" rather than
// a hardcoded UTC+1/+2, so CET/CEST (and the DST transition dates themselves, which move slightly
// year to year) are always correct without a manually maintained table.

const BERLIN_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Berlin",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsAt(ms: number): WallClock {
  const parts = BERLIN_FORMAT.formatToParts(new Date(ms));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The UTC instant's Europe/Berlin wall-clock, formatted the way StudyLife's naive DateTimes are -
 * "2026-09-16T23:47:00", no offset, no "Z". This is what StartTime/EndTime for Sessions.Create
 * must be built from.
 */
export function berlinWallClockIso(ms: number): string {
  const p = partsAt(ms);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

/** Europe/Berlin's UTC offset, in minutes, at a given instant (positive = ahead of UTC, so +60
 *  CET / +120 CEST). Found via a real Intl lookup rather than a fixed table, so it stays correct
 *  across DST transitions without maintenance. */
function offsetMinutesAt(ms: number): number {
  const p = partsAt(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - ms) / 60_000);
}

/**
 * The UTC instant a naive Europe/Berlin wall-clock string denotes ("2026-09-16T23:47:00") - the
 * inverse of berlinWallClockIso, needed to make sense of the naive StartTime/EndTime StudyLife's
 * own API returns (e.g. from Sessions.GetHistory) as real instants for overlap arithmetic.
 *
 * Works by reading the string's numbers as if they were UTC, then correcting by Berlin's offset
 * at that instant, with one extra correction pass in case the first guess landed on the other
 * side of a DST transition (only matters within the transition's own hour, twice a year).
 */
export function parseBerlinNaive(naive: string): number {
  const [datePart, timePart] = naive.split("T");
  const [y, m, d] = (datePart ?? "").split("-").map(Number);
  const [hh, mm, ss] = (timePart ?? "").split(":").map(Number);
  if (y === undefined || m === undefined || d === undefined) return NaN;
  const asIfUtc = Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0, ss ?? 0);
  const firstGuess = asIfUtc - offsetMinutesAt(asIfUtc) * 60_000;
  return asIfUtc - offsetMinutesAt(firstGuess) * 60_000;
}
