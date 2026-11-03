# 003: Plan changes (frequency and quantity)

Status: Approved

## Problem

"I have too much product left" is the top cancellation reason (38%), and "it costs too much" is second (24%).
Shipping less often, or fewer units, solves both without losing the customer. The mock API can't save either change,
so they are simulated in local state, and the page must not invent server data to show them.

## Requirements

- R1 Frequency can be changed to every 30, 60 or 90 days, using a `<fieldset>` with a visible `<legend>` and a group
  of 3 radio buttons. The server's value is marked in its label, for example "Every 30 days (current)".
- R2 Each item's quantity can be changed from 1 to 10, using a `<select>` with options 1 to 10 and a visible
  `<label>` with the product's full name, for example "Multivitamin, 30 tablets quantity". The server's value is
  marked the same way as
  in R1, for example "2 (current)". The limits come from the options. There is no `<input type="number">` and no
  stepper. Removing an item is not offered.
- R3 A change applies after the next order. It never changes `nextChargeAt` or `nextChargeTotalCents`. The page shows
  it as a pending change: "Every 60 days, starting after your Nov 8 order", or "2 → 1 Multivitamin, 30 tablets,
  starting after your Nov 8 order". The "Nov 8" reference is derived from the server's `nextChargeAt` on every render
  and is never stored, so it moves forward by itself after a skip. Without `nextChargeAt`, it reads "starting after
  your next order" (001 R3: the page never fills in a missing date).
- R4 When quantities change, show "After that: {total} per order". The total is
  `totalAfterDiscount(items with pending quantities, discountPercent)` (001 R4), and it is labelled as applying to
  later orders.
- R5 Changing a value back to the server's value clears that pending change. There is also a "Discard changes" action
  for all pending changes, shown only while there are some. It is announced as "Changes discarded.", and focus
  moves to the "Change your plan" heading, because the button is gone.
- R6 Each change is announced in a live region, for example "Frequency changed to every 60 days, starting after your
  Nov 8 order."
- R7 Pending changes are kept in a separate local layer and are never merged into the server data. A reload after a
  409 (002) keeps them, and a pending value that now equals the fresh server value is no longer shown as a change.
  They are shown only while the server status is active and there is no local cancel. When
  hidden, they are kept, not thrown away.
- R8 The controls are the native form controls in R1 and R2, with visible labels, and they work by keyboard and at
  375px. No custom widgets or ARIA roles stand in for them. They sit in their own "Change your plan" section after
  the products, so the "Next order" and "In your subscription" sections stay read-only server data.

## Acceptance criteria

- [ ] R1, R3: When the customer picks 60 days, then the pending line shows "starting after your {nextChargeAt}
      order" and the next order date and amount stay the same.
- [ ] R2, R4: When Multivitamin goes from 2 to 1, then "After that" shows the recalculated total and the next amount
      is unchanged.
- [ ] R3: Given a pending change, when a skip succeeds, then the "starting after" date follows the new
      `nextChargeAt`.
- [ ] R5: When the customer sets 30 days again, then the pending frequency change is gone.
- [ ] R6: Each change is announced.

## Out of scope

- Adding, removing or swapping products. Swapping was considered for "trying a different product" and dropped: it
  needs a catalog picker for a 15% group that mostly needs a break, and a skip covers that (004).
- Pausing. A simulated pause would need a `pausedUntil` date the server never sent.

## Known limitations

- The mock API can't save a frequency or quantity change. Changes live in local state and are lost on reload, as the
  brief allows.
- In a real integration these changes would be saved through the API, and then the next order's date and total would
  come back from the server.
- Hiding the changes while not active (R7) is not tested. The mock never changes a subscription's status.
