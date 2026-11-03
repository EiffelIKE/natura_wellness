// 003: "Change your plan". It only renders: the reducer holds the picks and SubscriptionCard dispatches (plan.md).
import { type Ref, useId } from "react";
import type { Subscription } from "../api/types";
import { formatFrequency, formatMoney } from "./format";
import {
  frequencyOptions,
  hasPending,
  type Local,
  type Pending,
  pendingOf,
  quantityOptions,
  startingAfter,
  totalAfter,
} from "./plan";
import styles from "./SubscriptionCard.module.css";

export interface PlanChangesProps {
  subscription: Subscription;
  local: Local;
  /** R5: focus lands here after "Discard changes" removes itself. */
  headingRef: Ref<HTMLHeadingElement>;
  onFrequency: (days: number) => void;
  onQuantity: (sku: string, quantity: number) => void;
  onDiscard: () => void;
}

/** R1, R2: the server's value is marked in its label. */
const current = (isServers: boolean) => (isServers ? " (current)" : "");

/** R3, R4, R5: what will change after the next order. Rendered only while something is pending. */
function PendingChanges({
  subscription,
  pending,
  onDiscard,
}: { pending: Pending } & Pick<PlanChangesProps, "subscription" | "onDiscard">) {
  // R3: derived from the server's date on every render, never stored, so it follows a skip by itself.
  const intro = startingAfter(subscription.nextChargeAt);
  const total = totalAfter(subscription, pending);
  return (
    <div className={styles.pending}>
      <p>{`${intro.charAt(0).toUpperCase()}${intro.slice(1)}:`}</p>
      <ul className={styles.pending__list}>
        {pending.intervalDays !== null && <li>{formatFrequency(pending.intervalDays)}</li>}
        {pending.quantities.map(({ item, quantity }) => (
          <li key={item.sku}>
            {/* Read as "2 to 1", not "2 right arrow 1". */}
            {item.quantity} <span aria-hidden="true">→</span>
            <span className={styles["visually-hidden"]}>to</span> {quantity} {item.name}
          </li>
        ))}
      </ul>
      {total !== null && <p className={styles.pending__total}>After that: {formatMoney(total)} per order</p>}
      <button
        type="button"
        className={`${styles.button} ${styles["button--secondary"]} ${styles["section__action"]}`}
        onClick={onDiscard}
      >
        Discard changes
      </button>
    </div>
  );
}

/** R8: native controls only. There is no `<form>`, so a change applies on `change` and Enter can't submit. */
export function PlanChanges({ subscription, local, headingRef, onFrequency, onQuantity, onDiscard }: PlanChangesProps) {
  const id = useId();
  const pending = pendingOf(subscription, local);
  const intervalDays = pending.intervalDays ?? subscription.intervalDays;
  const picked = new Map(pending.quantities.map(({ item, quantity }) => [item.sku, quantity]));

  return (
    <section className={styles.section}>
      <h2 ref={headingRef} tabIndex={-1} className={styles.heading}>
        Change your plan
      </h2>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>How often</legend>
        {frequencyOptions(subscription).map((days) => (
          <label key={days} className={styles.choice}>
            <input
              type="radio"
              name={`${id}-frequency`}
              value={days}
              checked={days === intervalDays}
              onChange={() => onFrequency(days)}
            />
            {formatFrequency(days)}
            {current(days === subscription.intervalDays)}
          </label>
        ))}
      </fieldset>
      {subscription.items.map((item) => (
        <div key={item.sku} className={styles.field}>
          <label htmlFor={`${id}-${item.sku}`} className={styles.field__label}>
            {item.name} quantity
          </label>
          <select
            id={`${id}-${item.sku}`}
            className={styles.select}
            value={picked.get(item.sku) ?? item.quantity}
            onChange={(event) => onQuantity(item.sku, Number(event.target.value))}
          >
            {quantityOptions(item).map((quantity) => (
              <option key={quantity} value={quantity}>
                {`${quantity}${current(quantity === item.quantity)}`}
              </option>
            ))}
          </select>
        </div>
      ))}
      {hasPending(pending) && <PendingChanges subscription={subscription} pending={pending} onDiscard={onDiscard} />}
    </section>
  );
}
