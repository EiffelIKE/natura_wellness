# 002: Skip next shipment

Status: Implemented

## Problem

Customers should be able to skip their next shipment without contacting support. Accidental skips create support
tickets, so the customer must know exactly what will happen before it happens. The API is slow and sometimes
rejects a skip with a 409, and the customer must always know what happened and what to do next.

## Requirements

- R1 "Skip next order" appears only when the server status is active, `nextChargeAt` is set, and there is no local
  cancel (004). Without `nextChargeAt` there is no order to name, and the card already says "We'll confirm your next
  order date soon." (001 R3). The button opens a confirmation `<dialog>`.
- R2 The dialog names both dates: the order being skipped (`nextChargeAt`) and the new next order date, predicted as
  `nextChargeAt + intervalDays` from the server's values. It also shows the amount (`nextChargeTotalCents`).
  Example: "Your Nov 8 order will be skipped. Your next order moves to Dec 8, 30 days later on your current
  schedule."
  - The prediction adds `intervalDays` × 24 hours in milliseconds, the same arithmetic as the server, so it can't be
    a day off across a daylight-saving change. Dates follow 001 R9, so the year shows when it differs.
  - Without `nextChargeTotalCents`, the amount is left out, as in 001 R3.
- R3 If a local frequency change is pending (003) and differs from the server's `intervalDays`, the dialog adds one
  plain sentence: "Every 60 days starts after that order." The server's interval still decides the new date, because
  the new frequency only starts after the next order.
- R4 Initial focus goes to the safe action, "Keep my order". The confirm button says what it does: "Skip Nov 8
  order". Its label is always built from the subscription currently shown, so it changes with fresh data (R7).
- R5 While the request is pending, and until the reload after a failure (R7) has finished:
  - "Keep my order" is natively `disabled`, so the customer can't back out halfway through a request whose result
    they would never see.
  - The confirm button reads "Skipping…" (or "Checking…" during the reload) and uses `aria-disabled="true"`, not
    `disabled`, and its click handler ignores clicks. Native `disabled` on the focused button would drop focus to
    `<body>`. With `aria-disabled` focus stays on the button, and the request can't be sent twice.
  - Esc does nothing: the dialog's `cancel` event is prevented.
- R6 On success:
  - the server's response replaces the subscription, including `updatedAt`
  - the dialog closes and focus returns to the skip button
  - a live region announces "Skipped. Your next order is {server nextChargeAt}." The date always comes from the
    response, never the prediction.
- R7 Any failure (a 409, a 400, or anything else) is handled the same way:
  - there is no automatic retry, because a skip is not idempotent
  - the page reloads the subscription and keeps the dialog open, showing the fresh dates
  - the dialog explains what happened in a `role="alert"` message. For a 409: "Your subscription was changed
    somewhere else. We've loaded the latest details. Check the dates and confirm again." Other failures say: "Your
    order wasn't skipped. We've loaded the latest details."
  - if the reloaded `nextChargeAt` differs from the date the customer tried to skip, the message adds: "Your next
    order is now Dec 8 (it was Nov 8). It may already have been skipped." Confirming again would skip a second
    order, and that can't be undone.
  - focus moves to "Keep my order", so a stray Enter can't send a skip against dates the customer hasn't read
  - the customer confirms again if they still want to skip
- R8 After the second failed skip in a row, the dialog adds "Still not working? Contact us" (001 R11). Only failed
  skip requests count, not failed reloads (R9). The count resets on success and when the dialog closes. Confirming
  stays possible, because each attempt is the customer's own choice.
- R9 If the reload after a failure also fails, the dialog says "We couldn't check your subscription. Try again in a
  moment." and offers "Check again", which reloads only. A skip is never sent based on data we know is stale:
  - the dates and the confirm button are hidden until a reload succeeds
  - "Keep my order" and Esc stay available, also while "Check again" is pending, because a reload only reads
  - when "Check again" succeeds, the dialog shows the fresh dates as in R7, and focus moves to "Keep my order"
  - if the customer closes the dialog while the data is stale, reopening "Skip next order" opens it in this state
    again, until a reload succeeds
- R10 If the reload shows the subscription is no longer active, has no `nextChargeAt`, or no longer exists (404),
  the dialog closes and the page shows the server's state (001 R2, R3, R7). Focus moves to the `h1`, because the
  skip button is gone.
  - The same applies when the customer closed the dialog during "Check again" (R9) and that reload then shows
    there is nothing left to skip: if focus was on the skip button, it moves to the `h1` instead of being lost.
- R11 Local plan changes (003) survive the reload in R7 and R9 unchanged.
- R12 On short screens (a landscape phone, or 200% zoom), the dialog's content scrolls inside the dialog, both
  buttons can be reached, and the page behind it doesn't scroll.

## Acceptance criteria

- [x] R1: Given paused, cancelled or locally cancelled, then there is no skip button.
- [x] R1: Given active without `nextChargeAt`, then there is no skip button.
- [x] R2: Given active with `nextChargeAt` N and an interval of 30, then the dialog shows N and N + 30 days.
- [x] R2: Given N + 30 days falls in the next year, then the new date shows the year.
- [x] R2: Given no `nextChargeTotalCents`, then the dialog shows both dates and no amount.
- [x] R3: Given a pending "every 60 days", then the dialog still shows N + 30 and adds the sentence.
- [x] R3: Given a pending frequency equal to the server's `intervalDays`, then the sentence doesn't show.
- [x] R4: When the dialog opens, "Keep my order" has focus. Esc closes the dialog without calling the API.
- [x] R5: Given a slow API, when confirm is pressed twice, then only one request is sent, focus stays on the
      confirm button, "Keep my order" is disabled and Esc doesn't close the dialog.
- [x] R6: Given `?conflict=never`, when the customer confirms, then the announced date equals the date the server
      returned.
- [x] R7, R8: Given `?conflict=always`, when the customer confirms, then the conflict message and fresh data show,
      focus is on "Keep my order", and no second skip request is sent automatically. After a second confirm,
      "Contact us" appears.
- [x] R7: Given the reload returns a different `nextChargeAt`, then the message names both dates and the confirm
      button names the new one.
- [x] R8: Given "Contact us" is showing, when the dialog is closed and reopened, then it is gone.
- [x] R8: Given a failed skip followed by a failed reload, then "Contact us" doesn't show.
- [x] R9: Given the reload fails, then the dates and confirm are hidden, "Check again" reloads without sending a
      skip, and on success the fresh dates show with focus on "Keep my order".
- [x] R9: Given the reload failed, when the dialog is closed and reopened, then it opens in the R9 state.
- [x] R10: Given the dialog was closed during "Check again" with focus on the skip button, when the reload shows a
      paused subscription, then focus moves to the `h1`.
- [x] R11: Given a pending frequency change, when a 409 happens, then the change is still shown after the reload.
- [x] R12: Given a 640×320 viewport, when the dialog is open, then both buttons can be reached by Tab and are scrolled
      into view, the page behind doesn't scroll, and axe passes.

## Out of scope

- Undoing a skip. There is no un-skip endpoint, which is why R2, R4 and R7 guard so carefully against accidental
  skips.
- Skipping more than one order at once. The customer can skip again after a success.

## Known limitations

- R10 is in place for correctness but not tested in e2e. The mock never changes a subscription's status or removes
  it (see 001). A component test covers it with hand-built data.
- The mock's `conflict=always` sets `updatedAt` before comparing, so every attempt fails. R7 and R8 keep this
  bounded by the customer's own choices.
- The mock can't move `nextChargeAt` between opening the dialog and a failure (R7), and can't fail a reload while
  the first load works (R9). It runs in the browser, with no network requests to intercept. Rewriting the module
  Vite serves was considered and rejected, so e2e tests always use the real mock. These cases are covered by
  component tests with a mocked API.
- E2e can't count calls to the in-browser mock. "Only one request" (R5) is checked through what can be seen: one
  skip moves the date once. Exact call counts are checked in component tests.
- The local cancel in R1 comes from 004, and the pending frequency in R3 and R11 comes from 003. 002 built the
  hooks and tested them with hand-built data. 003 T5 wired the real pending frequency and ticked R11 with component
  tests through `SubscriptionCard`. The R1 local-cancel criterion is ticked when 004 adds that layer.

## Open questions

None.
