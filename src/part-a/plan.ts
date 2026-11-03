// 003: the rules behind "Change your plan". Pending changes are compared with the server's data on every render,
// so nothing derived from the server (the date, the "(current)" marks, the total) is ever stored.
import { totalAfterDiscount } from "../api/fixtures";
import type { Subscription, SubscriptionItem } from "../api/types";
import { formatDate } from "./format";

/** R1: the frequencies the customer can pick, in days. */
export const FREQUENCIES = [30, 60, 90] as const;

/** R2: the quantities the customer can pick. The options set the limits, so there is nothing to clamp. */
export const QUANTITIES: readonly number[] = Array.from({ length: 10 }, (_, index) => index + 1);

/** `choices` plus the server's own value, in numeric order, so the server's value always has a control. */
function withServers(choices: readonly number[], servers: number): number[] {
  return choices.includes(servers) ? [...choices] : [...choices, servers].sort((a, b) => a - b);
}

/** R1: 30, 60 and 90, plus an interval the server sends outside them ("Every 45 days (current)"). */
export function frequencyOptions(server: Subscription): number[] {
  return withServers(FREQUENCIES, server.intervalDays);
}

/** R2: 1 to 10, plus a quantity the server sends outside them, so the select never shows one it didn't send. */
export function quantityOptions(item: SubscriptionItem): number[] {
  return withServers(QUANTITIES, item.quantity);
}

/** R7: what the customer picked. Never merged into `server`. */
export interface Local {
  /** R1: the frequency picked, or null when it is the server's. */
  intervalDays: number | null;
  /** R2: quantity by SKU, only for items whose picked quantity differs from the server's. */
  quantities: Record<string, number>;
}

/** `item.quantity` is the server's, `quantity` the customer's pick. */
export interface PendingQuantity {
  item: SubscriptionItem;
  quantity: number;
}

export interface Pending {
  intervalDays: number | null;
  /** In the server's item order. */
  quantities: PendingQuantity[];
}

/** R5, R7: only values that differ from this server data, and only SKUs it still has. */
export function pendingOf(server: Subscription, local: Local): Pending {
  return {
    intervalDays: local.intervalDays === server.intervalDays ? null : local.intervalDays,
    quantities: server.items.flatMap((item) => {
      const quantity = local.quantities[item.sku];
      return quantity === undefined || quantity === item.quantity ? [] : [{ item, quantity }];
    }),
  };
}

export function hasPending(pending: Pending): boolean {
  return pending.intervalDays !== null || pending.quantities.length > 0;
}

/** R4: the server's own formula (001 R4) with pending quantities applied. Null when no quantity is pending. */
export function totalAfter(server: Subscription, pending: Pending): number | null {
  if (pending.quantities.length === 0) return null;
  const picked = new Map(pending.quantities.map(({ item, quantity }) => [item.sku, quantity]));
  const items = server.items.map((item) => ({ ...item, quantity: picked.get(item.sku) ?? item.quantity }));
  return totalAfterDiscount(items, server.discountPercent);
}

/** R3: "starting after your Dec 16 order", or "starting after your next order" without a date (001 R3). */
export function startingAfter(nextChargeAt: string | null): string {
  return `starting after your ${nextChargeAt === null ? "next" : formatDate(nextChargeAt)} order`;
}
