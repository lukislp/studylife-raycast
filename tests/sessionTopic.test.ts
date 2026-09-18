import { describe, expect, it } from "vitest";
import { buildSessionTopic } from "../src/sessionTopic";

describe("buildSessionTopic", () => {
  it("uses the explicit topic when one was typed", () => {
    expect(buildSessionTopic("Betriebssysteme", "Chapter 4 exercises")).toBe("Chapter 4 exercises");
  });

  it("trims the explicit topic", () => {
    expect(buildSessionTopic("Betriebssysteme", "  Chapter 4  ")).toBe("Chapter 4");
  });

  it("falls back to the course name when the explicit topic is empty or whitespace-only", () => {
    expect(buildSessionTopic("Betriebssysteme", "")).toBe("Betriebssysteme");
    expect(buildSessionTopic("Betriebssysteme", "   ")).toBe("Betriebssysteme");
    expect(buildSessionTopic("Betriebssysteme", undefined)).toBe("Betriebssysteme");
  });

  it("stays undefined - not an empty string - when neither an explicit topic nor a course name exist", () => {
    expect(buildSessionTopic(undefined, undefined)).toBeUndefined();
    expect(buildSessionTopic(undefined, "")).toBeUndefined();
  });

  it("prefers the explicit topic even when a course name is also present", () => {
    expect(buildSessionTopic("Betriebssysteme", "Exam prep")).toBe("Exam prep");
  });
});
