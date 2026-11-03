# 003: Plan

Status: Approved

Spec: [spec.md](spec.md) (Approved)

## Approach

Plan changes are a third layer on the reducer, next to `load` and `skip`, as 001's plan reserved. A `local` slice
holds what the customer picked. It is never merged into `server` (R7). A selector, `pendingOf(server, local)`,
compares it with the server's data on every render, so the "starting after" date, the "(current)" marks and the
"After that" total always follow the latest server data, including after a skip or a reload (R3, R7). No request
is ever sent, so the new actions carry no `requestId`.

The rules (what counts as pending, the texts, the total) live in a pure `plan.ts` and the reducer, which are
unit-tested. `PlanChanges` only renders, and `SubscriptionCard` dispatches and applies focus, as in 002.

## State shape

```ts
/** 003 (and 004's `cancelled` later). Never merged into `server`. */
interface Local {
  /** R1: the frequency picked, or null when it is the server's. */
  intervalDays: number | null;
  /** R2: quantity by SKU, only for items whose picked quantity differs from the server's. */
  quantities: Record<string, number>;
}

interface State {
  // ...001 and 002 fields unchanged
  local: Local;
  focus: Focus | null; // Focus gains "plan-heading" (R5)
}
```

001's plan reserved `local.frequencyDays`. It is named `intervalDays` here instead, to match the server field it
shadows.
`Local` is declared in `plan.ts`, next to `pendingOf`, so `plan.ts` never imports the reducer.

## Actions and transitions

| Action           | Accepted when                                                                          | Result                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `plan/frequency` | `load` is ready, the server is active, and `days` is in `frequencyOptions(server)`     | `local.intervalDays` = `days`, or null when it equals the server's (R5). Announcement (R6). Focus `null`: it stays on the radio. |
| `plan/quantity`  | as above, `sku` is in the server's items, and `quantity` is in `quantityOptions(item)` | `quantities[sku]` set, or the key removed when it equals the server's (R5). Announcement (R6). Focus `null`.                     |
| `plan/discarded` | there is at least one pending change                                                   | `local` emptied, announcement "Changes discarded.", focus `plan-heading` (R5)                                                    |

Anything else is ignored and returns the same `state`. `load/*`, `skip/*` and `refresh/*` never touch `local` (R7).

- **Reload after a 409 (R7, 002 R11):** `refresh/succeeded` replaces `server` only, so `local` survives as it is.
  If the fresh server now has the value the customer picked, `pendingOf` drops it. The stored value is cleaned on
  the next action that touches it, or by "Discard changes".
- **Hidden, not lost (R7):** `PlanChanges` is rendered only inside `ActiveView`, which `viewOf` picks only for an
  active server (004 adds the local cancel there). The reducer keeps `local` whatever the status is.

## `plan.ts`

```ts
export const FREQUENCIES = [30, 60, 90] as const; // R1
export const QUANTITIES = [1, 2, ..., 10];        // R2

interface PendingQuantity { item: SubscriptionItem; quantity: number } // `item.quantity` is the server's

interface Pending {
  intervalDays: number | null;
  quantities: PendingQuantity[]; // in the server's item order
}

/** R5, R7: only values that differ from this server data, and only SKUs it still has. */
export function pendingOf(server: Subscription, local: Local): Pending;
export function hasPending(pending: Pending): boolean;

/** R4: totalAfterDiscount() from src/api/fixtures.ts, with pending quantities applied. Null when none are pending. */
export function totalAfter(server: Subscription, pending: Pending): number | null;

/** R3: "starting after your Dec 16 order", or "starting after your next order" without a date. */
export function startingAfter(nextChargeAt: string | null): string;

/** R1 edge-case round: FREQUENCIES plus the server's own value, in numeric order, without duplicates. */
export function frequencyOptions(server: Subscription): number[];
/** R2 edge-case round: QUANTITIES plus the server's own value, in numeric order, without duplicates. */
export function quantityOptions(item: SubscriptionItem): number[];
```

`PlanChanges` renders from these two, and the reducer validates against them, so the server's own value can always
be picked back (R5) and nothing else outside `FREQUENCIES` / `QUANTITIES` is accepted.

`totalAfterDiscount` is imported, not copied, so the rounding is the server's (001 R4). `src/api/` stays read-only.

## Texts

With the e2e fixture (next order Dec 16, $101.87, Vitamin D × 1, Multivitamin × 2):

| Where                            | Text                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Radio labels (R1)                | "Every 30 days (current)", "Every 60 days", "Every 90 days"                                                               |
| Select label, options (R2)       | "Multivitamin, 30 tablets quantity"; "1", "2 (current)", "3" … "10"                                                       |
| Pending lines (R3)               | intro "Starting after your Dec 16 order:" followed by a list: "Every 60 days", "2 → 1 Multivitamin, 30 tablets"           |
| After that (R4)                  | "After that: $63.67 per order"                                                                                            |
| Announce frequency (R6)          | "Frequency changed to every 60 days, starting after your Dec 16 order."                                                   |
| Announce quantity (R6)           | "Multivitamin, 30 tablets quantity changed from 2 to 1, starting after your Dec 16 order. After that: $63.67 per order."  |
| Announce back to server (R5, R6) | "Frequency back to every 30 days, no change pending." / "Multivitamin, 30 tablets quantity back to 2, no change pending." |
| Announce discard (R5)            | "Changes discarded."                                                                                                      |

- The spec writes each change as one line with its own "starting after…". With several changes, that repeats the
  same date, so the lines share one intro. For a single change it reads the same as the spec.
- "From 2" is always the server's quantity, never the previous pick. The announcement says what will change
  compared to the real plan.
- **Arrow:** "→" is `aria-hidden`, followed by a visually hidden "to", so screen readers say "2 to 1", not "2 right
  arrow 1".
- **Date:** `startingAfter(server.nextChargeAt)` is called at render time and when the announcement is built. The date
  string is never stored (R3).

## Files

| File                                     | What                                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/part-a/plan.ts`                     | `Local`, `FREQUENCIES`, `QUANTITIES`, `pendingOf`, `hasPending`, `totalAfter`, `startingAfter`, `frequencyOptions`, `quantityOptions`  |
| `src/part-a/subscriptionReducer.ts`      | the `local` slice, the three `plan/*` actions and their announcements, focus target `plan-heading`                                     |
| `src/part-a/PlanChanges.tsx`             | the "Change your plan" section: fieldset, selects, pending lines, "After that", "Discard changes"                                      |
| `src/part-a/views.tsx`                   | `ActiveView` renders `PlanChanges` after the products and passes its props through                                                     |
| `src/part-a/SubscriptionCard.tsx`        | the `plan/*` dispatches, the `plan-heading` ref in the focus effect, `pendingIntervalDays` to the dialog, the R9 `beforeunload` effect |
| `src/part-a/SubscriptionCard.module.css` | fieldset, radio rows, select, pending list                                                                                             |
| `e2e/a-plan.spec.ts`                     | the e2e flows below                                                                                                                    |

`ItemList` doesn't change. "In your subscription" keeps showing "Quantity: 2" from the server.

## UI decisions

- **Section:** `<section>` with `<h2 tabIndex={-1}>Change your plan</h2>` after "In your subscription". It holds:
  1. the frequency `<fieldset>`, with `<legend>How often</legend>` and 3 `<input type="radio">` sharing a `useId()`
     name. Each sits inside its own `<label>`, and the server's value gets " (current)".
  2. one `<label>` + `<select>` per item, in server order, with `<option>` 1–10. The server's quantity gets
     " (current)". `htmlFor`/`id` from `useId()` plus the SKU.
  3. only while something is pending: a `<div>` with the intro, a `<ul>` of pending lines, "After that" (only when
     a quantity is pending), and a secondary "Discard changes" button.
- **Controlled inputs:** `checked` and `value` come from `pendingOf(...)` with a fallback to the server's values. The
  form state is the reducer's, so a reload or a skip re-renders the controls without local component state.
- **No submit:** there is nothing to save (Known limitations), so a change applies on `change`. There is no `<form>`,
  so pressing Enter in a select can't submit anything.
- **Touch targets:** each radio's `<label>` is a full-width row at least 44px tall, and the select is at least 44px tall
  and as wide as its column at 375px. A long label wraps above its select instead of pushing it off screen.
- **Announcement:** the same always-mounted `role="status"` region as 001 and 002. `skip/opened` already clears it, so
  a plan announcement is never read again when the dialog opens.
- **Focus (R5):** `plan/discarded` sets focus `plan-heading`. The focus effect in `SubscriptionCard` gets a
  `planHeadingRef`, which goes down to `PlanChanges` through `ActiveView`, like `skipButtonRef`.
- **Leaving the page (R9):** `SubscriptionCard` computes `warnOnLeave`: ready, `viewOf(server)` is active, and
  `hasPending(pendingOf(server, local))`. While it is true, an effect adds a `beforeunload` listener that calls
  `preventDefault()` and sets `returnValue` for older browsers. The effect's cleanup removes it, so Discard, setting
  everything back, or a reload that makes every pick equal to the server's ends the warning without extra state.
  It lives in `SubscriptionCard` and not in `PlanChanges`, because it is a page-level effect, like focus.
- **Skip dialog (002 R3):** `SubscriptionCard` passes `pendingOf(server, local).intervalDays` to `SkipDialog`
  instead of `null`, so "Every 60 days starts after that order." appears with no change to the dialog.

## Testing

- **Unit (Vitest):**
  - `plan.ts`: `pendingOf` drops values equal to the server's and SKUs the server no longer has, and keeps server
    order. `totalAfter` for Multivitamin 2 → 1 is 6367 (`Math.round(6366.5)`, the same rounding as the mock), and
    null with only a frequency pending. `startingAfter` covers the same year, the next year ("Jan 15, 2027") and null.
  - Reducer: every row of the table. Setting a value back clears it. Invalid days, quantity 0, quantity 11, a
    non-integer and an unknown SKU are ignored. Changes are ignored when not ready or not active. Discard with
    nothing pending is ignored. `refresh/succeeded`, `skip/succeeded` and `load/started` keep `local`. Each
    announcement's exact text.
- **Component (Testing Library):** with the mocked API, as in 002:
  - roles and names: a group "How often", radios "Every 30 days (current)" (checked), "Every 60 days" and "Every 90
    days", and a combobox "Multivitamin, 30 tablets quantity" with 10 options and "2 (current)" selected
  - R1, R3: picking 60 shows the pending line, and the next order date and amount are unchanged
  - R2, R4: Multivitamin 2 → 1 shows "After that: $63.67 per order", and $101.87 is unchanged
  - R5: back to 30 removes the line; Discard empties everything, focuses the heading and announces
  - R6: each announcement in the status region
  - R3 with a skip: after a successful skip, the line says "starting after your Jan 15, 2027 order"
  - 002 R3: with 60 pending, the skip dialog shows "Every 60 days starts after that order."
  - 002 R11: with 60 pending, a 409 and its reload keep the line
  - paused and cancelled views have no "Change your plan" section
- **Edge-case round (unit and component):** `frequencyOptions` and `quantityOptions` with a value inside, below and
  above the range. In the reducer, the server's 45 or 12 is accepted and clears the change, and another value
  outside the range (45 while the server says 30, 11 while it says 2) is still ignored. In components, 4 radios
  with "Every 45 days (current)" checked, options with "12 (current)" selected and the "12 → 3" line, and "After
  that" with `nextChargeTotalCents: null`. R9: a cancelable `beforeunload` event on `window` is prevented while
  something is pending, and not with nothing pending, after Discard, after setting back, or once paused.
- **E2e (Playwright, mobile and desktop):** `e2e/a-plan.spec.ts` with the real mock and the pinned clock:
  - keyboard only: Tab into the radios, arrow to 60, Tab to the Multivitamin select, choose 1. Each change is
    announced, the lines and "After that: $63.67 per order" show, and "Dec 16" and "$101.87" stay.
  - a skip with `conflict=never` moves the line to "starting after your Jan 15, 2027 order", and the dialog shows the
    pending-frequency sentence
  - `conflict=always`: the 409 and its reload keep the pending lines (002 R11)
  - Discard by keyboard: focus on the "Change your plan" heading, the controls back to "(current)"
  - with changes pending: axe WCAG 2.2 A/AA and no horizontal scroll at 375px, 320px and 1200px
  - R9: with a change pending, following the "Part B" nav link raises a `beforeunload` dialog. Dismissing it keeps
    the page and the changes. With nothing pending, the link navigates with no dialog. Odd server values (R1, R2)
    can't be reached through the mock's fixtures, so they stay component tests.

## Risks

- **Announcements per arrow key:** on a closed `<select>`, arrow keys fire `change` on each press (accepted in the
  spec decision), and so do arrow keys in a radio group. Each step gets announced. The region is polite, and each text
  replaces the last, so a screen reader reads at most a short queue. The e2e test checks the final text only.
- **Same text twice:** 60 → 30 → 60 announces different texts in between, so the region always changes. Picking the
  value that is already selected fires no `change`, so nothing is announced, which is right.
- **"(current)" in option text:** the select's displayed value reads "2 (current)" while the server value is
  selected. That is intended (R2), but the column must be wide enough for it at 320px.
- **Values the mock never sends:** the human decided (T7) that a server `intervalDays` outside 30/60/90 gets its own
  radio and a quantity outside 1–10 gets its own option (R1, R2). `formatFrequency` stays plural, so a server
  interval of 1 would read "Every 1 days". That isn't a realistic subscription, so it isn't handled.
- **`beforeunload` in tests (R9):** jsdom never unloads, so component tests check `defaultPrevented` on a
  dispatched event. Only the e2e test shows a real prompt, and only in Chromium.
- **002 criteria:** 002's R3 (end-to-end) and R11 criteria are ticked by T5 here, as 002's Known limitations
  promised.
