// 005: the buy box's state. Every rule in R4–R11 is a transition here, following plan.md's table.
import {
  correctQuantity,
  formatMoney,
  isValidQuantity,
  MAX_QUANTITY,
  MIN_QUANTITY,
  parseQuantity,
  type PurchaseOption,
  totalCents,
} from "./buyBox";
import { copy } from "./copy";

/** R10, R11: the status line. `seq` keys its content node, so a repeated message is a new node and is announced. */
export interface Status {
  correction: string | null;
  summary: string | null;
  seq: number;
}

export interface State {
  /** R4: "subscribe" by default. */
  option: PurchaseOption;
  /** R6: one of `copy.subscribe.frequencyOptions`. Kept while one-time is selected (R5). */
  frequency: string;
  /** R8: the last valid quantity, 1–10. Every total uses it (R9). */
  quantity: number;
  /** R8: what the field shows, possibly not valid while it has focus. */
  draft: string;
  status: Status;
}

export type Action =
  | { type: "option/chosen"; option: PurchaseOption }
  | { type: "frequency/chosen"; frequency: string }
  | { type: "quantity/stepped"; by: 1 | -1 }
  | { type: "quantity/typed"; draft: string }
  | { type: "quantity/committed" }
  | { type: "cart/added" };

export const initialState: State = {
  option: "subscribe",
  frequency: copy.subscribe.frequencyOptions[0],
  quantity: MIN_QUANTITY,
  draft: String(MIN_QUANTITY),
  status: { correction: null, summary: null, seq: 0 },
};

/** R10: "clears" means both messages go. `seq` keeps counting, so the next message is always a new node. */
const cleared = (status: Status): Status => ({ correction: null, summary: null, seq: status.seq });

/** R9: the selected option's total at the last valid quantity. */
export const total = (state: State) => totalCents(state.option, state.quantity);

/** R10: the add-to-cart summary for the current selection. */
export function summaryOf(state: State): string {
  const plan = state.option === "subscribe" ? copy.planEvery(state.frequency) : copy.planOneTime;
  return copy.added(state.quantity, copy.title, plan, formatMoney(total(state)));
}

/** R8, R11: the field's correction on blur or submit. Only a change of value is announced (plan.md). */
function commit(state: State): State {
  const corrected = correctQuantity(state.draft, state.quantity);
  const text = String(corrected);
  if (text === state.draft) return state;
  if (parseQuantity(state.draft) === corrected) return { ...state, draft: text };
  return {
    ...state,
    quantity: corrected,
    draft: text,
    status: {
      correction: copy.quantityCorrected(corrected, MIN_QUANTITY, MAX_QUANTITY),
      summary: null,
      seq: state.status.seq + 1,
    },
  };
}

export function buyBoxReducer(state: State, action: Action): State {
  switch (action.type) {
    case "option/chosen":
      if (action.option === state.option) return state;
      return { ...state, option: action.option, status: cleared(state.status) };

    case "frequency/chosen":
      if (action.frequency === state.frequency || !copy.subscribe.frequencyOptions.includes(action.frequency)) {
        return state;
      }
      return { ...state, frequency: action.frequency, status: cleared(state.status) };

    case "quantity/stepped": {
      const next = state.quantity + action.by;
      if (!isValidQuantity(next)) return state;
      return { ...state, quantity: next, draft: String(next), status: cleared(state.status) };
    }

    case "quantity/typed": {
      const n = parseQuantity(action.draft);
      return {
        ...state,
        draft: action.draft,
        quantity: isValidQuantity(n) ? n : state.quantity,
        status: cleared(state.status),
      };
    }

    case "quantity/committed":
      return commit(state);

    case "cart/added": {
      const committed = commit(state);
      const { status } = committed;
      return {
        ...committed,
        status: {
          // R11: a correction comes before the summary that follows it, but isn't repeated by a later add.
          correction: status.summary === null ? status.correction : null,
          summary: summaryOf(committed),
          seq: status.seq + 1,
        },
      };
    }
  }
}
