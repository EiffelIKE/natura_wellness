// 002: the skip flow through SubscriptionCard, with a mocked API, and SkipDialog alone for R3.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import { ApiError, type Subscription } from "../api/types";
import { deferred, settle } from "../test/deferred";
import { SkipDialog } from "./SkipDialog";
import { SubscriptionCard } from "./SubscriptionCard";

vi.mock("../api/mockApi", () => ({ getSubscription: vi.fn(), skipNextShipment: vi.fn() }));
const getApi = vi.mocked(getSubscription);
const skipApi = vi.mocked(skipNextShipment);

// Local-time constructors keep the dates independent of the machine's time zone (as in format.test.ts).
const local = (year: number, monthIndex: number, day: number, hour = 12) => new Date(year, monthIndex, day, hour);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

const DEC_16 = iso(2026, 11, 16);
const active = (overrides: Partial<Subscription> = {}): Subscription => ({
  ...fixtures.active(),
  nextChargeAt: DEC_16,
  ...overrides,
});

const dialog = () => document.querySelector("dialog")!;
const inDialog = () => within(dialog());
const skipButton = () => screen.getByRole("button", { name: "Skip next order" });
const keep = () => inDialog().getByRole("button", { name: "Keep my order" });

/** Loads `subscription`, opens the dialog with a click, and returns the user-event instance. */
async function openDialog(subscription = active()) {
  const user = userEvent.setup();
  getApi.mockResolvedValueOnce(subscription);
  render(<SubscriptionCard />);
  await user.click(await screen.findByRole("button", { name: "Skip next order" }));
  return user;
}

/**
 * Esc as a browser handles it: keydown on the focused element, then `cancel` on the dialog, then close, unless
 * either event is prevented. jsdom does none of this itself, and the real thing is covered in e2e.
 */
function pressEscape() {
  if (!fireEvent.keyDown(document.activeElement ?? dialog(), { key: "Escape" })) return;
  if (!fireEvent(dialog(), new Event("cancel", { cancelable: true }))) return;
  act(() => dialog().close());
}

beforeEach(() => {
  getApi.mockReset();
  skipApi.mockReset();
  // Only Date is faked, so the year rule (001 R9) sees Dec 10, 2026 while promises and timers stay real.
  vi.useFakeTimers({ now: local(2026, 11, 10), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("skip button (R1)", () => {
  it("ends the Next order section of an active subscription", async () => {
    getApi.mockResolvedValue(active());
    render(<SubscriptionCard />);

    const button = await screen.findByRole("button", { name: "Skip next order" });
    const section = screen.getByRole("heading", { name: "Next order" }).closest("section");
    expect(section?.lastElementChild).toBe(button);
  });

  it.each([
    ["active without a next order date", active({ nextChargeAt: null })],
    ["paused", fixtures.paused()],
    ["cancelled", fixtures.cancelled()],
  ])("is not offered when %s", async (_, subscription) => {
    getApi.mockResolvedValue(subscription);
    render(<SubscriptionCard />);

    await screen.findByRole("heading", { name: "In your subscription" });
    expect(screen.queryByRole("button", { name: "Skip next order" })).not.toBeInTheDocument();
    expect(dialog()).not.toHaveAttribute("open");
  });
});

describe("opening (R2, R4)", () => {
  it("opens a modal labelled by its heading, with both dates and the amount", async () => {
    await openDialog();

    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Skip your next order?" })).toBe(dialog());
    const summary = inDialog().getByText(/order will be skipped/);
    expect(summary).toHaveTextContent(
      "Your Dec 16 order will be skipped. Your next order moves to Jan 15, 2027, 30 days later on your current schedule.",
    );
    const [skipped, next] = summary.querySelectorAll("time");
    expect(skipped).toHaveAttribute("datetime", DEC_16);
    expect(next).toHaveAttribute("datetime", new Date(Date.parse(DEC_16) + 30 * 86_400_000).toISOString());
    expect(inDialog().getByText("You won’t be charged $101.87 for it.")).toBeInTheDocument();
    expect(dialog()).toHaveAccessibleDescription(/^Your Dec 16 order will be skipped/);
  });

  it("puts focus on Keep my order, which comes before the confirm button", async () => {
    await openDialog();

    expect(keep()).toHaveFocus();
    expect(
      inDialog()
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Keep my order", "Skip Dec 16 order"]);
  });

  it("opens with an empty alert and doesn't call the skip API", async () => {
    await openDialog();

    expect(inDialog().getByRole("alert")).toBeEmptyDOMElement();
    expect(skipApi).not.toHaveBeenCalled();
  });

  it("names the subscription's own date in the confirm button", async () => {
    await openDialog(active({ nextChargeAt: iso(2027, 0, 2) }));

    expect(inDialog().getByRole("button", { name: "Skip Jan 2, 2027 order" })).toBeInTheDocument();
    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent(
      "Your Jan 2, 2027 order will be skipped. Your next order moves to Feb 1, 2027",
    );
  });

  it("leaves out the amount when the server sends no total", async () => {
    await openDialog(active({ nextChargeTotalCents: null }));

    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent("Dec 16");
    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent("Jan 15, 2027");
    expect(inDialog().queryByText(/charged/)).not.toBeInTheDocument();
  });
});

describe("closing (R4)", () => {
  it("closes on Esc without calling the API, and returns focus to the skip button", async () => {
    await openDialog();

    pressEscape();

    expect(dialog()).not.toHaveAttribute("open");
    expect(dialog()).toBeEmptyDOMElement();
    expect(skipButton()).toHaveFocus();
    expect(skipApi).not.toHaveBeenCalled();
    expect(getApi).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Dec 16")).toBeInTheDocument();
  });

  it("closes on the cancel event itself, without waiting for the queued close event", async () => {
    const user = await openDialog();

    // Only `cancel`: a browser fires `close` later, as a task, and Chrome runs input waiting before it.
    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(skipButton()).toHaveFocus();
    // So a Space on the skip button right after Esc opens the dialog again.
    await user.keyboard(" ");
    expect(dialog()).toHaveAttribute("open");
    expect(keep()).toHaveFocus();
  });

  it("ignores a close event that arrives after the dialog was opened again", async () => {
    await openDialog();

    // The `close` queued by an earlier close, delivered late. The dialog is open, so it isn't this dialog's close.
    fireEvent(dialog(), new Event("close"));

    expect(dialog()).toHaveAttribute("open");
    expect(keep()).toBeInTheDocument();
  });

  it("closes on Keep my order, and returns focus to the skip button", async () => {
    const user = await openDialog();

    await user.click(keep());

    expect(dialog()).not.toHaveAttribute("open");
    expect(skipButton()).toHaveFocus();
    expect(skipApi).not.toHaveBeenCalled();
  });

  it("opens again from the start", async () => {
    const user = await openDialog();
    await user.click(keep());

    await user.click(skipButton());

    expect(dialog()).toHaveAttribute("open");
    expect(keep()).toHaveFocus();
  });
});

const status = () => screen.getByRole("status");
/** The confirm button, whatever it reads. It is always the dialog's second button outside the R9 state. */
const confirmButton = () => inDialog().getAllByRole("button")[1];

describe("confirming (R5, R6)", () => {
  it("sends one skip with the shown subscription's id and updatedAt", async () => {
    const subscription = active();
    const user = await openDialog(subscription);
    skipApi.mockReturnValue(new Promise(() => {}));

    await user.click(inDialog().getByRole("button", { name: "Skip Dec 16 order" }));

    expect(skipApi).toHaveBeenCalledTimes(1);
    expect(skipApi).toHaveBeenCalledWith({
      subscriptionId: subscription.id,
      expectedUpdatedAt: subscription.updatedAt,
    });
  });

  it("while pending: one request for two clicks, focus kept, Keep disabled and Esc ignored (R5)", async () => {
    const user = await openDialog();
    skipApi.mockReturnValue(new Promise(() => {}));

    const confirm = inDialog().getByRole("button", { name: "Skip Dec 16 order" });
    await user.click(confirm);
    await user.click(confirm);

    expect(skipApi).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveTextContent("Skipping…");
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toBeEnabled();
    expect(confirm).toHaveFocus();
    expect(keep()).toBeDisabled();
    expect(inDialog().getByRole("alert")).toBeEmptyDOMElement();

    pressEscape();
    pressEscape();

    expect(dialog()).toHaveAttribute("open");
    expect(confirm).toHaveFocus();
  });

  it("prevents both the Escape keydown and the cancel event while pending", async () => {
    const user = await openDialog();
    skipApi.mockReturnValue(new Promise(() => {}));
    await user.click(confirmButton());

    expect(fireEvent.keyDown(confirmButton(), { key: "Escape" })).toBe(false);
    expect(fireEvent(dialog(), new Event("cancel", { cancelable: true }))).toBe(false);
    // Other keys still work, so Tab and Enter aren't swallowed.
    expect(fireEvent.keyDown(confirmButton(), { key: "Tab" })).toBe(true);
  });

  it("on success: shows and announces the server's date, closes, and returns focus to the skip button (R6)", async () => {
    const user = await openDialog();
    const skip = deferred<Subscription>();
    skipApi.mockReturnValue(skip.promise);
    await user.click(confirmButton());

    // Jan 20, not the predicted Jan 15: the page must use the response.
    const response = active({ nextChargeAt: iso(2027, 0, 20), updatedAt: "2026-12-10T17:00:01.000Z" });
    await settle(() => skip.resolve(response));

    expect(dialog()).not.toHaveAttribute("open");
    expect(status()).toHaveTextContent("Skipped. Your next order is Jan 20, 2027.");
    expect(screen.getByText("Jan 20, 2027")).toBeInTheDocument();
    expect(skipButton()).toHaveFocus();
    expect(getApi).toHaveBeenCalledTimes(1);
  });

  it("sends the response's updatedAt with the next skip, and clears the announcement when reopened", async () => {
    const user = await openDialog();
    const response = active({ nextChargeAt: iso(2027, 0, 15), updatedAt: "2026-12-10T17:00:01.000Z" });
    skipApi.mockResolvedValueOnce(response).mockReturnValueOnce(new Promise(() => {}));
    await user.click(confirmButton());
    await vi.waitFor(() => expect(status()).toHaveTextContent("Skipped. Your next order is Jan 15, 2027."));

    await user.click(skipButton());
    expect(status()).toBeEmptyDOMElement();
    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent(
      "Your Jan 15, 2027 order will be skipped. Your next order moves to Feb 14, 2027",
    );
    await user.click(inDialog().getByRole("button", { name: "Skip Jan 15, 2027 order" }));

    expect(skipApi).toHaveBeenLastCalledWith({ subscriptionId: response.id, expectedUpdatedAt: response.updatedAt });
  });
});

const conflict = () => new ApiError(409, "Subscription was modified since it was loaded");
const serverError = () => new ApiError(500, "Internal server error");
const CONFLICT_MESSAGE =
  "Your subscription was changed somewhere else. We've loaded the latest details. Check the dates and confirm again.";
const FAILED_MESSAGE = "Your order wasn't skipped. We've loaded the latest details.";
const STALE_MESSAGE = "We couldn’t check your subscription. Try again in a moment.";
const alertRegion = () => inDialog().getByRole("alert");
const checkAgainButton = () => inDialog().getByRole("button", { name: /^(Check again|Checking…)$/ });
const contactUs = () => inDialog().queryByRole("link", { name: "Contact us" });

/** Confirms in an open dialog and fails the skip with `error`. Returns the reload, still pending. */
async function failSkip(user: ReturnType<typeof userEvent.setup>, error: unknown = conflict()) {
  const skip = deferred<Subscription>();
  const reload = deferred<Subscription>();
  skipApi.mockReturnValueOnce(skip.promise);
  getApi.mockReturnValueOnce(reload.promise);
  await user.click(confirmButton());
  await settle(() => skip.reject(error));
  return reload;
}

/** Opens the dialog, fails one skip with a 409, and fails its reload: the R9 state. */
async function openStale() {
  const user = await openDialog();
  const reload = await failSkip(user);
  await settle(() => reload.reject(serverError()));
  return user;
}

describe("a failed skip (R7, R8)", () => {
  it("reloads without retrying, and stays pending until the reload has finished (R5, R7)", async () => {
    const user = await openDialog();
    await failSkip(user);

    expect(skipApi).toHaveBeenCalledTimes(1);
    expect(getApi).toHaveBeenCalledTimes(2);
    expect(confirmButton()).toHaveTextContent("Checking…");
    expect(confirmButton()).toHaveAttribute("aria-disabled", "true");
    expect(confirmButton()).toHaveFocus();
    expect(keep()).toBeDisabled();
    expect(alertRegion()).toBeEmptyDOMElement();

    await user.click(confirmButton());
    pressEscape();
    expect(skipApi).toHaveBeenCalledTimes(1);
    expect(dialog()).toHaveAttribute("open");
  });

  it("on a 409, shows the conflict message and the fresh data, with focus on Keep my order", async () => {
    const user = await openDialog();
    const reload = await failSkip(user);
    const fresh = active({ updatedAt: "2026-12-10T17:00:01.000Z" });

    await settle(() => reload.resolve(fresh));

    expect(alertRegion()).toHaveTextContent(CONFLICT_MESSAGE, { normalizeWhitespace: true });
    expect(alertRegion()).not.toHaveTextContent(/It may already have been skipped/);
    expect(keep()).toHaveFocus();
    expect(keep()).toBeEnabled();
    expect(confirmButton()).toHaveTextContent("Skip Dec 16 order");
    expect(confirmButton()).not.toHaveAttribute("aria-disabled");
    expect(contactUs()).not.toBeInTheDocument();
    expect(skipApi).toHaveBeenCalledTimes(1);

    // Confirming again sends the fresh updatedAt.
    skipApi.mockReturnValueOnce(new Promise(() => {}));
    await user.click(confirmButton());
    expect(skipApi).toHaveBeenLastCalledWith({ subscriptionId: fresh.id, expectedUpdatedAt: fresh.updatedAt });
  });

  it.each([
    ["a 400", new ApiError(400, "Only active subscriptions can skip a shipment")],
    ["a 500", serverError()],
    ["a network error", new TypeError("Failed to fetch")],
  ])("on %s, says the order wasn't skipped", async (_, error) => {
    const user = await openDialog();
    const reload = await failSkip(user, error);

    await settle(() => reload.resolve(active()));

    expect(alertRegion()).toHaveTextContent(FAILED_MESSAGE);
    expect(keep()).toHaveFocus();
  });

  it("names both dates when the reload brings a different next order, and the confirm button the new one", async () => {
    const user = await openDialog();
    const reload = await failSkip(user);

    await settle(() => reload.resolve(active({ nextChargeAt: iso(2027, 0, 15) })));

    expect(alertRegion()).toHaveTextContent(
      "Your next order is now Jan 15, 2027 (it was Dec 16). It may already have been skipped.",
    );
    expect(confirmButton()).toHaveTextContent("Skip Jan 15, 2027 order");
    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent(
      "Your Jan 15, 2027 order will be skipped. Your next order moves to Feb 14, 2027",
    );
    // The page behind the dialog shows the fresh date too.
    expect(screen.getByRole("heading", { name: "Next order" }).closest("section")).toHaveTextContent("Jan 15, 2027");
  });

  it("empties the alert during the next attempt, and adds Contact us after the second failure (R8)", async () => {
    const user = await openDialog();
    const first = await failSkip(user);
    await settle(() => first.resolve(active()));
    expect(alertRegion()).toHaveTextContent(CONFLICT_MESSAGE);

    const second = await failSkip(user);
    expect(alertRegion()).toBeEmptyDOMElement();
    await settle(() => second.resolve(active()));

    expect(alertRegion()).toHaveTextContent(CONFLICT_MESSAGE);
    expect(alertRegion()).toHaveTextContent("Still not working? Contact us");
    expect(contactUs()).toHaveAttribute("href", "mailto:support@naturawellness.example");
    expect(confirmButton()).toHaveTextContent("Skip Dec 16 order");
    expect(skipApi).toHaveBeenCalledTimes(2);
  });

  it("drops Contact us when the dialog is closed and reopened (R8)", async () => {
    const user = await openDialog();
    for (let attempt = 0; attempt < 2; attempt++) {
      const reload = await failSkip(user);
      await settle(() => reload.resolve(active()));
    }
    expect(contactUs()).toBeInTheDocument();

    await user.click(keep());
    await user.click(skipButton());

    expect(contactUs()).not.toBeInTheDocument();
    expect(alertRegion()).toBeEmptyDOMElement();
  });

  it("doesn't count a failed reload as a failed skip (R8)", async () => {
    await openStale();

    expect(alertRegion()).toHaveTextContent(STALE_MESSAGE);
    expect(contactUs()).not.toBeInTheDocument();
  });
});

describe("the reload fails too (R9)", () => {
  it("hides the dates and confirm, and offers Check again with focus on it", async () => {
    await openStale();

    expect(alertRegion()).toHaveTextContent(STALE_MESSAGE);
    expect(inDialog().queryByText(/order will be skipped/)).not.toBeInTheDocument();
    expect(inDialog().queryByRole("button", { name: /^Skip / })).not.toBeInTheDocument();
    expect(checkAgainButton()).toHaveTextContent("Check again");
    expect(checkAgainButton()).toHaveFocus();
    expect(keep()).toBeEnabled();
    expect(dialog()).toHaveAccessibleDescription(STALE_MESSAGE);
  });

  it("Check again reloads without a skip, and stays escapable while pending", async () => {
    const user = await openStale();
    getApi.mockReturnValueOnce(new Promise(() => {}));

    await user.click(checkAgainButton());
    await user.click(checkAgainButton());

    expect(getApi).toHaveBeenCalledTimes(3);
    expect(skipApi).toHaveBeenCalledTimes(1);
    expect(checkAgainButton()).toHaveTextContent("Checking…");
    expect(checkAgainButton()).toHaveAttribute("aria-disabled", "true");
    expect(checkAgainButton()).toHaveFocus();
    expect(keep()).toBeEnabled();

    pressEscape();
    expect(dialog()).not.toHaveAttribute("open");
    expect(skipButton()).toHaveFocus();
  });

  it("when Check again succeeds, shows the fresh dates and the original failure, with focus on Keep my order", async () => {
    const user = await openStale();
    const reload = deferred<Subscription>();
    getApi.mockReturnValueOnce(reload.promise);
    await user.click(checkAgainButton());

    await settle(() => reload.resolve(active({ nextChargeAt: iso(2027, 0, 15) })));

    expect(alertRegion()).toHaveTextContent(CONFLICT_MESSAGE);
    expect(alertRegion()).toHaveTextContent("Your next order is now Jan 15, 2027 (it was Dec 16).");
    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent("Your Jan 15, 2027 order will be skipped.");
    expect(confirmButton()).toHaveTextContent("Skip Jan 15, 2027 order");
    expect(keep()).toHaveFocus();
    expect(skipApi).toHaveBeenCalledTimes(1);
  });

  it("goes back to the R9 state when Check again fails, with focus on Check again", async () => {
    const user = await openStale();
    const reload = deferred<Subscription>();
    getApi.mockReturnValueOnce(reload.promise);
    await user.click(checkAgainButton());

    await settle(() => reload.reject(serverError()));

    expect(alertRegion()).toHaveTextContent(STALE_MESSAGE);
    expect(checkAgainButton()).toHaveTextContent("Check again");
    expect(checkAgainButton()).toHaveFocus();
  });

  it("opens in the R9 state again after closing, until a reload succeeds", async () => {
    const user = await openStale();
    await user.click(keep());
    expect(skipButton()).toHaveFocus();

    await user.click(skipButton());

    expect(alertRegion()).toHaveTextContent(STALE_MESSAGE);
    expect(checkAgainButton()).toHaveFocus();
    expect(inDialog().queryByText(/order will be skipped/)).not.toBeInTheDocument();

    getApi.mockResolvedValueOnce(active());
    await user.click(checkAgainButton());
    await vi.waitFor(() => expect(keep()).toHaveFocus());
    await user.click(keep());
    await user.click(skipButton());
    expect(confirmButton()).toHaveTextContent("Skip Dec 16 order");
    expect(alertRegion()).toBeEmptyDOMElement();
  });
});

describe("nothing left to skip after the reload (R10)", () => {
  it.each([
    ["paused", { ...fixtures.paused() }, () => screen.getByText(/^Paused until/)],
    ["cancelled", { ...fixtures.cancelled() }, () => screen.getByText(/^Cancelled on/)],
    [
      "active without a date",
      active({ nextChargeAt: null }),
      () => screen.getByText("We'll confirm your next order date soon."),
    ],
  ])("closes and shows the %s subscription, with focus on the h1", async (_, fresh, shown) => {
    const user = await openDialog();
    const reload = await failSkip(user);

    await settle(() => reload.resolve(fresh));

    expect(dialog()).not.toHaveAttribute("open");
    expect(shown()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip next order" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("shows not found on a 404, with focus on the h1", async () => {
    const user = await openDialog();
    const reload = await failSkip(user);

    await settle(() => reload.reject(new ApiError(404, "Subscription not found")));

    expect(document.querySelector("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't find a subscription on your account.");
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("does the same after Check again", async () => {
    const user = await openStale();
    const reload = deferred<Subscription>();
    getApi.mockReturnValueOnce(reload.promise);
    await user.click(checkAgainButton());

    await settle(() => reload.resolve(fixtures.paused()));

    expect(dialog()).not.toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  type Reload = ReturnType<typeof deferred<Subscription>>;

  /** Closes the dialog while "Check again" is pending, so focus is back on the skip button. */
  async function closeDuringCheckAgain() {
    const user = await openStale();
    const reload = deferred<Subscription>();
    getApi.mockReturnValueOnce(reload.promise);
    await user.click(checkAgainButton());
    await user.click(keep());
    expect(dialog()).not.toHaveAttribute("open");
    expect(skipButton()).toHaveFocus();
    return reload;
  }

  it.each([
    ["shows a paused subscription", (reload: Reload) => reload.resolve(fixtures.paused())],
    ["returns a 404", (reload: Reload) => reload.reject(new ApiError(404, "Gone"))],
  ])("moves focus from the removed skip button to the h1 when Check again %s after a close", async (_, finish) => {
    const reload = await closeDuringCheckAgain();

    await settle(() => finish(reload));

    expect(screen.queryByRole("button", { name: "Skip next order" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("leaves focus where the customer moved it after the close", async () => {
    const elsewhere = document.body.appendChild(document.createElement("button"));
    onTestFinished(() => elsewhere.remove());
    const reload = await closeDuringCheckAgain();
    elsewhere.focus();

    await settle(() => reload.resolve(fixtures.paused()));

    expect(screen.getByText(/^Paused until/)).toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });
});

describe("SkipDialog alone: a pending frequency change (R3)", () => {
  function renderDialog(pendingIntervalDays: number | null) {
    render(
      <SkipDialog
        subscription={active()}
        skip={{ kind: "confirm", failedSkips: 0, notice: null }}
        pendingIntervalDays={pendingIntervalDays}
        dialogRef={createRef()}
        keepRef={createRef()}
        checkAgainRef={createRef()}
        onConfirm={vi.fn()}
        onCheckAgain={vi.fn()}
        onClose={vi.fn()}
      />,
    );
  }

  it("adds the sentence, and the new date still follows the server's 30 days", () => {
    renderDialog(60);

    expect(screen.getByText("Every 60 days starts after that order.")).toBeInTheDocument();
    expect(screen.getByText(/order will be skipped/)).toHaveTextContent("Jan 15, 2027, 30 days later");
  });

  it.each([
    ["equals the server's interval", 30],
    ["doesn't exist", null],
  ])("leaves the sentence out when the pending frequency %s", (_, pendingIntervalDays) => {
    renderDialog(pendingIntervalDays);

    expect(screen.queryByText(/starts after that order/)).not.toBeInTheDocument();
  });
});
