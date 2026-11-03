// Display formatting only (001 R4, R9): these never compute a date or an amount, they just render the server's.
import { CURRENCY, LOCALE } from "./constants";

const monthDay = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric" });
const monthDayYear = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric" });
const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });

/**
 * "Nov 8", or "Jan 15, 2027" when the year differs from `now`'s.
 * Both the year check and the output use the browser's time zone, so they always agree on the calendar day.
 */
export function formatDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return (date.getFullYear() === now.getFullYear() ? monthDay : monthDayYear).format(date);
}

/** 10187 → "$101.87". */
export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

/** 30 → "Every 30 days". Frequencies are 30, 60 or 90 (003 R1), so there is no singular case. */
export function formatFrequency(days: number): string {
  return `Every ${days} days`;
}
