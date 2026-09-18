// The course picker shown when starting a focus session: open-goal courses first (from
// Metrics.GetSummary), a "Browse all courses..." escape hatch to the full catalogue, and a
// "Start now" quick option that keeps whatever course is already set. Used both as
// start-focus-timer's own view and pushed from timer-status's "Start Focus Timer" action, so the
// two entry points can never drift on what the picker offers.
//
// Only ever rendered while the timer is stopped - changing the course of a session already under
// way would silently re-attribute time already spent, and that history feeds StudyLife's grade
// and ECTS correlations. Callers should not even offer the action while running; this component
// also refuses on its own, as a second line of defence for whichever entry point it is reached
// from.
import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { NotConnectedError, getClient } from "../client";
import { formatDue } from "../courseGoals";
import { goalCourses } from "../coursePicker";
import { phaseOf } from "../timer";
import { runTimerAction } from "../timerActions";
import CourseCatalogList from "./CourseCatalogList";
import StartSessionForm from "./StartSessionForm";

export default function CoursePickerList() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    try {
      const client = await getClient();
      const [timer, metrics] = await Promise.all([client.getTimerState(), client.getMetricsSummary()]);
      return { connected: true as const, timer, metrics };
    } catch (err) {
      if (err instanceof NotConnectedError) {
        return { connected: false as const, timer: undefined, metrics: undefined };
      }
      throw err;
    }
  }, []);

  async function start(courseId?: number, courseName?: string, topic?: string) {
    try {
      const client = await getClient();
      await runTimerAction(client, "start", {
        ...(courseId === undefined ? {} : { courseId }),
        ...(courseName === undefined ? {} : { courseName }),
        ...(topic === undefined ? {} : { topic }),
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Focus timer started",
        ...(courseName === undefined ? {} : { message: courseName }),
      });
      await popToRoot({ clearSearchBar: true });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not start the timer",
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

  const running = data?.timer !== undefined && phaseOf(data.timer) !== "stopped";
  if (!isLoading && running) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Play}
          title="Focus timer is already running"
          description="Changing the course mid-session would re-attribute time already spent - stop it first."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const goals = goalCourses(data?.metrics);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick a course to start a focus session for...">
      <List.Item
        icon={Icon.Play}
        title="Start now"
        subtitle="Keep the current course"
        actions={
          <ActionPanel>
            <Action title="Start" icon={Icon.Play} onAction={() => start()} />
          </ActionPanel>
        }
      />
      {goals.length > 0 && (
        <List.Section title="Open Goals">
          {goals.map((g) => (
            <List.Item
              key={g.courseId}
              icon={Icon.Calendar}
              title={g.courseName}
              subtitle={formatDue(g.daysLeft)}
              actions={
                <ActionPanel>
                  <Action
                    title="Start for This Course"
                    icon={Icon.Play}
                    onAction={() => start(g.courseId, g.courseName)}
                  />
                  <Action.Push
                    title="Start with Topic..."
                    icon={Icon.Pencil}
                    target={
                      <StartSessionForm
                        courseName={g.courseName}
                        onSubmit={(topic) => start(g.courseId, g.courseName, topic)}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Item
        icon={Icon.List}
        title="Browse all courses..."
        actions={
          <ActionPanel>
            <Action.Push
              title="Browse All Courses"
              icon={Icon.List}
              target={<CourseCatalogList onPick={(id, name) => start(id, name)} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
