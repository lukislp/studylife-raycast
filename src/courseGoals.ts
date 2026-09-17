// What the course-goals command shows, as plain data - no Raycast APIs here, so the filtering,
// sorting and countdown maths are testable on their own.
//
// Mirrors the server's own StudyMetrics.CalcUpcomingCourseGoals (StudyLife.Shared, used to build
// MetricsSummaryDto.upcomingCourseGoals): open goals are those with a target date set and no
// CompletedAt, sorted by target date ascending. That server-side helper caps the list at 5
// because it only feeds a small metrics widget; this command has no such cap, since listing every
// open goal is the whole point of it - so it is re-implemented here against the raw
// CourseGoals.GetAll response instead of reusing the metrics endpoint's capped projection.
import type { CourseGoal } from "./api";

export interface GoalRow {
  courseId: number;
  name: string;
  /** "in 3 days", "today", "2 days overdue". */
  due: string;
  daysLeft: number;
  overdue: boolean;
}

/**
 * Days between a naive-local StudyLife date-time and "today", both anchored to calendar dates
 * (not wall-clock instants). StudyLife's DateTimes carry no offset and are naive Europe/Berlin
 * local time (see the server's AsOf doc comment on MetricsSummaryDto), so the target's calendar
 * date is read straight off its YYYY-MM-DD prefix - no reinterpretation needed, a target date is
 * a calendar date, not an instant. "Today" is different: `now` is a real instant (Date.now()),
 * so it DOES need converting - explicitly to Europe/Berlin, the zone the server's "today" means,
 * not to whatever timezone this Mac happens to be in (which `new Date(now).toISOString()` would
 * silently use UTC for, and a plain `new Date(...)` would silently use the local one for - both
 * wrong, and both wrong in different, unpredictable ways depending on where Raycast is running).
 */
export function daysUntil(targetDate: string, now: number): number {
  const targetDay = Date.UTC(...dateParts(targetDate));
  const todayDay = Date.UTC(...dateParts(todayInBerlin(now)));
  return Math.round((targetDay - todayDay) / 86_400_000);
}

/** "2026-09-17" - en-CA formats as YYYY-MM-DD, which is exactly the prefix dateParts expects. */
function todayInBerlin(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date(now));
}

function dateParts(isoLike: string): [number, number, number] {
  const [y, m, d] = isoLike.slice(0, 10).split("-").map(Number);
  return [y ?? 0, (m ?? 1) - 1, d ?? 1];
}

/** "in 3 days", "today", "2 days overdue" - the shape studylife-vscode's panel uses too. */
export function formatDue(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
  if (daysLeft === 0) return "today";
  return `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
}

/** Open goals (a target date set, not completed), sorted by target date, formatted for display. */
export function openGoals(goals: CourseGoal[] | undefined, now: number): GoalRow[] {
  return (goals ?? [])
    .filter((g) => typeof g?.courseId === "number" && !!g.targetDate && !g.completedAt)
    .map((g) => {
      const daysLeft = daysUntil(g.targetDate as string, now);
      return {
        courseId: g.courseId,
        name: g.courseName,
        daysLeft,
        due: formatDue(daysLeft),
        overdue: daysLeft < 0,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
