# 002: Plan

Spec: [spec.md](spec.md) (Approved)

## Approach

The skip flow is a layer on 001's reducer, as 001's plan reserved. `load` is not reshaped. A `skip` slice holds the
dialog's phase, and the reload after a failure gets its own `refresh/*` actions instead of reusing `load/started`.
`load/started` would swap the page for the skeleton, and the active view would unmount behind the open dialog. The
reducer owns every rule, including which element gets focus, so the rules are unit-tested without a browser.
`SkipDialog` only renders, and `SubscriptionCard` makes the API calls and moves focus.

## State shape

```ts
type Cause = "conflict" | "failed"; // R7: 409 versus anything else

type Skip =
  | { kind: "closed" }
  | { kind: "confirm"; failedSkips: number; notice: Notice | null } // waiting for the customer
  | { kind: "skipping"; failedSkips: number; attempted: string } // R5: skip request pending
  | { kind: "checking"; failedSkips: number; attempted: string; cause: Cause } // R5, R7: reload pending
  | { kind: "stale"; failedSkips: number } // R9: the reload failed
  | { kind: "rechecking"; failedSkips: number }; // R9: "Check again" pending

interface Notice {
  cause: Cause;
  movedFrom: string | null; // R7: the date the customer tried to skip, set only when the fresh date differs
}

interface State {
  requestId: number;
  load: Load;
  skip: Skip;
  /** R9: the last reload failed, so `server` may be out of date. Survives closing the dialog. */
  stale: { attempted: string; cause: Cause } | null;
  /** Text for the page's status region (R6). Cleared by `load/started`. */
  announcement: string;
  /** Where focus goes after this transition. SubscriptionCard applies it and doesn't decide it. */
  focus: "keep" | "check-again" | "skip-button" | "heading" | null;
}
```

`attempted` is the `nextChargeAt` the skip was sent with. `failedSkips` is R8's count. It starts at 0 when the
dialog opens and goes up only on `skip/failed`. `refresh/failed` doesn't change it.

## Actions and transitions

| Action                  | From                               | To                                                                                                                                                                                     |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skip/opened`           | `closed`                           | `confirm`, focus `keep` (R4). If `stale` is set: `stale`, focus `check-again` (R9).                                                                                                    |
| `skip/closed`           | `confirm`, `stale`, `rechecking`   | `closed`, focus `skip-button`. Ignored while `skipping` or `checking` (R5).                                                                                                            |
| `skip/started`          | `confirm`                          | `skipping`                                                                                                                                                                             |
| `skip/succeeded`        | `skipping`                         | `closed`. `server` is replaced, the announcement is set from the response, focus `skip-button` (R6).                                                                                   |
| `skip/failed`           | `skipping`                         | `checking`, `failedSkips + 1`, cause from the error (R7)                                                                                                                               |
| `refresh/started`       | `checking`, `stale`                | the same phase, or `rechecking` from `stale`                                                                                                                                           |
| `refresh/succeeded`     | `checking`, `rechecking`, `closed` | `server` replaced and `stale` cleared. Not skippable any more: `closed`, focus `heading` (R10). Else `confirm` with a notice, focus `keep` (R7). From `closed`, only the data changes. |
| `refresh/failed`, 404   | any                                | `load` becomes `not-found`, `closed`, focus `heading` (R10)                                                                                                                            |
| `refresh/failed`, other | `checking`, `rechecking`           | `stale`, and `stale` is set (R9). Focus `check-again`, because the confirm button it was on is gone.                                                                                   |

Every `*/succeeded` and `*/failed` with a `requestId` that isn't `state.requestId` is dropped, as in 001. Skips and
reloads share the counter.

- **Focus is one-shot:** every action the reducer accepts sets `focus` to its target, or to `null` when it has none.
  Two transitions in a row that both want "keep" would otherwise leave the value unchanged, and the focus effect
  wouldn't run the second time.
- **Announcement:** `skip/opened` clears it as well as `load/started`, so an earlier "Skipped." doesn't stay in the
  status region.
- **Reload result in `stale`:** if the customer closes the dialog during "Check again" and reopens it before the
  reload returns, the phase is `stale` and that request is still the latest. Its result is handled as from
  `rechecking`, so the fresh data isn't dropped.

- **Moved date (R7):** `movedFrom` is set when `formatDate(attempted)` differs from `formatDate(fresh nextChargeAt)`.
  This compares the calendar day the customer saw, not the ISO strings. A change in time alone would otherwise give
  "now Nov 8 (it was Nov 8)".
- **After "Check again" (R9):** the notice uses the cause and `attempted` saved in `state.stale`. This works after
  a reopen too, even though `failedSkips` reset when the dialog closed.
- **Who can skip (R1):** `canSkip(server)` in `skip.ts` returns `status === "active" && nextChargeAt !== null`. The
  skip button and R10 both use it. 004 adds the local cancel as a second argument.

## Files

| File                                     | What                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/part-a/skip.ts`                     | `canSkip`, `predictNextChargeAt` (R2), and the error → `Cause` mapping                               |
| `src/part-a/subscriptionReducer.ts`      | the `skip` and `stale` slices, `announcement`, `focus`, the new actions                              |
| `src/part-a/SkipDialog.tsx`              | the `<dialog>` and its phases. It takes `pendingIntervalDays: number \| null` for R3, null until 003 |
| `src/part-a/SubscriptionCard.tsx`        | the skip and refresh calls, opening and closing the dialog, the focus effect                         |
| `src/part-a/views.tsx`                   | `ActiveView` gains the "Skip next order" button, when `canSkip`                                      |
| `src/part-a/SubscriptionCard.module.css` | dialog, `::backdrop`, secondary button                                                               |

`predictNextChargeAt` lives in `skip.ts`, not `format.ts`. `format.ts` promises never to compute a date, and the
prediction is the one exception 001 R4 allows.

## UI decisions

- **Skip button:** "Skip next order" sits at the end of the "Next order" section, after the frequency. The section
  is about that order, and the action belongs to it.
- **Dialog:** a native `<dialog>` opened with `showModal()`, so the rest of the page is inert. Tab cycles through
  the dialog's buttons and the browser's own UI, never the page behind. That is native behavior, and WCAG 2.1.2
  allows leaving to the browser. It is labelled by its `h2`, "Skip your next order?". It is rendered in
  `SubscriptionCard` and not in `ActiveView`, so it stays mounted when R10 swaps the view behind it. On a phone it
  is `min(100% - 2rem, 28rem)` wide.
- **Content (R2, R3):** "Your Dec 16 order will be skipped. Your next order moves to Jan 15, 2027, 30 days later on
  your current schedule." Then "You won't be charged $101.87 for it." (left out without a total), and then the R3
  sentence, when it applies. Dates are `<time>` elements.
- **Buttons (R4):** "Keep my order" comes first in the DOM and looks like the primary button. "Skip Dec 16 order"
  is an outline button of the same size. Both are easy to hit, but the safe one stands out, against accidental
  skips.
- **Pending (R5):** "Keep my order" is `disabled`. Confirm reads "Skipping…" or "Checking…", with
  `aria-disabled="true"`. A ref guard in the handler stops a second skip even if two clicks arrive before a
  re-render.
- **Esc (R5, R9):** `onCancel` calls `preventDefault` while `skipping` or `checking`. `onKeyDown` also prevents
  Escape then (see Risks). In every other phase `onCancel` dispatches `skip/closed` right away. The native `close`
  event dispatches it too, as a fallback, but only if the dialog is still closed when the event arrives. The reducer
  ignores it if the dialog is already closed. One effect
  calls `showModal()` and `close()` to match `state.skip.kind`.
- **Notice (R7, R8, R9):** a `role="alert"` container stays mounted in the dialog. It is empty while a request is
  pending and filled when a result arrives. Mounting it with text already in it isn't reliably announced (001
  plan). Emptying it between attempts means a third identical 409 is announced again. "Still not working? Contact
  us" shows when `failedSkips >= 2`, with the 001 R11 `mailto:`.
- **R9 view:** the dates and the confirm button are not rendered. "Check again" takes their place and behaves like
  confirm while pending ("Checking…", `aria-disabled`, keeps focus). "Keep my order" stays enabled.
- **Focus:** one effect runs when `state.focus` changes. It focuses the matching ref: "Keep my order", "Check
  again", the skip button (passed to `ActiveView`) or the `h1`. When the dialog closes, the effect calls `close()`
  first and focuses second, so Chrome's own focus restore on close can't override R10's `h1`.
- **Announcement (R6):** reuses 001's always-mounted `role="status"` region. Its text is "Loading your subscription"
  while loading, and `state.announcement` otherwise.

## Testing

- **Unit (Vitest):**
  - `skip.ts`: `canSkip` for every status and a null date. The prediction is exact to the millisecond across the
    Nov 1, 2026 daylight-saving change and into the next year.
  - The reducer: every row of the transition table, dropped stale responses, the R8 count (skips only, reset on
    close and success), the moved date by calendar day, R10 for a status change, a missing date and a 404, and
    reopening while stale.
- **Component (Testing Library):** `vi.mock("../api/mockApi")` with deferred promises, so each test decides when and
  how a request settles. Covers R1–R10, exact API call counts (R5, R7), and `SkipDialog` alone with
  `pendingIntervalDays` for R3. jsdom has no real modal, and the setup stub only toggles `open`. Tests dispatch
  `cancel` and `keydown` events instead of relying on Esc.
- **E2e (Playwright, mobile and desktop):** `e2e/a-skip.spec.ts`, using the real mock and the pinned clock (next
  order Dec 16, after a skip Jan 15, 2027):
  - `conflict=never`: both dates and the amount in the dialog, focus on "Keep my order", Esc closes with the date
    unchanged, confirm announces "Skipped. Your next order is Jan 15, 2027." and focus returns to the skip button
  - R5: a double click shows "Skipping…" with focus kept, "Keep my order" disabled, and two Esc presses that don't
    close the dialog. The final date is Jan 15, 2027, not Feb 14, so only one skip landed.
  - `conflict=always`: the conflict message, focus on "Keep my order", and the label built from fresh data. "Contact
    us" shows after the second confirm and is gone after closing and reopening.
  - the whole flow by keyboard alone
  - with the dialog open: axe WCAG 2.2 A/AA and no horizontal scroll at 375px, 320px and 1200px

  A skip and its reload can take up to about 5s with the mock's latency, so those expectations get a 10s timeout.

## Follow-up (T8–T11, from T7)

- **T8, lost focus (R10):** the reducer can't see DOM focus. `refresh/succeeded` from `closed`, with nothing left to
  skip, sets a new focus target, `heading-if-lost`. The focus effect moves focus to the `h1` only if
  `document.activeElement` is `<body>`, which is where focus ends up when the focused skip button is removed. If the
  customer was elsewhere on the page, focus stays there. A 404 that arrives with the dialog closed uses the same
  target, because the not-found view removes the skip button too.
- **T9, short screens (R12):** `max-height` is already set. The dialog gets an explicit `overflow: auto`, and the page
  stops scrolling while it's open, through `:has()` on the root, in CSS only. Chrome's UA style already gives a
  modal dialog `overflow: auto`, so only the scroll lock was missing (the e2e test failed on it first).
- **T10, T11:** test-only. T10 needs no request inspection to prove the second skip sends the fresh `updatedAt`:
  every skip gives the mock a new one, and the mock compares it even with `conflict=never`. T11 is nondeterministic by design (about 1 in 3 skips gets a 409), so it loops up to 6
  attempts. The chance that all 6 fail is under 0.2%, and the test fails with a clear message if they do.

## Risks

- **Repeated Esc in Chrome:** dialogs use close watchers. Escape doesn't count as user activation, so on a second
  Esc press with no activation in between, `cancel` is no longer cancelable and the dialog closes anyway. Calling
  `preventDefault` on the Escape `keydown` stops the close request before it is made. The R5 e2e test presses Esc
  twice to prove it.
- **Esc then a quick Space (found in T6):** `close` is queued as a task, and Chrome runs input first. With only
  `close` dispatching `skip/closed`, a Space on the skip button right after Esc landed while the reducer still said
  `confirm`, so it was ignored (1 in 20 in a probe). `cancel` fires inside the Escape keydown, so closing from it
  keeps the reducer in step with the native dialog. The reverse then showed up (1 in 120): the `close` event queued
  by that close arrived after the Space had already reopened the dialog, and closed it. The `close` handler now
  dispatches only when the dialog is really closed.
- **jsdom dialog:** no inert page, `::backdrop` or Esc handling. Everything native is checked in e2e only.
- **Dates:** the same pinned clock and time zone as 001. Unit tests that cross the daylight-saving change build
  their timestamps with fixed UTC offsets.
- **Dependencies:** the local cancel in R1 (004) and the pending frequency in R3 and R11 (003) don't exist yet. The
  hooks are `canSkip`'s future argument and `pendingIntervalDays`. The R1 local-cancel and R11 criteria are ticked
  by 004 and 003 (spec, Known limitations).
