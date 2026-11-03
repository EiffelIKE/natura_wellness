import { describe, expect, it } from "vitest";
import {
  correctQuantity,
  formatMoney,
  isValidQuantity,
  MAX_QUANTITY,
  MIN_QUANTITY,
  parseQuantity,
  totalCents,
  unitPriceCents,
} from "./buyBox";
import { copy } from "./copy";

describe("formatMoney (R9)", () => {
  it.each([
    [0, "$0.00"],
    [5, "$0.05"],
    [2546, "$25.46"],
    [2995, "$29.95"],
    [25460, "$254.60"],
    [123456, "$1,234.56"],
  ])("formats %i cents as %s", (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});

describe("unitPriceCents (R7)", () => {
  it("is the copy's price for each option", () => {
    expect(unitPriceCents("one-time")).toBe(copy.oneTime.priceCents);
    expect(unitPriceCents("subscribe")).toBe(copy.subscribe.priceCents);
    expect(formatMoney(unitPriceCents("one-time"))).toBe("$29.95");
    expect(formatMoney(unitPriceCents("subscribe"))).toBe("$25.46");
  });
});

describe("totalCents (R9)", () => {
  it.each([
    ["one-time", 1, "$29.95"],
    ["one-time", 2, "$59.90"],
    ["one-time", 3, "$89.85"],
    ["one-time", 10, "$299.50"],
    ["subscribe", 1, "$25.46"],
    ["subscribe", 2, "$50.92"],
    ["subscribe", 3, "$76.38"],
    ["subscribe", 10, "$254.60"],
  ] as const)("%s × %i is %s", (option, quantity, expected) => {
    expect(formatMoney(totalCents(option, quantity))).toBe(expected);
  });

  it("multiplies the unit price, so 3 subscriptions are $76.38, not a discount rounded on the total", () => {
    // Part A's mock would give round(3 × 2995 × 0.85) = 7637 (spec, Known limitations).
    expect(totalCents("subscribe", 3)).toBe(7638);
  });
});

describe("parseQuantity (R8)", () => {
  it.each([
    ["1", 1],
    ["10", 10],
    ["15", 15],
    ["0", 0],
    ["-3", -3],
    ["2.6", 2.6],
    ["2.4", 2.4],
    [".5", 0.5],
    ["1e1", 10],
    ["1E+1", 10],
  ])("reads %j as %d", (raw, expected) => {
    expect(parseQuantity(raw)).toBe(expected);
  });

  it.each(["", " ", "abc", "5.", "+5", " 5 ", "0x10", "Infinity", "NaN", "1e", "--1"])(
    "reads %j as null, as a number field would report it",
    (raw) => {
      expect(parseQuantity(raw)).toBeNull();
    },
  );
});

describe("isValidQuantity (R8, R9)", () => {
  it.each([1, 2, 9, 10])("accepts %d", (n) => {
    expect(isValidQuantity(n)).toBe(true);
  });

  it.each([null, 0, -1, 11, 15, 2.6, Number.NaN])("rejects %s", (n) => {
    expect(isValidQuantity(n)).toBe(false);
  });
});

describe("correctQuantity (R8)", () => {
  it("has the range 1 to 10", () => {
    expect([MIN_QUANTITY, MAX_QUANTITY]).toEqual([1, 10]);
  });

  it.each([
    ["15", 10],
    ["11", 10],
    ["1e400", 10],
    ["0", 1],
    ["-3", 1],
    ["-0.4", 1],
    ["2.6", 3],
    ["2.5", 3],
    ["2.4", 2],
    ["0.4", 1],
    ["10.4", 10],
    ["10.6", 10],
    ["1e1", 10],
    ["7", 7],
  ])("corrects %j to %d", (raw, expected) => {
    expect(correctQuantity(raw, 4)).toBe(expected);
  });

  it.each(["", "abc", " "])("returns the last valid quantity for %j", (raw) => {
    expect(correctQuantity(raw, 4)).toBe(4);
    expect(correctQuantity(raw, 10)).toBe(10);
  });
});

describe("copy templates (R1, R3, R9–R11)", () => {
  it("renders the provided fine print in the default state", () => {
    expect(copy.renewalNotice("30 days", "$25.46")).toBe(copy.finePrint);
    const [defaultFrequency] = copy.subscribe.frequencyOptions;
    expect(copy.renewalNotice(defaultFrequency, formatMoney(totalCents("subscribe", 1)))).toBe(copy.finePrint);
  });

  it("follows the frequency and total in the fine print", () => {
    expect(copy.renewalNotice("90 days", formatMoney(totalCents("subscribe", 3)))).toBe(
      "Your subscription renews every 90 days at $76.38 until you cancel. Skip or cancel anytime from your account.",
    );
  });

  it("builds the spec's two add-to-cart summaries", () => {
    expect(copy.added(2, copy.title, copy.planEvery("60 days"), formatMoney(totalCents("subscribe", 2)))).toBe(
      "Added to cart: 2 × Vitamin D, delivered every 60 days, $50.92.",
    );
    expect(copy.added(1, copy.title, copy.planOneTime, formatMoney(totalCents("one-time", 1)))).toBe(
      "Added to cart: 1 × Vitamin D, one-time purchase, $29.95.",
    );
  });

  it("builds the correction message", () => {
    expect(copy.quantityCorrected(10, MIN_QUANTITY, MAX_QUANTITY)).toBe(
      "Quantity set to 10. You can order 1 to 10 at a time.",
    );
  });

  it("builds the rating label", () => {
    expect(copy.ratingLabel(copy.rating)).toBe("Rated 4.8 out of 5");
  });
});
