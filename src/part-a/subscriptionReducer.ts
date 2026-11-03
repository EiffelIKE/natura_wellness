// 001: the load lifecycle. 002–004 add their own layers to `State` without reshaping `load` (plan.md).
import { ApiError, type Subscription, type SubscriptionStatus } from "../api/types";
import { formatDate } from "./format";
import { canSkip, type Cause, skipErrorCause } from "./skip";

export type Load =
  | { kind: "loading" }
  | { kind: "failed" } // 500 or anything unknown → R2 "Try again"
  | { kind: "not-found" } // 404 → R2 contact link, no retry
  | { kind: "ready"; server: Subscription };

/** 002 R7: what the dialog says after a failed skip, once the reload has succeeded. */
export interface Notice {
  cause: Cause;
  /** The date the customer tried to skip, set only when the fresh date is a different calendar day. */
  movedFrom: string | null;
}

/** 002: the skip dialog's phase. `failedSkips` is R8's count, and `attempted` the `nextChargeAt` the skip was sent with. */
export type Skip =
  | { kind: "closed" }
  | { kind: "confirm"; failedSkips: number; notice: Notice | null } // waiting for the customer
  | { kind: "skipping"; failedSkips: number; attempted: string } // R5: skip request pending
  | { kind: "checking"; failedSkips: number; attempted: string; cause: Cause } // R5, R7: reload pending
  | { kind: "stale"; failedSkips: number } // R9: the reload failed
  | { kind: "rechecking"; failedSkips: number }; // R9: "Check again" pending

/** `heading-if-lost`: the h1, but only if focus fell to `<body>` (R10). The reducer can't see DOM focus. */
export type Focus = "keep" | "check-again" | "skip-button" | "heading" | "heading-if-lost";

export interface State {
  /** The latest request sent. A response to any other request is stale and dropped, whatever `load` is. */
  requestId: number;
  load: Load;
  skip: Skip;
  /** 002 R9: the last reload failed, so `server` may be out of date. Survives closing the dialog. */
  stale: { attempted: string; cause: Cause } | null;
  /** Text for the page's status region (002 R6). Cleared by `load/started` and `skip/opened`. */
  announcement: string;
  /** Where focus goes after this transition, or null to leave it. SubscriptionCard applies it and doesn't decide it. */
  focus: Focus | null;
}

export type Action =
  | { type: "load/started"; requestId: number }
  | { type: "load/succeeded"; requestId: number; subscription: Subscription }
  | { type: "load/failed"; requestId: number; error: unknown }
  | { type: "skip/opened" }
  | { type: "skip/closed" }
  | { type: "skip/started"; requestId: number }
  | { type: "skip/succeeded"; requestId: number; subscription: Subscription }
  | { type: "skip/failed"; requestId: number; error: unknown }
  | { type: "refresh/started"; requestId: number }
  | { type: "refresh/succeeded"; requestId: number; subscription: Subscription }
  | { type: "refresh/failed"; requestId: number; error: unknown };

/** Loading from the first render, so the skeleton shows before the load effect runs (R1). */
export const initialState: State = {
  requestId: 0,
  load: { kind: "loading" },
  skip: { kind: "closed" },
  stale: null,
  announcement: "",
  focus: null,
};

/** R2: only a 404 means there is nothing to retry. Anything else, including non-API errors, can be retried. */
export function loadErrorKind(error: unknown): "failed" | "not-found" {
  return error instanceof ApiError && error.status === 404 ? "not-found" : "failed";
}

const closed: Skip = { kind: "closed" };

/** 002 R7: compared by the calendar day the customer saw, so a change in the time alone isn't a move. */
function noticeFor(cause: Cause, attempted: string, fresh: Subscription): Notice {
  const moved = fresh.nextChargeAt === null || formatDate(attempted) !== formatDate(fresh.nextChargeAt);
  return { cause, movedFrom: moved ? attempted : null };
}

export function subscriptionReducer(state: State, action: Action): State {
  // Every accepted action sets `focus` again (plan.md), so start from "leave it".
  const next = { ...state, focus: null };

  switch (action.type) {
    case "load/started":
      return {
        ...next,
        requestId: action.requestId,
        load: { kind: "loading" },
        skip: closed,
        stale: null,
        announcement: "",
      };
    case "load/succeeded":
      if (action.requestId !== state.requestId) return state;
      return { ...next, load: { kind: "ready", server: action.subscription } };
    case "load/failed":
      if (action.requestId !== state.requestId) return state;
      return { ...next, load: { kind: loadErrorKind(action.error) } };

    case "skip/opened":
      if (state.skip.kind !== "closed" || state.load.kind !== "ready" || !canSkip(state.load.server)) return state;
      // R9: data we know may be stale is never shown as something to confirm.
      return state.stale
        ? { ...next, skip: { kind: "stale", failedSkips: 0 }, announcement: "", focus: "check-again" }
        : { ...next, skip: { kind: "confirm", failedSkips: 0, notice: null }, announcement: "", focus: "keep" };

    case "skip/closed":
      // R5: no backing out while a skip or its reload is pending. The native `close` after our own close() lands here too.
      if (state.skip.kind === "closed" || state.skip.kind === "skipping" || state.skip.kind === "checking")
        return state;
      return { ...next, skip: closed, focus: "skip-button" };

    case "skip/started":
      if (state.skip.kind !== "confirm" || state.load.kind !== "ready" || state.load.server.nextChargeAt === null) {
        return state;
      }
      return {
        ...next,
        requestId: action.requestId,
        skip: { kind: "skipping", failedSkips: state.skip.failedSkips, attempted: state.load.server.nextChargeAt },
      };

    case "skip/succeeded": {
      if (action.requestId !== state.requestId || state.skip.kind !== "skipping") return state;
      // R6: the announced date is always the server's, never the prediction.
      const { nextChargeAt } = action.subscription;
      return {
        ...next,
        load: { kind: "ready", server: action.subscription },
        skip: closed,
        stale: null,
        announcement: nextChargeAt ? `Skipped. Your next order is ${formatDate(nextChargeAt)}.` : "Skipped.",
        focus: canSkip(action.subscription) ? "skip-button" : "heading",
      };
    }

    case "skip/failed":
      if (action.requestId !== state.requestId || state.skip.kind !== "skipping") return state;
      // R7, R8: no retry. SubscriptionCard starts the reload, and only failed skips count.
      return {
        ...next,
        skip: {
          kind: "checking",
          failedSkips: state.skip.failedSkips + 1,
          attempted: state.skip.attempted,
          cause: skipErrorCause(action.error),
        },
      };

    case "refresh/started":
      if (state.skip.kind === "checking") return { ...next, requestId: action.requestId };
      if (state.skip.kind === "stale") {
        return {
          ...next,
          requestId: action.requestId,
          skip: { kind: "rechecking", failedSkips: state.skip.failedSkips },
        };
      }
      return state;

    case "refresh/succeeded": {
      if (action.requestId !== state.requestId) return state;
      const fresh = action.subscription;
      const updated = { ...next, load: { kind: "ready", server: fresh } as const, stale: null };
      const { skip } = state;
      // From `closed` (the customer closed during "Check again"), only the data changes. R10: if the skip button
      // goes with it while focused, focus would be lost.
      if (skip.kind !== "checking" && skip.kind !== "rechecking" && skip.kind !== "stale") {
        return canSkip(fresh) ? updated : { ...updated, focus: "heading-if-lost" };
      }
      // R10: nothing left to skip, and the skip button is gone with it.
      if (!canSkip(fresh)) return { ...updated, skip: closed, focus: "heading" };
      // R7, R9: after "Check again", the cause and date come from the failure that made the data stale.
      const failure = skip.kind === "checking" ? skip : state.stale;
      const notice = failure ? noticeFor(failure.cause, failure.attempted, fresh) : null;
      return { ...updated, skip: { kind: "confirm", failedSkips: skip.failedSkips, notice }, focus: "keep" };
    }

    case "refresh/failed": {
      if (action.requestId !== state.requestId) return state;
      const { skip } = state;
      // R10: the subscription is gone, so the dialog has nothing left to talk about.
      if (loadErrorKind(action.error) === "not-found") {
        const focus = skip.kind === "closed" ? "heading-if-lost" : "heading";
        return { ...next, load: { kind: "not-found" }, skip: closed, stale: null, focus };
      }
      // R9: "Check again" takes the confirm button's place, so focus goes to it.
      if (skip.kind === "checking") {
        return {
          ...next,
          skip: { kind: "stale", failedSkips: skip.failedSkips },
          stale: { attempted: skip.attempted, cause: skip.cause },
          focus: "check-again",
        };
      }
      if (skip.kind === "rechecking" || skip.kind === "stale") {
        return { ...next, skip: { kind: "stale", failedSkips: skip.failedSkips }, focus: "check-again" };
      }
      // Closed during "Check again": `stale` is already set, so reopening shows R9 again.
      return state;
    }
  }
}

/** Which view a loaded subscription gets. 004 adds the local cancel here, and a server status that isn't active wins (R7). */
export function viewOf(server: Subscription): SubscriptionStatus {
  return server.status;
}
