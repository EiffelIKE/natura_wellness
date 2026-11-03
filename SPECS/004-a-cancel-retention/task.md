# 004: Tasks

- [x] T1 (R2–R4): `cancel.ts` with `REASONS`, `slowerFrequency` and `offersFor` with their texts, plus unit tests
      (every reason, $38.20, a pending 90, a pending quantity, a server quantity of 12, no next order date)
- [ ] T2 (R1, R5–R10): reducer cancel layer with `cancel` and `cancelled`, the seven `cancel/*` actions,
      `viewOf(server, cancelled)` guarding `plan/*` and `skip/opened`, and the three focus targets, plus unit tests
      for every row and every ignored case
- [ ] T3 (R1, R2, R10): the "Cancel subscription" trigger, `CancelDialog` step 1, the shared layout effect for both
      dialogs, and focus on open and on close, plus the CSS and component tests (names, Esc and native close)
- [ ] T4 (R3–R6): step 2 with the offers, "Yes, cancel my subscription", "Back" and the "Other" textarea, and taking
      an offer (the skip dialog for R5, a 003 change for R6), plus component tests
- [ ] T5 (R7–R9): the local cancel and Undo, the cancelled-view message, the announcements and the focus, plus
      component tests (pending changes kept, no Undo on the cancelled fixture)
- [ ] T6 (R1–R10): `e2e/a-cancel.spec.ts` with 3 taps for each reason, a keyboard-only run, the skip offer, a pending
      90, the 60-day offer, Undo with pending changes, Esc at both steps, axe and reflow at 375px, 320px and 1200px
- [ ] T7: ask the human which further edge cases and e2e flows to cover, and add them as tasks
