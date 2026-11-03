# 004: Cancel with a matching alternative

Status: Implemented

## Problem

Every customer who cancels is revenue lost, but a customer who really wants to cancel must finish in a few taps, and
we don't trap customers. The reasons customers give are:

- "I have too much product left": 38%
- "It costs too much": 24%
- "I'm trying a different product": 15%
- "I didn't see results": 12%
- Other: 11%

The right alternative depends on the reason. No discounts are invented.

## Requirements

- R1 "Cancel subscription" is a plain, visible action in the active view. It opens a `<dialog>` cancel flow.
- R2 Step 1 asks "Why are you cancelling?" and shows the five reasons as a list of buttons. Each button goes
  straight to step 2, with no separate "Continue". This keeps the flow at 3 taps; auto-advancing radios would be an
  accessibility anti-pattern.
- R3 Step 2 shows the alternative for the chosen reason. "Yes, cancel my subscription" is always there with the same
  size and contrast as the offer buttons. There are also "Back" and "Keep my subscription" buttons. The label differs from R1's trigger, so
  the two buttons never share an accessible name.
  - **Too much product:** the main button is "Skip my Nov 8 order", and the second is "Ship every 60 days" (003),
    for customers whose problem is long term.
  - **Costs too much:** the main button is "Ship every 60 days: {total} every 60 days instead of every 30". The
    second is "Get 1 Multivitamin instead of 2: save {amount} per order", shown for each item with quantity > 1,
    at most 2 of them: the two largest savings, largest first, with ties in the server's order. This keeps the
    375px dialog short.
    Its saving is `totalAfterDiscount(current) - totalAfterDiscount(with that item lowered by one)` (001 R4). Here
    "current" means the quantities including pending changes. A discounted unit price is not used, because its
    rounding can differ from the actual change in the total.
  - **Trying a different product:** "Skip my Nov 8 order while you try it".
  - **Didn't see results, and Other:** no offer, only the cancel and back buttons. "Other" also shows an optional
    "Tell us more" text field. Its text is cleared on "Back" or on closing, because it is never sent.
- R4 The frequency offer shows the next slower option than the current one (30 → 60 → 90). It is hidden when the
  frequency is already 90.
- R5 A skip offer closes the cancel flow and opens the 002 skip dialog, so there is one code path for latency and 409s,
  and the customer still sees the exact new date before confirming.
- R6 A frequency or quantity offer closes the flow, applies the 003 change, and announces it. The customer stays
  subscribed.
- R7 "Yes, cancel my subscription" in step 2 cancels locally. That makes 3 taps: open, choose a reason, confirm.
  The page then shows the cancelled view: "Your subscription is cancelled. You won't be charged again." There is no
  date, because the server never sent one.
- R8 After a local cancel, "Undo cancellation" clears it. The server's active data is still stored, so the page shows
  the real subscription again, with its pending 003 changes. Undo is available for the rest of the session. It is
  only offered for a local cancel, never for the cancelled fixture.
- R9 A local cancel can only turn active into cancelled. A server status that isn't active always wins (001 R7).
- R10 Esc, closing the dialog or "Keep my subscription" at any step keeps the subscription and returns focus to
  "Cancel subscription". Both steps end with "Keep my subscription", so a touch screen, which has no Esc, can always
  leave in one tap.

## Acceptance criteria

- [x] R1, R2, R3, R7: From the active view, a customer can finish cancelling in 3 taps for any reason.
- [x] R3: Each reason shows the right offers, and "Yes, cancel my subscription" is always visible.
- [x] R3, R5: "Too much product" → "Skip my Nov 8 order" opens the skip dialog with both dates.
- [x] R4: Given a pending 90 days, the "costs too much" offers show no frequency button.
- [x] R3: Given three items above quantity 1, "It costs too much" shows two quantity offers, the largest saving
      first.
- [x] R3, R4: Given 90 days and every quantity at 1, from the server or pending, "It costs too much" shows no offer,
      only the cancel, "Back" and "Keep my subscription".
- [x] R6: "Ship every 60 days" applies the pending change and the subscription stays active.
- [x] R7, R8: After cancelling, the cancelled view shows. "Undo cancellation" brings back the active view with any
      pending changes.
- [x] R10: Esc or "Keep my subscription" at any step closes the flow without cancelling.

## Out of scope

- Pausing, swapping products and discounts (see 003 and the discussion in the log).
- Sending the cancellation reason or text anywhere.

## Known limitations

- Cancellation is simulated in local state, because the mock API has no cancel endpoint. A reload brings the active
  subscription back.
- The reason and the "Other" text are not saved or sent.
- R9 is unit-tested only (`viewOf` and the reducer guards), because the mock never changes status.
