// Form command: quick note capture. Title is optional, content is required, and the course
// picker offers the same two-tier source as starting a session (open goals, then the full
// catalogue) - but with no "only while stopped" restriction, since notes are not time-attributed
// the way a session is (see coursePicker.ts and CoursePickerList.tsx for the session-side rule
// this deliberately does not carry over).
import { useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Course } from "./api";
import { NotConnectedError, getClient } from "./client";
import { catalogCourses, goalCourses } from "./coursePicker";

export default function AddNote() {
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = usePromise(async () => {
    try {
      const client = await getClient();
      const [metrics, courses] = await Promise.all([client.getMetricsSummary(), client.getCourses()]);
      return { connected: true as const, goals: goalCourses(metrics), courses: catalogCourses(courses) };
    } catch (err) {
      if (err instanceof NotConnectedError) {
        return { connected: false as const, goals: [], courses: [] as Course[] };
      }
      throw err;
    }
  }, []);

  async function handleSubmit(values: Form.Values): Promise<void> {
    const title = String(values.title ?? "").trim();
    const content = String(values.content ?? "");
    const courseIdRaw = String(values.courseId ?? "");

    if (!content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Content is required" });
      return;
    }

    setSubmitting(true);
    try {
      const client = await getClient();
      const courseId = courseIdRaw ? Number(courseIdRaw) : undefined;
      await client.createNote({
        title,
        content,
        isMarkdown: false,
        ...(courseId === undefined ? {} : { courseId }),
      });
      await showToast({ style: Toast.Style.Success, title: "Note saved" });
      await popToRoot({ clearSearchBar: true });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save the note",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (data && !data.connected) {
    return (
      <Form>
        <Form.Description title="Not connected" text='Run "Connect to StudyLife" first.' />
      </Form>
    );
  }

  const goals = data?.goals ?? [];
  const goalIds = new Set(goals.map((g) => g.courseId));
  const otherCourses = (data?.courses ?? []).filter((c) => !goalIds.has(c.id));

  return (
    <Form
      isLoading={isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Optional short title" />
      <Form.TextArea id="content" title="Content" placeholder="Write your note..." />
      <Form.Dropdown id="courseId" title="Course" defaultValue="" storeValue={false}>
        <Form.Dropdown.Item value="" title="No course" icon={Icon.Minus} />
        {goals.length > 0 && (
          <Form.Dropdown.Section title="Open Goals">
            {goals.map((g) => (
              <Form.Dropdown.Item
                key={g.courseId}
                value={String(g.courseId)}
                title={g.courseName}
                icon={Icon.Calendar}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {otherCourses.length > 0 && (
          <Form.Dropdown.Section title="All Courses">
            {otherCourses.map((c) => (
              <Form.Dropdown.Item key={c.id} value={String(c.id)} title={c.name} icon={Icon.Book} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
    </Form>
  );
}
