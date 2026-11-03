# 005: Buy box

Status: Implemented

## Problem

A shopper on the Vitamin D product page decides here whether to buy once or subscribe, how often, and how many.
Design gave us one finished screen, `public/reference/buy-box.png`: a 2x screenshot of a 1200×780 window in the
default state (subscribe, every 30 days, quantity 1). We have to match it as closely as we can. It also has to work.
Every option, the frequency and the quantity must work, and every price and sentence on the box must stay in step
with what the shopper picked. The design shows one state only, so the other states follow the product decisions
below, which were settled with the human on 2026-11-03.

## Requirements

- R1 **Content and order.** The page has the product photo on the left and, on the right:
  - the eyebrow
  - the rating and the reviews link
  - the title and the subtitle
  - a divider
  - the two purchase options
  - the quantity stepper and "Add to cart"
  - the status line (R10, R11)
  - the three trust points
  - the fine print

  Every visible and screen-reader-only string comes from `src/part-b/copy.ts`. The strings already there stay
  exactly as given. New strings (accessible names, the photo's alt text, the separator, the messages in R10 and R11,
  and the templates in R9) are added to `copy.ts`, never written inline in components. The plan names the test
  that enforces this without a new dependency.

- R2 **Visual match.** At 1200×780 with a device pixel ratio of 2, in the default state, the box matches the
  reference: layout, spacing, sizes, radii, borders, colours, fonts (Fraunces for the title, Inter for the rest)
  and the photo's crop. The colours are the ones measured from the reference, including the four that fail AA
  contrast (R14).
  - **Own project.** The pixel test runs in its own Playwright project with `deviceScaleFactor: 2` and a 1200×780
    viewport, and it captures at device scale. The existing `desktop` project is 1x, so it can't match a 2x
    reference.
  - **Protected baseline.** The baseline is a committed copy of `public/reference/buy-box.png`. A test checks that
    the copy is byte-identical to the original, so `--update-snapshots` can never quietly replace the design.
  - **Recorded diff.** Every run attaches the diff image and the measured diff ratio to the test report. The ratio
    is also recorded in `SPECS/CHANGELOG.md` whenever it changes.
  - **Nav bar.** The app's test-only nav bar (`App.tsx`) is not part of the design. The visual test hides it, and
    the app keeps it.

- R3 **Rating.** The five stars are decorative, all five full as in the design. A screen reader hears "Rated 4.8 out
  of 5" once, never "star" five times, then the "2,316 reviews" link. The link points to `#reviews`. Clicking it
  keeps Part B open and preserves the purchase option, frequency and quantity, with every total still matching.
- R4 **Purchase options.** The two options are native radio buttons in a `fieldset` with an accessible name (a
  visually hidden legend). "Subscribe & save 15%" is selected by default, and the arrow keys move between options
  natively.
  - **Label.** Only an option's header row (radio, label, badge, prices) is inside the radio's `<label>`. The
    frequency `select` and the perks are never inside it. Clicking anywhere else on the card selects the option
    through a click handler on the card. The handler ignores clicks on form controls and their labels, and the
    radio stays the keyboard path.
  - **Selected style.** The selected card has the green border and the tinted background, and the other card has
    the light border on white. The filled radio dot also shows the selection, so it is never shown by colour alone.
  - **Accessible name.** Each radio's accessible name comes from its header row, so it includes the price. For the
    subscription, it also includes the badge and the original price: "Subscribe & save 15% Best value $25.46
    originally $29.95".
- R5 **Subscription details.** "Delivered every" and the two perks show only while the subscription is selected.
  When "One-time purchase" is selected, the subscription card collapses to its header row. The details are removed,
  not just hidden from view, so they can't be reached by Tab or a screen reader. The chosen frequency is kept, so
  switching back restores it.
- R6 **Frequency.** A native `select` labelled "Delivered every", with the options from `copy.ts` in order. "30
  days" is selected by default. It is styled like the design (white field, border, chevron) and keeps native
  keyboard and screen-reader behaviour.
- R7 **Option prices.** The option rows always show unit prices, whatever the quantity: one-time $29.95, and
  subscription $25.46 with $29.95 struck through. Screen readers get the struck-through price as "originally
  $29.95", because most of them don't announce a strikethrough. The badge text is "Best value" in the DOM and
  uppercase only through CSS.
- R8 **Quantity.** A native number field labelled "Quantity", between a "Decrease quantity" button and an "Increase
  quantity" button. It starts at 1, and the range is 1 to 10.
  - **Buttons.** Both are `type="button"`, so they never submit the form. They step by 1. At its limit, a button
    is marked unavailable with `aria-disabled` and does nothing, but it stays focusable, so pressing it to the
    limit never drops keyboard focus. It keeps the design's colour. In the reference, "−" at quantity 1 is the
    same colour as "+", so the only visual change is the `not-allowed` cursor, and the default screenshot still
    matches.
  - **The field.** It has `inputMode="numeric"`, so phones show a number pad, and its spinner arrows are hidden as
    in the design. The arrow keys step natively within the range. The mouse wheel never changes the value, even
    while the field has focus.
  - **Typing.** A typed whole number from 1 to 10 takes effect as it is typed.
  - **Correction.** When the field loses focus, or the form is submitted:
    - a value outside the range is clamped to 1 or 10
    - a decimal is rounded to the nearest whole number, then clamped
    - an empty or non-numeric value goes back to the last valid quantity

    If the value changes this way, R11 says so.

- R9 **Totals stay in step.** The total is the selected option's unit price × the quantity, in whole cents, so a
  shopper who multiplies gets the same number. For example, a subscription with a quantity of 3 is $76.38.
  - "Add to cart · {total}". The dot is decorative and not read out.
  - The fine print: "Your subscription renews every {frequency} at {total} until you cancel. Skip or cancel
    anytime from your account." The default state renders exactly `copy.finePrint`. The fine print shows only
    while the subscription is selected, because a one-time purchase doesn't renew.
  - While the field holds a value that isn't valid (empty, out of range or a decimal) and still has focus, every
    total stays at the last valid quantity until R8 corrects the field.

  Money is formatted with `Intl` in `en-US` and `USD`.

- R10 **Add to cart.** The box is a `form` with `noValidate`. Without it, Chrome's native `min`/`max` check would
  block Enter with 15 before our handler runs, and R8's correction would never happen. R8 is the only quantity
  validation. "Add to cart" submits the form, and so does Enter in the quantity field, after R8's correction. Enter
  on a radio button or on the frequency `select` never adds to the cart. Chromium submits a form on Enter in a radio
  (measured on 2026-11-03), so this is blocked explicitly and behaves the same in every browser. Nothing is stored.
  The status line under the button shows the summary and is a polite live region:
  - subscription: "Added to cart: 2 × Vitamin D, delivered every 60 days, $50.92."
  - one-time: "Added to cart: 1 × Vitamin D, one-time purchase, $29.95."

  The line clears when the option, the frequency or the quantity changes, so it never describes an old selection.
  Pressing "Add to cart" again announces it again. While empty, the line takes no height or margin, so the default
  screenshot matches. When a message appears, the trust points and the fine print move down. That shift is accepted.

- R11 **Quantity corrections are shown and announced.** When R8 changes a typed value, the status line says
  "Quantity set to {n}. You can order 1 to 10 at a time." It is visible as well as announced. It clears on the next
  change, as in R10. When a submit follows a correction, the line shows the correction first, then the R10
  summary, so both are seen. This holds whether the submit corrects the field itself (Enter) or the correction
  came on blur just before the submit, for example when the shopper taps "Add to cart" while the field has focus.
  Normal steps aren't announced, because the field's value is already read.
- R12 **Responsive.** At 1200px the two-column grid matches the design exactly: 64 / 540 / 64 / 468 / 64. Between
  960px and 1200px the grid shrinks, the photo column first, so the box keeps its width as long as it can. Above
  1200px the columns keep their 1200px sizes (540 / 64 / 468) and the layout is centred, so the side margins grow
  equally instead of leaving the box pinned left. Below 960px it becomes one column: the photo, then the box. There
  is no horizontal scroll at 1024px, 768px, 375px or 320px (WCAG 1.4.10), in any state. Everything except 1200px is
  our own layout, because the design shows only 1200px.
- R13 **Keyboard and focus.** Every control works by keyboard alone, in DOM order. Every focusable element has a
  visible `:focus-visible` indicator. The design shows none, so the default screenshot is unaffected. There is one
  `h1`, "Vitamin D". The photo has descriptive alt text from `copy.ts`.
- R14 **Accessibility checks.** Axe runs at 375px and 1200px, in the default state, with one-time selected, and
  after "Add to cart". Each check is two axe runs on the whole page:
  1. every WCAG 2.2 A/AA rule except `color-contrast`, with nothing excluded
  2. only `color-contrast`, with the four elements below excluded

  Both must report no violations. Axe's `.exclude()` turns off every rule for an element, so it is used only in the
  second run. That way the four elements still get every other check. On the human's decision (2026-11-03), the
  design's colours ship unchanged, so these four, and only these, aren't checked for contrast:

  | Element                 | Design colour on background | Contrast | AA  |
  | ----------------------- | --------------------------- | -------- | --- |
  | Eyebrow "VITAMINS"      | `#6b7a70` on `#fbf8f3`      | 4.27:1   | 4.5 |
  | "2,316 reviews" link    | `#6b7a70` on `#fbf8f3`      | 4.27:1   | 4.5 |
  | Fine print              | `#6b7a70` on `#fbf8f3`      | 4.27:1   | 4.5 |
  | Struck-through "$29.95" | `#8a948e` on `#f3f6f2`      | 2.87:1   | 4.5 |

- R15 **Navigation consistency.** After following the nav link to Part A and returning through the Part B nav
  link, the quantity field and every total agree. These links perform full-page navigation, so returning starts
  the default subscription (30 days, quantity 1, $25.46 total), with an empty status line. Preserving the selection
  across full-page navigation remains out of scope. The option rows still show their unit prices.

## Acceptance criteria

- [x] R2: The `visual` project runs at 1200×780 with `deviceScaleFactor: 2`, and its screenshot is 2400×1560.
- [x] R1, R2: Given the default state with the nav hidden, when the page is compared with the committed baseline,
      then the diff ratio is within the plan's tolerance. The diff image and the ratio are attached to the report,
      and the ratio is recorded in the CHANGELOG.
- [x] R2: The committed baseline is byte-identical to `public/reference/buy-box.png`. Changing either file makes the
      test fail.
- [x] R1: In each state, every rendered text node and accessible-name attribute is in an expected set, built only
      from `copy.ts` values, the money formatter applied to `copy.ts` prices and the state's totals, and the
      `copy.ts` templates. Formatted prices aren't literals in `copy.ts`, so they come from the formatter. The
      quantity field's value isn't a text node, so it isn't collected. Inline text makes the test fail.
- [x] R3: A screen reader gets "Rated 4.8 out of 5" once, and the stars are hidden from it.
- [x] R4, R5: Given the default state, when "One-time purchase" is selected, then its card gets the selected style,
      the subscription details and the fine print are gone, and the button reads "Add to cart · $29.95".
- [x] R4: Clicking the one-time card's padding, outside its label, selects it. The frequency `select` is not inside
      any `<label>` of a radio.
- [x] R4: The options can be chosen with the arrow keys, and each radio's accessible name includes its price.
- [x] R5, R6: Given 60 days was chosen, when the shopper switches to one-time and back, then 60 days is still
      selected.
- [x] R6, R9: Given the subscription, when 90 days is chosen, then the fine print says "every 90 days".
- [x] R8, R9: Given the subscription, when + is pressed twice, then the field shows 3, the button reads "Add to cart ·
      $76.38" and the fine print says "at $76.38". The option rows still show $25.46 and $29.95, and the status
      line stays empty, because the buttons never submit.
- [x] R8: At 1, "Decrease quantity" is `aria-disabled`, has the same colour as "Increase quantity" and keeps focus
      when pressed. At 10, "Increase quantity" does the same.
- [x] R8: The field has `inputMode="numeric"` and no visible spinner. With the field focused and the pointer over
      it, the mouse wheel doesn't change the value.
- [x] R8, R11: Typing 15 and leaving the field sets 10, and the status line shows and announces the correction.
      Typing 0 sets 1. Typing 2.6 sets 3. Clearing the field restores the last valid quantity. The next change
      clears the line.
- [x] R9: Given a quantity of 2, when the field is cleared and still has focus, then the button and the fine print
      still show the total for 2.
- [x] R10: Given 2 × subscription every 60 days, when "Add to cart" is pressed, then the status line reads "Added
      to cart: 2 × Vitamin D, delivered every 60 days, $50.92." in a polite live region. A later change clears it.
- [x] R10, R11: Pressing Enter in the quantity field with 15 corrects it to 10, then adds to the cart. The line shows
      the correction, then the summary. The form has `noValidate`, so the browser's own range check doesn't block it.
- [x] R11: Typing 15, then clicking "Add to cart" while the field still has focus, corrects the field to 10 on blur
      and adds 10 to the cart. The line shows the correction, then the summary.
- [x] R1, R10: In the default state, the empty status line has zero height.
- [x] R10: Enter on either radio, and on the frequency `select`, doesn't add to the cart.
- [x] R12: At 1200px the columns are 64 / 540 / 64 / 468 / 64 (the geometry test). At 1024px the layout is still two
      columns, with the photo column narrower and the box at full width.
- [x] R12: At 1440px and 1920px the columns stay 540 / 64 / 468, and from 960px up the left and right margins are
      equal within 1px.
- [x] R12: At 1024px and 768px there is no horizontal scroll. At 375px and 320px the layout is one column with no
      horizontal scroll. Each is checked in the default and one-time states.
- [x] R13: A keyboard-only run reaches every control, picks one-time, the subscription, 60 days and a quantity of 2,
      and adds to the cart without a mouse.
- [x] R14: Both axe runs pass at 375px and 1200px in each listed state, and the existing Part B smoke test uses the
      same two runs.
- [x] R15, R8, R9: Given a non-default quantity with either purchase option, when the shopper follows the nav to
      Part A and then the Part B nav link, the quantity is 1, the subscription is selected with 30 days, the cart
      button and fine print both show $25.46, and the status line is empty. Adding to cart reports that same
      quantity, frequency and total.
- [x] R3–R6, R8, R9: Given a non-default quantity with either purchase option, when "2,316 reviews" is clicked,
      the URL still selects Part B with `#reviews`, the purchase option and quantity are unchanged, and all totals
      agree. For a subscription, the chosen frequency and renewal notice are preserved too.
- [x] The page loads and every interaction runs with no console errors.

## Out of scope

- A real cart, a cart count or a mini-cart, and any network request.
- A reviews section, and the target of the "2,316 reviews" link.
- A photo gallery or zoom, stock levels, other products, and variants.
- Keeping the selection across reloads or in the URL.
- Frequency-dependent pricing. Every frequency has the same price, as in `copy.ts`.

## Known limitations

- **Four texts fail WCAG AA contrast (R14),** by the human's decision to match the design exactly. They are the
  only exception to axe's contrast check, and the spec lists them so that the exception stays visible.
- **The visual match can't be exact.** Font rasterisation differs between machines and browsers, the photo is
  resampled, and the e2e run loads the fonts from Google Fonts over the network. The visual test allows a tolerance,
  and it waits for the fonts to load.
- **Screen-reader output isn't tested with a real screen reader.** Tests check the live region's role and that its
  content node is replaced, not what NVDA or VoiceOver actually says.
- **The reviews link points to `#reviews`,** which doesn't exist on this page.
- **The stars are all full for a rating of 4.8,** as in the design.
- **"Add to cart" is simulated:** it only shows and announces a summary.
- **The totals may differ by 1¢ from Part A.** They use unit price × quantity, while Part A's mock rounds the
  discount on the total (`totalAfterDiscount`), so at a quantity of 3 or more a Part A subscription could differ by
  1¢ (3 × Vitamin D: $76.38 here, $76.37 there). The two parts are separate builds that share no cart.
- **The layout at any width other than 1200px (R12) is not from the design.**

## Open questions

None.
