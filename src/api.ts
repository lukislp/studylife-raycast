// Typed client for exactly the endpoints this extension is scoped for. Every method maps to one
// entry the client requests at registration; adding a call here means adding the scope there (and
// having it be publicly grantable server-side), never the other way round. Modelled on
// studylife-vscode's api.ts.
import { trimBase } from "./oauth";
export type { TimerState } from "./timer";
import type { TimerState } from "./timer";

export interface Course {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  semester?: number;
}

/** Mirrors CourseGoalDto (StudyLife.Shared/Dtos.cs) - the raw row, not the metrics-derived
 *  "upcoming" projection. This extension computes its own open/overdue view from it, see
 *  courseGoals.ts, because CourseGoals.GetAll returns every goal, completed ones included. */
export interface CourseGoal {
  courseId: number;
  courseName: string;
  /** Naive local (Europe/Berlin) date-time, or absent for a goal with no deadline. */
  targetDate?: string | null;
  completedAt?: string | null;
  [key: string]: unknown;
}

export interface UpcomingGoal {
  courseId: number;
  courseName: string;
  targetDate: string;
  daysLeft: number;
}

export interface MetricsSummary {
  streak?: { current?: number };
  /** The API has no "today" figure - only week, month and total (MetricsHoursDto). Today's
   *  hours are summed from Sessions.GetHistory instead, see sessionHistory.ts. */
  hours?: { week?: number; month?: number; total?: number };
  upcomingCourseGoals?: UpcomingGoal[];
  [key: string]: unknown;
}

/** Mirrors the fields of StudySessionDto (StudyLife.Shared/Dtos.cs) this extension actually
 *  reads/writes. StartTime/EndTime are naive Europe/Berlin wall-clock strings, never UTC and
 *  never offset - see berlinTime.ts for both directions of that conversion. */
export interface SessionRecord {
  id?: number;
  courseId?: number;
  courseName?: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  isCompleted?: boolean;
  [key: string]: unknown;
}

/** The write shape for Sessions.Create. startTime/endTime must already be naive Europe/Berlin
 *  wall-clock strings (berlinWallClockIso), not UTC. */
export interface NewSession {
  courseId: number;
  startTime: string;
  endTime: string;
  timerModeId: number;
  topic?: string;
  isCompleted: boolean;
}

/** Mirrors the fields of NoteDto this extension writes. Id/CreatedAt/UpdatedAt/Tags/Summary/
 *  RelatedNoteIds are server-assigned and read-only from the client's point of view
 *  (NotesController never accepts them from Create/Update), so NewNote below deliberately does
 *  not carry them. */
export interface Note {
  id: number;
  title: string;
  content: string;
  courseId?: number | null;
  isMarkdown: boolean;
  [key: string]: unknown;
}

/** The write shape for Notes.Create. */
export interface NewNote {
  title: string;
  content: string;
  isMarkdown: boolean;
  courseId?: number;
}

/** One registered webhook subscription, as returned by GET /api/webhooks. Mirrors
 *  WebhookRegistrationDto (StudyLife.Shared/Dtos.cs) - unlike every other DTO this client reads,
 *  that one describes studylife-webhooks' OWN response shape verbatim (ProxyAsync copies the
 *  upstream body through byte-for-byte, never reparsed), so the field names below are that
 *  service's snake_case, not this project's usual camelCase-on-the-wire convention. Not a typo. */
export interface WebhookRegistration {
  id: string;
  target_url: string;
  events: string[];
  created_at: string;
}

/** The write shape for Webhooks.Create. Unlike WebhookRegistration above, this one IS bound
 *  normally by CreateWebhookRequestDto (not proxied verbatim), so it follows this project's usual
 *  camelCase-on-the-wire convention same as NewSession/NewNote. */
export interface NewWebhook {
  targetUrl: string;
  events: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Best-effort extraction of a server-sent `{ error: "..." }` body, e.g.
 *  WebhooksProxyController.Create's 400 for a rejected TargetUrl. Never throws: a response with
 *  no body, a non-JSON body, or a fake test double with no .json() at all all fall back to
 *  undefined rather than masking the real failure with a parsing error. */
async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body?.error === "string" ? body.error : undefined;
  } catch {
    return undefined;
  }
}

export class StudyLifeApi {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${trimBase(this.baseUrl)}${path}`, {
      ...init,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      // 403 is the one worth naming: it means the key authenticated but the endpoint is outside
      // the scopes this installation was granted, which no amount of retrying fixes.
      const hint =
        response.status === 403
          ? " - this installation was not granted that permission; reconnect and approve it"
          : "";
      const serverMessage = await readErrorMessage(response);
      throw new ApiError(
        `${init?.method ?? "GET"} ${path} failed (${response.status})${hint}${serverMessage ? `: ${serverMessage}` : ""}`,
        response.status,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  getTimerState(): Promise<TimerState> {
    return this.request<TimerState>("/api/timerstate");
  }

  /**
   * Writes the timer. The server is last-write-wins and answers 200 with the authoritative row
   * rather than 409 (see TimerStateService.SaveAsync), so the returned state - not the one we
   * sent - is what must be rendered afterwards.
   */
  saveTimerState(state: TimerState): Promise<TimerState> {
    return this.request<TimerState>("/api/timerstate", {
      method: "PUT",
      body: JSON.stringify(state),
    });
  }

  /** The full course catalogue (~60 entries) - the picker's escape hatch for a course with no
   *  open goal, see coursePicker.ts. */
  getCourses(): Promise<Course[]> {
    return this.request<Course[]>("/api/courses");
  }

  /** All course goals, completed ones included - CourseGoalsController.GetAll has no filter.
   *  Deliberately kept separate from Metrics.GetSummary's upcomingCourseGoals (see coursePicker.ts
   *  doc comment): this is the only place that needs the raw, uncapped list. */
  getCourseGoals(): Promise<CourseGoal[]> {
    return this.request<CourseGoal[]>("/api/coursegoals");
  }

  getMetricsSummary(): Promise<MetricsSummary> {
    return this.request<MetricsSummary>("/api/metrics/summary");
  }

  /**
   * Sessions completed in the last `days` days, most recent history first-or-last as the server
   * returns it - order is not relied on here. Used only to sum today's hours (sessionHistory.ts);
   * two days requested (mirrors studylife-vscode) because the window is server-side and
   * day-aligned, and a session that started yesterday but ends after midnight still needs to be
   * seen to be clipped correctly.
   */
  getSessionHistory(days: number): Promise<SessionRecord[]> {
    return this.request<SessionRecord[]>(`/api/sessions/history?days=${days}&onlyCompleted=true`);
  }

  /** Books a finished run as a session - see runLog.ts for when this extension calls it. */
  createSession(session: NewSession): Promise<SessionRecord> {
    return this.request<SessionRecord>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    });
  }

  createNote(note: NewNote): Promise<Note> {
    return this.request<Note>("/api/notes", {
      method: "POST",
      body: JSON.stringify(note),
    });
  }

  /** This installation's webhook registrations. Requires WebhooksProxy.List. */
  getWebhooks(): Promise<WebhookRegistration[]> {
    return this.request<WebhookRegistration[]>("/api/webhooks");
  }

  /** Registers a new webhook subscription. The server rejects a non-public TargetUrl with a 400
   *  carrying `{ error: "..." }` - readErrorMessage surfaces that text on the thrown ApiError.
   *  Requires WebhooksProxy.Create. */
  createWebhook(webhook: NewWebhook): Promise<WebhookRegistration> {
    return this.request<WebhookRegistration>("/api/webhooks", {
      method: "POST",
      body: JSON.stringify(webhook),
    });
  }

  /** Requires WebhooksProxy.Delete. */
  deleteWebhook(id: string): Promise<void> {
    return this.request<void>(`/api/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
