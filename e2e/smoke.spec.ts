import AxeBuilder from "@axe-core/playwright";
import { expectAccessibleBuyBox } from "./a11y";
import { expect, test } from "./test";

const pages = [
  { name: "Part A", path: "/?part=a&fixture=active" },
  { name: "Part B", path: "/?part=b" },
];

for (const { name, path } of pages) {
  test(`${name} renders without console errors or WCAG A/AA violations`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(path);
    await expect(page.locator("#root")).not.toBeEmpty();

    if (name === "Part B") {
      // 005 R14: two axe runs, with the design's four known contrast failures excluded from the second.
      await expectAccessibleBuyBox(page);
    } else {
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
