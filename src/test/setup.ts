import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom does not implement modal dialogs. This stub only toggles `open`;
// real dialog behavior (focus trap, Escape, ::backdrop) is covered by Playwright.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
