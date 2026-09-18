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

  it("requests session history with the days and onlyCompleted query params", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => [] });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await api.getSessionHistory(2);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://studylife.example.com/api/sessions/history?days=2&onlyCompleted=true",
      expect.anything(),
    );
  });

  it("POSTs a new session with the exact body given, unmodified", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await api.createSession({
      courseId: 7,
      startTime: "2026-09-16T08:00:00",
      endTime: "2026-09-16T09:00:00",
      timerModeId: 2,
      isCompleted: true,
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://studylife.example.com/api/sessions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      courseId: 7,
      startTime: "2026-09-16T08:00:00",
      endTime: "2026-09-16T09:00:00",
      timerModeId: 2,
      isCompleted: true,
    });
  });

  it("POSTs a new note to /api/notes", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await api.createNote({ title: "Title", content: "Content", isMarkdown: false, courseId: 3 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://studylife.example.com/api/notes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      title: "Title",
      content: "Content",
      isMarkdown: false,
      courseId: 3,
    });
  });

  it("GETs the webhook registrations from /api/webhooks", async () => {
    const registrations = [{ id: "1", target_url: "https://example.com/hook", events: ["timer.started"], created_at: "2026-09-18T00:00:00Z" }];
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => registrations });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await expect(api.getWebhooks()).resolves.toEqual(registrations);
    expect(fetchImpl).toHaveBeenCalledWith("https://studylife.example.com/api/webhooks", expect.anything());
  });

  it("POSTs a new webhook with a camelCase body, per this project's usual request convention", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: "1" }) });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await api.createWebhook({ targetUrl: "https://example.com/hook", events: ["session.completed"] });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://studylife.example.com/api/webhooks");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      targetUrl: "https://example.com/hook",
      events: ["session.completed"],
    });
  });

  it("DELETEs a webhook by id, URL-encoded", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 204 });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await api.deleteWebhook("abc/def");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://studylife.example.com/api/webhooks/abc%2Fdef",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("surfaces the server's `{ error: ... }` body verbatim on a non-2xx response", async () => {
    const fetchImpl = fakeFetch({
      ok: false,
      status: 400,
      json: async () => ({ error: "TargetUrl must be a public http(s) URL." }),
    });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await expect(api.createWebhook({ targetUrl: "http://localhost/hook", events: [] })).rejects.toThrow(
      /TargetUrl must be a public http\(s\) URL\./,
    );
  });

  it("does not fail with a parsing error when a non-2xx response has no readable body", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 500 });
    const api = new StudyLifeApi("https://studylife.example.com", "k", fetchImpl);
    await expect(api.getWebhooks()).rejects.toThrow(/failed \(500\)/);
  });
});
