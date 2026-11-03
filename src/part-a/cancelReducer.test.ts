// 004: the cancel layer of subscriptionReducer. One describe per action, following plan.md's transition table.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { type Subscription } from "../api/types";
import { type Offer, offersFor } from "./cancel";
import { type Action, type State, initialState, subscriptionReducer } from "./subscriptionReducer";

// Local-time constructors keep the dates independent of the machine's time zone (as in format.test.ts).
const local = (year: number, monthIndex: number, day: number, hour = 12) => new Date(year, monthIndex, day, hour);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

const DEC_16 = iso(2026, 11, 16);
const MULTI = "NW-MULTI-30";
const server = (overrides: Partial<Subscription> = {}): Subscription => ({
  ...fixtures.active(),
  nextChargeAt: DEC_16,
  ...overrides,
});

const run = (actions: Action[], from: State = initialState) => actions.reduce(subscriptionReducer, from);
const opened: Action = { type: "cancel/opened" };
const chosen = (reason: Extract<Action, { type: "cancel/reasonChosen" }>["reason"]): Action => ({
  type: "cancel/reasonChosen",
  reason,
});
const back: Action = { type: "cancel/back" };
const closedAction: Action = { type: "cancel/closed" };
const taken = (offer: Offer): Action => ({ type: "cancel/offerTaken", offer });
const confirmed: Action = { type: "cancel/confirmed" };
const undone: Action = { type: "cancel/undone" };

const SKIP: Offer = { kind: "skip", label: "Skip my Dec 16 order" };
const EVERY_60: Offer = { kind: "frequency", days: 60, label: "Ship every 60 days" };
const MULTI_1: Offer = {
  kind: "quantity",
  sku: MULTI,
  quantity: 1,
  label: "Get 1 Multivitamin, 30 tablets instead of 2: save $38.20 per order",
};

/** Loaded with request 1, so the next request is 2. */
const loaded = (subscription = server()) =>
  run([
    { type: "load/started", requestId: 1 },
    { type: "load/succeeded", requestId: 1, subscription },
  ]);
const atReason = () => run([opened], loaded());
const atOffer = (reason: Parameters<typeof chosen>[0] = "too-much", from = loaded()) =>
  run([opened, chosen(reason)], from);
const cancelledLocally = (from = loaded()) => run([opened, chosen("no-results"), confirmed], from);
/** Every 60 days and Multivitamin 2 → 1, both pending (003). */
const withChanges = () =>
  run(
    [
      { type: "plan/frequency", days: 60 },
      { type: "plan/quantity", sku: MULTI, quantity: 1 },
    ],
    loaded(),
  );

beforeEach(() => {
  // Only Date is faked, so formatDate's year rule (001 R9) sees Dec 10, 2026.
  vi.useFakeTimers({ now: local(2026, 11, 10), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initial state", () => {
  it("starts with the flow closed and nothing cancelled", () => {
    expect(initialState.cancel).toEqual({ kind: "closed" });
    expect(initialState.cancelled).toBe(false);
  });
});

describe("cancel/opened (R1)", () => {
  it("opens at the reasons with focus on the first one, and clears an earlier announcement", () => {
    const state = run([opened], withChanges());
    expect(withChanges().announcement).not.toBe("");
    expect(state.cancel).toEqual({ kind: "reason", previous: null });
    expect(state.focus).toBe("cancel-reason");
    expect(state.announcement).toBe("");
  });

  it("opens without a next order date, where only the skip offers are missing", () => {
    expect(run([opened], loaded(server({ nextChargeAt: null }))).cancel.kind).toBe("reason");
  });

  it.each([
    ["before the subscription has loaded", () => initialState],
    ["while loading again", () => run([{ type: "load/started", requestId: 2 }], loaded())],
    ["when paused", () => loaded(fixtures.paused())],
    ["when the server says cancelled", () => loaded(fixtures.cancelled())],
    ["when cancelled locally", () => cancelledLocally()],
    ["while the skip dialog is open", () => run([{ type: "skip/opened" }], loaded())],
    ["while already at the reasons", atReason],
    ["while already at the offers", () => atOffer()],
  ])("is ignored %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, opened)).toBe(state);
  });
});

describe("cancel/reasonChosen (R2)", () => {
  it.each(["too-much", "costs", "different", "no-results", "other"] as const)(
    "goes to the offers for %s with focus on the step 2 heading",
    (reason) => {
      const state = run([chosen(reason)], atReason());
      expect(state.cancel).toEqual({ kind: "offer", reason });
      expect(state.focus).toBe("cancel-heading");
    },
  );

  it.each([
    ["closed", loaded],
    ["already at the offers", () => atOffer()],
  ])("is ignored when %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, chosen("costs"))).toBe(state);
  });
});

describe("cancel/back (R3)", () => {
  it("goes back to the reasons with focus on the reason chosen before", () => {
    const state = run([back], atOffer("costs"));
    expect(state.cancel).toEqual({ kind: "reason", previous: "costs" });
    expect(state.focus).toBe("cancel-reason");
  });

  it("can choose another reason after going back", () => {
    expect(run([back, chosen("other")], atOffer("costs")).cancel).toEqual({ kind: "offer", reason: "other" });
  });

  it.each([
    ["closed", loaded],
    ["at the reasons", atReason],
  ])("is ignored when %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, back)).toBe(state);
  });
});

describe("cancel/closed (R10)", () => {
  it.each([
    ["the reasons", atReason],
    ["the offers", () => atOffer()],
    ["the reasons after Back", () => run([back], atOffer())],
  ])("closes from %s, keeps the subscription and returns focus to the trigger", (_, from) => {
    const state = subscriptionReducer(from(), closedAction);
    expect(state.cancel).toEqual({ kind: "closed" });
    expect(state.cancelled).toBe(false);
    expect(state.focus).toBe("cancel-button");
  });

  it("keeps pending plan changes", () => {
    expect(run([opened, chosen("costs"), closedAction], withChanges()).local).toEqual(withChanges().local);
  });

  it("is ignored when already closed, as for the native close after our own close()", () => {
    const state = loaded();
    expect(subscriptionReducer(state, closedAction)).toBe(state);
  });
});

describe("cancel/offerTaken (R5, R6)", () => {
  it("swaps the cancel flow for the skip dialog, with 002's own focus (R5)", () => {
    const state = run([taken(SKIP)], atOffer("too-much"));
    expect(state.cancel).toEqual({ kind: "closed" });
    expect(state.skip).toEqual({ kind: "confirm", failedSkips: 0, notice: null });
    expect(state.focus).toBe("keep");
  });

  it("opens the skip dialog in its stale state when the data may be out of date (002 R9)", () => {
    const stale = {
      ...loaded(),
      stale: { attempted: DEC_16, cause: "conflict" as const },
    };
    const state = run(
      [opened, chosen("different"), taken({ ...SKIP, label: "Skip my Dec 16 order while you try it" })],
      stale,
    );
    expect(state.skip).toEqual({ kind: "stale", failedSkips: 0 });
    expect(state.focus).toBe("check-again");
  });

  it("applies the slower frequency, announces it and focuses Change your plan (R6)", () => {
    const state = run([taken(EVERY_60)], atOffer("too-much"));
    expect(state.cancel).toEqual({ kind: "closed" });
    expect(state.skip).toEqual({ kind: "closed" });
    expect(state.local).toEqual({ intervalDays: 60, quantities: {} });
    expect(state.announcement).toBe("Frequency changed to every 60 days, starting after your Dec 16 order.");
    expect(state.focus).toBe("plan-heading");
    expect(state.cancelled).toBe(false);
  });

  it("applies one unit less and announces the new total (R6)", () => {
    const state = run([taken(MULTI_1)], atOffer("costs"));
    expect(state.local).toEqual({ intervalDays: null, quantities: { [MULTI]: 1 } });
    expect(state.announcement).toBe(
      "Multivitamin, 30 tablets quantity changed from 2 to 1, starting after your Dec 16 order. After that: $63.67 per order.",
    );
    expect(state.focus).toBe("plan-heading");
  });

  it("takes every offer offersFor builds for the current data", () => {
    const from = atOffer("costs", withChanges());
    if (from.load.kind !== "ready") throw new Error("not loaded");
    const offers = offersFor("costs", from.load.server, from.local);
    // Pending 60 → 90 is offered, and Multivitamin is already at 1, so it has no quantity offer.
    expect(offers.map((offer) => offer.kind)).toEqual(["frequency"]);
    expect(run([taken(offers[0])], from).local.intervalDays).toBe(90);
  });

  it.each([
    ["an offer for another reason", "no-results" as const, SKIP],
    ["a made-up frequency", "too-much" as const, { ...EVERY_60, days: 90 }],
    ["a made-up label", "too-much" as const, { ...EVERY_60, label: "Ship every 90 days" }],
    ["a quantity offer for an unknown SKU", "costs" as const, { ...MULTI_1, sku: "NW-NOPE" }],
  ])("ignores %s", (_, reason, offer) => {
    const state = atOffer(reason);
    expect(subscriptionReducer(state, taken(offer))).toBe(state);
  });

  it("ignores a quantity offer built before a 003 change made it stale", () => {
    const state = run(
      [closedAction, { type: "plan/quantity", sku: MULTI, quantity: 3 }, opened, chosen("costs")],
      atOffer("costs"),
    );
    // Now it is 3 → 2, so the old 2 → 1 offer is no longer one of them.
    expect(subscriptionReducer(state, taken(MULTI_1))).toBe(state);
  });

  it("ignores a quantity offer the cap left out (R3)", () => {
    // Three items at 2. The cheapest one's saving is the smallest, so it isn't among the two offered.
    const cheap = { sku: "NW-CHEAP", name: "Cheap", quantity: 2, unitPriceCents: 1000, imageUrl: null };
    const three = server({ items: [...fixtures.active().items.map((item) => ({ ...item, quantity: 2 })), cheap] });
    const state = atOffer("costs", loaded(three));
    if (state.load.kind !== "ready") throw new Error("not loaded");
    const skus = offersFor("costs", state.load.server, state.local).map((offer) => "sku" in offer && offer.sku);
    expect(skus).not.toContain("NW-CHEAP");

    const leftOut: Offer = {
      kind: "quantity",
      sku: "NW-CHEAP",
      quantity: 1,
      label: "Get 1 Cheap instead of 2: save $8.50 per order",
    };
    expect(subscriptionReducer(state, taken(leftOut))).toBe(state);
  });

  it("ignores a skip offer without a next order date", () => {
    const state = atOffer("too-much", loaded(server({ nextChargeAt: null })));
    expect(subscriptionReducer(state, taken(SKIP))).toBe(state);
  });

  it.each([
    ["closed", loaded],
    ["at the reasons", atReason],
  ])("is ignored when %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, taken(EVERY_60))).toBe(state);
  });
});

describe("cancel/confirmed (R7)", () => {
  it.each(["too-much", "costs", "different", "no-results", "other"] as const)(
    "cancels locally from the %s offers, announces it and focuses the h1",
    (reason) => {
      const state = run([confirmed], atOffer(reason));
      expect(state.cancelled).toBe(true);
      expect(state.cancel).toEqual({ kind: "closed" });
      expect(state.announcement).toBe("Your subscription is cancelled. You won't be charged again.");
      expect(state.focus).toBe("heading");
    },
  );

  it("never touches the server's data or the pending changes", () => {
    const before = withChanges();
    const state = run([opened, chosen("costs"), confirmed], before);
    expect(state.load).toBe(before.load);
    expect(state.local).toBe(before.local);
  });

  it.each([
    ["closed", loaded],
    ["at the reasons (step 1)", atReason],
  ])("is ignored when %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, confirmed)).toBe(state);
  });
});

describe("cancel/undone (R8)", () => {
  it("brings back the active subscription with its pending changes, announces it and focuses the h1", () => {
    const before = withChanges();
    const state = run([undone], cancelledLocally(before));
    expect(state.cancelled).toBe(false);
    expect(state.local).toBe(before.local);
    expect(state.announcement).toBe("Cancellation undone. Your subscription is active.");
    expect(state.focus).toBe("heading");
  });

  it.each([
    ["nothing was cancelled", loaded],
    ["the server says cancelled", () => loaded(fixtures.cancelled())],
    ["the subscription is loading again", () => run([{ type: "load/started", requestId: 2 }], cancelledLocally())],
  ])("is ignored when %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, undone)).toBe(state);
  });
});

describe("a local cancel (R9)", () => {
  it.each([
    ["plan/frequency", { type: "plan/frequency", days: 60 }],
    ["plan/quantity", { type: "plan/quantity", sku: MULTI, quantity: 1 }],
    ["skip/opened", { type: "skip/opened" }],
  ] as const)("ignores %s while cancelled locally", (_, action) => {
    const state = cancelledLocally();
    expect(subscriptionReducer(state, action)).toBe(state);
  });

  it("ignores plan/discarded too, so the pending changes survive for Undo", () => {
    const state = cancelledLocally(withChanges());
    expect(subscriptionReducer(state, { type: "plan/discarded" })).toBe(state);
  });

  it("is kept by load/started, which closes an open flow", () => {
    const state = run([{ type: "load/started", requestId: 2 }], cancelledLocally());
    expect(state.cancelled).toBe(true);
    expect(run([{ type: "load/started", requestId: 2 }], atOffer()).cancel).toEqual({ kind: "closed" });
  });
});

describe("skip/opened with the cancel dialog open", () => {
  it("is ignored, so two modals are never open at once", () => {
    const state = atOffer();
    expect(subscriptionReducer(state, { type: "skip/opened" })).toBe(state);
  });
});
