// 004: the rules behind the cancel flow. The offers are rebuilt from the server's data and the pending 003 changes
// on every render, so no date, amount or label is ever stored.
import { totalAfterDiscount } from "../api/fixtures";
import type { Subscription, SubscriptionItem } from "../api/types";
import { formatDate, formatMoney } from "./format";
import { FREQUENCIES, type Local, pendingItems, pendingOf, quantityOptions } from "./plan";
import { canSkip } from "./skip";

export type Reason = "too-much" | "costs" | "different" | "no-results" | "other";

/** R2: in the spec's order, which is the order of their share. */
export const REASONS: readonly { id: Reason; label: string }[] = [
  { id: "too-much", label: "I have too much product left" },
  { id: "costs", label: "It costs too much" },
  { id: "different", label: "I'm trying a different product" },
  { id: "no-results", label: "I didn't see results" },
  { id: "other", label: "Other" },
];

/** R3: what an offer button does, and its text. Taking one hands over to 002's skip or a 003 change (R5, R6). */
export type Offer =
  | { kind: "skip"; label: string }
  | { kind: "frequency"; days: number; label: string }
  | { kind: "quantity"; sku: string; quantity: number; label: string };

/** R4: the first of 30/60/90 that is slower than `days`, or null at 90 or above. */
export function slowerFrequency(days: number): number | null {
  return FREQUENCIES.find((option) => option > days) ?? null;
}

/** R3: "Skip my Dec 16 order" plus `suffix`. Without a next order there is nothing to skip (002 R1). */
function skipOffer(server: Subscription, suffix: string): Offer[] {
  if (!canSkip(server) || server.nextChargeAt === null) return [];
  return [{ kind: "skip", label: `Skip my ${formatDate(server.nextChargeAt)} order${suffix}` }];
}

/** R3: more than this many quantity offers would make the 375px dialog long. */
const MAX_QUANTITY_OFFERS = 2;

/**
 * R3: one unit less of an item above 1, for the items with the largest savings. The saving is the difference
 * between the two totals, never a discounted unit price, whose rounding can differ from the real change (001 R4).
 */
function quantityOffers(server: Subscription, current: SubscriptionItem[]): Offer[] {
  const total = totalAfterDiscount(current, server.discountPercent);
  const candidates = server.items.flatMap((item, index) => {
    const { quantity } = current[index];
    const lower = quantity - 1;
    // `plan/quantity` would ignore a quantity that isn't a choice, such as 11 when the server sends 12.
    if (lower < 1 || !quantityOptions(item).includes(lower)) return [];
    const lowered = current.map((candidate) =>
      candidate.sku === item.sku ? { ...candidate, quantity: lower } : candidate,
    );
    const saving = total - totalAfterDiscount(lowered, server.discountPercent);
    const label = `Get ${lower} ${item.name} instead of ${quantity}: save ${formatMoney(saving)} per order`;
    return [{ saving, offer: { kind: "quantity", sku: item.sku, quantity: lower, label } as const }];
  });
  // The sort is stable, so a tie keeps the server's order.
  return candidates
    .sort((a, b) => b.saving - a.saving)
    .slice(0, MAX_QUANTITY_OFFERS)
    .map(({ offer }) => offer);
}

/** R3, R4: the offers for a reason, in display order. "Current" is the server's data with pending 003 changes. */
export function offersFor(reason: Reason, server: Subscription, local: Local): Offer[] {
  const pending = pendingOf(server, local);
  const current = pendingItems(server, pending);
  const interval = pending.intervalDays ?? server.intervalDays;
  const slower = slowerFrequency(interval);
  const frequency = (label: string): Offer[] => (slower === null ? [] : [{ kind: "frequency", days: slower, label }]);

  switch (reason) {
    case "too-much":
      return [...skipOffer(server, ""), ...frequency(`Ship every ${slower} days`)];
    case "costs": {
      const total = formatMoney(totalAfterDiscount(current, server.discountPercent));
      return [
        ...frequency(`Ship every ${slower} days: ${total} every ${slower} days instead of every ${interval}`),
        ...quantityOffers(server, current),
      ];
    }
    case "different":
      return skipOffer(server, " while you try it");
    case "no-results":
    case "other":
      return [];
  }
}
