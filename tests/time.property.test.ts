import fc from "fast-check";
import { describe, it } from "vitest";
import type { CourseGoal } from "../src/api";
import { berlinWallClockIso, parseBerlinNaive } from "../src/berlinTime";
import { daysUntil, formatDue, openGoals } from "../src/courseGoals";
import { buildConnectUrl, parseCallback, redirectUriFor, statesMatch, trimBase } from "../src/oauth";
import { todayHours } from "../src/sessionHistory";
import { formatCountdown, progress, remainingMs, type TimerState } from "../src/timer";

const pad = (n: number): string => String(n).padStart(2, "0");
const instant = fc.integer({ min: 946_684_800_000, max: 4_102_444_800_000 });

// Hours 04-22 sidestep the two DST transition hours (02:00-03:00), where a wall-clock reading is
// either ambiguous (autumn) or does not exist (spring).
const naive = fc
  .record({
    year: fc.integer({ min: 2000, max: 2060 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    hour: fc.integer({ min: 4, max: 22 }),
    minute: fc.integer({ min: 0, max: 59 }),
  })
  .map((n) => `${n.year}-${pad(n.month)}-${pad(n.day)}T${pad(n.hour)}:${pad(n.minute)}:00`);

describe("berlinTime (property-based)", () => {
  it("berlinWallClockIso inverts parseBerlinNaive for every unambiguous wall-clock time", () => {
    fc.assert(fc.property(naive, (s) => berlinWallClockIso(parseBerlinNaive(s)) === s));
  });

  it("parseBerlinNaive(berlinWallClockIso(t)) recovers t to the second, and never throws on arbitrary text", () => {
    fc.assert(
      fc.property(instant, (ms) => {
        const back = parseBerlinNaive(berlinWallClockIso(ms));
        // Within the autumn fall-back hour the wall clock is ambiguous: allow the one-hour alias.
        const diff = Math.abs(back - Math.floor(ms / 1000) * 1000);
        return diff === 0 || diff === 3_600_000;
      }),
    );
    fc.assert(
      fc.property(fc.string(), (s) => {
        parseBerlinNaive(s);
        return true;
      }),
    );
  });
});

describe("courseGoals (property-based)", () => {
  it("daysUntil of the Berlin 'today' is 0 and shifts one-for-one with the target date", () => {
    fc.assert(
      fc.property(instant, fc.integer({ min: -400, max: 400 }), (now, offset) => {
        const today = berlinWallClockIso(now).slice(0, 10);
        const [y, m, d] = today.split("-").map(Number) as [number, number, number];
        const target = new Date(Date.UTC(y, m - 1, d + offset));
        const targetIso = `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}T00:00:00`;
        return daysUntil(today, now) === 0 && daysUntil(targetIso, now) === offset;
      }),
    );
  });

  it("formatDue is total and its wording agrees with the sign of the day count", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000, max: 100_000 }), (n) => {
        const text = formatDue(n);
        if (n < 0) return text.endsWith("overdue") && text.startsWith(`${Math.abs(n)} day`);
        if (n === 0) return text === "today";
        return text.startsWith(`in ${n} day`);
      }),
    );
  });

  it("openGoals only returns goals with a target date and no completion, sorted soonest first", () => {
    const goal: fc.Arbitrary<CourseGoal> = fc.record({
      courseId: fc.nat(),
      courseName: fc.string(),
      targetDate: fc.oneof(fc.constant(null), naive),
      completedAt: fc.oneof(fc.constant(null), naive),
    });
    fc.assert(
      fc.property(fc.array(goal, { maxLength: 20 }), instant, (goals, now) => {
        const rows = openGoals(goals, now);
        const expected = goals.filter((g) => g.targetDate && !g.completedAt).length;
        return (
          rows.length === expected &&
          rows.every((r, i) => (i === 0 ? true : (rows[i - 1] as { daysLeft: number }).daysLeft <= r.daysLeft)) &&
          rows.every((r) => r.overdue === r.daysLeft < 0)
        );
      }),
    );
  });
});

describe("sessionHistory (property-based)", () => {
  it("todayHours is finite, non-negative and bounded by 24 h per session", () => {
    const session = fc.record({ startTime: naive, endTime: naive });
    fc.assert(
      fc.property(fc.array(session, { maxLength: 20 }), instant, (sessions, now) => {
        const hours = todayHours(sessions, now);
        return Number.isFinite(hours) && hours >= 0 && hours <= sessions.length * 24;
      }),
    );
  });
});

describe("timer (property-based)", () => {
  const timerState = fc.record({
    isRunning: fc.boolean(),
    isBreak: fc.boolean(),
    timerModeId: fc.oneof(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 100, max: 1000 })),
    phaseEndsAt: fc.oneof(
      fc.constant(null),
      fc
        .date({ min: new Date("2000-01-01"), max: new Date("2100-01-01"), noInvalidDate: true })
        .map((d) => d.toISOString()),
      fc.string(),
    ),
  }) satisfies fc.Arbitrary<TimerState>;

  it("remainingMs is never negative and progress stays within [0, 1]", () => {
    fc.assert(
      fc.property(timerState, instant, (state, now) => {
        const remaining = remainingMs(state, now);
        const p = progress(state, now);
        return (remaining === undefined || remaining >= 0) && (p === undefined || (p >= 0 && p <= 1));
      }),
    );
  });

  it("formatCountdown renders m:ss and inverts to the floored second count", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 10_000_000_000 }), (ms) => {
        const match = /^(\d+):(\d{2})$/.exec(formatCountdown(ms));
        if (!match) return false;
        const seconds = Number(match[2]);
        return seconds < 60 && Number(match[1]) * 60 + seconds === Math.floor(Math.max(0, ms) / 1000);
      }),
    );
  });
});

describe("oauth (property-based)", () => {
  it("trimBase never leaves a trailing slash and is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (base) => {
        const once = trimBase(base);
        return !once.endsWith("/") && trimBase(once) === once;
      }),
    );
  });

  it("parseCallback returns exactly the assertion and state it was given and never throws on junk", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (assertion, state) => {
        const parsed = parseCallback(`/callback?${new URLSearchParams({ assertion, state })}`);
        return parsed.assertion === assertion && parsed.state === state;
      }),
    );
    fc.assert(
      fc.property(fc.string(), (junk) =>
        Object.keys(parseCallback(`/callback?${junk}`)).every((k) => k === "assertion" || k === "state"),
      ),
    );
  });

  it("buildConnectUrl carries redirect_uri, state and challenge through a URL round trip", () => {
    fc.assert(
      fc.property(
        fc.webUrl({ withQueryParameters: false, withFragments: false }),
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.string(),
        fc.integer({ min: 1, max: 65535 }),
        (base, clientId, state, challenge, port) => {
          const redirect = redirectUriFor(port);
          const url = new URL(buildConnectUrl(base, clientId, redirect, state, challenge));
          return (
            url.searchParams.get("redirect_uri") === redirect &&
            url.searchParams.get("state") === state &&
            url.searchParams.get("code_challenge") === challenge
          );
        },
      ),
    );
  });

  it("statesMatch equals plain equality for non-empty expected values", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string(), (a, b) => statesMatch(a, a) && statesMatch(b, a) === (a === b)),
    );
  });
});
