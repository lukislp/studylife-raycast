// Persists the remembered focus-mode preset for the *next* session start, in Raycast's
// LocalStorage - the same role studylife-vscode's context.globalState plays for its MODE_KEY.
// Kept locally rather than solely inferred from the server's current timerModeId: a stopped timer
// still carries whatever mode was last active, and writing one just to remember a preference would
// be a visible state change for every other device the moment this extension is merely opened.
import { LocalStorage } from "@raycast/api";

const MODE_STORAGE_KEY = "studylife.timerMode";

export async function readTimerModePreference(): Promise<number | undefined> {
  const value = await LocalStorage.getItem<number>(MODE_STORAGE_KEY);
  return typeof value === "number" ? value : undefined;
}

export async function writeTimerModePreference(modeId: number): Promise<void> {
  await LocalStorage.setItem(MODE_STORAGE_KEY, modeId);
}
