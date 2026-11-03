# Natura Wellness frontend test

Natura Wellness is a fictional brand made up for this test. The full brief is in `INSTRUCTIONS.md`.

```
npm install
npm run dev
```

- **Part A:** `src/part-a/SubscriptionCard.tsx`. Open `/?part=a&fixture=active`. The mock API is in `src/api/`; switch cases with `?fixture=active|paused|cancelled|error` and force the "changed elsewhere" error with `&conflict=always`. Other products are in `catalog` in `src/api/fixtures.ts`.
- **Part B:** `src/part-b/BuyBox.tsx`. Open `/?part=b`. Match `public/reference/buy-box.png`, which is a 2x screenshot of a 1200px-wide browser window. Copy is in `src/part-b/copy.ts`; Fraunces and Inter are loaded in `index.html`.

You can add any libraries you like.

## Testing

```
npm run check   # typecheck, lint, format check, unit tests (Vitest), e2e tests (Playwright + axe)
```

### Dates and time zones in e2e tests

The mock fixtures build their dates relative to "now". For example, the active subscription's next charge is
"now + 6 days". The page then shows those dates in the browser's time zone. Without pinning, the text an e2e test
sees would change with the day it runs and the machine's time zone. A timestamp near midnight can even land on a
different calendar day.

So e2e tests pin both, in `playwright.config.ts`:

- `timezoneId: "America/New_York"`
- `startTime: "2026-12-10T12:00:00-05:00"`. This is noon, so there are no midnight edges. The next order is Dec 16,
  and a skip moves it to Jan 15, 2027, which exercises the "show the year" rule.

`e2e/test.ts` applies the start time with `page.clock.setSystemTime()`. The clock starts at that moment and keeps
running, and timers stay real, so the mock's 400–2500ms latency is still exercised. The date is deliberately not
fully frozen (`setFixedTime`). The mock detects a conflict by comparing `updatedAt` timestamps, and with a frozen
`Date.now()` the second attempt under `conflict=always` would match and wrongly succeed.

E2e tests must import `test` and `expect` from `./test`, not `@playwright/test`. ESLint enforces this.

Unit tests don't use the browser clock. Date formatting is tested with an injected `now`.
