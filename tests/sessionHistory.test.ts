import { describe, expect, it } from "vitest";
import type { SessionRecord } from "../src/api";
import { todayHours } from "../src/sessionHistory";

const H = 3_600_000;
// Berlin noon on 2026-09-16 (CEST, UTC+2) = 2026-09-16T10:00:00Z.
const NOON_BERLIN = Date.parse("2026-09-16T10:00:00.000Z");

describe("todayHours", () => {
  // MetricsHoursDto carries week, month and total - but no today, so this is where the daily
  // figure actually comes from.
  it("sums sessions that happened today (naive Europe/Berlin times)", () => {
    const sessions: SessionRecord[] = [
      { startTime: "2026-09-16T08:00:00", endTime: "2026-09-16T09:30:00" },
      { startTime: "2026-09-16T10:00:00", endTime: "2026-09-16T10:45:00" },
    ];
    expect(todayHours(sessions, NOON_BERLIN)).toBeCloseTo(2.25, 5);
  });

  it("ignores sessions from another day", () => {
    const sessions: SessionRecord[] = [
      { startTime: "2026-09-15T10:00:00", endTime: "2026-09-15T12:00:00" },
    ];
    expect(todayHours(sessions, NOON_BERLIN)).toBe(0);
  });

  it("counts only today's part of a session spanning midnight", () => {
    const sessions: SessionRecord[] = [
      { startTime: "2026-09-15T23:00:00", endTime: "2026-09-16T01:00:00" },
    ];
    expect(todayHours(sessions, NOON_BERLIN) * H).toBeCloseTo(1 * H, 0);
  });

  it("skips malformed entries instead of throwing", () => {
    const sessions: SessionRecord[] = [
      { startTime: "2026-09-16T08:00:00", endTime: "2026-09-16T09:00:00" },
      { startTime: "nonsense", endTime: "2026-09-16T09:00:00" },
      { startTime: "2026-09-16T08:00:00" },
      {},
      // End before start - a corrupt row must not subtract from the total.
      { startTime: "2026-09-16T11:00:00", endTime: "2026-09-16T10:00:00" },
    ];
    expect(todayHours(sessions, NOON_BERLIN)).toBeCloseTo(1, 5);
  });

  it("returns zero for an empty or undefined list", () => {
    expect(todayHours([], NOON_BERLIN)).toBe(0);
    expect(todayHours(undefined, NOON_BERLIN)).toBe(0);
  });

  it("anchors 'today' to the Europe/Berlin calendar day, not the instant's UTC one", () => {
    // 22:30 UTC in September is already past midnight in Berlin (CEST, UTC+2) - Berlin's "today"
    // is one day ahead of the UTC calendar date of the same instant. A session just after
    // midnight Berlin time counts; the same evening's session the day before does not, even
    // though naive UTC arithmetic on the wall-clock numbers alone would get this backwards.
    const lateUtc = Date.parse("2026-09-16T22:30:00.000Z"); // = 2026-09-17T00:30 Europe/Berlin
    const justAfterMidnightBerlin: SessionRecord = {
      startTime: "2026-09-17T00:15:00",
      endTime: "2026-09-17T00:45:00",
    };
    const eveningBeforeBerlin: SessionRecord = {
      startTime: "2026-09-16T23:00:00",
      endTime: "2026-09-16T23:30:00",
    };
    expect(todayHours([justAfterMidnightBerlin], lateUtc)).toBeCloseTo(0.5, 5);
    expect(todayHours([eveningBeforeBerlin], lateUtc)).toBe(0);
  });
});
