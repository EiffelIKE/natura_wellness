import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "./test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** 001 R10: no WCAG 2.2 A/AA violations and no horizontal scroll, in whatever state the page is in. */
export async function expectAccessibleLayout(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(axe.violations).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return { scrollWidth, clientWidth };
  });
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** 005 R14: the four design colours that fail AA carry this attribute, and only they are left out of the contrast run. */
const CONTRAST_EXCEPTION = "[data-contrast-exception]";

/**
 * 005 R14: two axe runs on the whole page. `.exclude()` turns off every rule for an element, so it is used only in
 * the contrast run, and the four exceptions still get every other check in the first run.
 */
export async function expectAccessibleBuyBox(page: Page) {
  const rules = await new AxeBuilder({ page }).withTags(WCAG).disableRules(["color-contrast"]).analyze();
  expect(rules.violations).toEqual([]);
  const contrast = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude(CONTRAST_EXCEPTION).analyze();
  expect(contrast.violations).toEqual([]);
}
