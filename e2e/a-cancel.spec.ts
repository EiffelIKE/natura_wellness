import { expectAccessibleLayout } from "./a11y";
import { expect, test, type Page } from "./test";

// 004: the cancel flow against the real in-browser mock, on both projects (375px with touch, and 1200px). The clock
// and time zone are pinned in playwright.config.ts: now is Dec 10, 2026, the next order is Dec 16 ($101.87), every
// 30 days, and one skip moves it to Jan 15, 2027. Nothing in the cancel flow waits on the network.

const REASONS = [
  "I have too much product left",
  "It costs too much",
  "I'm trying a different product",
  "I didn't see results",
  "Other",
];
const CANCELLED_TEXT = "Your subscription is cancelled. You won't be charged again.";
const EVERY_60_COSTS = "Ship every 60 days: $101.87 every 60 days instead of every 30";
const MULTI_1 = "Get 1 Multivitamin, 30 tablets instead of 2: save $38.20 per order";
const LINES = ["Every 60 days", "2 →to 1 Multivitamin, 30 tablets"];

const status = (page: Page) => page.getByRole("status");
const h1 = (page: Page) => page.getByRole("heading", { level: 1, name: "Manage my subscription" });
const badge = (page: Page) => page.locator("main p", { hasText: /^Status: / });
const trigger = (page: Page) => page.getByRole("button", { name: "Cancel subscription" });
const undo = (page: Page) => page.getByRole("button", { name: "Undo cancellation" });
// A closed <dialog> isn't in the accessibility tree, so these only match the step that is showing.
const step1 = (page: Page) => page.getByRole("dialog", { name: "Why are you cancelling?" });
const step2 = (page: Page) => page.getByRole("dialog", { name: "Cancel your subscription?" });
const openDialogs = (page: Page) => page.locator("dialog[open]");
// The status region repeats the message by design (R7), so the view's copy is matched apart from it.
const cancelledMessage = (page: Page) => page.locator("p:not([role=status])", { hasText: CANCELLED_TEXT });
const plan = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "Change your plan" }) });
const radio = (page: Page, name: string) => plan(page).getByRole("radio", { name, exact: true });
const multivitamin = (page: Page) => plan(page).getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" });
const pendingLines = (page: Page) => plan(page).getByRole("listitem");

async function load(page: Page) {
  await page.goto("/?part=a&fixture=active&conflict=never");
  await expect(trigger(page)).toBeVisible();
}

async function atStep1(page: Page) {
  await load(page);
  await trigger(page).click();
  await expect(step1(page)).toBeVisible();
}

async function atStep2(page: Page, reason: string) {
  await atStep1(page);
  await step1(page).getByRole("button", { name: reason }).click();
  await expect(step2(page)).toBeVisible();
}

/** R7: the cancelled view, its announcement and focus on the h1. */
async function expectCancelled(page: Page) {
  await expect(openDialogs(page)).toHaveCount(0);
  await expect(badge(page)).toHaveText("Status: Cancelled");
  await expect(cancelledMessage(page)).toBeVisible();
  await expect(status(page)).toHaveText(CANCELLED_TEXT);
  await expect(h1(page)).toBeFocused();
  await expect(trigger(page)).toHaveCount(0);
}

/** R10: the flow is gone, nothing changed, and focus is back on the trigger. */
async function expectKeptAndActive(page: Page) {
  await expect(openDialogs(page)).toHaveCount(0);
  await expect(badge(page)).toHaveText("Status: Active");
  await expect(trigger(page)).toBeFocused();
  await expect(status(page)).toBeEmpty();
}

for (const reason of REASONS) {
  test(`R1, R2, R3, R7, R8: "${reason}" cancels in 3 taps, and Undo brings it back`, async ({ page }) => {
    await load(page);
    // R7 counts taps. The mobile project has a touch screen, so it taps for real.
    const activate = test.info().project.name === "mobile" ? "tap" : "click";

    await trigger(page)[activate]();
    await step1(page).getByRole("button", { name: reason })[activate]();
    // R3: the cancel is always there, whatever the reason offers.
    await step2(page).getByRole("button", { name: "Yes, cancel my subscription" })[activate]();
    await expectCancelled(page);

    await undo(page)[activate]();
    await expect(badge(page)).toHaveText("Status: Active");
    await expect(status(page)).toHaveText("Cancellation undone. Your subscription is active.");
    await expect(h1(page)).toBeFocused();
    await expect(cancelledMessage(page)).toHaveCount(0);
    await expect(trigger(page)).toBeVisible();
  });
}

test("R1, R2, R7, R8: cancel and Undo by keyboard alone", async ({ page }) => {
  await load(page);

  // Tab from the top of the page. The starter's nav links and the controls above come first, so this doesn't
  // count exact stops.
  for (
    let stop = 0;
    stop < 15 && !(await trigger(page).evaluate((button) => button === document.activeElement));
    stop++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(trigger(page)).toBeFocused();
  expect(await trigger(page).evaluate((button) => button.matches(":focus-visible"))).toBe(true);

  await page.keyboard.press("Enter");
  // The dialog's name reads the question, so focus starts on the first reason.
  await expect(step1(page).getByRole("button", { name: REASONS[0] })).toBeFocused();
  for (let reason = 1; reason <= 3; reason++) await page.keyboard.press("Tab");
  await expect(step1(page).getByRole("button", { name: "I didn't see results" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(step2(page).getByRole("heading", { name: "Cancel your subscription?" })).toBeFocused();
  // "I didn't see results" has no offer, so the cancel is the next stop.
  await page.keyboard.press("Tab");
  await expect(step2(page).getByRole("button", { name: "Yes, cancel my subscription" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expectCancelled(page);

  // From the h1, Undo is the next stop.
  await page.keyboard.press("Tab");
  await expect(undo(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(badge(page)).toHaveText("Status: Active");
  await expect(status(page)).toHaveText("Cancellation undone. Your subscription is active.");
  await expect(h1(page)).toBeFocused();
});

test('R3, R5: "Too much product" hands over to the skip dialog with both dates', async ({ page }) => {
  await atStep2(page, "I have too much product left");
  await expect(step2(page).getByRole("list").getByRole("button")).toHaveText([
    "Skip my Dec 16 order",
    "Ship every 60 days",
  ]);

  await step2(page).getByRole("button", { name: "Skip my Dec 16 order" }).click();

  const skip = page.getByRole("dialog", { name: "Skip your next order?" });
  await expect(skip).toContainText(
    "Your Dec 16 order will be skipped. Your next order moves to Jan 15, 2027, 30 days later on your current schedule.",
  );
  // R5: one modal at a time, and focus follows 002 R4.
  await expect(openDialogs(page)).toHaveCount(1);
  await expect(skip.getByRole("button", { name: "Keep my order" })).toBeFocused();
  await expect(badge(page)).toHaveText("Status: Active");
});

test('R3, R4: with 90 days pending, "It costs too much" has no frequency offer', async ({ page }) => {
  await load(page);
  await radio(page, "Every 90 days").check();
  await trigger(page).click();
  await step1(page).getByRole("button", { name: "It costs too much" }).click();

  await expect(step2(page).getByRole("list").getByRole("button")).toHaveText([MULTI_1]);
  await expect(step2(page).getByRole("button", { name: /^Ship every/ })).toHaveCount(0);
  await expect(step2(page).getByRole("button", { name: "Yes, cancel my subscription" })).toBeVisible();
});

test('R6: "Ship every 60 days" applies the change, and the subscription stays active', async ({ page }) => {
  await atStep2(page, "It costs too much");
  await expect(step2(page).getByRole("list").getByRole("button")).toHaveText([EVERY_60_COSTS, MULTI_1]);

  await step2(page).getByRole("button", { name: EVERY_60_COSTS }).click();

  await expect(openDialogs(page)).toHaveCount(0);
  await expect(badge(page)).toHaveText("Status: Active");
  await expect(radio(page, "Every 60 days")).toBeChecked();
  await expect(pendingLines(page)).toHaveText(["Every 60 days"]);
  await expect(status(page)).toHaveText("Frequency changed to every 60 days, starting after your Dec 16 order.");
  await expect(page.getByRole("heading", { name: "Change your plan" })).toBeFocused();
});

test("R7, R8: cancelling with changes pending, then Undo, brings back the same changes", async ({ page }) => {
  await load(page);
  await radio(page, "Every 60 days").check();
  await multivitamin(page).selectOption("1");
  await expect(pendingLines(page)).toHaveText(LINES);

  await trigger(page).click();
  await step1(page).getByRole("button", { name: "Other" }).click();
  await step2(page).getByRole("button", { name: "Yes, cancel my subscription" }).click();
  await expectCancelled(page);
  await expect(plan(page)).toHaveCount(0);

  await undo(page).click();
  await expect(pendingLines(page)).toHaveText(LINES);
  await expect(radio(page, "Every 60 days")).toBeChecked();
  await expect(multivitamin(page)).toHaveValue("1");
  await expect(plan(page).getByText("After that: $63.67 per order")).toBeVisible();
});

test.describe("R10: leaving keeps the subscription", () => {
  test("Esc at step 1", async ({ page }) => {
    await atStep1(page);
    await page.keyboard.press("Escape");
    await expectKeptAndActive(page);
  });

  test("Keep my subscription at step 1", async ({ page }) => {
    await atStep1(page);
    await step1(page).getByRole("button", { name: "Keep my subscription" }).click();
    await expectKeptAndActive(page);
  });

  test("Esc at step 2", async ({ page }) => {
    await atStep2(page, "It costs too much");
    await page.keyboard.press("Escape");
    await expectKeptAndActive(page);
  });

  test("Keep my subscription at step 2", async ({ page }) => {
    await atStep2(page, "Other");
    await step2(page).getByRole("button", { name: "Keep my subscription" }).click();
    await expectKeptAndActive(page);
  });
});

/** The states the plan checks for axe and reflow, each with the dialog or view it ends on. */
const STATES: [string, (page: Page) => Promise<void>][] = [
  ["step 1", atStep1],
  [
    'step 2 for "Other", with the textarea',
    async (page) => {
      await atStep2(page, "Other");
      await expect(step2(page).getByRole("textbox", { name: "Tell us more (optional)" })).toBeVisible();
    },
  ],
  ['step 2 for "It costs too much", with the longest labels', (page) => atStep2(page, "It costs too much")],
  [
    "the cancelled view",
    async (page) => {
      await atStep2(page, "I didn't see results");
      await step2(page).getByRole("button", { name: "Yes, cancel my subscription" }).click();
      await expectCancelled(page);
    },
  ],
];

/** Content wider than the box: a horizontal scroll, or text cut off. */
const overflowsX = (element: Element) => element.scrollWidth > element.clientWidth;

/**
 * No WCAG 2.2 A/AA violations, and no horizontal scroll in the page. A modal sits in the top layer with its own
 * overflow, so the page check can't see inside it: the open dialog must also fit the screen with no horizontal
 * scroll of its own, and every button must fit its text (the long offer labels wrap, plan Risks) and be 44px tall.
 */
async function expectAccessibleState(page: Page) {
  await expectAccessibleLayout(page);
  const width = page.viewportSize()?.width ?? 0;
  const open = openDialogs(page);
  const dialogOpen = (await open.count()) === 1;
  if (dialogOpen) {
    const box = await open.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    expect(await open.evaluate(overflowsX)).toBe(false);
  }
  const scope = dialogOpen ? open : page.getByRole("main");
  for (const button of await scope.getByRole("button").all()) {
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate(overflowsX), (await button.textContent()) ?? "").toBe(false);
  }
}

for (const [name, reach] of STATES) {
  test(`axe and reflow: ${name}`, async ({ page }) => {
    await reach(page);
    await expectAccessibleState(page);
  });
}

test.describe("at 320px (WCAG 1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const [name, reach] of STATES) {
    test(`axe and reflow: ${name}`, async ({ page }) => {
      test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
      await reach(page);
      await expectAccessibleState(page);
    });
  }
});
