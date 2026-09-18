import { describe, expect, it } from "vitest";
import { berlinWallClockIso, parseBerlinNaive } from "../src/berlinTime";

describe("berlinWallClockIso", () => {
  it("converts a UTC instant to its Europe/Berlin wall-clock during CEST (UTC+2)", () => {
    // 2026-09-16T22:30:00Z is already past midnight in Berlin during September's daylight
    // saving (CEST, UTC+2) - a naive toISOString() would report 22:30 on the 16th, one day and
    // two hours off from what StudyLife's server actually means.
    const ms = Date.parse("2026-09-16T22:30:00.000Z");
    expect(berlinWallClockIso(ms)).toBe("2026-09-17T00:30:00");
  });

  it("converts a UTC instant to its Europe/Berlin wall-clock during CET (UTC+1)", () => {
    const ms = Date.parse("2026-01-15T23:30:00.000Z");
    expect(berlinWallClockIso(ms)).toBe("2026-01-16T00:30:00");
  });

  it("pads single-digit components", () => {
    const ms = Date.parse("2026-01-01T07:05:09.000Z");
    expect(berlinWallClockIso(ms)).toBe("2026-01-01T08:05:09");
  });
});

describe("parseBerlinNaive", () => {
  it("is the exact inverse of berlinWallClockIso across the same CEST near-midnight instant", () => {
    const originalMs = Date.parse("2026-09-16T22:30:00.000Z");
    const naive = berlinWallClockIso(originalMs);
    expect(naive).toBe("2026-09-17T00:30:00");
    expect(parseBerlinNaive(naive)).toBe(originalMs);
  });

  it("is the exact inverse of berlinWallClockIso during CET", () => {
    const originalMs = Date.parse("2026-01-15T23:30:00.000Z");
    const naive = berlinWallClockIso(originalMs);
    expect(parseBerlinNaive(naive)).toBe(originalMs);
  });

  it("reads a plain Berlin wall-clock string as the correct UTC instant", () => {
    // 2026-09-17T00:30 Berlin (CEST, UTC+2) is 2026-09-16T22:30 UTC.
    expect(parseBerlinNaive("2026-09-17T00:30:00")).toBe(Date.parse("2026-09-16T22:30:00.000Z"));
  });
});
