# Agent work log

Newest first. One entry per completed task. Format and rules are in [README.md](README.md).

## 2026-11-03: 005-b-buy-box / T10: final acceptance review, spec Implemented

- **Changed:** `spec.md`: all 27 acceptance criteria ticked, status `Implemented`. `task.md`: T10 ticked.
  `e2e/b-buy-box.spec.ts`: the console-error hooks duplicated in the T8 and T11–T12 groups are now one shared
  `openPartBWithoutBrowserErrors()`; the T11–T12 group moved below T8, in task order. The R8 wheel test also checks
  that the focused, hovered field shows no spinner. `plan.md` describes that check.
- **Decisions:** each criterion was mapped to a passing unit, component or e2e test before it was ticked. Only
  "no visible spinner" (R8) had no test: Chromium draws spin buttons only on hover or focus, so the default
  screenshot can't see them. A computed-style probe of `::-webkit-inner-spin-button` was rejected (Chromium
  returns the input's own `appearance`), and so was a click on the arrow (too position-dependent; it passed with
  the spinner shown). The check compares the field's screenshot before and after force-hiding spin buttons.
- **Verified:** the shared helper fails a test on an injected `console.error`. The spinner check passed 3 runs in
  a row and failed with the CSS rules removed; the CSS was restored. `npm run check`: green; 611 unit/component tests and 164 e2e tests passed,
  22 intentional skips. Visual diff remains **0.775%** (29,011 px), below the 1% tolerance.

## 2026-11-03: 005-b-buy-box / T12: reviews preserves Part B's selection and totals

- **Changed:** `e2e/b-buy-box.spec.ts` adds reviews-link flows from a subscription every 60 days at quantity 3 and
  a one-time purchase at quantity 2, at 375px and 1200px. Both click the actual link, check `part=b#reviews` and
  the product heading, and verify the option, quantity, unit prices, button total and cart summary are preserved.
  The subscription retains its frequency and renewal notice; one-time still has neither. Console errors and
  uncaught exceptions are checked throughout. `task.md`: T12 ticked; T10's final acceptance review remains pending.
- **Decisions:** check the selection before and after clicking, preserve an existing cart announcement, and add
  again afterwards to confirm the next summary still agrees. No application changes were needed.
- **Verified:** `npm run check`: green; 611 unit/component tests and 164 e2e tests passed, 22 intentional skips.
  All eight T11/T12 browser cases pass. Visual diff remains **0.775%** (29,011 px), below the 1% tolerance.

## 2026-11-03: 005-b-buy-box / T11: totals agree after the Part A/Part B nav round trip

- **Changed:** `e2e/b-buy-box.spec.ts` adds round trips from a subscription every 60 days at quantity 3 and a
  one-time purchase at quantity 2, at 375px and 1200px. Both follow the actual nav links, check Part A rendered,
  then verify Part B's default option, frequency, quantity, button and renewal totals, unit prices, empty status
  and subsequent cart summary. Browser console errors and uncaught exceptions are checked across navigation.
  `task.md`: T11 ticked.
- **Decisions:** populate the cart summary before leaving so its absence on return also proves the state reset.
  No application changes were needed.
- **Verified:** `npm run check`: green; 611 unit/component tests and 160 e2e tests passed, 22 intentional skips.
  All four new navigation tests pass. Visual diff remains **0.775%** (29,011 px), below the 1% tolerance.

## 2026-11-03: 005-b-buy-box / T9: record the human's navigation edge cases

- **Changed:** `spec.md` adds R15 and acceptance criteria for the Part A/Part B nav round trip, and extends R3 to
  preserve Part B's selection on reviews-link clicks. `plan.md` describes both flows. `task.md` marks T9 complete
  and adds pending T11 and T12 for both purchase options at 375px and 1200px, before T10's final review.
- **Decisions:** the human chose these two flows. Returning through the Part B nav link starts the default state,
  consistent with full-page navigation and the existing no-persistence scope; following `#reviews` preserves the
  current selection. This task records coverage to implement; it adds no application code or browser tests.
- **Verified:** `npm run check`: green; 611 unit/component tests and 156 e2e tests passed, 22 intentional skips.
  Visual diff remains **0.775%** (29,011 px), below the 1% tolerance. Spec, plan and task formatting and diff checks
  pass.

## 2026-11-03: 005-b-buy-box / T8: browser interaction and keyboard coverage

- **Changed:** `e2e/b-buy-box.spec.ts` adds 14 interaction cases: card-padding selection and frequency restoration,
  totals and fixed unit prices, visible blur corrections for 15/0/2.6/empty, focused-field click and Enter submits
  with 15, Enter guards, focusable step limits, the desktop wheel, cleared-field totals, repeated announcements
  and status clearing, and a keyboard-only purchase. Every flow checks console errors and uncaught exceptions.
  `task.md`: T8 ticked; T9's edge-case question recorded as awaiting the human's choices.
- **Decisions:** no application changes were needed. The invalid-submit tests observe native `invalid` events to
  check that browser validation does not block correction. The wheel test waits for actual wheel delivery and
  checks that its default was prevented. The keyboard flow checks visible focus outlines and native arrow keys.
- **Verified:** targeted T8 run: 27 passed, with the mobile copy of the desktop wheel test intentionally skipped.
  `npm run check`: green; 611 unit/component tests and 156 e2e tests passed, 22 intentional skips. The protected
  baseline, geometry and pixel checks pass; visual diff remains **0.775%** (29,011 px), below the 1% tolerance.

## 2026-11-03: 005-b-buy-box / T7: accessibility across purchase and cart states

- **Changed:** `e2e/b-buy-box.spec.ts` checks both purchase options before and after adding to cart at the mobile
  (375px) and desktop (1200px) project viewports. Each state uses `expectAccessibleBuyBox`, whose two axe runs and
  smoke-test integration were completed in T5. `task.md`: T7 ticked.
- **Decisions:** check the cart summary for both purchase options, so the live region is populated during each
  after-add accessibility check. The four approved contrast exceptions remain limited to the contrast-only run.
- **Verified:** `npm run check`: green; 611 unit/component tests and 129 e2e tests passed, 21 intentional skips.
  All four new browser tests pass. Visual diff remains **0.775%** (29,011 px), below the 1% tolerance. The local
  server and full check required execution outside the sandbox because sandbox networking denied the test port.

## 2026-11-03: 005-b-buy-box / T6: responsive buy box and reflow coverage

- **Changed:**
  - `BuyBox.module.css`: below 480px, option headers use a grid to keep radios beside wrapping labels, badges below
    labels and prices at the top-right. Below 1200px, the delivery row wraps and the cart button can grow beyond
    its 56px minimum height when its text wraps.
  - New `e2e/b-buy-box.spec.ts`: reflow at 1024, 768, 375 and 320px, plus 960 and 959px around the breakpoint, in
    subscription and one-time states, before and after adding to cart. Checks page overflow, local clipping,
    column geometry, square photo cards and price alignment. Quantity 10 at 320px covers $254.60 and $299.50, with
    the cart button on its own full-width row.
  - `plan.md`: responsive layout and coverage details updated before the CSS. `task.md`: T6 ticked.
- **Decisions:** kept the existing two-column grid at 960px and wider, with the photo absorbing the shrink, and the
  centred single column below it. Fixed-viewport tests run once in `mobile`; their `desktop` copies are skipped.
- **Verified:**
  - Before the CSS fix, the new tests caught prices falling below labels at 375 and 320px. All seven now pass.
  - `npm run check`: green; 611 unit/component tests passed, 125 e2e tests passed and 21 viewport-specific copies
    skipped. The protected baseline and 1200px geometry/pixel tests pass; the helper diff remains **0.775%**
    (29,011 px), under the 1% tolerance.

## 2026-11-03: 005-b-buy-box / T5: the design's CSS, geometry and pixel tests on

- **Changed:**
  - `BuyBox.module.css`: tokens, the grid, both cards, the radios, badge, select, perks, stepper, button, trust row and
    fine print, to plan.md's measurements. Also the scoped body reset (`:global(body):has(.page)`, so Part A is
    untouched) and the single-column rule below 960px (T6 tunes and tests the rest).
  - `icons.tsx`: the minus and plus are 8px wide, as in the design (were 10).
  - `playwright.config.ts`: the `visual` project launches Chromium with `--font-render-hinting=none
--disable-lcd-text`, to match the macOS-rendered reference.
  - `e2e/b-visual.spec.ts`: the geometry test (boxes within 1px, subtitle on two lines, zero-height status line) and the
    pixel test are on. `TOLERANCE` is 0.01.
  - `e2e/a11y.ts` and `e2e/smoke.spec.ts`: `expectAccessibleBuyBox` (R14's two axe runs) and the Part B smoke test
    switched to it. This is T7's first item, done early: with the design's real colours, the old single axe run fails
    on the four known contrast exceptions.
  - `plan.md`: final type values, layout notes, the rendering flags. `task.md`: T5 ticked, T7 annotated.
- **Decisions:**
  - **Title weight is 500, not 600.** The plan's starting value was 600. The ink weight of the reference matches 500
    (1556 vs 1555, against 1764 at 600), and the width needs −0.008em.
  - **Inter sizes are about 6% below the starting values** (labels 16, delivered and perks 14, button 16, fine print 12).
    The starting values came from cap heights. These match text widths to ±1.5px.
  - **Rendering flags.** Without them the same CSS scores 1.7% (hinted glyphs, coloured fringes). With them 0.8%.
  - **Half pixels.** The title's line height is 48px so the divider and cards land on x.5, like the reference.
  - **Subtitle capped at 450px.** At 468 the word "day," misses the first line by about a pixel, which is too fragile
    to leave to font metrics.
  - Small optical lifts (−1px label, +0.5px price) are `translate`, so layout stays on the measured grid.
- **Verified:**
  - Geometry test: every box within 1px. The subtitle is on two lines.
  - **Helper ratio: 0.775%** (29,011 of 3,744,000 px). **Playwright's own ratio at `maxDiffPixelRatio: 0`: 0.273%**
    (10,211 px, one temporary run, removed). Both are under `TOLERANCE` (1%) and the 3% ceiling. What is left is text
    anti-aliasing and small glyph shifts.
  - `npm run check`: green.

## 2026-11-03: 005-b-buy-box / T4: visual project, protected baseline and diff helper

- **Changed:**
  - `playwright.config.ts`: a `visual` project at 1200×780 with `deviceScaleFactor: 2` and its own
    `snapshotPathTemplate` (`{testDir}/__screenshots__/{arg}{ext}`). It runs only `b-visual.spec.ts`, and `mobile`
    and `desktop` ignore that file.
  - New `e2e/__screenshots__/buy-box.png`: the committed baseline, a byte-for-byte copy of
    `public/reference/buy-box.png`.
  - New `e2e/visual.ts`:
    - `pngSize`, read from the IHDR chunk
    - `diffImages`, an in-browser canvas diff in a scratch page, with pixelmatch's YIQ delta at a threshold of 0.2
      and no anti-aliasing excuse. It returns the ratio and a diff PNG, with differences in red over a faded copy of
      the reference.
  - New `e2e/b-visual.spec.ts`:
    - the byte check, which reads the baseline through `testInfo.snapshotPath(..., { kind: "screenshot" })`, the path
      `toHaveScreenshot` uses
    - the capture test: the nav hidden, the font check, the 2400×1560 size check, and the diff PNG and the ratio JSON
      attached and logged on every run
    - two `test.fixme` gates for T5: geometry against the layout table (with the subtitle's two lines and the
      zero-height status line), and pixels with `TOLERANCE`, which is the 3% ceiling until T5 sets it
  - `package.json`: `@types/node@^24` as a dev dependency, with the human's approval (asked before installing).
    `typecheck` now runs `tsc` on both configs.
  - New `tsconfig.node.json` and `e2e/tsconfig.json`. `tsconfig.json` now covers `src/` only. `eslint.config.js`
    gives the project service the two root tool configs through `allowDefaultProject`.
  - `plan.md`: the font check's method and the tsconfig split, before the code.
- **Decisions:**
  - **The tsconfig split.** When I asked about `@types/node`, I said `src/` still wouldn't see Node's globals. A
    probe showed that was wrong. Vite's own types (`vite/dist/node/index.d.ts`, through `vite.config.ts`) reference
    Node's, so with one shared config, `Buffer.from(...)` in `src/` typechecked. Before this task, that reference
    resolved to nothing. Browser code and Node code now have separate programs, as in Vite's own template. Re-probed:
    `Buffer` in `src/` fails the typecheck again, `@types/node` is absent from the root program, and a type error in
    `e2e/` still fails `npm run typecheck`.
  - **The font check** calls `document.fonts.load()` before `check()`. `check()` alone returns true when the
    stylesheet defined no face at all, and `load()` also fetches a face that the CSS doesn't use yet. Fraunces isn't
    used until T5.
  - **The diff runs in a separate page** opened from the same context, so the page under test is never changed.
- **Diff ratio, first recording:** 7.007% (262,359 of 3,744,000 px), with T3's unstyled page. Playwright's own
  comparator, from one probe run at `maxDiffPixelRatio: 0`, reported 221,973 px (ratio 0.06). T5 records the tuned
  ratio.
- **Verified:**
  - Helper sanity, in a throwaway probe: the reference against itself gives 0. A black page against it gives 0.969,
    because the design's dark pixels still match. It counts more differing pixels than Playwright (262,359 against
    221,973), as designed.
  - The diff image, viewed: the design's content and the unstyled page's content are both marked in red.
  - The byte check fails with its message when one byte is appended to either PNG. Both files were restored, and
    `git diff` shows the reference unchanged.
  - With Google Fonts blocked, the capture test fails with "These fonts didn't load from Google Fonts: 600 44px
    Fraunces, 400 16px Inter, ...".
  - `npm audit`: the one moderate finding (minimatch, through ESLint) was there before this dependency.
  - `npm run check` passed: 611 unit and component tests, and e2e 116 passed, 16 skipped. Those 16 are the 14
    viewport-specific skips from before and the two T5 `fixme` gates.

## 2026-11-03: 005-b-buy-box / T3: buy box markup and behaviour

- **Changed:**
  - `src/part-b/BuyBox.tsx`: the plan's markup, replacing the "Start here." stub. Native radios in a `fieldset` with
    a hidden legend, and a card click handler that ignores controls and labels and focuses the card's radio. The
    details and the fine print are removed while one-time is selected. The `form` has `noValidate`. The stepper
    buttons are `type="button"` with `aria-disabled` at the limits. The field has `inputMode="numeric"`, plus the
    non-passive wheel guard and the Enter guard. The status line is always mounted, with a `span` keyed by `seq`.
    The four `data-contrast-exception` marks are in place.
  - New `src/part-b/icons.tsx`: star, check, check-circle, chevron, minus and plus, all `aria-hidden`. T5 tunes
    their shapes.
  - New `src/part-b/BuyBox.module.css`, with only the behavioural rules: visually hidden text, the card's pointer
    cursor, the hidden spinners, `not-allowed` at a limit, the empty status line's zero margin, and a 44px minimum
    target for the stepper, the field and the button (below).
  - `plan.md`: the Enter guard's location (below), in the markup sketch, the bullet and Risks.
  - New `src/part-b/BuyBox.test.tsx` (39 tests).
- **Decisions:**
  - The Enter guard is one handler on both radios and the `select`, not on the `form`. jsx-a11y's
    `no-noninteractive-element-interactions` rejects a key handler on a form, and those three controls are exactly
    the Enter paths R10 names, so no rule is disabled. The card's click handler is the only line with a disable
    comment, as the plan says.
  - The reducer already ignores a step at a limit, so the buttons always dispatch and the limit rule lives in one
    place.
  - The visible "4.8" sits inside the stars' `aria-hidden` span, so a screen reader hears "Rated 4.8 out of 5" once.
  - The selected card's style will come from `:has(:checked)` in T5, so there's no second copy of the selection in
    the DOM. jsdom doesn't apply CSS modules, so the style is checked in e2e.
  - A 44px minimum target size, ahead of T5. With no styling, the stepper's buttons and field were under 24px and
    adjacent, and the Part B smoke test failed axe's `target-size` and `target-offset` (WCAG 2.5.8). T5 replaces it
    with the design's 56px row.
- **Found by the tests:** the subscription radio's name read "originally$29.95". The space inside the visually
  hidden span was trimmed from the accessible name, so it now sits outside the span.
- **Verified:**
  - `BuyBox.test.tsx`: 39 passed:
    - names and structure, including the rating, the select outside every label, and `noValidate`
    - the four contrast marks
    - collapse and restore, the frequency kept, and the card padding click
    - the arrow keys, + twice with the line empty, and `aria-disabled` focus at both limits
    - corrections on blur (15, 0, 2.6, empty), a cleared field keeping the total, and the wheel guard
    - both summaries, 15 then a click while focused, Enter with 15, Enter on both radios and the select, and a
      repeated add replacing the node
    - the no-inline-text check in five states
  - Five temporary breaks, each caught and then reverted: an inline `<p>Free gift</p>` (5 failures, one per state),
    no Enter guard (3), no wheel guard (1), an unkeyed status span (1), and the card click not focusing the radio (1).
  - A throwaway Playwright probe in real Chromium, then deleted. Enter on both radios and the select added nothing.
    Enter in the field with 15, and a click on "Add to cart" while the field held 15, each showed the correction
    and then the summary. The wheel left 5 unchanged.
  - `e2e/smoke.spec.ts` passed on both projects.

## 2026-11-03: 005-b-buy-box / T2: buy box reducer

- **Changed:**
  - New `src/part-b/buyBoxReducer.ts`: `State`, `Status`, the six actions, `initialState`, and two selectors,
    `total` and `summaryOf`, so the component and the tests compute the total and the summary in one place.
  - `plan.md`, before the code: three rules the transition table left open (below), and what "ignored" means.
  - New `src/part-b/buyBoxReducer.test.ts` (55 tests).
- **Decisions:**
  - Choosing the option or frequency that's already selected is ignored, and the same state object is returned.
    R10 clears the line when the selection _changes_, and a click on the selected card's padding isn't a change.
  - A commit announces a change of value, not of text, following R8 ("if the value changes"). `"1e1"`, `"05"` and
    `"3.0"` are tidied to `"10"`, `"5"` and `"3"` without a message. `""` and `"abc"` go back to the last valid
    quantity and are announced. The plan's earlier wording ("if the field's text changes") would have announced
    "Quantity set to 10" for a shopper who typed 1e1 and already had 10.
  - A correction stays on the line only until a summary has followed it. The first add after a correction shows
    both (R11). Pressing "Add to cart" again shows the summary alone, so an old correction isn't re-announced.
  - A step uses the last valid quantity, not an invalid draft. In the browser the blur commits first anyway.
- **Verified:**
  - `buyBoxReducer.test.ts`: 55 passed. They cover every action, every ignored case (a step at either limit, an
    unknown or unchanged frequency, an unchanged option, a commit with nothing to correct, a second commit), the
    line clearing on each kind of change, `seq` on a repeated add, and the correction before the summary on both
    submit paths, which also end on the same line.
  - Four temporary breaks, each caught and then reverted: an unchanged option clearing the line (1 failure),
    announcing text-only tidies (4), a repeated add keeping the old correction (1), and typing not clearing the line
    (2).

## 2026-11-03: 005-b-buy-box / T1: copy additions and buy box rules

- **Changed:**
  - `src/part-b/copy.ts`: the plan's new keys and templates, appended under a comment. `git diff` shows no removed
    or changed lines, so the provided copy is byte-for-byte as given.
  - New `src/part-b/buyBox.ts`:
    - `PurchaseOption`, `MIN_QUANTITY` and `MAX_QUANTITY`
    - `formatMoney` (en-US, USD), `unitPriceCents` and `totalCents` (unit price × quantity)
    - `parseQuantity`, `isValidQuantity` and `correctQuantity`
  - `plan.md`: `isValidQuantity` added to the file table, and `parseQuantity`'s contract written down, before the
    code.
  - New `src/part-b/buyBox.test.ts` (71 tests).
- **Decisions:**
  - `parseQuantity` accepts only an HTML valid floating-point number and returns `null` for anything else (`" 5 "`,
    `"+5"`, `"0x10"`, `"Infinity"`). A number field only ever reports `""` or such a string, so this matches the
    browser and keeps direct callers predictable. `"1e400"` parses to `Infinity` and is corrected to 10.
  - `isValidQuantity` is new. The plan's `quantity/typed` rule ("a whole number from 1 to 10") needs it, so T2's
    reducer and the tests share one definition.
  - Halves round up (`Math.round`), so 2.5 becomes 3. Negatives clamp to 1.
  - `PurchaseOption` lives in `buyBox.ts`, not the reducer, because the price helpers take it. T2 imports it.
  - Template tests pin `renewalNotice("30 days", "$25.46") === copy.finePrint`, both spec summaries, the correction
    message and "Rated 4.8 out of 5".
- **Verified:**
  - `buyBox.test.ts`: 71 passed.
  - Three temporary breaks, each caught and then reverted: `Math.trunc` for `Math.round` (2 failures), a discount
    rounded on the total, as in Part A's mock (4), and "anytime" changed to "any time" in `renewalNotice` (2).
  - `npm run check` passed: 517 unit and component tests, and e2e 114 passed, 14 skipped. Those 14 are the existing
    viewport-specific tests, skipped as before.

## 2026-11-03: 005-b-buy-box: second spec review, plan Approved

- **Changed:**
  - `spec.md`, with the human's 6 changes:
    - R10: the form has `noValidate`
    - R8: both stepper buttons are `type="button"`, and the "+ twice" criterion now expects an empty status line
    - R1, R10: the empty status line takes no height, and the shift below it is accepted
    - R11: a correction on blur followed by a submit also shows the correction, then the summary, with a new
      criterion
    - R1: the no-inline-text criterion builds its expected set from `copy.ts` values, the formatter and the
      templates
    - R12: an exact 64/540/64/468/64 grid at 1200 that shrinks, the photo column first, down to 960
  - `plan.md`, set to Approved:
    - `noValidate` in the markup and the Enter guard
    - the geometry test also asserts that the subtitle has exactly two lines (distinct `Range.getClientRects()`
      tops, with a named failure message) and that the empty status line has zero height
    - the 1024px figures
    - two more component-test cases
  - `task.md`: T3, T5 and T8 name these points.
  - The R8 wording no longer splits `cursor: not-allowed` across a code-span line break, a Prettier reflow
    artefact from the last pass.
- **Decisions:** none beyond the human's. `noValidate` is required, not cosmetic. Without it, Chrome's
  constraint validation stops the submit event, so neither the R8 correction nor `cart/added` would run on Enter
  with 15.
- **Verified:** `prettier --check .` passes. Docs only, so no code checks were needed.

## 2026-11-03: 005-b-buy-box: spec Approved, plan and tasks drafted

- **Changed:**
  - `spec.md` with the human's 11 review changes, then status Approved:
    - R2: a separate `visual` project at DPR 2, a byte-checked baseline copy, and the diff image and ratio
      attached and recorded
    - R14: two axe runs
    - R8: `aria-disabled` keeps the design's colour, plus `inputMode`, no spinners and no wheel changes
    - R11: the correction is visible
    - R4: only the header row is in the label, with a card click handler
    - R9: the last valid total is kept while the field is invalid
    - R10: Enter on a radio or the select doesn't add
    - R1: how inline text is enforced
    - R12: 1024 and 768 added
  - New `plan.md` (Draft) and `task.md` (T1–T10).
- **Decisions:**
  - **Enter blocked on radios.** Chromium submits a form on Enter in a radio button. A scratch Playwright script
    showed radio → 1 submit, select → 0, number field → 1. So Enter on a radio or the select is blocked in the
    form's `onKeyDown`.
  - **Own diff helper.** Playwright's image comparator isn't exported (`playwright-core/lib/utils` gives
    `ERR_PACKAGE_PATH_NOT_EXPORTED`). So the always-on diff image and ratio come from an in-browser canvas helper
    (pixelmatch's YIQ delta at a threshold of 0.2). `toHaveScreenshot` stays the gate.
  - **Geometry test.** It checks element boxes within ±1px. It's added because font rasterisation (the reference
    was probably captured on macOS) makes the pixel ratio noisy, and the geometry test still catches layout
    drift.
  - **Selected border.** A 1px border plus an inset 1px shadow. The radio is at x 689 in both cards, so the
    measured 2px green border can't be a real 2px border without shifting the content.
  - **Tolerance.** The measured ratio rounded up to the next 0.5%, with a ceiling of 3%. Above the ceiling, the
    agent stops and asks the human.
- **Verified:**
  - Measured the reference with scratch Pillow scripts:
    - columns 64/540/64/468/64
    - every band's position
    - 15 colour tokens
    - radii
    - cap heights for the starting font sizes
  - Matched `product.jpg` at 500×500, centred in the card, with a mean error of 0.15/255 (others were 0.77 or
    worse).
  - Confirmed that "−" and "+" are both `#4a5550` in the reference.

## 2026-11-03: 005-b-buy-box: spec drafted

- **Changed:** `SPECS/005-b-buy-box/spec.md` with status Draft: R1–R14, acceptance criteria, out of scope and
  known limitations.
- **Decisions:**
  - Settled with the human:
    - one-time collapses the subscription details and hides the fine print
    - totals are unit price × quantity
    - quantity is 1–10, by typing or buttons, and clamped when the field loses focus
    - "Add to cart" shows and announces a summary
    - the design's colours ship unchanged, even where they fail AA contrast
  - Agent decisions, open to review in the spec:
    - native `select` and native radios
    - `aria-disabled` stepper buttons, so focus isn't lost at a limit
    - a one-column layout below a breakpoint chosen in the plan
    - new strings and templates go into `copy.ts`
    - the visual test hides the app's nav, and the app keeps it
- **Verified:** the reference is 2400×1560, so 1200×780 at 2x, which matches the existing `desktop` project.
  Sampled the text colours from it with a scratch Pillow script. Four texts fail 4.5:1: the eyebrow, the reviews
  link and the fine print at 4.27, and the struck-through price at 2.87. Everything else is 5.2:1 or higher.

## 2026-11-03: deploy: add vercel.json

- **Changed:** `vercel.json`: the Vite preset, `npm ci`, `npm run build` (typecheck, then `vite build`), output
  `dist`.
- **Decisions:** no rewrites. The app has one page and routes only through query params (`?part=`,
  `?fixture=`, `&conflict=`), so every link serves `index.html` as-is. `npm ci` installs from the lockfile.
- **Verified:** `npm run build` passes locally and writes `dist/` with `index.html`, `product.jpg` and
  `reference/`. Prettier accepts `vercel.json`.

## 2026-11-03: 002-a-skip-shipment: marked Implemented

- **Changed:** `SPECS/002-a-skip-shipment/spec.md`: status Implemented, and the last open criterion (R1, no skip
  button when paused, cancelled or locally cancelled) is ticked. The human asked for this.
- **Decisions:** the criterion was waiting on 004's local cancel. It is covered now by three tests:
  - `SubscriptionCard.test.tsx`: paused and cancelled have no buttons
  - `CancelDialog.test.tsx` (004 T5): after a local cancel, the only button is "Undo cancellation"
  - `cancelReducer.test.ts`: `skip/opened` is ignored while locally cancelled
- **Verified:** every 002 task and criterion is ticked. `npm run check` passed with the 004 T10 run, and this
  change touches docs only.

## 2026-11-03: 004-a-cancel-retention / T10: the skip offer to the end, and the leave prompt after Undo

- **Changed:**
  - `e2e/a-cancel.spec.ts`:
    - "Too much product" → "Skip my Dec 16 order" → confirm. "Skipped. Your next order is Jan 15, 2027." is
      announced, no dialog stays open, focus is on "Skip next order" (002 R6), and the status is still Active.
    - "I'm trying a different product" → its skip offer → confirm, with `conflict=always`. 002's 409 alert shows,
      only one modal is open, and focus is on "Keep my order". Keep closes it with Dec 16 unchanged.
    - The Undo-with-changes test now also follows the "Part B" link. The browser asks first (`beforeunload`),
      staying keeps the page, and the pending lines are still there.
    - New helpers: `SLOW`, `CONFLICT_MESSAGE`, and a `conflict` parameter for `load`.
  - `spec.md`: status Implemented. All tasks and acceptance criteria are ticked.
- **Decisions:** the 409 flow uses the "different product" skip offer, so both skip offers run end to end against
  the real mock.
- **Verified:**
  - Two temporary breaks, each caught and then reverted:
    - no leave warning after a cancel has happened: the Undo test fails on both projects
    - the skip offer not handing over to `skip/opened`: 6 tests fail (3 per project)
  - `npm run check` passed: 446 unit and component tests, and e2e 114 passed, 14 skipped.

## 2026-11-03: 004-a-cancel-retention / T9: the fallbacks

- **Changed:**
  - `src/part-a/CancelDialog.test.tsx`: 4 new tests in "the fallbacks (R3, R4)":
    - with no next order date, "too much" shows only "Ship every 60 days"
    - with no next order date, "different product" has no "Instead, you can:" and no list
    - a pending Multivitamin 1 leaves only the frequency offer, at $63.67
    - with 90 days and Multivitamin 1 pending, "costs" shows no offer and no lead, only the cancel, Back and Keep
  - `src/part-a/cancel.test.ts`: a server at 90 days with every quantity at 1 has no "costs" offer.
  - `spec.md`: the no-offer criterion is ticked.
- **Decisions:** no code change was needed. These tests pin behaviour that came from T1 and T4.
- **Verified:**
  - The new tests passed straight away, because they pin existing behaviour. Two temporary breaks show they can
    fail, and both were reverted:
    - the lead shown with no offers: 4 tests fail, 2 of them new
    - quantity offers built from the server's quantities instead of the pending ones: 8 tests fail, 2 of them new
  - `npm run check` passed: 446 unit and component tests, and e2e 110 passed, 14 skipped.

## 2026-11-03: 004-a-cancel-retention / T8: at most 2 quantity offers

- **Changed:**
  - `src/part-a/cancel.ts`: `quantityOffers` builds every candidate with its saving, sorts by saving (largest
    first), and keeps `MAX_QUANTITY_OFFERS` (2).
  - `src/part-a/cancel.test.ts`: 4 new tests:
    - the two largest savings, in order
    - a tie keeps the server's order
    - the cap is applied after the `quantityOptions` filter
    - ranking uses the pending quantities
  - The T1 test "in server order" now expects the largest saving first, as R3 now says. With Vitamin D at 3
    pending, the Multivitamin's $38.21 comes before Vitamin D's $25.46.
  - `src/part-a/cancelReducer.test.ts`: an offer the cap left out is ignored.
  - `src/part-a/CancelDialog.test.tsx`: three items at 2 show the Multivitamin ($38.21), then Vitamin D ($25.46),
    and no fish oil ($16.15). Taking the second offer applies it.
  - `spec.md`: the cap criterion is ticked.
- **Decisions:**
  - The sort is `Array.prototype.sort`, which is stable since ES2019, so ties keep the server's order without a
    tie-breaker.
  - No reducer change was needed. `cancel/offerTaken` compares against `offersFor`, so it rejects a capped-out offer
    by itself.
- **Verified:**
  - The 4 new unit tests failed before the change.
  - A temporary break (a cap of 3) failed 4 tests, and was reverted.
  - `npm run check` passed: 441 unit and component tests, and e2e 110 passed, 14 skipped.

## 2026-11-03: 004-a-cancel-retention / T7: edge cases and e2e flows chosen

- **Changed:**
  - `spec.md`:
    - R3: at most 2 quantity offers, the largest saving first, with ties in the server's order
    - R3: the "Other" text is cleared on Back or on closing
    - two new acceptance criteria (the cap, and no offers at 90 days with every quantity at 1)
    - Known limitations: R9 is unit-tested only. The old line said "not tested", which has been wrong since T2.
      The status stays Approved, because the human made these decisions.
  - `plan.md`: the cap in `offersFor`, and its unit cases.
  - `task.md`: T7 ticked, and new tasks T8 (the cap), T9 (the fallbacks) and T10 (the skip offer to the end, a 409,
    and the `beforeunload` prompt after Undo).
- **Decisions:**
  - The human chose the "skip offer to the end" e2e flow and gave a table of edge cases, 10 to 17.
  - Already covered, so no new task:
    - 16 ("Other" text cleared): the component test for Back already covers it, and the spec now says so
    - 17 (R9): unit-tested since T2
    - 15 (Undo brings back the leave warning): asserted in a T5 component test, and T10 adds the real browser
      prompt
  - 12 (a pending quantity of 1) is unit-tested. T9 adds a component test.
  - 13 (several items): a cap of 2, the largest saving first, chosen by the human over 2 in server order and over
    1. The frequency offer stays first.
- **Verified:** docs only. `prettier --check` is clean.

## 2026-11-03: 004-a-cancel-retention / T6: cancel e2e

- **Changed:**
  - New `e2e/a-cancel.spec.ts` (22 tests on each project, 40 run, the 320px ones on mobile only):
    - for each of the five reasons: 3 activations to the cancelled view, then Undo. The mobile project uses real
      taps (`hasTouch`), the desktop one clicks.
    - keyboard only: Tab to the trigger, Enter, Tab to "I didn't see results", Enter, Tab to "Yes, cancel my
      subscription", Enter. Then focus is on the h1 and the status region has the announcement. Then Tab to Undo
      and Enter.
    - "Too much product" → "Skip my Dec 16 order": the skip dialog with Dec 16 and Jan 15, 2027, only one modal
      open, and focus on "Keep my order"
    - a pending 90 days: "It costs too much" offers only the quantity
    - "Ship every 60 days": the dialog is gone, Active, the pending line, the announcement, focus on "Change your
      plan"
    - cancel with a frequency and a quantity pending, then Undo: the same lines and the same $63.67
    - Esc and "Keep my subscription" at step 1 and at step 2
    - axe and reflow at 375px, 1200px and 320px for step 1, step 2 ("Other" and "It costs too much") and the
      cancelled view
  - `spec.md`: every acceptance criterion is ticked, because each one now has an e2e test. The status stays
    Approved until T7.
  - `plan.md` (Testing): the reflow check also looks inside the open dialog and inside each button.
- **Decisions:**
  - Found while testing: `white-space: nowrap` on the offer buttons passed the first version of the reflow tests.
    The page's scroll width can't see overflow inside a modal, because the modal sits in the top layer with its own
    overflow. The check now also fails when the open dialog or any button is wider inside than its box. 002's skip
    e2e has the same blind spot, but its labels are short. I left it unchanged, because it is outside this task.
  - A locator fix: `getByText(/^Status: /)` matched the badge's visually hidden span. The badge locator is now
    `a-overview.spec.ts`'s.
- **Verified:**
  - Three temporary breaks, each caught and then reverted:
    - the focus effect keyed on `state.focus` again: 12 tests fail (every Undo focus, both projects)
    - a cancel that wipes `local`: 2 tests fail (Undo with pending changes)
    - `white-space: nowrap` on the offer buttons: 3 tests fail ("It costs too much" at 1200px, 375px and 320px).
      This break was missed before the overflow check was added.
  - `npm run check` passed: 434 unit and component tests, and e2e 110 passed, 14 skipped (the 320px and 640×320
    tests on the desktop project).

## 2026-11-03: 004-a-cancel-retention / T5: local cancel and Undo

- **Changed:**
  - `src/part-a/views.tsx`: `CancelledView` takes an optional `onUndo`. When it is set, the view shows "Your
    subscription is cancelled. You won't be charged again." and an "Undo cancellation" button instead of "Cancelled
    on …", then the server's products.
  - `src/part-a/SubscriptionCard.tsx`: `StatusView` passes `onUndo` only when the server is active, so the cancelled
    fixture never offers Undo (R8). It dispatches `cancel/undone`.
  - `src/part-a/SubscriptionCard.tsx`: the focus effect runs on every new `state`, not only when `state.focus`
    changes (fix, see Decisions).
  - `src/part-a/CancelDialog.test.tsx`: 14 more tests (58 in all). They cover:
    - 3 clicks to the cancelled view for each of the five reasons (R7)
    - the announcement, and focus on the h1 rather than on Undo
    - no date, the server's products, and Undo as the only button
    - no request sent
    - the leave warning off while cancelled
    - Undo: the active view, its announcement and h1 focus (R8)
    - Undo brings back a pending frequency and quantity, with their lines, the new total and the leave warning
    - cancelling again after Undo starts at step 1
    - no Undo for the cancelled fixture
- **Decisions:**
  - Fixed while testing: after cancel, Undo left focus on `<body>`. Both transitions ask for `heading`, so a focus
    effect keyed on `state.focus` didn't run the second time, and the Undo button had already unmounted. The effect
    is now keyed on the whole state. That is safe because every accepted action starts from `focus: null` and an
    ignored one returns the same object, so it runs once per transition that asks for focus. This also covers any
    later pair of transitions with the same target. The reducer and the plan are unchanged.
  - "Undo cancellation" uses the primary button style, because it is the only action in that view. Focus goes to
    the h1, not to the button, as the plan says, so it can't be pressed by mistake right after confirming.
  - The message tests ignore the status region, which repeats the same text by design (R7).
- **Verified:**
  - Two temporary breaks, each caught and then reverted:
    - the focus effect keyed on `state.focus` again: the Undo focus test fails
    - Undo offered for every cancelled view: 4 tests fail (the new one, two 001 cancelled tests and one 002 R10
      test)
  - `npm run check` passed: 434 unit and component tests, and e2e 70 passed, 10 skipped (the same
    viewport-specific skips). The real-browser checks (axe, reflow and keyboard for the cancelled view) are T6.

## 2026-11-03: 004-a-cancel-retention / T4: step 2 and taking an offer

- **Changed:**
  - `src/part-a/CancelDialog.tsx`: step 2 has `<h2 tabIndex={-1}>Cancel your subscription?</h2>`. Then, when
    `offersFor` returns any offers, "Instead, you can:" and a `<ul>` of offer buttons. For "Other", the optional
    "Tell us more (optional)" `<textarea>`. Then "Yes, cancel my subscription", and "Back" and "Keep my
    subscription" side by side.
  - `src/part-a/SubscriptionCard.tsx`: dispatches `cancel/offerTaken`, `cancel/confirmed` and `cancel/back`, and
    passes the server data, `local` and the heading ref to the dialog.
  - `src/part-a/SubscriptionCard.module.css`: `.button--block`, shared by the offers and the cancel, and
    `.textarea`. `.textarea` and `.dialog__title` are in the focus-visible list.
  - `src/part-a/CancelDialog.test.tsx`: 29 more tests (44 in all). They cover:
    - step 2's name, focus and buttons for each reason
    - the shared class, and no button named "Cancel subscription"
    - the textarea for "Other" only, lost on Back
    - a pending 90 or 60, and no next order date
    - Back's focus for every reason
    - Esc, the native close and Keep at step 2
    - both skip offers (R5)
    - both frequency offers and the quantity offer (R6)
- **Decisions:**
  - "Yes, cancel my subscription" is wired now, because its reducer case exists since T2. T5 still owns the
    cancelled view's message, Undo and their tests.
  - The textarea is uncontrolled. It is never read or sent, and it unmounts with the step, so it needs no state.
  - The offers are rebuilt from `offersFor` on every render. The reducer checks the offer again when it is taken.
- **Verified:**
  - Three temporary breaks, each caught and then reverted:
    - Back always focusing the first reason: 4 tests fail
    - the cancel styled apart from the offers: 1 test fails
    - no `plan-heading` focus after an R6 offer: 3 tests fail
  - In Chrome (dev server, 320px, mobile emulation):
    - Step 2 for "It costs too much" has no horizontal scroll in the page or the dialog. The offers wrap to 3
      lines (88px), and every button is at least 44px.
    - The R5 swap leaves exactly one modal open, the skip dialog. Focus stays on "Keep my order" after the cancel
      dialog's queued `close` event. Closing it focuses "Skip next order".
  - `npm run check` passed: 420 unit and component tests, and e2e 70 passed, 10 skipped.

## 2026-11-03: 004-a-cancel-retention / T3: trigger, step 1 and leaving the flow

- **Changed:**
  - `spec.md` (R3, R10 and the R10 criterion) and `plan.md` (texts, UI decisions, testing): both steps end with a
    secondary "Keep my subscription". The status stays Approved, because the human chose this.
  - `src/part-a/views.tsx`: a secondary "Cancel subscription" button ends `ActiveView`, after "Change your plan".
  - New `src/part-a/CancelDialog.tsx`: the `<dialog>`, named by the current step's `<h2>`. Step 1 is a `<ul>` of
    five reason buttons, then "Keep my subscription". Esc, the native `close` and Keep all dispatch `cancel/closed`.
  - `src/part-a/SubscriptionCard.tsx`: one layout effect for both dialogs, which runs every `close()` before any
    `showModal()` (R5). The skip dialog's ref is renamed `skipDialogRef`. `CancelDialog` renders after `SkipDialog`.
  - `src/part-a/SubscriptionCard.module.css`: `.options` and `.option` (full width, at least 44px, left-aligned,
    wrapping), and `.option` in the focus-visible list.
  - New `src/part-a/CancelDialog.test.tsx` (15 tests).
- **Decisions:**
  - The gap: the plan gave step 1 no visible exit, so a phone, which has no Esc, could only leave by cancelling. The
    human chose "Keep my subscription" on both steps over "step 1 only" and a × icon.
  - The reasons use a neutral outlined `.option` style, not the accent button. Seven accent buttons in a row would
    give the reasons the visual weight of actions.
  - `CancelDialog` comes after `SkipDialog` in the DOM, so the existing tests that take the first `<dialog>` still
    find the skip one.
- **Verified:**
  - Two temporary breaks, each caught and then reverted: the trigger without its ref (focus doesn't return, 3
    tests fail), and a layout effect that never closes the cancel dialog (the Keep test fails).
  - `npm run check` passed: 391 unit and component tests, and e2e 70 passed, 10 skipped.

## 2026-11-03: 004-a-cancel-retention / T2: reducer cancel layer

- **Changed:**
  - `src/part-a/subscriptionReducer.ts`:
    - `CancelFlow`, and the new `cancel` and `cancelled` fields
    - the seven `cancel/*` actions from the plan's table
    - three focus targets: `cancel-button`, `cancel-reason` and `cancel-heading`
    - `viewOf(server, cancelled)`, which `activeServer` now uses. `skip/opened` and every `plan/*` case go through
      it, so a local cancel blocks them (R9)
    - `load/started` closes the flow and keeps `cancelled` (R8)
  - `src/part-a/SubscriptionCard.tsx`: passes `cancelled` to `viewOf` in `StatusView` and `warnOnLeave`, and has
    the three new refs in the focus map, which is now typed `Record<Focus, …>`. The refs are attached in T3 and T4.
  - `src/part-a/skip.ts`: the `canSkip` comment only.
  - New `src/part-a/cancelReducer.test.ts` (58 tests), and three R9 `viewOf` tests in `subscriptionReducer.test.ts`.
  - `plan.md`: added "Never two modals" and the "label included" offer check.
- **Decisions:**
  - `cancel/offerTaken` hands the offer to the `skip/opened`, `plan/frequency` or `plan/quantity` case. If that
    case ignores it, the whole action is ignored. The skip handover keeps 002's focus (`keep`, or `check-again`
    when the data is stale). The frequency and quantity handovers focus `plan-heading`.
  - The offer check compares every field, label included, so an offer whose saving text has changed is stale too.
  - `skip/opened` is also ignored while the cancel flow is open (new guard, added to the plan first).
  - Fixed while testing: `plan/discarded` only checked `load.kind === "ready"`, so a stray discard during a local
    cancel would have wiped the changes that Undo must bring back. It now uses `activeServer`, as the plan says
    every `plan/*` case does. 003 is unchanged, because Discard is only rendered in the active view.
- **Verified:**
  - The new `plan/discarded` test failed before the fix and passed after it.
  - Three temporary breaks, each caught and then reverted: no label check, a local cancel that beats a paused
    server, and `load/started` leaving the flow open.
  - `npm run check` passed: 376 unit and component tests, and e2e 70 passed, 10 skipped (the existing
    viewport-specific skips).

## 2026-11-03: 004-a-cancel-retention / T1: cancel rules

- **Changed:**
  - `SPECS/004-a-cancel-retention/plan.md`: status set to Approved by the human.
  - New `src/part-a/cancel.ts`:
    - `Reason` and `REASONS` (R2)
    - `Offer` and `slowerFrequency` (R4)
    - `offersFor(reason, server, local)`, which builds the offers and their texts from the server's data and the
      pending 003 changes (R3)
  - `src/part-a/plan.ts`: new `pendingItems(server, pending)`, which `totalAfter` and `offersFor` both use. The
    plan's file table didn't list `plan.ts`, but the change is a pure extraction, and 003's behaviour is unchanged.
  - New `src/part-a/cancel.test.ts` (22 tests), and two `pendingItems` tests in `plan.test.ts`.
- **Decisions:**
  - The skip offers check `canSkip`, so a missing next order date shows no skip.
  - A quantity offer is left out when one unit less isn't in `quantityOptions`, for example 11 for a server 12.
  - The totals always come from the item prices, so the offers still work without `nextChargeTotalCents`.
  - The tests pin the spec's reason for using totals. With the fixture, the saving is $38.20, where the unit price
    would give $38.21. With Vitamin D 3 pending, the same Multivitamin saving comes out at $38.21.
- **Verified:**
  - `cancel.test.ts` and `plan.test.ts`: 53 passed.
  - Three temporary breaks, each caught and then reverted: a unit-price saving, ignoring a pending frequency, and
    no `quantityOptions` check.
  - `npm run check` passed: 315 unit and component tests, and e2e 70 passed, 10 skipped. Those 10 are the
    existing viewport-specific tests, skipped as before.

## 2026-11-03: 004-a-cancel-retention / spec rename, plan and tasks

- **Changed:**
  - `SPECS/004-a-cancel-retention/spec.md`: at the human's request, the step 2 confirm button is now "Yes, cancel
    my subscription" in R3, R7 and the R3 criterion, so it no longer shares the trigger's name "Cancel
    subscription". R1 and R10 still name the trigger. The status stays Approved, because the human made the change.
  - New `plan.md` (Draft) and `task.md` (T1–T7).
- **Decisions:**
  - The local cancel is a top-level `cancelled` field, not part of `Local` as 003's plan suggested. That way
    `plan/discarded` can never reset it.
  - Taking an offer reuses the reducer's `skip/opened`, `plan/frequency` and `plan/quantity` cases, and the offer
    is checked against `offersFor` first.
  - `viewOf(server, cancelled)` is the one R9 rule, and it also guards `plan/*` and `skip/opened`. `canSkip` keeps
    one argument.
  - Offers that can't apply are left out: a skip offer without a next order date, and a quantity offer whose
    lowered value isn't a choice.
  - The step 2 title, the "Instead, you can:" lead, the undo announcement and the textarea label aren't in the
    spec. The plan proposes them for review.
- **Verified:** no code touched, only specs. Prettier checked on the edited Markdown.

## 2026-11-03: 003-a-plan-changes / T10: warn before leaving with pending changes

- **Changed:**
  - `src/part-a/SubscriptionCard.tsx`: `warnOnLeave` is true when the subscription is ready, the view is active and
    something is pending. While it is true, an effect adds a `beforeunload` listener that calls `preventDefault()`
    and sets `returnValue`, and the effect's cleanup removes it.
  - `src/part-a/PlanChanges.test.tsx`: six R9 tests. They check that a cancelable `beforeunload` is prevented with a
    frequency or a quantity pending, and is not prevented after Discard, after setting every value back, after a 409
    reload shows the subscription paused, or after unmount.
  - `e2e/a-plan.spec.ts`: two R9 tests.
    - With changes pending, the "Part B" link raises a `beforeunload` dialog. Dismissing it keeps the URL, the
      lines and the controls, and after Discard the same link navigates with no second prompt.
    - With nothing pending, the link navigates with no prompt.
  - `SPECS/003-a-plan-changes/spec.md`: the R9 criterion ticked. Every criterion is now ticked, and the status is
    `Implemented`.
- **Decisions:**
  - No reducer state. The warning is derived from `pendingOf` on each render, so every way of ending the changes
    ends the warning too.
  - `returnValue = true` rather than a message, because browsers show their own text (Known limitations).
  - A reload with a change pending isn't tested in e2e. Dismissing the prompt cancels the reload, so
    `page.reload()` would wait for a load that never comes. The nav link exercises the same listener.
- **Verified:**
  - 291 unit and component tests.
  - The R9 e2e tests ran with `--repeat-each=5` on both projects: 20 passed.
  - Six temporary breaks, each caught and then reverted. The component tests caught four: no `preventDefault`, no
    active-view check, no cleanup, and warning with nothing pending. The e2e tests caught two: no listener at all,
    and warning with nothing pending.
  - `npm run check` passed: e2e 70 passed, 10 skipped.

## 2026-11-03: 003-a-plan-changes / T9: "After that" without a next order total

- **Changed:**
  - `src/part-a/PlanChanges.test.tsx`: with `nextChargeTotalCents: null`, Multivitamin 2 → 1 still shows "After
    that: $63.67 per order", and the next order shows no amount.
  - `SPECS/003-a-plan-changes/spec.md`: the R4 criterion ticked.
- **Decisions:** no code change. `totalAfter` already builds the total from the item prices and the discount, so this
  test pins the behaviour the human chose.
- **Verified:**
  - 285 unit and component tests, plus typecheck, lint and Prettier.
  - A temporary break, `totalAfter` returning null without `nextChargeTotalCents`, was caught and reverted.
  - E2e was not rerun, because only a test file changed. It runs in the full check after T10.

## 2026-11-03: 003-a-plan-changes / T8: server values outside the options

- **Changed:**
  - `SPECS/003-a-plan-changes/spec.md`: status set to Approved (R1–R9) after the human approved the edge-case
    round. The R1 (45 days) and R2 (quantity 12) criteria are ticked.
  - `src/part-a/plan.ts`: `frequencyOptions(server)` and `quantityOptions(item)`, each the fixed list plus the
    server's own value, in numeric order.
  - `src/part-a/subscriptionReducer.ts`: `plan/frequency` and `plan/quantity` validate against those lists, so the
    server's 45 or 12 can be picked back to clear a change (R5). Any other value outside the range is still ignored.
  - `src/part-a/PlanChanges.tsx`: the radios and options render from the same lists.
  - Tests: `plan.test.ts` (values inside, below, between and above the range, and the constants left unchanged),
    `planReducer.test.ts` (45 and 12 taken back, 15, 11 and another item's 12 ignored), `PlanChanges.test.tsx` (4
    radios with "Every 45 days (current)" checked, 11 options with "12 (current)" selected, "12 → 3" and back).
- **Decisions:**
  - One helper, `withServers`, builds both lists, so the reducer and the view can't disagree about what can be picked.
- **Verified:**
  - 284 unit and component tests.
  - Five temporary breaks, each caught by the new tests and then reverted: the radios and the options from the fixed
    lists, the reducer validating against the fixed lists (two breaks), and the helper not sorting.
  - `npm run check` passed: e2e 66 passed, 10 skipped.

## 2026-11-03: 003-a-plan-changes / T7: edge-case round

- **Changed:**
  - `SPECS/003-a-plan-changes/spec.md`: four decisions from the human. The status says the round awaits review.
    - R1: a server interval outside 30/60/90 gets a fourth radio, "Every 45 days (current)", in numeric order.
    - R2: the server's quantity is always an option, even outside 1–10 ("12 (current)").
    - R4: "After that" shows even without `nextChargeTotalCents`.
    - New R9: a `beforeunload` prompt while pending changes are shown.
    - Four new acceptance criteria, and two Known limitations: the prompt text is the browser's, and Mobile Safari
      ignores `beforeunload`.
  - `SPECS/003-a-plan-changes/plan.md`:
    - `frequencyOptions` / `quantityOptions` in `plan.ts`, which the reducer validates against.
    - The R9 effect in `SubscriptionCard`, and the edge-case tests.
    - The "values the mock never sends" risk now records the decision.
  - `SPECS/003-a-plan-changes/task.md`: T7 ticked; T8–T10 added.
- **Decisions:**
  - Quantity above 10 was raised as a likely bug, not a nice-to-have. A controlled `<select>` with no matching
    option shows its first option, so the page would have shown "1" for a server quantity of 12.
  - The human declined the arrow-key burst and the paused/cancelled e2e flows.
  - R9 warns only while the changes are shown (R7). Warning about changes hidden behind a paused view would be
    confusing.
  - The warning is an effect in `SubscriptionCard` derived from `pendingOf`, with no new reducer state, so Discard,
    setting back and a fresh server end it by themselves.
- **Verified:** spec, plan and task changes only. Prettier checked; no code touched.

## 2026-11-03: 003-a-plan-changes / T6: e2e for plan changes

- **Changed:**
  - New `e2e/a-plan.spec.ts`: 7 tests against the real mock on both projects (the 320px one runs on mobile only):
    - keyboard only: Tab to the checked radio, ArrowDown to 60, Tab twice to the Multivitamin select, and ArrowUp
      for a quantity of 1. It checks both announcements, the lines, "After that: $63.67 per order", and that Dec
      16, $101.87 and "Every 30 days" are unchanged.
    - a skip with `conflict=never`: the dialog's pending-frequency sentence, then "Starting after your Jan 15,
      2027 order:" with the changes kept.
    - `conflict=always`: after the 409 and its reload, the dialog and the page keep both changes (002 R11).
    - Discard by keyboard: focus on the heading, "Changes discarded.", the controls back to "(current)", and the
      next Tab goes to the frequency group.
    - Setting the frequency back clears its line and Discard.
    - With changes pending: axe WCAG 2.2 A/AA and no horizontal scroll at 375px and 1200px, 44px radio rows and
      select, and at 320px the selects fit inside `main`.
  - `SPECS/003-a-plan-changes/spec.md`: Known limitations said hiding while not active (R7) "is not tested". T2 and
    T3 test it in the reducer and the views, so it now says it isn't tested end to end.
- **Decisions:**
  - The changes in the skip, 409 and axe tests are made with the mouse (`check`, `selectOption`). Keyboard input
    has its own test, so the others stay short.
  - The added "setting back" test (R5) isn't in the plan's list. It's the one R5 path the other flows don't touch,
    and it costs 3s.
- **Verified:**
  - `--repeat-each=5` on both projects: 65 passed, 5 skipped (the 320px test on desktop), no flakes.
  - Mutations, mobile project:
    - `refresh/succeeded` dropping `local` fails the 409 test.
    - Discard focus going to the skip button fails the Discard test.
    - `pendingIntervalDays={null}` fails the skip and 409 tests.
  - `npm run check` green: 266 unit and component tests, e2e 66 passed, 10 skipped (9 before, plus the new 320px
    test on desktop).

## 2026-11-03: 003-a-plan-changes / T5: plan changes with the skip flow

- **Changed:**
  - `src/part-a/SubscriptionCard.tsx`: `SkipDialog` gets `pendingOf(server, local).intervalDays` instead of `null`.
  - `src/part-a/SkipDialog.tsx`: the prop's doc comment no longer says "Null until 003".
  - `src/part-a/PlanChanges.test.tsx`: 8 component tests (36 in all) through `SubscriptionCard`. They cover the
    dialog sentence with a pending frequency and without one, the status region cleared on open, "starting after"
    moving to Jan 15, 2027 after a skip, and changes kept through a 409 and its reload and through a failed reload.
    A fresh server that now has the picked value, or has dropped a product, stops showing that change.
  - `SPECS/002-a-skip-shipment/spec.md`: ticked R11, and Known limitations now says 003 T5 ticked it. 002 R3 was
    already ticked from hand-built data, and is now also covered through the real wiring.
  - `SPECS/003-a-plan-changes/spec.md`: ticked the R3 skip criterion, so all five 003 criteria are ticked.
- **Decisions:** none new. No reducer change was needed: `local` already survives `skip/*` and `refresh/*` (T2),
  and `pendingOf` does the R7 comparison at render time.
- **Verified:**
  - Mutation: passing `null` to the dialog again fails the 002 R3 and R11 tests. Passing the raw
    `local.intervalDays` survives, but it is an equivalent mutant: `SkipDialog` already hides the sentence when the
    value equals the server's.
  - `npm run check` green: 266 unit and component tests, e2e 53 passed, 9 skipped.

## 2026-11-03: 003-a-plan-changes / T4: pending changes, "After that" and Discard

- **Changed:**
  - `src/part-a/PlanChanges.tsx`: a `PendingChanges` block, shown only while `hasPending`. It has one "Starting
    after your Dec 16 order:" intro, a list (frequency first, then products in server order), "After that: {total}
    per order" while a quantity is pending, and a secondary "Discard changes" button.
  - `src/part-a/SubscriptionCard.module.css`: the pending block on the muted surface.
  - `src/part-a/PlanChanges.test.tsx`: 12 more component tests (28 in all) for the lines, the total, the date
    (next year, no date), setting back, Discard by click and keyboard, and every announcement.
  - `SPECS/003-a-plan-changes/spec.md`: ticked the R1/R3, R2/R4, R5 and R6 criteria. The R3 skip criterion is T5.
- **Decisions:**
  - The arrow is `aria-hidden` and followed by a visually hidden "to", as the plan says. The test asserts both, so
    a screen reader gets "2 to 1".
  - The intro capitalizes `startingAfter(...)` at render time rather than adding a second helper, so there is one
    source for the text.
- **Verified:**
  - Mutations: detaching the heading ref fails both Discard focus tests. Dropping `aria-hidden` on the arrow fails
    the quantity-line test.
  - Screenshot at 320px with both changes pending: the lines and the total wrap inside the block.
  - `npm run check` green: 258 unit and component tests, e2e 53 passed, 9 skipped.

## 2026-11-03: 003-a-plan-changes / T3: the "Change your plan" controls

- **Changed:**
  - New `src/part-a/PlanChanges.tsx`: an `<h2 tabIndex={-1}>` section with the "How often" fieldset (3 radios,
    one `useId()` name) and a labelled 1–10 `<select>` per item. The server's value says "(current)". Both are
    controlled from `pendingOf(...)`, falling back to the server's values.
  - `src/part-a/views.tsx`: `ActiveView` renders it after the products and takes a `plan` prop to pass through.
  - `src/part-a/SubscriptionCard.tsx`: builds `plan` (the `local` slice, the heading ref, the three dispatches) and
    passes it through `StatusView`.
  - `src/part-a/SubscriptionCard.module.css`: fieldset, 44px radio rows, a full-width select (20rem max from
    48rem), and focus outlines for the heading, the radios and the select.
  - New `src/part-a/PlanChanges.test.tsx`: 16 component tests for roles, names, options, order, and no form,
    number input or stepper.
  - `src/part-a/SubscriptionCard.test.tsx`: the heading list now includes "Change your plan".
  - `e2e/a-overview.spec.ts`: the 001 test's "Every 30 days" locator is scoped to the "Next order" section.
    It also matched the new radio label "Every 30 days (current)" (strict mode violation), so the page wasn't
    wrong.
- **Decisions:** `ActiveView` takes one `plan` prop of type `Omit<PlanChangesProps, "subscription">` rather than
  six separate props, so `StatusView` passes it on without listing them.
- **Verified:**
  - Screenshot of the section at 320px and 375px: the long Multivitamin label wraps above its select, and
    "2 (current)" fits.
  - `npm run check` green: 244 unit and component tests, e2e 53 passed, 9 skipped. The overview test's axe and
    no-horizontal-scroll check now covers the section.

## 2026-11-03: 003-a-plan-changes / T2: reducer plan layer

- **Changed:**
  - `src/part-a/subscriptionReducer.ts`: `State.local`, the `plan/frequency`, `plan/quantity` and
    `plan/discarded` actions with their announcements, and the `plan-heading` focus target.
  - `src/part-a/SubscriptionCard.tsx`: `planHeadingRef` in the focus effect's targets, so the map stays complete.
    T3 attaches it to the heading.
  - New `src/part-a/planReducer.test.ts`: 46 unit tests, one describe per action, as in `skipReducer.test.ts`.
- **Decisions:**
  - Plan changes are accepted only for a loaded, active server. `plan/discarded` only needs a loaded server and
    something pending, as the plan table says.
  - A quantity set back to the server's value deletes the key, so `local` never stores a non-change.
  - The "After that" total in the quantity announcement covers every pending quantity, not only the one that
    changed, because it is the same figure the page shows.
  - `plan/discarded` is ignored when the stored values all equal a fresh server's (R7), because nothing is pending
    and there is no button to discard with.
- **Verified:**
  - Mutations: dropping Discard's "something pending" guard fails 2 tests. Taking "from" from the previous pick
    instead of the server fails 3.
  - `npm run check` green (unit, plus e2e 53 passed, 9 skipped as before).

## 2026-11-03: 003-a-plan-changes / T1: plan rules

- **Changed:**
  - `SPECS/003-a-plan-changes/plan.md`: status `Approved` by the human. `Local` is declared in `plan.ts`.
  - New `src/part-a/plan.ts`: `Local`, `FREQUENCIES`, `QUANTITIES`, `pendingOf`, `hasPending`, `totalAfter` and
    `startingAfter`.
  - New `src/part-a/plan.test.ts`: 21 unit tests.
- **Decisions:**
  - `Local` lives in `plan.ts` rather than the reducer, so `plan.ts` never imports the reducer. T2 imports it.
  - `totalAfter` imports `totalAfterDiscount` from `src/api/fixtures.ts`, so the rounding is the mock's
    (Multivitamin 2 → 1 is 6367, from 6366.5).
  - `startingAfter` keeps the plan's one-argument signature and uses `formatDate`'s default `now`. The tests pin
    the clock with fake timers.
- **Verified:** `npm run check` green (typecheck, lint, format, unit, e2e: 53 passed, 9 skipped as before).

## 2026-11-03: 003-a-plan-changes / plan and tasks

- **Changed:**
  - `SPECS/003-a-plan-changes/spec.md`: four more decisions from the human:
    - R1, R2: the server's value is marked "(current)" in both controls.
    - R2, R3: the label is the product's full name + "quantity".
    - R3: without a date, the text reads "starting after your next order".
    - R5: Discard is shown only while something is pending, announces "Changes discarded." and moves focus to the
      heading.
    - R7: a pending value that now equals the fresh server value isn't shown.
    - R8: the controls live in their own "Change your plan" section after the products.
  - New `plan.md` and `task.md` (T1–T7).
- **Decisions:**
  - The human chose a separate section, so the next-order and product sections stay read-only server data.
  - A `local` slice is compared with the server's data on every render through `pendingOf`, so "starting after"
    and "(current)" follow a skip or a reload with no extra actions.
  - 001's reserved `frequencyDays` is renamed `intervalDays` to match the server field.
  - Several pending lines share one "Starting after your Dec 16 order:" intro instead of repeating the date.
  - A server interval outside 30/60/90, or a quantity above 10, is left for the edge-case question (T7).
- **Verified:** spec-only change; no code touched. Prettier checked on the edited Markdown.

## 2026-11-03: 003-a-plan-changes / spec: control decisions

- **Changed:** `SPECS/003-a-plan-changes/spec.md`: R1 names a `<fieldset>` with a `<legend>` and 3 radio buttons
  for frequency. R2 names a `<select>` with options 1 to 10 and a product-named `<label>` for quantity, and excludes
  `<input type="number">` and steppers. R8 points to both.
- **Decisions:** the human chose a `<select>` over −/+ stepper buttons. The options set the 1–10 limits, so there's
  no disabled-at-limit state. A natively `disabled` button that has focus drops focus to `<body>`. Accepted
  trade-off: arrow keys on a closed select fire `change` on each press, so each step is announced (R6), and the
  newest announcement replaces the previous one.
- **Verified:** spec-only change; no code touched, `check` not run.

## 2026-11-03: 002-a-skip-shipment / T11: e2e in the mock's random mode

- **Changed:** `e2e/a-skip.spec.ts`: with no `conflict` parameter, the test confirms until a skip succeeds, at most
  6 times. After each 409, it checks the conflict message, focus on "Keep my order" and the unchanged Dec 16 date.
  At the end, the announcement and the page both say Jan 15, 2027, so exactly one skip went through.
- **Decisions:** the 409 count is recorded as a test annotation. If all 6 attempts fail, the test says so ("6
  skips in a row got a 409"); the chance is about 0.1%.
- **Verified:**
  - 10 repeats on both projects: all passed, with 0, 1 or 2 409s before the skip, so the conflict branch and
    "Contact us" ran.
  - Mutation: with the reload after a 409 keeping the old data, every retry sends a stale `updatedAt` and the test
    fails with its message.
  - `npm run check`, see T10.

## 2026-11-03: 002-a-skip-shipment / T10: e2e for two skips in a row

- **Changed:** `e2e/a-skip.spec.ts`: Dec 16 → Jan 15, 2027 → Feb 14, 2027. Both are announced; the status region
  is empty after the reopen, so the second is new text; the second dialog shows the new dates; focus returns to
  the skip button each time.
- **Decisions:** "sent with the fresh `updatedAt`" is proven through the mock: it compares `updatedAt` even with
  `conflict=never`, and the first skip changes it, so a stale value gets a 409. No request inspection needed.
- **Verified:**
  - T10 and T11 passed `--repeat-each=5` on both projects (20/20).
  - Mutation: with the skip's result keeping the old `updatedAt`, the second skip isn't announced and the test
    fails.
  - `npm run check` after T11: 163 unit and component tests, 53 e2e with 9 skipped.

## 2026-11-03: 002-a-skip-shipment / T9: the dialog on short screens (R12)

- **Changed:**
  - `SubscriptionCard.module.css`: the dialog sets `overflow: auto` itself, and `:root:has(.dialog[open])` hides the
    page's overflow, so the page behind doesn't scroll.
  - `e2e/a-skip.spec.ts`: a 640×320 test (mobile project only). The dialog fits the screen and scrolls inside, Tab
    reaches both buttons fully in view, the wheel over the backdrop and past the dialog's end doesn't move the
    page, the heading comes back when scrolled up, axe passes, and the page scrolls again after Esc. The R12
    acceptance criterion is ticked.
- **Decisions:**
  - The test was written first. Only the page scroll was failing: Chrome's UA style already gives a modal dialog
    `overflow: auto`. The explicit rule stays so R12 doesn't depend on it, but no test can catch its removal in
    Chromium.
  - The page position is compared with where it was at open, not with 0: the click scrolls the skip button into
    view first. `overflow: hidden` keeps that position, so the page doesn't jump.
  - With classic scrollbars, hiding the page's scrollbar shifts the page behind the backdrop by its width.
    `scrollbar-gutter: stable` would trade that for a permanent gutter, so it's left as is.
- **Verified:** without the `:root:has()` rule, the test fails (224 expected, 372 received); with it, it passes
  `--repeat-each=5`. `npm run check`: 163 unit and component tests, 49 e2e with 9 skipped.

## 2026-11-03: 002-a-skip-shipment / T8: lost-focus fallback (R10)

- **Changed:**
  - `subscriptionReducer.ts`: a new focus target, `heading-if-lost`. It is set when a reload finishes with the
    dialog closed and nothing left to skip, through `refresh/succeeded` (paused, cancelled, no date) or a 404 in
    `refresh/failed`.
  - `SubscriptionCard.tsx`: the focus effect applies `heading-if-lost` only if focus is on `<body>`.
  - Two reducer tests and three component tests: paused and 404 move focus to the `h1`, and focus the customer
    moved elsewhere stays there. The R10 acceptance criterion is ticked.
- **Decisions:** a 404 with the dialog closed uses the same target, because the not-found view removes the skip
  button too. The plan's T8 note now says so. With the dialog open, R10 still moves focus to the `h1`, as before.
- **Verified:** `npm run check` (163 unit and component tests, 48 e2e with 8 skipped). Mutations: without the
  `<body>` check, the "focus elsewhere" test fails; without the reducer target, both reducer tests and the paused
  component test fail.

## 2026-11-03: 002-a-skip-shipment / T7: edge cases and e2e flows chosen

- **Changed:**
  - `spec.md` went back to `Draft` for re-approval. R10 gains the lost-focus case, and there is a new R12 (short
    screens), with one acceptance criterion each. The human approved the wording, so the spec is `Approved` again.
  - `task.md`: T7 is ticked, and T8–T11 are added.
  - `plan.md`: a "Follow-up" section with the approach for T8–T11.
- **Decisions:**
  - Human decisions: the edge cases are the lost-focus fallback and short screens. The e2e flows are two skips in a
    row, the default random mode, and short-height reflow (folded into T9). Backdrop click to close was not chosen.
  - Agent proposals, approved by the human: the `heading-if-lost` focus target (T8), CSS-only scroll locking (T9),
    T11's limit of 6 attempts, and the smaller choices made during T2–T6 and recorded in the plan.
- **Verified:** Prettier on `SPECS/`.

## 2026-11-03: 002-a-skip-shipment / T6: e2e, and two Esc races fixed

- **Changed:**
  - New `e2e/a-skip.spec.ts`:
    - success with Esc first
    - R5 with a double click and two Esc presses
    - `conflict=always` through Contact us and a reopen, with axe
    - keyboard only
    - axe and no horizontal scroll with the dialog open at 375px, 1200px and 320px
  - `expectAccessibleLayout` moves from `a-overview.spec.ts` to `e2e/a11y.ts`, so both specs share it.
  - `SkipDialog.tsx`: `cancel` dispatches `skip/closed` itself, and `close` dispatches it only if the dialog is
    really closed. Two component tests cover them.
  - The spec's acceptance criteria are ticked, except the two the spec leaves to 004 (local cancel in R1) and 003
    (R11).
- **Decisions:**
  - R5's pending state is held with `page.clock.pauseAt()`, which stops the mock's `setTimeout`. That's still the
    real mock (spec, Known limitations), without racing its 400ms minimum latency.
  - The plan said the modal "traps" focus. In Chromium, Tab past the last button goes to the browser's UI and then
    back to "Keep my order", never to the inert page, and WCAG 2.1.2 allows that. The plan's wording and the test
    now say so.
- **Bugs found by repeating the suite (`--repeat-each=5`), recorded in the plan's Risks:**
  - Esc, then a quick Space on the skip button, sometimes did nothing. `close` is queued as a task and Chrome runs
    input first, so the click reached a reducer that still said `confirm`. A probe showed 3 dead presses in 60
    before the fix and 0 in 60 after. The fix closes from `cancel`, which fires inside the keydown.
  - That fix exposed the reverse: the queued `close` arrived after the Space had reopened the dialog, and closed it.
    The probe saw 1 in 120 together with one `close` event on an open dialog. The handler now ignores a `close`
    while the dialog is open. The component test is deterministic, and the browser probe (0 in 160 after) is only
    supporting evidence, because the event is rare.
- **Verified:**
  - Removing the Escape `keydown` guard makes the R5 e2e fail on both projects. That confirms the plan's Chrome
    close-watcher risk.
  - Each new component test fails without its fix.
  - `npm run check` green (158 unit and component tests, 48 e2e). The skip spec passes `--repeat-each=5` three times
    in a row (165 of 165), where it had failed about once in 55 before the fixes. The probe files are deleted.

## 2026-11-03: 002-a-skip-shipment / T5: failure flow

- **Changed:** `SubscriptionCard.tsx` gains `refresh` (the `refresh/*` reload) and `checkAgain`. A failed skip
  starts the reload only if it is still the latest request. `SkipDialog.test.tsx` gains 19 tests: R7's pending
  reload, both messages, the moved date and the rebuilt confirm label, R8's Contact us (shown, emptied during the
  next attempt, gone after a reopen, not counted for a failed reload), R9's view, "Check again" (pending, success,
  failure, reopening while stale), and R10 for paused, cancelled, a missing date and a 404, including after "Check
  again".
- **Decisions:** the R9 test checks that "Check again" stays escapable while pending, because a reload only reads
  (spec R9).
- **Verified:**
  - The first run had 2 failures from a test bug of mine: I passed an async callback to `settle`, which doesn't
    await it. Rewritten in sequence, with no change to the code.
  - Removing the reload after a failure fails 19 tests, and showing the summary while stale fails 2.
  - `npm run check` green.

## 2026-11-03: 002-a-skip-shipment / T4: confirm flow

- **Changed:** `SubscriptionCard.tsx` gains `confirmSkip`, which sends `skipNextShipment` with the shown
  subscription's `id` and `updatedAt` and dispatches `skip/succeeded` or `skip/failed`. `SkipDialog.test.tsx` gains
  5 tests: the request's arguments, R5's pending state with two clicks and two Esc presses, both Esc events
  prevented, R6's success, and the next skip using the response's `updatedAt`.
- **Decisions:** the success test answers with Jan 20, not the predicted Jan 15, so the announcement and the page
  are shown to use the response (R6).
- **Verified:**
  - Removing the handler's guard fails the double-click test, and removing the Escape `keydown` guard fails the Esc
    test.
  - The `skipInFlight` ref on its own can't be told apart from the state check in jsdom, because React flushes
    click updates synchronously. T6's double click covers the browser.
  - `npm run check` green.

## 2026-11-03: 002-a-skip-shipment / T3: skip dialog, opening and closing

- **Changed:**
  - New `src/part-a/SkipDialog.tsx`: the `<dialog>` and every phase's markup (summary, alert, Keep, confirm or
    "Check again"). It only renders.
  - `views.tsx`: "Skip next order" ends the Next order section when `canSkip`.
  - `SubscriptionCard.tsx`: renders the dialog next to the view, a layout effect for `showModal()`/`close()`, a
    focus effect that applies `state.focus`, and `state.announcement` in the status region.
  - `SubscriptionCard.module.css`: the dialog, `::backdrop`, the secondary button, and the disabled and pending
    states.
  - New `src/part-a/SkipDialog.test.tsx` (15 tests). `deferred` and `settle` move to `src/test/deferred.ts` so both
    component test files share them.
- **Decisions:**
  - The `<dialog>` stays mounted while the subscription is loaded, but its content renders only while open. A closed
    dialog then exposes no buttons or headings, whatever jsdom's UA stylesheet does.
  - Open and close run in a layout effect: no empty frame between the content unmounting and `close()`, and always
    before the focus effect (the plan's "close first, focus second").
  - The dialog's `aria-describedby` points at the summary, or at the alert in the R9 state, so a screen reader
    reads what will happen when the dialog opens.
  - The empty alert gets `margin-top: -1rem` instead of `display: none`, so it stays a live region without adding a
    gap.
  - The component tests replay a browser's Esc (keydown, then `cancel`, then `close()` unless prevented), so the R5
    guards run in jsdom too.
- **Verified:** two hand mutations (dropping the native `close` handler, focusing the wrong element on open) fail
  the new tests. Screenshots at 375px and 1200px with the dialog open, with focus on "Keep my order" in Chromium.
  `npm run check` green.

## 2026-11-03: 002-a-skip-shipment / T2: reducer skip layer

- **Changed:**
  - `src/part-a/subscriptionReducer.ts` gains `skip`, `stale`, `announcement` and `focus`, and the `skip/*` and
    `refresh/*` actions from the plan's transition table. `load/started` resets the whole layer.
  - New `src/part-a/skipReducer.test.ts` (48 tests), one `describe` per action. The 001 "Try again" test now
    compares against `initialState`, because `State` is wider.
- **Decisions (added to plan.md before the code):**
  - `focus` is one-shot: every accepted action sets it again, to `null` when it has no target.
  - `skip/opened` also clears the announcement.
  - A reload result that arrives in the `stale` phase (closed during "Check again", reopened before it returned) is
    handled like `rechecking`.
  - Not in the table, and R10-consistent: a skip response that leaves nothing to skip sends focus to the `h1`, and
    announces just "Skipped.".
- **Verified:**
  - Three hand mutations (comparing ISO strings instead of calendar days, keeping `focus` between actions, ignoring
    `state.stale` after "Check again") each fail the suite (1, 5 and 2 tests).
  - `npm run check` green. Its first run failed `format:check` on my T1 log entry, fixed with Prettier.

## 2026-11-03: 002-a-skip-shipment / T1: skip rules

- **Changed:** new `src/part-a/skip.ts` with `canSkip` (R1, R10), `predictNextChargeAt` (R2) and `skipErrorCause`
  (409 → `conflict`, anything else → `failed`, R7), and `skip.test.ts`.
- **Decisions:** the prediction adds `intervalDays × 86 400 000` ms to `Date.parse`, the same arithmetic as the mock,
  so it lands on the server's instant even across the Nov 1, 2026 daylight-saving change.
- **Verified:** 16 unit tests, including the daylight-saving change, a 23:59:59.999 timestamp and two rolls into the
  next year. One expected literal of mine was off by an hour (I'd applied the DST shift to a UTC sum). I fixed the
  literal, the code was right. `npm run check` green.

## 2026-11-03: 002-a-skip-shipment / plan and tasks

- **Changed:**
  - The spec is `Approved` again, after the human approved the edge-case wording.
  - New R9 rule (human decision): closing a stale dialog and reopening it shows the R9 state again, until a reload
    succeeds.
  - Known limitations now say e2e always uses the real mock (human decision, rejecting a rewrite of the module Vite
    serves). The earlier claim that `page.route` couldn't reach the mock was wrong: e2e runs on the dev server. It
    also says R5's call count is checked through what can be seen, and that the R1 local-cancel and R11 criteria
    move to 004 and 003.
  - New `plan.md` and `task.md` (T1–T7).
- **Decisions (in the plan, for review):**
  - The reload after a failure has its own `refresh/*` actions, so the page doesn't drop to the skeleton behind
    the dialog.
  - The reducer chooses the focus target, so focus rules are unit-tested.
  - The moved date is compared by calendar day.
  - The alert region stays mounted and empties between attempts, so a repeated 409 is announced again.
  - "Keep my order" looks like the primary button.
  - The Escape `keydown` is prevented while pending, because Chrome's close watchers stop honoring a prevented
    `cancel` on a repeated Esc.
- **Verified:** Prettier on `SPECS/002-a-skip-shipment/`.

## 2026-11-03: 002-a-skip-shipment / spec: edge cases settled

- **Changed:** `SPECS/002-a-skip-shipment/spec.md` goes back to `Draft` for re-approval. R1–R5 and R7–R10 are
  tightened, with 10 new acceptance criteria and two new known limitations.
- **Decisions:**
  - Human decisions:
    - The skip button is hidden when `nextChargeAt` is null, not only when the subscription isn't active (R1).
    - When a reload after a failure returns a different `nextChargeAt`, the dialog says "Your next order is now
      {new} (it was {old}). It may already have been skipped." The confirm button's label is rebuilt from the
      fresh data (R4, R7).
    - Focus moves to "Keep my order" after a failure (R7).
    - The R8 count covers failed skips only, and resets on success or when the dialog closes.
  - Agent defaults, flagged for review:
    - The pending state covers the reload, which shows "Checking…" (R5).
    - In R9, the dates and confirm are hidden, and "Keep my order" and Esc stay available.
    - R10 also covers a 404 and a missing date, with focus moving to the `h1`.
    - The R3 sentence shows only when the pending frequency differs from the server's interval.
    - The prediction uses millisecond arithmetic, the same as the server (R2).
- **Verified:** Prettier check on the spec and this log.

## 2026-11-03: 001-a-subscription-overview / T12: reflow, keyboard retry and console e2e

- **Changed:** `e2e/a-overview.spec.ts` gains:
  - every state at 320px (no horizontal scroll, axe)
  - "Try again" by keyboard alone, with Enter and then Space, with focus on the `h1` each time and Tab back to
    the button
  - no console errors in each of the five states
  - The R1 test now also asserts the skeleton is in `main` during loading and gone after. Until now only
    screenshots had shown it.
- **Decisions:**
  - The 320px tests skip the desktop project, because they set their own viewport.
  - The keyboard test tabs until "Try again" has focus, rather than counting stops, because the starter's nav
    links come first.
- **Verified:**
  - Planted bugs, each one reverted. A 21rem card failed all five 320px tests and the T10 320px test, while R6 at
    375px and 1200px still passed. A skeleton that never unmounts failed R1 on both projects.
  - `npm run check` green.
  - Spec 001 is now `Implemented`, with every acceptance criterion ticked.

## 2026-11-03: 001-a-subscription-overview / T11: empty item list

- **Changed:** `ItemList` renders "There are no products in this subscription." in place of an empty `ul`. The
  "In your subscription" heading stays. Spec R8 and the plan were updated first. One component test.
- **Verified:** removing the check failed that test.

## 2026-11-03: 001-a-subscription-overview / T10: long names and many items

- **Changed:**
  - A component test renders all four catalog products, with full names and the right thumbnail for each.
  - An e2e test at 375px and 320px copies rows in the rendered DOM and gives them the catalog's names, then
    checks row alignment, that every name stays inside `main`, no horizontal scroll, and axe.
  - Spec R10 and Known limitations say the mock can't send this data, so the e2e check edits the DOM.
- **Decisions:** no CSS change was needed. `min-width: 0` and `overflow-wrap: anywhere` from T4 already held.
  The 320px screenshot was reviewed: the six-line bundle name wraps inside the card.
- **Verified:** a planted `white-space: nowrap` on names failed both widths.

## 2026-11-03: 001-a-subscription-overview / T9: active subscription without a date or total

- **Changed:**
  - A null `nextChargeAt` shows "We'll confirm your next order date soon." in the date's place.
  - A null `nextChargeTotalCents` leaves out the amount and the discount line.
  - Spec R3, a new acceptance criterion and the plan were updated first. Two component tests.
- **Decisions:** the human picked the copy for a missing date. A missing total keeps the date and drops the
  discount line too, because "Includes your 15% discount" means nothing with no amount next to it. It is plain
  text, not an alert, because nothing failed.
- **Verified:** removing the fallback line, and showing the discount without a total, each failed their own test.

## 2026-11-03: 001-a-subscription-overview / T8: broken product image

- **Changed:**
  - New `Thumbnail` in `ItemList.tsx` swaps to the placeholder on `error`. It is keyed by `imageUrl`, so a new URL
    gets a fresh try.
  - A component test fires `error`. An e2e test aborts `product.jpg` with `page.route`, a real network failure,
    and checks the placeholder, row alignment and axe.
  - Spec R8 was updated first.
- **Verified:** removing `onError` failed both the component test and the e2e test on both projects.

## 2026-11-03: 001-a-subscription-overview / T7: edge cases and e2e flows

- **Decisions (asked the human):**
  - The human picked all four edge cases: a broken image, an active subscription without a date or total, long
    names and many items, and an empty item list.
  - They picked three of the four e2e flows: 320px reflow, keyboard-only retry, and no console errors in every
    state. They left out reduced motion.
  - These became T8–T12. Spec R3, R8 and R10, the acceptance criteria and Known limitations were extended before
    any code.

## 2026-11-03: 001-a-subscription-overview / T6: overview e2e spec

- **Changed:**
  - New `e2e/a-overview.spec.ts`, 6 tests × 2 projects. Every fixture and the 404 have their key text, axe WCAG
    2.2 A/AA and no horizontal scroll. It also covers:
    - R1: the announcement appears and then clears.
    - R2: "Try again" focuses the `h1`, and Tab returns to the button.
    - R8: the image loads, and the placeholder row lines up with it.
    - R3: the date is larger than the `h1`.
  - `e2e/test.ts` re-exports the `Page` type, because ESLint blocks every import from `@playwright/test` in specs.
  - `plan.md` Testing lists the extra checks and the loading-state polling.
- **Decisions:**
  - The loading state can be as short as 400ms, and `toHaveText`'s poll intervals widen to 1s, so it could be
    missed. It is detected with `waitForFunction` polling every animation frame.
  - "No buttons" and "no links" are scoped to `main`. The first run failed on the starter's `App.tsx` nav links,
    which are a test bug, not an app bug. `App.tsx` stays untouched (Part B shares it).
- **Verified:**
  - 60/60 with `--repeat-each=5` on both projects.
  - Planted CSS bugs, each one reverted: a 3.5rem placeholder failed the alignment check on both projects, and a
    30rem `min-width` failed the scroll check on mobile only, as expected.
  - `npm run check` green: 48 unit, 16 e2e.

## 2026-11-03: 001-a-subscription-overview / T5: paused and cancelled views

- **Changed:** `PausedView` ("Paused until {date}", "Want to resume sooner? Contact support", products) and
  `CancelledView` ("Cancelled on {date}", products) in `views.tsx`, on a muted surface with a text badge. Five
  component tests, including no buttons and no "Next order" in either view, and a paused subscription that still
  carries next-order fields showing the paused view (R7, through `viewOf`).
- **Decisions:** built in the same pass as T4, because the views share the badge, the date and the products
  section. The cancelled view has no contact line, because R11 lists only R2, R5 and 002 R8.
- **Verified:** covered by the T4 and T6 runs.

## 2026-11-03: 001-a-subscription-overview / T4: active view and products

- **Changed:**
  - `ActiveView` in `views.tsx`: badge, then "Next order" (date, amount, discount line, frequency), then "In your
    subscription". `SubscriptionCard` picks the view with `viewOf` (R7).
  - New `src/part-a/ItemList.tsx` (R8): `img alt=""` with `width`/`height`, or an `aria-hidden` capsule
    placeholder in the same 4rem box, with a hairline border on both.
  - CSS module: badge, section, date, amount, item and thumbnail styles. New colors are tokens on the card root, and
    every text pair was computed at ≥ 5.75:1.
  - Six component tests for the active view. Only `Date` is faked, and dates are built in local time.
  - `plan.md` UI decisions: the badge's hidden "Status: " prefix, the `<time>` dates, the order of the views, the
    paused contact copy, and the products markup.
- **Decisions:**
  - The discount line is hidden at 0%. Each server field renders only when non-null, which is the type's contract.
    What to show for an active subscription with a null date or total is a T7 question.
  - The `h2`s are small muted labels and the date is the biggest text (2rem, 2.5rem from 48rem), so R3's "date at
    a glance" holds at both widths.
- **Verified:**
  - Planted bugs, each one reverted: computing the total with `totalAfterDiscount`, moving the frequency above the
    amount, and `alt={item.name}` each failed exactly their own test.
  - Screenshots of all three views at 375px and 1200px reviewed.

## 2026-11-03: 001-a-subscription-overview / T3: load effect, skeleton and load errors

- **Changed:**
  - `src/part-a/SubscriptionCard.tsx` is now the container. It holds the reducer, runs the load effect with a fresh
    `requestId` per load, and renders the `main`, the `h1`, a status region and the view for the current state. The
    `ready` state renders nothing yet, because T4 and T5 add those views.
  - New `src/part-a/views.tsx` with `LoadingCard`, `LoadError` and `NotFound`.
  - New `src/part-a/SubscriptionCard.module.css` (mobile-first), covering the card root, the panel, the button, the
    link, the skeleton and `visually-hidden`. T4 adds the active view's styles to it.
  - `constants.ts` gains `SUPPORT_MAILTO` (R11).
  - New `src/part-a/SubscriptionCard.test.tsx` with 8 component tests.
  - `plan.md`: UI decisions (landmark and heading, skeleton, load error, not found) and the files table
    (`NotFound`) now match the code.
- **Decisions:**
  - **Retry focus (asked the human):** the plan said focus stays on "Try again", but the skeleton replaces the error
    view, so the button unmounts and focus would fall to `<body>`. "Try again" now moves focus to the `h1`
    (`tabIndex={-1}`). The human chose this over keeping the error on screen with a "retrying" state, which would
    have reshaped the T2 reducer.
  - The `role="status"` region lives on the card root and stays mounted, with its text switched between "Loading
    your subscription" and empty. The plan's version, a status wrapper inside the skeleton, would mount with its
    text already inside, which screen readers don't reliably announce, so a retry would be silent.
  - The 404 message is `role="alert"`, like the 500, so the end of a load is announced either way.
  - The request id comes from a ref and not from `state.requestId + 1`. Under StrictMode, both effect runs see the
    same state, so both would send id 1 and the stale check would never fire.
- **Verified:**
  - Planted bugs, each one reverted: dropping the focus move failed the retry test, and a constant request id failed
    the StrictMode stale-response test.
  - A throwaway Playwright spec (deleted afterwards), run on mobile and desktop against `fixture=error` and an
    unknown fixture, checked the loading, error and 404 states. axe found no violations, there was no horizontal
    scroll, focus landed on the `h1` after "Try again" in a real browser, and Tab went back to the button.
    Screenshots were reviewed at both widths.
  - `npm run check` is green.

## 2026-11-03: 001-a-subscription-overview / T2: subscription reducer

- **Changed:**
  - New `src/part-a/subscriptionReducer.ts` with `State`, `Action`, `initialState`, `subscriptionReducer`,
    `loadErrorKind(error)` and `viewOf(server)`.
  - New `src/part-a/subscriptionReducer.test.ts` with 15 tests.
  - `plan.md` (State shape, `requestId`, effective status) now matches the code, see Decisions.
- **Decisions:**
  - `requestId` moved from the `loading` and `failed` variants to `State`. In the plan's shape, `ready` had no id, so
    once request 2 had loaded, a late response from request 1 couldn't be told apart from a fresh one. The mock's
    latency is random, so that order can happen under the StrictMode double effect. Now one rule covers every
    state: an id that isn't `state.requestId` is dropped, and the same state object is returned so React skips the
    render.
  - `viewOf` takes the server subscription instead of the whole state, so it never has to return a value for a
    state that hasn't loaded. 004 adds the local cancel as a second argument.
  - `loadErrorKind`: only an `ApiError` 404 is `not-found`. Everything else, including non-API errors, is `failed`,
    because retrying a read is always safe (R2).
  - `initialState` is already `loading`, so the skeleton shows on the first render, before the load effect runs.
- **Verified:**
  - A planted bug that compared ids only while loading (the plan's original shape) failed both "late response after
    ready" tests. It was reverted.
  - `npm run check` is green.

## 2026-11-03: 001-a-subscription-overview / T1: formatters

- **Changed:**
  - New `src/part-a/constants.ts` with `LOCALE` (`en-US`) and `CURRENCY` (`USD`). `SUPPORT_MAILTO` is added in T3,
    where it is first used.
  - New `src/part-a/format.ts` with `formatDate(iso, now = new Date())`, `formatMoney(cents)` and
    `formatFrequency(days)`. The `Intl` formatters are built once, at module level.
  - New `src/part-a/format.test.ts` with 14 tests.
- **Decisions:**
  - `formatDate` checks the year in the browser's time zone, the same zone `Intl` displays in, so the year rule and
    the shown day always agree. A UTC check would add the year to a Dec 31 evening date in New York, or drop it
    from a Jan 1 date.
  - `formatFrequency` is just "Every N days". 003 R1 allows only 30, 60 or 90, so there is no singular case.
  - Tests build dates with local-time constructors, so they don't depend on the machine's time zone.
- **Verified:**
  - The unit tests pass with `TZ` set to UTC, America/New_York, Pacific/Kiritimati (+14) and Pacific/Pago_Pago (-11).
  - A planted bug that checked the year in UTC failed the midnight test under New York ("Jan 1" instead of
    "Jan 1, 2027"). It was reverted.
  - `npm run check` is green.

## 2026-11-03: setup: pinned clock and time zone for e2e

- **Changed:**
  - `playwright.config.ts` sets `timezoneId: "America/New_York"` and a `startTime` test option.
  - New `e2e/test.ts` extends `test` so each page clock starts at `startTime`. It has no default, so the config is
    the only source.
  - ESLint `no-restricted-imports` makes e2e specs import from `./test`. `e2e/smoke.spec.ts` was moved over.
  - Added a README section, "Dates and time zones in e2e tests". 001's plan (Risks) and spec (Known limitations)
    now point to it.
- **Decisions:**
  - The human asked to freeze the date with real timers. We used `page.clock.setSystemTime()`, which pins the start
    and keeps the clock running, instead of `setFixedTime()`. With a frozen `Date.now()`, the mock's
    `conflict=always` stores an `updatedAt` equal to the one the client sends back, so the second attempt would
    wrongly succeed. That would make 002 R8 untestable.
  - The start time is Dec 10 2026, 12:00 EST. Noon avoids midnight edges, the next order is Dec 16, and a skip lands
    on Jan 15, 2027, which exercises the 001 R9 year rule.
- **Verified:**
  - A throwaway spec compared the two modes. `setFixedTime` moved `Date.now()` 0ms over a 300ms timer, and
    `setSystemTime` moved it about 300ms.
  - A second throwaway spec showed both projects at "Thu Dec 10 2026 12:00:00 GMT-0500", in `America/New_York`.
  - A planted `@playwright/test` import failed lint.
  - The throwaway files were deleted, and `npm run check` is green.

## 2026-11-03: 001–004 (Part A): review fixes, specs approved, 001 plan

- **Changed:**
  - 001: R4 now lists every computed value (002 R2, 003 R4, 004 R3). New R11: the contact link is
    `mailto:support@naturawellness.example`. R5: the paused view gets the contact line.
  - 002: R5 is reworked.
  - 003: R4 and 004: R3 now use `totalAfterDiscount()`.
  - All four specs are marked Approved. Added `001-a-subscription-overview/plan.md` and `task.md`.
- **Decisions (from the human's review):**
  - A saving is `totalAfterDiscount(before) - totalAfterDiscount(after)`, using the mock's own function so the
    rounding matches the server. A discounted unit price can be a cent off.
  - While a skip is in flight:
    - "Keep my order" is natively `disabled`
    - the confirm button uses `aria-disabled` and ignores clicks, so focus doesn't fall to `<body>`
    - Esc is blocked
  - Plan: responses carry a `requestId`, so stale ones are dropped (StrictMode double effect, and the 002 reloads).
  - Plan: Part A styles stay scoped to the card, and the shared `App.tsx`, `main.tsx` and `index.html` aren't
    touched, to protect the Part B pixel match.
- **Verified:** `npm run format:check`.

## 2026-11-03: 001–004 (Part A): draft specs

- **Changed:** Added `spec.md` (Draft) for `001-a-subscription-overview`, `002-a-skip-shipment`,
  `003-a-plan-changes` and `004-a-cancel-retention`. Part B moves to `005-b-buy-box`.
- **Decisions (agreed with the human):**
  - Dates and amounts come only from the server. Frequency and quantity changes are pending and apply after the next
    order. The "starting after" date is derived from `nextChargeAt` on every render.
  - A skip predicts the new date as `nextChargeAt + server intervalDays` and announces the date the server returns.
  - Every skip failure is handled the same way: reload the subscription, show the fresh data and let the customer
    confirm again. There is never an automatic retry. "Contact us" appears after two failures in a row.
  - Retention offers:
    - too much product: skip first, then a slower frequency
    - costs too much: a slower frequency, or a lower quantity
    - trying a different product: "skip while you try it"
    - no results and other: no offer
  - Cancelling takes 3 taps, and a local cancel can be undone because the server data never changed.
  - Dropped:
    - pause: it would need an invented `pausedUntil`
    - resume and restart: they would need invented dates
    - swap: a catalog picker for a 15% group that needs a break
    - discounts: we don't invent them
  - "Server status wins" rules are written down but not tested, because the mock never changes status.
- **Verified:** `npm run format:check`.

## 2026-11-02: setup: dev tooling and `npm run check`

- **Changed:**
  - Added dev deps: Vitest, jsdom, Testing Library (react, user-event, jest-dom), Playwright, @axe-core/playwright,
    ESLint (typescript-eslint type-checked, react-hooks, react-refresh, jsx-a11y), Prettier, eslint-config-prettier.
  - Added `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `playwright.config.ts`, a Vitest block in
    `vite.config.ts`, `src/test/setup.ts` and `e2e/smoke.spec.ts`.
  - Added scripts `lint`, `format`, `format:check`, `test`, `test:watch`, `e2e` and `check`
    (typecheck → lint → format:check → unit → e2e).
  - Fixed the stack line in `AGENTS.md` (CSS Modules, not Tailwind), and added the unit step and the SPECS workflow.
- **Decisions:**
  - Pinned ESLint to 9: `eslint-plugin-jsx-a11y` 6.10 has no ESLint 10 peer support yet. Revisit when it does.
  - `src/api` is excluded from ESLint and Prettier because it is read-only. It has one `prefer-const` hit that is
    not ours to fix.
  - Prettier `printWidth: 120` matches the starter, so no existing file was reformatted.
  - Playwright projects: `mobile` (375×812, the primary target) and `desktop` (1200×780, the Part B reference size).
  - jsdom has no modal `<dialog>`. `src/test/setup.ts` stubs `showModal`/`close`, and real dialog behavior is
    tested in Playwright.
  - Accepted `npm audit` moderate findings (minimatch ReDoS via ESLint, dev-only). The suggested fix downgrades
    eslint-config-prettier to v6.
- **Verified:** `npm run check` is green (4 e2e smoke tests: both parts × both viewports, axe WCAG 2.2 A/AA, no
  console errors). Planted failures to prove the gates work: an `<img>` without alt failed axe with `image-alt`, and
  a throwaway unit test confirmed the jest-dom matchers and the dialog stub. Both were reverted.
