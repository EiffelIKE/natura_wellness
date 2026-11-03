// 001: the load lifecycle. 002–004 add their own layers to `State` without reshaping `load` (plan.md).
import { ApiError, type Subscription, type SubscriptionStatus } from "../api/types";

export type Load =
  | { kind: "loading" }
  | { kind: "failed" } // 500 or anything unknown → R2 "Try again"
  | { kind: "not-found" } // 404 → R2 contact link, no retry
  | { kind: "ready"; server: Subscription };

export interface State {
  /** The latest request sent. A response to any other request is stale and dropped, whatever `load` is. */
  requestId: number;
  load: Load;
}

export type Action =
  | { type: "load/started"; requestId: number }
  | { type: "load/succeeded"; requestId: number; subscription: Subscription }
  | { type: "load/failed"; requestId: number; error: unknown };

/** Loading from the first render, so the skeleton shows before the load effect runs (R1). */
export const initialState: State = { requestId: 0, load: { kind: "loading" } };

/** R2: only a 404 means there is nothing to retry. Anything else, including non-API errors, can be retried. */
export function loadErrorKind(error: unknown): "failed" | "not-found" {
  return error instanceof ApiError && error.status === 404 ? "not-found" : "failed";
}

export function subscriptionReducer(state: State, action: Action): State {
  switch (action.type) {
    case "load/started":
      return { ...state, requestId: action.requestId, load: { kind: "loading" } };
    case "load/succeeded":
      if (action.requestId !== state.requestId) return state;
      return { ...state, load: { kind: "ready", server: action.subscription } };
    case "load/failed":
      if (action.requestId !== state.requestId) return state;
      return { ...state, load: { kind: loadErrorKind(action.error) } };
  }
}

/** Which view a loaded subscription gets. 004 adds the local cancel here, and a server status that isn't active wins (R7). */
export function viewOf(server: Subscription): SubscriptionStatus {
  return server.status;
}
