# Privacy

This document describes what the StudyAtrium extension for Raycast stores and where data
goes. The extension runs only on your Mac and talks only to the StudyAtrium instance whose URL
you set in the extension preferences. The operator of that instance is the contact for privacy
questions and requests.

## What the extension stores on your machine

In Raycast's local storage:

- **Your API key** (`studylife.apiKey`), obtained by the Connect command. It is not kept in the
  preferences.
- **The run this extension started** (`studylife.activeRun`: course id and name, start time,
  planned session id), so a run can outlive the command that started it.
- **The focus mode you picked** (`studylife.timerMode`).

The only preference is the instance URL. The extension writes no log file and has no
telemetry.

## What is sent, and to whom

Only to your StudyAtrium instance, authenticated with your API key:

- polls for timer state, metrics, course goals and session history;
- timer transitions you trigger, and the session booked when you stop a run the extension
  started (course, start and end time, timer mode, topic);
- the note you submit from Add Note;
- the focus mode you pick;
- webhook registrations you add or delete from Add Webhook and List Webhooks. The extension
  never contacts a webhook target URL itself; delivery is done by StudyAtrium.

The login opens your instance in the browser and receives the result on a loopback listener
(`127.0.0.1`). The one-time assertion is exchanged once for the API key.

No third-party services are contacted.

## Retention and deletion

- Run **Disconnect from StudyAtrium** to remove the API key from Raycast's local storage. This
  is local only: it does not revoke the key on the server. Revoke the key in the StudyAtrium
  web app (connected apps and API keys).
- Removing the extension removes its local storage according to Raycast's own behaviour.
- Data already sent to StudyAtrium is held there under the instance's own retention rules and
  is deleted with your StudyAtrium account.

## Contact

Questions, access or deletion requests: contact the operator of the StudyAtrium instance you
use. Security issues: see [SECURITY.md](SECURITY.md).