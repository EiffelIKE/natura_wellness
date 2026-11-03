// Part A: "Manage my subscription" (001, 002). This container owns the state, the API calls and focus; views.tsx
// and SkipDialog.tsx render it.
import { type Ref, useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import type { Subscription } from "../api/types";
import { SkipDialog } from "./SkipDialog";
import styles from "./SubscriptionCard.module.css";
import { initialState, subscriptionReducer, viewOf } from "./subscriptionReducer";
import { ActiveView, CancelledView, LoadError, LoadingCard, NotFound, PausedView } from "./views";

interface StatusViewProps {
  subscription: Subscription;
  onSkip: () => void;
  skipButtonRef: Ref<HTMLButtonElement>;
}

/** R7: the view follows the server's status, through `viewOf`. */
function StatusView({ subscription, onSkip, skipButtonRef }: StatusViewProps) {
  switch (viewOf(subscription)) {
    case "active":
      return <ActiveView subscription={subscription} onSkip={onSkip} skipButtonRef={skipButtonRef} />;
    case "paused":
      return <PausedView subscription={subscription} />;
    case "cancelled":
      return <CancelledView subscription={subscription} />;
  }
}

export function SubscriptionCard() {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const lastRequestId = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const checkAgainRef = useRef<HTMLButtonElement>(null);

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

  // 002: the open dialog follows the reducer. A layout effect, so the dialog closes in the same frame its content
  // unmounts, and always before the focus effect below: close() first, so Chrome's own focus restore can't win.
  const dialogOpen = state.skip.kind !== "closed";
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  // 002: the reducer decides where focus goes (R4, R6, R7, R9, R10). This only applies it.
  useEffect(() => {
    const targets = {
      keep: keepRef,
      "check-again": checkAgainRef,
      "skip-button": skipButtonRef,
      heading: headingRef,
      "heading-if-lost": headingRef,
    };
    if (!state.focus) return;
    // R10: a removed focused element leaves focus on <body>. Focus anywhere else was the customer's choice.
    if (state.focus === "heading-if-lost" && document.activeElement !== document.body) return;
    targets[state.focus].current?.focus();
  }, [state.focus]);

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
          <StatusView subscription={state.load.server} onSkip={openSkip} skipButtonRef={skipButtonRef} />
          {/* Outside the view, so it stays mounted when R10 swaps the view behind it. */}
          <SkipDialog
            subscription={state.load.server}
            skip={state.skip}
            pendingIntervalDays={null}
            dialogRef={dialogRef}
            keepRef={keepRef}
            checkAgainRef={checkAgainRef}
            onConfirm={confirmSkip}
            onCheckAgain={checkAgain}
            onClose={closeSkip}
          />
        </>
      )}
    </main>
  );
}
