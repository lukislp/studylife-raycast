// no-view command: forgets the locally stored API key. Does not revoke it server-side - same
// division of responsibility as studylife-vscode's Disconnect command.
import { Toast, showToast } from "@raycast/api";
import { clearApiKey, readApiKey } from "./auth";

export default async function Disconnect(): Promise<void> {
  const hadKey = (await readApiKey()) !== undefined;
  await clearApiKey();
  await showToast({
    style: Toast.Style.Success,
    title: hadKey ? "Disconnected from StudyLife" : "Already disconnected",
  });
}
