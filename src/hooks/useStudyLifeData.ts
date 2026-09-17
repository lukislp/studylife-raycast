// Shared polling for timer-status.tsx and timer-status-menubar.tsx: fetches the timer state and
// the metrics summary together, and re-fetches on an interval while the view/dropdown is open.
// Kept as a hook (rather than duplicated in both commands) so the two views can never drift on
// what "connected" or "poll interval" means.
import { useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { NotConnectedError, getClient } from "../client";
import type { MetricsSummary, TimerState } from "../api";

const POLL_MS = 15_000;

export interface StudyLifeData {
  connected: boolean;
  timer?: TimerState;
  metrics?: MetricsSummary;
}

export function useStudyLifeData() {
  const { data, isLoading, error, revalidate } = usePromise(async (): Promise<StudyLifeData> => {
    try {
      const client = await getClient();
      const [timer, metrics] = await Promise.all([client.getTimerState(), client.getMetricsSummary()]);
      return { connected: true, timer, metrics };
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
