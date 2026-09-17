// no-view command: runs the loopback OAuth flow and stores the resulting API key.
import { Toast, showToast } from "@raycast/api";
import { runLogin, storeApiKey } from "./auth";
import { instanceUrl } from "./preferences";

export default async function Connect(): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening your browser..." });
  try {
    const url = instanceUrl();
    if (!url) {
      toast.style = Toast.Style.Failure;
      toast.title = "Set the StudyLife instance URL first";
      toast.message = "Open this extension's preferences and fill in the instance URL.";
      return;
    }
    const apiKey = await runLogin(url);
    await storeApiKey(apiKey);
    toast.style = Toast.Style.Success;
    toast.title = "Connected to StudyLife";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Connect failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
