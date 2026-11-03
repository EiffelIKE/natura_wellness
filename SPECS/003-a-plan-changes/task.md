# 003: Tasks

- [x] T1 (R1–R5, R7): `plan.ts` with `FREQUENCIES`, `QUANTITIES`, `pendingOf`, `hasPending`, `totalAfter` and
      `startingAfter`, plus unit tests (the 6367 rounding, next year, no date, SKUs the server dropped)
- [x] T2 (R5–R7): reducer `local` layer with `plan/frequency`, `plan/quantity` and `plan/discarded`, the
      announcements and the `plan-heading` focus target, plus unit tests for every row and every ignored input
- [x] T3 (R1, R2, R8): `PlanChanges` section with the frequency fieldset and the quantity selects with "(current)",
      rendered by `ActiveView`, wired in `SubscriptionCard`, and the CSS, plus component tests for roles, names and
      options
- [x] T4 (R3–R6): pending lines, "After that", "Discard changes" with focus on the heading, and the announcements, plus
      component tests
- [x] T5 (R3, R7, 002 R3, 002 R11): the pending frequency in the skip dialog, "starting after" following a skip, and
      changes surviving a 409 reload, plus component tests; tick the 002 R3 and R11 criteria
- [x] T6 (R1–R8): `e2e/a-plan.spec.ts`: keyboard flow, a skip with changes pending, `conflict=always`, Discard,
      axe, and no horizontal scroll at 375px, 320px and 1200px
- [x] T7: ask the human which further edge cases and e2e flows to cover, and add them as tasks
- [x] T8 (R1, R2, R5): server values outside the options: `frequencyOptions` and `quantityOptions` in `plan.ts`,
      the reducer accepting the server's own value, and `PlanChanges` rendering from them, plus unit and component
      tests (45 days, quantity 12, "12 → 3", picking the server's value back)
- [x] T9 (R4): component test pinning "After that" when the server sends no `nextChargeTotalCents`
- [x] T10 (R9): the `beforeunload` warning while pending changes are shown, plus component tests (pending, none,
      after Discard, after setting back, paused) and an e2e test (nav link raises the dialog, dismissing keeps the
      changes, no dialog without changes)
