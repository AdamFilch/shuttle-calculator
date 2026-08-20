# Shuttle Instance Tracking & Session-Close Settlement

## Status
Draft — not yet implemented. This is "Phase 2" referenced in `specs/court-rental-and-session-settlement.md`, now written up in full.

## Motivation

Today, shuttle cost is split unfairly: `createNewMatch` (`services/match.ts:26-74`) writes `shuttle_payments` **immediately** when a match is created, splitting a shuttle batch's cost only across that one match's players. If the same physical shuttlecock gets carried into a second match with different players, the two matches are billed independently instead of splitting one shuttlecock's cost across everyone who actually used it.

Fixing this needs the same deferred-settlement mechanism court rental already built: compute everything once, at session close, instead of immediately.

Alongside that fix, the manager needs a real way to say *how* a shuttle gets attached to a match — not just "pick a batch + quantity" every time:
1. **New** — introduce N fresh shuttlecocks from a purchased batch (today's only option).
2. **Reused** — continue using a *specific* shuttlecock that was already introduced earlier in this session, in a different match, so its cost gets shared with the new match's players too.
3. **Free** — an old/spare shuttlecock nobody's tracking cost for; contributes $0.

This requires real per-shuttlecock identity ("instances"), not just batch-level aggregate counts.

### Vestigial code this replaces

The repo already has a *stub* for this, abandoned mid-build: `services/shuttle_instances.ts` queries a `shuttle_instances` table that was never created (confirmed via full-repo grep — the table doesn't exist in `services/database.js`, and nothing calls this file's two functions; calling either would throw a SQLite "no such table" error). Likewise `ShuttleCondition` (`"New" | "Reused" | "Random"`, `services/match.ts:18`) is dead: the selection modal initializes it to `"New"` and never lets the user change it, and `createNewMatch` never reads the field even though it's passed through. Both were scaffolded in the "Redesign" commit (`9ada32d`) and never wired up. This spec finishes what they started, with real names and real wiring — `ShuttleCondition`/`shuttleCondition` get deleted, replaced by the mode type below.

## Decisions already made (from clarifying questions)

1. **Reuse is tracked at the individual shuttle-instance level**, not just a batch+session pool. Matches the existing `shuttle_instances` stub and lets a manager distinguish "shuttle #2 kept going" from "shuttle #1 broke and got replaced." Trade-off accepted: this requires a picker UI listing the session's individual shuttle units, more than a simpler pool-level model would need.
2. **The free/no-cost option is generic** — not tied to any purchased batch. Selecting it just records "a free shuttle was used" at $0 cost.

## Scope

**In scope:**
- Real `shuttle_instances` table (one row per physical shuttlecock, scoped to the session it was introduced in) and a `match_shuttle_instances` join table replacing the old aggregate `match_shuttles`.
- `shuttle_payments` re-keyed to `(shuttle_instance_id, player_id)` — no longer written during match creation; computed and locked in during `closeSession()`, alongside the court split already built there.
- New/Reused/Free selection modes in the match-creation shuttle picker.
- Updating every display/payment surface that currently reads the old per-match shuttle model (match detail, session detail "Shuttles Used", player detail, "Pay by Player", per-shuttle payoff on the player page).

**Explicitly out of scope:**
- Any UI for retiring/marking an instance as "broken" (a reused instance can always be picked from the list regardless of whether it's still physically usable — a manager-trust model, same as today).
- Enforcing that total instances created from a batch don't exceed `shuttles.num_of_shuttles` (not enforced today either).

## Data Model

All in `services/database.js`, following the same "bake into `CREATE TABLE IF NOT EXISTS`, not `ALTER TABLE`" convention already established for `sessions.status`/`closed_date` (idempotency — `setupDatabase()` runs on every app launch). This is a breaking schema change; per the project's established no-migrations convention, it requires Settings → Reset Database.

```sql
-- Finally implements the real table the orphaned services/shuttle_instances.ts anticipated.
-- One row = one physical shuttlecock, scoped to the session it was introduced in.
CREATE TABLE IF NOT EXISTS shuttle_instances (
  shuttle_instance_id INTEGER PRIMARY KEY NOT NULL,
  session_id INTEGER NOT NULL,
  shuttle_id INTEGER,              -- NULL = free/no-cost instance, not tied to any batch
  date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id),
  FOREIGN KEY (shuttle_id) REFERENCES shuttles(shuttle_id)
);

-- Replaces match_shuttles entirely. One row = this physical shuttlecock was used in this match.
-- "N shuttles used in a match" is now N rows, not a quantity column -- this is what makes
-- "reuse this specific one in a later match" meaningful (add another row, same instance id).
CREATE TABLE IF NOT EXISTS match_shuttle_instances (
  match_id INTEGER NOT NULL,
  shuttle_instance_id INTEGER NOT NULL,
  PRIMARY KEY (match_id, shuttle_instance_id),
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (shuttle_instance_id) REFERENCES shuttle_instances(shuttle_instance_id)
);

-- Replaces shuttle_payments' old (match_id, shuttle_id, player_id) key. Payment is now
-- per-instance-per-session, not per-match -- mirrors court_payments' shape exactly.
CREATE TABLE IF NOT EXISTS shuttle_payments (
  shuttle_instance_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  date_paid TIMESTAMP,
  date_created TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (shuttle_instance_id, player_id),
  FOREIGN KEY (shuttle_instance_id) REFERENCES shuttle_instances(shuttle_instance_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id)
);
```

`match_shuttles` (old aggregate table) is dropped entirely — everything it provided (e.g. "3 units of batch X used in match Y") is derivable via `COUNT(*) ... GROUP BY shuttle_id` over `match_shuttle_instances` ⋈ `shuttle_instances`. `dropDatabase()` updates to match: remove `match_shuttles`, add `shuttle_instances` and `match_shuttle_instances`. New indexes mirroring the court tables' pattern: `idx_shuttle_instances_session`, `idx_match_shuttle_instances_match`, `idx_shuttle_payments_player` (existing index name, key just changes underneath it).

`services/match.ts`: delete `ShuttleCondition` and the old `createNewMatchShuttle` type. Replace with:

```ts
export type ShuttleSelection =
  | { mode: 'new', shuttleId: number, quantity: number }
  | { mode: 'reused', shuttleInstanceId: number }
  | { mode: 'free' }
```

## Match Creation Flow (no payment computed here anymore)

`createNewMatch` (`services/match.ts:26-74`) becomes much lighter — it no longer looks up prices or writes `shuttle_payments` at all. That moves entirely to session close, matching how `bookCourt` already works: booking records price, `closeSession` computes the split. **This is the exact pattern to mirror** — see `services/court.ts` + `closeSession` in `services/session.ts:126-168`.

New payload: `{ sessionId, playersId, shuttleSelections: ShuttleSelection[] }`. For each selection, inside the existing transaction:
- `mode: 'new'` — insert `quantity` rows into `shuttle_instances` (`session_id`, `shuttle_id`), then one `match_shuttle_instances` row per newly created instance.
- `mode: 'reused'` — insert one `match_shuttle_instances` row for the given `shuttleInstanceId` (no new instance created).
- `mode: 'free'` — insert one `shuttle_instances` row with `shuttle_id = NULL`, then one `match_shuttle_instances` row.

## Session Close (Settlement) Flow

Extend `closeSession` in `services/session.ts:126-168` — it already computes `participantIds` (distinct players across the session's matches) for courts. Shuttle cost-sharing is **per instance**, so the relevant player set is the distinct players across only the matches that used *that instance* (a subset of, or equal to, the session's full participant list), not the whole-session set used for courts:

1. Fetch every `shuttle_instances` row used anywhere in this session (join `match_shuttle_instances` → `matches` where `session_id = ?`, distinct `shuttle_instance_id`).
2. For each instance:
   - If `shuttle_id IS NULL` (free) — skip, no payment rows (matches "does not cost anything").
   - Else — `pricePerUnit = shuttle.total_price / shuttle.num_of_shuttles` (same formula as today, `services/match.ts:38`).
   - Distinct players = `SELECT DISTINCT player_id FROM match_players WHERE match_id IN (SELECT match_id FROM match_shuttle_instances WHERE shuttle_instance_id = ?)`.
   - If that set is empty, skip this instance (no one to charge — doesn't block the whole close, unlike the court zero-participant guard, since this is a narrower per-instance edge case rather than a whole-session one).
   - `amountPerPlayer = (pricePerUnit / distinctPlayers.length).toFixed(2)` — same rounding convention as courts/today's shuttle split.
   - Insert one `shuttle_payments` row per distinct player.
3. Runs inside the same `BEGIN TRANSACTION` / `COMMIT` as the court settlement already there — one atomic close computes both.

## Display & Payment UI Changes

| File | Change |
|---|---|
| `components/session/match/selectShuttleModal.tsx` | Replace the single batch+quantity form with a 3-mode picker (New / Reused / Free). **New**: keep today's batch dropdown + quantity input. **Reused**: new dropdown listing this session's existing instances (needs `sessionId` threaded in as a new prop — currently not passed at all). **Free**: just a confirm, no inputs. Delete the dead `shuttleCondition` state. |
| `services/shuttle_instances.ts` | Replace the two orphaned functions with one real, used one: `fetchShuttleInstancesBySessionId(sessionId)`, returning each instance with a friendly label for the Reused picker (e.g. `${shuttle.name} #${n}` per batch, `"Free shuttle #n"` for free ones). |
| `app/session/[sessionId]/create-match/index.tsx` | `usedShuttles` state becomes `ShuttleSelection[]`; pass `sessionId` into `SelectShuttleButton`; only merge/sum quantity for repeated `'new'` selections of the same `shuttleId` (today's merge logic, lines 84-99) — `'reused'` selections dedupe by `shuttleInstanceId` instead of summing, `'free'` selections always append as distinct entries. `createNewMatch` call sends `shuttleSelections`. |
| `services/shuttle.ts` (`fetchAllShuttlesBySessionId`) | Rewrite the query to source from `match_shuttle_instances` ⋈ `shuttle_instances` instead of `match_shuttles`, but **keep the existing output shape** (`{shuttle_id, name, total_price, num_of_shuttles, total_quantity_used, matches_used_in}`) so `app/session/[sessionId]/index.tsx`'s "Shuttles Used" section needs no changes. Include free instances as a synthetic `total_price: 0` entry so they're still visible, not hidden. |
| `services/match.ts` (`fetchMatchById`) | Rework the shuttles join to go through `match_shuttle_instances` → `shuttle_instances` → `shuttles`, grouped by `shuttle_id` (or a "Free" bucket for `shuttle_id IS NULL`) with a count, so `app/session/[sessionId]/[matchId]/index.tsx`'s existing `shuttle.item.quantity_used` display keeps working unchanged. |
| `app/session/[sessionId]/[matchId]/index.tsx` | Remove the "Pay for this Match" button + `PaymentConfirmationDialog` (lines 55-73) — it's already a non-functional stub (`onConfirm` is empty today) and becomes actively misleading once shuttle debt is session-scoped rather than match-scoped. |
| `services/player.ts` (`fetchShuttlePaymentsByPlayerSessions`) | Regroup from `session → match → shuttle` to `session → shuttle_instance` (drop the match dimension from the payment grouping; optionally keep `matches_used_in: match_id[]` per instance as informational context). Replaces the `MatchesPlayed` type (`services/player.ts:69-82`) with a `ShuttleInstanceCharge` shape. |
| `services/player.ts` (`fetchAllPlayerPaymentsBySession`, `fetchAllPlayerPayments`) | Update the `shuttle_payments` joins: drop `JOIN matches m ON m.match_id = sp.match_id` (that column no longer exists); join `shuttle_instances`/`shuttles` instead, filtering by `si.session_id = ?` for the session-scoped variant — actually simpler than today, since instances are already session-scoped and no join through `matches` is needed at all. |
| `services/shuttle-payments.ts` | `payShuttleByPlayers`'s inner shuttle loop: change `UPDATE shuttle_payments ... WHERE match_id = ? AND shuttle_id = ? AND player_id = ?` to `WHERE shuttle_instance_id = ? AND player_id = ?`. Rename/rework `payShuttleByIds` (keyed by match+shuttle today) to `payShuttleInstancesByIds`, keyed by `shuttle_instance_id` + `player_id`. |
| `app/player/[playerId]/index.tsx` | Rework the "Pay Shuttles" selection UI (currently selects `MatchesPlayed` rows, lines ~100-177) to select shuttle-instance charges instead, calling the renamed pay function. |

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Deferred settlement at close | `services/session.ts:126-168` (`closeSession`, built for courts) | Direct template: booking/usage recorded immediately with no payment; a single close-time pass computes the split and writes payment rows in one transaction. Extend this same function/transaction rather than inventing a parallel mechanism. |
| Payment table shape | `court_payments` (`services/database.js`) | `(entity_id, player_id, amount_paid, date_paid, date_created)`, PK on `(entity_id, player_id)` — `shuttle_payments`'s new shape mirrors this exactly. |
| Even split + rounding | `services/session.ts` court split | `(total / distinctParticipants.length).toFixed(2)`. |
| Schema-change convention | `sessions.status`/`closed_date`, `court_bookings.quantity` | New columns/tables baked directly into `CREATE TABLE IF NOT EXISTS`, never `ALTER TABLE` (idempotency across app launches) — accepted trade-off is requiring Reset Database. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Largest, most invasive change so far — touches match creation, match detail, session detail, player detail, and 3 service files | High (by nature of the fix) | Build in order: schema → creation → close → display, so each step is checkable before the next. The close-time logic directly reuses the just-shipped court settlement pattern, reducing net-new design risk. |
| `match_shuttles` removal breaks anything still reading it | Low | Full-repo grep confirms only `services/match-shuttles.ts` (one thin, already-unused function) and the queries rewritten above touch it. |
| Free instances cluttering the "Shuttles Used" session view | Low | Shown as a distinct `$0` entry rather than hidden, per the "generic free entry" decision — visible but clearly costs nothing. |
| Deferring settlement to session close removes the ability to pay off shuttle debt mid-session (possible today, since `shuttle_payments` currently writes immediately at match creation) | Medium | Same gap courts shipped with before Phase D ("Pay Early") — see `specs/court-rental-and-session-settlement.md`. Not solved here; a per-instance equivalent of Pay Early is a candidate follow-up, not in this spec's scope. |

Future work: **partial payments** (paying a balance down over multiple installments from the player profile page) is documented as Phase E in `specs/court-rental-and-session-settlement.md`, and applies equally to this spec's re-keyed `shuttle_payments` once it adopts the same "never zero `amount_paid`" convention — not scoped here.

## Implementation Phases

### Phase A: Schema + match creation
- Add `shuttle_instances`/`match_shuttle_instances` tables, re-key `shuttle_payments`, remove `match_shuttles`, in `services/database.js` (and `dropDatabase()`).
- `services/match.ts`: replace `ShuttleCondition`/`createNewMatchShuttle` with `ShuttleSelection`; rewrite `createNewMatch` to only record instance usage, no payment.
- `services/shuttle_instances.ts`: real `fetchShuttleInstancesBySessionId`.

### Phase B: Session close settlement
- Extend `closeSession` in `services/session.ts` with the per-instance shuttle settlement pass described above, in the same transaction as the court settlement.

### Phase C: Display & payment UI
- Rework `selectShuttleModal.tsx` (3-mode picker), `create-match/index.tsx` wiring, `fetchMatchById`, `fetchAllShuttlesBySessionId`, `fetchShuttlePaymentsByPlayerSessions`, `fetchAllPlayerPaymentsBySession`/`fetchAllPlayerPayments`, `shuttle-payments.ts`, and the player detail page's "Pay Shuttles" flow, per the table above. Remove the dead "Pay for this Match" stub on the match detail page.

### Phase D: Manual verification
No test framework exists in this repo (per `CLAUDE.md`) — verification is manual, via `npx expo start`:
1. Settings → Reset Database (required: schema changed).
2. Create a session, create Match 1 with players A/B, add a **New** shuttle (batch X, qty 1).
3. Create Match 2 with players A/C, use **Reused** to pick the same shuttle instance from Match 1.
4. Add a **Free** shuttle to either match.
5. Book a court, close the session.
6. Confirm: the batch-X instance's cost is split 3 ways (A, B, C) — not charged twice to A. The free shuttle generated no charges. Match detail page still shows shuttle counts correctly. Player detail pages for A, B, C show the right per-session shuttle charge, payable via the reworked "Pay Shuttles" flow. Session's "Pay by Player" still clears both shuttle and court debt together (already built).

## Acceptance
- [ ] `shuttle_instances`, `match_shuttle_instances` tables real and wired; `match_shuttles` removed.
- [ ] `shuttle_payments` re-keyed to `(shuttle_instance_id, player_id)`; no longer written during `createNewMatch`.
- [ ] `closeSession` computes and locks in shuttle splits per-instance, across all matches that used it, alongside the existing court split, in one transaction.
- [ ] Match creation UI offers New / Reused / Free; dead `ShuttleCondition` code removed.
- [ ] Match detail, session detail "Shuttles Used", and player detail pages all reflect the new model without losing existing display capability.
- [ ] Manual verification flow above passes.
