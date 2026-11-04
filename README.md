# Natura Wellness frontend test

Natura Wellness is a fictional brand made up for this test. The full brief is in `INSTRUCTIONS.md`.

**Live:** https://naturawellness.vercel.app/ ([Part A](https://naturawellness.vercel.app/?part=a&fixture=active),
[Part B](https://naturawellness.vercel.app/?part=b)).

```
npm install
npm run dev
```

- **Part A:** `src/part-a/SubscriptionCard.tsx`. Open `/?part=a&fixture=active`. The mock API is in `src/api/`; switch cases with `?fixture=active|paused|cancelled|error` and force the "changed elsewhere" error with `&conflict=always`. Other products are in `catalog` in `src/api/fixtures.ts`.
- **Part B:** `src/part-b/BuyBox.tsx`. Open `/?part=b`. Match `public/reference/buy-box.png`, which is a 2x screenshot of a 1200px-wide browser window. Copy is in `src/part-b/copy.ts`; Fraunces and Inter are loaded in `index.html`.

You can add any libraries you like.

## For reviewers

### AI conversations

The coding agent transcripts are in [`docs/`](docs/). They are complete and unedited, and numbered in the order the
sessions happened. Each session usually starts with `/clear`, so each file covers one stretch of work.

- `.txt` files are exported from Claude Code (the terminal view, so tool output is collapsed).
- `.md` files are exported from OpenAI Codex. A Claude Code session reviewed and committed Codex's work each time
  (sessions 18 and 20).

| #   | Agent       | Work                                                                      |
| --- | ----------- | ------------------------------------------------------------------------- |
| 01  | Claude Code | Kickoff: read the brief, stack decisions, tooling and `npm run check`     |
| 02  | Claude Code | Part A spec review and product decisions, e2e date pinning                |
| 03  | Claude Code | 001 subscription overview: T1                                             |
| 04  | Claude Code | 001: T2                                                                   |
| 05  | Claude Code | 001: T3–T7                                                                |
| 06  | Claude Code | 002 skip shipment: edge cases, plan and tasks                             |
| 07  | Claude Code | 002: T1–T11                                                               |
| 08  | Claude Code | 003 plan changes: product decisions, plan and tasks                       |
| 09  | Claude Code | 003: T1                                                                   |
| 10  | Claude Code | 003: T2–T10                                                               |
| 11  | Claude Code | 004 cancel and retention: spec review, T1                                 |
| 12  | Claude Code | 004: T2–T4                                                                |
| 13  | Claude Code | 004: T5–T10, 002 marked Implemented                                       |
| 14  | Claude Code | 005 buy box (Part B): spec, plan and tasks, Vercel config                 |
| 15  | Claude Code | 005: T1–T4                                                                |
| 16  | Claude Code | 005: T5 (the design's CSS and the pixel diff)                             |
| 17  | Codex       | 005: T6                                                                   |
| 18  | Claude Code | Review and commit of Codex's T6                                           |
| 19  | Codex       | 005: T7–T9, T11–T12                                                       |
| 20  | Claude Code | Review and commit of Codex's T11–T12, 005 T10 final acceptance review     |
| 21  | Claude Code | Review against the brief, 005 T13–T14 (centring above 1200px, nav scroll) |
| 22  | Claude Code | Review against the brief, 001's stale R7 limitation                       |

### How the work was organised

The work follows a small spec-driven process, described in [`SPECS/README.md`](SPECS/README.md). Each feature has a
folder in [`SPECS/`](SPECS/) with a `spec.md` (what and why, numbered requirements), a `plan.md` (how) and a
`task.md` (the checklist). The human approved each spec and plan before any code was written.

- [`SPECS/CHANGELOG.md`](SPECS/CHANGELOG.md) is the agents' work log, newest first: what changed, the decisions and
  why, and what was run to verify it.
- [`AGENTS.md`](AGENTS.md) and [`CLAUDE.md`](CLAUDE.md) are the rules the agents worked under.
- Part A is specs 001–004. Part B is spec 005.

| Spec                                                              | Feature                                         |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| [001-a-subscription-overview](SPECS/001-a-subscription-overview/) | What's next, and the paused and cancelled views |
| [002-a-skip-shipment](SPECS/002-a-skip-shipment/)                 | Skip with confirmation, slow API and conflicts  |
| [003-a-plan-changes](SPECS/003-a-plan-changes/)                   | Quantity and frequency changes                  |
| [004-a-cancel-retention](SPECS/004-a-cancel-retention/)           | Cancel flow with an offer per reason, and Undo  |
| [005-b-buy-box](SPECS/005-b-buy-box/)                             | The pixel-matched buy box                       |

Things that are simulated or not covered are listed under _Known limitations_ in each spec.

## Testing

```
npm run check   # typecheck, lint, format check, unit tests (Vitest), e2e tests (Playwright + axe)
```

### Dates and time zones in e2e tests

The mock fixtures build their dates relative to "now". For example, the active subscription's next charge is
"now + 6 days". The page then shows those dates in the browser's time zone. Without pinning, the text an e2e test
sees would change with the day it runs and the machine's time zone. A timestamp near midnight can even land on a
different calendar day.

So e2e tests pin both, in `playwright.config.ts`:

- `timezoneId: "America/New_York"`
- `startTime: "2026-12-10T12:00:00-05:00"`. This is noon, so there are no midnight edges. The next order is Dec 16,
  and a skip moves it to Jan 15, 2027, which exercises the "show the year" rule.

`e2e/test.ts` applies the start time with `page.clock.setSystemTime()`. The clock starts at that moment and keeps
running, and timers stay real, so the mock's 400–2500ms latency is still exercised. The date is deliberately not
fully frozen (`setFixedTime`). The mock detects a conflict by comparing `updatedAt` timestamps, and with a frozen
`Date.now()` the second attempt under `conflict=always` would match and wrongly succeed.

E2e tests must import `test` and `expect` from `./test`, not `@playwright/test`. ESLint enforces this. That
fixture's `page.goto()` and `page.reload()` also wait for the web fonts, because a late font swap rewraps the text
and can move a control between Playwright's stability check and its tap.

Unit tests don't use the browser clock. Date formatting is tested with an injected `now`.
