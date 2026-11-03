# 002: Tasks

- [x] T1 (R1, R2): `skip.ts` with `canSkip`, `predictNextChargeAt` and the error → cause mapping, plus unit tests
      (daylight-saving change, next year)
- [x] T2 (R5–R10): reducer skip layer with `skip`, `stale`, `announcement`, `focus` and the new actions, plus unit
      tests for every transition
- [x] T3 (R1–R4): `SkipDialog` markup, the skip button in `ActiveView`, opening, initial focus, Esc and "Keep my
      order" closing, and the CSS, plus component tests
- [x] T4 (R5, R6): confirm flow: the pending state with the Esc guard, success, the announcement and focus
      returning to the skip button, plus component tests
- [x] T5 (R7–R10): failure flow: the reload, notices, moved date, focus on "Keep my order", "Contact us", the R9
      stale state with "Check again" and reopening, and R10 closing to the `h1`, plus component tests
- [x] T6 (R1–R9): `e2e/a-skip.spec.ts`: success, pending with a double click and a double Esc, `conflict=always`,
      keyboard only, axe, and no horizontal scroll at 375px, 320px and 1200px
- [x] T7: ask the human which further edge cases and e2e flows to cover, and add them as tasks
- [ ] T8 (R10): focus fallback when the skip button disappears after a "Check again" reload that finished with the
      dialog closed, plus unit and component tests
- [ ] T9 (R12): the dialog on short screens (scrolling inside the dialog, no page scroll behind it), plus an e2e
      test at 640×320 with axe and Tab reaching both buttons
- [ ] T10 (R6): e2e: two skips in a row (Dec 16 → Jan 15, 2027 → Feb 14, 2027), each announced, the second sent with
      the fresh `updatedAt`
- [ ] T11 (R6, R7): e2e in the mock's default random mode: confirm until a skip succeeds (bounded attempts), then the
      announced date equals the page's date
