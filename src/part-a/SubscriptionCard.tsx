// Part A: "Manage my subscription" (001–004). This container owns the state, the API calls and focus; views.tsx,
// SkipDialog.tsx, PlanChanges.tsx and CancelDialog.tsx render it.
import { type Ref, type RefObject, useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import type { Subscription } from "../api/types";
import type { Offer, Reason } from "./cancel";
import { CancelDialog } from "./CancelDialog";
import type { PlanChangesProps } from "./PlanChanges";
import { hasPending, pendingOf } from "./plan";
import { SkipDialog } from "./SkipDialog";
import styles from "./SubscriptionCard.module.css";
import { type Focus, initialState, subscriptionReducer, viewOf } from "./subscriptionReducer";
import { ActiveView, CancelledView, LoadError, LoadingCard, NotFound, PausedView } from "./views";

interface StatusViewProps {
  subscription: Subscription;
  /** 004 R7: the local cancel. */
  cancelled: boolean;
  onSkip: () => void;
  skipButtonRef: Ref<HTMLButtonElement>;
  plan: Omit<PlanChangesProps, "subscription">;
  onCancel: () => void;
  cancelButtonRef: Ref<HTMLButtonElement>;
  /** 004 R8: undoes the local cancel. */
  onUndo: () => void;
}

/** R7: the view follows the server's status, through `viewOf`. 003 R7: plan changes are shown only when active. */
function StatusView({
  subscription,
  cancelled,
  onSkip,
  skipButtonRef,
  plan,
  onCancel,
  cancelButtonRef,
  onUndo,
}: StatusViewProps) {
  switch (viewOf(subscription, cancelled)) {
    case "active":
      return (
        <ActiveView
          subscription={subscription}
          onSkip={onSkip}
          skipButtonRef={skipButtonRef}
          plan={plan}
          onCancel={onCancel}
          cancelButtonRef={cancelButtonRef}
        />
      );
    case "paused":
      return <PausedView subscription={subscription} />;
    case "cancelled":
      // 004 R8: Undo only for the local cancel. A server that is already cancelled has nothing to undo.
      return (
        <CancelledView subscription={subscription} onUndo={subscription.status === "active" ? onUndo : undefined} />
      );
  }
}

export function SubscriptionCard() {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const lastRequestId = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const skipDialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const checkAgainRef = useRef<HTMLButtonElement>(null);
  const planHeadingRef = useRef<HTMLHeadingElement>(null);
  const cancelDialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const cancelReasonRef = useRef<HTMLButtonElement>(null);
  const cancelHeadingRef = useRef<HTMLHeadingElement>(null);

  // R1, R2: every load gets a fresh id, and the reducer drops any response that isn't the latest one. That covers
  // the StrictMode double effect, where the mock's random latency can resolve request 2 before request 1.
  const load = useCallback(() => {
    const requestId = ++lastRequestId.current;
    dispatch({ type: "load/started", requestId });
    getSubscription().then(
      (subscription) => dispatch({ type: "load/succeeded", requestId, subscription }),
      (error: unknown) => dispatch({ type: "load/failed", requestId, error }),
    );
  }, []);

  useEffect(load, [load]);

  // The skeleton replaces the error view, so the button unmounts. Focus moves to the h1 rather than to <body>.
  const retry = () => {
    headingRef.current?.focus();
    load();
  };

  // 002, 004: the open dialogs follow the reducer. A layout effect, so a dialog closes in the same frame its content
  // unmounts, and always before the focus effect below: close() first, so Chrome's own focus restore can't win.
  // 004 R5 swaps the cancel dialog for the skip dialog in one render, so every close runs before any showModal(),
  // and a modal is never left open behind the other.
  const skipOpen = state.skip.kind !== "closed";
  const cancelOpen = state.cancel.kind !== "closed";
  useLayoutEffect(() => {
    const dialogs = [
      [skipDialogRef.current, skipOpen],
      [cancelDialogRef.current, cancelOpen],
    ] as const;
    for (const [dialog, open] of dialogs) if (dialog?.open && !open) dialog.close();
    for (const [dialog, open] of dialogs) if (dialog && open && !dialog.open) dialog.showModal();
  }, [skipOpen, cancelOpen]);

  // 002–004: the reducer decides where focus goes (002 R4, R6, R7, R9, R10, 003 R5, 004 R10). This only applies it.
  // Keyed on the whole state, not `state.focus`: two transitions in a row can ask for the same target (004: cancel,
  // then Undo, both focus the h1), and the second must still move focus. Every accepted action starts from
  // `focus: null` and an ignored one returns the same object, so this runs once per transition that asks for focus.
  useEffect(() => {
    const targets: Record<Focus, RefObject<HTMLElement | null>> = {
      keep: keepRef,
      "check-again": checkAgainRef,
      "skip-button": skipButtonRef,
      heading: headingRef,
      "heading-if-lost": headingRef,
      "plan-heading": planHeadingRef,
      "cancel-button": cancelButtonRef,
      "cancel-reason": cancelReasonRef,
      "cancel-heading": cancelHeadingRef,
    };
    if (!state.focus) return;
    // R10: a removed focused element leaves focus on <body>. Focus anywhere else was the customer's choice.
    if (state.focus === "heading-if-lost" && document.activeElement !== document.body) return;
    targets[state.focus].current?.focus();
  }, [state]);

  // 003 R9: the changes only live here, so leaving while they are shown asks first. Derived from the state, so
  // Discard, setting every value back, a fresh server value or a view that isn't active ends it by itself.
  const warnOnLeave =
    state.load.kind === "ready" &&
    viewOf(state.load.server, state.cancelled) === "active" &&
    hasPending(pendingOf(state.load.server, state.local));
  useEffect(() => {
    if (!warnOnLeave) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only prompt when `returnValue` is set.
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [warnOnLeave]);

  // R7, R9: reloads behind the open dialog. Its own actions, because `load/started` would swap the page for the
  // skeleton and unmount the view behind the dialog.
  const refresh = useCallback(() => {
    const requestId = ++lastRequestId.current;
    dispatch({ type: "refresh/started", requestId });
    getSubscription().then(
      (subscription) => dispatch({ type: "refresh/succeeded", requestId, subscription }),
      (error: unknown) => dispatch({ type: "refresh/failed", requestId, error }),
    );
  }, []);

  const openSkip = () => dispatch({ type: "skip/opened" });
  const closeSkip = () => dispatch({ type: "skip/closed" });

  // R5: the reducer ignores a second `skip/started`, and this ref also stops a second request when two clicks
  // arrive before a re-render.
  const skipInFlight = useRef(false);
  const confirmSkip = () => {
    if (skipInFlight.current || state.skip.kind !== "confirm" || state.load.kind !== "ready") return;
    const { id, updatedAt } = state.load.server;
    skipInFlight.current = true;
    const requestId = ++lastRequestId.current;
    dispatch({ type: "skip/started", requestId });
    skipNextShipment({ subscriptionId: id, expectedUpdatedAt: updatedAt })
      .then(
        (subscription) => dispatch({ type: "skip/succeeded", requestId, subscription }),
        (error: unknown) => {
          dispatch({ type: "skip/failed", requestId, error });
          // R7: never retry a skip. Reload instead, unless a newer request has taken over.
          if (requestId === lastRequestId.current) refresh();
        },
      )
      .finally(() => {
        skipInFlight.current = false;
      });
  };

  // R9: reloads only. A skip is never sent from the stale state.
  const checkAgain = () => {
    if (state.skip.kind === "stale") refresh();
  };

  // 004: no request is sent for a cancel either (Known limitations), so these only dispatch.
  const openCancel = () => dispatch({ type: "cancel/opened" });
  const chooseReason = (reason: Reason) => dispatch({ type: "cancel/reasonChosen", reason });
  const closeCancel = () => dispatch({ type: "cancel/closed" });
  const takeOffer = (offer: Offer) => dispatch({ type: "cancel/offerTaken", offer });
  const confirmCancel = () => dispatch({ type: "cancel/confirmed" });
  const backToReasons = () => dispatch({ type: "cancel/back" });
  const undoCancel = () => dispatch({ type: "cancel/undone" });

  // 003: no request is sent for a plan change (Known limitations), so these only dispatch.
  const plan = {
    local: state.local,
    headingRef: planHeadingRef,
    onFrequency: (days: number) => dispatch({ type: "plan/frequency", days }),
    onQuantity: (sku: string, quantity: number) => dispatch({ type: "plan/quantity", sku, quantity }),
    onDiscard: () => dispatch({ type: "plan/discarded" }),
  };

  return (
    <main className={styles.card}>
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        Manage my subscription
      </h1>
      {/* 001 R1, 002 R6: one status region, always mounted, so each new text is announced. */}
      <p role="status" className={styles["visually-hidden"]}>
        {state.load.kind === "loading" ? "Loading your subscription" : state.announcement}
      </p>
      {state.load.kind === "loading" && <LoadingCard />}
      {state.load.kind === "failed" && <LoadError onRetry={retry} />}
      {state.load.kind === "not-found" && <NotFound />}
      {state.load.kind === "ready" && (
        <>
          <StatusView
            subscription={state.load.server}
            cancelled={state.cancelled}
            onSkip={openSkip}
            skipButtonRef={skipButtonRef}
            plan={plan}
            onCancel={openCancel}
            cancelButtonRef={cancelButtonRef}
            onUndo={undoCancel}
          />
          {/* Outside the view, so it stays mounted when R10 swaps the view behind it. */}
          <SkipDialog
            subscription={state.load.server}
            skip={state.skip}
            pendingIntervalDays={pendingOf(state.load.server, state.local).intervalDays}
            dialogRef={skipDialogRef}
            keepRef={keepRef}
            checkAgainRef={checkAgainRef}
            onConfirm={confirmSkip}
            onCheckAgain={checkAgain}
            onClose={closeSkip}
          />
          {/* After SkipDialog, and outside the view too, so the local cancel (R7) can swap the view behind it. */}
          <CancelDialog
            subscription={state.load.server}
            local={state.local}
            cancel={state.cancel}
            dialogRef={cancelDialogRef}
            reasonRef={cancelReasonRef}
            headingRef={cancelHeadingRef}
            onReason={chooseReason}
            onOffer={takeOffer}
            onConfirm={confirmCancel}
            onBack={backToReasons}
            onClose={closeCancel}
          />
        </>
      )}
    </main>
  );
}
