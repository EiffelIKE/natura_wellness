// 002: the skip layer of subscriptionReducer. One describe per action, following plan.md's transition table.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { ApiError, type Subscription } from "../api/types";
import { type Action, type State, initialState, subscriptionReducer } from "./subscriptionReducer";

// Local-time constructors keep the dates independent of the machine's time zone (as in format.test.ts).
const local = (year: number, monthIndex: number, day: number, hour = 12) => new Date(year, monthIndex, day, hour);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

const DEC_16 = iso(2026, 11, 16);
const server = (overrides: Partial<Subscription> = {}): Subscription => ({
  ...fixtures.active(),
  nextChargeAt: DEC_16,
  ...overrides,
});

const conflict = () => new ApiError(409, "Subscription was modified since it was loaded");
const serverError = () => new ApiError(500, "Internal server error");
const notFound = () => new ApiError(404, "Subscription not found");

const run = (actions: Action[], from: State = initialState) => actions.reduce(subscriptionReducer, from);
const opened: Action = { type: "skip/opened" };
const closedAction: Action = { type: "skip/closed" };
const skipStarted = (requestId: number): Action => ({ type: "skip/started", requestId });
const skipSucceeded = (requestId: number, subscription = server()): Action => ({
  type: "skip/succeeded",
  requestId,
  subscription,
});
const skipFailed = (requestId: number, error: unknown = conflict()): Action => ({
  type: "skip/failed",
  requestId,
  error,
});
const refreshStarted = (requestId: number): Action => ({ type: "refresh/started", requestId });
const refreshSucceeded = (requestId: number, subscription = server()): Action => ({
  type: "refresh/succeeded",
  requestId,
  subscription,
});
const refreshFailed = (requestId: number, error: unknown = serverError()): Action => ({
  type: "refresh/failed",
  requestId,
  error,
});

/** Loaded with request 1, so the next request is 2. */
const loaded = (subscription = server()) =>
  run([
    { type: "load/started", requestId: 1 },
    { type: "load/succeeded", requestId: 1, subscription },
  ]);
const confirming = () => run([opened], loaded());
/** A 409 on request 2, with its reload (request 3) still pending. */
const checking = () => run([skipStarted(2), skipFailed(2), refreshStarted(3)], confirming());
/** The reload after a 409 failed too (R9). */
const stale = () => run([refreshFailed(3)], checking());

beforeEach(() => {
  // Only Date is faked, so formatDate's year rule (001 R9) sees Dec 10, 2026.
  vi.useFakeTimers({ now: local(2026, 11, 10), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("skip/opened (R1, R4, R9)", () => {
  it("opens to confirm with focus on Keep my order, and a fresh count", () => {
    const state = confirming();
    expect(state.skip).toEqual({ kind: "confirm", failedSkips: 0, notice: null });
    expect(state.focus).toBe("keep");
  });

  it("clears an earlier announcement", () => {
    const afterSkip = run([opened, skipStarted(2), skipSucceeded(2)], loaded());
    expect(afterSkip.announcement).not.toBe("");
    expect(run([opened], afterSkip).announcement).toBe("");
  });

  it.each([
    ["paused", server({ status: "paused" })],
    ["cancelled", server({ status: "cancelled" })],
    ["active without a next order date", server({ nextChargeAt: null })],
  ])("is ignored when %s (R1)", (_, subscription) => {
    const state = loaded(subscription);
    expect(subscriptionReducer(state, opened)).toBe(state);
  });

  it("is ignored before the subscription has loaded, and while already open", () => {
    expect(subscriptionReducer(initialState, opened)).toBe(initialState);
    const open = confirming();
    expect(subscriptionReducer(open, opened)).toBe(open);
  });

  it("reopens in the R9 state while the data is stale, with focus on Check again", () => {
    const state = run([closedAction, opened], stale());
    expect(state.skip).toEqual({ kind: "stale", failedSkips: 0 });
    expect(state.focus).toBe("check-again");
  });
});

describe("skip/closed (R4, R5, R9)", () => {
  it.each([
    ["confirm", confirming],
    ["stale", stale],
    ["rechecking", () => run([refreshStarted(4)], stale())],
  ])("closes from %s and returns focus to the skip button", (_, from) => {
    const state = subscriptionReducer(from(), closedAction);
    expect(state.skip).toEqual({ kind: "closed" });
    expect(state.focus).toBe("skip-button");
  });

  it.each([
    ["skipping", () => run([skipStarted(2)], confirming())],
    ["checking", checking],
    ["closed", loaded],
  ])("is ignored while %s", (_, from) => {
    const state = from();
    expect(subscriptionReducer(state, closedAction)).toBe(state);
  });

  it("is ignored after a success has already closed the dialog, so the focus target survives the native close", () => {
    const state = run([skipStarted(2), skipSucceeded(2)], confirming());
    expect(subscriptionReducer(state, closedAction)).toBe(state);
    expect(state.focus).toBe("skip-button");
  });
});

describe("skip/started (R5)", () => {
  it("records the date being skipped and the request, and leaves focus on the confirm button", () => {
    const state = run([skipStarted(2)], confirming());
    expect(state.skip).toEqual({ kind: "skipping", failedSkips: 0, attempted: DEC_16 });
    expect(state.requestId).toBe(2);
    expect(state.focus).toBeNull();
  });

  it("is ignored unless the dialog is waiting for the customer", () => {
    const skipping = run([skipStarted(2)], confirming());
    expect(subscriptionReducer(skipping, skipStarted(3))).toBe(skipping);
    const closed = loaded();
    expect(subscriptionReducer(closed, skipStarted(2))).toBe(closed);
  });
});

describe("skip/succeeded (R6)", () => {
  it("replaces the subscription, closes, announces the server's date and returns focus to the skip button", () => {
    // Jan 20, not the predicted Jan 15: the announcement must use the response.
    const response = server({ nextChargeAt: iso(2027, 0, 20), updatedAt: "2026-12-10T17:00:01.000Z" });
    const state = run([skipStarted(2), skipSucceeded(2, response)], confirming());

    expect(state.load).toEqual({ kind: "ready", server: response });
    expect(state.skip).toEqual({ kind: "closed" });
    expect(state.announcement).toBe("Skipped. Your next order is Jan 20, 2027.");
    expect(state.focus).toBe("skip-button");
  });

  it("moves focus to the h1 if the response leaves nothing to skip", () => {
    const state = run([skipStarted(2), skipSucceeded(2, server({ nextChargeAt: null }))], confirming());
    expect(state.announcement).toBe("Skipped.");
    expect(state.focus).toBe("heading");
  });

  it("drops a response to an older request", () => {
    const state = run([skipStarted(2)], confirming());
    expect(subscriptionReducer(state, skipSucceeded(1))).toBe(state);
    expect(subscriptionReducer(state, skipFailed(1))).toBe(state);
  });
});

describe("skip/failed (R7, R8)", () => {
  it("maps a 409 to the conflict cause and counts the failure", () => {
    const state = run([skipStarted(2), skipFailed(2)], confirming());
    expect(state.skip).toEqual({ kind: "checking", failedSkips: 1, attempted: DEC_16, cause: "conflict" });
    expect(state.focus).toBeNull();
  });

  it.each([
    ["a 400", new ApiError(400, "Only active subscriptions can skip a shipment")],
    ["a 500", serverError()],
    ["a network error", new TypeError("Failed to fetch")],
  ])("maps %s to the generic cause", (_, error) => {
    const state = run([skipStarted(2), skipFailed(2, error)], confirming());
    expect(state.skip).toMatchObject({ kind: "checking", cause: "failed" });
  });

  it("keeps the subscription it had, until the reload replaces it", () => {
    const before = confirming();
    const state = run([skipStarted(2), skipFailed(2)], before);
    expect(state.load).toBe(before.load);
  });
});

describe("refresh/started (R5, R9)", () => {
  it("keeps the checking phase and takes the new request id", () => {
    const state = checking();
    expect(state.skip).toMatchObject({ kind: "checking" });
    expect(state.requestId).toBe(3);
  });

  it("moves from stale to rechecking (Check again)", () => {
    const state = run([refreshStarted(4)], stale());
    expect(state.skip).toEqual({ kind: "rechecking", failedSkips: 1 });
    expect(state.requestId).toBe(4);
    expect(state.focus).toBeNull();
  });

  it("is ignored in any other phase", () => {
    for (const state of [loaded(), confirming(), run([skipStarted(2)], confirming())]) {
      expect(subscriptionReducer(state, refreshStarted(9))).toBe(state);
    }
  });
});

describe("refresh/succeeded (R7, R9, R10)", () => {
  it("shows the fresh data with the notice and moves focus to Keep my order", () => {
    const fresh = server({ updatedAt: "2026-12-10T17:00:01.000Z" });
    const state = run([refreshSucceeded(3, fresh)], checking());

    expect(state.load).toEqual({ kind: "ready", server: fresh });
    expect(state.skip).toEqual({ kind: "confirm", failedSkips: 1, notice: { cause: "conflict", movedFrom: null } });
    expect(state.focus).toBe("keep");
  });

  it("names the old date when the fresh one is a different day", () => {
    const state = run([refreshSucceeded(3, server({ nextChargeAt: iso(2027, 0, 15) }))], checking());
    expect(state.skip).toMatchObject({ notice: { movedFrom: DEC_16 } });
  });

  it("compares calendar days, so a change in the time alone isn't a move", () => {
    const sameDayLater = iso(2026, 11, 16, 20);
    expect(sameDayLater).not.toBe(DEC_16);
    const state = run([refreshSucceeded(3, server({ nextChargeAt: sameDayLater }))], checking());
    expect(state.skip).toMatchObject({ notice: { movedFrom: null } });
  });

  it("after Check again, uses the cause and date from the failure that made the data stale", () => {
    const failedWith500 = run(
      [skipStarted(2), skipFailed(2, serverError()), refreshStarted(3), refreshFailed(3)],
      confirming(),
    );
    const state = run(
      [refreshStarted(4), refreshSucceeded(4, server({ nextChargeAt: iso(2027, 0, 15) }))],
      failedWith500,
    );

    expect(state.skip).toEqual({ kind: "confirm", failedSkips: 1, notice: { cause: "failed", movedFrom: DEC_16 } });
    expect(state.stale).toBeNull();
    expect(state.focus).toBe("keep");
  });

  it("after a reopen while stale, still names the failure, although the count started again", () => {
    const state = run([closedAction, opened, refreshStarted(4), refreshSucceeded(4)], stale());
    expect(state.skip).toEqual({ kind: "confirm", failedSkips: 0, notice: { cause: "conflict", movedFrom: null } });
  });

  it("handles a result that arrives in the stale phase like Check again", () => {
    // Closed during Check again and reopened before it returned: request 4 is still the latest.
    const reopened = run([refreshStarted(4), closedAction, opened], stale());
    expect(reopened.skip).toEqual({ kind: "stale", failedSkips: 0 });
    const state = run([refreshSucceeded(4)], reopened);
    expect(state.skip).toMatchObject({ kind: "confirm" });
    expect(state.focus).toBe("keep");
  });

  it("with the dialog closed, only replaces the data and clears stale", () => {
    const closedWhileRechecking = run([refreshStarted(4), closedAction], stale());
    const fresh = server({ updatedAt: "2026-12-10T17:00:01.000Z" });
    const state = run([refreshSucceeded(4, fresh)], closedWhileRechecking);

    expect(state.load).toEqual({ kind: "ready", server: fresh });
    expect(state.skip).toEqual({ kind: "closed" });
    expect(state.stale).toBeNull();
    expect(state.focus).toBeNull();
    expect(run([opened], state).skip).toMatchObject({ kind: "confirm" });
  });

  it.each([
    ["paused", server({ status: "paused", nextChargeAt: null })],
    ["cancelled", server({ status: "cancelled", nextChargeAt: null })],
    ["active without a next order date", server({ nextChargeAt: null })],
  ])("closes and moves focus to the h1 when the fresh subscription is %s (R10)", (_, fresh) => {
    for (const from of [checking(), run([refreshStarted(4)], stale())]) {
      const state = subscriptionReducer(from, refreshSucceeded(from.requestId, fresh));
      expect(state.load).toEqual({ kind: "ready", server: fresh });
      expect(state.skip).toEqual({ kind: "closed" });
      expect(state.stale).toBeNull();
      expect(state.focus).toBe("heading");
    }
  });

  it("drops a response to an older request", () => {
    const state = checking();
    expect(subscriptionReducer(state, refreshSucceeded(2))).toBe(state);
    expect(subscriptionReducer(state, refreshFailed(2))).toBe(state);
  });
});

describe("refresh/failed (R9, R10)", () => {
  it("shows the R9 state, remembers the failure and moves focus to Check again", () => {
    const state = stale();
    expect(state.skip).toEqual({ kind: "stale", failedSkips: 1 });
    expect(state.stale).toEqual({ attempted: DEC_16, cause: "conflict" });
    expect(state.focus).toBe("check-again");
  });

  it("goes back to stale when Check again fails, with focus on Check again again", () => {
    const state = run([refreshStarted(4), refreshFailed(4)], stale());
    expect(state.skip).toEqual({ kind: "stale", failedSkips: 1 });
    expect(state.stale).toEqual({ attempted: DEC_16, cause: "conflict" });
    expect(state.focus).toBe("check-again");
  });

  it("keeps the stale flag when the dialog was closed during Check again", () => {
    const closedWhileRechecking = run([refreshStarted(4), closedAction], stale());
    expect(subscriptionReducer(closedWhileRechecking, refreshFailed(4))).toBe(closedWhileRechecking);
    expect(run([refreshFailed(4), opened], closedWhileRechecking).skip).toMatchObject({ kind: "stale" });
  });

  it.each([
    ["the reload after a failed skip", checking],
    ["Check again", () => run([refreshStarted(4)], stale())],
  ])("on a 404 during %s, shows not found and moves focus to the h1 (R10)", (_, from) => {
    const state = subscriptionReducer(from(), refreshFailed(from().requestId, notFound()));
    expect(state.load).toEqual({ kind: "not-found" });
    expect(state.skip).toEqual({ kind: "closed" });
    expect(state.stale).toBeNull();
    expect(state.focus).toBe("heading");
  });
});

describe("the failed-skip count (R8)", () => {
  it("reaches 2 after two failed skips in a row", () => {
    const state = run(
      [refreshSucceeded(3), skipStarted(4), skipFailed(4), refreshStarted(5), refreshSucceeded(5)],
      checking(),
    );
    expect(state.skip).toMatchObject({ kind: "confirm", failedSkips: 2 });
  });

  it("doesn't count a failed reload", () => {
    const state = run([refreshStarted(4), refreshFailed(4), refreshStarted(5), refreshSucceeded(5)], stale());
    expect(state.skip).toMatchObject({ kind: "confirm", failedSkips: 1 });
  });

  it("resets when the dialog closes and reopens", () => {
    const twice = run(
      [refreshSucceeded(3), skipStarted(4), skipFailed(4), refreshStarted(5), refreshSucceeded(5)],
      checking(),
    );
    expect(run([closedAction, opened], twice).skip).toEqual({ kind: "confirm", failedSkips: 0, notice: null });
  });

  it("resets on success", () => {
    const state = run([refreshSucceeded(3), skipStarted(4), skipSucceeded(4), opened], checking());
    expect(state.skip).toEqual({ kind: "confirm", failedSkips: 0, notice: null });
  });
});

describe("load/started with the skip layer", () => {
  it("resets the dialog, the stale flag and the announcement", () => {
    const state = run([{ type: "load/started", requestId: 9 }], stale());
    expect(state).toEqual({ ...initialState, requestId: 9 });
  });
});
