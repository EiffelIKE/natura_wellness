import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSubscription } from "../api/mockApi";
import { catalog, fixtures } from "../api/fixtures";
import { ApiError, type Subscription } from "../api/types";
import { SubscriptionCard } from "./SubscriptionCard";

vi.mock("../api/mockApi", () => ({ getSubscription: vi.fn(), skipNextShipment: vi.fn() }));
const api = vi.mocked(getSubscription);

/** A promise the test settles by hand, so it controls when (and in which order) responses arrive. */
function deferred() {
  let resolve!: (subscription: Subscription) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Subscription>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Settles a deferred inside act and lets the component's .then handlers dispatch before asserting. */
const settle = (fn: () => void) =>
  act(async () => {
    fn();
    await Promise.resolve();
  });

const serverError = () => new ApiError(500, "Internal server error");
const notFound = () => new ApiError(404, "Subscription not found");
const loadingStatus = () => screen.getByRole("status");

beforeEach(() => {
  api.mockReset();
});

describe("SubscriptionCard: loading (R1)", () => {
  it("shows the heading and announces loading while the request is pending", () => {
    api.mockReturnValue(new Promise(() => {}));
    render(<SubscriptionCard />);

    expect(screen.getByRole("heading", { level: 1, name: "Manage my subscription" })).toBeInTheDocument();
    expect(loadingStatus()).toHaveTextContent("Loading your subscription");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("clears the loading status once the subscription has loaded", async () => {
    api.mockResolvedValue(fixtures.active());
    render(<SubscriptionCard />);

    await vi.waitFor(() => expect(loadingStatus()).toBeEmptyDOMElement());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("SubscriptionCard: load failure (R2)", () => {
  it("shows the error and Try again on a 500, with no contact link", async () => {
    api.mockRejectedValue(serverError());
    render(<SubscriptionCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your subscription.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Contact support" })).not.toBeInTheDocument();
    expect(loadingStatus()).toBeEmptyDOMElement();
  });

  it("treats a non-API error like a 500", async () => {
    api.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SubscriptionCard />);

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("Try again calls the API again, moves focus to the heading and announces loading", async () => {
    const user = userEvent.setup();
    const retry = deferred();
    api.mockRejectedValueOnce(serverError()).mockReturnValueOnce(retry.promise);
    render(<SubscriptionCard />);

    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(api).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(loadingStatus()).toHaveTextContent("Loading your subscription");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await settle(() => retry.resolve(fixtures.active()));
    expect(loadingStatus()).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error again when the retry also fails, with Try again as the next Tab stop", async () => {
    const user = userEvent.setup();
    api.mockRejectedValue(serverError());
    render(<SubscriptionCard />);

    await user.click(await screen.findByRole("button", { name: "Try again" }));
    const button = await screen.findByRole("button", { name: "Try again" });

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your subscription.");
    expect(api).toHaveBeenCalledTimes(2);
    await user.tab();
    expect(button).toHaveFocus();
  });
});

describe("SubscriptionCard: not found (R2, R11)", () => {
  it("shows the 404 message and the contact link, with no retry", async () => {
    api.mockRejectedValue(notFound());
    render(<SubscriptionCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't find a subscription on your account.");
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
      "href",
      "mailto:support@naturawellness.example",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});

describe("SubscriptionCard: stale responses", () => {
  it("under StrictMode, ignores the first request's late failure once the second has loaded", async () => {
    const first = deferred();
    const second = deferred();
    api.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(
      <StrictMode>
        <SubscriptionCard />
      </StrictMode>,
    );
    expect(api).toHaveBeenCalledTimes(2);

    await settle(() => second.resolve(fixtures.active()));
    await settle(() => first.reject(serverError()));

    expect(loadingStatus()).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// Local-time constructors keep the dates independent of the machine's time zone (as in format.test.ts).
const local = (year: number, monthIndex: number, day: number) => new Date(year, monthIndex, day, 12);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

/** Loads `subscription` and waits for its view. Every view ends with the products. */
async function renderLoaded(subscription: Subscription) {
  api.mockResolvedValue(subscription);
  render(<SubscriptionCard />);
  await screen.findByRole("heading", { level: 2, name: "In your subscription" });
}

/** Fails unless the elements appear in this order in the document. */
function expectInDocumentOrder(...elements: HTMLElement[]) {
  const all = Array.from(document.body.querySelectorAll("*"));
  const positions = elements.map((element) => all.indexOf(element));
  expect(positions).not.toContain(-1);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
}

const headings = () => screen.getAllByRole("heading").map((heading) => `${heading.tagName} ${heading.textContent}`);

describe("SubscriptionCard: loaded views", () => {
  beforeEach(() => {
    // Only Date is faked, so the year rule (R9) sees Dec 10, 2026 while promises and timers stay real.
    vi.useFakeTimers({ now: local(2026, 11, 10), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("active (R3, R4, R8, R10)", () => {
    const active = (overrides: Partial<Subscription> = {}) => ({
      ...fixtures.active(),
      nextChargeAt: iso(2026, 11, 16),
      ...overrides,
    });

    it("shows the status, date, amount, discount, frequency and products, in that order", async () => {
      await renderLoaded(active());

      const badge = screen.getByText("Active");
      expect(badge).toHaveTextContent("Status: Active");
      expectInDocumentOrder(
        badge,
        screen.getByText("Dec 16"),
        screen.getByText("$101.87"),
        screen.getByText("Includes your 15% subscription discount"),
        screen.getByText("Every 30 days"),
        screen.getByRole("list"),
      );
      expect(screen.getByText("Dec 16")).toHaveAttribute("datetime", iso(2026, 11, 16));
    });

    it("shows the server's date and total as sent, without recomputing them", async () => {
      // 12345 is not what totalAfterDiscount gives for these items (10187), so a computed total would show.
      await renderLoaded(active({ nextChargeAt: iso(2026, 11, 20), nextChargeTotalCents: 12345 }));

      expect(screen.getByText("Dec 20")).toBeInTheDocument();
      expect(screen.getByText("$123.45")).toBeInTheDocument();
      expect(screen.queryByText("$101.87")).not.toBeInTheDocument();
    });

    it("adds the year to a next order in another year", async () => {
      await renderLoaded(active({ nextChargeAt: iso(2027, 0, 15) }));

      expect(screen.getByText("Jan 15, 2027")).toBeInTheDocument();
    });

    it("leaves out the discount line when there is no discount", async () => {
      await renderLoaded(active({ discountPercent: 0 }));

      expect(screen.queryByText(/subscription discount/)).not.toBeInTheDocument();
    });

    it("lists each product with its quantity, an empty-alt image or a hidden placeholder", async () => {
      await renderLoaded(active());

      const [vitaminD, multivitamin] = within(screen.getByRole("list")).getAllByRole("listitem");
      expect(within(vitaminD).getByText("Vitamin D, 60 softgels")).toBeInTheDocument();
      expect(within(vitaminD).getByText("Quantity: 1")).toBeInTheDocument();
      expect(vitaminD.querySelector("img")).toHaveAttribute("alt", "");
      expect(vitaminD.querySelector("img")).toHaveAttribute("src", "/product.jpg");

      expect(within(multivitamin).getByText("Multivitamin, 30 tablets")).toBeInTheDocument();
      expect(within(multivitamin).getByText("Quantity: 2")).toBeInTheDocument();
      expect(multivitamin.querySelector("img")).not.toBeInTheDocument();
      expect(multivitamin.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

      // Decorative images and the placeholder icon stay out of the accessibility tree.
      expect(screen.queryAllByRole("img")).toHaveLength(0);
    });

    it("has one h1 and a heading for each section", async () => {
      await renderLoaded(active());

      expect(headings()).toEqual(["H1 Manage my subscription", "H2 Next order", "H2 In your subscription"]);
    });

    it("swaps an image that fails to load for the placeholder (T8)", async () => {
      await renderLoaded(active());
      const [vitaminD] = within(screen.getByRole("list")).getAllByRole("listitem");
      const image = vitaminD.querySelector("img");
      expect(image).toBeInTheDocument();

      fireEvent.error(image!);

      expect(vitaminD.querySelector("img")).not.toBeInTheDocument();
      expect(vitaminD.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
      expect(within(vitaminD).getByText("Vitamin D, 60 softgels")).toBeInTheDocument();
    });

    it("says the date will be confirmed when the server sends none, and still shows the total (T9)", async () => {
      await renderLoaded(active({ nextChargeAt: null }));

      expect(screen.getByText("We'll confirm your next order date soon.")).toBeInTheDocument();
      expect(document.querySelector("time")).not.toBeInTheDocument();
      expect(screen.getByText("$101.87")).toBeInTheDocument();
    });

    it("leaves out the amount and the discount line when the server sends no total (T9)", async () => {
      await renderLoaded(active({ nextChargeTotalCents: null }));

      expect(screen.getByText("Dec 16")).toBeInTheDocument();
      expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/subscription discount/)).not.toBeInTheDocument();
      expect(screen.queryByText(/confirm your next order/)).not.toBeInTheDocument();
    });

    it("lists every product in full, however many there are and however long their names (T10)", async () => {
      const items = catalog.map((product) => ({ ...product, quantity: 1 }));
      await renderLoaded(active({ items }));

      const rows = within(screen.getByRole("list")).getAllByRole("listitem");
      expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual(catalog.map((product) => product.name));
      expect(screen.getByText("Daily Essentials Bundle (Vitamin D, Multivitamin, Magnesium)")).toBeInTheDocument();
      // One real image (Vitamin D), and a placeholder for each of the three products without one.
      expect(rows.filter((row) => row.querySelector("img"))).toHaveLength(1);
      expect(rows.filter((row) => row.querySelector('[aria-hidden="true"]'))).toHaveLength(3);
    });

    it("says there are no products instead of rendering an empty list (T11)", async () => {
      await renderLoaded(active({ items: [] }));

      expect(screen.getByText("There are no products in this subscription.")).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("paused (R5, R11)", () => {
    const paused = () => ({ ...fixtures.paused(), pausedUntil: iso(2027, 0, 3) });

    it("shows the status, the pause end date, the contact link and the products", async () => {
      await renderLoaded(paused());

      expect(screen.getByText("Paused")).toHaveTextContent("Status: Paused");
      expect(screen.getByText(/^Paused until/)).toHaveTextContent("Paused until Jan 3, 2027");
      expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
        "href",
        "mailto:support@naturawellness.example",
      );
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
    });

    it("offers no next order, skip or plan changes", async () => {
      await renderLoaded(paused());

      expect(headings()).toEqual(["H1 Manage my subscription", "H2 In your subscription"]);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
    });

    it("follows the server's status even if next-order fields are set (R7)", async () => {
      await renderLoaded({ ...paused(), nextChargeAt: iso(2026, 11, 16), nextChargeTotalCents: 10187 });

      expect(screen.getByText(/^Paused until/)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Next order" })).not.toBeInTheDocument();
      expect(screen.queryByText("$101.87")).not.toBeInTheDocument();
    });
  });

  describe("cancelled (R6)", () => {
    const cancelled = () => ({ ...fixtures.cancelled(), cancelledAt: iso(2026, 10, 30) });

    it("shows the status, the cancel date and the products", async () => {
      await renderLoaded(cancelled());

      expect(screen.getByText("Cancelled")).toHaveTextContent("Status: Cancelled");
      expect(screen.getByText(/^Cancelled on/)).toHaveTextContent("Cancelled on Nov 30");
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
    });

    it("offers no next order, skip, plan changes or contact link", async () => {
      await renderLoaded(cancelled());

      expect(headings()).toEqual(["H1 Manage my subscription", "H2 In your subscription"]);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });
});
