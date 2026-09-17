import { describe, expect, it } from "vitest";
import { formatDuration, formatHours } from "../src/format";

describe("formatDuration", () => {
  it("renders hours and minutes, dropping the hours part when there are none", () => {
    expect(formatDuration(2 * 3_600_000 + 14 * 60_000)).toBe("2 h 14 min");
    expect(formatDuration(47 * 60_000)).toBe("47 min");
    expect(formatDuration(0)).toBe("0 min");
  });

  it("clamps negative durations to zero instead of going negative", () => {
    expect(formatDuration(-5_000)).toBe("0 min");
  });
});

describe("formatHours", () => {
  it("renders StudyLife's decimal hours through the same duration formatting", () => {
    expect(formatHours(2.5)).toBe("2 h 30 min");
    expect(formatHours(0)).toBe("0 min");
  });

  it("shows a dash rather than a made-up number when the value is unknown", () => {
    expect(formatHours(undefined)).toBe("-");
    expect(formatHours(Number.NaN)).toBe("-");
  });
});
