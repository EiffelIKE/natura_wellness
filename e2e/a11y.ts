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
