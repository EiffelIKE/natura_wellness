import { copy } from "../src/part-b/copy";
import { expect, type Page, test } from "./test";

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
