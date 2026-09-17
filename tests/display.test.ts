import { describe, expect, it } from "vitest";
import type { MetricsSummary } from "../src/api";
import { menuBarTitle, summaryLines, timerCard } from "../src/display";
import type { TimerState } from "../src/timer";

const NOW = Date.parse("2026-09-16T12:00:00.000Z");
const MIN = 60_000;

function running(overrides: Partial<TimerState> = {}): TimerState {
  return {
    isRunning: true,
    isBreak: false,
    timerModeId: 1,
    phaseEndsAt: new Date(NOW + 10 * MIN).toISOString(),
    ...overrides,
  };
}

describe("timerCard", () => {
  it("reports Stopped with no countdown when nothing is running", () => {
    expect(timerCard(undefined, NOW)).toEqual({ phase: "Stopped", running: false });
  });

  it("reports Focus with a countdown while a focus phase runs", () => {
    expect(timerCard(running(), NOW)).toEqual({ phase: "Focus", running: true, countdown: "10:00" });
  });

  it("reports Break during a break", () => {
    expect(timerCard(running({ isBreak: true }), NOW).phase).toBe("Break");
  });
});

describe("menuBarTitle", () => {
  it("shows the live countdown while running", () => {
    expect(menuBarTitle(running(), 12.5, NOW)).toBe("10:00");
  });

  it("falls back to the phase name if the deadline cannot be read while running", () => {
    expect(menuBarTitle(running({ phaseEndsAt: null }), 12.5, NOW)).toBe("Focus");
  });

  it("shows this week's hours when idle - never a 'today' figure the API cannot provide", () => {
    expect(menuBarTitle(undefined, 12.5, NOW)).toBe("12 h 30 min");
  });

  it("shows a dash when idle and the week figure is unknown", () => {
    expect(menuBarTitle(undefined, undefined, NOW)).toBe("-");
  });
});

describe("summaryLines", () => {
  it("includes only what the metrics response actually carries", () => {
    expect(summaryLines(undefined)).toEqual([]);
    expect(summaryLines({})).toEqual([]);
  });

  it("formats week hours, streak and the next goal", () => {
    const metrics: MetricsSummary = {
      hours: { week: 5 },
      streak: { current: 3 },
      upcomingCourseGoals: [{ courseId: 1, courseName: "Betriebssysteme", targetDate: "2026-09-20", daysLeft: 4 }],
    };
    expect(summaryLines(metrics)).toEqual([
      "This week: 5 h 0 min",
      "Streak: 3 days",
      "Next goal: Betriebssysteme in 4 days",
    ]);
  });

  it("singularises a streak of exactly one day", () => {
    expect(summaryLines({ streak: { current: 1 } })).toEqual(["Streak: 1 day"]);
  });

  it("still shows a streak of zero - it is a fact, not a missing value", () => {
    expect(summaryLines({ streak: { current: 0 } })).toEqual(["Streak: 0 days"]);
  });
});
