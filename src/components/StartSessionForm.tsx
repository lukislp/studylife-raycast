// Small Form pushed only when a topic should be attached to the session about to start - reuses
// add-note.tsx's plain single-field Form pattern. Deliberately NOT the default path: "Start" and
// "Start for This Course" stay a single keystroke exactly as before, so the topic stays what the
// task description calls it - optional, not a new step in the way of the zero-friction default.
import { useState } from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";

interface StartSessionFormProps {
  courseName: string;
  onSubmit: (topic: string | undefined) => void | Promise<void>;
}

export default function StartSessionForm({ courseName, onSubmit }: StartSessionFormProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: Form.Values): Promise<void> {
    const topic = String(values.topic ?? "").trim();
    setSubmitting(true);
    try {
      await onSubmit(topic ? topic : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Focus Timer" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Course" text={courseName} />
      <Form.TextField id="topic" title="Topic" placeholder="What are you working on? (optional)" />
    </Form>
  );
}
