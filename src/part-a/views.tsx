// Presentational views, one per state of the card. SubscriptionCard picks which one renders (plan.md).
import type { Ref } from "react";
import type { Subscription, SubscriptionItem, SubscriptionStatus } from "../api/types";
import { SUPPORT_MAILTO } from "./constants";
import { formatDate, formatFrequency, formatMoney } from "./format";
import { ItemList } from "./ItemList";
import { PlanChanges, type PlanChangesProps } from "./PlanChanges";
import { canSkip } from "./skip";
import styles from "./SubscriptionCard.module.css";

const bar = (modifier: string) => `${styles.skeleton} ${styles[`skeleton--${modifier}`]}`;

/**
 * R1: the shape of the active card, hidden from assistive tech.
 * "Loading your subscription" is announced by the status region on the card root, which outlives this view.
 */
export function LoadingCard() {
  return (
    <div className={styles.panel} aria-hidden="true">
      <div className={bar("badge")} />
      <div className={bar("heading")} />
      <div className={bar("date")} />
      <div className={bar("line")} />
      <div className={bar("heading")} />
      {[0, 1].map((row) => (
        <div key={row} className={styles["skeleton-row"]}>
          <div className={bar("thumb")} />
          <div className={styles["skeleton-row__text"]}>
            <div className={bar("line")} />
            <div className={bar("short")} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** R2: a 500 or anything unknown. Loading is read-only, so retrying is always safe. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.panel}>
      <p role="alert" className={styles.message}>
        We couldn't load your subscription.
      </p>
      <button type="button" className={styles.button} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/** R2, R11: a 404. Loading again would only find nothing again, so there is no retry. */
export function NotFound() {
  return (
    <div className={styles.panel}>
      <p role="alert" className={styles.message}>
        We couldn't find a subscription on your account.
      </p>
      <p>
        <a className={styles.link} href={SUPPORT_MAILTO}>
          Contact support
        </a>
      </p>
    </div>
  );
}

const statusLabel: Record<SubscriptionStatus, string> = { active: "Active", paused: "Paused", cancelled: "Cancelled" };

/** R5, R6: the status is always spelled out, so paused and cancelled never rely on color alone. */
function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <p className={`${styles.badge} ${styles[`badge--${status}`]}`}>
      <span className={styles["visually-hidden"]}>Status: </span>
      {statusLabel[status]}
    </p>
  );
}

/** R4, R9: a server date, formatted for display only. */
function ServerDate({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDate(iso)}</time>;
}

function Products({ items }: { items: SubscriptionItem[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>In your subscription</h2>
      <ItemList items={items} />
    </section>
  );
}

interface ActiveViewProps {
  subscription: Subscription;
  /** 002 R1: opens the skip dialog. */
  onSkip: () => void;
  /** 002 R6: focus comes back here when the dialog closes. */
  skipButtonRef: Ref<HTMLButtonElement>;
  /** 003: passed through to "Change your plan". */
  plan: Omit<PlanChangesProps, "subscription">;
  /** 004 R1: opens the cancel dialog. */
  onCancel: () => void;
  /** 004 R10: focus comes back here when the cancel dialog closes. */
  cancelButtonRef: Ref<HTMLButtonElement>;
}

/** R3, R4: in the order the spec lists, and every date and amount is the server's. */
export function ActiveView({ subscription, onSkip, skipButtonRef, plan, onCancel, cancelButtonRef }: ActiveViewProps) {
  const { nextChargeAt, nextChargeTotalCents, discountPercent, intervalDays, items } = subscription;
  return (
    <div className={styles.panel}>
      <StatusBadge status="active" />
      <section className={styles.section}>
        <h2 className={styles.heading}>Next order</h2>
        {/* R3: the page never fills a missing date or total itself (R4). */}
        {nextChargeAt !== null ? (
          <p className={styles.date}>
            <ServerDate iso={nextChargeAt} />
          </p>
        ) : (
          <p className={styles.lead}>We'll confirm your next order date soon.</p>
        )}
        {nextChargeTotalCents !== null && (
          <>
            <p className={styles.amount}>{formatMoney(nextChargeTotalCents)}</p>
            {discountPercent > 0 && (
              <p className={styles.muted}>Includes your {discountPercent}% subscription discount</p>
            )}
          </>
        )}
        <p>{formatFrequency(intervalDays)}</p>
        {/* 002 R1: the action belongs to the order it skips, so it ends this section. */}
        {canSkip(subscription) && (
          <button
            ref={skipButtonRef}
            type="button"
            className={`${styles.button} ${styles["button--secondary"]} ${styles["section__action"]}`}
            onClick={onSkip}
          >
            Skip next order
          </button>
        )}
      </section>
      <Products items={items} />
      {/* 003 R8: after the products, so the sections above stay read-only server data. */}
      <PlanChanges subscription={subscription} {...plan} />
      {/* 004 R1: a plain button the size of "Skip next order", last so the sections above come first. */}
      <div className={styles.section}>
        <button
          ref={cancelButtonRef}
          type="button"
          className={`${styles.button} ${styles["button--secondary"]}`}
          onClick={onCancel}
        >
          Cancel subscription
        </button>
      </div>
    </div>
  );
}

/** R5, R11: no skip or plan changes. Resuming is out of scope, so support is the way back. */
export function PausedView({ subscription }: { subscription: Subscription }) {
  const { pausedUntil, items } = subscription;
  return (
    <div className={`${styles.panel} ${styles["panel--muted"]}`}>
      <StatusBadge status="paused" />
      {pausedUntil !== null && (
        <p className={styles.lead}>
          Paused until <ServerDate iso={pausedUntil} />
        </p>
      )}
      <p>
        Want to resume sooner?{" "}
        <a className={styles.link} href={SUPPORT_MAILTO}>
          Contact support
        </a>
      </p>
      <Products items={items} />
    </div>
  );
}

/** R6: no skip or plan changes. */
export function CancelledView({ subscription }: { subscription: Subscription }) {
  const { cancelledAt, items } = subscription;
  return (
    <div className={`${styles.panel} ${styles["panel--muted"]}`}>
      <StatusBadge status="cancelled" />
      {cancelledAt !== null && (
        <p className={styles.lead}>
          Cancelled on <ServerDate iso={cancelledAt} />
        </p>
      )}
      <Products items={items} />
    </div>
  );
}
