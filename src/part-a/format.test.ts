import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { formatDate, formatFrequency, formatMoney } from "./format";

// Local-time constructors keep these tests independent of the machine's time zone.
const local = (year: number, monthIndex: number, day: number, hour = 12, minute = 0) =>
  new Date(year, monthIndex, day, hour, minute);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

describe("formatDate (R9)", () => {
  const now = local(2026, 11, 10);

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a short month and an unpadded day in the current year", () => {
    expect(formatDate(iso(2026, 11, 16), now)).toBe("Dec 16");
    expect(formatDate(iso(2026, 10, 8), now)).toBe("Nov 8");
  });

  it("adds the year to a later year", () => {
    expect(formatDate(iso(2027, 0, 15), now)).toBe("Jan 15, 2027");
  });

  it("adds the year to an earlier year", () => {
    expect(formatDate(iso(2025, 11, 31), local(2026, 0, 2))).toBe("Dec 31, 2025");
  });

  it("decides the year by the local calendar day around midnight", () => {
    const newYearsEve = local(2026, 11, 31, 23, 30);
    expect(formatDate(iso(2026, 11, 31, 23, 59), newYearsEve)).toBe("Dec 31");
    expect(formatDate(iso(2027, 0, 1, 0, 1), newYearsEve)).toBe("Jan 1, 2027");
  });

  it("uses the current time when no `now` is passed", () => {
    vi.useFakeTimers({ now });
    expect(formatDate(iso(2026, 11, 16))).toBe("Dec 16");
    expect(formatDate(iso(2027, 0, 15))).toBe("Jan 15, 2027");
  });
});

describe("formatMoney (R9)", () => {
  it.each([
    [0, "$0.00"],
    [5, "$0.05"],
    [500, "$5.00"],
    [2995, "$29.95"],
    [123456, "$1,234.56"],
  ])("formats %i cents as %s", (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });

  it("shows the server's active total as is (R4)", () => {
    const { nextChargeTotalCents } = fixtures.active();
    expect(nextChargeTotalCents).toBe(10187);
    expect(formatMoney(10187)).toBe("$101.87");
  });
});

describe("formatFrequency (R9)", () => {
  it.each([
    [30, "Every 30 days"],
    [60, "Every 60 days"],
    [90, "Every 90 days"],
  ])("formats %i as %s", (days, expected) => {
    expect(formatFrequency(days)).toBe(expected);
  });
});
