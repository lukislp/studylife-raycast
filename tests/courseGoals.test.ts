import { describe, expect, it } from "vitest";
import type { CourseGoal } from "../src/api";
import { daysUntil, formatDue, openGoals } from "../src/courseGoals";

// Midday UTC, deliberately unambiguous: still the same calendar day in Europe/Berlin too, so
// these assertions do not depend on the Berlin-anchoring behaviour covered separately below.
const NOW = Date.parse("2026-09-16T10:00:00.000Z");

describe("daysUntil", () => {
  it("compares calendar dates, not instants", () => {
    expect(daysUntil("2026-09-17T00:00:00", NOW)).toBe(1);
    expect(daysUntil("2026-09-16T00:00:00", NOW)).toBe(0);
    expect(daysUntil("2026-09-15T00:00:00", NOW)).toBe(-1);
  });

  it("ignores any time-of-day component on the target", () => {
    expect(daysUntil("2026-09-20T23:59:59", NOW)).toBe(4);
  });

  it("anchors 'today' to Europe/Berlin, not the instant's UTC calendar date", () => {
    // 22:30 UTC in September is already past midnight in Berlin (UTC+2 during CEST), so
    // Berlin's calendar "today" is one day ahead of the UTC calendar date of the same instant.
    // A naive `new Date(now).toISOString()` (UTC) or a plain local Date (whatever TZ Raycast
    // happens to run in) would both get this wrong, in different ways.
    const lateUtc = Date.parse("2026-09-16T22:30:00.000Z"); // = 2026-09-17T00:30 Europe/Berlin
    expect(daysUntil("2026-09-17T00:00:00", lateUtc)).toBe(0);
    expect(daysUntil("2026-09-16T00:00:00", lateUtc)).toBe(-1);
  });
});

describe("formatDue", () => {
  it("renders today, a future count and an overdue count distinctly", () => {
    expect(formatDue(0)).toBe("today");
    expect(formatDue(1)).toBe("in 1 day");
    expect(formatDue(5)).toBe("in 5 days");
    expect(formatDue(-1)).toBe("1 day overdue");
    expect(formatDue(-3)).toBe("3 days overdue");
  });
});

describe("openGoals", () => {
  const goals: CourseGoal[] = [
    { courseId: 1, courseName: "Betriebssysteme", targetDate: "2026-09-20T00:00:00" },
    { courseId: 2, courseName: "Completed course", targetDate: "2026-09-18T00:00:00", completedAt: "2026-09-01T00:00:00" },
    { courseId: 3, courseName: "No deadline" },
    { courseId: 4, courseName: "Overdue course", targetDate: "2026-09-10T00:00:00" },
  ];

  it("keeps only goals with a target date and no completion, sorted soonest first", () => {
    const rows = openGoals(goals, NOW);
    expect(rows.map((r) => r.name)).toEqual(["Overdue course", "Betriebssysteme"]);
    expect(rows[0]?.overdue).toBe(true);
    expect(rows[1]?.overdue).toBe(false);
  });

  it("handles an undefined or empty list instead of throwing", () => {
    expect(openGoals(undefined, NOW)).toEqual([]);
    expect(openGoals([], NOW)).toEqual([]);
  });
});
