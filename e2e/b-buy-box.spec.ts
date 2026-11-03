import { copy } from "../src/part-b/copy";
import { expectAccessibleBuyBox } from "./a11y";
import { expect, type Page, test } from "./test";

// The mobile and desktop projects supply R14's 375px and 1200px viewports.
for (const option of ["subscription", "one-time"] as const) {
  test(`005 T7, R14: ${option} passes both axe runs before and after adding to cart`, async ({ page }) => {
    await page.goto("/?part=b");
    if (option === "one-time") {
      await page.getByRole("radio", { name: /^One-time purchase/ }).check();
      await expect(page.getByRole("combobox")).toHaveCount(0);
    } else {
      await expect(page.getByRole("combobox", { name: copy.subscribe.frequencyLabel })).toHaveValue("30 days");
    }
    await expect(page.getByRole("status")).toBeEmpty();
    await expectAccessibleBuyBox(page);

    await page.getByRole("button", { name: /^Add to cart/ }).click();
    await expect(page.getByRole("status")).toHaveText(
      option === "subscription"
        ? copy.added(1, copy.title, copy.planEvery("30 days"), "$25.46")
        : copy.added(1, copy.title, copy.planOneTime, "$29.95"),
    );
    await expectAccessibleBuyBox(page);
  });
}

/** 005 R12: check local clipping as well as page overflow; hiding overflow must not make reflow pass. */
async function expectReflow(page: Page, width: number) {
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const elements = document.querySelectorAll<HTMLElement>(
      "main, main img, main form, main fieldset, main label, main button, main select, main li, main p",
    );
    return {
      page: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clipped: [...elements].flatMap((element) => {
        const style = getComputedStyle(element);
        if (style.clipPath === "inset(50%)") return []; // Intentional screen-reader-only text.
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return [];
        if (rect.left >= 0 && rect.right <= viewport + 1 && element.scrollWidth <= element.clientWidth + 1) {
          return [];
        }
        return [`${element.tagName}: ${element.textContent?.trim() || element.getAttribute("alt")}`];
      }),
    };
  });
  expect(overflow.page, "The page must not scroll horizontally").toBeLessThanOrEqual(width);
  expect(overflow.clipped, "Content and controls must fit without clipping").toEqual([]);

  const photo = await page.getByRole("img", { name: copy.photoAlt }).locator("..").boundingBox();
  const box = await page.getByRole("heading", { name: copy.title }).locator("..").boundingBox();
  expect(photo).not.toBeNull();
  expect(box).not.toBeNull();
  if (!photo || !box) throw new Error("The photo card and buy box must be rendered");

  expect(Math.abs(photo.width - photo.height), "The photo card stays square").toBeLessThanOrEqual(1);
  if (width >= 960) {
    expect(Math.abs(photo.y - box.y), "Both columns start on the same row").toBeLessThanOrEqual(1);
    expect(photo.x + photo.width).toBeLessThan(box.x);
    expect(Math.abs(box.width - 468), "The photo absorbs the shrink before the buy box").toBeLessThanOrEqual(1);
  } else {
    expect(photo.y + photo.height).toBeLessThan(box.y);
    expect(Math.abs(photo.x - box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(photo.width - box.width)).toBeLessThanOrEqual(1);
    expect(box.width).toBeLessThanOrEqual(560);
    expect(Math.abs(box.x - (width - box.width) / 2), "The single column is centred").toBeLessThanOrEqual(1);
  }

  // Even when labels wrap, prices remain at the top-right of each header (plan.md, Responsive).
  for (const radio of await page.getByRole("radio").all()) {
    const header = radio.locator("..");
    const price = await header.locator(":scope > span:last-child").boundingBox();
    const headerBox = await header.boundingBox();
    const radioBox = await radio.boundingBox();
    expect(price).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(radioBox).not.toBeNull();
    if (!price || !headerBox || !radioBox) throw new Error("Each option must have a header, radio and price");
    expect(Math.abs(price.x + price.width - headerBox.x - headerBox.width)).toBeLessThanOrEqual(1);
    expect(price.y).toBeLessThanOrEqual(radioBox.y + 1);
  }
}

// Fixed widths only need one project. Include both sides of the breakpoint to catch an off-by-one media query.
for (const width of [1024, 960, 959, 768, 375, 320]) {
  test(`005 T6, R12: subscription and one-time reflow at ${width}px`, async ({ page }) => {
    test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/?part=b");
    await page.evaluate(() => document.fonts.ready);

    const add = page.getByRole("button", { name: /^Add to cart/ });
    await expect(page.getByRole("combobox", { name: copy.subscribe.frequencyLabel })).toBeVisible();
    await expectReflow(page, width);
    await add.click();
    await expect(page.getByRole("status")).not.toBeEmpty();
    await expectReflow(page, width);

    await page.getByRole("radio", { name: /^One-time purchase/ }).check();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expectReflow(page, width);
    await add.click();
    await expect(page.getByRole("status")).not.toBeEmpty();
    await expectReflow(page, width);
  });
}

test("005 T6, R12: quantity 10 and long totals fit at 320px", async ({ page }) => {
  test.skip(test.info().project.name === "desktop", "The viewport is set here, so one project is enough.");
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/?part=b");
  await page.evaluate(() => document.fonts.ready);

  const quantity = page.getByRole("spinbutton", { name: copy.quantity.label });
  const add = page.getByRole("button", { name: /^Add to cart/ });
  await quantity.fill("10");
  await expect(add).toContainText("$254.60");
  await expectReflow(page, 320);
  const stepper = await quantity.locator("..").boundingBox();
  const button = await add.boundingBox();
  expect(stepper).not.toBeNull();
  expect(button).not.toBeNull();
  if (!stepper || !button) throw new Error("The quantity stepper and add button must be rendered");
  expect(button.y).toBeGreaterThanOrEqual(stepper.y + stepper.height);
  expect(button.width, "The button fills its own row").toBe(288);
  await add.click();
  await expectReflow(page, 320);

  await page.getByRole("radio", { name: /^One-time purchase/ }).check();
  await expect(quantity).toHaveValue("10");
  await expect(add).toContainText("$299.50");
  await add.click();
  await expectReflow(page, 320);
});

// Both projects exercise the actual links, including full-page navigation and same-document hashes.
test.describe("005 T11–T12: buy-box navigation", () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto("/?part=b");
  });

  test.afterEach(() => {
    expect(consoleErrors, "No console errors or uncaught exceptions across navigation").toEqual([]);
  });

  for (const option of ["subscription", "one-time"] as const) {
    test(`T11, R15, R8, R9: Part A and back from ${option} resets the field and every total together`, async ({
      page,
    }) => {
      const subscribed = option === "subscription";
      const count = subscribed ? 3 : 2;
      const amount = subscribed ? "$76.38" : "$59.90";
      const quantity = page.getByRole("spinbutton", { name: copy.quantity.label });
      const frequency = page.getByRole("combobox", { name: copy.subscribe.frequencyLabel });
      const subscribe = page.getByRole("radio", { name: /^Subscribe/ });
      const oneTime = page.getByRole("radio", { name: /^One-time purchase/ });
      const add = page.getByRole("button", { name: /^Add to cart/ });
      const status = page.getByRole("status");

      if (subscribed) await frequency.selectOption("60 days");
      else await oneTime.check();
      await quantity.fill(String(count));
      await expect(quantity).toHaveValue(String(count));
      await expect(subscribed ? subscribe : oneTime).toBeChecked();
      await expect(add).toHaveText(`Add to cart · ${amount}`);
      if (subscribed) await expect(page.getByText(copy.renewalNotice("60 days", amount))).toBeVisible();
      // Populate the announcement so the empty status after returning proves it was reset too.
      await add.click();
      await expect(status).toHaveText(
        copy.added(count, copy.title, subscribed ? copy.planEvery("60 days") : copy.planOneTime, amount),
      );

      await page.getByRole("navigation").getByRole("link", { name: "Part A: Subscription page" }).click();
      await expect(page).toHaveURL(/\?part=a&fixture=active$/);
      await expect(page.getByRole("heading", { name: "Manage my subscription", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: copy.title, exact: true })).toHaveCount(0);
      await page.getByRole("navigation").getByRole("link", { name: "Part B: Buy box" }).click();
      await expect(page).toHaveURL(/\?part=b$/);
      await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();

      await expect(subscribe).toBeChecked();
      await expect(oneTime).not.toBeChecked();
      await expect(frequency).toHaveValue("30 days");
      await expect(quantity).toHaveValue("1");
      await expect(add).toHaveText("Add to cart · $25.46");
      await expect(page.getByText(copy.renewalNotice("30 days", "$25.46"))).toBeVisible();
      await expect(oneTime).toHaveAccessibleName("One-time purchase $29.95");
      await expect(subscribe).toHaveAccessibleName("Subscribe & save 15% Best value $25.46 originally $29.95");
      await expect(status).toBeEmpty();
      await add.click();
      await expect(status).toHaveText(copy.added(1, copy.title, copy.planEvery("30 days"), "$25.46"));
    });

    test(`T12, R3–R6, R8, R9: reviews keeps Part B and its ${option} selection and totals`, async ({ page }) => {
      const subscribed = option === "subscription";
      const count = subscribed ? 3 : 2;
      const amount = subscribed ? "$76.38" : "$59.90";
      const quantity = page.getByRole("spinbutton", { name: copy.quantity.label });
      const frequency = page.getByRole("combobox", { name: copy.subscribe.frequencyLabel });
      const subscribe = page.getByRole("radio", { name: /^Subscribe/ });
      const oneTime = page.getByRole("radio", { name: /^One-time purchase/ });
      const add = page.getByRole("button", { name: /^Add to cart/ });
      const status = page.getByRole("status");
      const summary = copy.added(count, copy.title, subscribed ? copy.planEvery("60 days") : copy.planOneTime, amount);

      if (subscribed) await frequency.selectOption("60 days");
      else await oneTime.check();
      await quantity.fill(String(count));

      const expectSelection = async () => {
        await expect(subscribed ? subscribe : oneTime).toBeChecked();
        await expect(subscribed ? oneTime : subscribe).not.toBeChecked();
        await expect(quantity).toHaveValue(String(count));
        await expect(add).toHaveText(`Add to cart · ${amount}`);
        await expect(oneTime).toHaveAccessibleName("One-time purchase $29.95");
        await expect(subscribe).toHaveAccessibleName("Subscribe & save 15% Best value $25.46 originally $29.95");
        if (subscribed) {
          await expect(frequency).toHaveValue("60 days");
          await expect(page.getByText(copy.renewalNotice("60 days", amount))).toBeVisible();
        } else {
          await expect(frequency).toHaveCount(0);
          await expect(page.getByText(/^Your subscription renews every/)).toHaveCount(0);
        }
      };

      await expectSelection();
      await add.click();
      await expect(status).toHaveText(summary);
      const reviews = page.getByRole("link", { name: copy.reviewCount, exact: true });
      await expect(reviews).toHaveAttribute("href", "#reviews");
      await reviews.click();
      await expect(page).toHaveURL(/\?part=b#reviews$/);
      await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
      await expectSelection();
      await expect(status).toHaveText(summary);
      await add.click();
      await expect(status).toHaveText(summary);
    });
  }
});
// 005 T8: each interaction flow also checks browser errors from navigation through its last assertion.
test.describe("005 T8: buy-box browser interactions", () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto("/?part=b");
  });

  test.afterEach(() => {
    expect(consoleErrors, "No console errors or uncaught exceptions during the flow").toEqual([]);
  });

  test("R3–R7: card padding collapses and restores the subscription with its chosen frequency", async ({ page }) => {
    const oneTime = page.getByRole("radio", { name: "One-time purchase $29.95", exact: true });
    const subscribe = page.getByRole("radio", {
      name: "Subscribe & save 15% Best value $25.46 originally $29.95",
      exact: true,
    });
    const frequency = page.getByRole("combobox", { name: copy.subscribe.frequencyLabel });
    await expect(subscribe).toBeChecked();
    await expect(page.getByText(copy.ratingLabel(copy.rating), { exact: true })).toHaveCount(1);
    await expect(page.getByRole("link", { name: copy.reviewCount })).toHaveAttribute("href", "#reviews");
    await expect(frequency.locator("xpath=ancestor::label")).toHaveCount(0);
    await frequency.selectOption("60 days");

    // The label begins 20px inside the card. Hit its padding to exercise the larger pointer target.
    const oneTimeCard = oneTime.locator("../..");
    const subscriptionCard = subscribe.locator("../..");
    await oneTimeCard.click({ position: { x: 10, y: 10 } });
    await expect(oneTime).toBeChecked();
    await expect(oneTime).toBeFocused();
    await expect(oneTimeCard).toHaveCSS("background-color", "rgb(243, 246, 242)");
    await expect(subscriptionCard).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(frequency).toHaveCount(0);
    for (const perk of copy.subscribe.perks) await expect(page.getByText(perk, { exact: true })).toHaveCount(0);
    await expect(page.getByText(copy.renewalNotice("60 days", "$25.46"))).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Add to cart/ })).toHaveText("Add to cart · $29.95");

    await subscriptionCard.click({ position: { x: 10, y: 10 } });
    await expect(subscribe).toBeChecked();
    await expect(subscribe).toBeFocused();
    await expect(subscriptionCard).toHaveCSS("background-color", "rgb(243, 246, 242)");
    await expect(frequency).toHaveValue("60 days");
    for (const perk of copy.subscribe.perks) await expect(page.getByText(perk, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.renewalNotice("60 days", "$25.46"))).toBeVisible();
  });

  test("R7–R10: totals follow quantity and frequency while option rows keep unit prices", async ({ page }) => {
    const increase = page.getByRole("button", { name: copy.quantity.increase });
    const add = page.getByRole("button", { name: /^Add to cart/ });
    await increase.click();
    await increase.click();
    await expect(page.getByRole("spinbutton", { name: copy.quantity.label })).toHaveValue("3");
    await expect(add).toHaveText("Add to cart · $76.38");
    await expect(page.getByText(copy.renewalNotice("30 days", "$76.38"))).toBeVisible();
    await expect(page.getByRole("status")).toBeEmpty();
    await page.getByRole("combobox").selectOption("90 days");
    await expect(page.getByText(copy.renewalNotice("90 days", "$76.38"))).toBeVisible();
    await expect(page.getByRole("radio", { name: /^One-time purchase/ })).toHaveAccessibleName(
      "One-time purchase $29.95",
    );
    await expect(page.getByRole("radio", { name: /^Subscribe/ })).toHaveAccessibleName(
      "Subscribe & save 15% Best value $25.46 originally $29.95",
    );
    await page.getByRole("spinbutton").fill("10");
    await expect(add).toHaveText("Add to cart · $254.60");
    await expect(page.getByText(copy.renewalNotice("90 days", "$254.60"))).toBeVisible();
    await page.getByRole("radio", { name: /^One-time purchase/ }).check();
    await expect(add).toHaveText("Add to cart · $299.50");
    await add.click();
    await expect(page.getByRole("status")).toHaveText(copy.added(10, copy.title, copy.planOneTime, "$299.50"));
  });

  for (const { draft, corrected } of [
    { draft: "15", corrected: 10 },
    { draft: "0", corrected: 1 },
    { draft: "2.6", corrected: 3 },
    { draft: "", corrected: 2 },
  ]) {
    test(`R8, R11: blur corrects ${JSON.stringify(draft)} to ${corrected} with a visible status`, async ({ page }) => {
      const quantity = page.getByRole("spinbutton", { name: copy.quantity.label });
      const status = page.getByRole("status");
      await quantity.fill("2");
      await quantity.fill(draft);
      await expect(quantity).toBeFocused();
      await expect(page.getByRole("button", { name: /^Add to cart/ })).toHaveText("Add to cart · $50.92");
      await quantity.press("Tab");
      await expect(quantity).toHaveValue(String(corrected));
      await expect(status).toHaveText(copy.quantityCorrected(corrected, 1, 10));
      await expect(status).toBeVisible();
      await quantity.fill("4");
      await expect(status).toBeEmpty();
    });
  }

  for (const submit of ["click", "Enter"] as const) {
    test(`R8, R10, R11: ${submit} with 15 corrects to 10 before the cart summary`, async ({ page }) => {
      const quantity = page.getByRole("spinbutton", { name: copy.quantity.label });
      await expect(page.locator("main form")).toHaveAttribute("novalidate", "");
      await quantity.fill("15");
      await expect(quantity).toBeFocused();
      expect(await quantity.evaluate((field: HTMLInputElement) => field.validity.rangeOverflow)).toBe(true);
      // A native validation bubble emits `invalid`; neither submit path should invoke native validation.
      await quantity.evaluate((field) => {
        field.addEventListener("invalid", () => field.setAttribute("data-invalid", "true"));
      });
      if (submit === "click") await page.getByRole("button", { name: /^Add to cart/ }).click();
      else await quantity.press("Enter");

      await expect(quantity).toHaveValue("10");
      await expect(quantity).not.toHaveAttribute("data-invalid");
      const status = page.getByRole("status");
      await expect(status).toHaveText(
        `${copy.quantityCorrected(10, 1, 10)} ${copy.added(10, copy.title, copy.planEvery("30 days"), "$254.60")}`,
      );
      await expect(status).toBeVisible();
    });
  }

  test("R10: Enter on either radio or the frequency never submits; Enter in the field does", async ({ page }) => {
    const status = page.getByRole("status");
    for (const name of [/^One-time purchase/, /^Subscribe/]) {
      const radio = page.getByRole("radio", { name });
      await radio.check();
      await radio.press("Enter");
      await expect(status).toBeEmpty();
    }
    await page.getByRole("combobox").press("Enter");
    await expect(status).toBeEmpty();
    await page.getByRole("combobox").press("Escape");
    await page.getByRole("spinbutton").fill("2");
    await page.getByRole("spinbutton").press("Enter");
    await expect(status).toHaveText(copy.added(2, copy.title, copy.planEvery("30 days"), "$50.92"));
  });

  test("R8, R13: aria-disabled step buttons remain in the tab order and keep focus and colour at each limit", async ({
    page,
  }) => {
    const decrease = page.getByRole("button", { name: copy.quantity.decrease });
    const increase = page.getByRole("button", { name: copy.quantity.increase });
    const quantity = page.getByRole("spinbutton");
    await quantity.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(decrease).toBeFocused();
    await expect(decrease).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Space");
    await expect(decrease).toBeFocused();
    await expect(quantity).toHaveValue("1");
    const colour = await increase.evaluate((button) => getComputedStyle(button).color);
    await expect(decrease).toHaveCSS("color", colour);

    await quantity.fill("9");
    await quantity.press("Tab");
    await expect(increase).toBeFocused();
    await page.keyboard.press("Space");
    await expect(quantity).toHaveValue("10");
    await expect(increase).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Space");
    await expect(increase).toBeFocused();
    await expect(quantity).toHaveValue("10");
    await expect(increase).toHaveCSS("color", colour);
    await expect(page.getByRole("status")).toBeEmpty();
  });

  test("R8: the wheel cannot change the focused quantity under the pointer", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "The wheel interaction is a desktop flow.");
    const quantity = page.getByRole("spinbutton", { name: copy.quantity.label });
    await expect(quantity).toHaveAttribute("inputmode", "numeric");
    await quantity.fill("5");
    await quantity.hover();
    // Also observe real wheel delivery, so the unchanged value cannot pass before the event arrives.
    await quantity.evaluate((field) => {
      field.addEventListener("wheel", (event) =>
        field.setAttribute("data-wheel-prevented", String(event.defaultPrevented)),
      );
    });
    for (const delta of [-100, 100]) {
      await quantity.evaluate((field) => field.removeAttribute("data-wheel-prevented"));
      await page.mouse.wheel(0, delta);
      await expect(quantity).toHaveAttribute("data-wheel-prevented", "true");
      await expect(quantity).toHaveValue("5");
      await expect(quantity).toBeFocused();
    }
    await expect(page.getByRole("button", { name: /^Add to cart/ })).toHaveText("Add to cart · $127.30");
    await expect(page.getByRole("status")).toBeEmpty();
  });

  test("R9, R11: clearing a focused field keeps every total until blur restores its last valid value", async ({
    page,
  }) => {
    const quantity = page.getByRole("spinbutton");
    await quantity.fill("2");
    await quantity.fill("");
    await expect(quantity).toBeFocused();
    await expect(quantity).toHaveValue("");
    await expect(page.getByRole("button", { name: /^Add to cart/ })).toHaveText("Add to cart · $50.92");
    await expect(page.getByText(copy.renewalNotice("30 days", "$50.92"))).toBeVisible();
    await expect(page.getByRole("status")).toBeEmpty();
    await quantity.press("Tab");
    await expect(quantity).toHaveValue("2");
    await expect(page.getByRole("status")).toHaveText(copy.quantityCorrected(2, 1, 10));
  });

  test("R10: repeated adds replace the announcement and each selection change clears it", async ({ page }) => {
    const add = page.getByRole("button", { name: /^Add to cart/ });
    const status = page.getByRole("status");
    await page.getByRole("combobox").selectOption("60 days");
    await page.getByRole("spinbutton").fill("2");
    const summary = copy.added(2, copy.title, copy.planEvery("60 days"), "$50.92");
    await add.click();
    await expect(status).toHaveText(summary);
    const firstAnnouncement = await status.locator("span").elementHandle();
    expect(firstAnnouncement).not.toBeNull();
    await add.click();
    await expect(status).toHaveText(summary);
    expect(await firstAnnouncement?.evaluate((element) => element.isConnected)).toBe(false);

    await page.getByRole("combobox").selectOption("90 days");
    await expect(status).toBeEmpty();
    await add.click();
    await expect(status).toHaveText(copy.added(2, copy.title, copy.planEvery("90 days"), "$50.92"));
    await page.getByRole("button", { name: copy.quantity.increase }).click();
    await expect(status).toBeEmpty();
    await add.click();
    await expect(status).not.toBeEmpty();
    await page.getByRole("spinbutton").fill("4");
    await expect(status).toBeEmpty();
    await add.click();
    await expect(status).not.toBeEmpty();
    await page.getByRole("radio", { name: /^One-time purchase/ }).check();
    await expect(status).toBeEmpty();
  });

  test("R4, R6, R8, R10, R13: keyboard alone reaches every control and adds two subscriptions every 60 days", async ({
    page,
  }) => {
    const tab = async (control: ReturnType<Page["locator"]>) => {
      await page.keyboard.press("Tab");
      await expect(control).toBeFocused();
      expect(await control.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
      await expect(control).toHaveCSS("outline-style", "solid");
      await expect(control).toHaveCSS("outline-width", "2px");
    };
    await page.keyboard.press("Tab"); // Test-only navigation links precede the product controls.
    await page.keyboard.press("Tab");
    await tab(page.getByRole("link", { name: copy.reviewCount }));
    const subscribe = page.getByRole("radio", { name: /^Subscribe/ });
    const oneTime = page.getByRole("radio", { name: /^One-time purchase/ });
    await tab(subscribe);
    await page.keyboard.press("ArrowUp");
    await expect(oneTime).toBeChecked();
    await expect(oneTime).toBeFocused();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await tab(page.getByRole("button", { name: copy.quantity.decrease }));
    await page.keyboard.press("Shift+Tab");
    await expect(oneTime).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(subscribe).toBeChecked();
    await expect(subscribe).toBeFocused();
    await tab(page.getByRole("combobox"));
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("combobox")).toHaveValue("60 days");
    await tab(page.getByRole("button", { name: copy.quantity.decrease }));
    await page.keyboard.press("Space");
    const quantity = page.getByRole("spinbutton");
    await expect(quantity).toHaveValue("1");
    await tab(quantity);
    await page.keyboard.press("ArrowUp");
    await expect(quantity).toHaveValue("2");
    await tab(page.getByRole("button", { name: copy.quantity.increase }));
    await page.keyboard.press("Space");
    await expect(quantity).toHaveValue("3");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Space");
    await expect(quantity).toHaveValue("2");
    await tab(quantity);
    await tab(page.getByRole("button", { name: copy.quantity.increase }));
    await expect(page.getByRole("status")).toBeEmpty();
    await tab(page.getByRole("button", { name: /^Add to cart/ }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toHaveText(copy.added(2, copy.title, copy.planEvery("60 days"), "$50.92"));
  });
});
