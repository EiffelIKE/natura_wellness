// 005 R2: the buy box against the design. Runs only in the `visual` project (1200×780, deviceScaleFactor 2).
import { readFileSync } from "node:fs";
import { copy } from "../src/part-b/copy";
import { diffImages, pngSize } from "./visual";
import { expect, type Page, test } from "./test";

const REFERENCE = new URL("../public/reference/buy-box.png", import.meta.url);
const SIZE = { width: 2400, height: 1560 };

/**
 * The largest diff ratio the gate accepts: the helper's tuned ratio (0.77%) rounded up to the next 0.5%, under the
 * 3% ceiling (plan.md, Tolerance). The rest is text anti-aliasing that differs between macOS and Linux.
 */
const TOLERANCE = 0.01;

/** Element boxes in CSS px, from plan.md's layout table. Each edge may be off by 1px. */
const LAYOUT = {
  photoCard: { x: 64, y: 56, width: 540, height: 540 },
  photo: { x: 84, y: 76, width: 500, height: 500 },
  divider: { x: 668, y: 251.5, width: 468, height: 1 },
  oneTimeCard: { x: 668, y: 276.5, width: 468, height: 60 },
  subscriptionCard: { x: 668, y: 348.5, width: 468, height: 180.5 },
  badge: { x: 903, y: 376.5, width: 96.5, height: 21 },
  select: { x: 834.5, y: 421, width: 115.5, height: 33 },
  stepper: { x: 668, y: 553, width: 128, height: 56 },
  addToCart: { x: 808, y: 553, width: 328, height: 56 },
};

/** The default state as the design shows it: the app's test-only nav hidden, and the fonts loaded. */
async function openDefaultState(page: Page) {
  await page.goto("/?part=b");
  await page.addStyleTag({ content: "#root > nav { display: none !important; }" });
  await expectFontsLoaded(page);
}

/**
 * The fonts load from Google Fonts over the network. Without them every glyph differs, so this fails with a clear
 * message instead of a misleading pixel diff. `load()` fetches each face even before CSS uses it, and resolves with
 * no faces when the stylesheet didn't define one, which `check()` alone would report as fine.
 */
async function expectFontsLoaded(page: Page) {
  const fonts = ["600 44px Fraunces", "400 16px Inter", "500 16px Inter", "600 16px Inter", "700 16px Inter"];
  const missing = await page.evaluate(async (fonts) => {
    await document.fonts.ready;
    const loaded = await Promise.all(
      fonts.map((font) =>
        document.fonts.load(font).then(
          (faces) => faces.length > 0 && document.fonts.check(font),
          () => false,
        ),
      ),
    );
    return fonts.filter((_, index) => !loaded[index]);
  }, fonts);
  expect(missing, `These fonts didn't load from Google Fonts: ${missing.join(", ")}`).toEqual([]);
}

test("the baseline is byte-identical to the design", () => {
  // The same path toHaveScreenshot uses, so `--update-snapshots` can't quietly replace the design.
  const baselinePath = test.info().snapshotPath("buy-box.png", { kind: "screenshot" });
  const baseline = readFileSync(baselinePath);
  const reference = readFileSync(REFERENCE);
  expect(pngSize(reference)).toEqual(SIZE);
  expect(
    baseline.equals(reference),
    `${baselinePath} must be a byte-for-byte copy of public/reference/buy-box.png (spec R2)`,
  ).toBe(true);
});

test("captures the default state at 2400×1560 and attaches the diff and its ratio", async ({ page }, testInfo) => {
  await openDefaultState(page);
  await expect(page.locator("#root > nav")).toBeHidden();

  const screenshot = await page.screenshot({ scale: "device", animations: "disabled", caret: "hide" });
  expect(pngSize(screenshot)).toEqual(SIZE);

  const diff = await diffImages(page, screenshot, readFileSync(REFERENCE));
  await testInfo.attach("buy-box-diff.png", { body: diff.image, contentType: "image/png" });
  await testInfo.attach("buy-box-diff.json", {
    body: JSON.stringify({ ratio: diff.ratio, differentPixels: diff.differentPixels, totalPixels: diff.totalPixels }),
    contentType: "application/json",
  });
  console.log(`Buy box diff ratio: ${(diff.ratio * 100).toFixed(3)}% (${diff.differentPixels} px)`);
  expect(diff.totalPixels).toBe(SIZE.width * SIZE.height);
});

test("matches the reference's layout within 1px", async ({ page }) => {
  await openDefaultState(page);
  const photo = page.getByRole("img", { name: copy.photoAlt });
  const cardOf = (name: RegExp) => page.getByRole("radio", { name }).locator("xpath=../..");
  const elements = {
    photoCard: photo.locator(".."),
    photo,
    divider: page.locator("hr"),
    oneTimeCard: cardOf(/^One-time purchase/),
    subscriptionCard: cardOf(/^Subscribe & save/),
    badge: page.getByText(copy.subscribe.badge, { exact: true }),
    select: page.getByRole("combobox", { name: copy.subscribe.frequencyLabel }),
    stepper: page.getByRole("spinbutton", { name: copy.quantity.label }).locator(".."),
    addToCart: page.getByRole("button", { name: /^Add to cart/ }),
  };

  const off: string[] = [];
  for (const [name, expected] of Object.entries(LAYOUT)) {
    const box = await elements[name as keyof typeof LAYOUT].boundingBox();
    if (!box) {
      off.push(`${name}: not rendered`);
      continue;
    }
    for (const edge of ["x", "y", "width", "height"] as const) {
      if (Math.abs(box[edge] - expected[edge]) > 1) off.push(`${name}.${edge}: ${box[edge]}, design ${expected[edge]}`);
    }
  }
  expect(off, "Boxes more than 1px from the design").toEqual([]);

  // A change in size, letter-spacing or column width shows up here by name, not as a vague pixel diff.
  const lines = await page.getByText(copy.subtitle).evaluate((subtitle) => {
    const range = document.createRange();
    range.selectNodeContents(subtitle);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  });
  expect(lines, `Subtitle wraps to ${lines} lines, the design has 2`).toBe(2);

  // Spec R1, R10: the empty status line takes no height.
  expect((await page.getByRole("status").boundingBox())?.height).toBe(0);
});

test("matches the reference's pixels within the tolerance", async ({ page }) => {
  await openDefaultState(page);
  const screenshot = await page.screenshot({ scale: "device", animations: "disabled", caret: "hide" });
  const diff = await diffImages(page, screenshot, readFileSync(REFERENCE));
  expect(diff.ratio, `The helper's diff ratio is above ${TOLERANCE}`).toBeLessThanOrEqual(TOLERANCE);
  await expect(page).toHaveScreenshot("buy-box.png", { scale: "device", maxDiffPixelRatio: TOLERANCE });
});
