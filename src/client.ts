// Wires the stored API key and the instanceUrl preference into one StudyLifeApi, the one place
// every command goes through to get a connected client.
import { readApiKey } from "./auth";
import { StudyLifeApi } from "./api";
import { instanceUrl } from "./preferences";

export class NotConnectedError extends Error {
  constructor() {
    super('Not connected to StudyLife yet - run "Connect to StudyLife" first.');
  }
}

export async function getClient(): Promise<StudyLifeApi> {
  const apiKey = await readApiKey();
  if (!apiKey) throw new NotConnectedError();
  return new StudyLifeApi(instanceUrl(), apiKey);
}
