# StudyLife for Raycast

[![CI](https://github.com/lukislp/studylife-raycast/actions/workflows/ci.yml/badge.svg)](https://github.com/lukislp/studylife-raycast/actions/workflows/ci.yml) [![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/lukislp/studylife-raycast/badge)](https://scorecard.dev/viewer/?uri=github.com/lukislp/studylife-raycast) [![CodeQL](https://github.com/lukislp/studylife-raycast/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/lukislp/studylife-raycast/security/code-scanning)
[![Release](https://img.shields.io/github/v/release/lukislp/studylife-raycast)](https://github.com/lukislp/studylife-raycast/releases)
[![License: AGPL-3.0](https://img.shields.io/github/license/lukislp/studylife-raycast)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)

Control your [StudyLife](https://github.com/lukislp/studylife) focus timer from Raycast and the
macOS menu bar - the launcher-native sibling of
[studylife-vscode](https://github.com/lukislp/studylife-vscode).

## What it does

- **Start Focus Timer** - a root-search quick action that starts the shared timer immediately,
  no view opens.
- **Timer Status** - a list view: current phase and countdown, Start/Pause/Stop actions, and this
  week's hours and streak.
- **StudyLife Menu Bar** - a menu-bar item mirroring studylife-vscode's status bar: the live
  countdown while a phase is running, this week's hours while idle; the dropdown adds
  Start/Pause/Stop, this week's hours, streak and the next course goal's countdown.
- **Course Goals** - a read-only list of open course goals with their countdowns.
- **Connect / Disconnect** - browser login and local sign-out.

The timer is shared across every device: a session started here shows up in the web app, the tray
app, studylife-vscode and Home Assistant alike, and vice versa.

### What v1 deliberately leaves out

This extension requests a narrower set of scopes than studylife-vscode (see below) - no
`Sessions.*`, so:

- There is **no "today's hours" figure** anywhere in this extension. StudyLife's metrics endpoint
  (`MetricsHoursDto`) only ever carries week/month/total, never a daily number; studylife-vscode
  sums "today" itself from `/api/sessions/history`, which needs `Sessions.GetHistory` - a scope
  this extension does not request. Wherever studylife-vscode would show "today", this extension
  shows this week's total instead, and never invents a number it cannot honestly back.
- There is **no coding-time tracking or session logging** - that whole feature (watching editor
  activity, offering to log it as a session) is specific to an editor and has no Raycast
  equivalent.
- There is **no course or mode picker on start** - Start Focus Timer keeps whatever course and
  mode is already set. Changing either takes the web app for now.

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
| Scopes | `TimerState.Get`, `TimerState.Save`, `CourseGoals.GetAll`, `Courses.GetAll`, `Metrics.GetSummary` |

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
| Timer Status | view | Phase, countdown, Start/Pause/Stop, this week's hours and streak |
| StudyLife Menu Bar | menu-bar | Countdown (or this week's hours when idle) in the menu bar |
| Start Focus Timer | no-view | Starts the shared timer immediately, keeping the current course/mode |
| Course Goals | view | Read-only list of open course goals with their countdowns |

## Preferences

| Preference | Required | Meaning |
| --- | --- | --- |
| Instance URL | yes | Base URL of your StudyLife instance. The API key itself is never stored here. |

## Privacy

The extension talks to your instance and nowhere else. No telemetry, no third-party services. What
leaves your Mac is: the poll for timer state and metrics, timer transitions you trigger, and the
course-goals list when you open that command.

## Development

```bash
npm install
npm run typecheck
npm test
npx ray build      # validates the extension is Store-ready; needs no Raycast login
npx ray develop     # loads it into a local Raycast for manual testing
```

The modules without Raycast dependencies (`oauth.ts`, `timer.ts`, `format.ts`, `courseGoals.ts`,
`display.ts`, `api.ts`) hold the rules that are easy to get subtly wrong, and those are what the
tests cover - PKCE shape, constant-time state comparison, callback parsing, the timer transitions,
the Europe/Berlin-anchored goal countdowns, and everything the timer card and menu bar display.

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
