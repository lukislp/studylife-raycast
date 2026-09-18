# StudyLife for Raycast

[![CI](https://github.com/lukislp/studylife-raycast/actions/workflows/ci.yml/badge.svg)](https://github.com/lukislp/studylife-raycast/actions/workflows/ci.yml) [![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/lukislp/studylife-raycast/badge)](https://scorecard.dev/viewer/?uri=github.com/lukislp/studylife-raycast) [![CodeQL](https://github.com/lukislp/studylife-raycast/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/lukislp/studylife-raycast/security/code-scanning)
[![Release](https://img.shields.io/github/v/release/lukislp/studylife-raycast)](https://github.com/lukislp/studylife-raycast/releases)
[![License: AGPL-3.0](https://img.shields.io/github/license/lukislp/studylife-raycast)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)

Control your [StudyLife](https://github.com/lukislp/studylife) focus timer from Raycast and the
macOS menu bar - the launcher-native sibling of
[studylife-vscode](https://github.com/lukislp/studylife-vscode).

## What it does

- **Start Focus Timer** - picks a course (open goals first, the full catalogue one click away) and
  starts the shared timer for it, or keeps the current course with "Start now". v1 was an instant
  no-view action; the picker needed somewhere to render, so this command is a view now. Each course
  also offers a "... with Topic..." action for the optional topic field (see below).
- **Timer Status** - a list view: current phase and countdown, a "Start Focus Timer" action that
  opens the same course picker, a "Choose Focus Mode" action (only while stopped), Pause/Stop, and
  today's and this week's hours, streak and the next goal countdown.
- **StudyLife Menu Bar** - a menu-bar item mirroring studylife-vscode's status bar: the live
  countdown while a phase is running, today's hours while idle; the dropdown surfaces everything
  at a glance - today's and this week's hours, streak and the next course goal's countdown - and
  is deliberately not trimmed for length.
- **Focus Mode** - picks the built-in focus preset (Pomodoro Classic, Flow State, ...) the next
  session should start with. Remembered locally as the default for the next start, and - while the
  timer is stopped - written through to the server immediately, so every other device sees the new
  preset right away. Only offered while the timer is stopped, same as studylife-vscode's
  `pickTimerMode`.
- **Add Note** - a form for quick note capture: an optional title, the note content, and the same
  two-tier course picker as starting a session (but with no "only while stopped" rule - notes
  aren't time-attributed).
- **Course Goals** - a read-only list of open course goals with their countdowns.
- **List Webhooks** / **Add Webhook** - manage this installation's webhook subscriptions: a list
  with target URL, event summary and created date (with a confirm-before-delete action per row),
  and a form to register a new one against the event-type catalogue.
- **Connect / Disconnect** - browser login and local sign-out.

The timer is shared across every device: a session started here shows up in the web app, the tray
app, studylife-vscode and Home Assistant alike, and vice versa.

### Focus mode

The timer's preset (25/5 Pomodoro, 52/17 Flow State, and seven others - see `timer.ts`'s
`BUILT_IN_MODES`) is picked from **Focus Mode**, reachable from Raycast's root search or from
Timer Status' "Choose Focus Mode" action. Only the nine built-ins are offered: modes with an id of
100 or above are custom presets stored in the user's StudyLife settings, which this extension has
no scope to read, so it can neither name nor time them - exactly the same limitation
studylife-vscode's `pickTimerMode` documents. A mode can only be changed while the timer is
stopped, since the running countdown is measured against the current preset's length.

### Session topic

Starting a session for a course offers a second action, "... with Topic..." (`Start with Topic...`
in the course picker, `Select Course with Topic...` in the full catalogue), which opens a small
form for an optional short description of what the session is for. It is sent as `Sessions.Create`'s
`Topic` field when the run is booked on stop. This was already being populated with the course
name whenever one was picked (see `sessionTopic.ts`) - an explicit topic now takes priority over
that, and omitting it keeps exactly the previous course-name fallback, unchanged. The default
"Start"/"Start for This Course" actions stay a single keystroke, with no extra screen, exactly as
before.

### The course picker

Starting a session offers **which course** it is for: the courses you have an open, dated goal
for (`Metrics.GetSummary`'s `upcomingCourseGoals`, the same small, already-sorted subset
studylife-vscode's picker uses - not a separate `CourseGoals.GetAll` call), plus a "Browse all
courses..." escape hatch to the full ~60-course catalogue (`Courses.GetAll`) for a course tracked
without a deadline. The same two-tier source backs Add Note's course field.

The picker is offered only while the timer is **stopped**. Changing the course of a session
already under way would silently re-attribute time already spent, and that history feeds
StudyLife's grade and ECTS correlations - the same rule studylife-vscode documents and enforces.
Add Note carries no such rule: a note is not time-attributed, so its course field is free to
change at any time.

### The timer books its own time

StudyLife's timer does not record anything by itself - the web app attaches it to a session the
planner already created, and the timer state carries neither a course nor a start time. So when
you start a session here (via the course picker) and nothing was planned for that slot, the
extension remembers what it started and writes the session when you stop, for the course you
picked - regardless of which command's Stop you use. If a planned session *was* attached, nothing
is written: StudyLife is already accounting for that time, and a second row would double-count it.
Runs under ten seconds are dropped as mis-clicks. Both cases stay silent by design - no toast, no
error - since this is expected behaviour, not a failure to report.

Every `DateTime` StudyLife's API sends or expects is naive **Europe/Berlin** local time - no
offset, never UTC - regardless of what timezone the machine running Raycast is in. `berlinTime.ts`
is the one place that conversion happens, in both directions, and everything that touches a
session's start/end time or "today" goes through it.

## Requirements

- A self-hosted StudyLife instance you can reach from this Mac
- Raycast
- The client registered once on your instance (see below)

## Setup

### 1. Register the client on your instance

This extension authenticates as a dynamically registered OAuth client, so it has to be registered
once per instance through [studylife-developers](https://github.com/lukislp/studylife-developers):

| Field | Value |
| --- | --- |
| Client ID | `studylife-raycast` |
| Redirect URIs | `http://127.0.0.1:8795/callback`, `http://127.0.0.1:8796/callback`, `http://127.0.0.1:8797/callback`, `http://127.0.0.1:8798/callback` |
| Scopes | `TimerState.Get`, `TimerState.Save`, `CourseGoals.GetAll`, `Courses.GetAll`, `Metrics.GetSummary`, `Sessions.Create`, `Sessions.GetHistory`, `Notes.Create`, `WebhooksProxy.List`, `WebhooksProxy.Create`, `WebhooksProxy.Delete` |

New in v2: `Sessions.Create` (books a finished run as a session, see below), `Sessions.GetHistory`
(sums today's hours, since `MetricsHoursDto` only ever carries week/month/total) and
`Notes.Create` (the Add Note command). `CourseGoals.GetAll` stays - it is used only by the
Course Goals command's own uncapped, uncompleted-goals-included view; the course picker sources
from `Metrics.GetSummary`'s `upcomingCourseGoals` instead (see above), so the two calls serve
genuinely different purposes rather than duplicating one another.

New in v3: `WebhooksProxy.List`, `WebhooksProxy.Create` and `WebhooksProxy.Delete` (List Webhooks
and Add Webhook, proxied through `/api/webhooks` to the `studylife-webhooks` microservice). The
focus-mode picker and the session topic field use scopes this extension already had
(`TimerState.Get`/`Save`, `Sessions.Create`) - no new scope needed for either.

All four redirect URIs are needed because the login flow validates `redirect_uri` by **exact**
match, and the extension binds whichever of those four loopback ports is free. They deliberately
differ from studylife-vscode's 8775-8778 and studylife-cli's 8765-8768 so several clients can be
logged in at the same time.

### 2. Set the instance URL

Open this extension's preferences in Raycast and fill in your instance's base URL, e.g.
`https://studylife.example.com`.

### 3. Connect

Run **Connect to StudyLife**. You are sent to your browser to approve the connection; the approval
comes back through a one-time assertion which is redeemed for this installation's own API key.

The key is stored in **Raycast's local storage**, never in preferences - preferences sync would
otherwise carry it to every Mac you use Raycast on.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| Connect to StudyLife | no-view | Browser login, stores this installation's key |
| Disconnect from StudyLife | no-view | Forgets the local key (revoke it on the server separately) |
| Timer Status | view | Phase, countdown, Start/Pause/Stop, today's and this week's hours, streak |
| StudyLife Menu Bar | menu-bar | Countdown (or today's hours when idle) in the menu bar |
| Start Focus Timer | view | Picks a course (open goals, or the full catalogue) and starts the timer |
| Focus Mode | view | Picks the built-in focus preset the next session should start with |
| Add Note | view | Quick note capture, with the same two-tier course picker |
| Course Goals | view | Read-only list of open course goals with their countdowns |
| List Webhooks | view | Registered webhook subscriptions, with a delete action per row |
| Add Webhook | view | Registers a new webhook subscription for a target URL and event types |

## Preferences

| Preference | Required | Meaning |
| --- | --- | --- |
| Instance URL | yes | Base URL of your StudyLife instance. The API key itself is never stored here. |

## Privacy

The extension talks to your instance and nowhere else. No telemetry, no third-party services. What
leaves your Mac is: the poll for timer state, metrics and session history; timer transitions you
trigger; the session this extension books when you stop a run it started; the course-goals list
when you open that command; the note you explicitly submit from Add Note; the focus-mode pick you
choose (and, once picked, the request that writes it through to the running timer); and the
webhook registration you explicitly add or delete from List Webhooks/Add Webhook. This extension
never talks to a webhook's target URL directly - that delivery is StudyLife's `studylife-webhooks`
microservice's job, entirely server-side.

## Development

```bash
npm install
npm run typecheck
npm test
npx ray build      # validates the extension is Store-ready; needs no Raycast login
npx ray develop     # loads it into a local Raycast for manual testing
```

The modules without Raycast dependencies (`oauth.ts`, `timer.ts`, `format.ts`, `courseGoals.ts`,
`display.ts`, `api.ts`, `runLog.ts`, `berlinTime.ts`, `sessionHistory.ts`, `coursePicker.ts`,
`sessionTopic.ts`, `webhooks.ts`) hold the rules that are easy to get subtly wrong, and those are
what the tests cover - PKCE shape, constant-time state comparison, callback parsing, the timer
transitions and focus-mode choices, the Europe/Berlin-anchored goal countdowns and wall-clock
conversion (both directions, including a near-midnight UTC/CEST edge case), the run-becomes-a-
session decision, the session-topic fallback rule, today's-hours summation, the two-tier
course-list filtering, the webhook event catalogue and registration-list rendering, and everything
the timer card and menu bar display.

`runLog.ts` and `timerActions.ts` are worth reading before changing anything about session
booking: the decision of whether stopping a run should write a session is intentionally isolated
from the Raycast-facing commands, so `timer-status.tsx`, `timer-status-menubar.tsx` and
`start-focus-timer.tsx`'s course picker can never disagree on it.

`timer.ts` is worth reading before changing anything about the timer: the wire shape has no
"paused" flag, and the server accepts unknown JSON properties silently - so a wrong field name
produces a green build and a control that does nothing.

### Why no `OAuth.PKCEClient`

Raycast ships a convenience `OAuth.PKCEClient` wrapper, but it expects a standard `?code=...`
redirect. StudyLife's flow returns `?assertion=...&state=...` - a real shape mismatch, not just a
naming difference - so this extension ports studylife-vscode's raw loopback-HTTP-server approach
directly (`auth.ts`) instead, storing the resulting key with `LocalStorage`.

### Why this repo is not on the Raycast Store

This repository, like every `studylife-*` repo, is licensed AGPL-3.0-or-later. The official
Raycast Store requires MIT-licensed extension source, so this extension is not (and is not
intended to be) submitted there - `ray publish` is intentionally never run in CI (see `ci.yml`).
Install it locally instead: `npx ray develop` from a checkout, or Raycast's "Import Extension".

## Licence

AGPL-3.0-or-later - see [LICENSE](LICENSE).
