import fc from "fast-check";
import { describe, it } from "vitest";
import { formatDuration, formatHours } from "../src/format";
import { buildSessionTopic } from "../src/sessionTopic";
import { eventsSummary, formatCreatedAt, sortByCreatedDesc } from "../src/webhooks";

const minutesOf = (text: string): number => {
  const m = /^(?:(\d+) h )?(\d+) min$/.exec(text);
  if (!m) throw new Error(`unexpected format: ${text}`);
  return Number(m[1] ?? 0) * 60 + Number(m[2]);
};

describe("format (property-based)", () => {
  it("formatDuration always matches the documented shape and keeps minutes below 60", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e6, max: 1e12 }), (ms) => {
        const text = formatDuration(ms);
        const m = /^(?:(\d+) h )?(\d+) min$/.exec(text);
        return m !== null && Number(m[2]) < 60 && minutesOf(text) === Math.floor(Math.max(0, ms) / 60_000);
      }),
    );
  });

  it("formatDuration is monotonic", () => {
    fc.assert(
      fc.property(fc.nat({ max: 1e11 }), fc.nat({ max: 1e11 }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        return minutesOf(formatDuration(lo)) <= minutesOf(formatDuration(hi));
      }),
    );
  });

  it("formatHours never throws and only yields the placeholder for missing or NaN input", () => {
    fc.assert(
      fc.property(fc.oneof(fc.constant(undefined), fc.double({ min: -1000, max: 10_000 })), (hours) => {
        const text = formatHours(hours);
        return hours === undefined || Number.isNaN(hours) ? text === "-" : text !== "-";
      }),
    );
  });
});

describe("sessionTopic (property-based)", () => {
  it("an explicit non-blank topic always wins, trimmed; otherwise the course name is used unchanged", () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        (course, topic) => {
          const result = buildSessionTopic(course, topic);
          const trimmed = topic?.trim();
          return trimmed ? result === trimmed : result === course;
        },
      ),
    );
  });
});

describe("webhooks (property-based)", () => {
  const created = fc
    .date({ min: new Date("2000-01-01"), max: new Date("2100-01-01"), noInvalidDate: true })
    .map((d) => d.toISOString());

  it("eventsSummary is total: names a single event, counts several, handles none", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 30 }), (events) => {
        const text = eventsSummary(events);
        if (events.length === 0) return text === "No events";
        if (events.length === 1) return text === events[0];
        return text === `${events.length} events`;
      }),
    );
  });

  it("formatCreatedAt gives the UTC date prefix of a valid timestamp and echoes unparseable input", () => {
    fc.assert(
      fc.property(created, (iso) => formatCreatedAt(iso) === iso.slice(0, 10)),
    );
    fc.assert(
      fc.property(
        fc.string().filter((s) => Number.isNaN(Date.parse(s))),
        (s) => formatCreatedAt(s) === s,
      ),
    );
  });

  it("sortByCreatedDesc returns a newest-first permutation and does not mutate its input", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ id: fc.nat(), created_at: created }), { maxLength: 30 }), (regs) => {
        const before = JSON.stringify(regs);
        const sorted = sortByCreatedDesc(regs);
        const ordered = sorted.every(
          (r, i) => i === 0 || Date.parse((sorted[i - 1] as { created_at: string }).created_at) >= Date.parse(r.created_at),
        );
        const sameMembers = sorted.length === regs.length && sorted.every((r) => regs.includes(r));
        return ordered && sameMembers && JSON.stringify(regs) === before;
      }),
    );
  });
});
