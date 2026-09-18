// Persists the TimerRun this extension started, in Raycast's LocalStorage - the same role
// studylife-vscode's context.globalState plays for its RUN_KEY. A run can outlive the command
// that started it (the timer keeps going after the Raycast window closes), so it has to survive
// here rather than in memory.
import { LocalStorage } from "@raycast/api";
import type { TimerRun } from "./runLog";

const RUN_STORAGE_KEY = "studylife.activeRun";

export async function readRun(): Promise<TimerRun | undefined> {
  const raw = await LocalStorage.getItem<string>(RUN_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as TimerRun;
  } catch {
    return undefined;
  }
}

export async function writeRun(run: TimerRun | undefined): Promise<void> {
  if (run === undefined) {
    await LocalStorage.removeItem(RUN_STORAGE_KEY);
  } else {
    await LocalStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
  }
}
