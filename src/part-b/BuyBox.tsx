// 005: the buy box. It renders the reducer's state and dispatches. The only behaviour of its own is the two DOM
// guards the reducer can't see: the wheel on the quantity field (R8) and Enter on a radio or the select (R10).
import { type FormEvent, type KeyboardEvent, type MouseEvent, useEffect, useId, useReducer, useRef } from "react";
import { formatMoney, MAX_QUANTITY, MIN_QUANTITY, type PurchaseOption } from "./buyBox";
import styles from "./BuyBox.module.css";
import { buyBoxReducer, initialState, total } from "./buyBoxReducer";
import { copy } from "./copy";
import { CheckCircleIcon, CheckIcon, ChevronIcon, MinusIcon, PlusIcon, StarIcon } from "./icons";

/** R4: a click on these is theirs, so the card's own click handler leaves it alone. */
const CONTROLS = "input, select, label, button, a";

/** R10: set on both radios and the select, where Enter must never submit. Chromium submits on Enter in a radio. */
const guardEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") event.preventDefault();
};

export function BuyBox() {
  const [state, dispatch] = useReducer(buyBoxReducer, initialState);
  const id = useId();
  const quantityRef = useRef<HTMLInputElement>(null);

  // R8: React's onWheel is passive and can't cancel the event, so a native non-passive listener does it.
  useEffect(() => {
    const field = quantityRef.current;
    if (!field) return;
    const guard = (event: WheelEvent) => {
      if (document.activeElement === field) event.preventDefault();
    };
    field.addEventListener("wheel", guard, { passive: false });
    return () => field.removeEventListener("wheel", guard);
  }, []);

  const subscribed = state.option === "subscribe";
  const totalText = formatMoney(total(state));
  const choose = (option: PurchaseOption) => dispatch({ type: "option/chosen", option });

  /** R4: the card's padding selects its option, and focus goes to its radio, the keyboard path. */
  const onCardClick = (option: PurchaseOption) => (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest(CONTROLS)) return;
    choose(option);
    event.currentTarget.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
  };

  // R10, R11: Enter in the field submits without a blur, so `cart/added` runs the correction itself.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: "cart/added" });
  };

  const { correction, summary, seq } = state.status;

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.photoCard}>
          <img className={styles.photo} src="/product.jpg" alt={copy.photoAlt} width={500} height={500} />
        </div>

        <div className={styles.box}>
          <p className={styles.eyebrow} data-contrast-exception="">
            {copy.eyebrow}
          </p>
          <p className={styles.rating}>
            <span className={styles.stars} aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} />
              ))}
              {copy.rating}
            </span>
            <span className={styles.visuallyHidden}>{copy.ratingLabel(copy.rating)}</span>{" "}
            <a className={styles.reviews} href="#reviews" data-contrast-exception="">
              {copy.reviewCount}
            </a>
          </p>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
          <hr className={styles.divider} />

          <form className={styles.form} noValidate onSubmit={onSubmit}>
            <fieldset className={styles.options}>
              <legend className={styles.visuallyHidden}>{copy.optionsLegend}</legend>

              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the radio is the keyboard path; this is only a larger pointer target (R4) */}
              <div className={styles.card} onClick={onCardClick("one-time")}>
                <label className={styles.header}>
                  <input
                    className={styles.radio}
                    type="radio"
                    name={`${id}-option`}
                    value="one-time"
                    checked={!subscribed}
                    onChange={() => choose("one-time")}
                    onKeyDown={guardEnter}
                  />
                  <span className={styles.label}>{copy.oneTime.label}</span>{" "}
                  <span className={styles.price}>{formatMoney(copy.oneTime.priceCents)}</span>
                </label>
              </div>

              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the radio is the keyboard path; this is only a larger pointer target (R4) */}
              <div className={styles.card} onClick={onCardClick("subscribe")}>
                <label className={styles.header}>
                  <input
                    className={styles.radio}
                    type="radio"
                    name={`${id}-option`}
                    value="subscribe"
                    checked={subscribed}
                    onChange={() => choose("subscribe")}
                    onKeyDown={guardEnter}
                  />
                  <span className={styles.label}>{copy.subscribe.label}</span>{" "}
                  <span className={styles.badge}>{copy.subscribe.badge}</span>{" "}
                  <span className={styles.prices}>
                    <span className={styles.price}>{formatMoney(copy.subscribe.priceCents)}</span>{" "}
                    <s className={styles.compare} data-contrast-exception="">
                      {/* The space is outside the hidden span: inside it, the name would read "originally$29.95". */}
                      <span className={styles.visuallyHidden}>{copy.originally}</span>{" "}
                      {formatMoney(copy.subscribe.comparePriceCents)}
                    </s>
                  </span>
                </label>

                {/* R5: removed, not hidden, so Tab and screen readers can't reach it. */}
                {subscribed && (
                  <div className={styles.details}>
                    <div className={styles.frequency}>
                      <label htmlFor={`${id}-frequency`}>{copy.subscribe.frequencyLabel}</label>
                      <span className={styles.selectWrap}>
                        <select
                          id={`${id}-frequency`}
                          className={styles.select}
                          value={state.frequency}
                          onChange={(event) => dispatch({ type: "frequency/chosen", frequency: event.target.value })}
                          onKeyDown={guardEnter}
                        >
                          {copy.subscribe.frequencyOptions.map((frequency) => (
                            <option key={frequency} value={frequency}>
                              {frequency}
                            </option>
                          ))}
                        </select>
                        <ChevronIcon />
                      </span>
                    </div>
                    <ul className={styles.perks}>
                      {copy.subscribe.perks.map((perk) => (
                        <li key={perk}>
                          <CheckIcon />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </fieldset>

            <div className={styles.purchaseRow}>
              <div className={styles.stepper}>
                {/* R8: a step at a limit is ignored by the reducer, and aria-disabled keeps the button focusable. */}
                <button
                  type="button"
                  className={styles.step}
                  aria-label={copy.quantity.decrease}
                  aria-disabled={state.quantity <= MIN_QUANTITY}
                  onClick={() => dispatch({ type: "quantity/stepped", by: -1 })}
                >
                  <MinusIcon />
                </button>
                <label className={styles.visuallyHidden} htmlFor={`${id}-quantity`}>
                  {copy.quantity.label}
                </label>
                <input
                  ref={quantityRef}
                  id={`${id}-quantity`}
                  className={styles.quantity}
                  type="number"
                  inputMode="numeric"
                  min={MIN_QUANTITY}
                  max={MAX_QUANTITY}
                  step={1}
                  value={state.draft}
                  onChange={(event) => dispatch({ type: "quantity/typed", draft: event.target.value })}
                  onBlur={() => dispatch({ type: "quantity/committed" })}
                />
                <button
                  type="button"
                  className={styles.step}
                  aria-label={copy.quantity.increase}
                  aria-disabled={state.quantity >= MAX_QUANTITY}
                  onClick={() => dispatch({ type: "quantity/stepped", by: 1 })}
                >
                  <PlusIcon />
                </button>
              </div>
              <button type="submit" className={styles.addToCart}>
                {copy.addToCart} <span aria-hidden="true">{copy.separator}</span> {totalText}
              </button>
            </div>

            {/* R10, R11: always mounted. The keyed span makes a repeated message a new node, so it's announced. */}
            <p role="status" className={styles.status}>
              {(correction !== null || summary !== null) && (
                <span key={seq}>
                  {correction}
                  {correction !== null && summary !== null && " "}
                  {summary}
                </span>
              )}
            </p>
          </form>

          <ul className={styles.trust}>
            {copy.trust.map((point) => (
              <li key={point}>
                <CheckCircleIcon />
                {point}
              </li>
            ))}
          </ul>

          {/* R9: a one-time purchase doesn't renew. */}
          {subscribed && (
            <p className={styles.finePrint} data-contrast-exception="">
              {copy.renewalNotice(state.frequency, totalText)}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
