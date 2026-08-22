# Shuttle Inventory Tracking (Purchases & Stock)

## Status
Proposed, not yet built.

## Motivation

Today `shuttles` is a flat type-definition row (`name, total_price, num_of_shuttles`) with no purchase history and no stock tracking. `num_of_shuttles` is only ever used as a divisor — `total_price / num_of_shuttles` — at session-close time (`services/session.ts:228`) to get a per-unit price. Every shuttle actually *used* already creates a `shuttle_instances` row (`services/match.ts:44-53`), so consumption is already tracked event-by-event; there's just nothing to subtract it from, and no way to record buying more of an existing type without creating a duplicate `shuttles` row (which would split "Yonex AS-50" into two unrelated types and break the "reused" grouping).

The manager wants the Shuttles tab to work like real inventory: each time a shuttle gets used in a match, it comes off the count of what's left; buying another container of the same shuttle adds to what's left instead of creating a new type.

## Decisions assumed (flag if wrong)

1. **A "container" = one purchase batch.** Buying the same shuttle type again always creates a new `shuttle_purchases` row (own price + quantity), never edits an existing one. Different containers of the same type can have different prices (e.g. a price rise between purchases) — this is intentional, not a data-entry mistake to collapse away.
2. **Stock is deducted FIFO.** When a match uses N "new" shuttles of a type, they're drawn from the oldest container that still has stock first, spilling into the next-oldest container if the first runs out mid-request. Each `shuttle_instances` row records exactly which container it came from, so the price charged to players at session close is the price of the container that specific shuttle actually came from — a later, differently-priced purchase never retroactively changes what an earlier match owes.
3. **Running out doesn't block match creation.** If a request draws more than currently remains across all containers for that type, it's allowed anyway — the excess is attributed to the most recent (last) container, and remaining stock for that type goes negative. This is a visual "you're out, go buy more" signal, not a hard stop, since the app shouldn't prevent recording a match just because inventory bookkeeping fell behind reality.
4. **"Containers remaining" for a type = count of purchase batches with remaining > 0** for that type (not a fixed container size) — matches the manager's mental model of "I have 2 containers left of this shuttle," even though batches can vary in size.
5. **Reused/Free selections are unaffected.** Reusing an existing instance in a later match doesn't touch stock (no new physical shuttle consumed). A Free selection never touches stock or `shuttle_purchases` at all, same as today.

## Scope

**In scope:**
- New `shuttle_purchases` table: one row per container bought, keyed to a `shuttles` type.
- `shuttles` becomes a pure type record (drops `total_price`/`num_of_shuttles`, keeps just `name`).
- `shuttle_instances` gains a `shuttle_purchase_id` column recording which specific container a used shuttle was drawn from (FIFO-resolved at creation time).
- `createNewMatch`'s "new" mode: FIFO batch resolution before inserting instances.
- `closeSession`'s pricing lookup: read price off the instance's linked purchase row instead of `shuttles` directly.
- Shuttles tab: per-type remaining-shuttles + remaining-containers display, and a "Buy Again" action to add a container to an existing type.
- `services/shuttle.ts`: split `createShuttle` into type-creation + first-purchase; add `addShuttlePurchase`; add an inventory-aggregating fetch for the list screen.

**Explicitly out of scope:**
- Editing or deleting a past purchase (no correction UI for a mis-entered container — same manager-trust convention as instances not being markable "broken", per `specs/shuttle-instance-settlement.md`).
- Any alert/notification when stock goes negative — the tab display going negative *is* the signal, nothing pushes a notice.
- Changing how "reused" or "free" shuttle selection works in the match-creation modal (`selectShuttleModal.tsx` needs no changes — it already just passes a `shuttleId` + `quantity` for 'new'; FIFO resolution happens server-side).

## Data Model

Following the repo's established convention — bake schema changes into `CREATE TABLE IF NOT EXISTS`, never `ALTER TABLE` (per `specs/shuttle-instance-settlement.md`'s "Schema-change convention" pattern). This is a breaking change; per the project's no-migrations convention, it requires Settings → Reset Database.

```sql
-- shuttles becomes a pure type record; price/quantity move to shuttle_purchases below.
CREATE TABLE IF NOT EXISTS shuttles (
  shuttle_id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- One row = one container bought. A shuttle type can have many purchases over time,
-- each at its own price/quantity -- this is what "buy again" appends to.
CREATE TABLE IF NOT EXISTS shuttle_purchases (
  shuttle_purchase_id INTEGER PRIMARY KEY NOT NULL,
  shuttle_id INTEGER NOT NULL,
  total_price REAL NOT NULL,
  num_of_shuttles INTEGER NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shuttle_id) REFERENCES shuttles(shuttle_id)
);

-- shuttle_instances gains shuttle_purchase_id: which specific container this physical
-- shuttle was drawn from (FIFO-resolved at match-creation time). NULL for free instances,
-- same meaning as today's NULL shuttle_id for free.
CREATE TABLE IF NOT EXISTS shuttle_instances (
  shuttle_instance_id INTEGER PRIMARY KEY NOT NULL,
  session_id INTEGER NOT NULL,
  shuttle_id INTEGER,
  shuttle_purchase_id INTEGER,
  date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id),
  FOREIGN KEY (shuttle_id) REFERENCES shuttles(shuttle_id),
  FOREIGN KEY (shuttle_purchase_id) REFERENCES shuttle_purchases(shuttle_purchase_id)
);
```

`dropDatabase()` gains `DROP TABLE IF EXISTS shuttle_purchases;`. New index: `idx_shuttle_purchases_shuttle ON shuttle_purchases(shuttle_id)`, and `idx_shuttle_instances_purchase ON shuttle_instances(shuttle_purchase_id)`, alongside the existing `shuttle_instances`/`shuttle_payments` indexes.

Remaining stock for a type, derived (not stored):
```
remaining_shuttles(shuttle_id) = SUM(shuttle_purchases.num_of_shuttles WHERE shuttle_id = X)
                                - COUNT(shuttle_instances WHERE shuttle_id = X AND shuttle_purchase_id IS NOT NULL)
remaining_containers(shuttle_id) = COUNT of that type's shuttle_purchases rows whose own
                                    (num_of_shuttles - instances drawn from that specific row) > 0
```

## FIFO Allocation (match creation)

`createNewMatch`'s `'new'` mode (`services/match.ts:42-53`), per unit requested:
1. Fetch this type's `shuttle_purchases`, oldest first (`ORDER BY shuttle_purchase_id ASC`), each with its own remaining (`num_of_shuttles - COUNT(shuttle_instances already drawn from it)`).
2. Walk the list, consuming from each purchase until its remaining hits 0, moving to the next.
3. If total requested exceeds all remaining stock (Decision 3), attribute the overflow to the **last** purchase row in the list (most recent container) regardless of its remaining count going negative.
4. Insert one `shuttle_instances` row per unit with `shuttle_id` and the resolved `shuttle_purchase_id`, same as today's loop just with the added column.

This replaces the current unconditional `shuttle_id` stamp with a per-unit resolved `shuttle_purchase_id`, inside the same transaction `createNewMatch` already opens.

## Session Close (pricing change only)

`closeSession` (`services/session.ts:151-249`) currently looks up `priceByShuttleId` from `shuttles.total_price/num_of_shuttles` (lines 184-193) and applies one price per shuttle *type* to every instance of that type (line 228). This changes to price per **purchase**:
- Replace the `shuttles`-keyed lookup with a `shuttle_purchases`-keyed one: fetch `total_price, num_of_shuttles` for every distinct `shuttle_purchase_id` referenced by this session's payable instances.
- `pricePerUnit` for an instance = its own purchase's `total_price / num_of_shuttles`, not a type-wide constant.
- Everything else in the function (distinct-players-per-instance, even split, `.toFixed(2)`, transaction shape) is unchanged.

## Service Changes

| File | Change |
|---|---|
| `services/shuttle.ts` | `Shuttle` type drops `total_price`/`num_of_shuttles`. `createShuttle({name, total_price, num_of_shuttles})` becomes a transaction: insert into `shuttles`, then insert the first `shuttle_purchases` row — same call signature, so `AddShuttleModal` needs no changes. New `addShuttlePurchase({shuttle_id, total_price, num_of_shuttles})` — the "buy again" action, one insert. New `fetchAllShuttlesWithInventory()` returning, per type: `name`, `remaining_shuttles`, `remaining_containers`, and the most recent purchase's unit price (for display only — actual charged price is always FIFO-resolved per instance, per above). `fetchAllShuttlesBySessionId`'s per-instance price join moves from `shuttles` to `shuttle_purchases` via each instance's `shuttle_purchase_id`. |
| `services/match.ts` | `createNewMatch`: FIFO resolution described above, replacing the flat `INSERT INTO shuttle_instances (session_id, shuttle_id)` for `'new'` mode with one that also resolves and stamps `shuttle_purchase_id`. |
| `services/session.ts` | `closeSession`: pricing lookup keyed by `shuttle_purchase_id` instead of `shuttle_id`, as described above. |
| `services/database.js` | Schema changes above; `dropDatabase()` updated. |

## UI Changes

| File | Change |
|---|---|
| `app/(tabs)/shuttles/index.tsx` | Use `fetchAllShuttlesWithInventory()`; each `ListRow` subtitle shows e.g. `"$10.00/shuttle · 19 remaining · 2 containers"`; add a "Buy Again" button in the row's existing `trailing` slot, opening the new purchase modal for that `shuttle_id`. |
| `components/shuttle/buyAgainModal.tsx` (new) | Small modal mirroring `AddShuttleModal`'s form (total price + quantity inputs), scoped to one existing `shuttle_id`; calls `addShuttlePurchase`. |
| `components/shuttle/modal.tsx` | No shape change — still calls `createShuttle({name, total_price, num_of_shuttles})`, which now does type-creation + first purchase together underneath. |

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Schema-change convention | `specs/shuttle-instance-settlement.md` "Schema-change convention" | New tables/columns baked into `CREATE TABLE IF NOT EXISTS`, never `ALTER TABLE`; accepted trade-off is requiring Reset Database. |
| Nullable FK for "no batch" | `shuttle_instances.shuttle_id` (existing, for Free) | `shuttle_purchase_id` reuses the same NULL-means-free-or-not-yet-resolved convention rather than a sentinel row. |
| Aggregate-from-events, not stored counters | `shuttle_instances` already derives "quantity used" via `COUNT(*)` rather than a mutable counter column (`services/shuttle.ts` `fetchAllShuttlesBySessionId`) | Remaining stock is likewise always derived (`SUM(purchased) - COUNT(instances)`), never a stored/decremented column — avoids drift between the count and the event log. |
| Row-level trailing action | `ListRow`'s existing `trailing?: React.ReactNode` slot (`components/layout/ListRow.tsx:22`) | "Buy Again" button goes here, no new list-row variant needed. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Existing on-device shuttle/purchase data lost on schema change | Certain | Expected, documented workflow (Settings → Reset Database), consistent with every prior breaking schema change in this repo. |
| FIFO allocation loop adds per-request DB round-trips inside `createNewMatch`'s transaction | Low | Purchase counts per session are small (a handful of containers at most); no pagination/streaming needed. |
| Negative remaining stock (Decision 3) reads as a bug rather than a deliberate signal if not labeled clearly in the UI | Medium | Shuttles tab should visually flag negative/zero remaining (e.g. a highlighted "out of stock" state) rather than just printing a negative number — left to implementation, not spec'd as exact copy here. |
| `fetchAllShuttlesBySessionId`'s existing output shape (consumed by `app/session/[sessionId]/index.tsx`'s "Shuttles Used" section) must survive the join rework | Low | Same constraint already satisfied once by `specs/shuttle-instance-settlement.md`'s Phase C; this change only moves where the price comes from, not the shape returned. |

## Implementation Phases

### Phase A: Schema
- Add `shuttle_purchases`; drop `total_price`/`num_of_shuttles` from `shuttles`; add `shuttle_purchase_id` to `shuttle_instances`; update `dropDatabase()` and indexes in `services/database.js`.

### Phase B: Services
- `services/shuttle.ts`: rewrite `createShuttle`, add `addShuttlePurchase`, add `fetchAllShuttlesWithInventory`, rework `fetchAllShuttlesBySessionId`'s price join.
- `services/match.ts`: FIFO allocation in `createNewMatch`.
- `services/session.ts`: purchase-keyed pricing in `closeSession`.

### Phase C: UI
- Shuttles tab inventory display + "Buy Again" action + new `buyAgainModal.tsx`.

### Phase D: Manual verification
No test framework exists in this repo (per `CLAUDE.md`) — verification is manual, via `npx expo start`:
1. Settings → Reset Database (required: schema changed).
2. Add a shuttle type with an initial purchase (e.g. 12 @ $12).
3. Create a match using several "new" units of it; confirm remaining-shuttles drops by that amount and remaining-containers stays 1 until exhausted.
4. Buy again (a second container); confirm remaining-containers goes to 2 and remaining-shuttles increases by the new container's quantity.
5. Use enough units in another match to spill across both containers in one request; confirm the earlier (cheaper/older) container is drained first.
6. Deliberately over-request beyond total remaining; confirm it's allowed and remaining goes negative rather than blocking match creation.
7. Close the session; confirm each match's charged price matches the container its specific shuttles were actually drawn from, not a single blended type-wide price.

## Acceptance
- [ ] `shuttle_purchases` table real and wired; `shuttles` no longer stores price/quantity directly.
- [ ] `shuttle_instances.shuttle_purchase_id` resolved via FIFO at match-creation time.
- [ ] Remaining shuttles and remaining containers are derived (not stored) and correct after use + repurchase.
- [ ] `closeSession` prices each instance off its own purchase, not a type-wide constant.
- [ ] Shuttles tab shows remaining stock per type and supports "Buy Again" without creating a duplicate type.
- [ ] Manual verification flow above passes.
