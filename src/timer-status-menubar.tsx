// menu-bar command: mirrors studylife-vscode's status bar. Shows the phase/remaining time (or
// this week's hours when idle - see display.ts for why "this week" rather than "today") in the
// menu bar title; the dropdown offers Start/Pause/Stop and this week's hours, streak and the next
// course goal's countdown.
import { Icon, MenuBarExtra, Toast, showToast } from "@raycast/api";
import { getClient } from "./client";
import { transition } from "./timer";
import { menuBarTitle, summaryLines, timerCard } from "./display";
import { useStudyLifeData } from "./hooks/useStudyLifeData";

function phaseIcon(phase: "Stopped" | "Focus" | "Break"): Icon {
  if (phase === "Focus") return Icon.Play;
  if (phase === "Break") return Icon.Mug;
  return Icon.Circle;
}

export default function TimerStatusMenuBar() {
  const { data, isLoading, revalidate } = useStudyLifeData();

  async function run(action: "start" | "pause" | "stop") {
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
    }
  }

  if (!isLoading && data && !data.connected) {
    return (
      <MenuBarExtra icon={Icon.Link} title="Not connected" tooltip="Run “Connect to StudyLife” first">
        <MenuBarExtra.Item title="Not connected to StudyLife" />
      </MenuBarExtra>
    );
  }

  const now = Date.now();
  const card = timerCard(data?.timer, now);
  const title = menuBarTitle(data?.timer, data?.metrics?.hours?.week, now);
  const lines = summaryLines(data?.metrics);

  return (
    <MenuBarExtra icon={phaseIcon(card.phase)} title={title} isLoading={isLoading} tooltip={`Focus timer: ${card.phase.toLowerCase()}`}>
      <MenuBarExtra.Section title="Focus timer">
        {!card.running && <MenuBarExtra.Item title="Start" icon={Icon.Play} onAction={() => run("start")} />}
        {card.running && card.phase === "Focus" && (
          <MenuBarExtra.Item title="Pause" icon={Icon.Pause} onAction={() => run("pause")} />
        )}
        {card.running && <MenuBarExtra.Item title="Stop" icon={Icon.Stop} onAction={() => run("stop")} />}
      </MenuBarExtra.Section>
      {lines.length > 0 && (
        <MenuBarExtra.Section title="This week">
          {lines.map((line) => (
            <MenuBarExtra.Item key={line} title={line} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
