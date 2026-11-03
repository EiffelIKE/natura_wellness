// 002: the skip confirmation. It only renders: SubscriptionCard owns the state, the API calls and focus (plan.md).
import { type Ref, useId } from "react";
import type { Subscription } from "../api/types";
import { SUPPORT_MAILTO } from "./constants";
import { formatDate, formatFrequency, formatMoney } from "./format";
import { predictNextChargeAt } from "./skip";
import styles from "./SubscriptionCard.module.css";
import type { Notice, Skip } from "./subscriptionReducer";

interface SkipDialogProps {
  /** The subscription currently shown. The dates and the confirm label are always built from it (R4). */
  subscription: Subscription;
  skip: Skip;
  /** R3: a local frequency change waiting to start (003), or null. */
  pendingIntervalDays: number | null;
  dialogRef: Ref<HTMLDialogElement>;
  keepRef: Ref<HTMLButtonElement>;
  checkAgainRef: Ref<HTMLButtonElement>;
  onConfirm: () => void;
  onCheckAgain: () => void;
  /** "Keep my order", Esc and the native `close` event. The reducer ignores it while a request is pending (R5). */
  onClose: () => void;
}

function DateText({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDate(iso)}</time>;
}

/** R2, R3: both dates, the amount and the frequency note. The new date is a prediction, the rest is the server's. */
function Summary({
  id,
  subscription,
  pendingIntervalDays,
}: { id: string } & Pick<SkipDialogProps, "subscription" | "pendingIntervalDays">) {
  const { nextChargeAt, nextChargeTotalCents, intervalDays } = subscription;
  if (nextChargeAt === null) return null;
  return (
    <div id={id} className={styles.dialog__body}>
      <p>
        Your <DateText iso={nextChargeAt} /> order will be skipped. Your next order moves to{" "}
        <DateText iso={predictNextChargeAt(nextChargeAt, intervalDays)} />, {intervalDays} days later on your current
        schedule.
      </p>
      {nextChargeTotalCents !== null && <p>You won&rsquo;t be charged {formatMoney(nextChargeTotalCents)} for it.</p>}
      {pendingIntervalDays !== null && pendingIntervalDays !== intervalDays && (
        <p>{formatFrequency(pendingIntervalDays)} starts after that order.</p>
      )}
    </div>
  );
}

const causeMessage: Record<Notice["cause"], string> = {
  conflict:
    "Your subscription was changed somewhere else. We've loaded the latest details. Check the dates and confirm again.",
  failed: "Your order wasn't skipped. We've loaded the latest details.",
};

/** R7, R8, R9: what the alert says. Empty while a request is pending, so the next result is announced again. */
function AlertContent({ skip, nextChargeAt }: { skip: Skip; nextChargeAt: string | null }) {
  let message;
  if (skip.kind === "stale") {
    message = <p>We couldn&rsquo;t check your subscription. Try again in a moment.</p>;
  } else if (skip.kind === "confirm" && skip.notice) {
    const { cause, movedFrom } = skip.notice;
    message = (
      <>
        <p>{causeMessage[cause]}</p>
        {movedFrom !== null && nextChargeAt !== null && (
          <p>
            Your next order is now <DateText iso={nextChargeAt} /> (it was <DateText iso={movedFrom} />
            ). It may already have been skipped.
          </p>
        )}
      </>
    );
  } else {
    return null;
  }
  return (
    <>
      {message}
      {skip.failedSkips >= 2 && (
        <p>
          Still not working?{" "}
          <a className={styles.link} href={SUPPORT_MAILTO}>
            Contact us
          </a>
        </p>
      )}
    </>
  );
}

export function SkipDialog({
  subscription,
  skip,
  pendingIntervalDays,
  dialogRef,
  keepRef,
  checkAgainRef,
  onConfirm,
  onCheckAgain,
  onClose,
}: SkipDialogProps) {
  const titleId = useId();
  const summaryId = useId();
  const alertId = useId();

  // R5: while a skip or its reload is pending, there is no way out of the dialog.
  const pending = skip.kind === "skipping" || skip.kind === "checking";
  // R9: the data may be out of date, so nothing can be confirmed against it.
  const stale = skip.kind === "stale" || skip.kind === "rechecking";
  const { nextChargeAt } = subscription;

  const confirmLabel =
    skip.kind === "skipping"
      ? "Skipping…"
      : skip.kind === "checking"
        ? "Checking…"
        : `Skip ${nextChargeAt === null ? "next" : formatDate(nextChargeAt)} order`;

  return (
    // The inert page behind, Esc and ::backdrop come from showModal(), which SubscriptionCard calls.
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={stale ? alertId : summaryId}
      // R5: a prevented `cancel` keeps the dialog open. Chrome's close watchers stop honoring that on a repeated
      // Esc without user activation, so the Escape keydown is prevented as well, before a close request is made.
      onCancel={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        // Close from `cancel`, not only from the queued `close` event, which Chrome runs after any input already
        // waiting. A Space on the skip button right after Esc would otherwise reach a dialog still "open".
        onClose();
      }}
      onKeyDown={(event) => {
        if (pending && event.key === "Escape") event.preventDefault();
      }}
      // `close` is queued as a task. If the dialog was opened again before it arrived, it belongs to the old close.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      {skip.kind !== "closed" && (
        <>
          <h2 id={titleId} className={styles.dialog__title}>
            Skip your next order?
          </h2>
          <div id={alertId} role="alert" className={styles.dialog__alert}>
            <AlertContent skip={skip} nextChargeAt={nextChargeAt} />
          </div>
          {!stale && <Summary id={summaryId} subscription={subscription} pendingIntervalDays={pendingIntervalDays} />}
          <div className={styles.dialog__actions}>
            <button ref={keepRef} type="button" className={styles.button} disabled={pending} onClick={onClose}>
              Keep my order
            </button>
            {stale ? (
              <button
                ref={checkAgainRef}
                type="button"
                className={`${styles.button} ${styles["button--secondary"]}`}
                aria-disabled={skip.kind === "rechecking" || undefined}
                onClick={onCheckAgain}
              >
                {skip.kind === "rechecking" ? "Checking…" : "Check again"}
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles["button--secondary"]}`}
                aria-disabled={pending || undefined}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
