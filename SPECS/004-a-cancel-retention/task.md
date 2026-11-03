# 004: Tasks

- [x] T1 (R2–R4): `cancel.ts` with `REASONS`, `slowerFrequency` and `offersFor` with their texts, plus unit tests
      (every reason, $38.20, a pending 90, a pending quantity, a server quantity of 12, no next order date)
- [x] T2 (R1, R5–R10): reducer cancel layer with `cancel` and `cancelled`, the seven `cancel/*` actions,
      `viewOf(server, cancelled)` guarding `plan/*` and `skip/opened`, and the three focus targets, plus unit tests
      for every row and every ignored case
- [x] T3 (R1, R2, R10): the "Cancel subscription" trigger, `CancelDialog` step 1, the shared layout effect for both
      dialogs, and focus on open and on close, plus the CSS and component tests (names, Esc and native close)
- [x] T4 (R3–R6): step 2 with the offers, "Yes, cancel my subscription", "Back" and the "Other" textarea, and taking
      an offer (the skip dialog for R5, a 003 change for R6), plus component tests
- [x] T5 (R7–R9): the local cancel and Undo, the cancelled-view message, the announcements and the focus, plus
      component tests (pending changes kept, no Undo on the cancelled fixture)
- [x] T6 (R1–R10): `e2e/a-cancel.spec.ts` with 3 taps for each reason, a keyboard-only run, the skip offer, a pending
      90, the 60-day offer, Undo with pending changes, Esc at both steps, axe and reflow at 375px, 320px and 1200px
- [x] T7: ask the human which further edge cases and e2e flows to cover, and add them as tasks
- [x] T8 (R3): at most 2 quantity offers, the largest saving first (ties in server order), plus unit tests and a
      component test with three items above 1
- [x] T9 (R3, R4): the fallbacks, as component tests: with no next order date, "too much" shows only the frequency
      offer and "different product" has no "Instead, you can:"; with 90 days and every quantity at 1 pending,
      "costs" shows no offer; a pending quantity of 1 drops that item's offer. Plus a unit test for a server at 90
      days with every quantity at 1
- [x] T10 (R5, R8, 002 R6–R8): e2e for the skip offer to the end. `conflict=never`: confirm, then "Skipped. Your next
      order is Jan 15, 2027." `conflict=always`: the 409 alert, then Keep. The Undo e2e also checks the
      `beforeunload` prompt.
