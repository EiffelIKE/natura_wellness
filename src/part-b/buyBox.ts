// 005: the buy box's pure rules. Money, totals, and parsing and correcting the quantity field.
import { copy } from "./copy";

export type PurchaseOption = "one-time" | "subscribe";

/** R8: the quantity range. */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 10;

// R9: money is formatted in en-US and USD.
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** R9: 2546 → "$25.46". */
export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

/** R7: the option's unit price, which the option rows always show, whatever the quantity. */
export function unitPriceCents(option: PurchaseOption): number {
  return option === "one-time" ? copy.oneTime.priceCents : copy.subscribe.priceCents;
}

/** R9: unit price × quantity, in whole cents, so a shopper who multiplies gets the same number. */
export function totalCents(option: PurchaseOption, quantity: number): number {
  return unitPriceCents(option) * quantity;
}

// An HTML "valid floating-point number". A number field only ever reports "" or a string in this form.
const FLOAT = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/;

/** R8: the field's text as a number, or null when it's empty or not a number. Not rounded or clamped. */
export function parseQuantity(raw: string): number | null {
  return FLOAT.test(raw) ? Number(raw) : null;
}

/** R8, R9: a whole number from 1 to 10, the only values that take effect as they're typed. */
export function isValidQuantity(n: number | null): n is number {
  return n !== null && Number.isInteger(n) && n >= MIN_QUANTITY && n <= MAX_QUANTITY;
}

/**
 * R8: what the field becomes when it loses focus or the form is submitted. A number is rounded to the nearest
 * whole number, then clamped to 1–10. Empty or non-numeric text goes back to `last`, the last valid quantity.
 */
export function correctQuantity(raw: string, last: number): number {
  const n = parseQuantity(raw);
  if (n === null) return last;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(n)));
}
