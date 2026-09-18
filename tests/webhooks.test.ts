import { describe, expect, it } from "vitest";
import { WEBHOOK_EVENT_TYPES, eventsSummary, formatCreatedAt, sortByCreatedDesc } from "../src/webhooks";

describe("WEBHOOK_EVENT_TYPES", () => {
  it("has no duplicate values", () => {
    const values = WEBHOOK_EVENT_TYPES.map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("includes the confirmed event types from WebhookEventTypes.cs", () => {
    const values = WEBHOOK_EVENT_TYPES.map((e) => e.value);
    expect(values).toEqual(
      expect.arrayContaining([
        "timer.started",
        "timer.ended",
        "session.created",
        "session.completed",
        "session.deleted",
        "new_record.set",
        "note.created",
        "note.updated",
        "note.deleted",
        "course_goal.created",
        "course_goal.updated",
        "course_goal.completed",
        "course_goal.deleted",
        "course_resource.created",
        "course_resource.deleted",
        "session_template.created",
        "session_template.deleted",
        "study_program.created",
        "study_program.completed",
        "study_program.deleted",
        "plan.generated",
      ]),
    );
  });

  it("gives every entry a non-empty human label", () => {
    for (const eventType of WEBHOOK_EVENT_TYPES) {
      expect(eventType.label.length).toBeGreaterThan(0);
    }
  });
});

describe("eventsSummary", () => {
  it("names the single event rather than saying '1 events'", () => {
    expect(eventsSummary(["session.completed"])).toBe("session.completed");
  });

  it("counts multiple events", () => {
    expect(eventsSummary(["session.completed", "timer.started"])).toBe("2 events");
  });

  it("reports no events for an empty list", () => {
    expect(eventsSummary([])).toBe("No events");
  });
});

describe("formatCreatedAt", () => {
  it("renders just the calendar date", () => {
    expect(formatCreatedAt("2026-09-18T14:32:00Z")).toBe("2026-09-18");
  });

  it("falls back to the raw string for something it cannot parse", () => {
    expect(formatCreatedAt("not-a-date")).toBe("not-a-date");
  });
});

describe("sortByCreatedDesc", () => {
  it("sorts newest first without mutating the input", () => {
    const input = [
      { id: "a", created_at: "2026-09-01T00:00:00Z" },
      { id: "b", created_at: "2026-09-18T00:00:00Z" },
      { id: "c", created_at: "2026-09-10T00:00:00Z" },
    ];
    const copy = [...input];
    expect(sortByCreatedDesc(input).map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(input).toEqual(copy);
  });

  it("handles an empty list", () => {
    expect(sortByCreatedDesc([])).toEqual([]);
  });
});
