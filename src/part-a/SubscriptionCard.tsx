// Part A: "Manage my subscription" (001). This container owns the state and the API calls; views.tsx renders it.
import { useCallback, useEffect, useReducer, useRef } from "react";
import { getSubscription } from "../api/mockApi";
import type { Subscription } from "../api/types";
import styles from "./SubscriptionCard.module.css";
import { initialState, subscriptionReducer, viewOf } from "./subscriptionReducer";
import { ActiveView, CancelledView, LoadError, LoadingCard, NotFound, PausedView } from "./views";

/** R7: the view follows the server's status, through `viewOf`. */
function StatusView({ subscription }: { subscription: Subscription }) {
  switch (viewOf(subscription)) {
    case "active":
      return <ActiveView subscription={subscription} />;
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

  return (
    <main className={styles.card}>
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        Manage my subscription
      </h1>
      <p role="status" className={styles["visually-hidden"]}>
        {state.load.kind === "loading" ? "Loading your subscription" : ""}
      </p>
      {state.load.kind === "loading" && <LoadingCard />}
      {state.load.kind === "failed" && <LoadError onRetry={retry} />}
      {state.load.kind === "not-found" && <NotFound />}
      {state.load.kind === "ready" && <StatusView subscription={state.load.server} />}
    </main>
  );
}
