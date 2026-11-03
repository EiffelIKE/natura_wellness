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
    // Inter comes from Google Fonts with `display=swap`. If it lands after the first actions, the text rewraps and
    // moves the controls between Playwright's stability check and its tap: a cancel e2e tapped below
    // "Undo cancellation" when it moved up 25px. So every goto and reload waits for the web fonts.
    const fontsReady = () => page.evaluate(() => document.fonts.ready.then(() => undefined));
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await fontsReady();
      return response;
    };
    page.reload = async (options) => {
      const response = await reload(options);
      await fontsReady();
      return response;
    };
    await use(page);
  },
});

export { expect, type Page } from "@playwright/test";
