# Agent work log

Newest first. One entry per completed task. Format and rules are in [README.md](README.md).

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
