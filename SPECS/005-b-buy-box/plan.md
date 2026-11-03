# 005: Plan

Status: Approved

Spec: [spec.md](spec.md) (Approved)

## Approach

Same shape as Part A:

- **Pure logic.** Money, totals and quantity parsing and correction live in `buyBox.ts`, with unit tests.
- **State.** A small reducer holds the option, the frequency, the quantity, the field's draft and the status line.
  Every rule in R8–R11 is a reducer transition, also unit-tested.
- **Rendering.** `BuyBox.tsx` only renders and dispatches. It adds the two behaviours that need the DOM: the
  non-passive wheel guard and the Enter guard.
- **Styling.** One CSS module whose custom properties are the colour tokens measured from the reference.

The visual work is driven by measurement, not by eye:

- a **geometry test** checks element boxes against the measured positions (±1 CSS px)
- a **pixel test** compares the full 2x screenshot with the protected baseline

Geometry catches layout drift precisely. The pixel ratio catches everything else (colour, type, radii, icons).

## Measurements from the reference

All values are in CSS px at 1x, measured from `buy-box.png` with scratch Pillow scripts on 2026-11-03 (bands of
non-background pixels, glyph cap heights, the most common colour per region). A half pixel means the edge falls
mid-pixel at 2x.

### Layout

| Element              | Measured                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Columns              | 64 page margin · photo card 540 · gap 64 · box 468 · 64 margin (= 1200)                           |
| Top                  | photo card top 56. Eyebrow cap top 58.5, so both columns start at 56                              |
| Photo card           | x 64, y 56, 540×540, 1px `#e7e1d6` border, white, radius ≈ 20                                     |
| Photo                | `product.jpg` at 500×500, centred (20 from each outer edge). Mean error 0.15/255 at this size     |
| Stars                | 5 × 14×14, 4 apart, x 669, y 86.5–100.5                                                           |
| "4.8" / reviews link | x 764.5 / 793.5–884. Underline at y 101                                                           |
| Title                | cap top 122.5, cap height 31                                                                      |
| Subtitle             | first cap top 180, line pitch 25.5, two lines at 468 wide                                         |
| Divider              | y 251.5, 1px `#e7e1d6`, full box width                                                            |
| One-time card        | y 276.5–336.5 (60 tall), 1px `#e1dbcf`, white, radius ≈ 12                                        |
| Subscription card    | y 348.5–529 (180.5 tall), 12 below, 2px `#17402f` look, `#f3f6f2`                                 |
| Card content         | 20 from the card's outer edge. Radio 20×20 at x 689 in both cards. Label x 721.5. Price ends 1115 |
| Badge                | x 903–999.5, y 376.5–397.5 (≈ 96×21), pill                                                        |
| Subscription prices  | `$25.46` cap top 371.5, `$29.95` cap top 394.5, right-aligned at 1115                             |
| Frequency row        | "Delivered every" x 722 (under the label). Select x 834.5–950, y 421–454, 1px `#cfd6d0`, white    |
| Perks                | cap tops 471 and 496 (pitch 25). Check icon x 723–734.5, text x 745.5                             |
| Quantity row         | y 553–609 (56 tall), 24 below the card. Stepper x 668–796 (128), button x 808–1136 (328)          |
| Radii                | stepper ≈ 10, button ≈ 10                                                                         |
| Trust row            | cap top 632. Icons 14 wide at x 669, 828.5 and 938, text about 7.5 after each icon                |
| Fine print           | cap tops 665 and ≈ 683, x 668 to about 1133, two lines                                            |

The selected card looks like a 2px border, but its radio sits at x 689 in both cards. So both cards get a 1px border,
and the selected one adds `box-shadow: inset 0 0 0 1px` in green. The content never shifts when the selection
changes.

### Colour tokens

| Token            | Value     | Used for                                                                          |
| ---------------- | --------- | --------------------------------------------------------------------------------- |
| `--page`         | `#fbf8f3` | page background                                                                   |
| `--surface`      | `#ffffff` | photo card, one-time card, select, stepper                                        |
| `--tint`         | `#f3f6f2` | selected card                                                                     |
| `--ink`          | `#1c2420` | labels, prices, "4.8", select text, quantity                                      |
| `--ink-muted`    | `#4a5550` | subtitle, "Delivered every", chevron, "−" and "+"                                 |
| `--ink-subtle`   | `#6b7a70` | eyebrow, reviews link, fine print (R14 exception)                                 |
| `--ink-faint`    | `#8a948e` | struck-through price (R14 exception)                                              |
| `--brand`        | `#17402f` | title, selected border, selected radio, button, check icons, trust text and icons |
| `--line`         | `#e7e1d6` | photo card border, divider                                                        |
| `--line-option`  | `#e1dbcf` | unselected card border                                                            |
| `--line-control` | `#cfd6d0` | select and stepper borders                                                        |
| `--radio-off`    | `#9aa59e` | unselected radio ring                                                             |
| `--star`         | `#d8a23a` | stars                                                                             |
| `--badge-bg`     | `#f6e7c4` | badge background                                                                  |
| `--badge-ink`    | `#7a5a12` | badge text (5.20:1, passes)                                                       |

"−" and "+" are both `#4a5550` in the reference, which confirms R8's rule: `aria-disabled` keeps the colour.

### Type, final values (tuned in T5)

The starting values came from cap heights and were about 5–8% too large for Inter. T5 matched text widths and ink
weight against the reference instead. All sizes are CSS px.

| Text                    | Final                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Eyebrow                 | Inter 600, 12px / 15px, uppercase through CSS, letter-spacing 0.135em                        |
| "4.8" / reviews         | Inter 600 / 400, 14px / 22px. The link is underlined, offset 3px                             |
| Title                   | Fraunces **500** (not 600: the ink weight matches 500), 44px / 48px, letter-spacing −0.008em |
| Subtitle                | Inter 400, 16px / 25.5px, in a box capped at 450px so "day," can never fit the first line    |
| Option labels           | Inter 600, 16px / 20px                                                                       |
| Option prices           | Inter 600, 18px (22px lines in the subscription card)                                        |
| Struck-through price    | Inter 400, 13px / 16px                                                                       |
| Badge                   | Inter 700, 10px / 21px, uppercase through CSS, letter-spacing 0.14em, padding 0 11px         |
| Delivered every / perks | Inter 400, 14px (perks 20px lines, 5px apart)                                                |
| Select / quantity       | Inter 400, 15px / Inter 600, 16px                                                            |
| Button                  | Inter 600, 16px. The "·" has 6px of margin each side and 60% opacity                         |
| Trust                   | Inter 500, 13px / 20px, 25px between items, 7.5px between icon and text                      |
| Fine print              | Inter 400, 12px / 18px                                                                       |

Layout notes from the tuning:

- **Everything sits on the half pixel.** The title's line height is 48px, not 1.1, so the divider and cards land on
  y 251.5 / 276.5 / 348.5, as in the reference. A fraction of a pixel off turns every box edge into a blurred line in
  the diff.
- **Padding.** Both cards have 20px side padding and 19px top and bottom. The subscription card is 18px above and
  16px below, because its header is 38px tall (two price lines).
- **Optical lifts.** The design sets its option labels and "Delivered every" about 1px above the row's centre and its
  prices 1px below. These are `translate` values of −1px, −0.5px and +0.5px, not layout changes.
- **Radios.** 20px, 2px ring. Selected: a 2px brand ring, a 3px white gap and a 10px brand dot.
- **Corners.** Cards 12px, select 8px, stepper and button 10px, badge a pill.

### Rendering flags for the `visual` project

The reference was rendered on macOS, with no font hinting and greyscale anti-aliasing. The `visual` project launches
Chromium with `--font-render-hinting=none --disable-lcd-text`. Without them, Linux Chromium hints the glyphs and
draws coloured fringes, and the same CSS scores 1.7% instead of 0.8%. The flags affect only that project.

## Files

| File                                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/part-b/copy.ts`                                 | new keys and templates only. The existing values stay byte-for-byte                                                                                                                                                                                                                                                                                                                                                 |
| `src/part-b/buyBox.ts`                               | `MIN_QUANTITY`, `MAX_QUANTITY`, `formatMoney`, `unitPriceCents`, `totalCents`, `parseQuantity`, `isValidQuantity`, `correctQuantity`                                                                                                                                                                                                                                                                                |
| `src/part-b/buyBoxReducer.ts`                        | state, actions and reducer                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/part-b/BuyBox.tsx`                              | page markup and behaviour                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/part-b/icons.tsx`                               | inline SVGs: star, check, check-circle, chevron, minus, plus. All `aria-hidden`                                                                                                                                                                                                                                                                                                                                     |
| `src/part-b/BuyBox.module.css`                       | tokens, layout, the narrow layout below 960px                                                                                                                                                                                                                                                                                                                                                                       |
| `src/part-b/*.test.ts(x)`                            | unit and component tests                                                                                                                                                                                                                                                                                                                                                                                            |
| `e2e/a11y.ts`                                        | `expectAccessibleBuyBox`: R14's two axe runs plus the reflow check                                                                                                                                                                                                                                                                                                                                                  |
| `e2e/smoke.spec.ts`                                  | Part B uses `expectAccessibleBuyBox`. Part A is unchanged                                                                                                                                                                                                                                                                                                                                                           |
| `e2e/visual.ts`                                      | `diffImages`: the in-browser diff for R2's attachment and ratio                                                                                                                                                                                                                                                                                                                                                     |
| `e2e/b-visual.spec.ts`                               | byte check, geometry, pixel test (project `visual` only)                                                                                                                                                                                                                                                                                                                                                            |
| `e2e/b-buy-box.spec.ts`                              | the flows on `mobile` and `desktop`                                                                                                                                                                                                                                                                                                                                                                                 |
| `e2e/__screenshots__/buy-box.png`                    | committed copy of the reference, the pixel test's baseline                                                                                                                                                                                                                                                                                                                                                          |
| `playwright.config.ts`                               | the `visual` project. `mobile` and `desktop` ignore `b-visual.spec.ts`                                                                                                                                                                                                                                                                                                                                              |
| `package.json`, `tsconfig*.json`, `eslint.config.js` | `@types/node` (dev only, approved by the human on 2026-11-03), for `node:fs` and `Buffer` in the visual test. `tsconfig.json` now covers `src/` only. The new `tsconfig.node.json` (with `e2e/tsconfig.json` extending it) covers the two tool configs and `e2e/`, with Node's types. `typecheck` runs both. Vite's own types reference Node's, so a shared config would let browser code use `Buffer` or `process` |

## `copy.ts` additions

```ts
export const copy = {
  // ...every existing key, unchanged
  photoAlt: "Natura Wellness Vitamin D bottle, 60 softgels",
  ratingLabel: (rating: string) => `Rated ${rating} out of 5`,
  optionsLegend: "Purchase option",
  originally: "originally",
  quantity: { label: "Quantity", decrease: "Decrease quantity", increase: "Increase quantity" },
  separator: "·",
  renewalNotice: (frequency: string, total: string) =>
    `Your subscription renews every ${frequency} at ${total} until you cancel. Skip or cancel anytime from your account.`,
  added: (quantity: number, title: string, plan: string, total: string) =>
    `Added to cart: ${quantity} × ${title}, ${plan}, ${total}.`,
  planOneTime: "one-time purchase",
  planEvery: (frequency: string) => `delivered every ${frequency}`,
  quantityCorrected: (n: number, min: number, max: number) =>
    `Quantity set to ${n}. You can order ${min} to ${max} at a time.`,
};
```

A unit test pins `renewalNotice("30 days", "$25.46") === copy.finePrint`, so the template can't drift from the
provided copy.

## State and reducer

```ts
type PurchaseOption = "one-time" | "subscribe";

interface State {
  option: PurchaseOption; // R4: "subscribe" by default
  frequency: string; // R6: one of copy.subscribe.frequencyOptions. Kept while one-time is selected (R5)
  quantity: number; // R8: the last valid quantity, 1–10. Every total uses this (R9)
  draft: string; // R8: what the field shows, possibly invalid while focused
  status: { correction: string | null; summary: string | null; seq: number }; // R10, R11
}
```

| Action               | Result                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `option/chosen`      | sets `option`. The status is cleared. Choosing the option already selected is ignored                                                         |
| `frequency/chosen`   | sets `frequency`, if it's one of the options and not the current one. The status is cleared. Otherwise it's ignored                           |
| `quantity/stepped`   | ±1 if the result is within 1–10, and `draft` follows. The status is cleared. At a limit it's ignored and returns the same state (R8)          |
| `quantity/typed`     | sets `draft`. If `parseQuantity(draft)` is a whole number from 1 to 10, `quantity` follows. Otherwise it stays (R9). The status is cleared    |
| `quantity/committed` | `correctQuantity(draft, quantity)` (R8). If the value changes, `correction` is set and `seq` increments (R11). See below                      |
| `cart/added`         | runs `quantity/committed` first, then sets `summary` and increments `seq`, keeping a `correction` that no summary has followed yet (R10, R11) |

- **"Clears" means** `correction` and `summary` become null. `seq` keeps counting.
- **"Ignored" means** the reducer returns the same state object, so nothing re-renders and the status line stays.
- **A commit announces a change of value, not of text (R8: "if the value changes").** `"15"`, `"0"`, `"2.6"`, `""`
  and `"abc"` change the value, so the correction is shown. `"1e1"`, `"05"` and `"3.0"` already mean the number they
  become, so the field's text is tidied (`"10"`, `"5"`, `"3"`) without a message. A draft that already reads as the
  quantity is ignored.
- **A repeated add announces only the summary.** A correction stays on the line only until a summary has followed
  it, so the first add after a correction shows both (R11), and pressing "Add to cart" again shows the summary alone,
  in a new `span`.
- **The correction stays first.** Clicking "Add to cart" blurs the field first, so the correction arrives as
  `quantity/committed` and `cart/added` follows it. Enter submits without a blur, so `cart/added` commits itself.
  Both paths end with the correction first, then the summary (R11).
- **`parseQuantity(raw)`:** the number, or `null` for text that isn't an HTML valid floating-point number. A number
  field only ever reports `""` or such a string, so this matches the browser. `isValidQuantity(n)` is true for a
  whole number from 1 to 10.
- **`correctQuantity(raw, last)`:** a number is rounded to the nearest whole number, then clamped to 1–10. Empty or
  non-numeric text returns `last`.

## Markup

```
main.page
  div.layout
    div.photoCard > img(src=/product.jpg, alt=copy.photoAlt, width=500, height=500)
    div.box
      p.eyebrow                                       data-contrast-exception
      p.rating
        span[aria-hidden] > 5 × StarIcon, "4.8"
        span.visuallyHidden "Rated 4.8 out of 5"
        a[href=#reviews] "2,316 reviews"              data-contrast-exception
      h1.title
      p.subtitle
      hr.divider
      form(noValidate, onSubmit)
        fieldset.options > legend.visuallyHidden
          div.card(onClick = select this option)      one-time
            label.header > input[type=radio, onKeyDown = Enter guard] · span.label · span.price
          div.card(onClick)                           subscription
            label.header > input[type=radio, onKeyDown] · span.label · span.badge · span.prices
                                                          (span.price · s.compare > span.visuallyHidden "originally ")
                                                          s.compare has data-contrast-exception
            div.details (only while subscribed)
              label[for=frequency] · span.selectWrap > select#frequency(onKeyDown = Enter guard) · ChevronIcon
              ul.perks > li > CheckIcon · text
        div.purchaseRow
          div.stepper
            button[type=button, aria-label, aria-disabled?] > MinusIcon
            label.visuallyHidden[for=quantity] · input#quantity[type=number, inputMode=numeric, min=1, max=10]
            button[type=button, aria-label, aria-disabled?] > PlusIcon
          button[type=submit].addToCart  "Add to cart" span[aria-hidden]"·" total
        p.status[role=status] > span[key=seq] {correction} {summary}
      ul.trust > li > CheckCircleIcon · text
      p.finePrint (only while subscribed)             data-contrast-exception
```

- **"−" and "+" are SVGs** with `aria-label`s from `copy.ts`, so no glyph text sits outside `copy.ts`.
- **Card click (R4).** `onClick` ignores targets inside `input, select, label, button, a`. Otherwise it dispatches
  `option/chosen` and focuses that card's radio. The two jsx-a11y rules (`click-events-have-key-events` and
  `no-static-element-interactions`) are disabled on that one line, with a comment: the radio is the keyboard path,
  and the handler is only a larger pointer target.
- **Enter guard (R10).** One `onKeyDown` handler, set on both radios and the frequency `select`, calls
  `preventDefault()` on Enter. Enter in the quantity field still submits. It sits on those three controls, not on
  the form, because jsx-a11y (`no-noninteractive-element-interactions`) rejects a key handler on a `form`, and the
  controls are exactly the Enter paths R10 names, so no rule needs disabling. The form has `noValidate`, so Chrome's native
  `min`/`max` check can't block a submit with 15 before `cart/added` corrects it. Both stepper buttons are
  `type="button"`, so they never submit.
- **Wheel guard (R8).** React's `onWheel` is passive and can't cancel the event. So an effect adds a native
  `wheel` listener with `{ passive: false }` that calls `preventDefault()` while the field has focus.
- **Spinners (R8).** `appearance: textfield` and `::-webkit-inner-spin-button { appearance: none; margin: 0 }`.
- **Commit (R8).** `onBlur` dispatches `quantity/committed`. `onSubmit` calls `preventDefault()` and dispatches
  `cart/added`.
- **Status line (R10, R11).** It is always mounted, and visible, not visually hidden. Its only child is a `span`
  keyed by `seq`, so a repeated identical message replaces the node and is announced again. When it's empty, it
  takes no height or margin, so the default screenshot is unaffected.
- **Contrast exceptions (R14).** The four exceptions carry `data-contrast-exception`. That one selector feeds axe's
  exclusion, and a test checks that exactly four elements carry it, so the exception can't spread without the test
  noticing.
- **Focus (R13).** `:focus-visible` gets a 2px `--brand` outline with a 2px offset. The radios and the select
  get it on their visible box.

## Responsive (R12)

- **At 960px and wider:** two columns, `minmax(0, 540px) minmax(420px, 468px)`. Both the gap and the side padding
  are `clamp(32px, 5.333vw, 64px)`, which is exactly 64 at 1200. The photo column absorbs the shrink first. At
  1024px the padding and gap are about 54.6 each, the box keeps 468 and the photo column is about 392. The photo
  scales inside its square card.
- **Above 1200px:** the grid is capped at `max-inline-size: 1072px` (540 + 64 + 468) and centred with
  `margin-inline: auto`. At 1200 the page's content box is already exactly 1072, so the design width is unchanged;
  wider, the extra space splits equally on both sides.
- **Height:** `.page` has no `min-height`. The page colour is on `body:has(.page)`, which fills the viewport, and
  `100vh` on `.page` plus the app's nav above it would scroll by the nav's height.
- **Below 960px:** one column, `max-width: 560px`, centred, with a 16px side padding. The photo comes first.
- **Option header:** a wrapping flex row, switching below 480px to a grid with columns for the radio, the wrapping
  label and the price. The badge sits below the label, and the price block stays top-right.
- **Frequency row:** wraps below 1200px, so the native select can move below its label instead of overflowing the
  indented details at 320px.
- **Quantity row:** wraps. The button is `flex: 1 1 180px`, so at 320px it goes under the stepper, full width. The
  button's text can wrap as a last resort; below 1200px its height can grow from the design's 56px minimum.
- **Trust row:** wraps, with a gap.
- The e2e reflow check covers 1024, 768, 375 and 320, plus both sides of the breakpoint (960 and 959), in the
  default and one-time states, before and after adding to cart. It checks page overflow, local clipping, column
  geometry and top-right prices. Quantity 10 at 320 covers both totals ($254.60 and $299.50) and the full-width
  button below the stepper.

## Testing strategy

### Unit: `buyBox.test.ts` and `buyBoxReducer.test.ts`

- **Money:** $29.95 and $25.46. Totals of 1, 2, 3 and 10 for both options: $76.38 at 3, $254.60 at 10.
- **`parseQuantity` and `correctQuantity`:**
  - 15 → 10
  - 0 → 1
  - −3 → 1
  - 2.6 → 3
  - 2.4 → 2
  - "" → last
  - "abc" → last
  - "1e1" → 10
- **Templates:** `renewalNotice("30 days", "$25.46") === copy.finePrint`.
- **Reducer:** every action, every ignored case (a step at a limit, an unknown frequency, a commit with no change),
  the status clearing on each change, `seq` incrementing on a repeated add, and the correction staying before the
  summary on both submit paths.

### Component: `BuyBox.test.tsx` (Testing Library)

- **No inline text (R1).** The test renders each state: default, one-time, 90 days with a quantity of 3, after
  "Add to cart", and after a correction. In each, it collects every non-empty text node with a `TreeWalker` and
  every `alt` and `aria-label`.
  - **Allowed set:** built only from `copy.ts`:
    - every string leaf, walked recursively, arrays included
    - each template's output for the state under test
    - `formatMoney` of each price and total
  - **The check:** every collected string must be in that set. This needs no new dependency. A temporary inline
    string proves that the test can fail.
- **Names:** each radio's accessible name, the legend, the select's label, the stepper's names and the status
  role.
- **Behaviour:**
  - one-time removes the details and the fine print
  - the frequency survives a switch to one-time and back
  - the card padding click
  - `aria-disabled` at both limits, with focus kept
  - typing and blur corrections
  - 15, then clicking "Add to cart" while the field has focus, gives the correction, then the summary
  - "+" pressed twice leaves the status line empty
  - a cleared field keeps the old total
  - Enter on a radio or the select doesn't submit
  - Enter in the field does
  - a repeated add replaces the status span
- **`data-contrast-exception`:** exactly four elements carry it, and they are the right ones.

### E2e, `mobile` and `desktop`: `b-buy-box.spec.ts`

- The spec's acceptance flows, run in the real browser:
  - collapse and restore
  - totals
  - the corrections, with the visible line
  - every Enter path, including Chromium's native radio submit, which is the reason for the guard
  - the wheel, on `desktop`, and no spinner on the focused, hovered field (a screenshot that must not change when
    spin buttons are forcibly hidden, because Chromium draws them only on hover or focus)
  - a keyboard-only run
  - no console errors
- `expectAccessibleBuyBox` in the default state, with one-time selected and after "Add to cart".
- Reflow at 1024, 768, 375 and 320, using `page.setViewportSize` inside the test.

### Further flows chosen by the human in T9 (2026-11-03)

- **T11 (R15, R8, R9): nav round trip.** Start with a subscription every 60 days at quantity 3, and separately a
  one-time purchase at quantity 2. Follow the actual nav links to Part A and back to Part B. Verify the default
  subscription, frequency and quantity, matching button and renewal totals, fixed unit prices and empty status;
  then add to cart and check that its summary agrees. Full-page navigation resets state under the existing
  no-persistence scope. Run at 375px and 1200px and check console errors throughout the navigation.
- **T12 (R3–R6, R8, R9): reviews link.** In the same two non-default selections, click the actual reviews link and
  verify `part=b` and `#reviews`, the product heading, unchanged selection and quantity, matching totals and the
  subscription's retained frequency. Keep the reviews target out of scope. Run at both project widths and check
  console errors.
- Complete these follow-up tests before T10's final acceptance review.

### E2e, `visual` project only: `b-visual.spec.ts`

Settings: 1200×780, `deviceScaleFactor: 2`, `snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}"`.

1. **Byte check.** `e2e/__screenshots__/buy-box.png` equals `public/reference/buy-box.png` byte for byte. This runs
   in Node and needs no page.
2. **Geometry.** With the nav hidden, the boxes of the photo card, the image, the divider, both cards, the badge,
   the select, the stepper and the button match the layout table within ±1 px. Two more checks:
   - **Subtitle lines.** The subtitle renders on exactly two lines: the distinct `top` values of
     `Range.getClientRects()` over its text. If not, the test fails with "Subtitle wraps to N lines, the design has
     2", so a change in font size, letter-spacing or column width shows up by name, not as a vague pixel diff.
   - **Empty status line.** It has zero height (spec R1, R10).
3. **Pixels.** The test hides the nav with `page.addStyleTag`. It waits for `document.fonts.ready` and fails with a
   clear message, naming each face, if `document.fonts.load()` finds no face or `document.fonts.check()` is false
   for Fraunces 600 or Inter 400–700 (the fonts load from the network). `check()` alone isn't enough: it returns true
   when the stylesheet defined no face at all. Then:
   - `page.screenshot({ scale: "device", animations: "disabled", caret: "hide" })` must be 2400×1560
   - `diffImages` compares it in the page with a canvas, using pixelmatch's YIQ colour delta at Playwright's
     default threshold of 0.2. It counts anti-aliased pixels too, so it is at least as strict as Playwright's
     check.
   - The diff image (differences in red over a faded reference) and `{ ratio }` are attached with
     `testInfo.attach` on every run.
   - The gate is `expect(page).toHaveScreenshot("buy-box.png", { scale: "device", maxDiffPixelRatio: TOLERANCE })`
     against the committed copy, and the helper's ratio must also be within `TOLERANCE`.

**Tolerance.** T5 set it after tuning (`TOLERANCE = 0.01`, from the helper's 0.77%): the helper's measured ratio rounded up to the next 0.5%, with a ceiling of
3%. If the tuned layout is still above 3%, I stop and report to the human. I never raise the ceiling silently. The
CHANGELOG records the helper's ratio and Playwright's own ratio, which comes from one run at `maxDiffPixelRatio: 0`.

## Risks

- **Font rendering.** The reference was probably captured on macOS, which doesn't hint fonts, so text edges will
  differ on Linux whatever we do. The geometry test keeps layout honest even when the pixel ratio is noisy.
- **Network fonts** make the visual test depend on Google Fonts. It fails with a clear font message, never a
  misleading pixel diff.
- **Re-announcing.** Replacing a keyed `span` is the standard way to re-announce identical text, but no automated
  test runs a real screen reader (spec, Known limitations).
- **A long total at 375px** ("Add to cart · $254.60") is tight next to the stepper. The wrapping rules and the
  quantity-10 reflow test cover it.
- **Chromium's native Enter submit on radios** means the radios need an explicit Enter guard, and the `select` gets
  the same one so every browser behaves alike. The e2e test runs it in real Chromium.
