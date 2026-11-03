# 004: Plan

Status: Approved

Spec: [spec.md](spec.md) (Approved)

## Approach

The cancel flow is a fourth layer on the reducer, next to `load`, `skip` and `local`. It has two parts:

- `cancel`, the dialog's step: closed, choosing a reason, or showing the offers for one reason
- `cancelled`, the local cancel (R7)

Neither part is ever merged into `server`, so the server's active data stays stored for "Undo cancellation" (R8),
and a server status that isn't active always wins (R9).

The offers are a pure function of the reason, the server data and the pending 003 changes. They live in `cancel.ts`
with their texts and are unit-tested. Taking an offer does not add new behaviour. The reducer closes the flow and
hands over to the existing `skip/opened`, `plan/frequency` or `plan/quantity` case (R5, R6), so latency, 409s, the
"(current)" marks and the announcements stay the same code paths as 002 and 003. `CancelDialog` only renders, and
`SubscriptionCard` dispatches and applies focus, as in 002 and 003.

## State shape

```ts
/** R2: in the spec's order, which is the order of their share. */
type Reason = "too-much" | "costs" | "different" | "no-results" | "other";

/** R2, R3: the dialog's step. `previous` is the reason to focus after "Back". */
type CancelFlow = { kind: "closed" } | { kind: "reason"; previous: Reason | null } | { kind: "offer"; reason: Reason };

interface State {
  // ...001–003 fields unchanged
  cancel: CancelFlow;
  /** R7, R8: the local cancel. Only turns an active server into the cancelled view (R9). */
  cancelled: boolean;
  focus: Focus | null; // Focus gains "cancel-button", "cancel-reason" and "cancel-heading"
}
```

003's plan noted 004's `cancelled` inside `Local`. It is a top-level field instead, because `plan/discarded` resets
`local` to its initial value, and a discard must never undo a cancel. That can't happen today, because Discard
isn't shown in the cancelled view, but separate fields keep the two layers independent.

## Actions and transitions

| Action                | Accepted when                                                               | Result                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `cancel/opened`       | `load` is ready, `viewOf` is active, and both dialogs are closed            | `cancel` = `reason` with `previous: null`, announcement cleared, focus `cancel-reason` (the first reason) (R1)                  |
| `cancel/reasonChosen` | `cancel` is `reason`                                                        | `cancel` = `offer` for that reason, focus `cancel-heading` (R2)                                                                 |
| `cancel/back`         | `cancel` is `offer`                                                         | `cancel` = `reason` with `previous` set to that reason, focus `cancel-reason` (the reason chosen before) (R3)                   |
| `cancel/closed`       | `cancel` isn't closed                                                       | `cancel` closed, focus `cancel-button` (R10)                                                                                    |
| `cancel/offerTaken`   | `cancel` is `offer`, and the offer is in `offersFor(reason, server, local)` | `cancel` closed, then the result of `skip/opened` (R5), or of `plan/frequency` / `plan/quantity` with focus `plan-heading` (R6) |
| `cancel/confirmed`    | `cancel` is `offer`, and `viewOf` is active                                 | `cancelled` = true, `cancel` closed, announcement (R7), focus `heading`                                                         |
| `cancel/undone`       | `cancelled`, and the server is active                                       | `cancelled` = false, announcement (R8), focus `heading`                                                                         |

Anything else is ignored and returns the same `state`.

- **One view rule (R9):** `viewOf(server, cancelled)` returns `"cancelled"` only when the server is active and
  `cancelled` is true. Otherwise it returns the server's status. `activeServer(state)`, which guards the `plan/*`
  actions, uses it, and so does `skip/opened`. A locally cancelled subscription can't be skipped or changed, even
  by a stray action. `canSkip` keeps its single argument. Its "004 adds a second argument" comment is updated.
- **The offer is checked, not trusted:** the action carries the offer, and the reducer only accepts it if
  `offersFor` returns the same one for the current state, label included. For example, a quantity offer built
  before a 003 change is rejected after it. If the case it hands over to would ignore it, the whole action is
  ignored, so the dialog never closes without doing anything.
- **Never two modals:** `skip/opened` is also ignored while `cancel` isn't closed, mirroring `cancel/opened`. The
  R5 handover closes `cancel` before it runs `skip/opened`, so it isn't affected.
- **`load/started`** closes the cancel flow, like the skip dialog, and keeps `cancelled`. Undo lasts for the
  session (R8).
- **`refresh/*`** only happen behind the skip dialog, so they never meet an open cancel flow. They keep
  `cancelled`, and R9 decides the view.
- **Undo (R8):** `local` was never touched, so the active view comes back with its pending 003 changes, and 003's
  `beforeunload` warning comes back with them.

## `cancel.ts`

```ts
export const REASONS: readonly { id: Reason; label: string }[]; // R2

type Offer =
  | { kind: "skip"; label: string }
  | { kind: "frequency"; days: number; label: string }
  | { kind: "quantity"; sku: string; quantity: number; label: string };

/** R4: the first of 30/60/90 that is slower than `days`, or null at 90 or above. */
export function slowerFrequency(days: number): number | null;

/** R3: in display order. "Current" is the server's data with pending 003 changes applied. */
export function offersFor(reason: Reason, server: Subscription, local: Local): Offer[];
```

- **Current frequency:** `pendingOf(...).intervalDays ?? server.intervalDays`. This lets the R4 criterion (a
  pending 90 hides the frequency offer) work. A server interval of 45 gets 60.
- **Current total:** `totalAfterDiscount()` with the current quantities, built from the item prices (003 T9). It
  never uses `nextChargeTotalCents`, so it works when the server sends none.
- **Saving (R3):** `totalAfterDiscount(current) - totalAfterDiscount(with that item lowered by one)`, imported
  from `src/api/fixtures.ts`, as 003 does.
- **A quantity offer** is listed for each item whose current quantity is above 1. It is left out
  when the lowered quantity isn't in `quantityOptions(item)`, for example a server quantity of 12, where 11 isn't a
  choice. `plan/quantity` would ignore it.
- **At most 2 quantity offers (R3):** after that filter, the offers are sorted by saving, largest first, with a
  stable sort so ties keep the server's order. Then the first two are kept. The reducer's offer check uses
  `offersFor`, so an offer that was dropped by the cap is rejected too.
- **The skip offers** need `canSkip(server)`. Without a next order date, there is nothing to skip. "Too much
  product" then shows only the frequency offer, and "Trying a different product" shows none.
- **Same frequency as the server:** server 60, pending 30, offer 60. Taking it goes through `plan/frequency`, which
  clears the change and announces "back to every 60 days" (003 R5). This is correct, and no special case is needed.

## Texts

With the e2e fixture (next order Dec 16, $101.87, every 30 days, Vitamin D × 1, Multivitamin × 2):

| Where                           | Text                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger (R1)                    | "Cancel subscription"                                                                                                                 |
| Step 1 title (R2)               | "Why are you cancelling?"                                                                                                             |
| Reasons (R2)                    | "I have too much product left", "It costs too much", "I'm trying a different product", "I didn't see results", "Other"                |
| Step 2 title (R3)               | "Cancel your subscription?"                                                                                                           |
| Before the offers (R3)          | "Instead, you can:" (only when there is at least one offer)                                                                           |
| Too much product (R3)           | "Skip my Dec 16 order", "Ship every 60 days"                                                                                          |
| Costs too much (R3)             | "Ship every 60 days: $101.87 every 60 days instead of every 30", "Get 1 Multivitamin, 30 tablets instead of 2: save $38.20 per order" |
| Trying a different product (R3) | "Skip my Dec 16 order while you try it"                                                                                               |
| Other (R3)                      | label "Tell us more (optional)" on a `<textarea>`                                                                                     |
| Confirm and back (R3, R7)       | "Yes, cancel my subscription", "Back"                                                                                                 |
| Leave the flow (R10)            | "Keep my subscription", at the end of both steps                                                                                      |
| Cancelled view (R7)             | "Your subscription is cancelled. You won't be charged again." and the "Undo cancellation" button                                      |
| Announce cancel (R7)            | "Your subscription is cancelled. You won't be charged again."                                                                         |
| Announce undo (R8)              | "Cancellation undone. Your subscription is active."                                                                                   |
| Offer taken (R6)                | 003's own text, for example "Frequency changed to every 60 days, starting after your Dec 16 order."                                   |

- **Invented copy:** the spec doesn't give the step 2 title, the "Instead, you can:" lead, the undo announcement or
  the textarea label. These are proposals for review.
- **Product name:** the spec's example says "Get 1 Multivitamin instead of 2". The API has no short name, so the
  label uses the full name, as 003 R2 does.
- **$38.20:** (2995 + 2 × 4495) × 0.85 = 10187.25 → 10187, and (2995 + 4495) × 0.85 = 6366.5 → 6367. The
  difference is 3820. A discounted unit price would give 4495 × 0.85 = 3820.75 → $38.21, which is why the spec
  rejects it.
- **Dates and amounts** are built at render time from the server data and `local`. They are never stored.

## Files

| File                                     | What                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/part-a/cancel.ts`                   | `Reason`, `REASONS`, `Offer`, `slowerFrequency`, `offersFor`, and the offer texts                                                 |
| `src/part-a/subscriptionReducer.ts`      | `CancelFlow`, the `cancel` and `cancelled` fields, the seven `cancel/*` actions, `viewOf(server, cancelled)`, three focus targets |
| `src/part-a/CancelDialog.tsx`            | the `<dialog>` with both steps                                                                                                    |
| `src/part-a/views.tsx`                   | the trigger at the end of `ActiveView`, and in `CancelledView` the local-cancel message and "Undo cancellation"                   |
| `src/part-a/SubscriptionCard.tsx`        | the dispatches, one layout effect for both dialogs, the new refs in the focus effect, `viewOf` with `cancelled`                   |
| `src/part-a/skip.ts`                     | the comment on `canSkip` only                                                                                                     |
| `src/part-a/SubscriptionCard.module.css` | the reason list and the step 2 button stack                                                                                       |
| `e2e/a-cancel.spec.ts`                   | the e2e flows below                                                                                                               |

## UI decisions

- **Trigger (R1):** a secondary button "Cancel subscription" at the end of `ActiveView`, after "Change your plan".
  It is always visible, the same size as "Skip next order" and not a small link.
- **Dialog:** `CancelDialog` sits next to `SkipDialog`, outside the view, as in 002. `showModal()` gives the inert
  page, Esc and `::backdrop`. It uses the same `styles.dialog` and therefore 002 R12's short-screen layout.
  `aria-labelledby` points at the current step's `<h2>`.
- **Step 1 (R2):** `<h2>Why are you cancelling?</h2>` and a `<ul>` with a full-width `<button>` (at least 44px)
  for each reason. No radios and no "Continue". Then, outside the list, a secondary "Keep my subscription" (R10).
- **Step 2 (R3):** `<h2 tabIndex={-1}>Cancel your subscription?</h2>`. Then, if there are offers, "Instead, you can:"
  and a `<ul>` of offer buttons. Then "Yes, cancel my subscription", and the secondary "Back" and "Keep my
  subscription" (R10). The offers and the
  cancel button share one class, so they have the same size and contrast. "Other" puts the optional `<label>` and
  `<textarea>` before the buttons. The textarea is component state in the step, so it is lost on "Back" or
  closing, and is never sent (Known limitations).
- **Focus:**
  - Opening focuses the first reason, because the dialog's name already reads the question.
  - Step 2 focuses its heading, because a dialog doesn't announce its name again when its content changes.
  - "Back" focuses the reason chosen before.
  - Esc, "Keep my subscription", the native `close` and every other way of closing return focus to the trigger
    (R10).
  - Confirming and undoing focus the h1. The trigger or the undo button is gone, and focusing "Undo cancellation"
    right away would invite a mis-tap.
  - A frequency or quantity offer focuses "Change your plan", where the pending line appears (R6).
  - A skip offer hands focus to the skip dialog's "Keep my order" (002 R4). When that dialog closes, focus goes to
    "Skip next order", as in 002 R6.
- **Both dialogs in one layout effect:** it closes the dialog that should be closed before it calls `showModal()` on
  the other. R5 swaps the cancel dialog for the skip dialog in one render, and a stacked modal must never be left
  open behind the other.
- **Esc:** nothing in the cancel flow is pending, so `cancel` always closes. The `close` check
  (`!event.currentTarget.open`) is copied from `SkipDialog`.
- **Cancelled view (R7, R8):** `CancelledView` gets an optional `onUndo`, which `StatusView` passes only when the
  server is active, so the cancelled fixture never offers Undo (R8). The local cancel shows the message instead of
  "Cancelled on …", because the server never sent a date. The products are the server's items.
- **Announcement:** the same `role="status"` region. `cancel/opened` clears it, like `skip/opened`.

## Testing

- **Unit (Vitest):**
  - `cancel.ts`:
    - `slowerFrequency` for 30, 45, 60, 90 and 120.
    - `offersFor` for every reason with the active fixture, which gives exactly the texts in the table, including
      $38.20.
    - A pending 90 hides the frequency offer, and a pending 60 offers 90 "instead of every 60".
    - A pending Multivitamin 1 drops its quantity offer and lowers the frequency offer's total to $63.67.
    - A server quantity of 12 has no quantity offer.
    - No next order date means no skip offer.
    - Three items above 1 give two quantity offers, largest saving first. A tie keeps the server's order.
    - A server at 90 days with every quantity at 1 gives no "costs" offer.
  - Reducer: every row of the table, including each ignored case:
    - opening while not ready, paused, locally cancelled or with the skip dialog open
    - a stale or made-up offer
    - confirming from step 1
    - undoing the cancelled fixture
  - Reducer, R9: `viewOf` with a non-active server and `cancelled` true. `plan/*` and `skip/opened` are ignored
    while locally cancelled. `local` survives cancel and undo.
- **Component (Testing Library), with the mocked API:**
  - roles and names: the trigger, the dialog "Why are you cancelling?" with five buttons, and the step 2 buttons
    for each reason
  - R10: Esc, "Keep my subscription" and the native close at both steps return focus to the trigger, and the
    subscription stays active
  - Focus on open, on step 2 and after "Back"
  - R5: a skip offer closes the cancel dialog and opens "Skip your next order?" with both dates
  - R6: "Ship every 60 days" and the quantity offer close the flow, show the pending line, announce, and focus
    "Change your plan"
  - R7: three clicks reach the cancelled view, with the message, the announcement and focus on the h1
  - R8: Undo brings back the active view with its pending lines. The cancelled fixture has no Undo
  - "Other" has the optional textarea, and the other reasons don't
- **E2e (Playwright, mobile and desktop):** `e2e/a-cancel.spec.ts` against the real mock and the pinned clock:
  - for each of the five reasons: open, choose, confirm in 3 activations, then the cancelled view and Undo
  - keyboard only: Tab to the trigger, Enter, Enter on a reason, Tab to "Yes, cancel my subscription", Enter. Then
    focus is on the h1 and the announcement is in the status region
  - "Too much product" → "Skip my Dec 16 order" → the skip dialog with Dec 16 and Jan 15, 2027 (`conflict=never`)
  - a pending 90 from "Change your plan" → "It costs too much" has no frequency button
  - "Ship every 60 days" → the dialog is gone, the badge says Active, and the pending line and announcement show
  - cancel with changes pending → Undo → the active view with the same pending lines
  - Esc and "Keep my subscription" at step 1 and at step 2: focus on "Cancel subscription", still active
  - axe WCAG 2.2 A/AA and no horizontal scroll at 375px, 320px and 1200px on step 1, step 2 ("Other", with the
    textarea, and "It costs too much", with the longest labels) and the cancelled view. A modal sits in the top
    layer with its own overflow, so the page's scroll width can't see inside it. The open dialog and every button
    are also checked for horizontal overflow, and every button for a height of at least 44px.

## Risks

- **Long offer labels:** "Ship every 60 days: $101.87 every 60 days instead of every 30" and the quantity label wrap
  to two or three lines at 320px. The buttons must wrap their text and never overflow. The e2e reflow checks cover
  it.
- **Stacked modals (R5):** if `close()` and `showModal()` ran in the wrong order, the page would briefly have two
  modals, and Chrome's focus restore could fight the focus effect. Both happen in one layout effect, close first,
  and the component test checks that only one dialog is open.
- **Skip dialog focus after R5:** closing the skip dialog returns focus to "Skip next order", not to "Cancel
  subscription". That keeps 002's single code path, which R5 asks for. A customer who came from the cancel flow
  still lands next to the trigger.
- **R9 is unit-tested only**, as the spec says. The mock never changes the status.
- **A reload undoes a local cancel** (Known limitations). 003's `beforeunload` warning is off in the cancelled view,
  because `viewOf` isn't active, so the page won't warn before that happens.
