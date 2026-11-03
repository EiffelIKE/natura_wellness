export const copy = {
  eyebrow: "Vitamins",
  rating: "4.8",
  reviewCount: "2,316 reviews",
  title: "Vitamin D",
  subtitle: "2,000 IU (50 mcg) of vitamin D per softgel. One softgel a day, with food.",
  oneTime: { label: "One-time purchase", priceCents: 2995 },
  subscribe: {
    label: "Subscribe & save 15%",
    badge: "Best value",
    priceCents: 2546,
    comparePriceCents: 2995,
    frequencyLabel: "Delivered every",
    frequencyOptions: ["30 days", "60 days", "90 days"],
    perks: ["Skip, pause, or cancel anytime", "Free shipping on every order"],
  },
  addToCart: "Add to cart",
  trust: ["Third-party tested", "Non-GMO", "Made in the USA"],
  finePrint:
    "Your subscription renews every 30 days at $25.46 until you cancel. Skip or cancel anytime from your account.",

  // 005: everything below was added for the buy box. The keys above are the provided copy, unchanged.
  photoAlt: "Natura Wellness Vitamin D bottle, 60 softgels",
  ratingLabel: (rating: string) => `Rated ${rating} out of 5`,
  optionsLegend: "Purchase option",
  originally: "originally",
  quantity: { label: "Quantity", decrease: "Decrease quantity", increase: "Increase quantity" },
  separator: "·",
  renewalNotice: (frequency: string, total: string) =>
    `Your subscription renews every ${frequency} at ${total} until you cancel. Skip or cancel anytime from your account.`,
  added: (quantity: number, title: string, plan: string, total: string) =>
    `Added to cart: ${quantity} × ${title}, ${plan}, ${total}.`,
  planOneTime: "one-time purchase",
  planEvery: (frequency: string) => `delivered every ${frequency}`,
  quantityCorrected: (n: number, min: number, max: number) =>
    `Quantity set to ${n}. You can order ${min} to ${max} at a time.`,
};
