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

    it("saves the difference in totals for each item above 1, in server order", () => {
      // Vitamin D 3: (3 × 2995 + 2 × 4495) × 0.85 = 15278.75 → 15279.
      // Vitamin D 2: 14980 × 0.85 = 12733, so $25.46. Multivitamin 1: 13480 × 0.85 = 11458, so $38.21 this time.
      expect(labels("costs", server, { ...none, quantities: { "NW-VITD-60": 3 } }).slice(1)).toEqual([
        "Get 2 Vitamin D, 60 softgels instead of 3: save $25.46 per order",
        "Get 1 Multivitamin, 30 tablets instead of 2: save $38.21 per order",
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

  describe("without a next order date", () => {
    const undated = { ...server, nextChargeAt: null, nextChargeTotalCents: null };

    it("has no skip offer, and the totals still come from the items", () => {
      expect(labels("too-much", undated, none)).toEqual(["Ship every 60 days"]);
      expect(labels("different", undated, none)).toEqual([]);
      expect(labels("costs", undated, none)[0]).toBe("Ship every 60 days: $101.87 every 60 days instead of every 30");
    });
  });
});
