// 004: the cancel flow through SubscriptionCard, with a mocked API (as in SkipDialog.test.tsx).
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import type { Subscription } from "../api/types";
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

const REASON_LABELS = [
  "I have too much product left",
  "It costs too much",
  "I'm trying a different product",
  "I didn't see results",
  "Other",
];

// SubscriptionCard renders SkipDialog first, so the cancel dialog is the second one.
const dialog = () => document.querySelectorAll("dialog")[1];
const inDialog = () => within(dialog());
const trigger = () => screen.getByRole("button", { name: "Cancel subscription" });
const keep = () => inDialog().getByRole("button", { name: "Keep my subscription" });
const status = () => screen.getByRole("status");

/** Loads `subscription` and waits for its view. */
async function renderLoaded(subscription: Subscription = active()) {
  const user = userEvent.setup();
  getApi.mockResolvedValueOnce(subscription);
  render(<SubscriptionCard />);
  await screen.findByRole("heading", { name: "In your subscription" });
  return user;
}

/** Loads `subscription` and opens the cancel flow with a click. */
async function openFlow(subscription = active()) {
  const user = await renderLoaded(subscription);
  await user.click(trigger());
  return user;
}

/** Esc as a browser handles it: keydown, then `cancel` on the dialog, then close. jsdom does none of this itself. */
function pressEscape() {
  if (!fireEvent.keyDown(document.activeElement ?? dialog(), { key: "Escape" })) return;
  if (!fireEvent(dialog(), new Event("cancel", { cancelable: true }))) return;
  act(() => dialog().close());
}

/** R10: the flow is gone, the subscription is still active, and focus is back on the trigger. */
function expectClosedAndActive() {
  expect(dialog()).not.toHaveAttribute("open");
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(trigger()).toHaveFocus();
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

describe("the trigger (R1)", () => {
  it("is a plain button that ends the active view, after Change your plan", async () => {
    await renderLoaded();

    const plan = screen.getByRole("heading", { name: "Change your plan" }).closest("section")!;
    expect(plan.compareDocumentPosition(trigger()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trigger().tagName).toBe("BUTTON");
    expect(trigger()).toHaveAttribute("type", "button");
    const buttons = screen.getAllByRole("button");
    expect(buttons[buttons.length - 1]).toBe(trigger());
  });

  it("has the same classes as Skip next order, so it is the same size", async () => {
    await renderLoaded();

    const skip = screen.getByRole("button", { name: "Skip next order" });
    expect(trigger().classList.length).toBeGreaterThan(0);
    for (const name of trigger().classList) expect(skip).toHaveClass(name);
  });

  it("is offered without a next order date, where only skipping is unavailable", async () => {
    await renderLoaded(active({ nextChargeAt: null }));

    expect(trigger()).toBeInTheDocument();
  });

  it.each([
    ["paused", fixtures.paused()],
    ["cancelled", fixtures.cancelled()],
  ])("is not offered when %s", async (_, subscription) => {
    await renderLoaded(subscription);

    expect(screen.queryByRole("button", { name: "Cancel subscription" })).not.toBeInTheDocument();
    expect(dialog()).not.toHaveAttribute("open");
  });
});

describe("step 1 (R2)", () => {
  it("opens a modal named by its question, and only that one", async () => {
    await openFlow();

    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Why are you cancelling?" })).toBe(dialog());
    expect(document.querySelectorAll("dialog[open]")).toHaveLength(1);
  });

  it("lists the five reasons as buttons in the spec's order, then Keep my subscription", async () => {
    await openFlow();

    const list = inDialog().getByRole("list");
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(REASON_LABELS);
    expect(
      inDialog()
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([...REASON_LABELS, "Keep my subscription"]);
    // No radios to auto-advance and no Continue (R2).
    expect(inDialog().queryByRole("radio")).not.toBeInTheDocument();
  });

  it("focuses the first reason, since the dialog's name already reads the question", async () => {
    await openFlow();

    expect(inDialog().getByRole("button", { name: REASON_LABELS[0] })).toHaveFocus();
  });

  it("clears an earlier announcement", async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 60 days" }));
    expect(status()).not.toBeEmptyDOMElement();

    await user.click(trigger());
    expect(status()).toBeEmptyDOMElement();
  });

  it("is reached with the keyboard alone", async () => {
    const user = await renderLoaded();
    trigger().focus();
    await user.keyboard("{Enter}");

    expect(dialog()).toHaveAttribute("open");
    expect(inDialog().getByRole("button", { name: REASON_LABELS[0] })).toHaveFocus();
  });
});

describe("leaving at step 1 (R10)", () => {
  it("closes on Esc", async () => {
    await openFlow();
    pressEscape();

    expectClosedAndActive();
  });

  it("closes on the native close", async () => {
    await openFlow();
    act(() => dialog().close());

    expectClosedAndActive();
  });

  it("closes on Keep my subscription, one tap for a touch screen without Esc", async () => {
    const user = await openFlow();
    await user.click(keep());

    expectClosedAndActive();
  });

  it("keeps pending plan changes", async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 60 days" }));
    await user.click(trigger());
    await user.click(keep());

    expect(screen.getByRole("radio", { name: "Every 60 days" })).toBeChecked();
    expect(screen.getByText("Starting after your Dec 16 order:")).toBeInTheDocument();
  });

  it("opens again at the first reason", async () => {
    const user = await openFlow();
    pressEscape();
    await user.click(trigger());

    expect(dialog()).toHaveAttribute("open");
    expect(inDialog().getByRole("button", { name: REASON_LABELS[0] })).toHaveFocus();
  });
});

const STEP_2_ACTIONS = ["Yes, cancel my subscription", "Back", "Keep my subscription"];
const EVERY_60_COSTS = "Ship every 60 days: $101.87 every 60 days instead of every 30";
const MULTI_1 = "Get 1 Multivitamin, 30 tablets instead of 2: save $38.20 per order";

/** Opens the flow and chooses `reason` (one of REASON_LABELS) with clicks. */
async function atStep2(reason: string, subscription = active()) {
  const user = await openFlow(subscription);
  await user.click(inDialog().getByRole("button", { name: reason }));
  return user;
}

const buttonTexts = () =>
  inDialog()
    .getAllByRole("button")
    .map((button) => button.textContent);

describe("step 2 (R3, R4)", () => {
  it("is named by its own heading, which takes focus", async () => {
    await atStep2("It costs too much");

    const heading = inDialog().getByRole("heading", { level: 2, name: "Cancel your subscription?" });
    expect(screen.getByRole("dialog", { name: "Cancel your subscription?" })).toBe(dialog());
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it.each([
    ["I have too much product left", ["Skip my Dec 16 order", "Ship every 60 days"]],
    ["It costs too much", [EVERY_60_COSTS, MULTI_1]],
    ["I'm trying a different product", ["Skip my Dec 16 order while you try it"]],
  ])("offers the alternatives for %s, then the cancel, Back and Keep", async (reason, offers) => {
    await atStep2(reason);

    expect(inDialog().getByText("Instead, you can:")).toBeInTheDocument();
    expect(
      within(inDialog().getByRole("list"))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(offers);
    expect(buttonTexts()).toEqual([...offers, ...STEP_2_ACTIONS]);
  });

  it.each(["I didn't see results", "Other"])("has no offer for %s, only the cancel, Back and Keep", async (reason) => {
    await atStep2(reason);

    expect(inDialog().queryByText("Instead, you can:")).not.toBeInTheDocument();
    expect(inDialog().queryByRole("list")).not.toBeInTheDocument();
    expect(buttonTexts()).toEqual(STEP_2_ACTIONS);
  });

  it("gives the cancel the same classes as every offer, so the same size and contrast", async () => {
    await atStep2("It costs too much");

    const confirm = inDialog().getByRole("button", { name: "Yes, cancel my subscription" });
    for (const offer of within(inDialog().getByRole("list")).getAllByRole("button")) {
      expect(offer.className).toBe(confirm.className);
    }
  });

  it("never shares the trigger's name", async () => {
    await atStep2("I didn't see results");

    expect(inDialog().queryByRole("button", { name: "Cancel subscription" })).not.toBeInTheDocument();
  });

  it("shows the optional Tell us more field for Other only", async () => {
    const user = await atStep2("Other");

    const field = inDialog().getByRole("textbox", { name: "Tell us more (optional)" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).not.toBeRequired();
    // Before the buttons, so it is read before the cancel.
    expect(
      field.compareDocumentPosition(inDialog().getByRole("button", { name: "Yes, cancel my subscription" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(inDialog().getByRole("button", { name: "Back" }));
    for (const reason of REASON_LABELS.slice(0, 4)) {
      await user.click(inDialog().getByRole("button", { name: reason }));
      expect(inDialog().queryByRole("textbox")).not.toBeInTheDocument();
      await user.click(inDialog().getByRole("button", { name: "Back" }));
    }
  });

  it("loses the Tell us more text on Back", async () => {
    const user = await atStep2("Other");
    await user.type(inDialog().getByRole("textbox"), "Moving abroad");
    await user.click(inDialog().getByRole("button", { name: "Back" }));
    await user.click(inDialog().getByRole("button", { name: "Other" }));

    expect(inDialog().getByRole("textbox")).toHaveValue("");
  });

  it("follows pending changes: a pending 90 hides the frequency offer (R4)", async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 90 days" }));
    await user.click(trigger());
    await user.click(inDialog().getByRole("button", { name: "It costs too much" }));

    expect(buttonTexts()).toEqual([
      "Get 1 Multivitamin, 30 tablets instead of 2: save $38.20 per order",
      ...STEP_2_ACTIONS,
    ]);
  });

  it("follows pending changes: a pending 60 offers 90 instead of every 60", async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 60 days" }));
    await user.click(trigger());
    await user.click(inDialog().getByRole("button", { name: "I have too much product left" }));

    expect(inDialog().getByRole("button", { name: "Ship every 90 days" })).toBeInTheDocument();
  });

  it("has no skip offer without a next order date", async () => {
    await atStep2("I'm trying a different product", active({ nextChargeAt: null }));

    expect(buttonTexts()).toEqual(STEP_2_ACTIONS);
  });
});

describe("at most 2 quantity offers (R3)", () => {
  // Vitamin D and Multivitamin at 2, plus a cheaper third item at 2. Savings: Multivitamin $38.21, Vitamin D
  // $25.46, Fish oil $16.15, so Fish oil is left out.
  const fishOil = { sku: "NW-FISH-90", name: "Fish oil", quantity: 2, unitPriceCents: 1900, imageUrl: null };
  const three = () =>
    active({ items: [...fixtures.active().items.map((item) => ({ ...item, quantity: 2 })), fishOil] });

  it("shows two, the largest saving first, after the frequency offer", async () => {
    await atStep2("It costs too much", three());

    const offers = within(inDialog().getByRole("list")).getAllByRole("button");
    expect(offers.map((button) => button.textContent)).toEqual([
      expect.stringMatching(/^Ship every 60 days: /),
      "Get 1 Multivitamin, 30 tablets instead of 2: save $38.21 per order",
      "Get 1 Vitamin D, 60 softgels instead of 2: save $25.46 per order",
    ]);
    expect(inDialog().queryByRole("button", { name: /Fish oil/ })).not.toBeInTheDocument();
  });

  it("applies the second one too", async () => {
    const user = await atStep2("It costs too much", three());
    await user.click(inDialog().getByRole("button", { name: /^Get 1 Vitamin D/ }));

    expect(document.querySelectorAll("dialog[open]")).toHaveLength(0);
    expect(screen.getByRole("combobox", { name: "Vitamin D, 60 softgels quantity" })).toHaveValue("1");
  });
});

describe("the fallbacks (R3, R4)", () => {
  const offerTexts = () =>
    inDialog()
      .queryAllByRole("listitem")
      .map((item) => item.textContent);
  const lead = () => inDialog().queryByText("Instead, you can:");

  it('falls back to the frequency offer for "too much" without a next order date', async () => {
    await atStep2("I have too much product left", active({ nextChargeAt: null }));

    expect(lead()).toBeInTheDocument();
    expect(offerTexts()).toEqual(["Ship every 60 days"]);
  });

  it('has no offer and no lead for "different product" without a next order date', async () => {
    await atStep2("I'm trying a different product", active({ nextChargeAt: null }));

    expect(lead()).not.toBeInTheDocument();
    expect(inDialog().queryByRole("list")).not.toBeInTheDocument();
    expect(buttonTexts()).toEqual(STEP_2_ACTIONS);
  });

  it("drops the offer for a quantity already lowered to 1, and uses the lower total", async () => {
    const user = await renderLoaded();
    await user.selectOptions(screen.getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" }), "1");
    await user.click(trigger());
    await user.click(inDialog().getByRole("button", { name: "It costs too much" }));

    expect(offerTexts()).toEqual(["Ship every 60 days: $63.67 every 60 days instead of every 30"]);
  });

  it('has no offer and no lead for "costs" with 90 days and every quantity at 1 pending', async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 90 days" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" }), "1");
    await user.click(trigger());
    await user.click(inDialog().getByRole("button", { name: "It costs too much" }));

    expect(lead()).not.toBeInTheDocument();
    expect(buttonTexts()).toEqual(STEP_2_ACTIONS);
    expect(inDialog().getByRole("button", { name: "Yes, cancel my subscription" })).toBeVisible();
  });
});

describe("Back (R3)", () => {
  it.each(REASON_LABELS)("returns to step 1 with focus on %s", async (reason) => {
    const user = await atStep2(reason);
    await user.click(inDialog().getByRole("button", { name: "Back" }));

    expect(screen.getByRole("dialog", { name: "Why are you cancelling?" })).toBe(dialog());
    expect(inDialog().getByRole("button", { name: reason })).toHaveFocus();
  });

  it("can choose another reason after going back", async () => {
    const user = await atStep2("Other");
    await user.click(inDialog().getByRole("button", { name: "Back" }));
    await user.click(inDialog().getByRole("button", { name: "It costs too much" }));

    expect(inDialog().getByRole("button", { name: MULTI_1 })).toBeInTheDocument();
  });
});

describe("leaving at step 2 (R10)", () => {
  it("closes on Esc", async () => {
    await atStep2("It costs too much");
    pressEscape();

    expectClosedAndActive();
  });

  it("closes on the native close", async () => {
    await atStep2("It costs too much");
    act(() => dialog().close());

    expectClosedAndActive();
  });

  it("closes on Keep my subscription", async () => {
    const user = await atStep2("It costs too much");
    await user.click(keep());

    expectClosedAndActive();
  });

  it("opens again at step 1, not where it was left", async () => {
    const user = await atStep2("It costs too much");
    pressEscape();
    await user.click(trigger());

    expect(screen.getByRole("dialog", { name: "Why are you cancelling?" })).toBe(dialog());
    expect(inDialog().getByRole("button", { name: REASON_LABELS[0] })).toHaveFocus();
  });
});

describe("a skip offer (R5)", () => {
  const skipDialog = () => document.querySelectorAll("dialog")[0];

  it.each([
    ["I have too much product left", "Skip my Dec 16 order"],
    ["I'm trying a different product", "Skip my Dec 16 order while you try it"],
  ])("from %s swaps the cancel flow for the 002 skip dialog with both dates", async (reason, offer) => {
    const user = await atStep2(reason);
    await user.click(inDialog().getByRole("button", { name: offer }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Skip your next order?" })).toBe(skipDialog());
    expect(document.querySelectorAll("dialog[open]")).toHaveLength(1);
    expect(within(skipDialog()).getByText(/order will be skipped/)).toHaveTextContent(
      "Your Dec 16 order will be skipped. Your next order moves to Jan 15, 2027",
    );
    // 002 R4: the safe action has focus, and nothing is sent until the customer confirms.
    expect(within(skipDialog()).getByRole("button", { name: "Keep my order" })).toHaveFocus();
    expect(skipApi).not.toHaveBeenCalled();
  });

  it("keeps the subscription, and closing the skip dialog follows 002 R6", async () => {
    const user = await atStep2("I have too much product left");
    await user.click(inDialog().getByRole("button", { name: "Skip my Dec 16 order" }));
    await user.click(within(skipDialog()).getByRole("button", { name: "Keep my order" }));

    expect(document.querySelectorAll("dialog[open]")).toHaveLength(0);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip next order" })).toHaveFocus();
  });
});

describe("a frequency or quantity offer (R6)", () => {
  const planHeading = () => screen.getByRole("heading", { name: "Change your plan" });

  it.each([
    ["I have too much product left", "Ship every 60 days"],
    ["It costs too much", EVERY_60_COSTS],
  ])("from %s applies every 60 days, announces it and focuses Change your plan", async (reason, offer) => {
    const user = await atStep2(reason);
    await user.click(inDialog().getByRole("button", { name: offer }));

    expect(document.querySelectorAll("dialog[open]")).toHaveLength(0);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Every 60 days" })).toBeChecked();
    expect(screen.getByText("Starting after your Dec 16 order:")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Frequency changed to every 60 days, starting after your Dec 16 order.");
    expect(planHeading()).toHaveFocus();
  });

  it("applies one unit less, shows the new total, announces it and focuses Change your plan", async () => {
    const user = await atStep2("It costs too much");
    await user.click(inDialog().getByRole("button", { name: MULTI_1 }));

    expect(document.querySelectorAll("dialog[open]")).toHaveLength(0);
    expect(screen.getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" })).toHaveValue("1");
    expect(screen.getByText("After that: $63.67 per order")).toBeInTheDocument();
    expect(status()).toHaveTextContent(
      "Multivitamin, 30 tablets quantity changed from 2 to 1, starting after your Dec 16 order. After that: $63.67 per order.",
    );
    expect(planHeading()).toHaveFocus();
  });
});

const CANCELLED_TEXT = "Your subscription is cancelled. You won't be charged again.";
const h1 = () => screen.getByRole("heading", { level: 1, name: "Manage my subscription" });
const undo = () => screen.getByRole("button", { name: "Undo cancellation" });
/** The view's message. The status region repeats the same text, so it is left out. */
const VIEW_TEXT = { selector: "p:not([role=status])" };

/** The browser's leave check, as in PlanChanges.test.tsx (003 R9). */
const leaveIsBlocked = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

/** Opens the flow, chooses `reason` and confirms: the 3 clicks of R7. */
async function cancelFor(reason = "I didn't see results", subscription = active()) {
  const user = await atStep2(reason, subscription);
  await user.click(inDialog().getByRole("button", { name: "Yes, cancel my subscription" }));
  return user;
}

describe("the local cancel (R7)", () => {
  it.each(REASON_LABELS)("finishes in 3 clicks for %s", async (reason) => {
    await cancelFor(reason);

    expect(document.querySelectorAll("dialog[open]")).toHaveLength(0);
    expect(screen.getByText("Cancelled")).toHaveTextContent("Status: Cancelled");
    expect(screen.getByText(CANCELLED_TEXT, VIEW_TEXT)).toBeInTheDocument();
  });

  it("announces the cancel and focuses the h1, not Undo", async () => {
    await cancelFor();

    expect(status()).toHaveTextContent(CANCELLED_TEXT);
    expect(h1()).toHaveFocus();
    expect(undo()).not.toHaveFocus();
  });

  it("shows no date, because the server sent none", async () => {
    await cancelFor();

    expect(screen.queryByText(/^Cancelled on/)).not.toBeInTheDocument();
    expect(document.querySelector("time")).toBeNull();
  });

  it("keeps the server's products, and offers nothing but Undo", async () => {
    await cancelFor();

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("heading").map((heading) => `${heading.tagName} ${heading.textContent}`)).toEqual([
      "H1 Manage my subscription",
      "H2 In your subscription",
    ]);
    // The closed dialogs are in the DOM, but not in the accessibility tree.
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Undo cancellation"]);
  });

  it("sends no request (Known limitations)", async () => {
    await cancelFor();

    expect(getApi).toHaveBeenCalledTimes(1);
    expect(skipApi).not.toHaveBeenCalled();
  });

  it("turns off the leave warning for pending changes (plan Risks)", async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 60 days" }));
    expect(leaveIsBlocked()).toBe(true);

    await user.click(trigger());
    await user.click(inDialog().getByRole("button", { name: "I didn't see results" }));
    await user.click(inDialog().getByRole("button", { name: "Yes, cancel my subscription" }));

    expect(leaveIsBlocked()).toBe(false);
  });
});

describe("Undo cancellation (R8)", () => {
  it("brings back the active view, announces it and focuses the h1", async () => {
    const user = await cancelFor();
    await user.click(undo());

    expect(screen.getByText("Active")).toHaveTextContent("Status: Active");
    expect(screen.getByText("$101.87")).toBeInTheDocument();
    expect(screen.queryByText(CANCELLED_TEXT, VIEW_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo cancellation" })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent("Cancellation undone. Your subscription is active.");
    expect(h1()).toHaveFocus();
  });

  it("brings back the pending changes and their leave warning", async () => {
    const user = await renderLoaded();
    await user.click(screen.getByRole("radio", { name: "Every 60 days" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" }), "1");

    await user.click(trigger());
    await user.click(inDialog().getByRole("button", { name: "Other" }));
    await user.click(inDialog().getByRole("button", { name: "Yes, cancel my subscription" }));
    expect(screen.queryByRole("heading", { name: "Change your plan" })).not.toBeInTheDocument();

    await user.click(undo());

    expect(screen.getByRole("radio", { name: "Every 60 days" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" })).toHaveValue("1");
    expect(screen.getByText("Starting after your Dec 16 order:")).toBeInTheDocument();
    expect(screen.getByText("After that: $63.67 per order")).toBeInTheDocument();
    expect(leaveIsBlocked()).toBe(true);
  });

  it("lets the customer cancel again, starting from step 1", async () => {
    const user = await cancelFor("It costs too much");
    await user.click(undo());
    await user.click(trigger());

    expect(dialog()).toHaveAttribute("open");
    expect(inDialog().getByRole("heading", { name: "Why are you cancelling?" })).toBeInTheDocument();
    expect(inDialog().getByRole("button", { name: REASON_LABELS[0] })).toHaveFocus();

    await user.click(inDialog().getByRole("button", { name: "Other" }));
    await user.click(inDialog().getByRole("button", { name: "Yes, cancel my subscription" }));
    expect(screen.getByText(CANCELLED_TEXT, VIEW_TEXT)).toBeInTheDocument();
  });

  it("is never offered for the cancelled fixture", async () => {
    await renderLoaded({ ...fixtures.cancelled(), cancelledAt: iso(2026, 10, 30) });

    expect(screen.getByText(/^Cancelled on/)).toHaveTextContent("Cancelled on Nov 30");
    expect(screen.queryByText(CANCELLED_TEXT, VIEW_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo cancellation" })).not.toBeInTheDocument();
  });
});
