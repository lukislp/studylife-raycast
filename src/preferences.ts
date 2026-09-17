import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  instanceUrl: string;
}

export function instanceUrl(): string {
  return getPreferenceValues<Preferences>().instanceUrl;
}
