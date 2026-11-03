// 005: BuyBox through the DOM. The rules themselves are unit-tested in buyBox.test.ts and buyBoxReducer.test.ts.
// What jsdom can't do (real Enter on a radio in Chromium, the wheel, layout, styles) is covered in e2e (T5–T8).
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { formatMoney, totalCents } from "./buyBox";
import { BuyBox } from "./BuyBox";
import { copy } from "./copy";

const oneTime = () => screen.getByRole("radio", { name: /^One-time purchase/ });
const subscribe = () => screen.getByRole("radio", { name: /^Subscribe & save 15%/ });
const frequency = () => screen.getByRole("combobox", { name: "Delivered every" });
const field = () => screen.getByRole<HTMLInputElement>("spinbutton", { name: "Quantity" });
const decrease = () => screen.getByRole("button", { name: "Decrease quantity" });
const increase = () => screen.getByRole("button", { name: "Increase quantity" });
const addToCart = () => screen.getByRole<HTMLButtonElement>("button", { name: /^Add to cart/ });
const status = () => screen.getByRole("status");
const finePrint = () => screen.queryByText(/^Your subscription renews/);
/** The card around a radio: the element whose padding is the larger pointer target (R4). */
const cardOf = (radio: HTMLElement) => radio.closest("label")!.parentElement!;

const corrected = (n: number) => `Quantity set to ${n}. You can order 1 to 10 at a time.`;

function setup() {
  const user = userEvent.setup();
  const view = render(<BuyBox />);
  return { user, ...view };
}

/** Replaces the field's text and leaves it, as a shopper typing and tabbing away. */
async function typeAndLeave(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(field());
  if (text) await user.type(field(), text);
  await user.tab();
}

describe("names and structure (R1, R3, R4, R6–R10, R13)", () => {
  it("names each radio from its header row, prices included", () => {
    setup();
    expect(screen.getByRole("group", { name: "Purchase option" })).toBeInTheDocument();
    expect(oneTime()).toHaveAccessibleName("One-time purchase $29.95");
    expect(subscribe()).toHaveAccessibleName("Subscribe & save 15% Best value $25.46 originally $29.95");
    expect(subscribe()).toBeChecked();
  });

  it("keeps the badge as written, uppercase only through CSS", () => {
    setup();
    expect(screen.getByText("Best value")).toBeInTheDocument();
  });

  it("reads the rating once, with the stars and the visible 4.8 hidden", () => {
    const { container } = setup();
    expect(screen.getAllByText("Rated 4.8 out of 5")).toHaveLength(1);
    const visible = screen.getByText(copy.rating);
    expect(visible.closest("[aria-hidden='true']")).not.toBeNull();
    expect(visible.closest("[aria-hidden='true']")!.querySelectorAll("svg")).toHaveLength(5);
    expect(container.querySelectorAll("svg:not([aria-hidden='true'])")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "2,316 reviews" })).toHaveAttribute("href", "#reviews");
  });

  it("has one h1 and a described photo", () => {
    setup();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vitamin D");
    expect(screen.getByRole("img", { name: copy.photoAlt })).toHaveAttribute("src", "/product.jpg");
  });

  it("labels the select, keeps it out of every radio's label, and lists the options in order", () => {
    setup();
    expect(frequency()).toHaveValue("30 days");
    expect(
      within(frequency())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["30 days", "60 days", "90 days"]);
    expect(frequency().closest("label")).toBeNull();
  });

  it("has a numeric quantity field between two non-submitting buttons", () => {
    setup();
    expect(field()).toHaveValue(1);
    expect(field()).toHaveAttribute("inputmode", "numeric");
    expect(field()).toHaveAttribute("min", "1");
    expect(field()).toHaveAttribute("max", "10");
    expect(decrease()).toHaveAttribute("type", "button");
    expect(increase()).toHaveAttribute("type", "button");
  });

  it("names the button with the total, with the dot hidden, in a form without native validation", () => {
    setup();
    expect(addToCart()).toHaveAccessibleName("Add to cart $25.46");
    expect(within(addToCart()).getByText(copy.separator)).toHaveAttribute("aria-hidden", "true");
    expect(addToCart()).toHaveAttribute("type", "submit");
    expect(addToCart().form!.noValidate).toBe(true);
  });

  it("renders the provided fine print in the default state, and an empty status line", () => {
    setup();
    expect(finePrint()).toHaveTextContent(copy.finePrint);
    expect(finePrint()!.textContent).toBe(copy.finePrint);
    expect(status()).toBeEmptyDOMElement();
  });

  it("marks exactly the four contrast exceptions (R14)", () => {
    const { container } = setup();
    const marked = [...container.querySelectorAll("[data-contrast-exception]")].map((node) => node.textContent);
    expect(marked).toEqual([copy.eyebrow, copy.reviewCount, "originally $29.95", copy.finePrint]);
  });
});

describe("purchase options (R4, R5, R6, R9)", () => {
  it("one-time removes the subscription details and the fine print", async () => {
    const { user } = setup();
    await user.click(oneTime());
    expect(oneTime()).toBeChecked();
    expect(screen.queryByRole("combobox")).toBeNull();
    for (const perk of copy.subscribe.perks) expect(screen.queryByText(perk)).toBeNull();
    expect(finePrint()).toBeNull();
    expect(addToCart()).toHaveAccessibleName("Add to cart $29.95");
  });

  it("keeps the frequency across a switch to one-time and back", async () => {
    const { user } = setup();
    await user.selectOptions(frequency(), "60 days");
    await user.click(oneTime());
    await user.click(subscribe());
    expect(frequency()).toHaveValue("60 days");
    expect(finePrint()).toHaveTextContent("renews every 60 days at $25.46");
  });

  it("follows the frequency in the fine print", async () => {
    const { user } = setup();
    await user.selectOptions(frequency(), "90 days");
    expect(finePrint()).toHaveTextContent("Your subscription renews every 90 days at $25.46 until you cancel.");
  });

  it("selects an option from a click on its card's padding, and focuses its radio", async () => {
    const { user } = setup();
    await user.click(cardOf(oneTime()));
    expect(oneTime()).toBeChecked();
    expect(oneTime()).toHaveFocus();
    await user.click(cardOf(subscribe()));
    expect(subscribe()).toBeChecked();
    expect(subscribe()).toHaveFocus();
  });

  it("leaves a click on the select to the select", async () => {
    const { user } = setup();
    await user.click(frequency());
    expect(frequency()).toHaveFocus();
  });

  it("moves between options with the arrow keys", async () => {
    const { user } = setup();
    subscribe().focus();
    await user.keyboard("{ArrowUp}");
    expect(oneTime()).toBeChecked();
    await user.keyboard("{ArrowDown}");
    expect(subscribe()).toBeChecked();
  });
});

describe("quantity (R8, R9, R11)", () => {
  it("+ twice: 3 in the field, $76.38 on the button and in the fine print, unit prices unchanged, line empty", async () => {
    const { user } = setup();
    await user.click(increase());
    await user.click(increase());
    expect(field()).toHaveValue(3);
    expect(addToCart()).toHaveAccessibleName("Add to cart $76.38");
    expect(finePrint()).toHaveTextContent("at $76.38");
    expect(oneTime()).toHaveAccessibleName("One-time purchase $29.95");
    expect(subscribe()).toHaveAccessibleName("Subscribe & save 15% Best value $25.46 originally $29.95");
    expect(status()).toBeEmptyDOMElement();
  });

  it("marks − unavailable at 1, and pressing it does nothing and keeps focus", async () => {
    const { user } = setup();
    expect(decrease()).toHaveAttribute("aria-disabled", "true");
    expect(increase()).toHaveAttribute("aria-disabled", "false");
    await user.click(decrease());
    expect(field()).toHaveValue(1);
    expect(decrease()).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(field()).toHaveValue(1);
    expect(decrease()).toHaveFocus();
    expect(status()).toBeEmptyDOMElement();
  });

  it("marks + unavailable at 10, and pressing it does nothing and keeps focus", async () => {
    const { user } = setup();
    for (let i = 0; i < 9; i++) await user.click(increase());
    expect(field()).toHaveValue(10);
    expect(increase()).toHaveAttribute("aria-disabled", "true");
    expect(decrease()).toHaveAttribute("aria-disabled", "false");
    await user.click(increase());
    await user.keyboard("{Enter}");
    expect(field()).toHaveValue(10);
    expect(increase()).toHaveFocus();
    expect(addToCart()).toHaveAccessibleName("Add to cart $254.60");
  });

  it("takes a typed whole number as it is typed", async () => {
    const { user } = setup();
    await user.clear(field());
    await user.type(field(), "4");
    expect(field()).toHaveFocus();
    expect(addToCart()).toHaveAccessibleName("Add to cart $101.84");
  });

  it.each([
    ["15", 10],
    ["0", 1],
    ["2.6", 3],
  ])("corrects %j to %d on blur, and shows the correction", async (text, quantity) => {
    const { user } = setup();
    await typeAndLeave(user, text);
    expect(field()).toHaveValue(quantity);
    expect(status()).toHaveTextContent(corrected(quantity));
  });

  it("restores the last valid quantity when the field is left empty", async () => {
    const { user } = setup();
    await user.click(increase());
    await typeAndLeave(user, "");
    expect(field()).toHaveValue(2);
    expect(status()).toHaveTextContent(corrected(2));
  });

  it("clears the correction on the next change", async () => {
    const { user } = setup();
    await typeAndLeave(user, "15");
    await user.click(decrease());
    expect(status()).toBeEmptyDOMElement();
  });

  it("keeps every total at the last valid quantity while a cleared field has focus", async () => {
    const { user } = setup();
    await user.click(increase());
    await user.clear(field());
    expect(field()).toHaveFocus();
    expect(addToCart()).toHaveAccessibleName("Add to cart $50.92");
    expect(finePrint()).toHaveTextContent("at $50.92");
  });

  it("stops the wheel from changing the value while the field has focus, and only then", () => {
    setup();
    expect(fireEvent.wheel(field(), { deltaY: -100 })).toBe(true);
    field().focus();
    expect(fireEvent.wheel(field(), { deltaY: -100 })).toBe(false);
    expect(field()).toHaveValue(1);
  });
});

describe("add to cart (R10, R11)", () => {
  it("shows the spec's subscription summary, and a later change clears it", async () => {
    const { user } = setup();
    await user.selectOptions(frequency(), "60 days");
    await user.click(increase());
    await user.click(addToCart());
    expect(status()).toHaveTextContent("Added to cart: 2 × Vitamin D, delivered every 60 days, $50.92.");
    await user.click(increase());
    expect(status()).toBeEmptyDOMElement();
  });

  it("shows the spec's one-time summary", async () => {
    const { user } = setup();
    await user.click(oneTime());
    await user.click(addToCart());
    expect(status()).toHaveTextContent("Added to cart: 1 × Vitamin D, one-time purchase, $29.95.");
  });

  it("15, then a click on Add to cart while the field has focus: the correction, then the summary", async () => {
    const { user } = setup();
    await user.clear(field());
    await user.type(field(), "15");
    expect(field()).toHaveFocus();
    await user.click(addToCart());
    expect(field()).toHaveValue(10);
    expect(status().textContent).toBe(
      `${corrected(10)} Added to cart: 10 × Vitamin D, delivered every 30 days, $254.60.`,
    );
  });

  it("Enter in the field with 15 corrects it, then adds, without leaving the field", async () => {
    const { user } = setup();
    await user.clear(field());
    await user.type(field(), "15{Enter}");
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue(10);
    expect(status().textContent).toBe(
      `${corrected(10)} Added to cart: 10 × Vitamin D, delivered every 30 days, $254.60.`,
    );
  });

  it.each([
    ["the one-time radio", oneTime],
    ["the subscription radio", subscribe],
    ["the frequency select", frequency],
  ])("Enter on %s is prevented and doesn't add to the cart", async (_, control) => {
    const { user } = setup();
    control().focus();
    expect(fireEvent.keyDown(control(), { key: "Enter" })).toBe(false);
    await user.keyboard("{Enter}");
    expect(status()).toBeEmptyDOMElement();
  });

  it("a repeated add replaces the status node, so it is announced again", async () => {
    const { user } = setup();
    await user.click(addToCart());
    const first = status().firstElementChild;
    await user.click(addToCart());
    const second = status().firstElementChild;
    expect(second).not.toBe(first);
    expect(second!.textContent).toBe(first!.textContent);
    expect(first!.isConnected).toBe(false);
  });
});

describe("no inline text (R1)", () => {
  /** Every string leaf in copy.ts, walked recursively, arrays included. */
  function leaves(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(leaves);
    if (value && typeof value === "object") return Object.values(value).flatMap(leaves);
    return [];
  }

  /** Every non-empty text node, and every alt and aria-label, under `root`. */
  function rendered(root: HTMLElement): string[] {
    const found: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent!.trim();
      if (text) found.push(text);
    }
    for (const element of root.querySelectorAll("[alt], [aria-label]")) {
      for (const name of ["alt", "aria-label"]) {
        const value = element.getAttribute(name);
        if (value) found.push(value);
      }
    }
    return found;
  }

  const prices = [copy.oneTime.priceCents, copy.subscribe.priceCents, copy.subscribe.comparePriceCents];

  /** The allowed set: copy.ts leaves, the formatter on copy.ts prices and the state's total, and the templates. */
  const allowed = (totalCentsNow: number, templates: string[]) =>
    new Set([
      ...leaves(copy),
      ...[...prices, totalCentsNow].map(formatMoney),
      copy.ratingLabel(copy.rating),
      ...templates,
    ]);

  const expectOnlyCopy = (root: HTMLElement, set: Set<string>) => {
    const found = rendered(root);
    expect(found).toContain(copy.title);
    expect(found.filter((text) => !set.has(text))).toEqual([]);
  };

  it("default state", () => {
    const { container } = setup();
    expectOnlyCopy(container, allowed(2546, [copy.renewalNotice("30 days", "$25.46")]));
  });

  it("one-time", async () => {
    const { user, container } = setup();
    await user.click(oneTime());
    expectOnlyCopy(container, allowed(2995, []));
  });

  it("90 days with a quantity of 3", async () => {
    const { user, container } = setup();
    await user.selectOptions(frequency(), "90 days");
    await user.click(increase());
    await user.click(increase());
    const total = formatMoney(totalCents("subscribe", 3));
    expectOnlyCopy(container, allowed(totalCents("subscribe", 3), [copy.renewalNotice("90 days", total)]));
  });

  it("after Add to cart", async () => {
    const { user, container } = setup();
    await user.click(addToCart());
    expectOnlyCopy(
      container,
      allowed(2546, [
        copy.renewalNotice("30 days", "$25.46"),
        copy.added(1, copy.title, copy.planEvery("30 days"), "$25.46"),
      ]),
    );
  });

  it("after a correction", async () => {
    const { user, container } = setup();
    await typeAndLeave(user, "15");
    const total = formatMoney(totalCents("subscribe", 10));
    expectOnlyCopy(
      container,
      allowed(totalCents("subscribe", 10), [copy.renewalNotice("30 days", total), copy.quantityCorrected(10, 1, 10)]),
    );
  });
});
