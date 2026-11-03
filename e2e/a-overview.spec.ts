import { catalog } from "../src/api/fixtures";
import { expectAccessibleLayout } from "./a11y";
import { expect, test, type Page } from "./test";

// 001: every fixture and the 404, on both projects (375px and 1200px). The clock and time zone are pinned in
// playwright.config.ts, so the dates are literals: now is Dec 10, 2026, noon in New York.

/**
 * R1: the loading state lasts 400–2500ms, which `toHaveText`'s widening poll intervals can miss.
 * This polls every animation frame in the page instead.
 */
async function waitForLoadingAnnouncement(page: Page) {
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Loading your subscription",
    null,
    { polling: "raf" },
  );
}

/** R8: every row's thumbnail has the first row's x and size, and every name starts at the same x. */
async function expectRowsAligned(page: Page) {
  const rows = await page.getByRole("listitem").all();
  const boxes = await Promise.all(
    rows.map(async (row) => ({
      thumb: await row.locator(":scope > :first-child").boundingBox(),
      name: await row.locator("p").first().boundingBox(),
    })),
  );
  const [first] = boxes;
  for (const { thumb, name } of boxes) {
    expect(thumb).toMatchObject({ x: first?.thumb?.x, width: first?.thumb?.width, height: first?.thumb?.height });
    expect(name?.x).toBe(first?.name?.x);
  }
}

const status = (page: Page) => page.getByRole("status");
// getByText would resolve to the innermost match, the visually hidden "Status:" span, so match the whole badge.
const badge = (page: Page) => page.locator("main p", { hasText: /^Status: / });

test("R1: shows the skeleton and announces loading, then clears both once loaded", async ({ page }) => {
  await page.goto("/?part=a&fixture=active", { waitUntil: "commit" });
  // Same frame as the announcement: the skeleton is a direct child of main, hidden from assistive tech, with shapes.
  await page.waitForFunction(
    () =>
      document.querySelector('[role="status"]')?.textContent === "Loading your subscription" &&
      (document.querySelector('main > [aria-hidden="true"]')?.childElementCount ?? 0) > 0,
    null,
    { polling: "raf" },
  );

  await expect(page.getByRole("heading", { name: "In your subscription" })).toBeVisible();
  await expect(status(page)).toBeEmpty();
  // Product placeholders are aria-hidden too, but they sit inside the list, not directly in main.
  await expect(page.locator('main > [aria-hidden="true"]')).toHaveCount(0);
});

test("R2: a 500 shows the error, and Try again loads again from the heading", async ({ page }) => {
  await page.goto("/?part=a&fixture=error");

  await expect(page.getByRole("alert")).toHaveText("We couldn't load your subscription.");
  await expect(page.getByRole("link", { name: "Contact support" })).toHaveCount(0);
  await expectAccessibleLayout(page);

  await page.getByRole("button", { name: "Try again" }).click();
  await waitForLoadingAnnouncement(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  await expect(page.getByRole("alert")).toHaveText("We couldn't load your subscription.");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
});

test("R2, R11: an unknown subscription shows the 404 and the contact link, with no retry", async ({ page }) => {
  await page.goto("/?part=a&fixture=missing");

  await expect(page.getByRole("alert")).toHaveText("We couldn't find a subscription on your account.");
  await expect(page.getByRole("link", { name: "Contact support" })).toHaveAttribute(
    "href",
    "mailto:support@naturawellness.example",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await expectAccessibleLayout(page);
});

test("R3, R4, R8: the active subscription shows the server's next order and both products", async ({ page }) => {
  await page.goto("/?part=a&fixture=active");

  const nextOrder = page.getByRole("heading", { name: "Next order" });
  await expect(nextOrder).toBeVisible();
  await expect(badge(page)).toHaveText("Status: Active");
  await expect(page.getByText("Dec 16", { exact: true })).toBeVisible();
  // totalAfterDiscount: (29.95 + 2 × 44.95) × 0.85, rounded once, as the mock does.
  await expect(page.getByText("$101.87", { exact: true })).toBeVisible();
  await expect(page.getByText("Includes your 15% subscription discount")).toBeVisible();
  await expect(page.getByText("Every 30 days")).toBeVisible();

  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Vitamin D, 60 softgels");
  await expect(rows.nth(0)).toContainText("Quantity: 1");
  await expect(rows.nth(1)).toContainText("Multivitamin, 30 tablets");
  await expect(rows.nth(1)).toContainText("Quantity: 2");

  // R8: the image really loaded, and the placeholder row lines up with it.
  const image = rows.nth(0).locator("img");
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)))
    .toBeGreaterThan(0);
  await expectRowsAligned(page);

  // R3: the date is the largest text on the page, bigger than the h1.
  const fontSize = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(await fontSize("main time")).toBeGreaterThan(await fontSize("h1"));

  await expectAccessibleLayout(page);
});

test("R5, R11: a paused subscription shows its end date and the contact link, and no actions", async ({ page }) => {
  await page.goto("/?part=a&fixture=paused");

  await expect(page.getByText("Paused until Jan 3, 2027")).toBeVisible();
  await expect(badge(page)).toHaveText("Status: Paused");
  await expect(page.getByRole("link", { name: "Contact support" })).toHaveAttribute(
    "href",
    "mailto:support@naturawellness.example",
  );
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Next order" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  await expectAccessibleLayout(page);
});

test("R6: a cancelled subscription shows its cancel date, and no actions", async ({ page }) => {
  await page.goto("/?part=a&fixture=cancelled");

  await expect(page.getByText("Cancelled on Nov 30")).toBeVisible();
  await expect(badge(page)).toHaveText("Status: Cancelled");
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Next order" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link")).toHaveCount(0);
  await expectAccessibleLayout(page);
});

// T7 edge cases and flows, chosen by the human.

const inYourSubscription = (page: Page) => page.getByRole("heading", { name: "In your subscription" });

const states = [
  { name: "active", fixture: "active", ready: inYourSubscription },
  { name: "paused", fixture: "paused", ready: inYourSubscription },
  { name: "cancelled", fixture: "cancelled", ready: inYourSubscription },
  { name: "error (500)", fixture: "error", ready: (page: Page) => page.getByRole("alert") },
  { name: "not found (404)", fixture: "missing", ready: (page: Page) => page.getByRole("alert") },
];

test("T8, R8: an image that fails to load becomes the placeholder, and the rows still line up", async ({ page }) => {
  await page.route("**/product.jpg", (route) => route.abort());
  await page.goto("/?part=a&fixture=active");

  const vitaminD = page.getByRole("listitem").filter({ hasText: "Vitamin D, 60 softgels" });
  await expect(vitaminD.locator('[aria-hidden="true"]')).toBeVisible();
  await expect(vitaminD.locator("img")).toHaveCount(0);
  await expectRowsAligned(page);
  await expectAccessibleLayout(page);
});

for (const width of [375, 320]) {
  test(`T10, R10: long names and many items wrap without horizontal scroll at ${width}px`, async ({ page }) => {
    test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/?part=a&fixture=active");
    await expect(page.getByRole("listitem")).toHaveCount(2);

    // The mock only sends two short names and src/api is read-only, so copy rows and give them the catalog's
    // names in the rendered page. That checks the CSS, which is what can break at these widths.
    await page.evaluate(
      (names) => {
        const list = document.querySelector("main ul");
        const template = list?.querySelector("li:last-child");
        if (!list || !template) throw new Error("no product list");
        for (const name of names) {
          const row = template.cloneNode(true) as HTMLElement;
          const nameElement = row.querySelector("p");
          if (nameElement) nameElement.textContent = name;
          list.append(row);
        }
      },
      catalog.map((product) => product.name),
    );

    await expect(page.getByRole("listitem")).toHaveCount(2 + catalog.length);
    await expectRowsAligned(page);
    const mainBox = await page.getByRole("main").boundingBox();
    for (const name of await page.locator("main li p:first-of-type").all()) {
      const box = await name.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((mainBox?.x ?? 0) + (mainBox?.width ?? 0));
    }
    await expectAccessibleLayout(page);
  });
}

test.describe("T12, R10: reflow at 320px (WCAG 1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const { name, fixture, ready } of states) {
    test(`${name} has no horizontal scroll and passes axe`, async ({ page }) => {
      test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
      await page.goto(`/?part=a&fixture=${fixture}`);
      await expect(ready(page)).toBeVisible();
      await expectAccessibleLayout(page);
    });
  }
});

test("T12, R2: Try again works by keyboard alone, with Enter and with Space", async ({ page }) => {
  await page.goto("/?part=a&fixture=error");
  const retry = page.getByRole("button", { name: "Try again" });
  await expect(retry).toBeVisible();

  // Tab from the top of the page. The starter's nav links come first, so this doesn't count exact stops.
  for (let stop = 0; stop < 5 && !(await retry.evaluate((button) => button === document.activeElement)); stop++) {
    await page.keyboard.press("Tab");
  }
  await expect(retry).toBeFocused();

  for (const key of ["Enter", "Space"]) {
    await page.keyboard.press(key);
    await waitForLoadingAnnouncement(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(retry).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(retry).toBeFocused();
  }
});

for (const { name, fixture, ready } of states) {
  test(`T12: the ${name} state loads with no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`/?part=a&fixture=${fixture}`);
    await expect(ready(page)).toBeVisible();
    expect(errors).toEqual([]);
  });
}
