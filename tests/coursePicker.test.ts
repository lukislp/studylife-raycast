import { describe, expect, it } from "vitest";
import type { Course, MetricsSummary } from "../src/api";
import { catalogCourses, goalCourses } from "../src/coursePicker";

describe("goalCourses", () => {
  it("returns the metrics summary's open-goal courses, filtered to a numeric courseId", () => {
    const metrics: MetricsSummary = {
      upcomingCourseGoals: [
        { courseId: 1, courseName: "Betriebssysteme", targetDate: "2026-09-20", daysLeft: 4 },
        // @ts-expect-error - a malformed entry the server should never send, guarded anyway.
        { courseId: "not-a-number", courseName: "Bad entry", targetDate: "2026-09-20", daysLeft: 4 },
      ],
    };
    expect(goalCourses(metrics)).toEqual([
      { courseId: 1, courseName: "Betriebssysteme", targetDate: "2026-09-20", daysLeft: 4 },
    ]);
  });

  it("handles an undefined metrics summary or a missing/malformed upcomingCourseGoals field", () => {
    expect(goalCourses(undefined)).toEqual([]);
    expect(goalCourses({})).toEqual([]);
    // @ts-expect-error - defensive against a shape the server should never actually send.
    expect(goalCourses({ upcomingCourseGoals: "not-an-array" })).toEqual([]);
  });

  it("does not fall back to CourseGoals.GetAll's uncapped shape - it stays whatever the metrics endpoint capped it to", () => {
    const metrics: MetricsSummary = {
      upcomingCourseGoals: Array.from({ length: 5 }, (_, i) => ({
        courseId: i + 1,
        courseName: `Course ${i + 1}`,
        targetDate: "2026-09-20",
        daysLeft: i,
      })),
    };
    expect(goalCourses(metrics)).toHaveLength(5);
  });
});

describe("catalogCourses", () => {
  it("keeps only entries with a usable id and name", () => {
    const courses: Course[] = [
      { id: 1, name: "Algorithms" },
      { id: 2, name: "Databases", semester: 3 },
      // @ts-expect-error - a malformed entry, guarded anyway.
      { id: undefined, name: "Missing id" },
    ];
    expect(catalogCourses(courses)).toEqual([
      { id: 1, name: "Algorithms" },
      { id: 2, name: "Databases", semester: 3 },
    ]);
  });

  it("handles an undefined or empty catalogue instead of throwing", () => {
    expect(catalogCourses(undefined)).toEqual([]);
    expect(catalogCourses([])).toEqual([]);
  });

  it("is the escape hatch for a course with no open goal - not filtered to any goal subset", () => {
    const courses: Course[] = [{ id: 99, name: "Elective with no deadline" }];
    expect(catalogCourses(courses)).toEqual(courses);
  });
});
