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
 * The menu bar's title text: the live countdown while a phase is running, otherwise this week's
 * hours. Deliberately "this week", not "today" - MetricsHoursDto (the server's actual shape,
 * confirmed against StudyLife.Shared/Dtos.cs) carries week/month/total only, no daily figure.
 * studylife-vscode sums "today" from /api/sessions/history instead, which needs
 * Sessions.GetHistory - a scope this extension deliberately does not request (see README). The
 * tooltip spells out that the idle number is the week's total, the same way studylife-vscode's
 * status bar leaves the disambiguation to its tooltip rather than the label itself.
 */
export function menuBarTitle(timer: TimerState | undefined, weekHours: number | undefined, now: number): string {
  const card = timerCard(timer, now);
  if (card.running) return card.countdown ?? card.phase;
  return formatHours(weekHours);
}

/** Dropdown/detail lines below the timer card: this week's hours, streak, next goal deadline -
 *  everything Metrics.GetSummary can honestly provide. */
export function summaryLines(metrics: MetricsSummary | undefined): string[] {
  const lines: string[] = [];
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
