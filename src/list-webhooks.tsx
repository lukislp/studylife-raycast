// View command: lists this installation's webhook registrations (target URL, event summary,
// created date), each with a Delete action gated by a confirm Alert, plus an action to push
// straight into Add Webhook - the two commands are meant to feel like one coherent feature, not
// two disconnected commands (see add-webhook.tsx's onCreated for the way back to a fresh list).
import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import AddWebhook from "./add-webhook";
import { NotConnectedError, getClient } from "./client";
import { eventsSummary, formatCreatedAt, sortByCreatedDesc } from "./webhooks";

export default function ListWebhooks() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    try {
      const client = await getClient();
      const webhooks = await client.getWebhooks();
      return { connected: true as const, webhooks: sortByCreatedDesc(webhooks) };
    } catch (err) {
      if (err instanceof NotConnectedError) return { connected: false as const, webhooks: [] };
      throw err;
    }
  }, []);

  async function handleDelete(id: string, targetUrl: string): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Delete webhook?",
      message: `StudyLife will stop notifying ${targetUrl}.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const client = await getClient();
      await client.deleteWebhook(id);
      await showToast({ style: Toast.Style.Success, title: "Webhook deleted" });
      await revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete the webhook",
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

  const webhooks = data?.webhooks ?? [];
  const addAction = (
    <Action.Push title="Add Webhook..." icon={Icon.Plus} target={<AddWebhook onCreated={revalidate} />} />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search webhooks...">
      {webhooks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.BellDisabled}
          title="No webhooks registered"
          description="Add one to get notified when something happens in StudyLife."
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      ) : (
        webhooks.map((webhook) => (
          <List.Item
            key={webhook.id}
            icon={Icon.Bell}
            title={webhook.target_url}
            subtitle={eventsSummary(webhook.events)}
            accessories={[{ text: formatCreatedAt(webhook.created_at) }]}
            actions={
              <ActionPanel>
                {addAction}
                <Action
                  title="Delete Webhook"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(webhook.id, webhook.target_url)}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
