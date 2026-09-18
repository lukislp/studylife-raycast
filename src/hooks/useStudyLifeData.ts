// Shared polling for timer-status.tsx and timer-status-menubar.tsx: fetches the timer state, the
// metrics summary and enough session history to sum today's hours together, and re-fetches on an
// interval while the view/dropdown is open. Kept as a hook (rather than duplicated in both
// commands) so the two views can never drift on what "connected" or "poll interval" means.
import { useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { NotConnectedError, getClient } from "../client";
import type { MetricsSummary, TimerState } from "../api";
import { todayHours } from "../sessionHistory";

const POLL_MS = 15_000;

export interface StudyLifeData {
  connected: boolean;
  timer?: TimerState;
  metrics?: MetricsSummary;
  /** Summed from Sessions.GetHistory - undefined only on a failed fetch, so a hiccup there does
   *  not blank the rest of the view (mirrors studylife-vscode's todayHours handling). */
  todayHours?: number;
}

export function useStudyLifeData() {
  const { data, isLoading, error, revalidate } = usePromise(async (): Promise<StudyLifeData> => {
    try {
      const client = await getClient();
      const [timer, metrics, history] = await Promise.all([
        client.getTimerState(),
        client.getMetricsSummary(),
        client.getSessionHistory(2).catch(() => undefined),
      ]);
      return {
        connected: true,
        timer,
        metrics,
        ...(history === undefined ? {} : { todayHours: todayHours(history, Date.now()) }),
      };
    } catch (err) {
      if (err instanceof NotConnectedError) return { connected: false };
      throw err;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => revalidate(), POLL_MS);
    return () => clearInterval(id);
    // revalidate is stable across renders for a given usePromise call; POLL_MS is a constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, error, revalidate };
}
