// 005: buyBoxReducer, one describe per action, following plan.md's transition table.
import { describe, expect, it } from "vitest";
import { type Action, buyBoxReducer, initialState, type State, summaryOf, total } from "./buyBoxReducer";
import { copy } from "./copy";

const run = (actions: Action[], from: State = initialState) => actions.reduce(buyBoxReducer, from);

const choose = (option: State["option"]): Action => ({ type: "option/chosen", option });
const every = (frequency: string): Action => ({ type: "frequency/chosen", frequency });
const plus: Action = { type: "quantity/stepped", by: 1 };
const minus: Action = { type: "quantity/stepped", by: -1 };
const type = (draft: string): Action => ({ type: "quantity/typed", draft });
const commit: Action = { type: "quantity/committed" };
const add: Action = { type: "cart/added" };

const corrected = (n: number) => `Quantity set to ${n}. You can order 1 to 10 at a time.`;
const emptyLine = (seq: number) => ({ correction: null, summary: null, seq });

/** A state with something on the status line, to check that a change clears it. */
const afterAdd = (from: State = initialState) => run([add], from);
const atQuantity = (n: number) => ({ ...initialState, quantity: n, draft: String(n) });

describe("initialState (R4, R6, R8, R9)", () => {
  it("is the default state: subscribe, every 30 days, quantity 1, empty line", () => {
    expect(initialState).toEqual({
      option: "subscribe",
      frequency: "30 days",
      quantity: 1,
      draft: "1",
      status: emptyLine(0),
    });
    expect(total(initialState)).toBe(2546);
  });
});

describe("option/chosen (R4, R5, R10)", () => {
  it("selects one-time and keeps the frequency for when the subscription comes back", () => {
    const state = run([every("60 days"), choose("one-time")]);
    expect(state.option).toBe("one-time");
    expect(state.frequency).toBe("60 days");
    expect(total(state)).toBe(2995);
    expect(run([choose("subscribe")], state).frequency).toBe("60 days");
  });

  it("clears the status line", () => {
    expect(run([choose("one-time")], afterAdd()).status).toEqual(emptyLine(1));
  });

  it("ignores the option already selected, so the line stays", () => {
    const state = afterAdd();
    expect(buyBoxReducer(state, choose("subscribe"))).toBe(state);
  });
});

describe("frequency/chosen (R6, R10)", () => {
  it.each(copy.subscribe.frequencyOptions)("selects %s", (frequency) => {
    expect(run([every("60 days"), every(frequency)]).frequency).toBe(frequency);
  });

  it("clears the status line", () => {
    expect(run([every("90 days")], afterAdd()).status).toEqual(emptyLine(1));
  });

  it.each(["45 days", "", "30"])("ignores %j, which isn't one of the options", (frequency) => {
    const state = afterAdd();
    expect(buyBoxReducer(state, every(frequency))).toBe(state);
  });

  it("ignores the frequency already selected, so the line stays", () => {
    const state = afterAdd();
    expect(buyBoxReducer(state, every("30 days"))).toBe(state);
  });
});

describe("quantity/stepped (R8, R9, R10)", () => {
  it("steps by 1 and the field follows", () => {
    const state = run([plus, plus]);
    expect(state).toMatchObject({ quantity: 3, draft: "3" });
    expect(total(state)).toBe(7638);
    expect(run([minus], state)).toMatchObject({ quantity: 2, draft: "2" });
  });

  it("never announces a step, so + twice leaves the line empty", () => {
    expect(run([plus, plus]).status).toEqual(emptyLine(0));
  });

  it("clears the status line", () => {
    expect(run([plus], afterAdd()).status).toEqual(emptyLine(1));
  });

  it("ignores − at 1 and + at 10, returning the same state", () => {
    expect(buyBoxReducer(initialState, minus)).toBe(initialState);
    const ten = atQuantity(10);
    expect(buyBoxReducer(ten, plus)).toBe(ten);
    expect(total(ten)).toBe(25460);
  });

  it("ignores a step at a limit even with a message on the line, which stays", () => {
    const state = afterAdd();
    expect(buyBoxReducer(state, minus)).toBe(state);
  });

  it("steps from the last valid quantity, not from an invalid draft", () => {
    expect(run([type("2"), type("15"), plus])).toMatchObject({ quantity: 3, draft: "3" });
  });
});

describe("quantity/typed (R8, R9, R10)", () => {
  it.each([
    ["1", 1],
    ["7", 7],
    ["10", 10],
    ["3.0", 3],
    ["1e1", 10],
  ])("takes %j at once, as a whole number from 1 to 10", (draft, quantity) => {
    expect(run([type(draft)])).toMatchObject({ draft, quantity });
  });

  it.each(["", "abc", "0", "11", "15", "-3", "2.6"])(
    "shows %j but keeps the last valid quantity, so every total stays (R9)",
    (draft) => {
      const state = run([type("2"), type(draft)]);
      expect(state).toMatchObject({ draft, quantity: 2 });
      expect(total(state)).toBe(5092);
    },
  );

  it("clears the status line on every keystroke", () => {
    expect(run([type("")], afterAdd()).status).toEqual(emptyLine(1));
    expect(run([type("15")], afterAdd()).status).toEqual(emptyLine(1));
  });
});

describe("quantity/committed (R8, R11)", () => {
  it.each([
    ["15", 10],
    ["11", 10],
    ["0", 1],
    ["-3", 1],
    ["2.6", 3],
    ["2.4", 2],
  ])("corrects %j to %d and says so", (draft, quantity) => {
    const state = run([type("4"), type(draft), commit]);
    expect(state).toMatchObject({ quantity, draft: String(quantity) });
    expect(state.status).toEqual({ correction: corrected(quantity), summary: null, seq: 1 });
  });

  it.each(["", "abc"])("puts %j back to the last valid quantity and says so", (draft) => {
    const state = run([type("4"), type(draft), commit]);
    expect(state).toMatchObject({ quantity: 4, draft: "4" });
    expect(state.status).toEqual({ correction: corrected(4), summary: null, seq: 1 });
  });

  it.each([
    ["1e1", "10"],
    ["05", "5"],
    ["3.0", "3"],
  ])("tidies %j to %j without a message, because the value doesn't change", (draft, tidied) => {
    const state = run([type(draft), commit]);
    expect(state).toMatchObject({ quantity: Number(tidied), draft: tidied });
    expect(state.status).toEqual(emptyLine(0));
  });

  it("ignores a valid draft, returning the same state", () => {
    const state = run([type("4")]);
    expect(buyBoxReducer(state, commit)).toBe(state);
    expect(buyBoxReducer(initialState, commit)).toBe(initialState);
  });

  it("ignores a second commit, so the correction isn't announced twice", () => {
    const state = run([type("15"), commit]);
    expect(buyBoxReducer(state, commit)).toBe(state);
  });

  it("is cleared by the next change (R11)", () => {
    const state = run([type("15"), commit]);
    expect(run([minus], state).status).toEqual(emptyLine(1));
    expect(run([type("3")], state).status).toEqual(emptyLine(1));
    expect(run([choose("one-time")], state).status).toEqual(emptyLine(1));
    expect(run([every("60 days")], state).status).toEqual(emptyLine(1));
  });
});

describe("cart/added (R10, R11)", () => {
  it("says what was added, for the spec's subscription example", () => {
    const state = run([every("60 days"), plus, add]);
    expect(state.status).toEqual({
      correction: null,
      summary: "Added to cart: 2 × Vitamin D, delivered every 60 days, $50.92.",
      seq: 1,
    });
  });

  it("says what was added, for the spec's one-time example", () => {
    expect(run([choose("one-time"), add]).status.summary).toBe(
      "Added to cart: 1 × Vitamin D, one-time purchase, $29.95.",
    );
  });

  it("changes nothing but the line: no cart, and the selection stays", () => {
    const before = run([every("90 days"), plus, plus]);
    const after = buyBoxReducer(before, add);
    expect({ ...after, status: before.status }).toEqual(before);
    expect(after.status.summary).toBe(summaryOf(before));
  });

  it("increments seq on a repeated add, so the same summary is a new node", () => {
    const once = afterAdd();
    const twice = run([add], once);
    expect(twice.status.summary).toBe(once.status.summary);
    expect([once.status.seq, twice.status.seq]).toEqual([1, 2]);
  });

  it("Enter path: corrects the draft itself, then shows the correction first and the summary after it", () => {
    const state = run([type("15"), add]);
    expect(state).toMatchObject({ quantity: 10, draft: "10" });
    expect(state.status).toEqual({
      correction: corrected(10),
      summary: "Added to cart: 10 × Vitamin D, delivered every 30 days, $254.60.",
      seq: 2,
    });
  });

  it("click path: the blur's correction comes first and the summary follows it", () => {
    const blurred = run([type("15"), commit]);
    const state = run([add], blurred);
    expect(state.status).toEqual({
      correction: corrected(10),
      summary: "Added to cart: 10 × Vitamin D, delivered every 30 days, $254.60.",
      seq: 2,
    });
  });

  it("both submit paths end on the same line", () => {
    expect(run([type("2.6"), add]).status).toEqual(run([type("2.6"), commit, add]).status);
    expect(run([type(""), add]).status).toEqual(run([type(""), commit, add]).status);
  });

  it("a cleared field adds the last valid quantity", () => {
    expect(run([type("2"), type(""), add]).status.summary).toBe(
      "Added to cart: 2 × Vitamin D, delivered every 30 days, $50.92.",
    );
  });

  it("a repeated add drops a correction that a summary already followed", () => {
    const state = run([type("15"), add, add]);
    expect(state.status).toEqual({
      correction: null,
      summary: "Added to cart: 10 × Vitamin D, delivered every 30 days, $254.60.",
      seq: 3,
    });
  });

  it("a silent tidy doesn't add a correction to the summary", () => {
    expect(run([type("1e1"), add]).status).toEqual({
      correction: null,
      summary: "Added to cart: 10 × Vitamin D, delivered every 30 days, $254.60.",
      seq: 1,
    });
  });
});
