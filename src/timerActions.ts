// Starts, pauses and stops the shared timer, and - on stop - books whatever run this extension
// tracked into a real session. Shared by start-focus-timer, timer-status and timer-status-menubar
// so the three of them can never drift on what "start with a course" or "book the run on stop"
// means: whichever command's Stop is used, the same session-booking rule applies.
import { Toast, showToast } from "@raycast/api";
import type { NewSession, StudyLifeApi, TimerState } from "./api";
import { berlinWallClockIso } from "./berlinTime";
import { formatDuration } from "./format";
import { type TimerRun, decide } from "./runLog";
import { readRun, writeRun } from "./runStorage";
import { transition } from "./timer";

/** Flow State (52/17) - the closest built-in preset to an uninterrupted focus block, and the
 *  fallback studylife-vscode uses for the same purpose when the running mode is unknown. */
const DEFAULT_TIMER_MODE_ID = 2;

export interface TimerActionOptions {
  /** Only meaningful on "start" - see timer.ts's TransitionOptions for why changing it mid-run
   *  is not offered anywhere in this extension. */
  courseId?: number;
  courseName?: string;
}

/**
 * Runs one timer transition against the server and, on "start" with a course picked, remembers
 * the run so a later "stop" can book it (see runLog.ts). On "stop", always attempts to book
 * whatever was remembered, regardless of which command triggered the stop.
 */
export async function runTimerAction(
  client: StudyLifeApi,
  action: "start" | "pause" | "stop",
  options: TimerActionOptions = {},
): Promise<TimerState> {
  const current = await client.getTimerState();
  const now = Date.now();
  const next = transition(current, action, {
    now,
    ...(options.courseId === undefined ? {} : { courseId: options.courseId }),
  });
  const saved = await client.saveTimerState(next);

  if (action === "start" && options.courseId !== undefined) {
    const run: TimerRun = {
      courseId: options.courseId,
      startedAt: now,
      sessionId: current?.sessionId ?? null,
      ...(options.courseName === undefined ? {} : { courseName: options.courseName }),
    };
    await writeRun(run);
  }

  if (action === "stop") {
    await bookRun(client, current, now);
  }

  return saved;
}

/**
 * Turns a finished run into a study session, unless StudyLife was already accounting for it.
 * See runLog.ts for why this is the extension's job at all.
 *
 * Below the minimum length, or when a planned session was already attached, this stays silent by
 * design - no toast, no error. It is expected behaviour, not a failure to report.
 */
async function bookRun(client: StudyLifeApi, timerBeforeStop: TimerState | undefined, now: number): Promise<void> {
  const run = await readRun();
  const decision = decide(run, timerBeforeStop?.sessionId, now);
  await writeRun(undefined);

  if (!decision.log) return;

  const session: NewSession = {
    courseId: decision.courseId,
    startTime: berlinWallClockIso(decision.startedAt),
    endTime: berlinWallClockIso(decision.endedAt),
    timerModeId: timerBeforeStop?.timerModeId ?? DEFAULT_TIMER_MODE_ID,
    isCompleted: true,
    ...(run?.courseName === undefined ? {} : { topic: run.courseName }),
  };

  try {
    await client.createSession(session);
    await showToast({
      style: Toast.Style.Success,
      title: "Session logged",
      message: `${formatDuration(decision.endedAt - decision.startedAt)}${
        run?.courseName ? ` for ${run.courseName}` : ""
      }`,
    });
  } catch (error) {
    // Losing the session silently would be the worst outcome - the user stopped a timer they
    // believed was being recorded.
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not save the session",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
