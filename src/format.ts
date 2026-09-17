// Duration/hours formatting, ported from studylife-vscode's activity.ts (the ActivityTracker
// half of that file has no Raycast equivalent - there is no "editor" here to watch - only the
// formatting helpers carry over).

/** "2 h 14 min", "47 min", "0 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/**
 * Hours as StudyLife reports them (a decimal) rendered the same way. Kept separate from
 * formatDuration so a change to one cannot silently reformat the other.
 */
export function formatHours(hours: number | undefined): string {
  if (hours === undefined || Number.isNaN(hours)) return "-";
  return formatDuration(Math.round(hours * 3_600_000));
}
