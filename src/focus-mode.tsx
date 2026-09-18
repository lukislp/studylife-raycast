// View command: pick the focus preset the next session should start with - the nine built-in
// modes only (see timer.ts's modeChoices doc comment for why custom modes aren't offerable).
// Remembered in LocalStorage as the default for the *next* start (see timerModeStorage.ts,
// mirroring studylife-vscode's context.globalState pattern), and - when the timer is currently
// stopped - written through to TimerState.Save immediately, so every other device sees the new
// preset right away rather than only at the next start (mirrors studylife-vscode's pickTimerMode).
// Reachable both from Raycast's root search on its own and as an action from Timer Status (see
// timer-status.tsx), which only offers it while stopped - the same canChangeMode guard this view
// enforces on its own as a second line of defence.
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { NotConnectedError, getClient } from "./client";
import { canChangeMode, modeChoices } from "./timer";
import { readTimerModePreference, writeTimerModePreference } from "./timerModeStorage";

export default function FocusMode() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    try {
      const client = await getClient();
      const [timer, remembered] = await Promise.all([client.getTimerState(), readTimerModePreference()]);
      return { connected: true as const, timer, remembered };
    } catch (err) {
      if (err instanceof NotConnectedError) {
        return { connected: false as const, timer: undefined, remembered: undefined };
      }
      throw err;
    }
  }, []);

  async function pick(modeId: number): Promise<void> {
    await writeTimerModePreference(modeId);
    const current = data?.timer;
    if (!current || !canChangeMode(current)) {
      await showToast({ style: Toast.Style.Success, title: "Focus mode set for the next session" });
      await revalidate();
      return;
    }
    try {
      const client = await getClient();
      await client.saveTimerState({ ...current, timerModeId: modeId });
      await showToast({ style: Toast.Style.Success, title: "Focus mode set" });
      await revalidate();
    } catch (err) {
      // The preference is stored locally either way - a failed write-through is not worth losing
      // the pick over, the next start carries it anyway (same reasoning as vscode's pickTimerMode).
      await showToast({
        style: Toast.Style.Failure,
        title: "Saved locally, but could not update the running instance",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Could not reach StudyLife" description={error.message} />
      </List>
    );
  }

  if (!isLoading && data && !data.connected) {
    return (
      <List>
        <List.EmptyView icon={Icon.Link} title="Not connected" description='Run "Connect to StudyLife" first.' />
      </List>
    );
  }

  if (!isLoading && data && data.timer && !canChangeMode(data.timer)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Stop the timer before changing the mode"
          description="The running countdown is measured against the current preset's length."
        />
      </List>
    );
  }

  const choices = modeChoices(data?.timer).map((choice) => ({
    ...choice,
    // The remembered local pick matters as much as the server's current mode: on a device that
    // has not started a session since this was chosen, the server's timerModeId is whatever was
    // last active, not necessarily what was picked here.
    current: choice.current || choice.id === data?.remembered,
  }));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Focus mode for the next session...">
      {choices.map((choice) => (
        <List.Item
          key={choice.id}
          icon={choice.current ? Icon.CheckCircle : Icon.Circle}
          title={choice.name}
          subtitle={choice.detail}
          actions={
            <ActionPanel>
              <Action title="Set as Focus Mode" icon={Icon.Checkmark} onAction={() => pick(choice.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
