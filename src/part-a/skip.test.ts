import { describe, expect, it } from "vitest";
import { fixtures } from "../api/fixtures";
import { ApiError } from "../api/types";
import { canSkip, predictNextChargeAt, skipErrorCause } from "./skip";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("canSkip (R1, R10)", () => {
  it("allows an active subscription with a next order", () => {
    expect(canSkip(fixtures.active())).toBe(true);
  });

  it("refuses an active subscription without a next order date", () => {
    expect(canSkip({ ...fixtures.active(), nextChargeAt: null })).toBe(false);
  });

  it.each(["paused", "cancelled"] as const)("refuses a %s subscription", (status) => {
    expect(canSkip(fixtures[status]())).toBe(false);
  });

  it.each(["paused", "cancelled"] as const)("refuses %s even if the server sends a next order date", (status) => {
    expect(canSkip({ ...fixtures[status](), nextChargeAt: "2026-12-16T17:00:00.000Z" })).toBe(false);
  });
});

// Fixed UTC offsets, so these don't depend on the machine's time zone. New York leaves daylight time on Nov 1, 2026.
describe("predictNextChargeAt (R2)", () => {
  it("adds the interval in whole 24-hour days", () => {
    expect(predictNextChargeAt("2026-12-01T12:00:00-05:00", 30)).toBe("2026-12-31T17:00:00.000Z");
  });

  it("adds exactly 30 × 24 hours across the daylight-saving change, as the server does", () => {
    const before = "2026-10-20T12:00:00-04:00"; // noon, daylight time
    const after = predictNextChargeAt(before, 30);

    expect(Date.parse(after) - Date.parse(before)).toBe(30 * DAY_MS);
    // 11:00 in standard time, not noon. A calendar "+30 days" would have given 17:00Z.
    expect(after).toBe("2026-11-19T16:00:00.000Z");
  });

  it("keeps the milliseconds, a minute before midnight on the day before the change", () => {
    // Dec 30, 22:59:59.999 in New York: the same day the server lands on, because the server adds milliseconds too.
    expect(predictNextChargeAt("2026-10-31T23:59:59.999-04:00", 60)).toBe("2026-12-31T03:59:59.999Z");
  });

  it("rolls into the next year", () => {
    expect(predictNextChargeAt("2026-12-16T12:00:00-05:00", 30)).toBe("2027-01-15T17:00:00.000Z");
    expect(predictNextChargeAt("2026-12-16T12:00:00-05:00", 90)).toBe("2027-03-16T17:00:00.000Z");
  });
});

describe("skipErrorCause (R7)", () => {
  it.each([
    ["a 409", new ApiError(409, "Subscription was modified since it was loaded"), "conflict"],
    ["a 400", new ApiError(400, "Only active subscriptions can skip a shipment"), "failed"],
    ["a 404", new ApiError(404, "Subscription not found"), "failed"],
    ["a 500", new ApiError(500, "Internal server error"), "failed"],
    ["a network error", new TypeError("Failed to fetch"), "failed"],
    ["a non-error value", "boom", "failed"],
  ])("maps %s to %s", (_, error, cause) => {
    expect(skipErrorCause(error)).toBe(cause);
  });
});
