import { describe, expect, it } from "vitest";
import {
  BUILT_IN_MODES,
  type TimerState,
  canChangeMode,
  durationMinutes,
  formatCountdown,
  modeChoices,
  modeName,
  phaseOf,
  progress,
  remainingMs,
  transition,
} from "../src/timer";

const NOW = Date.parse("2026-09-16T12:00:00.000Z");
const MIN = 60_000;

function running(overrides: Partial<TimerState> = {}): TimerState {
  return {
    isRunning: true,
    isBreak: false,
    currentRound: 2,
    timerModeId: 1, // Pomodoro Classic, 25/5
    sessionId: 42,
    phaseEndsAt: new Date(NOW + 10 * MIN).toISOString(),
    ...overrides,
  };
}

describe("phase", () => {
  it("distinguishes stopped, focus and break", () => {
    expect(phaseOf(undefined)).toBe("stopped");
    expect(phaseOf({ isRunning: false })).toBe("stopped");
    expect(phaseOf(running())).toBe("focus");
    expect(phaseOf(running({ isBreak: true }))).toBe("break");
  });
});

describe("remaining time", () => {
  it("counts down to phaseEndsAt", () => {
    expect(remainingMs(running(), NOW)).toBe(10 * MIN);
  });

  it("clamps at zero rather than going negative once the phase has passed", () => {
    expect(remainingMs(running(), NOW + 30 * MIN)).toBe(0);
  });

  it("is undefined when nothing runs or the timestamp is unusable", () => {
    expect(remainingMs({ isRunning: false }, NOW)).toBeUndefined();
    expect(remainingMs(running({ phaseEndsAt: null }), NOW)).toBeUndefined();
    expect(remainingMs(running({ phaseEndsAt: "not a date" }), NOW)).toBeUndefined();
  });
});

describe("progress", () => {
  it("is the fraction of the phase already elapsed", () => {
    // Pomodoro focus is 25 min; 10 remain, so 15 of 25 are done.
    expect(progress(running(), NOW)).toBeCloseTo(15 / 25, 5);
  });

  it("uses the break length during a break, not the focus length", () => {
    const state = running({ isBreak: true, phaseEndsAt: new Date(NOW + 1 * MIN).toISOString() });
    expect(progress(state, NOW)).toBeCloseTo(4 / 5, 5);
  });

  it("is undefined for a custom mode instead of inventing a total", () => {
    // Custom modes live in the user's settings, which this extension cannot read - the caller
    // has to go indeterminate rather than claim a fraction it does not know.
    expect(progress(running({ timerModeId: 100 }), NOW)).toBeUndefined();
    expect(durationMinutes(running({ timerModeId: 100 }))).toBeUndefined();
    expect(modeName(running({ timerModeId: 100 }))).toBeUndefined();
  });

  it("is undefined when stopped", () => {
    expect(progress({ isRunning: false }, NOW)).toBeUndefined();
  });

  it("never leaves 0..1 even if the clock jumped", () => {
    expect(progress(running(), NOW + 60 * MIN)).toBe(1);
  });
});

describe("countdown formatting", () => {
  it("renders minutes:seconds with padding", () => {
    expect(formatCountdown(24 * MIN + 13_000)).toBe("24:13");
    expect(formatCountdown(9_000)).toBe("0:09");
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-5_000)).toBe("0:00");
  });
});

describe("transitions", () => {
  // The wire shape has no "paused" flag - getting this wrong is silent, because the server drops
  // unknown JSON properties without complaint.
  it("pause stops the clock but keeps the session, round and break flag", () => {
    const next = transition(running({ isBreak: true, currentRound: 3 }), "pause", { now: NOW });
    expect(next.isRunning).toBe(false);
    expect(next.phaseEndsAt).toBeNull();
    expect(next.sessionId).toBe(42);
    expect(next.currentRound).toBe(3);
    expect(next.isBreak).toBe(true);
    expect("isPaused" in next).toBe(false);
  });

  it("stop ends the session and resets to round one", () => {
    const next = transition(running({ isBreak: true, currentRound: 3 }), "stop", { now: NOW });
    expect(next.isRunning).toBe(false);
    expect(next.phaseEndsAt).toBeNull();
    expect(next.sessionId).toBeNull();
    expect(next.currentRound).toBe(1);
    expect(next.isBreak).toBe(false);
  });

  it("start resumes the remainder of a paused phase rather than restarting it", () => {
    const paused = transition(running(), "pause", { now: NOW });
    const resumed = transition(paused, "start", { now: NOW });
    expect(Date.parse(resumed.phaseEndsAt as string) - NOW).toBe(25 * MIN);
  });

  it("start from a still-running state keeps the existing remainder", () => {
    const next = transition(running(), "start", { now: NOW });
    expect(Date.parse(next.phaseEndsAt as string) - NOW).toBe(10 * MIN);
  });

  it("start falls back to 25 minutes when the mode is unknown", () => {
    const next = transition({ isRunning: false, timerModeId: 100 }, "start", { now: NOW });
    expect(Date.parse(next.phaseEndsAt as string) - NOW).toBe(25 * MIN);
  });

  it("always sends clientNow so the server can translate the deadline for other devices", () => {
    expect(transition(undefined, "start", { now: NOW }).clientNow).toBe(new Date(NOW).toISOString());
  });
});

describe("modeChoices", () => {
  it("lists all nine built-in presets with their focus/break detail", () => {
    const choices = modeChoices(undefined);
    expect(choices).toHaveLength(Object.keys(BUILT_IN_MODES).length);
    const pomodoro = choices.find((c) => c.id === 1);
    expect(pomodoro).toEqual({ id: 1, name: "Pomodoro Classic", detail: "25 min focus / 5 min break", current: false });
  });

  it("marks the currently active mode, and only that one", () => {
    const choices = modeChoices(running({ timerModeId: 3 }));
    expect(choices.find((c) => c.id === 3)?.current).toBe(true);
    expect(choices.filter((c) => c.current)).toHaveLength(1);
  });

  it("marks none as current when the active mode is a custom one (id >= 100)", () => {
    const choices = modeChoices(running({ timerModeId: 100 }));
    expect(choices.some((c) => c.current)).toBe(false);
  });

  it("marks none as current when nothing is known yet", () => {
    expect(modeChoices(undefined).some((c) => c.current)).toBe(false);
  });
});

describe("canChangeMode", () => {
  it("allows changing the mode while stopped", () => {
    expect(canChangeMode(undefined)).toBe(true);
    expect(canChangeMode({ isRunning: false })).toBe(true);
  });

  it("refuses while a phase is running - the countdown is measured against the current length", () => {
    expect(canChangeMode(running())).toBe(false);
  });
});

describe("resuming after a pause", () => {
  it("restarts the phase from the remembered remainder, not from the top", () => {
    const paused = transition(running(), "pause", { now: NOW });
    const resumed = transition(paused, "start", { now: NOW, resumeMs: 10 * MIN });
    expect(Date.parse(resumed.phaseEndsAt as string) - NOW).toBe(10 * MIN);
  });

  it("prefers a live phase over a stale remembered remainder", () => {
    const resumed = transition(running(), "start", { now: NOW, resumeMs: 3 * MIN });
    expect(Date.parse(resumed.phaseEndsAt as string) - NOW).toBe(10 * MIN);
  });

  it("falls back to a full phase when the remainder is absent or used up", () => {
    const paused = transition(running(), "pause", { now: NOW });
    expect(Date.parse(transition(paused, "start", { now: NOW }).phaseEndsAt as string) - NOW).toBe(25 * MIN);
    expect(
      Date.parse(transition(paused, "start", { now: NOW, resumeMs: 0 }).phaseEndsAt as string) - NOW,
    ).toBe(25 * MIN);
  });
});
