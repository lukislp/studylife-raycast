// View command: read-only list of open course goals with their countdowns, from
// CourseGoals.GetAll. No write actions - this command only ever reads.
import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { NotConnectedError, getClient } from "./client";
import { openGoals } from "./courseGoals";

export default function CourseGoals() {
  const { data, isLoading, error } = usePromise(async () => {
    try {
      const client = await getClient();
      const goals = await client.getCourseGoals();
      return { connected: true as const, goals: openGoals(goals, Date.now()) };
    } catch (err) {
      if (err instanceof NotConnectedError) return { connected: false as const, goals: [] };
      throw err;
    }
  }, []);

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

  const goals = data?.goals ?? [];

  return (
    <List isLoading={isLoading}>
      {goals.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Checkmark} title="No open course goals" />
      ) : (
        goals.map((goal) => (
          <List.Item
            key={goal.courseId}
            icon={goal.overdue ? Icon.ExclamationMark : Icon.Calendar}
            title={goal.name}
            subtitle={goal.due}
          />
        ))
      )}
    </List>
  );
}
