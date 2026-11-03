// 002: the rules behind "Skip next order". The reducer and the views share them, so they live in one place.
import { ApiError, type Subscription } from "../api/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** R7: a 409 means the subscription changed elsewhere. Everything else gets the same generic message. */
export type Cause = "conflict" | "failed";

/** R1, R10: there is an order to skip. 004 adds the local cancel as a second argument. */
export function canSkip(server: Subscription): boolean {
  return server.status === "active" && server.nextChargeAt !== null;
}

/**
 * R2: the next order after a skip, as the server computes it: `intervalDays` × 24 hours, in milliseconds.
 * This is the one date the page computes itself (001 R4), and it is only ever shown as a prediction.
 */
export function predictNextChargeAt(nextChargeAt: string, intervalDays: number): string {
  return new Date(Date.parse(nextChargeAt) + intervalDays * DAY_MS).toISOString();
}

/** R7: which message a failed skip gets. Non-API errors (a dropped connection) are "failed" too. */
export function skipErrorCause(error: unknown): Cause {
  return error instanceof ApiError && error.status === 409 ? "conflict" : "failed";
}
