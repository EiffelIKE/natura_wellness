# Agent work log

Newest first. One entry per completed task. Format and rules are in [README.md](README.md).

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
