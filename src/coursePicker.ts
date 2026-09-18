// The courses worth offering when starting a session or attaching a note, as plain data - no
// Raycast APIs here, so the two-tier filtering is testable on its own.
//
// Mirrors studylife-vscode's panelModel.ts activeGoals(): StudyLife has no "active" flag on a
// course - the built-in catalogue alone carries around sixty, and offering all of them is the
// wall of names this replaces. What it does have is course goals, and the server already computes
// exactly the useful subset: Metrics.GetSummary's upcomingCourseGoals is filtered to goals with a
// target date that are NOT completed (StudyMetrics.CalcUpcomingCourseGoals, capped at five since
// it only feeds a small metrics widget) - precisely "courses I am currently working towards".
// Deliberately NOT CourseGoals.GetAll here (unlike course-goals.ts, which has its own uncapped-list
// reason to use that endpoint instead, see api.ts) - this picker wants the same small,
// already-sorted subset studylife-vscode's picker uses, not a second bespoke filter.
//
// An open goal with no target date is excluded upstream, so a course tracked without a deadline
// will not appear in the goals subset. catalogCourses is the escape hatch to the full catalogue
// for that case, rather than hiding it.
import type { Course, MetricsSummary, UpcomingGoal } from "./api";

/** Open-goal courses from a metrics summary, filtered to entries with a numeric courseId. */
export function goalCourses(metrics: MetricsSummary | undefined): UpcomingGoal[] {
  const goals = metrics?.upcomingCourseGoals;
  return Array.isArray(goals) ? goals.filter((g) => typeof g?.courseId === "number") : [];
}

/** The full catalogue, filtered to entries with a usable id and name. */
export function catalogCourses(courses: Course[] | undefined): Course[] {
  return (courses ?? []).filter((c) => typeof c?.id === "number" && typeof c?.name === "string");
}
