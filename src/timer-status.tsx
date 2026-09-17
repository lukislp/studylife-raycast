// View command: current phase + countdown, Start/Pause/Stop actions, and this week's hours and
// streak from Metrics.GetSummary. Polls while the view is open (see useStudyLifeData).
import { useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { getClient } from "./client";
import { transition } from "./timer";
import { summaryLines, timerCard } from "./display";
import { useStudyLifeData } from "./hooks/useStudyLifeData";

export default function TimerStatus() {
  const { data, isLoading, error, revalidate } = useStudyLifeData();
  const [busy, setBusy] = useState(false);

  async function run(action: "start" | "pause" | "stop") {
    setBusy(true);
    try {
      const client = await getClient();
      const current = await client.getTimerState();
      const next = transition(current, action, { now: Date.now() });
      await client.saveTimerState(next);
      await revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not ${action} the timer`,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
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
        <List.EmptyView
          icon={Icon.Link}
          title="Not connected"
          description='Run "Connect to StudyLife" first.'
        />
      </List>
    );
  }

  const card = timerCard(data?.timer, Date.now());
  const lines = summaryLines(data?.metrics);
  const actions = (
    <ActionPanel>
      {!card.running && (
        <Action title="Start Focus Timer" icon={Icon.Play} onAction={() => run("start")} />
      )}
      {card.running && card.phase === "Focus" && (
        <Action title="Pause Focus Timer" icon={Icon.Pause} onAction={() => run("pause")} />
      )}
      {card.running && (
        <Action title="Stop Focus Timer" icon={Icon.Stop} onAction={() => run("stop")} />
      )}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading || busy}>
      <List.Item
        icon={card.running ? (card.phase === "Break" ? Icon.Mug : Icon.Play) : Icon.Pause}
        title={card.phase}
        subtitle={card.countdown ?? "Not running"}
        actions={actions}
      />
      {lines.map((line) => (
        <List.Item key={line} icon={Icon.BarChart} title={line} actions={actions} />
      ))}
    </List>
  );
}
