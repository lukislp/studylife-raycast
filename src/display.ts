// What the timer-status view and the menu bar show, as plain data - no Raycast APIs here, so the
// rendering rules are testable on their own, the same split studylife-vscode uses between
// panelModel.ts/statusBar.ts and panel.ts/extension.ts.
import type { MetricsSummary } from "./api";
import { formatHours } from "./format";
import { type TimerState, formatCountdown, phaseOf, remainingMs } from "./timer";

export interface TimerCard {
  phase: "Stopped" | "Focus" | "Break";
  running: boolean;
  /** "24:13", or undefined when nothing is running or the deadline cannot be read. */
  countdown?: string;
}

export function timerCard(timer: TimerState | undefined, now: number): TimerCard {
  const phase = phaseOf(timer);
  const remaining = remainingMs(timer, now);
  return {
    phase: phase === "stopped" ? "Stopped" : phase === "break" ? "Break" : "Focus",
    running: phase !== "stopped",
    ...(remaining === undefined ? {} : { countdown: formatCountdown(remaining) }),
  };
}

/**
 * The menu bar's title text: the live countdown while a phase is running, otherwise today's
 * hours - matching studylife-vscode's status bar, which shows the same figure as its primary
 * idle state. Falls back to this week's hours if today's could not be fetched (see
 * useStudyLifeData's todayHours handling), and to "-" if neither is available.
 */
export function menuBarTitle(
  timer: TimerState | undefined,
  todayHoursValue: number | undefined,
  weekHours: number | undefined,
  now: number,
): string {
  const card = timerCard(timer, now);
  if (card.running) return card.countdown ?? card.phase;
  return formatHours(todayHoursValue ?? weekHours);
}

/** Dropdown/detail lines below the timer card: today's hours, this week's hours, streak, next
 *  goal deadline - everything Metrics.GetSummary and Sessions.GetHistory can honestly provide.
 *  `todayHoursValue` is omitted (not shown as "-") rather than shown as unknown, since a fetch
 *  failure there should not read as "zero today". */
export function summaryLines(metrics: MetricsSummary | undefined, todayHoursValue?: number): string[] {
  const lines: string[] = [];
  if (todayHoursValue !== undefined) lines.push(`Today: ${formatHours(todayHoursValue)}`);

  const week = metrics?.hours?.week;
  if (week !== undefined) lines.push(`This week: ${formatHours(week)}`);

  const streak = metrics?.streak?.current;
  if (streak !== undefined) lines.push(`Streak: ${streak} day${streak === 1 ? "" : "s"}`);

  const next = metrics?.upcomingCourseGoals?.[0];
  if (next) {
    lines.push(`Next goal: ${next.courseName} in ${next.daysLeft} day${next.daysLeft === 1 ? "" : "s"}`);
  }
  return lines;
}
