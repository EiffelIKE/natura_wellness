import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./e2e/test";

const port = 5179;

// 005 R2: the pixel test needs its own 2x project, and nothing else runs in it.
const visualSpec = /b-visual\.spec\.ts$/;

export default defineConfig<TestOptions>({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    // Fixture dates are relative to "now" and shown in the browser's time zone, so both are pinned
    // to keep e2e text stable. Noon avoids midnight edges, and the next order (Dec 16) skips into
    // 2027, which exercises the "show the year" rule. Timers stay real (see e2e/test.ts).
    timezoneId: "America/New_York",
    startTime: "2026-12-10T12:00:00-05:00",
  },
  projects: [
    // Most customers are on a 375px phone, so mobile is the primary project.
    {
      name: "mobile",
      testIgnore: visualSpec,
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
    {
      name: "desktop",
      testIgnore: visualSpec,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1200, height: 780 } },
    },
    // 005 R2: the design is a 2x screenshot of a 1200×780 window. `desktop` is 1x, so it can't match it.
    // The baseline is e2e/__screenshots__/buy-box.png, a committed copy of public/reference/buy-box.png.
    {
      name: "visual",
      testMatch: visualSpec,
      snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1200, height: 780 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
});
