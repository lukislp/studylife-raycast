// Form command: registers a new webhook subscription (POST /api/webhooks) - a target URL and a
// multi-select of the event-type catalog (see webhooks.ts). Reachable directly from Raycast's
// root search on its own, and pushed from List Webhooks' "Add Webhook..." action (see
// list-webhooks.tsx) - onCreated is only set in that second case, so a successful add there pops
// back to a freshly revalidated list instead of leaving two stacked views open, while the
// standalone command falls back to popToRoot like add-note.tsx does.
import { useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { NotConnectedError, getClient } from "./client";
import { WEBHOOK_EVENT_TYPES } from "./webhooks";

interface AddWebhookProps {
  onCreated?: () => void;
}

export default function AddWebhook({ onCreated }: AddWebhookProps = {}) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: Form.Values): Promise<void> {
    const targetUrl = String(values.targetUrl ?? "").trim();
    const events = Array.isArray(values.events) ? (values.events as string[]) : [];

    if (!targetUrl) {
      await showToast({ style: Toast.Style.Failure, title: "Target URL is required" });
      return;
    }
    if (events.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Pick at least one event" });
      return;
    }

    setSubmitting(true);
    try {
      const client = await getClient();
      await client.createWebhook({ targetUrl, events });
      await showToast({ style: Toast.Style.Success, title: "Webhook added" });
      if (onCreated) {
        onCreated();
        pop();
      } else {
        await popToRoot({ clearSearchBar: true });
      }
    } catch (err) {
      if (err instanceof NotConnectedError) {
        await showToast({ style: Toast.Style.Failure, title: "Not connected", message: err.message });
        return;
      }
      // A 400 here almost always means "TargetUrl must be a public http(s) URL" - the server's
      // exact text is folded into err.message by api.ts's readErrorMessage, so it is shown
      // verbatim rather than a generic "request failed".
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not add the webhook",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Webhook" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="targetUrl"
        title="Target URL"
        placeholder="https://example.com/webhook"
        info="Must be a public http(s) URL - StudyLife rejects private/internal targets."
      />
      <Form.TagPicker id="events" title="Events">
        {WEBHOOK_EVENT_TYPES.map((eventType) => (
          <Form.TagPicker.Item key={eventType.value} value={eventType.value} title={eventType.label} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
