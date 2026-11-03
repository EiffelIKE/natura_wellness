// 004: the cancel flow. It only renders: SubscriptionCard owns the state and focus (plan.md).
import { type Ref, useId } from "react";
import type { Subscription } from "../api/types";
import { type Offer, offersFor, type Reason, REASONS } from "./cancel";
import type { Local } from "./plan";
import styles from "./SubscriptionCard.module.css";
import type { CancelFlow } from "./subscriptionReducer";

interface CancelDialogProps {
  /** The subscription currently shown, and the pending 003 changes. The offers are built from both (R3). */
  subscription: Subscription;
  local: Local;
  cancel: CancelFlow;
  dialogRef: Ref<HTMLDialogElement>;
  /** R2, R3: the first reason on open, or the one chosen before "Back". */
  reasonRef: Ref<HTMLButtonElement>;
  /** R3: step 2's heading, focused because a dialog doesn't announce its name again when its content changes. */
  headingRef: Ref<HTMLHeadingElement>;
  onReason: (reason: Reason) => void;
  /** R5, R6: the reducer checks the offer against `offersFor` before it hands over. */
  onOffer: (offer: Offer) => void;
  /** R7: the local cancel. */
  onConfirm: () => void;
  onBack: () => void;
  /** R10: "Keep my subscription", Esc and the native `close` event. Nothing is pending, so it always closes. */
  onClose: () => void;
}

const secondary = `${styles.button} ${styles["button--secondary"]}`;
/** R3: the offers and "Yes, cancel my subscription" share this, so they always have the same size and contrast. */
const choice = `${styles.button} ${styles["button--block"]}`;

/** R10: ends both steps, so a touch screen without Esc can always leave in one tap. */
function KeepButton({ onClose }: Pick<CancelDialogProps, "onClose">) {
  return (
    <button type="button" className={secondary} onClick={onClose}>
      Keep my subscription
    </button>
  );
}

/** R2: one button per reason, each going straight to step 2. No radios and no "Continue". */
function ReasonStep({
  titleId,
  previous,
  reasonRef,
  onReason,
  onClose,
}: { titleId: string; previous: Reason | null } & Pick<CancelDialogProps, "reasonRef" | "onReason" | "onClose">) {
  const focused = previous ?? REASONS[0].id;
  return (
    <>
      <h2 id={titleId} className={styles.dialog__title}>
        Why are you cancelling?
      </h2>
      <ul className={styles.options}>
        {REASONS.map(({ id, label }) => (
          <li key={id}>
            <button
              ref={id === focused ? reasonRef : undefined}
              type="button"
              className={styles.option}
              onClick={() => onReason(id)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.dialog__actions}>
        <KeepButton onClose={onClose} />
      </div>
    </>
  );
}

/** R3: "Other" only. Uncontrolled and never read: it is lost with the step and never sent (Known limitations). */
function OtherField() {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.field__label}>
        Tell us more (optional)
      </label>
      <textarea id={id} className={styles.textarea} rows={3} />
    </div>
  );
}

/** R3, R4: the offers for the reason, then the cancel, which is always there. */
function OfferStep({
  titleId,
  reason,
  subscription,
  local,
  headingRef,
  onOffer,
  onConfirm,
  onBack,
  onClose,
}: { titleId: string; reason: Reason } & Pick<
  CancelDialogProps,
  "subscription" | "local" | "headingRef" | "onOffer" | "onConfirm" | "onBack" | "onClose"
>) {
  // Rebuilt on every render from the server's data and the pending changes, so no label is ever stale.
  const offers = offersFor(reason, subscription, local);
  return (
    <>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.dialog__title}>
        Cancel your subscription?
      </h2>
      {offers.length > 0 && (
        <>
          <p>Instead, you can:</p>
          <ul className={styles.options}>
            {offers.map((offer) => (
              <li key={offer.label}>
                <button type="button" className={choice} onClick={() => onOffer(offer)}>
                  {offer.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {reason === "other" && <OtherField />}
      <button type="button" className={choice} onClick={onConfirm}>
        Yes, cancel my subscription
      </button>
      <div className={styles.dialog__actions}>
        <button type="button" className={secondary} onClick={onBack}>
          Back
        </button>
        <KeepButton onClose={onClose} />
      </div>
    </>
  );
}

export function CancelDialog({
  subscription,
  local,
  cancel,
  dialogRef,
  reasonRef,
  headingRef,
  onReason,
  onOffer,
  onConfirm,
  onBack,
  onClose,
}: CancelDialogProps) {
  // Each step's h2 takes this id, so the dialog's name is always the current question.
  const titleId = useId();

  return (
    // The inert page behind, Esc and ::backdrop come from showModal(), which SubscriptionCard calls.
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      // Close from `cancel`, not only from the queued `close` event, as in SkipDialog.
      onCancel={onClose}
      // `close` is queued as a task. If the dialog was opened again before it arrived, it belongs to the old close.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      {cancel.kind === "reason" && (
        <ReasonStep
          titleId={titleId}
          previous={cancel.previous}
          reasonRef={reasonRef}
          onReason={onReason}
          onClose={onClose}
        />
      )}
      {cancel.kind === "offer" && (
        <OfferStep
          titleId={titleId}
          reason={cancel.reason}
          subscription={subscription}
          local={local}
          headingRef={headingRef}
          onOffer={onOffer}
          onConfirm={onConfirm}
          onBack={onBack}
          onClose={onClose}
        />
      )}
    </dialog>
  );
}
