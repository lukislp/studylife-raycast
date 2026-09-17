import { describe, expect, it, vi } from "vitest";
import { ApiError, StudyLifeApi } from "../src/api";

function fakeFetch(response: Partial<Response> & { ok: boolean; status: number; json?: () => Promise<unknown> }) {
  return vi.fn(async () => response as Response);
}

describe("StudyLifeApi", () => {
  it("sends the API key and JSON content type on every request", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ isRunning: false }) });
    const api = new StudyLifeApi("https://studylife.example.com", "secret-key", fetchImpl);
    await api.getTimerState();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://studylife.example.com/api/timerstate",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Api-Key": "secret-key", "Content-Type": "application/json" }),
      }),
    );
  });

  it("does not double a slash between a trailing-slash base URL and the path", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => [] });
    const api = new StudyLifeApi("https://studylife.example.com/", "k", fetchImpl);
    await api.getCourses();
    expect(fetchImpl).toHaveBeenCalledWith("https://studylife.example.com/api/courses", expect.anything());
  });

  it("raises an ApiError carrying the status code on a non-2xx response", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 500 });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await expect(api.getTimerState()).rejects.toMatchObject({ status: 500 });
    await expect(api.getTimerState()).rejects.toBeInstanceOf(ApiError);
  });

  it("names the scope problem specifically on a 403, since retrying never fixes it", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 403 });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await expect(api.getMetricsSummary()).rejects.toThrow(/not granted that permission/);
  });

  it("treats 204 as no body rather than trying to parse one", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 204 });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await expect(api.saveTimerState({ isRunning: false })).resolves.toBeUndefined();
  });
});
