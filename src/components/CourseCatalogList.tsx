// The full course catalogue (~60 entries), reached one click away from CoursePickerList's
// open-goal shortlist. Its own List rather than an ActionPanel.Submenu: sixty items are better
// served by a searchable, scrollable view than a flyout menu.
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Course } from "../api";
import { getClient } from "../client";
import { catalogCourses } from "../coursePicker";

interface CourseCatalogListProps {
  onPick: (courseId: number, courseName: string) => void | Promise<void>;
}

export default function CourseCatalogList({ onPick }: CourseCatalogListProps) {
  const { pop } = useNavigation();
  const { data, isLoading, error } = usePromise(async (): Promise<Course[]> => {
    const client = await getClient();
    return catalogCourses(await client.getCourses());
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Could not load courses" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search all courses...">
      {(data ?? []).map((course) => (
        <List.Item
          key={course.id}
          icon={Icon.Book}
          title={course.name}
          {...(course.semester === undefined ? {} : { subtitle: `Semester ${course.semester}` })}
          actions={
            <ActionPanel>
              <Action
                title="Select Course"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  await onPick(course.id, course.name);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
