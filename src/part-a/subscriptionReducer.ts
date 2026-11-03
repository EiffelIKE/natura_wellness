// 001: the load lifecycle. 002–004 add their own layers to `State` without reshaping `load` (plan.md).
import { ApiError, type Subscription, type SubscriptionItem, type SubscriptionStatus } from "../api/types";
import { type Offer, offersFor, type Reason } from "./cancel";
import { formatDate, formatMoney } from "./format";
import {
  frequencyOptions,
  hasPending,
  type Local,
  pendingOf,
  quantityOptions,
  startingAfter,
  totalAfter,
} from "./plan";
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

/** 004 R2, R3: the cancel dialog's step. `previous` is the reason to focus after "Back". */
export type CancelFlow =
  { kind: "closed" } | { kind: "reason"; previous: Reason | null } | { kind: "offer"; reason: Reason };

/**
 * `heading-if-lost`: the h1, but only if focus fell to `<body>` (R10). The reducer can't see DOM focus.
 * `plan-heading`: "Change your plan", after "Discard changes" removes itself (003 R5).
 * `cancel-reason`: the reason chosen before "Back", or the first one (004 R2, R3).
 */
export type Focus =
  | "keep"
  | "check-again"
  | "skip-button"
  | "heading"
  | "heading-if-lost"
  | "plan-heading"
  | "cancel-button"
  | "cancel-reason"
  | "cancel-heading";

export interface State {
  /** The latest request sent. A response to any other request is stale and dropped, whatever `load` is. */
  requestId: number;
  load: Load;
  skip: Skip;
  /** 002 R9: the last reload failed, so `server` may be out of date. Survives closing the dialog. */
  stale: { attempted: string; cause: Cause } | null;
  /** 003 R7: what the customer picked. Only the `plan/*` actions change it, and it is never merged into `server`. */
  local: Local;
  /** 004: the cancel dialog's step. */
  cancel: CancelFlow;
  /** 004 R7, R8: the local cancel. Never merged into `server`, and it only turns an active server into the cancelled view (R9). */
  cancelled: boolean;
  /** Text for the page's status region (002 R6, 003 R6). Cleared by `load/started` and `skip/opened`. */
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
  | { type: "refresh/failed"; requestId: number; error: unknown }
  | { type: "plan/frequency"; days: number }
  | { type: "plan/quantity"; sku: string; quantity: number }
  | { type: "plan/discarded" }
  | { type: "cancel/opened" }
  | { type: "cancel/reasonChosen"; reason: Reason }
  | { type: "cancel/back" }
  | { type: "cancel/closed" }
  | { type: "cancel/offerTaken"; offer: Offer }
  | { type: "cancel/confirmed" }
  | { type: "cancel/undone" };

/** Loading from the first render, so the skeleton shows before the load effect runs (R1). */
export const initialState: State = {
  requestId: 0,
  load: { kind: "loading" },
  skip: { kind: "closed" },
  stale: null,
  local: { intervalDays: null, quantities: {} },
  cancel: { kind: "closed" },
  cancelled: false,
  announcement: "",
  focus: null,
};

/** R2: only a 404 means there is nothing to retry. Anything else, including non-API errors, can be retried. */
export function loadErrorKind(error: unknown): "failed" | "not-found" {
  return error instanceof ApiError && error.status === 404 ? "not-found" : "failed";
}

const closed: Skip = { kind: "closed" };
const cancelClosed: CancelFlow = { kind: "closed" };

/** 002 R7: compared by the calendar day the customer saw, so a change in the time alone isn't a move. */
function noticeFor(cause: Cause, attempted: string, fresh: Subscription): Notice {
  const moved = fresh.nextChargeAt === null || formatDate(attempted) !== formatDate(fresh.nextChargeAt);
  return { cause, movedFrom: moved ? attempted : null };
}

/** 003 R7, 004 R9: the server data, while the page shows the active view. Skips, plan changes and cancels need it. */
function activeServer(state: State): Subscription | null {
  return state.load.kind === "ready" && viewOf(state.load.server, state.cancelled) === "active"
    ? state.load.server
    : null;
}

/** 004: the offer the customer took is still one `offersFor` returns, label included (plan.md). */
function sameOffer(a: Offer, b: Offer): boolean {
  if (a.label !== b.label) return false;
  switch (a.kind) {
    case "skip":
      return b.kind === "skip";
    case "frequency":
      return b.kind === "frequency" && a.days === b.days;
    case "quantity":
      return b.kind === "quantity" && a.sku === b.sku && a.quantity === b.quantity;
  }
}

/** 004 R5, R6: an offer hands over to 002's or 003's own case, so it has their guards, texts and focus. */
function handOver(offer: Offer): Action {
  switch (offer.kind) {
    case "skip":
      return { type: "skip/opened" };
    case "frequency":
      return { type: "plan/frequency", days: offer.days };
    case "quantity":
      return { type: "plan/quantity", sku: offer.sku, quantity: offer.quantity };
  }
}

/** 003 R6: "From 2" is always the server's quantity, so the text says what changes compared to the real plan. */
function quantityAnnouncement(server: Subscription, local: Local, item: SubscriptionItem, quantity: number): string {
  if (quantity === item.quantity) return `${item.name} quantity back to ${quantity}, no change pending.`;
  const total = totalAfter(server, pendingOf(server, local));
  const after = total === null ? "" : ` After that: ${formatMoney(total)} per order.`;
  return `${item.name} quantity changed from ${item.quantity} to ${quantity}, ${startingAfter(server.nextChargeAt)}.${after}`;
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
        cancel: cancelClosed, // 004 R8: `cancelled` stays, so Undo lasts for the session.
        stale: null,
        announcement: "",
      };
    case "load/succeeded":
      if (action.requestId !== state.requestId) return state;
      return { ...next, load: { kind: "ready", server: action.subscription } };
    case "load/failed":
      if (action.requestId !== state.requestId) return state;
      return { ...next, load: { kind: loadErrorKind(action.error) } };

    case "skip/opened": {
      // 004 R9: not while locally cancelled, and never stacked on the cancel dialog.
      const server = activeServer(state);
      if (state.skip.kind !== "closed" || state.cancel.kind !== "closed" || !server || !canSkip(server)) return state;
      // R9: data we know may be stale is never shown as something to confirm.
      return state.stale
        ? { ...next, skip: { kind: "stale", failedSkips: 0 }, announcement: "", focus: "check-again" }
        : { ...next, skip: { kind: "confirm", failedSkips: 0, notice: null }, announcement: "", focus: "keep" };
    }

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

    // 003: no request is sent, so these carry no `requestId`. Focus stays on the control that changed (R8).
    case "plan/frequency": {
      const server = activeServer(state);
      // R1: the server's own value counts even outside 30/60/90, so it can be picked back (R5).
      if (!server || !frequencyOptions(server).includes(action.days)) return state;
      // R5: picking the server's value clears the change instead of storing it.
      const back = action.days === server.intervalDays;
      return {
        ...next,
        local: { ...state.local, intervalDays: back ? null : action.days },
        announcement: back
          ? `Frequency back to every ${action.days} days, no change pending.`
          : `Frequency changed to every ${action.days} days, ${startingAfter(server.nextChargeAt)}.`,
      };
    }

    case "plan/quantity": {
      const server = activeServer(state);
      const item = server?.items.find((candidate) => candidate.sku === action.sku);
      if (!server || !item || !quantityOptions(item).includes(action.quantity)) return state;
      // R5: the server's quantity removes the key, so only real changes are stored.
      const quantities = { ...state.local.quantities, [action.sku]: action.quantity };
      if (action.quantity === item.quantity) delete quantities[action.sku];
      const local = { ...state.local, quantities };
      return { ...next, local, announcement: quantityAnnouncement(server, local, item, action.quantity) };
    }

    case "plan/discarded": {
      // R5: the button only exists while something is pending, and leaves with the changes. 004 R8: never while
      // cancelled locally, so Undo brings the changes back.
      const server = activeServer(state);
      if (!server || !hasPending(pendingOf(server, state.local))) return state;
      return {
        ...next,
        local: initialState.local,
        announcement: "Changes discarded.",
        focus: "plan-heading",
      };
    }

    // 004: no request is sent for a cancel either (Known limitations).
    case "cancel/opened":
      if (!activeServer(state) || state.skip.kind !== "closed" || state.cancel.kind !== "closed") return state;
      return { ...next, cancel: { kind: "reason", previous: null }, announcement: "", focus: "cancel-reason" };

    case "cancel/reasonChosen":
      if (state.cancel.kind !== "reason") return state;
      // A dialog doesn't announce its name again when its content changes, so step 2's heading takes focus.
      return { ...next, cancel: { kind: "offer", reason: action.reason }, focus: "cancel-heading" };

    case "cancel/back":
      if (state.cancel.kind !== "offer") return state;
      return { ...next, cancel: { kind: "reason", previous: state.cancel.reason }, focus: "cancel-reason" };

    case "cancel/closed":
      // R10: nothing in the flow is pending, so it always closes. The native `close` after our own close() lands here too.
      if (state.cancel.kind === "closed") return state;
      return { ...next, cancel: cancelClosed, focus: "cancel-button" };

    case "cancel/offerTaken": {
      const server = activeServer(state);
      if (state.cancel.kind !== "offer" || !server) return state;
      // The action carries the offer, so it is checked against the current data, never trusted.
      if (!offersFor(state.cancel.reason, server, state.local).some((offer) => sameOffer(offer, action.offer))) {
        return state;
      }
      const handedOver = { ...state, cancel: cancelClosed };
      const result = subscriptionReducer(handedOver, handOver(action.offer));
      if (result === handedOver) return state;
      // R5: the skip dialog sets its own focus. R6: the pending line shows under "Change your plan".
      return action.offer.kind === "skip" ? result : { ...result, focus: "plan-heading" };
    }

    case "cancel/confirmed":
      if (state.cancel.kind !== "offer" || !activeServer(state)) return state;
      return {
        ...next,
        cancel: cancelClosed,
        cancelled: true,
        announcement: "Your subscription is cancelled. You won't be charged again.",
        focus: "heading",
      };

    case "cancel/undone":
      // R8: only a local cancel of an active server can be undone, never the cancelled fixture.
      if (!state.cancelled || state.load.kind !== "ready" || state.load.server.status !== "active") return state;
      return {
        ...next,
        cancelled: false,
        announcement: "Cancellation undone. Your subscription is active.",
        focus: "heading",
      };
  }
}

/** Which view a loaded subscription gets. 004 R9: the local cancel only turns active into cancelled (001 R7). */
export function viewOf(server: Subscription, cancelled: boolean): SubscriptionStatus {
  return server.status === "active" && cancelled ? "cancelled" : server.status;
}
