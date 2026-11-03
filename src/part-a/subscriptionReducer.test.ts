import { describe, expect, it } from "vitest";
import { fixtures } from "../api/fixtures";
import { ApiError } from "../api/types";
import {
  type Action,
  type State,
  initialState,
  loadErrorKind,
  subscriptionReducer,
  viewOf,
} from "./subscriptionReducer";

const run = (actions: Action[], from: State = initialState) => actions.reduce(subscriptionReducer, from);
const started = (requestId: number): Action => ({ type: "load/started", requestId });
const succeeded = (requestId: number, subscription = fixtures.active()): Action => ({
  type: "load/succeeded",
  requestId,
  subscription,
});
const failed = (requestId: number, error: unknown = new ApiError(500, "Internal server error")): Action => ({
  type: "load/failed",
  requestId,
  error,
});

describe("subscriptionReducer: load lifecycle (R1, R2)", () => {
  it("starts in loading, so the skeleton shows on the first render", () => {
    expect(initialState.load).toEqual({ kind: "loading" });
  });

  it("stores the server's subscription unchanged when the latest request succeeds (R4)", () => {
    const subscription = fixtures.active();
    const state = run([started(1), succeeded(1, subscription)]);
    expect(state.load).toEqual({ kind: "ready", server: subscription });
    if (state.load.kind === "ready") expect(state.load.server).toBe(subscription);
  });

  it("maps a 500 to failed and a 404 to not-found", () => {
    expect(run([started(1), failed(1)]).load).toEqual({ kind: "failed" });
    expect(run([started(1), failed(1, new ApiError(404, "Subscription not found"))]).load).toEqual({
      kind: "not-found",
    });
  });

  it("goes back to loading on Try again", () => {
    const state = run([started(1), failed(1), started(2)]);
    expect(state).toEqual({ requestId: 2, load: { kind: "loading" } });
    expect(run([succeeded(2)], state).load.kind).toBe("ready");
  });
});

describe("subscriptionReducer: stale responses", () => {
  it("drops the first request's response under the StrictMode double effect", () => {
    const afterBothStarts = run([started(1), started(2)]);
    expect(subscriptionReducer(afterBothStarts, succeeded(1))).toBe(afterBothStarts);
    expect(subscriptionReducer(afterBothStarts, failed(1))).toBe(afterBothStarts);
  });

  it("drops an older response that arrives after the latest one has already loaded", () => {
    // The mock's latency is random, so request 2 can resolve before request 1.
    const latest = { ...fixtures.active(), updatedAt: "2026-12-10T17:00:00.000Z" };
    const ready = run([started(1), started(2), succeeded(2, latest)]);
    expect(subscriptionReducer(ready, succeeded(1))).toBe(ready);
    expect(subscriptionReducer(ready, failed(1))).toBe(ready);
  });

  it("drops a stale failure, so it can't replace data that loaded", () => {
    const state = run([started(1), started(2), succeeded(2), failed(1, new ApiError(404, "Subscription not found"))]);
    expect(state.load.kind).toBe("ready");
  });
});

describe("loadErrorKind (R2)", () => {
  it.each([
    ["a 404", new ApiError(404, "Subscription not found"), "not-found"],
    ["a 500", new ApiError(500, "Internal server error"), "failed"],
    ["another API status", new ApiError(400, "Bad request"), "failed"],
    ["a network error", new TypeError("Failed to fetch"), "failed"],
    ["a non-error value", "boom", "failed"],
  ])("maps %s to %s", (_, error, kind) => {
    expect(loadErrorKind(error)).toBe(kind);
  });
});

describe("viewOf (R7)", () => {
  it.each(["active", "paused", "cancelled"] as const)("shows the server's %s status", (status) => {
    expect(viewOf(fixtures[status]())).toBe(status);
  });
});
