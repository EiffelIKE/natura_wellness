import { act } from "@testing-library/react";

/** A promise the test settles by hand, so it controls when (and in which order) responses arrive. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Settles a deferred inside act and lets the component's .then handlers dispatch before asserting. */
export const settle = (fn: () => void) =>
  act(async () => {
    fn();
    await Promise.resolve();
  });
