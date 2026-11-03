import { test as base } from "@playwright/test";

export interface TestOptions {
  /** Pinned start time for the page clock, set in playwright.config.ts. */
  startTime: string;
}

// Every e2e test imports `test` from here, not from @playwright/test (enforced by ESLint).
// The page clock starts at `startTime`, so the mock fixtures' relative dates are the same on every run.
// Time keeps flowing and timers stay real: `setFixedTime` would freeze Date.now(), which stops
// `conflict=always` from returning a 409 on the second attempt (the mock compares updatedAt values).
export const test = base.extend<TestOptions>({
  // No default: playwright.config.ts is the one place the date is set.
  startTime: ["", { option: true }],
  page: async ({ page, startTime }, use) => {
    if (!startTime) throw new Error("Set `startTime` in playwright.config.ts");
    await page.clock.setSystemTime(new Date(startTime));
    await use(page);
  },
});

export { expect } from "@playwright/test";
