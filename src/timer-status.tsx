// View command: current phase + countdown, Start/Pause/Stop actions, and today's and this week's
// hours, streak and the next goal from Metrics.GetSummary + Sessions.GetHistory. Polls while the
// view is open (see useStudyLifeData). Stopping books whatever run was tracked into a session -
// see timerActions.ts.
import { useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { getClient } from "./client";
import { runTimerAction } from "./timerActions";
import { summaryLines, timerCard } from "./display";
import { useStudyLifeData } from "./hooks/useStudyLifeData";
import CoursePickerList from "./components/CoursePickerList";

export default function TimerStatus() {
  const { data, isLoading, error, revalidate } = useStudyLifeData();
  const [busy, setBusy] = useState(false);

  async function run(action: "pause" | "stop") {
    setBusy(true);
    try {
      const client = await getClient();
      await runTimerAction(client, action);
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
  const lines = summaryLines(data?.metrics, data?.todayHours);
  const actions = (
    <ActionPanel>
      {!card.running && (
        <Action.Push title="Start Focus Timer" icon={Icon.Play} target={<CoursePickerList />} />
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
