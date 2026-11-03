# 001: Plan

Spec: [spec.md](spec.md) (Approved)

## Approach

A single `SubscriptionCard` container owns a `useReducer` state machine. Presentational components render each
state. 001 builds only the loading, error and server-status views. The state is shaped so that 002–004 can add their
layers without reshaping it.

## State shape

```ts
type Load =
  | { kind: "loading" }
  | { kind: "failed" } // 500 or unknown → R2 "Try again"
  | { kind: "not-found" } // 404 → R2 contact link
  | { kind: "ready"; server: Subscription };

interface State {
  requestId: number; // the latest request sent
  load: Load;
  // Added later, never merged into `server` (001 R7, 003 R7):
  // local: { frequencyDays?: number; quantities: Record<string, number>; cancelled: boolean }  (003, 004)
  // skip: discriminated union for the dialog                                                 (002)
}

type Action =
  | { type: "load/started"; requestId: number }
  | { type: "load/succeeded"; requestId: number; subscription: Subscription }
  | { type: "load/failed"; requestId: number; error: unknown };
```

- **`requestId`:** the reducer ignores responses whose id isn't `state.requestId`, whatever `load` is. The id lives
  on `State`, not on a `Load` variant, so a late response is still recognized as stale after the latest one has
  loaded (the mock's latency is random, so request 2 can resolve before request 1). This covers the double effect in
  React StrictMode (main.tsx), and later the reloads after a skip failure (002 R7). The mock takes no `AbortSignal`,
  so dropping stale results is the only option.
- **Errors:** `ApiError` 404 maps to `not-found`, and anything else maps to `failed`. This mapping lives in the
  reducer, as a pure function that is unit-tested.
- **Effective status:** there is a selector, `viewOf(server)`, that returns `active | paused | cancelled`. In 001 it
  is just `server.status`. 004 adds the local cancel as a second argument, applying 001 R7: a server status that
  isn't active wins.

## Files

| File                                     | What                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `src/part-a/format.ts`                   | `formatDate(iso, now)`, `formatMoney(cents)`, `formatFrequency(days)` (R9) |
| `src/part-a/subscriptionReducer.ts`      | state, actions, reducer, `viewOf` selector                                 |
| `src/part-a/SubscriptionCard.tsx`        | container: reducer, load effect, picks the view                            |
| `src/part-a/views.tsx`                   | `LoadingCard`, `LoadError`, `ActiveView`, `PausedView`, `CancelledView`    |
| `src/part-a/ItemList.tsx`                | products with image or placeholder, and quantity (R8)                      |
| `src/part-a/SubscriptionCard.module.css` | the block; `.element` / `.element--modifier` inside (BEM-ish)              |
| `src/part-a/constants.ts`                | `SUPPORT_MAILTO` (R11), locale and currency                                |

`App.tsx`, `main.tsx` and `index.html` are not touched, because Part B shares them. There is no global reset. The
card sets `box-sizing` and its own font and colors for its subtree only, so nothing leaks into the Part B
pixel match.

## UI decisions

- **Headings:** an `h1` "Manage my subscription". In the active view, an `h2` "Next order" holds the date and
  amount, with the date as the largest text on the page, and an `h2` "In your subscription" holds the products.
- **Status:** a text badge ("Active", "Paused", "Cancelled"). Paused and cancelled cards use a muted surface and have
  no "Next order" block, so the difference never relies on color alone (R5, R6).
- **Skeleton:** a `role="status"` wrapper with visually hidden "Loading your subscription". The shapes are
  `aria-hidden`, and the shimmer is off under `prefers-reduced-motion`.
- **Load error:** a `role="alert"` message. "Try again" dispatches a new `load/started` and focus stays on the
  button.
- **Units:** rem for spacing and type, and px for hairline borders. CSS custom properties hold colors on the card
  root. Thumbnails are 4rem, and the placeholder is a neutral rounded square with an `aria-hidden` icon (R8).

## Testing

- **Unit (Vitest):**
  - `format.ts`: the year rule with an injected `now`, USD, and frequency text
  - the reducer: transitions, dropping stale requests, and the 404 versus other error mapping
- **Component (Testing Library):** `vi.mock("../api/mockApi")`, using `fixtures` from `src/api/fixtures.ts` as data.
  Covers each view, "Try again" calling the API again, and that there is no skip button outside active (prepares for
  002).
- **E2e (Playwright, mobile and desktop):** `e2e/a-overview.spec.ts` covers `active`, `paused`, `cancelled`, `error`
  and an unknown fixture (404). For each, it checks:
  - the key text
  - axe WCAG 2.2 A/AA
  - no horizontal scroll (`scrollWidth <= clientWidth`)

  The real mock's latency is kept, and expectations wait up to the default 5s. Dates are asserted as literals
  because the clock is pinned (see Risks).

## Risks

- **Relative dates and time zones:** fixture dates are relative to now and shown in the browser's time zone. In e2e
  tests both are pinned in `playwright.config.ts`: the clock starts at a fixed time and keeps running, in
  `America/New_York` (see the README, "Dates and time zones in e2e tests"). E2e tests can therefore assert literal
  dates: next order Dec 16, and after a skip Jan 15, 2027. Unit tests inject `now` into `formatDate`.
