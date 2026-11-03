# 005: Tasks

- [x] T1 (R1, R7, R9–R11): `copy.ts` additions, with the existing values unchanged. `buyBox.ts` with `formatMoney`,
      `unitPriceCents`, `totalCents`, `parseQuantity` and `correctQuantity`. Unit tests, including
      `renewalNotice("30 days", "$25.46") === copy.finePrint`, $76.38 at 3, $254.60 at 10, and 15/0/2.6/""/"abc"
- [x] T2 (R4–R6, R8–R11): `buyBoxReducer.ts` with the six actions, plus unit tests for every transition, every
      ignored case, the status clearing, `seq` on a repeated add, and the correction before the summary on both
      submit paths
- [x] T3 (R1, R3–R11, R13): `BuyBox.tsx` markup and behaviour, with only enough CSS to work: the form, the fieldset,
      a label around the header row only, the card click handler, the select, the form with `noValidate`, the
      stepper with `type="button"` and `aria-disabled`, `inputMode`, the wheel guard and the Enter guard, the keyed
      status line, the fine print and `data-contrast-exception`. Component tests, including the no-inline-text test
- [x] T4 (R2): the `visual` Playwright project (1200×780, DPR 2, its own `snapshotPathTemplate`), with `mobile` and
      `desktop` ignoring it. The committed baseline copy and the byte-identical test. `e2e/visual.ts` `diffImages`,
      with the diff image and the ratio attached. The font check, the hidden nav and the 2400×1560 size check. The
      pixel and geometry assertions are `test.fixme` until T5
- [x] T5 (R2, R8): `BuyBox.module.css` to the plan's measurements and tokens. Tune the type against the diff, record
      the final values in `plan.md`, turn on the geometry test (including the subtitle's two lines and the
      zero-height status line) and the pixel test, set `TOLERANCE`, and record both ratios in the CHANGELOG
- [x] T6 (R12): the layout below 1200px (two columns at 960px and wider, one column below), plus the e2e reflow at
      1024, 768, 375 and 320 in the default and one-time states, and a quantity of 10 at 320
- [x] T7 (R14): `expectAccessibleBuyBox` with the two axe runs, and the Part B smoke test switched to it (both done
      early, in T5, to keep `check` green once the design's colours existed). E2e axe
      at 375 and 1200 in the default and one-time states and after "Add to cart"
- [x] T8 (R3–R11, R13): `e2e/b-buy-box.spec.ts` flows:
  - collapse and restore
  - totals
  - corrections, with the visible line
  - 15, then clicking "Add to cart" while the field has focus: the correction, then the summary
  - Enter with 15: no native validation bubble, corrected to 10, then added
  - Enter on the radios, the select and the field
  - the wheel
  - `aria-disabled` focus
  - a cleared field keeping the total
  - a keyboard-only run
  - no console errors
- [x] T9: ask the human which further edge cases and e2e flows to cover, and add them as tasks
      (chosen 2026-11-03; recorded as T11 and T12 below)
- [ ] T10: after T11 and T12, tick the acceptance criteria and set the spec to Implemented
- [x] T11 (R15, R8, R9): at 375px and 1200px, choose a non-default quantity in each purchase option, follow the nav
      to Part A and then back through the Part B nav link. Check the default option, frequency and quantity,
      agreement between the field, button total, renewal notice and subsequent cart summary, fixed unit prices,
      empty status on return, and no console errors
- [x] T12 (R3–R6, R8, R9): at 375px and 1200px, click "2,316 reviews" with a non-default quantity in each purchase
      option. Check that Part B stays open with `#reviews`, the option and quantity are preserved, the subscription
      frequency is preserved, every total agrees, and no console errors occur
