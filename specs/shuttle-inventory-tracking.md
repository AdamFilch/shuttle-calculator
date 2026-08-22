# Shuttle Inventory Tracking (Purchases & Stock)

## Status
Phases A-C implemented (schema, services, UI). Phase D (manual verification) not yet run — this environment has no working simulator/web target for this app (web target hits a pre-existing, unrelated expo-sqlite/wasm bundling gap; no iOS/Android simulator available here). Needs a manual pass on a real device or working simulator before calling this done.

## Motivation

Today `shuttles` is a flat type-definition row (`name, total_price, num_of_shuttles`) with no purchase history and no stock tracking. `num_of_shuttles` is only ever used as a divisor — `total_price / num_of_shuttles` — at session-close time (`services/session.ts:228`) to get a per-unit price. Every shuttle actually *used* already creates a `shuttle_instances` row (`services/match.ts:44-53`), so consumption is already tracked event-by-event; there's just nothing to subtract it from, and no way to record buying more of an existing type without creating a duplicate `shuttles` row (which would split "Yonex AS-50" into two unrelated types and break the "reused" grouping).

The manager wants the Shuttles tab to work like real inventory: each time a shuttle gets used in a match, it comes off the count of what's left; buying another container of the same shuttle adds to what's left instead of creating a new type.

## Decisions assumed (flag if wrong)

1. **Price is fixed per shuttle type, set once at creation.** `shuttles.total_price`/`num_of_shuttles` (today's fields) keep meaning "the reference price for this type" — e.g. "$12 for a dozen = $1/shuttle" — and never change per purchase. This was a deliberate simplification (confirmed in discussion) over letting each container carry its own price:
   - `createNewMatch` and `closeSession` need **no changes** — both already read price off `shuttles.total_price/num_of_shuttles` directly, and that stays true.
   - `shuttle_instances` needs **no schema change** — it isn't tied to a specific purchase, since price doesn't depend on which container a shuttle came from.
   - Trade-off: if the real-world price genuinely rises later, there's no way to record that without editing the type's original price (which then applies to any future match, per the existing — unchanged — behavior of reading price live at session-close time). Accepted for now.
2. **A "container" = one purchase/restock event**, recorded in a new `shuttle_purchases` table (`shuttle_id, num_of_shuttles, date` — no price column, since price lives once on the type). Buying the same type again always inserts a new row here, never edits an existing one or the `shuttles` row.
3. **Usage is already tracked — nothing new needed there.** Every used shuttle already creates a `shuttle_instances` row tied to `shuttle_id` (`services/match.ts:44-53`). Total used for a type = `COUNT(shuttle_instances WHERE shuttle_id = X)`, unchanged. The only missing piece is the *purchased* side, which `shuttle_purchases` supplies.
4. **The Shuttles tab shows one row per type**, not one row per purchase. Buying again does not create a second "Yonex AS-50" entry — it adds a row to `shuttle_purchases` under the existing type, which the list aggregates. Row format:
   ```
   Yonex AS-50 ×2                    <- name × number of times purchased
   $1.00/shuttle · 19 remaining      <- fixed price · remaining stock
   ```
5. **Running out doesn't block match creation.** If a match uses more than currently remains for a type, it's still allowed — remaining just goes negative, a visual "you're out, go buy more" signal rather than a hard stop.
6. **Reused/Free selections are unaffected.** Reusing an existing instance in a later match doesn't touch stock (no new physical shuttle consumed). A Free selection never touches stock or `shuttle_purchases` at all, same as today.
7. **Low-stock status uses fixed absolute thresholds, not a percentage.** A percentage against lifetime total purchased was considered and rejected — it never resets, so a type with enough purchase history stays permanently in the warning/red zone even right after restocking. Absolute counts on `remaining` avoid that entirely:
   - `remaining <= 1` → **red** (out of stock, or exactly one left) — `bg-error-100` / `border-error-300` / `text-error-700`
   - `remaining == 2` → **yellow/warning** — `bg-warning-100` / `border-warning-300` / `text-warning-700`
   - `remaining >= 3` → normal row styling, unchanged

   Colors reuse the existing tinted-badge convention from `DebtChip` (`components/shared/DebtChip.tsx`) and the theme's existing `error-*`/`warning-*`/`success-*` tokens (`tailwind.config.js`) — no new design tokens needed.

## Scope

**In scope:**
- New `shuttle_purchases` table: one row per restock event, keyed to a `shuttles` type, quantity + date only (no price — see Decision 1).
- `services/shuttle.ts`: `createShuttle` also seeds the first `shuttle_purchases` row; new `addShuttlePurchase()` for "buy again"; new `fetchAllShuttlesWithInventory()` returning, per type, remaining stock + purchase count for the list screen.
- Shuttles tab: per-type "×N purchased" + remaining-stock display, and a "Buy Again" action that adds a restock row to an existing type.

**Explicitly out of scope:**
- Per-container/variable pricing, and anything that follows from it (FIFO cost attribution, locking a price to a specific purchase) — ruled out by Decision 1.
- Editing or deleting a past purchase record (no correction UI for a mis-entered restock).
- Any alert/notification when stock goes negative — the tab display going negative *is* the signal.
- Changing how "reused" or "free" shuttle selection works in the match-creation modal, or anything in `createNewMatch`/`closeSession` — both are correct as-is under a fixed-price model.

## Data Model

Following the repo's established convention — bake schema changes into `CREATE TABLE IF NOT EXISTS`, never `ALTER TABLE` (per `specs/shuttle-instance-settlement.md`'s "Schema-change convention" pattern). This is a purely additive change (one new table, `shuttles`/`shuttle_instances` untouched) but per the project's no-migrations convention, a fresh table only appears after Settings → Reset Database.

```sql
-- shuttles: NO CHANGE. total_price/num_of_shuttles remain the fixed reference price
-- for this type (Decision 1) -- e.g. "$12 for 12 = $1/shuttle" -- set once at creation.

-- One row = one purchase/restock event for a shuttle type. Quantity only; price is
-- fixed on the shuttles row above, so it isn't repeated here (Decision 1).
CREATE TABLE IF NOT EXISTS shuttle_purchases (
  shuttle_purchase_id INTEGER PRIMARY KEY NOT NULL,
  shuttle_id INTEGER NOT NULL,
  num_of_shuttles INTEGER NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shuttle_id) REFERENCES shuttles(shuttle_id)
);

-- shuttle_instances: NO CHANGE. Still just (shuttle_instance_id, session_id, shuttle_id,
-- date) -- not tied to a specific purchase, since price doesn't vary by container.
```

`dropDatabase()` gains `DROP TABLE IF EXISTS shuttle_purchases;`. New index: `idx_shuttle_purchases_shuttle ON shuttle_purchases(shuttle_id)`.

Remaining stock for a type, derived (not stored):
```
total_purchased(shuttle_id) = SUM(shuttle_purchases.num_of_shuttles WHERE shuttle_id = X)
total_used(shuttle_id)      = COUNT(shuttle_instances WHERE shuttle_id = X)   -- unchanged, existing table
remaining(shuttle_id)       = total_purchased - total_used
times_purchased(shuttle_id) = COUNT(shuttle_purchases WHERE shuttle_id = X)   -- the "×2" in the row title
```

## Service Changes

| File | Change |
|---|---|
| `services/shuttle.ts` | `createShuttle({name, total_price, num_of_shuttles})`: unchanged inputs/signature, but becomes a transaction — insert into `shuttles` as today, then insert a `shuttle_purchases` row (`shuttle_id`, `num_of_shuttles`) to seed initial stock with the same quantity. New `addShuttlePurchase({shuttle_id, num_of_shuttles})` — the "buy again" action, one insert, no price. New `fetchAllShuttlesWithInventory()` — per type: `name`, `total_price`, `num_of_shuttles` (for the fixed per-unit price), `remaining`, `times_purchased`, per the formulas above. |
| `services/match.ts` | No change — `createNewMatch`'s `'new'` mode keeps inserting `shuttle_instances` exactly as today. |
| `services/session.ts` | No change — `closeSession`'s pricing lookup keeps reading `shuttles.total_price/num_of_shuttles` exactly as today. |
| `services/database.js` | Add `shuttle_purchases` table + index; update `dropDatabase()`. |

## UI Changes

| File | Change |
|---|---|
| `app/(tabs)/shuttles/index.tsx` | Use `fetchAllShuttlesWithInventory()`; each `ListRow` title becomes `"{name} ×{times_purchased}"`, subtitle becomes `"${price}/shuttle · {remaining} remaining"`; add a "Buy Again" button in the row's existing `trailing` slot, opening the new purchase modal for that `shuttle_id`. Row border/background reflects low-stock status per Decision 7 (red at `remaining <= 1`, yellow at `remaining == 2`, normal otherwise) — same conditional-className mechanism `ListRow` already uses for its `selected` state. |
| `components/shuttle/buyAgainModal.tsx` (new) | Small modal mirroring `AddShuttleModal`'s form, but quantity-only (no price field, per Decision 1), scoped to one existing `shuttle_id`; calls `addShuttlePurchase`. |
| `components/shuttle/modal.tsx` | No change — still calls `createShuttle({name, total_price, num_of_shuttles})`, which now also seeds the first purchase underneath. |

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Schema-change convention | `specs/shuttle-instance-settlement.md` "Schema-change convention" | New table baked into `CREATE TABLE IF NOT EXISTS`, never `ALTER TABLE`; accepted trade-off is requiring Reset Database. |
| Aggregate-from-events, not stored counters | `shuttle_instances` already derives "quantity used" via `COUNT(*)` rather than a mutable counter column (`services/shuttle.ts` `fetchAllShuttlesBySessionId`) | Remaining stock is likewise always derived (`SUM(purchases) - COUNT(instances)`), never a stored/decremented column — avoids drift between the count and the event log. |
| Row-level trailing action | `ListRow`'s existing `trailing?: React.ReactNode` slot (`components/layout/ListRow.tsx:22`) | "Buy Again" button goes here, no new list-row variant needed. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Fixed price can't represent a real price change over time | Accepted (Decision 1) | Deliberate simplification; revisit only if it becomes a real pain point in practice. |
| Negative remaining stock reads as a bug rather than a deliberate signal if not visually distinct | Medium | Shuttles tab should visually flag negative/zero remaining (e.g. a highlighted "out of stock" state) rather than just printing a negative number — left to implementation. |
| Existing on-device data requires Reset Database to pick up the new table | Certain | Same documented workflow as every prior schema change in this repo. |

## Implementation Phases

### Phase A: Schema
- Add `shuttle_purchases` table + index; update `dropDatabase()` in `services/database.js`.

### Phase B: Services
- `services/shuttle.ts`: rewrite `createShuttle` to also seed the first purchase, add `addShuttlePurchase`, add `fetchAllShuttlesWithInventory`.

### Phase C: UI
- Shuttles tab inventory display (×N purchased, remaining stock) + low-stock status coloring (Decision 7) + "Buy Again" action + new `buyAgainModal.tsx`.

### Phase D: Manual verification
No test framework exists in this repo (per `CLAUDE.md`) — verification is manual, via `npx expo start`:
1. Settings → Reset Database (required: new table).
2. Add a shuttle type with an initial quantity (e.g. 12 @ $12 total). Confirm the Shuttles tab shows "×1" and "12 remaining".
3. Create a match using several units of it; confirm remaining drops by that amount, "×1" unchanged.
4. Buy again (a second container, e.g. +12); confirm "×2" and remaining increases by 12.
5. Deliberately over-request beyond total remaining; confirm it's allowed and remaining goes negative rather than blocking match creation, and the row shows red (per Decision 7, `remaining <= 1` covers zero and negative).
6. Use down to exactly 2 remaining; confirm the row shows yellow. Use one more down to 1 remaining; confirm it switches to red.
7. Close the session; confirm per-player amounts owed are unchanged from today's behavior (price didn't change, so this is a regression check, not new behavior).

## Acceptance
- [ ] `shuttle_purchases` table real and wired; `shuttles`/`shuttle_instances` unchanged.
- [ ] Remaining stock and purchase count (`×N`) are derived (not stored) and correct after use + repurchase.
- [ ] Shuttles tab shows one row per type (never duplicates on repurchase) with remaining stock and "Buy Again".
- [ ] Row styling reflects low-stock status per Decision 7's thresholds (red ≤1, yellow ==2, normal ≥3).
- [ ] `createNewMatch`/`closeSession` behavior is unchanged (regression-checked, not just untouched in code).
- [ ] Manual verification flow above passes.
