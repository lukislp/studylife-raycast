// What "today's hours" means, as plain data - no Raycast APIs here, so the day-boundary
// arithmetic is testable on its own.
//
// Ported (algorithm shape) from studylife-vscode's StudyLifeApi.sumHoursOn: MetricsHoursDto only
// ever carries week/month/total, never a daily figure, so today's hours are summed here from
// Sessions.GetHistory instead. Unlike vscode's version, the day boundary and the sessions'
// start/end times are both read through berlinTime.ts rather than the machine's own local
// timezone or a bare Date.parse - StudyLife's StartTime/EndTime are naive Europe/Berlin
// wall-clock, so "today" has to mean the Berlin calendar day, not whatever zone Raycast happens
// to be running in.
import type { SessionRecord } from "./api";
import { berlinWallClockIso, parseBerlinNaive } from "./berlinTime";

/**
 * Hours completed today (the Europe/Berlin calendar day containing `now`), summed from a
 * Sessions.GetHistory response. Sessions spanning midnight count only their overlap with today.
 */
export function todayHours(sessions: SessionRecord[] | undefined, now: number): number {
  const todayDate = berlinWallClockIso(now).slice(0, 10); // "2026-09-17"
  const start = parseBerlinNaive(`${todayDate}T00:00:00`);
  const end = start + 86_400_000;

  let ms = 0;
  for (const s of sessions ?? []) {
    if (!s?.startTime || !s?.endTime) continue;
    const from = parseBerlinNaive(s.startTime);
    const to = parseBerlinNaive(s.endTime);
    if (Number.isNaN(from) || Number.isNaN(to) || to <= from) continue;
    // Clipped to the day, so a session spanning midnight counts only its part of today.
    const overlap = Math.min(to, end) - Math.max(from, start);
    if (overlap > 0) ms += overlap;
  }
  return ms / 3_600_000;
}
