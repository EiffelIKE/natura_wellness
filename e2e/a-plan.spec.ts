import { expectAccessibleLayout } from "./a11y";
import { expect, test, type Page } from "./test";

// 003: "Change your plan" against the real in-browser mock, on both projects (375px and 1200px). The clock and time
// zone are pinned in playwright.config.ts: now is Dec 10, 2026, the next order is Dec 16 ($101.87), and one skip
// moves it to Jan 15, 2027. A skip and its reload can each take up to 2.5s, so the expectations that wait for them
// get 10s.

const SLOW = { timeout: 10_000 };
const LINES = ["Every 60 days", "2 →to 1 Multivitamin, 30 tablets"];

const status = (page: Page) => page.getByRole("status");
const plan = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "Change your plan" }) });
const planHeading = (page: Page) => page.getByRole("heading", { name: "Change your plan" });
const nextOrder = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "Next order" }) });
const radio = (page: Page, name: string) => plan(page).getByRole("radio", { name, exact: true });
const multivitamin = (page: Page) => plan(page).getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" });
const pendingLines = (page: Page) => plan(page).getByRole("listitem");
const discard = (page: Page) => plan(page).getByRole("button", { name: "Discard changes" });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Skip your next order?" });

/** Loads the active fixture and picks every 60 days and Multivitamin 1, with the mouse. */
async function withChanges(page: Page, conflict: "never" | "always" = "never") {
  await page.goto(`/?part=a&fixture=active&conflict=${conflict}`);
  await radio(page, "Every 60 days").check();
  await multivitamin(page).selectOption("1");
  await expect(pendingLines(page)).toHaveText(LINES);
}

/** The next order is the server's, whatever is pending (R3). */
async function expectNextOrderUnchanged(page: Page) {
  await expect(nextOrder(page)).toContainText("Dec 16");
  await expect(nextOrder(page)).toContainText("$101.87");
  await expect(nextOrder(page)).toContainText("Every 30 days");
}

test("R1–R4, R6, R8: frequency and quantity by keyboard alone, each change announced", async ({ page }) => {
  await page.goto("/?part=a&fixture=active");
  const current = radio(page, "Every 30 days (current)");
  await expect(current).toBeChecked();

  // Tab from the top of the page. The starter's nav links and the skip button come first, so this doesn't count
  // exact stops. Tab lands on the checked radio of the group.
  for (let stop = 0; stop < 8 && !(await current.evaluate((input) => input === document.activeElement)); stop++) {
    await page.keyboard.press("Tab");
  }
  await expect(current).toBeFocused();
  expect(await current.evaluate((input) => input.matches(":focus-visible"))).toBe(true);

  await page.keyboard.press("ArrowDown");
  await expect(radio(page, "Every 60 days")).toBeChecked();
  await expect(radio(page, "Every 60 days")).toBeFocused();
  await expect(status(page)).toHaveText("Frequency changed to every 60 days, starting after your Dec 16 order.");

  // One Tab leaves the radio group, past the Vitamin D select to the Multivitamin one.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(multivitamin(page)).toBeFocused();
  // R2: on a closed select, an arrow key changes the value and fires `change` (plan.md, Risks).
  await page.keyboard.press("ArrowUp");
  await expect(multivitamin(page)).toHaveValue("1");
  await expect(multivitamin(page)).toBeFocused();
  await expect(status(page)).toHaveText(
    "Multivitamin, 30 tablets quantity changed from 2 to 1, starting after your Dec 16 order. After that: $63.67 per order.",
  );

  await expect(plan(page)).toContainText("Starting after your Dec 16 order:");
  await expect(pendingLines(page)).toHaveText(LINES);
  await expect(plan(page).getByText("After that: $63.67 per order")).toBeVisible();
  await expectNextOrderUnchanged(page);
  // The products section keeps the server's quantity (R8).
  await expect(page.getByRole("listitem").filter({ hasText: "Quantity: 2" })).toHaveCount(1);
});

test("R3, 002 R3: after a skip, the changes start after the new next order", async ({ page }) => {
  await withChanges(page);

  await page.getByRole("button", { name: "Skip next order" }).click();
  await expect(dialog(page)).toContainText("Every 60 days starts after that order.");
  // The skip itself still follows the server's 30 days.
  await expect(dialog(page)).toContainText("Your next order moves to Jan 15, 2027, 30 days later");
  await expect(status(page)).toBeEmpty();

  await dialog(page).getByRole("button", { name: "Skip Dec 16 order" }).click();
  await expect(status(page)).toHaveText("Skipped. Your next order is Jan 15, 2027.", SLOW);

  await expect(plan(page)).toContainText("Starting after your Jan 15, 2027 order:");
  await expect(plan(page)).not.toContainText("Dec 16");
  await expect(pendingLines(page)).toHaveText(LINES);
  await expect(plan(page).getByText("After that: $63.67 per order")).toBeVisible();
  await expect(radio(page, "Every 60 days")).toBeChecked();
  await expect(nextOrder(page)).toContainText("Jan 15, 2027");
});

test("R7, 002 R11: a 409 and its reload keep every pending change", async ({ page }) => {
  await withChanges(page, "always");

  await page.getByRole("button", { name: "Skip next order" }).click();
  await dialog(page).getByRole("button", { name: "Skip Dec 16 order" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("Your subscription was changed somewhere else.", SLOW);
  // The reload is done once the alert shows, and the dialog still sees the pending frequency.
  await expect(dialog(page)).toContainText("Every 60 days starts after that order.");

  await dialog(page).getByRole("button", { name: "Keep my order" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(pendingLines(page)).toHaveText(LINES);
  await expect(plan(page)).toContainText("Starting after your Dec 16 order:");
  await expect(radio(page, "Every 60 days")).toBeChecked();
  await expect(multivitamin(page)).toHaveValue("1");
  await expectNextOrderUnchanged(page);
});

test("R5: Discard by keyboard empties the changes and moves focus to the heading", async ({ page }) => {
  await withChanges(page);

  await discard(page).focus();
  await page.keyboard.press("Enter");

  await expect(planHeading(page)).toBeFocused();
  await expect(status(page)).toHaveText("Changes discarded.");
  await expect(discard(page)).toHaveCount(0);
  await expect(pendingLines(page)).toHaveCount(0);
  await expect(plan(page)).not.toContainText("After that");
  await expect(radio(page, "Every 30 days (current)")).toBeChecked();
  await expect(multivitamin(page)).toHaveValue("2");
  await expect(multivitamin(page).locator("option:checked")).toHaveText("2 (current)");

  // From the heading, the next Tab stop is the frequency group, not the top of the page.
  await page.keyboard.press("Tab");
  await expect(radio(page, "Every 30 days (current)")).toBeFocused();
});

test("R5: setting the frequency back to the server's clears its line", async ({ page }) => {
  await page.goto("/?part=a&fixture=active");
  await radio(page, "Every 90 days").check();
  await expect(pendingLines(page)).toHaveText(["Every 90 days"]);

  await radio(page, "Every 30 days (current)").check();
  await expect(status(page)).toHaveText("Frequency back to every 30 days, no change pending.");
  await expect(pendingLines(page)).toHaveCount(0);
  await expect(discard(page)).toHaveCount(0);
});

test("R9: with a change pending, a nav link asks first and staying keeps it; with none, the link just leaves", async ({
  page,
}) => {
  await withChanges(page);
  const prompts: string[] = [];
  // Handling the event stops Playwright's auto-dismiss, and dismiss() is "Stay on page".
  page.on("dialog", (prompt) => {
    prompts.push(prompt.type());
    void prompt.dismiss();
  });
  const partB = page.getByRole("link", { name: "Part B: Buy box" });

  await partB.click();
  await expect.poll(() => prompts).toEqual(["beforeunload"]);
  await expect(page).toHaveURL(/part=a/);
  await expect(pendingLines(page)).toHaveText(LINES);
  await expect(radio(page, "Every 60 days")).toBeChecked();
  await expect(multivitamin(page)).toHaveValue("1");

  // Nothing pending once discarded, so the same link navigates with no prompt.
  await discard(page).click();
  await partB.click();
  await expect(page).toHaveURL(/part=b/);
  expect(prompts).toEqual(["beforeunload"]);
});

test("R9: with nothing pending, leaving asks nothing", async ({ page }) => {
  await page.goto("/?part=a&fixture=active");
  await expect(radio(page, "Every 30 days (current)")).toBeChecked();
  let prompted = false;
  page.on("dialog", (prompt) => {
    prompted = true;
    void prompt.dismiss();
  });

  await page.getByRole("link", { name: "Part B: Buy box" }).click();
  await expect(page).toHaveURL(/part=b/);
  expect(prompted).toBe(false);
});

test("R8: with changes pending, the page passes axe with no horizontal scroll", async ({ page }) => {
  await withChanges(page);
  await expectAccessibleLayout(page);
  // 44px touch targets: each radio row and each select.
  for (const target of [...(await plan(page).locator("label:has(input)").all()), multivitamin(page)]) {
    expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe("at 320px (WCAG 1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("with changes pending, the page passes axe with no horizontal scroll, and the selects fit", async ({ page }) => {
    test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
    await withChanges(page);
    await expectAccessibleLayout(page);
    const mainBox = await page.getByRole("main").boundingBox();
    for (const select of await plan(page).getByRole("combobox").all()) {
      const box = await select.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((mainBox?.x ?? 0) + (mainBox?.width ?? 0));
    }
  });
});
