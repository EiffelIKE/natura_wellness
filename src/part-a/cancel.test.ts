import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { offersFor, REASONS, slowerFrequency } from "./cancel";
import type { Local } from "./plan";

const none: Local = { intervalDays: null, quantities: {} };

// Vitamin D × 1 at $29.95 and Multivitamin × 2 at $44.95, 15% off: $101.87, every 30 days. Local-time constructors
// keep the next order on Dec 16 in any time zone, and the clock keeps it in the current year.
const server = { ...fixtures.active(), nextChargeAt: new Date(2026, 11, 16, 12).toISOString() };
const [vitaminD, multivitamin] = server.items;

const labels = (...args: Parameters<typeof offersFor>) => offersFor(...args).map((offer) => offer.label);

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 11, 10, 12) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("REASONS (R2)", () => {
  it("lists the five reasons in the spec's order", () => {
    expect(REASONS.map((reason) => reason.label)).toEqual([
      "I have too much product left",
      "It costs too much",
      "I'm trying a different product",
      "I didn't see results",
      "Other",
    ]);
  });
});

describe("slowerFrequency (R4)", () => {
  it.each([
    [30, 60],
    [45, 60],
    [60, 90],
    [90, null],
    [120, null],
  ])("after every %i days offers %s", (days, expected) => {
    expect(slowerFrequency(days)).toBe(expected);
  });
});

describe("offersFor (R3, R4)", () => {
  it("offers a skip, then a slower frequency, for too much product", () => {
    expect(offersFor("too-much", server, none)).toEqual([
      { kind: "skip", label: "Skip my Dec 16 order" },
      { kind: "frequency", days: 60, label: "Ship every 60 days" },
    ]);
  });

  it("offers a slower frequency, then one unit less, when it costs too much", () => {
    // (2995 + 2 × 4495) × 0.85 = 10187.25 and (2995 + 4495) × 0.85 = 6366.5: 10187 − 6367 = 3820, not the
    // discounted unit price 4495 × 0.85 = 3820.75 → $38.21.
    expect(offersFor("costs", server, none)).toEqual([
      { kind: "frequency", days: 60, label: "Ship every 60 days: $101.87 every 60 days instead of every 30" },
      {
        kind: "quantity",
        sku: "NW-MULTI-30",
        quantity: 1,
        label: "Get 1 Multivitamin, 30 tablets instead of 2: save $38.20 per order",
      },
    ]);
  });

  it("offers a skip while they try a different product", () => {
    expect(offersFor("different", server, none)).toEqual([
      { kind: "skip", label: "Skip my Dec 16 order while you try it" },
    ]);
  });

  it.each(["no-results", "other"] as const)("offers nothing for %s", (reason) => {
    expect(offersFor(reason, server, none)).toEqual([]);
  });

  it("names the next order's year when it is next year", () => {
    const later = { ...server, nextChargeAt: new Date(2027, 0, 15, 12).toISOString() };
    expect(labels("different", later, none)).toEqual(["Skip my Jan 15, 2027 order while you try it"]);
  });

  describe("with pending 003 changes", () => {
    it("hides the frequency offer when 90 days is pending", () => {
      expect(labels("too-much", server, { ...none, intervalDays: 90 })).toEqual(["Skip my Dec 16 order"]);
      expect(offersFor("costs", server, { ...none, intervalDays: 90 }).map((offer) => offer.kind)).toEqual([
        "quantity",
      ]);
    });

    it("offers 90 days instead of a pending 60", () => {
      expect(labels("costs", server, { ...none, intervalDays: 60 })[0]).toBe(
        "Ship every 90 days: $101.87 every 90 days instead of every 60",
      );
    });

    it("drops the offer for a quantity already lowered to 1, and uses the lower total", () => {
      expect(labels("costs", server, { ...none, quantities: { "NW-MULTI-30": 1 } })).toEqual([
        "Ship every 60 days: $63.67 every 60 days instead of every 30",
      ]);
    });

    it("saves the difference in totals for each item above 1, the largest saving first", () => {
      // Vitamin D 3: (3 × 2995 + 2 × 4495) × 0.85 = 15278.75 → 15279.
      // Vitamin D 2: 14980 × 0.85 = 12733, so $25.46. Multivitamin 1: 13480 × 0.85 = 11458, so $38.21 this time.
      // The server lists Vitamin D first, but the Multivitamin saves more (R3).
      expect(labels("costs", server, { ...none, quantities: { "NW-VITD-60": 3 } }).slice(1)).toEqual([
        "Get 1 Multivitamin, 30 tablets instead of 2: save $38.21 per order",
        "Get 2 Vitamin D, 60 softgels instead of 3: save $25.46 per order",
      ]);
    });

    it("offers the server's own quantity when a higher one is pending", () => {
      expect(offersFor("costs", server, { ...none, quantities: { "NW-MULTI-30": 3 } })[1]).toMatchObject({
        kind: "quantity",
        sku: "NW-MULTI-30",
        quantity: 2,
        label: "Get 2 Multivitamin, 30 tablets instead of 3: save $38.21 per order",
      });
    });
  });

  describe("with server values outside the choices", () => {
    it("offers 60 days after a server interval of 45", () => {
      expect(labels("costs", { ...server, intervalDays: 45 }, none)[0]).toBe(
        "Ship every 60 days: $101.87 every 60 days instead of every 45",
      );
    });

    it("has no frequency offer for a server interval of 90", () => {
      expect(labels("too-much", { ...server, intervalDays: 90 }, none)).toEqual(["Skip my Dec 16 order"]);
    });

    it("has no quantity offer when one less isn't a choice (12 → 11)", () => {
      const twelve = { ...server, items: [vitaminD, { ...multivitamin, quantity: 12 }] };
      expect(offersFor("costs", twelve, none).map((offer) => offer.kind)).toEqual(["frequency"]);
    });

    it("uses the server's discount", () => {
      // 11985 × 0.8 = 9588, and 7490 × 0.8 = 5992.
      expect(labels("costs", { ...server, discountPercent: 20 }, none)).toEqual([
        "Ship every 60 days: $95.88 every 60 days instead of every 30",
        "Get 1 Multivitamin, 30 tablets instead of 2: save $35.96 per order",
      ]);
    });
  });

  describe("with nothing cheaper to offer", () => {
    it("has no costs offer for a server at 90 days with every quantity at 1", () => {
      const lowest = { ...server, intervalDays: 90, items: server.items.map((item) => ({ ...item, quantity: 1 })) };
      expect(offersFor("costs", lowest, none)).toEqual([]);
    });
  });

  describe("without a next order date", () => {
    const undated = { ...server, nextChargeAt: null, nextChargeTotalCents: null };

    it("has no skip offer, and the totals still come from the items", () => {
      expect(labels("too-much", undated, none)).toEqual(["Ship every 60 days"]);
      expect(labels("different", undated, none)).toEqual([]);
      expect(labels("costs", undated, none)[0]).toBe("Ship every 60 days: $101.87 every 60 days instead of every 30");
    });
  });
});

describe("at most 2 quantity offers (R3)", () => {
  // Round prices, so every total is exact at 15% off and a tie really is a tie.
  const item = (sku: string, unitPriceCents: number, quantity = 2) => ({
    sku,
    name: sku,
    quantity,
    unitPriceCents,
    imageUrl: null,
  });
  const quantitySkus = (subscription: typeof server, local = none) =>
    offersFor("costs", subscription, local).flatMap((offer) => (offer.kind === "quantity" ? [offer.sku] : []));

  it("keeps the two largest savings, largest first, after the frequency offer", () => {
    // Savings at 15% off: B 1700, C 3400, A 850. A is dropped.
    const three = { ...server, items: [item("A", 1000), item("B", 2000), item("C", 4000)] };
    const offers = offersFor("costs", three, none);

    expect(offers.map((offer) => offer.kind)).toEqual(["frequency", "quantity", "quantity"]);
    expect(quantitySkus(three)).toEqual(["C", "B"]);
    expect(offers[1].label).toBe("Get 1 C instead of 2: save $34.00 per order");
  });

  it("keeps the server's order on a tie", () => {
    const tied = { ...server, items: [item("A", 2000), item("B", 4000), item("C", 2000)] };
    expect(quantitySkus(tied)).toEqual(["B", "A"]);
  });

  it("applies the cap after leaving out the items that can't go lower", () => {
    // C is the largest saving, but at 1 it has no offer, so A and B both show.
    const three = { ...server, items: [item("A", 1000), item("B", 2000), item("C", 4000, 1)] };
    expect(quantitySkus(three)).toEqual(["B", "A"]);
  });

  it("ranks with the pending quantities", () => {
    // Pending C at 1 drops its offer, so the cap lets A back in.
    const three = { ...server, items: [item("A", 1000), item("B", 2000), item("C", 4000)] };
    expect(quantitySkus(three, { ...none, quantities: { C: 1 } })).toEqual(["B", "A"]);
  });
});
