// 003: the plan layer of subscriptionReducer. One describe per action, following plan.md's transition table.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { ApiError, type Subscription } from "../api/types";
import { pendingOf } from "./plan";
import { type Action, type State, initialState, subscriptionReducer } from "./subscriptionReducer";

// Local-time constructors keep the dates independent of the machine's time zone (as in format.test.ts).
const local = (year: number, monthIndex: number, day: number, hour = 12) => new Date(year, monthIndex, day, hour);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

const DEC_16 = iso(2026, 11, 16);
const JAN_15 = iso(2027, 0, 15);
const MULTI = "NW-MULTI-30";
const VITD = "NW-VITD-60";
const server = (overrides: Partial<Subscription> = {}): Subscription => ({
  ...fixtures.active(),
  nextChargeAt: DEC_16,
  ...overrides,
});

const run = (actions: Action[], from: State = initialState) => actions.reduce(subscriptionReducer, from);
const frequency = (days: number): Action => ({ type: "plan/frequency", days });
const quantity = (sku: string, value: number): Action => ({ type: "plan/quantity", sku, quantity: value });
const discarded: Action = { type: "plan/discarded" };

/** Loaded with request 1, so the next request is 2. */
const loaded = (subscription = server()) =>
  run([
    { type: "load/started", requestId: 1 },
    { type: "load/succeeded", requestId: 1, subscription },
  ]);
/** Every 60 days and Multivitamin 2 → 1, both pending. */
const withChanges = (subscription = server()) => run([frequency(60), quantity(MULTI, 1)], loaded(subscription));

beforeEach(() => {
  // Only Date is faked, so formatDate's year rule (001 R9) sees Dec 10, 2026.
  vi.useFakeTimers({ now: local(2026, 11, 10), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initial state", () => {
  it("starts with nothing picked", () => {
    expect(initialState.local).toEqual({ intervalDays: null, quantities: {} });
  });
});

describe("plan/frequency (R1, R5, R6)", () => {
  it.each([60, 90])("stores %i days and announces when it starts, leaving focus where it is", (days) => {
    const state = run([frequency(days)], loaded());
    expect(state.local).toEqual({ intervalDays: days, quantities: {} });
    expect(state.announcement).toBe(`Frequency changed to every ${days} days, starting after your Dec 16 order.`);
    expect(state.focus).toBeNull();
  });

  it("clears the change when the server's frequency is picked again (R5)", () => {
    const state = run([frequency(60), frequency(30)], loaded());
    expect(state.local.intervalDays).toBeNull();
    expect(state.announcement).toBe("Frequency back to every 30 days, no change pending.");
  });

  it("replaces an earlier pick", () => {
    expect(run([frequency(60), frequency(90)], loaded()).local.intervalDays).toBe(90);
  });

  it("names the next order's year when it is in another year", () => {
    const state = run([frequency(60)], loaded(server({ nextChargeAt: JAN_15 })));
    expect(state.announcement).toBe("Frequency changed to every 60 days, starting after your Jan 15, 2027 order.");
  });

  it("says 'your next order' when the server sends no date (001 R3)", () => {
    const state = run([frequency(60)], loaded(server({ nextChargeAt: null })));
    expect(state.announcement).toBe("Frequency changed to every 60 days, starting after your next order.");
  });

  it("keeps pending quantities", () => {
    const state = run([quantity(MULTI, 1), frequency(60)], loaded());
    expect(state.local).toEqual({ intervalDays: 60, quantities: { [MULTI]: 1 } });
  });

  it.each([0, 15, 45, 120, -30, 60.5, Number.NaN])("ignores %s days", (days) => {
    const state = loaded();
    expect(subscriptionReducer(state, frequency(days))).toBe(state);
  });

  describe("with a server interval outside 30/60/90 (R1 edge-case round)", () => {
    const odd = () => loaded(server({ intervalDays: 45 }));

    it("takes a pick from the usual three", () => {
      expect(run([frequency(30)], odd()).local.intervalDays).toBe(30);
    });

    it("takes the server's 45 back, which clears the change (R5)", () => {
      const state = run([frequency(60), frequency(45)], odd());
      expect(state.local.intervalDays).toBeNull();
      expect(state.announcement).toBe("Frequency back to every 45 days, no change pending.");
    });

    it("still ignores any other value outside 30/60/90", () => {
      const state = odd();
      expect(subscriptionReducer(state, frequency(15))).toBe(state);
    });
  });
});

describe("plan/quantity (R2, R4, R5, R6)", () => {
  it("stores the pick by SKU and announces the change from the server's quantity, with the new total", () => {
    const state = run([quantity(MULTI, 1)], loaded());
    expect(state.local).toEqual({ intervalDays: null, quantities: { [MULTI]: 1 } });
    // 2995 + 4495 = 7490, less 15% = 6366.5, rounded as the mock does.
    expect(state.announcement).toBe(
      "Multivitamin, 30 tablets quantity changed from 2 to 1, starting after your Dec 16 order. After that: $63.67 per order.",
    );
    expect(state.focus).toBeNull();
  });

  it("always says 'from' the server's quantity, never the previous pick", () => {
    const state = run([quantity(MULTI, 1), quantity(MULTI, 3)], loaded());
    expect(state.local.quantities).toEqual({ [MULTI]: 3 });
    expect(state.announcement).toMatch(/^Multivitamin, 30 tablets quantity changed from 2 to 3,/);
  });

  it("totals every pending quantity, not only the one that changed", () => {
    const state = run([quantity(MULTI, 1), quantity(VITD, 3)], loaded());
    // 3 × 2995 + 4495 = 13480, less 15% = 11458.
    expect(state.announcement).toBe(
      "Vitamin D, 60 softgels quantity changed from 1 to 3, starting after your Dec 16 order. After that: $114.58 per order.",
    );
  });

  it("removes the SKU when the server's quantity is picked again (R5)", () => {
    const state = run([quantity(MULTI, 1), quantity(VITD, 2), quantity(MULTI, 2)], loaded());
    expect(state.local.quantities).toEqual({ [VITD]: 2 });
    expect(state.announcement).toBe("Multivitamin, 30 tablets quantity back to 2, no change pending.");
  });

  it("stores nothing when the server's quantity is picked with nothing pending", () => {
    expect(run([quantity(MULTI, 2)], loaded()).local).toEqual(initialState.local);
  });

  it("says 'your next order' when the server sends no date (001 R3)", () => {
    const state = run([quantity(MULTI, 1)], loaded(server({ nextChargeAt: null })));
    expect(state.announcement).toMatch(/, starting after your next order\. After that: \$63\.67 per order\.$/);
  });

  it("keeps a pending frequency", () => {
    expect(run([frequency(90), quantity(MULTI, 4)], loaded()).local.intervalDays).toBe(90);
  });

  it.each([
    ["quantity 0", MULTI, 0],
    ["quantity 11", MULTI, 11],
    ["a negative quantity", MULTI, -1],
    ["a non-integer quantity", MULTI, 1.5],
    ["NaN", MULTI, Number.NaN],
    ["an unknown SKU", "NW-MAG-90", 1],
  ])("ignores %s", (_, sku, value) => {
    const state = loaded();
    expect(subscriptionReducer(state, quantity(sku, value))).toBe(state);
  });

  describe("with a server quantity outside 1 to 10 (R2 edge-case round)", () => {
    const [vitaminD, multivitamin] = fixtures.active().items;
    const twelve = () => loaded(server({ items: [vitaminD, { ...multivitamin, quantity: 12 }] }));

    it("announces a pick from 1 to 10 as a change from 12", () => {
      const state = run([quantity(MULTI, 3)], twelve());
      expect(state.local.quantities).toEqual({ [MULTI]: 3 });
      expect(state.announcement).toMatch(/^Multivitamin, 30 tablets quantity changed from 12 to 3,/);
    });

    it("takes the server's 12 back, which clears the change (R5)", () => {
      const state = run([quantity(MULTI, 3), quantity(MULTI, 12)], twelve());
      expect(state.local.quantities).toEqual({});
      expect(state.announcement).toBe("Multivitamin, 30 tablets quantity back to 12, no change pending.");
    });

    it("still ignores 11, and 12 for an item whose server quantity isn't 12", () => {
      const state = twelve();
      expect(subscriptionReducer(state, quantity(MULTI, 11))).toBe(state);
      expect(subscriptionReducer(state, quantity(VITD, 12))).toBe(state);
    });
  });
});

describe("plan/discarded (R5)", () => {
  it("empties every change, announces it and moves focus to the section heading", () => {
    const state = run([discarded], withChanges());
    expect(state.local).toEqual(initialState.local);
    expect(state.announcement).toBe("Changes discarded.");
    expect(state.focus).toBe("plan-heading");
  });

  it("is ignored with nothing pending", () => {
    const state = loaded();
    expect(subscriptionReducer(state, discarded)).toBe(state);
  });

  it("is ignored when every stored value now equals the server's (R7)", () => {
    // Stored while the server said 30; a reload then brings 60, so nothing is pending any more.
    const state = run(
      [
        frequency(60),
        { type: "load/started", requestId: 2 },
        { type: "load/succeeded", requestId: 2, subscription: server({ intervalDays: 60 }) },
      ],
      loaded(),
    );
    expect(state.local.intervalDays).toBe(60);
    expect(subscriptionReducer(state, discarded)).toBe(state);
  });
});

describe("plan changes are only taken while loaded and active (R7)", () => {
  const changes: [string, Action][] = [
    ["a frequency", frequency(60)],
    ["a quantity", quantity(MULTI, 1)],
    ["a discard", discarded],
  ];

  it.each(changes)("ignores %s while loading", (_, action) => {
    expect(subscriptionReducer(initialState, action)).toBe(initialState);
  });

  it.each(changes)("ignores %s after a failed load", (_, action) => {
    const state = run([
      { type: "load/started", requestId: 1 },
      { type: "load/failed", requestId: 1, error: new ApiError(500, "Internal server error") },
    ]);
    expect(subscriptionReducer(state, action)).toBe(state);
  });

  it.each([
    ["paused", fixtures.paused()],
    ["cancelled", fixtures.cancelled()],
  ])("ignores a frequency or quantity change when %s", (_, subscription) => {
    const state = loaded(subscription);
    expect(subscriptionReducer(state, frequency(60))).toBe(state);
    expect(subscriptionReducer(state, quantity(MULTI, 1))).toBe(state);
  });
});

describe("the server's actions never touch `local` (R7)", () => {
  const fresh = server({ updatedAt: "2026-12-10T17:00:01.000Z" });

  it("keeps it through load/started and a new load", () => {
    const before = withChanges();
    const state = run(
      [
        { type: "load/started", requestId: 2 },
        { type: "load/succeeded", requestId: 2, subscription: fresh },
      ],
      before,
    );
    expect(state.local).toBe(before.local);
  });

  it("keeps it through a successful skip, and the date in pendingOf follows the new server", () => {
    const before = withChanges();
    const state = run(
      [
        { type: "skip/opened" },
        { type: "skip/started", requestId: 2 },
        { type: "skip/succeeded", requestId: 2, subscription: server({ nextChargeAt: JAN_15 }) },
      ],
      before,
    );
    expect(state.local).toBe(before.local);
    expect(state.load.kind === "ready" && pendingOf(state.load.server, state.local).intervalDays).toBe(60);
  });

  it("keeps it through a 409 and its reload (002 R11)", () => {
    const before = withChanges();
    const state = run(
      [
        { type: "skip/opened" },
        { type: "skip/started", requestId: 2 },
        { type: "skip/failed", requestId: 2, error: new ApiError(409, "Conflict") },
        { type: "refresh/started", requestId: 3 },
        { type: "refresh/succeeded", requestId: 3, subscription: fresh },
      ],
      before,
    );
    expect(state.local).toBe(before.local);
    expect(state.load).toEqual({ kind: "ready", server: fresh });
  });

  it("keeps it when the reload fails", () => {
    const before = withChanges();
    const state = run(
      [
        { type: "skip/opened" },
        { type: "skip/started", requestId: 2 },
        { type: "skip/failed", requestId: 2, error: new ApiError(409, "Conflict") },
        { type: "refresh/started", requestId: 3 },
        { type: "refresh/failed", requestId: 3, error: new ApiError(500, "Internal server error") },
      ],
      before,
    );
    expect(state.local).toBe(before.local);
  });

  it("keeps it while hidden by a status that isn't active, and shows it again when active", () => {
    const before = withChanges();
    const reload = (requestId: number, subscription: Subscription): Action[] => [
      { type: "load/started", requestId },
      { type: "load/succeeded", requestId, subscription },
    ];
    const paused = run(reload(2, fixtures.paused()), before);
    expect(paused.local).toBe(before.local);
    expect(run(reload(3, server()), paused).local).toBe(before.local);
  });

  it("drops a stored value from pendingOf once the fresh server has it, and cleans it on the next change", () => {
    const sixty = server({ intervalDays: 60 });
    const state = run(
      [
        { type: "skip/opened" },
        { type: "skip/started", requestId: 2 },
        { type: "skip/failed", requestId: 2, error: new ApiError(409, "Conflict") },
        { type: "refresh/started", requestId: 3 },
        { type: "refresh/succeeded", requestId: 3, subscription: sixty },
      ],
      withChanges(),
    );
    expect(pendingOf(sixty, state.local).intervalDays).toBeNull();
    expect(run([frequency(60)], state).local.intervalDays).toBeNull();
  });
});

describe("the status region with the skip layer", () => {
  it("is cleared when the skip dialog opens, so a plan announcement isn't read again", () => {
    const state = run([frequency(60), { type: "skip/opened" }], loaded());
    expect(state.announcement).toBe("");
    expect(state.local.intervalDays).toBe(60);
  });
});
