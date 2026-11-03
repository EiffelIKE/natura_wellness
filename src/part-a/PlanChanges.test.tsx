// 003: "Change your plan" through SubscriptionCard, with a mocked API (as in SkipDialog.test.tsx).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtures } from "../api/fixtures";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import { ApiError, type Subscription } from "../api/types";
import { deferred, settle } from "../test/deferred";
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

const planSection = () => screen.getByRole("heading", { name: "Change your plan" }).closest("section")!;
const inPlan = () => within(planSection());
const radio = (name: string) => inPlan().getByRole("radio", { name });
const multivitamin = () => inPlan().getByRole("combobox", { name: "Multivitamin, 30 tablets quantity" });
const vitaminD = () => inPlan().getByRole("combobox", { name: "Vitamin D, 60 softgels quantity" });
const selectedText = (select: HTMLElement) => (select as HTMLSelectElement).selectedOptions[0]?.textContent;

/** Loads `subscription`, waits for its view, and returns the user-event instance. */
async function renderLoaded(subscription: Subscription = active()) {
  const user = userEvent.setup();
  getApi.mockResolvedValueOnce(subscription);
  render(<SubscriptionCard />);
  await screen.findByRole("heading", { name: "In your subscription" });
  return user;
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

describe("the section (R8)", () => {
  it("is its own section after the products, with an h2 the script can focus", async () => {
    await renderLoaded();

    const products = screen.getByRole("heading", { name: "In your subscription" }).closest("section")!;
    const heading = screen.getByRole("heading", { level: 2, name: "Change your plan" });
    expect(products.compareDocumentPosition(planSection()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(planSection().firstElementChild).toBe(heading);
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("has no form, so pressing Enter can't submit anything", async () => {
    await renderLoaded();

    expect(document.querySelector("form")).not.toBeInTheDocument();
  });

  it("leaves the server's sections read-only", async () => {
    await renderLoaded();

    const outside = [...screen.getAllByRole("radio"), ...screen.getAllByRole("combobox")].filter(
      (control) => !planSection().contains(control),
    );
    expect(outside).toHaveLength(0);
  });

  it.each([
    ["paused", fixtures.paused()],
    ["cancelled", fixtures.cancelled()],
  ])("is not shown when %s (R7)", async (_, subscription) => {
    await renderLoaded(subscription);

    expect(screen.queryByRole("heading", { name: "Change your plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("frequency (R1)", () => {
  it("is a group named by its visible legend, with three radios and the server's marked (current)", async () => {
    await renderLoaded();

    const group = inPlan().getByRole("group", { name: "How often" });
    expect(group.tagName).toBe("FIELDSET");
    expect(within(group).getByText("How often").tagName).toBe("LEGEND");
    expect(
      within(group)
        .getAllByRole("radio")
        .map((input) => input.closest("label")?.textContent),
    ).toEqual(["Every 30 days (current)", "Every 60 days", "Every 90 days"]);
    expect(radio("Every 30 days (current)")).toBeChecked();
    expect(radio("Every 60 days")).not.toBeChecked();
  });

  it("shares one name across the group, so arrow keys move between the radios", async () => {
    await renderLoaded();

    const names = new Set(
      inPlan()
        .getAllByRole("radio")
        .map((input) => input.getAttribute("name")),
    );
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it("marks whichever frequency the server sends", async () => {
    await renderLoaded(active({ intervalDays: 60 }));

    expect(radio("Every 60 days (current)")).toBeChecked();
    expect(radio("Every 30 days")).not.toBeChecked();
  });

  it("checks the picked radio, and arrow keys move the pick", async () => {
    const user = await renderLoaded();

    await user.click(radio("Every 60 days"));
    expect(radio("Every 60 days")).toBeChecked();
    expect(radio("Every 60 days")).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(radio("Every 90 days")).toBeChecked();
    expect(radio("Every 30 days (current)")).not.toBeChecked();
  });
});

describe("quantity (R2)", () => {
  it("has a select per product, labelled with its full name, in the server's order", async () => {
    await renderLoaded();

    expect(inPlan().getAllByRole("combobox")).toEqual([vitaminD(), multivitamin()]);
    expect(multivitamin().tagName).toBe("SELECT");
    // The visible label is what names it.
    expect(inPlan().getByText("Multivitamin, 30 tablets quantity").tagName).toBe("LABEL");
  });

  it("offers 1 to 10, with the server's quantity selected and marked (current)", async () => {
    await renderLoaded();

    expect(
      within(multivitamin())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["1", "2 (current)", "3", "4", "5", "6", "7", "8", "9", "10"]);
    expect(selectedText(multivitamin())).toBe("2 (current)");
    expect(selectedText(vitaminD())).toBe("1 (current)");
  });

  it("has no number input or stepper buttons (R2)", async () => {
    await renderLoaded();

    expect(inPlan().queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(inPlan().queryAllByRole("button", { name: /^[-−+]$|increase|decrease/i })).toHaveLength(0);
  });

  it("shows the picked quantity, and the server's 'Quantity: 2' stays as it was", async () => {
    const user = await renderLoaded();

    await user.selectOptions(multivitamin(), "1");

    expect(selectedText(multivitamin())).toBe("1");
    expect(multivitamin()).toHaveFocus();
    const products = screen.getByRole("heading", { name: "In your subscription" }).closest("section")!;
    expect(within(products).getByText("Quantity: 2")).toBeInTheDocument();
  });

  it("has no selects for a subscription with no products, and keeps the frequency", async () => {
    await renderLoaded(active({ items: [] }));

    expect(inPlan().queryByRole("combobox")).not.toBeInTheDocument();
    expect(inPlan().getByRole("group", { name: "How often" })).toBeInTheDocument();
  });
});

const status = () => screen.getByRole("status");
const nextOrder = () => screen.getByRole("heading", { name: "Next order" }).closest("section")!;
const pendingList = () => inPlan().queryByRole("list");
const pendingLines = () =>
  within(pendingList()!)
    .getAllByRole("listitem")
    .map((line) => line.textContent);
const discard = () => inPlan().queryByRole("button", { name: "Discard changes" });

describe("pending changes (R3, R4)", () => {
  it("shows nothing pending, and no Discard, until something changes", async () => {
    await renderLoaded();

    expect(pendingList()).not.toBeInTheDocument();
    expect(inPlan().queryByText(/^Starting after/)).not.toBeInTheDocument();
    expect(discard()).not.toBeInTheDocument();
  });

  it("shows a new frequency as starting after the next order, and the next order stays the same (R1, R3)", async () => {
    const user = await renderLoaded();

    await user.click(radio("Every 60 days"));

    expect(inPlan().getByText("Starting after your Dec 16 order:")).toBeInTheDocument();
    expect(pendingLines()).toEqual(["Every 60 days"]);
    expect(inPlan().queryByText(/^After that/)).not.toBeInTheDocument();
    expect(within(nextOrder()).getByText("Dec 16")).toBeInTheDocument();
    expect(within(nextOrder()).getByText("$101.87")).toBeInTheDocument();
    expect(within(nextOrder()).getByText("Every 30 days")).toBeInTheDocument();
  });

  it("shows a new quantity with the total after that, and the next amount stays the same (R2, R4)", async () => {
    const user = await renderLoaded();

    await user.selectOptions(multivitamin(), "1");

    const [line] = within(pendingList()!).getAllByRole("listitem");
    // The arrow is hidden from screen readers, and a hidden "to" is read instead.
    expect(line).toHaveTextContent("2 →to 1 Multivitamin, 30 tablets");
    expect(within(line).getByText("→")).toHaveAttribute("aria-hidden", "true");
    expect(within(line).getByText("to")).not.toHaveAttribute("aria-hidden");
    // 2995 + 4495 = 7490, less 15% = 6366.5, rounded as the mock does.
    expect(inPlan().getByText("After that: $63.67 per order")).toBeInTheDocument();
    expect(within(nextOrder()).getByText("$101.87")).toBeInTheDocument();
    expect(screen.queryByText("$63.67")).not.toBeInTheDocument();
  });

  it("shows the total after that even when the server sends no next order total (R4 edge-case round)", async () => {
    const user = await renderLoaded(active({ nextChargeTotalCents: null }));

    await user.selectOptions(multivitamin(), "1");

    // Built from the item prices and the discount, so the missing next order total doesn't matter.
    expect(inPlan().getByText("After that: $63.67 per order")).toBeInTheDocument();
    expect(within(nextOrder()).queryByText("$101.87")).not.toBeInTheDocument();
  });

  it("lists every change under one intro, frequency first and products in the server's order", async () => {
    const user = await renderLoaded();

    await user.selectOptions(multivitamin(), "3");
    await user.selectOptions(vitaminD(), "2");
    await user.click(radio("Every 90 days"));

    expect(inPlan().getAllByText(/^Starting after/)).toHaveLength(1);
    expect(pendingLines()).toEqual([
      "Every 90 days",
      "1 →to 2 Vitamin D, 60 softgels",
      "2 →to 3 Multivitamin, 30 tablets",
    ]);
    // 2 × 2995 + 3 × 4495 = 19475, less 15% = 16553.75.
    expect(inPlan().getByText("After that: $165.54 per order")).toBeInTheDocument();
  });

  it("names the year when the next order is in another year", async () => {
    const user = await renderLoaded(active({ nextChargeAt: iso(2027, 0, 15) }));

    await user.click(radio("Every 60 days"));

    expect(inPlan().getByText("Starting after your Jan 15, 2027 order:")).toBeInTheDocument();
  });

  it("says 'your next order' when the server sends no date (001 R3)", async () => {
    const user = await renderLoaded(active({ nextChargeAt: null }));

    await user.click(radio("Every 60 days"));

    expect(inPlan().getByText("Starting after your next order:")).toBeInTheDocument();
  });
});

describe("setting a value back (R5)", () => {
  it("removes the frequency line when the server's frequency is picked again", async () => {
    const user = await renderLoaded();

    await user.click(radio("Every 60 days"));
    await user.click(radio("Every 30 days (current)"));

    expect(pendingList()).not.toBeInTheDocument();
    expect(discard()).not.toBeInTheDocument();
    expect(radio("Every 30 days (current)")).toHaveFocus();
  });

  it("removes only that product's line when its quantity goes back, and the total with it", async () => {
    const user = await renderLoaded();

    await user.click(radio("Every 60 days"));
    await user.selectOptions(multivitamin(), "1");
    await user.selectOptions(multivitamin(), "2");

    expect(pendingLines()).toEqual(["Every 60 days"]);
    expect(inPlan().queryByText(/^After that/)).not.toBeInTheDocument();
    expect(selectedText(multivitamin())).toBe("2 (current)");
  });
});

describe("server values outside the options (R1, R2, R5 edge-case round)", () => {
  const [vitaminDItem, multivitaminItem] = fixtures.active().items;
  const twelve = () => active({ items: [vitaminDItem, { ...multivitaminItem, quantity: 12 }] });

  it("adds a server interval of 45 as a fourth radio, in numeric order, checked and marked (current)", async () => {
    await renderLoaded(active({ intervalDays: 45 }));

    expect(
      inPlan()
        .getAllByRole("radio")
        .map((input) => input.closest("label")?.textContent),
    ).toEqual(["Every 30 days", "Every 45 days (current)", "Every 60 days", "Every 90 days"]);
    expect(radio("Every 45 days (current)")).toBeChecked();
  });

  it("lets 45 be picked back after another pick, which clears the change", async () => {
    const user = await renderLoaded(active({ intervalDays: 45 }));

    await user.click(radio("Every 60 days"));
    expect(pendingLines()).toEqual(["Every 60 days"]);
    await user.click(radio("Every 45 days (current)"));

    expect(pendingList()).not.toBeInTheDocument();
    expect(radio("Every 45 days (current)")).toBeChecked();
  });

  it("adds a server quantity of 12 after 1 to 10, selected and marked (current)", async () => {
    await renderLoaded(twelve());

    expect(
      within(multivitamin())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12 (current)"]);
    expect(selectedText(multivitamin())).toBe("12 (current)");
    // Only the item the server sent 12 for gets the extra option.
    expect(within(vitaminD()).getAllByRole("option")).toHaveLength(10);
  });

  it("shows 12 → 3 as a pending change, and picking 12 again clears it", async () => {
    const user = await renderLoaded(twelve());

    await user.selectOptions(multivitamin(), "3");
    expect(pendingLines()).toEqual(["12 →to 3 Multivitamin, 30 tablets"]);

    await user.selectOptions(multivitamin(), "12");
    expect(pendingList()).not.toBeInTheDocument();
    expect(selectedText(multivitamin())).toBe("12 (current)");
  });
});

describe("Discard changes (R5)", () => {
  it("empties every change, puts the controls back on (current), and moves focus to the heading", async () => {
    const user = await renderLoaded();
    await user.click(radio("Every 60 days"));
    await user.selectOptions(multivitamin(), "1");

    await user.click(discard()!);

    expect(pendingList()).not.toBeInTheDocument();
    expect(discard()).not.toBeInTheDocument();
    expect(radio("Every 30 days (current)")).toBeChecked();
    expect(selectedText(multivitamin())).toBe("2 (current)");
    expect(screen.getByRole("heading", { name: "Change your plan" })).toHaveFocus();
    expect(status()).toHaveTextContent("Changes discarded.");
  });

  it("works by keyboard", async () => {
    const user = await renderLoaded();
    await user.click(radio("Every 90 days"));

    discard()!.focus();
    await user.keyboard("{Enter}");

    expect(pendingList()).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Change your plan" })).toHaveFocus();
  });
});

describe("announcements (R6)", () => {
  it.each([
    [
      "a new frequency",
      (user: ReturnType<typeof userEvent.setup>) => user.click(radio("Every 60 days")),
      "Frequency changed to every 60 days, starting after your Dec 16 order.",
    ],
    [
      "a new quantity",
      (user: ReturnType<typeof userEvent.setup>) => user.selectOptions(multivitamin(), "1"),
      "Multivitamin, 30 tablets quantity changed from 2 to 1, starting after your Dec 16 order. After that: $63.67 per order.",
    ],
  ])("announces %s in the status region", async (_, change, text) => {
    const user = await renderLoaded();

    await change(user);

    expect(status()).toHaveTextContent(text);
  });

  it("announces a value set back to the server's", async () => {
    const user = await renderLoaded();

    await user.click(radio("Every 60 days"));
    await user.click(radio("Every 30 days (current)"));
    expect(status()).toHaveTextContent("Frequency back to every 30 days, no change pending.");

    await user.selectOptions(multivitamin(), "1");
    await user.selectOptions(multivitamin(), "2");
    expect(status()).toHaveTextContent("Multivitamin, 30 tablets quantity back to 2, no change pending.");
  });

  it("announces each arrow-key step, the newest replacing the last", async () => {
    const user = await renderLoaded();

    await user.click(radio("Every 30 days (current)"));
    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Frequency changed to every 60 days");
    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Frequency changed to every 90 days, starting after your Dec 16 order.");
  });
});

describe("with the skip flow (R3, R7, 002 R3, 002 R11)", () => {
  const dialog = () => document.querySelector("dialog")!;
  const inDialog = () => within(dialog());
  const JAN_15 = iso(2027, 0, 15);

  /** Loads, picks 60 days and Multivitamin 1, and opens the skip dialog. */
  async function openWithChanges(subscription = active()) {
    const user = await renderLoaded(subscription);
    await user.click(radio("Every 60 days"));
    await user.selectOptions(multivitamin(), "1");
    await user.click(screen.getByRole("button", { name: "Skip next order" }));
    return user;
  }

  const confirmSkip = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(inDialog().getByRole("button", { name: /^Skip .* order$/ }));

  it("adds the pending frequency to the dialog, and the new date still follows the server's 30 days (002 R3)", async () => {
    await openWithChanges();

    expect(inDialog().getByText("Every 60 days starts after that order.")).toBeInTheDocument();
    expect(inDialog().getByText(/order will be skipped/)).toHaveTextContent(
      "Your Dec 16 order will be skipped. Your next order moves to Jan 15, 2027, 30 days later on your current schedule.",
    );
  });

  it("leaves the sentence out when only a quantity is pending (002 R3)", async () => {
    const user = await renderLoaded();
    await user.selectOptions(multivitamin(), "1");
    await user.click(screen.getByRole("button", { name: "Skip next order" }));

    expect(inDialog().queryByText(/starts after that order/)).not.toBeInTheDocument();
  });

  it("clears the plan announcement when the dialog opens, so it isn't read again", async () => {
    await openWithChanges();

    expect(status()).toBeEmptyDOMElement();
  });

  it("moves 'starting after' to the new next order after a skip, and keeps every change (R3)", async () => {
    const user = await openWithChanges();
    skipApi.mockResolvedValueOnce(active({ nextChargeAt: JAN_15, updatedAt: "2026-12-10T17:00:01.000Z" }));

    await confirmSkip(user);
    await vi.waitFor(() => expect(dialog()).not.toHaveAttribute("open"));

    expect(inPlan().getByText("Starting after your Jan 15, 2027 order:")).toBeInTheDocument();
    expect(inPlan().queryByText(/Dec 16/)).not.toBeInTheDocument();
    expect(pendingLines()).toEqual(["Every 60 days", "2 →to 1 Multivitamin, 30 tablets"]);
    expect(inPlan().getByText("After that: $63.67 per order")).toBeInTheDocument();
    expect(radio("Every 60 days")).toBeChecked();
    expect(status()).toHaveTextContent("Skipped. Your next order is Jan 15, 2027.");
  });

  it("keeps every change through a 409 and its reload (002 R11)", async () => {
    const user = await openWithChanges();
    const reload = deferred<Subscription>();
    skipApi.mockRejectedValueOnce(new ApiError(409, "Subscription was modified since it was loaded"));
    getApi.mockReturnValueOnce(reload.promise);

    await confirmSkip(user);
    await settle(() => reload.resolve(active({ updatedAt: "2026-12-10T17:00:01.000Z" })));

    expect(getApi).toHaveBeenCalledTimes(2);
    expect(inDialog().getByRole("alert")).toHaveTextContent(/changed somewhere else/);
    expect(inDialog().getByText("Every 60 days starts after that order.")).toBeInTheDocument();
    expect(pendingLines()).toEqual(["Every 60 days", "2 →to 1 Multivitamin, 30 tablets"]);
    expect(radio("Every 60 days")).toBeChecked();
    expect(selectedText(multivitamin())).toBe("1");
  });

  it("keeps every change when the reload after a 409 fails too (002 R9, R11)", async () => {
    const user = await openWithChanges();
    skipApi.mockRejectedValueOnce(new ApiError(409, "Subscription was modified since it was loaded"));
    getApi.mockRejectedValueOnce(new ApiError(500, "Internal server error"));

    await confirmSkip(user);
    await inDialog().findByRole("button", { name: "Check again" });
    await user.click(inDialog().getByRole("button", { name: "Keep my order" }));

    expect(pendingLines()).toEqual(["Every 60 days", "2 →to 1 Multivitamin, 30 tablets"]);
  });

  it("stops showing a change once the fresh server has that value, and marks it (current) (R7)", async () => {
    const user = await openWithChanges();
    const reload = deferred<Subscription>();
    skipApi.mockRejectedValueOnce(new ApiError(409, "Subscription was modified since it was loaded"));
    getApi.mockReturnValueOnce(reload.promise);

    await confirmSkip(user);
    // Changed somewhere else to every 60 days, with the same products.
    await settle(() => reload.resolve(active({ intervalDays: 60, updatedAt: "2026-12-10T17:00:01.000Z" })));

    expect(inDialog().queryByText(/starts after that order/)).not.toBeInTheDocument();
    await user.click(inDialog().getByRole("button", { name: "Keep my order" }));
    expect(pendingLines()).toEqual(["2 →to 1 Multivitamin, 30 tablets"]);
    expect(radio("Every 60 days (current)")).toBeChecked();
  });

  it("drops a product the fresh server no longer has, and keeps the rest (R7)", async () => {
    const user = await openWithChanges();
    const reload = deferred<Subscription>();
    skipApi.mockRejectedValueOnce(new ApiError(409, "Subscription was modified since it was loaded"));
    getApi.mockReturnValueOnce(reload.promise);
    const [vitamin] = fixtures.active().items;

    await confirmSkip(user);
    await settle(() => reload.resolve(active({ items: [vitamin], updatedAt: "2026-12-10T17:00:01.000Z" })));
    await user.click(inDialog().getByRole("button", { name: "Keep my order" }));

    expect(pendingLines()).toEqual(["Every 60 days"]);
    expect(inPlan().queryByText(/^After that/)).not.toBeInTheDocument();
    expect(inPlan().queryByRole("combobox", { name: /Multivitamin/ })).not.toBeInTheDocument();
  });
});

describe("leaving the page (R9)", () => {
  /** What the browser does before unloading: true when a listener asked it to prompt. jsdom never unloads (plan.md). */
  const leaveIsBlocked = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("asks first while a change is pending", async () => {
    const user = await renderLoaded();
    expect(leaveIsBlocked()).toBe(false);

    await user.click(radio("Every 60 days"));
    expect(leaveIsBlocked()).toBe(true);
  });

  it("asks first with only a quantity pending", async () => {
    const user = await renderLoaded();

    await user.selectOptions(multivitamin(), "1");
    expect(leaveIsBlocked()).toBe(true);
  });

  it("stops asking after Discard changes", async () => {
    const user = await renderLoaded();
    await user.click(radio("Every 60 days"));
    await user.selectOptions(multivitamin(), "1");

    await user.click(discard()!);
    expect(leaveIsBlocked()).toBe(false);
  });

  it("stops asking once every value is set back to the server's", async () => {
    const user = await renderLoaded();
    await user.click(radio("Every 60 days"));
    await user.selectOptions(multivitamin(), "1");

    await user.click(radio("Every 30 days (current)"));
    expect(leaveIsBlocked()).toBe(true);
    await user.selectOptions(multivitamin(), "2");
    expect(leaveIsBlocked()).toBe(false);
  });

  it("stops asking when a reload shows the subscription paused, because the changes are hidden (R7)", async () => {
    const user = await renderLoaded();
    await user.click(radio("Every 60 days"));
    await user.click(screen.getByRole("button", { name: "Skip next order" }));
    const reload = deferred<Subscription>();
    skipApi.mockRejectedValueOnce(new ApiError(409, "Subscription was modified since it was loaded"));
    getApi.mockReturnValueOnce(reload.promise);

    await user.click(within(document.querySelector("dialog")!).getByRole("button", { name: /^Skip .* order$/ }));
    expect(leaveIsBlocked()).toBe(true);
    await settle(() => reload.resolve(fixtures.paused()));

    expect(screen.queryByRole("heading", { name: "Change your plan" })).not.toBeInTheDocument();
    expect(leaveIsBlocked()).toBe(false);
  });

  it("stops asking once the page is gone", async () => {
    getApi.mockResolvedValueOnce(active());
    const user = userEvent.setup();
    const { unmount } = render(<SubscriptionCard />);
    await screen.findByRole("heading", { name: "In your subscription" });
    await user.click(radio("Every 60 days"));

    unmount();
    expect(leaveIsBlocked()).toBe(false);
  });
});
