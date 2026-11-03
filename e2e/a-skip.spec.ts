import { expectAccessibleLayout } from "./a11y";
import { expect, test, type Page } from "./test";

// 002: the skip flow against the real in-browser mock, on both projects (375px and 1200px). The clock and time zone
// are pinned in playwright.config.ts: now is Dec 10, 2026, the next order is Dec 16, and one skip moves it to
// Jan 15, 2027. A skip and its reload can each take up to 2.5s, so the expectations that wait for them get 10s.

const SLOW = { timeout: 10_000 };
const CONFLICT_MESSAGE =
  "Your subscription was changed somewhere else. We've loaded the latest details. Check the dates and confirm again.";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Skip your next order?" });
const skipButton = (page: Page) => page.getByRole("button", { name: "Skip next order" });
const keep = (page: Page) => dialog(page).getByRole("button", { name: "Keep my order" });
const nextOrder = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "Next order" }) });

async function openDialog(page: Page, conflict: "never" | "always") {
  await page.goto(`/?part=a&fixture=active&conflict=${conflict}`);
  await skipButton(page).click();
  await expect(dialog(page)).toBeVisible();
}

test("R2, R4, R6: shows both dates, Esc changes nothing, and a confirmed skip is announced", async ({ page }) => {
  await openDialog(page, "never");

  await expect(dialog(page)).toContainText(
    "Your Dec 16 order will be skipped. Your next order moves to Jan 15, 2027, 30 days later on your current schedule.",
  );
  await expect(dialog(page)).toContainText("You won’t be charged $101.87 for it.");
  await expect(keep(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(skipButton(page)).toBeFocused();
  await expect(nextOrder(page)).toContainText("Dec 16");

  await skipButton(page).click();
  await dialog(page).getByRole("button", { name: "Skip Dec 16 order" }).click();

  await expect(page.getByRole("status")).toHaveText("Skipped. Your next order is Jan 15, 2027.", SLOW);
  await expect(dialog(page)).toBeHidden();
  await expect(skipButton(page)).toBeFocused();
  await expect(nextOrder(page)).toContainText("Jan 15, 2027");
});

test("R5: a double click sends one skip, and two Esc presses don't close the pending dialog", async ({ page }) => {
  await openDialog(page, "never");
  // Pausing the page clock holds the mock's setTimeout, so the skip stays pending for as long as the checks take.
  await page.clock.pauseAt(new Date("2026-12-10T12:05:00-05:00"));

  const confirm = dialog(page).getByRole("button", { name: "Skip Dec 16 order" });
  await confirm.dblclick();

  const pending = dialog(page).getByRole("button", { name: "Skipping…" });
  await expect(pending).toBeFocused();
  await expect(pending).toHaveAttribute("aria-disabled", "true");
  await expect(keep(page)).toBeDisabled();

  // Chrome stops honoring a prevented `cancel` on a second Esc without user activation (plan.md, Risks).
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  await expect(pending).toBeFocused();

  await page.clock.resume();
  await expect(dialog(page)).toBeHidden(SLOW);
  // Two skips would have moved the order to Feb 14.
  await expect(nextOrder(page)).toContainText("Jan 15, 2027");
  await expect(page.getByRole("status")).toHaveText("Skipped. Your next order is Jan 15, 2027.");
});

test("R7, R8: a 409 reloads, explains, and keeps the order; Contact us shows after the second", async ({ page }) => {
  await openDialog(page, "always");
  const alert = dialog(page).getByRole("alert");

  await dialog(page).getByRole("button", { name: "Skip Dec 16 order" }).click();
  await expect(alert).toHaveText(CONFLICT_MESSAGE, SLOW);
  await expect(keep(page)).toBeFocused();
  await expect(dialog(page).getByRole("button", { name: "Skip Dec 16 order" })).toBeVisible();
  await expect(dialog(page).getByRole("link", { name: "Contact us" })).toHaveCount(0);
  await expect(nextOrder(page)).toContainText("Dec 16");

  await dialog(page).getByRole("button", { name: "Skip Dec 16 order" }).click();
  const contact = dialog(page).getByRole("link", { name: "Contact us" });
  await expect(contact).toHaveAttribute("href", "mailto:support@naturawellness.example", SLOW);
  await expect(alert).toContainText(CONFLICT_MESSAGE);
  await expect(keep(page)).toBeFocused();
  await expectAccessibleLayout(page);

  await keep(page).click();
  await expect(dialog(page)).toBeHidden();
  await skipButton(page).click();
  await expect(alert).toBeEmpty();
  await expect(contact).toHaveCount(0);
  await expect(nextOrder(page)).toContainText("Dec 16");
});

test("R4, R6: the whole flow works by keyboard alone", async ({ page }) => {
  await page.goto("/?part=a&fixture=active&conflict=never");
  await expect(skipButton(page)).toBeVisible();

  // Tab from the top of the page. The starter's nav links come first, so this doesn't count exact stops.
  for (
    let stop = 0;
    stop < 5 && !(await skipButton(page).evaluate((button) => button === document.activeElement));
    stop++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(skipButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(keep(page)).toBeFocused();
  // Opened by keyboard, so the focus ring shows.
  expect(await keep(page).evaluate((button) => button.matches(":focus-visible"))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(skipButton(page)).toBeFocused();

  await page.keyboard.press("Space");
  await expect(keep(page)).toBeFocused();
  await page.keyboard.press("Tab");
  const confirm = dialog(page).getByRole("button", { name: "Skip Dec 16 order" });
  await expect(confirm).toBeFocused();
  // The page behind the modal is inert. Past the last button, focus goes to the browser's own UI (the document
  // loses focus) and then back to the first button. It never reaches the page behind.
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement === document.body && !document.hasFocus())).toBe(true);
  await page.keyboard.press("Tab");
  await expect(keep(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Skipped. Your next order is Jan 15, 2027.", SLOW);
  await expect(skipButton(page)).toBeFocused();
});

test("R2, R4: the open dialog passes axe with no horizontal scroll", async ({ page }) => {
  await openDialog(page, "never");
  await expect(keep(page)).toBeFocused();
  await expectAccessibleLayout(page);
});

test.describe("at 320px (WCAG 1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("the open dialog passes axe with no horizontal scroll, and fits the screen", async ({ page }) => {
    test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
    await openDialog(page, "never");
    await expectAccessibleLayout(page);
    const box = await dialog(page).boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
  });
});
