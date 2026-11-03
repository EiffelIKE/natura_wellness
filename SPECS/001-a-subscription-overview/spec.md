# 001: Subscription overview

Status: Implemented

## Problem

Customers open "Manage my subscription", mostly on a 375px phone, to find out what is coming next or to change it.
They need to see at a glance which products ship, when they will be charged and how much. A paused or cancelled
subscription must never be mistaken for an active one.

## Requirements

- R1 Load the subscription with `getSubscription()`. While it loads (400–2500ms), show a skeleton in the shape of
  the card that is announced as "Loading your subscription".
- R2 A load failure (500) shows "We couldn't load your subscription" and a "Try again" button that loads it again.
  Loading is read-only, so retrying is safe. A 404 shows "We couldn't find a subscription on your account" and a
  contact-support link, with no retry.
- R3 Active view, in this order:
  - the status
  - the next order date (`nextChargeAt`)
  - the amount (`nextChargeTotalCents`), with a "Includes your 15% subscription discount" line based on
    `discountPercent`
  - the frequency ("Every 30 days", from `intervalDays`)
  - the products with their quantities

  If the server sends an active subscription without `nextChargeAt`, the date is replaced by "We'll confirm your
  next order date soon." Without `nextChargeTotalCents`, the amount and the discount line are left out. The page
  never fills either gap itself (R4).

- R4 Dates and amounts come only from the server. The page never calculates its own charge date or charge total for
  display, except where a later spec explicitly allows it:
  - 002 R2: the predicted skip date, `nextChargeAt + intervalDays`
  - 003 R4: the "After that" total per order
  - 004 R3: the "save {amount} per order" offer

  Money exceptions use only `totalAfterDiscount()` from `src/api/fixtures.ts`, the same function the mock uses to
  compute `nextChargeTotalCents`, so the rounding matches the server. A saving is the difference of two totals, never
  a discounted unit price. Per-line prices are not shown, so they can never disagree with the server's rounded total.

- R5 Paused view: "Paused until {pausedUntil}", the products, no skip or plan changes, and the contact line (R11).
  It is visually distinct from the active view, with the difference shown in text and not only color.
- R6 Cancelled view: "Cancelled on {cancelledAt}", the products, and no skip or plan changes. It is visually
  distinct, as in R5.
- R7 The page follows the server's status. Any local state, from 003 and 004, is shown only on top of an active
  server subscription.
- R8 Product images use `alt=""`, because the product name is right next to them. Items with a null `imageUrl`, or an
  image that fails to load, get a neutral placeholder of the same size, so rows line up. Long names wrap. A
  subscription with no items shows "There are no products in this subscription." instead of an empty list.
- R9 Formatting uses `Intl` with `en-US` and `USD`. Dates look like "Nov 8", and the year is added only when it
  differs from the current year.
- R10 The layout is mobile-first: designed at 375px with no horizontal scroll, and still good at 1200px. It also
  reflows at 320px without horizontal scroll (WCAG 1.4.10), in every state and with long names or many items. There
  is one `h1`, and the sections have headings.
- R11 Contact support is a `mailto:support@naturawellness.example` link. The `.example` domain is reserved and can
  never reach anyone, which fits a fictional brand. It is used by R2 (404), R5 (paused) and 002 R8.

## Acceptance criteria

- [x] R1: Given a slow API, when the page opens, then a skeleton shows and a screen reader hears "Loading your
      subscription".
- [x] R2: Given `?fixture=error`, when loading fails, then the error and "Try again" show, and "Try again" calls
      the API again.
- [x] R3, R4: Given `?fixture=active`, then the date, total, discount line, frequency and both products with
      their quantities show, matching the server data.
- [x] R5, R11: Given `?fixture=paused`, then "Paused until …" and the contact link show and there is no skip button.
- [x] R6: Given `?fixture=cancelled`, then "Cancelled on …" shows and there is no skip button.
- [x] R8: The Multivitamin row, which has no image, lines up with the Vitamin D row.
- [x] R3: Given an active subscription without `nextChargeAt`, then "We'll confirm your next order date soon." shows,
      and without `nextChargeTotalCents`, no amount or discount line shows.
- [x] R8: Given an image that fails to load, then the placeholder shows in its place and the rows still line up.
- [x] R8: Given no items, then "There are no products in this subscription." shows.
- [x] R10: At 375px and 1200px, axe reports no WCAG 2.2 A/AA violations and the page has no horizontal scroll.
- [x] R10: At 320px, every state, and an active card with long names and many items, has no horizontal scroll.
- [x] R2: "Try again" works by keyboard alone, with Enter and with Space.
- [x] Every state (active, paused, cancelled, error, 404) loads with no console errors.

## Out of scope

- Payment method, shipping address and order history.
- Resuming a paused subscription and restarting a cancelled one. Either would need a date the server never sent.

## Known limitations

- The mock never sends an active subscription without a date or total, an empty item list, long names or many
  items. Those cases are covered by component tests with hand-built data. The e2e layout check for long names and
  many items edits the rendered DOM (it renames and copies product rows), because `src/api` is read-only. A broken
  image is tested for real in e2e, by aborting the image request.
- The fixture's dates are relative to the current time. In the running app they change between visits. E2e tests
  pin the start time and the time zone (README, "Dates and time zones in e2e tests").
- R7's rule that the server's status wins is in place for correctness, but it is not tested. The mock never
  changes a subscription's status, so a status change cannot happen in this app.

## Open questions

None.
