# Design: Shuttle Calculator

Design principles, visual system, and past decisions. Read `.claude/context/product.md` first for who the user is and why.

## Principles

1. **One-handed and glanceable.** Primary actions sit within thumb reach; key numbers are readable at arm's length.
2. **Money is always visible and explainable.** Wherever an amount appears, the user can tell what it is for and who owes it.
3. **Fewest taps for the common path.** Creating a match and recording shuttle usage is the hot path; optimise it first.
4. **Consistent patterns.** Lists use the same row component, pages use the same header, debts use the same chip. A new pattern needs a reason.
5. **Destructive and money-changing actions confirm.** Settling up, deleting, and resetting always ask first.
6. **Native iOS feel.** Follow platform conventions for navigation, sheets, and gestures.

## Visual system

- **Theme:** light only. Tokens live in `components/ui/gluestack-ui-provider/config.ts` (the light block) and are exposed to Tailwind via `tailwind.config.js`.
- **Brand accent:** teal/court-green, `primary-500` = `#0F9D82` (`15 157 130`), `primary-600` for pressed states. Use the `primary` scale by token name, never raw hex.
- **Text:** the `typography-*` scale; **surfaces:** the `background-*` scale.
- **Styling:** NativeWind classes plus Gluestack UI components from `components/ui/`.

## Shared components (reuse before creating)

- `components/layout/PageHeader.tsx`: page title header
- `components/layout/ListRow.tsx`: standard list row, with a `selected` prop for multi-select
- `components/shared/DebtChip.tsx`: amount-owed indicator
- `components/shared/StatCard.tsx`: summary metric card
- `components/shared/PaymentConfirmationDialog.tsx`: confirm before settling a payment
- `components/ui/*`: Gluestack primitives (button, input, modal, select, checkbox, toast, etc.)

## Decision log

Add an entry whenever a design decision is made or reversed. The designer agent proposes entries; the product owner accepts them.

| Date | Decision | Why |
|---|---|---|
| 2026-08-18 | Full light-theme redesign with teal `primary` accent | Replaced unstyled template screens and a hardcoded dark mode with a coherent, modern look |
| 2026-08-18 | Light only, no dark mode or system toggle | Explicit scope decision; dark mode would need its own token block and a real toggle |
| 2026-08-18 | Introduced shared PageHeader, ListRow, DebtChip, Checkbox, PaymentConfirmationDialog | Consistency across screens |
