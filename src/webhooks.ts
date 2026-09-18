// The webhook event-type catalog and pure list-rendering helpers for list-webhooks/add-webhook -
// no Raycast APIs here, so the catalog and the summary/formatting/sort rules are testable on
// their own, the same split every other list-shaping module in this extension uses.
//
// Mirrors the server's WebhookEventTypes.cs (StudyLife.Server/Services) verbatim. Deliberately a
// flat, hand-kept list rather than something fetched at runtime: there is no endpoint that serves
// the catalog itself, only the registration endpoints (see api.ts) - so this has to be kept in
// sync by hand if that file gains or removes an event type, the same way studylife-vscode and any
// other client of studylife-webhooks would.
export interface WebhookEventType {
  value: string;
  label: string;
}

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  { value: "timer.started", label: "Timer started" },
  { value: "timer.ended", label: "Timer ended" },
  { value: "session.created", label: "Session created" },
  { value: "session.completed", label: "Session completed" },
  { value: "session.deleted", label: "Session deleted" },
  { value: "new_record.set", label: "New record set" },
  { value: "note.created", label: "Note created" },
  { value: "note.updated", label: "Note updated" },
  { value: "note.deleted", label: "Note deleted" },
  { value: "course_goal.created", label: "Course goal created" },
  { value: "course_goal.updated", label: "Course goal updated" },
  { value: "course_goal.completed", label: "Course goal completed" },
  { value: "course_goal.deleted", label: "Course goal deleted" },
  { value: "course_resource.created", label: "Course resource created" },
  { value: "course_resource.deleted", label: "Course resource deleted" },
  { value: "session_template.created", label: "Session template created" },
  { value: "session_template.deleted", label: "Session template deleted" },
  { value: "study_program.created", label: "Study program created" },
  { value: "study_program.completed", label: "Study program completed" },
  { value: "study_program.deleted", label: "Study program deleted" },
  { value: "plan.generated", label: "Plan generated" },
];

/** A short summary for a registration row - the event name itself when there is exactly one
 *  (reading "1 events" would be wrong), otherwise a count. */
export function eventsSummary(events: string[]): string {
  if (events.length === 0) return "No events";
  if (events.length === 1) return (events[0] ?? "").toString();
  return `${events.length} events`;
}

/** "2026-09-18" from the server's created_at - just the date, the same short label shape
 *  courseGoals.ts uses elsewhere in this extension. Falls back to the raw string for a value this
 *  cannot parse rather than hiding it. */
export function formatCreatedAt(createdAt: string): string {
  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) return createdAt;
  return new Date(parsed).toISOString().slice(0, 10);
}

/** Registrations sorted newest first. studylife-webhooks does not document a response order, and
 *  "what did I just add" is the more useful default than whatever order the wire happens to send. */
export function sortByCreatedDesc<T extends { created_at: string }>(registrations: T[]): T[] {
  return [...registrations].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
