import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import {
  frequencyOptions,
  FREQUENCIES,
  hasPending,
  type Local,
  pendingItems,
  pendingOf,
  QUANTITIES,
  quantityOptions,
  startingAfter,
  totalAfter,
} from "./plan";

const none: Local = { intervalDays: null, quantities: {} };

// Vitamin D × 1 at $29.95 and Multivitamin × 2 at $44.95, 15% off: $101.87.
const server = fixtures.active();
const [vitaminD, multivitamin] = server.items;

describe("FREQUENCIES and QUANTITIES (R1, R2)", () => {
  it("offers every 30, 60 or 90 days", () => {
    expect(FREQUENCIES).toEqual([30, 60, 90]);
  });

  it("offers quantities 1 to 10", () => {
    expect(QUANTITIES).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("frequencyOptions and quantityOptions (R1, R2 edge-case round)", () => {
  it.each([
    ["inside", 60, [30, 60, 90]],
    ["below", 15, [15, 30, 60, 90]],
    ["between", 45, [30, 45, 60, 90]],
    ["above", 120, [30, 60, 90, 120]],
  ])("adds a server interval %s the three only when it's missing, in numeric order", (_, intervalDays, expected) => {
    expect(frequencyOptions({ ...server, intervalDays })).toEqual(expected);
  });

  it.each([
    ["inside", 2, QUANTITIES],
    ["below", 0, [0, ...QUANTITIES]],
    ["above", 12, [...QUANTITIES, 12]],
  ])("adds a server quantity %s 1 to 10 only when it's missing, in numeric order", (_, quantity, expected) => {
    expect(quantityOptions({ ...multivitamin, quantity })).toEqual(expected);
  });

  it("never changes FREQUENCIES or QUANTITIES", () => {
    frequencyOptions({ ...server, intervalDays: 45 });
    quantityOptions({ ...multivitamin, quantity: 12 });
    expect(FREQUENCIES).toEqual([30, 60, 90]);
    expect(QUANTITIES).toHaveLength(10);
  });
});

describe("pendingOf (R5, R7)", () => {
  it("has nothing pending when nothing was picked", () => {
    expect(pendingOf(server, none)).toEqual({ intervalDays: null, quantities: [] });
  });

  it("keeps a frequency that differs from the server's", () => {
    expect(pendingOf(server, { ...none, intervalDays: 60 }).intervalDays).toBe(60);
  });

  it("drops a frequency the server now has", () => {
    expect(pendingOf({ ...server, intervalDays: 60 }, { ...none, intervalDays: 60 }).intervalDays).toBeNull();
  });

  it("pairs a picked quantity with the server's item", () => {
    expect(pendingOf(server, { ...none, quantities: { "NW-MULTI-30": 1 } }).quantities).toEqual([
      { item: multivitamin, quantity: 1 },
    ]);
  });

  it("drops a quantity the server now has", () => {
    const fresh = { ...server, items: [vitaminD, { ...multivitamin, quantity: 1 }] };
    expect(pendingOf(fresh, { ...none, quantities: { "NW-MULTI-30": 1 } }).quantities).toEqual([]);
  });

  it("drops a SKU the server no longer has", () => {
    const fresh = { ...server, items: [vitaminD] };
    expect(pendingOf(fresh, { ...none, quantities: { "NW-MULTI-30": 1, "NW-VITD-60": 3 } }).quantities).toEqual([
      { item: vitaminD, quantity: 3 },
    ]);
  });

  it("keeps the server's item order, whatever order the picks were made in", () => {
    const quantities = { "NW-MULTI-30": 1, "NW-VITD-60": 3 };
    expect(pendingOf(server, { ...none, quantities }).quantities.map(({ item }) => item.sku)).toEqual([
      "NW-VITD-60",
      "NW-MULTI-30",
    ]);
  });
});

describe("hasPending (R5)", () => {
  it("is false with nothing pending", () => {
    expect(hasPending(pendingOf(server, none))).toBe(false);
  });

  it("is true with only a frequency pending", () => {
    expect(hasPending(pendingOf(server, { ...none, intervalDays: 90 }))).toBe(true);
  });

  it("is true with only a quantity pending", () => {
    expect(hasPending(pendingOf(server, { ...none, quantities: { "NW-VITD-60": 2 } }))).toBe(true);
  });

  it("is false when every pick now equals the server's", () => {
    expect(hasPending(pendingOf(server, { intervalDays: 30, quantities: { "NW-MULTI-30": 2 } }))).toBe(false);
  });
});

describe("pendingItems (R4)", () => {
  it("applies pending quantities in the server's order and leaves the rest as the server's", () => {
    const pending = pendingOf(server, { ...none, quantities: { "NW-MULTI-30": 1 } });
    expect(pendingItems(server, pending)).toEqual([vitaminD, { ...multivitamin, quantity: 1 }]);
  });

  it("never changes the server's items", () => {
    pendingItems(server, pendingOf(server, { ...none, quantities: { "NW-MULTI-30": 1 } }));
    expect(multivitamin.quantity).toBe(2);
  });
});

describe("totalAfter (R4)", () => {
  it("rounds Multivitamin 2 → 1 the way the mock does", () => {
    // (2995 + 4495) × 0.85 = 6366.5
    expect(totalAfter(server, pendingOf(server, { ...none, quantities: { "NW-MULTI-30": 1 } }))).toBe(6367);
  });

  it("applies every pending quantity", () => {
    // (2995 × 3 + 4495 × 10) × 0.85 = 45844.75
    const quantities = { "NW-VITD-60": 3, "NW-MULTI-30": 10 };
    expect(totalAfter(server, pendingOf(server, { ...none, quantities }))).toBe(45845);
  });

  it("uses the server's discount", () => {
    const fresh = { ...server, discountPercent: 20 };
    expect(totalAfter(fresh, pendingOf(fresh, { ...none, quantities: { "NW-MULTI-30": 1 } }))).toBe(5992);
  });

  it("is null with only a frequency pending", () => {
    expect(totalAfter(server, pendingOf(server, { ...none, intervalDays: 60 }))).toBeNull();
  });

  it("is null when the picked quantity now equals the server's", () => {
    expect(totalAfter(server, pendingOf(server, { ...none, quantities: { "NW-MULTI-30": 2 } }))).toBeNull();
  });
});

// Local-time constructors keep these tests independent of the machine's time zone.
describe("startingAfter (R3)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("names the next order's date in the current year", () => {
    vi.useFakeTimers({ now: new Date(2026, 11, 10, 12) });
    expect(startingAfter(new Date(2026, 11, 16, 12).toISOString())).toBe("starting after your Dec 16 order");
  });

  it("adds the year when the next order is next year", () => {
    vi.useFakeTimers({ now: new Date(2026, 11, 10, 12) });
    expect(startingAfter(new Date(2027, 0, 15, 12).toISOString())).toBe("starting after your Jan 15, 2027 order");
  });

  it("never fills in a missing date (001 R3)", () => {
    expect(startingAfter(null)).toBe("starting after your next order");
  });
});
