// What Topic to send on Sessions.Create, as a pure decision - so the "an explicit, user-typed
// topic wins; otherwise fall back to the course name; otherwise omit the field entirely" rule
// stays testable on its own, the same split every other booking rule in this extension uses (see
// runLog.ts and coursePicker.ts).
//
// Sessions.Create's StudySessionDto.Topic (string?, MaxLength 500) was, before this, already
// being populated - just always with the course name (see timerActions.ts's bookRun), never with
// anything the user actually typed, and never left unset for a session that had a course. This
// adds the latter without disturbing the former: an explicit topic always wins over the course
// name, and a run with no explicit topic keeps exactly the course-name fallback it already had.

/** Trims and returns the explicit topic if it is non-empty, otherwise falls back to the course
 *  name (which may itself be undefined, e.g. for a session started with no course picked). */
export function buildSessionTopic(
  courseName: string | undefined,
  explicitTopic: string | undefined,
): string | undefined {
  const trimmed = explicitTopic?.trim();
  return trimmed ? trimmed : courseName;
}
