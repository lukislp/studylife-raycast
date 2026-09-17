// no-view command: a quick action for Raycast's root search. Starts the shared focus timer
// immediately, keeping whatever course/mode was already set, without opening any view.
import { Toast, showToast } from "@raycast/api";
import { getClient } from "./client";
import { transition } from "./timer";

export default async function StartFocusTimer(): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Starting focus timer..." });
  try {
    const client = await getClient();
    const current = await client.getTimerState();
    const next = transition(current, "start", { now: Date.now() });
    await client.saveTimerState(next);
    toast.style = Toast.Style.Success;
    toast.title = "Focus timer started";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not start the timer";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
