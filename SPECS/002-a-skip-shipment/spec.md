# 002: Skip next shipment

Status: Approved

## Problem

Customers should be able to skip their next shipment without contacting support. Accidental skips create support
tickets, so the customer must know exactly what will happen before it happens. The API is slow and sometimes
rejects a skip with a 409, and the customer must always know what happened and what to do next.

## Requirements

- R1 "Skip next order" appears only when the server status is active and there is no local cancel (004). It opens a
  confirmation `<dialog>`.
- R2 The dialog names both dates: the order being skipped (`nextChargeAt`) and the new next order date, predicted as
  `nextChargeAt + intervalDays` from the server's values. It also shows the amount (`nextChargeTotalCents`).
  Example: "Your Nov 8 order will be skipped. Your next order moves to Dec 8, 30 days later on your current
  schedule."
- R3 If a local frequency change is pending (003), the dialog adds one plain sentence: "Every 60 days starts after
  that order." The server's interval still decides the new date, because the new frequency only starts after the
  next order.
- R4 Initial focus goes to the safe action, "Keep my order". The confirm button says what it does: "Skip Nov 8
  order".
- R5 While the request is pending:
  - "Keep my order" is natively `disabled`, so the customer can't back out halfway through a request whose result
    they would never see.
  - The confirm button reads "Skipping…" and uses `aria-disabled="true"`, not `disabled`, and its click handler
    ignores clicks. Native `disabled` on the focused button would drop focus to `<body>`. With `aria-disabled` focus
    stays on the button, and the request can't be sent twice.
  - Esc does nothing: the dialog's `cancel` event is prevented.
- R6 On success:
  - the server's response replaces the subscription, including `updatedAt`
  - the dialog closes and focus returns to the skip button
  - a live region announces "Skipped. Your next order is {server nextChargeAt}." The date always comes from the
    response, never the prediction.
- R7 Any failure (a 409, a 400, or anything else) is handled the same way:
  - there is no automatic retry, because a skip is not idempotent
  - the page reloads the subscription and keeps the dialog open, showing the fresh dates
  - the dialog explains what happened. For a 409: "Your subscription was changed somewhere else. We've loaded the
    latest details. Check the dates and confirm again." Other failures say: "Your order wasn't skipped. We've loaded
    the latest details."
  - the customer confirms again if they still want to skip
- R8 After the second failure in a row, the dialog adds "Still not working? Contact us" (see 001's contact target).
  Confirming stays possible, because each attempt is the customer's own choice.
- R9 If the reload after a failure also fails, the dialog says "We couldn't check your subscription. Try again in a
  moment." and offers "Check again", which reloads only. A skip is never sent based on data we know is stale.
- R10 If the reload shows the subscription is no longer active, the dialog closes and the page shows the server's
  status (001 R7).
- R11 Local plan changes (003) survive the reload in R7 and R9 unchanged.

## Acceptance criteria

- [ ] R1: Given paused, cancelled or locally cancelled, then there is no skip button.
- [ ] R2: Given active with `nextChargeAt` N and an interval of 30, then the dialog shows N and N + 30 days.
- [ ] R3: Given a pending "every 60 days", then the dialog still shows N + 30 and adds the sentence.
- [ ] R4: When the dialog opens, "Keep my order" has focus. Esc closes the dialog without calling the API.
- [ ] R5: Given a slow API, when confirm is pressed twice, then only one request is sent, focus stays on the
      confirm button, "Keep my order" is disabled and Esc doesn't close the dialog.
- [ ] R6: Given `?conflict=never`, when the customer confirms, then the announced date equals the date the server
      returned.
- [ ] R7, R8: Given `?conflict=always`, when the customer confirms, then the conflict message and fresh data show
      and no second skip request is sent automatically. After a second confirm, "Contact us" appears.
- [ ] R11: Given a pending frequency change, when a 409 happens, then the change is still shown after the reload.

## Out of scope

- Undoing a skip. There is no un-skip endpoint, which is why R2 and R4 guard so carefully against accidental skips.
- Skipping more than one order at once. The customer can skip again after a success.

## Known limitations

- R10 is in place for correctness but not tested. The mock never changes a subscription's status (see 001).
- The mock's `conflict=always` sets `updatedAt` before comparing, so every attempt fails. R7 and R8 keep this
  bounded by the customer's own choices.
