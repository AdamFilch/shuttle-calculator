# Court Rental & Session Settlement

## Status
Phases A, B, and C (schema, services, UI listed below) are **already implemented and shipped**. This spec has since been revised to add **progressive "Pay Early" settlement** (see that section below), which changes the already-built court settlement model — that rework is not yet implemented (tracked as Phase D).

## Motivation

Sessions currently only track shuttle cost. Clubs also pay for court time (booking N courts for a session, each at its own price), and that cost needs to be split among everyone who showed up to the session — not tied to any single match the way shuttle cost is.

While scoping this, a related fairness gap in the *existing* shuttle logic came up: `createNewMatch` (`services/match.ts`) writes `shuttle_payments` immediately per match, splitting a shuttle batch's cost only across that one match's players. If the same batch is reused across multiple matches with different (overlapping or non-overlapping) players in the same session, each match's split is computed in isolation instead of across everyone in the session who drew from that batch. Fixing that requires deferring settlement to a point after all matches are known — which is exactly what court rental also needs. So this spec introduces that deferral point (**closing a session**) as shared infrastructure, but only wires courts through it for now. Reworking shuttle settlement to use the same mechanism is called out as an explicit future phase (see [Phase 2](#phase-2-not-built-now--shuttle-settlement-rework)), not built here.

## Scope

**In scope (this spec, buildable now):**
- Book any number of courts for a session, each with its own price.
- A session lifecycle: `open` → `closed`. While open, courts/matches can be freely added/edited. Closing a session computes and locks in each participant's share of court cost.
- Session participants for the court split = distinct players across all `match_players` rows for that session's matches (per your answer below — no separate attendance/roster concept).
- Settings' "Reset Database" flow, and `dropDatabase()`/`setupDatabase()`, updated for the new tables (required by this repo's schema-change convention — see `CLAUDE.md`).

**Explicitly out of scope (documented, not built):**
- Reworking `shuttle_payments` to compute at session-close instead of at match-creation (Phase 2 below).
- A flat-rate-per-person alternative to even splitting (Phase 3 below).
- An explicit "who's attending" roster independent of matches.
- Per-court time/duration tracking, or per-court player assignment (courts are a session-level cost, not tied to specific players or matches).

## Decisions already made (from clarifying questions)

1. **Session participants = derived from matches.** A player counts toward the split if they appear in `match_players` for any match in the session. Simplest option; accepted trade-off: someone who's present but hasn't played a recorded match yet isn't counted until they do.
2. **Splits lock in at session close, not at booking time and not live-recomputed.** This diverges from the existing shuttle model (which locks in per-match, immediately) — that's the gap described above. Court rental is built against the "lock at close" model from the start; shuttle logic is retrofitted to match in Phase 2, not now.
   - **Refined by Phase D:** "not live-recomputed" still holds *per player, once settled* — a locked-in amount never changes. But settlement itself is no longer only-at-close: a player can trigger it early, using a live snapshot of the formula at that moment. Close becomes "run the same live settlement for whoever's left," not a separate one-shot calculation.

## Data model

New/changed tables in `services/database.js` (the schema source of truth — `services/schema.sql` is already stale relative to it and is not being kept in sync here, consistent with its current state).

```sql
-- sessions: status/closed_date added directly to the CREATE TABLE statement in
-- setupDatabase(), not via ALTER TABLE. ALTER TABLE ADD COLUMN isn't idempotent
-- and setupDatabase() runs on every app launch, so it would throw "duplicate
-- column name" on the second run. Baking the columns into CREATE TABLE IF NOT
-- EXISTS instead means existing on-device DBs need Reset Database to pick them
-- up (same as every other schema change in this repo, and accepted here since
-- there's no data worth preserving yet):
CREATE TABLE IF NOT EXISTS sessions (
  session_id INTEGER PRIMARY KEY NOT NULL,
  name TEXT,
  date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'closed'
  closed_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS court_bookings (
  court_booking_id INTEGER PRIMARY KEY NOT NULL,
  session_id INTEGER NOT NULL,
  label TEXT,                    -- optional, e.g. "Court 3" (mirrors shuttles.name being freeform)
  price REAL NOT NULL,           -- price per court (not the booking's total -- see quantity)
  quantity INTEGER NOT NULL DEFAULT 1, -- how many of this court/price were booked, e.g. "3 courts at RM20 each"
  date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE IF NOT EXISTS court_payments (
  court_booking_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  amount_owed REAL NOT NULL,     -- the player's LOCKED-IN share, permanent once written -- see "Pay Early" below.
                                  -- Added by the Pay Early rework (Phase D, not yet shipped). As originally
                                  -- shipped, this column doesn't exist -- the single `amount_paid` column held
                                  -- the locked share directly and was zeroed to 0 on payment.
  amount_paid REAL NOT NULL DEFAULT 0, -- how much of `amount_owed` has actually been collected. Starts at 0
                                  -- (nothing paid). Never decreases. "Fully paid" = `amount_paid = amount_owed`
                                  -- (not a separate flag, and not a zeroed value).
  date_paid TIMESTAMP,           -- NULL = nothing paid yet. Once anything's been paid, the timestamp of the
                                  -- most recent payment action (partial or full) -- informational only; compare
                                  -- `amount_paid` to `amount_owed` for the actual paid/unpaid signal.
  date_created TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (court_booking_id, player_id),
  FOREIGN KEY (court_booking_id) REFERENCES court_bookings(court_booking_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id)
);

CREATE INDEX IF NOT EXISTS idx_court_bookings_session ON court_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_court_payments_player ON court_payments(player_id);
```

As shipped, `court_payments` rows only exist once the session is closed. The "Pay Early" rework (below) changes this: a row can now be created **before** close too, the moment a player locks in their current share. `court_bookings` rows still exist as soon as a court is added regardless (price is known immediately; only the *split* is ever deferred).

`dropDatabase()` must add `court_bookings` and `court_payments` to its `DROP TABLE IF EXISTS` list.

## Cost-splitting rule (courts)

**As shipped (Phases A-C):** at session close, for each `court_bookings` row in the session, a single one-shot even split across every session participant:

```
participant_count = COUNT(DISTINCT player_id) across match_players
                     for all matches where session_id = this session
booking_total      = price * quantity
amount_per_player  = booking_total / participant_count
```

One `court_payments` row per (booking, participant), `amount_paid` = `amount_per_player.toFixed(2)` — mirroring the rounding convention already used for `shuttle_payments` in `services/match.ts:58`.

**Superseded by "Pay Early" (Phase D, not yet built):** the formula above only actually applies to whoever is still unpaid *at close time*. Players can now lock in their share earlier, at which point the formula becomes progressive — see the next section, which replaces this one as the target design.

**Edge case — zero participants:** if a session has court bookings but no player has ever appeared in a match in that session, `participant_count` is 0 and the split is undefined. `closeSession()` should reject the close with an error in this case (surfaced in the UI as "Add at least one match before closing this session") rather than silently skipping or dividing by zero. This guard still applies unchanged under Pay Early.

## Pay Early (Progressive Settlement) — Phase D, not yet built

### Motivation

As shipped, nobody can pay their share of a court booking until the whole session closes — there's no `court_payments` row for anyone before then. But a player often wants to leave early and settle up before the session (and its final participant count) is even known. The fix: let a player lock in their **current** fair share at any point, using only what's known *right now*, and never revise it later — whatever the pool looks like when more people join or leave is the remaining players' problem to divide, not something that reaches back and changes an early payer's already-settled amount.

### The formula

For a given `court_bookings` row, at any point in time:

```
known_participants   = COUNT(DISTINCT player_id) across match_players
                        for all matches in this session (same derivation as today, evaluated live)
settled_total         = SUM(amount_paid) across existing court_payments rows for this booking
unsettled_count       = known_participants - COUNT(existing court_payments rows for this booking)
booking_total         = price * quantity
current_share         = (booking_total - settled_total) / unsettled_count
```

A player paying early gets a new row inserted: `amount_owed = current_share.toFixed(2)` (their permanent locked-in share — never changes afterward, even if `known_participants` grows later) and `amount_paid` set equal to it immediately, since paying early means paying in full, right now. Whoever hasn't settled yet absorbs however the remaining pool changes.

**Worked example** (confirmed with the user): a $20 court, 4 players known at the time. One pays early: `current_share = 20/4 = $5` — row inserted with `amount_owed = 5, amount_paid = 5`. Two more players later join the session (6 known participants total). The other 5 (still-unsettled) players now share `(20 - 5) / 5 = $3` each when they settle — not recomputed from `20/6`. Total collected across all 6 people always sums to exactly $20 regardless of settlement order, since each `current_share` is computed against whatever's left in the pool at that moment.

### Session close is the same formula, applied to everyone still unsettled

`closeSession()`'s court step no longer does one fresh even split for all participants — it becomes: for each court booking, for each `known_participant` who does **not** already have a `court_payments` row (i.e., didn't pay early), compute `current_share` per the formula above and insert a row with `amount_owed = current_share`, `amount_paid = 0` (owed, not yet paid — to be settled later via the existing "Pay by Player" flow, same as today). This makes "Pay Early" and "close" the same underlying operation — just triggered per-player on demand versus for the whole remaining group at once. `closeSession` should reuse a single shared function for this rather than duplicating the formula.

### `amount_paid` / `amount_owed` split, replacing the zero-on-payment convention

This is the one real behavior change to already-shipped code beyond just courts: `payShuttleByPlayers` (`services/shuttle-payments.ts`) currently does `UPDATE court_payments SET amount_paid = 0, date_paid = ?` when a player settles up — a single column doing double duty as both "the locked share" and "the paid flag," zeroed to signal "paid." Under Pay Early, `settled_total` in the formula above needs to keep summing already-collected amounts even after they're paid, so zeroing on payment breaks the math for anyone who settles after someone else already paid.

The fix: split the single column into two. `amount_owed` holds the player's permanent locked-in share, written once at settlement time and never touched again. `amount_paid` starts at `0` and tracks how much of that has actually been collected — a full payment sets `amount_paid = amount_owed` in one step. `amount_paid === amount_owed` is the "fully paid" signal, not a separate flag or a zeroed value. `date_paid` becomes purely informational: `NULL` until the first payment, then the timestamp of the most recent payment action (partial or full) — it no longer decides paid/unpaid; comparing `amount_paid` to `amount_owed` does. Existing full-payment call sites (`payShuttleByPlayers`, and the shuttle-instance equivalents once that Phase D lands too) change from `SET amount_paid = 0, date_paid = ?` to `SET amount_paid = amount_owed, date_paid = ?`.

This has one knock-on effect that must be fixed alongside it: `services/player.ts`'s "amount owed" aggregations (`fetchAllPlayerPaymentsBySession`, `fetchAllPlayerPayments`) currently compute totals by summing `amount_paid` and relying on paid rows already being zero. Once the column splits, those sums must switch to `SUM(amount_owed - amount_paid)` (the true remaining balance) — summing `amount_paid` alone would now report how much has been *collected*, the opposite of "total owed." **This is a correctness-critical follow-up, not optional** — see Risks.

### New service function

A new function is needed to perform a single player's early settlement — e.g. `payCourtShareEarly({ courtBookingId, playerId })` in a new `services/court-payments.ts` (mirroring the existing `shuttle.ts` / `shuttle-payments.ts` split: the "item" lives in `court.ts`, the "payment action" gets its own file). It computes `current_share` per the formula, inserts one `court_payments` row with `amount_owed = current_share`, `amount_paid = current_share` (paid in full, immediately), `date_paid = NOW()`, inside a transaction (guard: reject if the player already has a row for this booking, or isn't in `known_participants`).

## Session lifecycle

- New sessions start `status = 'open'` (default).
- **While open:** matches, court bookings can be added/edited freely, same as today. As shipped, no court debt exists until close. Under Pay Early (Phase D), a player may already have a locked-in `court_payments` row from settling early, mid-session.
- **Closing a session** (`closeSession(sessionId)` in `services/session.ts`):
  1. Reject if `status != 'open'`.
  2. Compute distinct participants (query above).
  3. Reject if participants is empty and `court_bookings` is non-empty (see edge case above). A session with zero court bookings can close with zero participants — there's nothing to split.
  4. For each court booking, insert `court_payments` rows per the rule above, inside a transaction (mirror `createNewMatch`'s `BEGIN TRANSACTION` / `COMMIT` pattern in `services/match.ts:41-71`). **Under Phase D:** skip any participant who already has a row (paid early); compute `current_share` for the rest per the Pay Early formula, inserting `amount_owed = current_share, amount_paid = 0` — not a flat re-split of the full total.
  5. Set `status = 'closed'`, `closed_date = now`.
- **While closed:** "Add Match" and "Book a Court" actions are disabled in the UI. Existing debt (shuttle, now also court) still shows and can still be settled via the existing pay-by-player/pay-by-match flows.
- **Reopening:** out of scope for the first build. If a mistake needs fixing, the workaround is Settings → Reset Database (existing, destructive, whole-app) until a scoped "reopen" is designed. Flagging this as a likely near-term ask, not solving it now to keep the first cut small.

## UI changes

Mirrors existing patterns in `app/session/[sessionId]/index.tsx` and `components/session/`:

- **Session detail page** (`app/session/[sessionId]/index.tsx`):
  - Status badge next to the title (`Open` / `Closed`).
  - "Book a Court" button next to/alongside the existing "Add Match" header action — hidden or disabled when `status === 'closed'`.
  - New "Courts Booked" list section, styled like the existing "Shuttles Used" section (`index.tsx:99-114`), listing each booking's label and price.
  - "Close Session" button, visible only when open. Uses a confirmation dialog (reuse `PaymentConfirmationDialog` from `components/shared/PaymentConfirmationDialog`, already used for the pay-by-player confirm flow) since closing locks in real debt.
  - **Phase D:** each row in "Courts Booked" gets a "Pay Early" action (e.g. a button on the row, open while the session is still open) that opens a player picker scoped to that booking's not-yet-settled `known_participants`, computes `current_share` live, and confirms before writing the row (reuse `PaymentConfirmationDialog`, showing the live-computed amount).
- **New modal**, e.g. `components/session/bookCourtModal.tsx`, modeled directly on `AddSessionModal` in `components/session/modal.tsx:19-106`: a label input (optional) + a price input, "Cancel"/"Book Court" actions.
- **Player-facing totals**: `fetchAllPlayerPaymentsBySession` (`services/player.ts`) and the player debt aggregation used by `PayByPlayerModal` / player detail pages need to fold in `court_payments` alongside `shuttle_payments` once a session is closed, so "total owed" reflects both.
- **Player detail page** (`app/player/[playerId]/index.tsx`, via `fetchShuttlePaymentsByPlayerSessions`): each session's block gets a "Court cost: $X" line (that player's `court_payments` total for that session), alongside the existing per-match shuttle breakdown. Court cost is shown at the session level, not per-match, since it isn't tied to a match. Display only for now -- no "pay courts" action on this page; settling court debt still goes through "Pay by Player" on the session page.

## Patterns to mirror

| Category | Source | Pattern |
|---|---|---|
| Table + join-table shape | `services/database.js:65-97` (`shuttles` / `match_shuttles` / `shuttle_payments`) | Definition table + per-player owed-amount table with `amount_paid`/`date_paid`/`date_created` |
| Split calculation + rounding | `services/match.ts:51-61` | Even split across a filtered non-null player list, `.toFixed(2)` |
| Transaction usage | `services/match.ts:41,71` | `db.execAsync("BEGIN TRANSACTION")` / `"COMMIT"` around multi-row writes |
| Service module shape | `services/session.ts`, `services/shuttle-payments.ts` | One file per entity, `openDatabaseSync('db.db')` at module scope, exported async functions |
| Modal UI | `components/session/modal.tsx:19-106` (`AddSessionModal`) | Gluestack `Modal`/`ModalBody`/`ModalFooter`, controlled `Input`, save handler resets state and calls `onClose` |
| List section on session page | `app/session/[sessionId]/index.tsx:99-114` | `Heading` + `VStack` of `ListRow`s, conditionally rendered when non-empty |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Existing on-device DBs won't pick up new columns/tables (no migrations, `CREATE TABLE IF NOT EXISTS` only) | High (certain, by design of this repo) | Same as every prior schema change here: requires Settings → Reset Database. `sessions.status`/`closed_date` are added directly to the `CREATE TABLE` statement (not `ALTER TABLE`) specifically so `setupDatabase()` stays idempotent across app launches — see [Data model](#data-model). |
| Half-migrated settlement model: courts settle at close, shuttles still settle immediately — inconsistent until Phase 2 | Medium | Document clearly in-app or in this spec; not hidden. Acceptable as an interim state since it doesn't block correctness of court splitting itself. |
| Zero-participant close (divide by zero) | Low | Explicit guard, see edge case above. |
| Floating point drift on repeated `.toFixed(2)` splits | Low (pre-existing risk, not new) | Same rounding approach already accepted for shuttle splits; not solving broader currency-precision handling here. |
| `bookCourt()`/`createNewMatch()` have no service-layer check against `sessions.status` — only the UI hides "Add Match"/"Book a Court" once closed | Low | Considered and accepted as-is: no current code path calls these outside the UI actions that already gate on status, so there's no realistic way to hit this today. Not adding a guard now; revisit if a second entry point (e.g. deep link, bulk import) is ever added. |
| **(Phase D)** Splitting `amount_paid` into `amount_owed`/`amount_paid` silently breaks `total_owed_amount` in `services/player.ts` if the aggregation queries aren't updated in the same change | High if missed | Must ship atomically with the aggregation fix: switch every "owed" calculation from `SUM(amount_paid)` to `SUM(amount_owed - amount_paid)`. Treat this as a single change, not two — a player's collected amount would otherwise silently be reported as still-owed. |
| **(Phase D)** A player pays early, then more people join later and the remaining players' share drops below what the early payer paid — early payers may feel they "overpaid" relative to the final group | Low (accepted trade-off, not a bug) | This is the intentional cost of leaving early, confirmed with the user via the worked example. Not something to fix; worth surfacing in the Pay Early confirmation copy ("this amount is based on who's played so far and won't be adjusted later") so it's not a surprise. |

## Phase 2 (not built now) — shuttle settlement rework

Fully designed in its own spec: **`specs/shuttle-instance-settlement.md`**. Summary:

- Stop writing `shuttle_payments` inside `createNewMatch`. Instead, at session close, settle each individual shuttlecock ("instance") used anywhere in the session, splitting its cost evenly across the distinct set of players who used *that specific instance* (not per-match, and not the whole batch as one lump).
- Requires real per-shuttlecock identity — a `shuttle_instances` table (finally implementing what the currently-orphaned `services/shuttle_instances.ts` stub anticipated) plus a three-mode shuttle picker at match creation: introduce a **New** shuttlecock from a batch, **Reuse** a specific one already in play this session, or attach a **Free** no-cost one.
- This changes `services/match.ts::createNewMatch` (remove the immediate `shuttle_payments` insert) and moves that logic into the same `closeSession()` used for courts, so both settle in the same transaction.
- See `specs/shuttle-instance-settlement.md` for the full data model, match-creation flow, close-time settlement algorithm, and the display/payment UI rework this cascades into (match detail, session detail, player detail, and the "Pay Shuttles" flow).

## Phase E (not built now) — partial payments

Documented so the intent isn't lost, not part of this build. The `amount_owed`/`amount_paid` split introduced by Phase D already gives partial payments almost everything they need — "remaining balance" is just `amount_owed - amount_paid`, no separate ledger table required for that part.

- A partial payment action becomes `UPDATE ... SET amount_paid = amount_paid + ?, date_paid = ?` (add the paid-down amount, don't overwrite), capped so `amount_paid` never exceeds `amount_owed`.
- "Paid" stays `amount_paid = amount_owed`, unchanged from Phase D — no separate boolean or timestamp check needed.
- UI: player profile page gets a "pay $X toward this balance" action, alongside/instead of "mark fully paid."
- Applies equally to `court_payments` and `shuttle_payments` (and their shuttle-instance successor — see `specs/shuttle-instance-settlement.md`) once both adopt the Phase D column split.
- **Not covered by the two-column model alone**: a per-transaction history/audit trail of individual partial payments (e.g. "player paid $3 on Monday, $2 on Friday"). If that's ever wanted, it would need a separate `payment_transactions` log table alongside `amount_owed`/`amount_paid` — not required just to track the current remaining balance, only if individual payment history needs to be displayed or audited later.

**Allocation policy (decided): oldest-first.** The existing "Pay Shuttles" flow (`app/player/[playerId]/index.tsx`) already lets a player select outstanding rows spanning multiple sessions and pay them in one action — a partial payment amount needs a rule for which selected rows it applies to:

1. Sort the outstanding rows being paid **oldest → newest** (by `date_created`, or the owning session's date).
2. Walk the list in that order, applying the payment amount to each row's remaining balance (`amount_owed - amount_paid`) in turn:
   - If the payment covers a row's full remaining balance, `amount_paid` is set to `amount_owed` (fully paid), subtract the remaining balance from the payment amount, and move to the next (newer) row.
   - Once the remaining payment amount is smaller than a row's remaining balance, `amount_paid` increases by whatever's left — a plain deduction, balance reduced but the row stays not-fully-paid — and allocation stops.
3. Any rows newer than that one are left completely untouched.

So a single payment fully clears zero or more of the oldest rows, then at most one row takes a partial deduction, and everything newer than that is unaffected. Not scoped now, but the Phase D column split already accommodates this without further schema changes.

## Phase 3 (not built now) — flat-rate court split

Documented so the intent isn't lost, not part of this build. An alternative to even splitting: the manager sets a flat amount owed per participant instead of a total price to divide.

- Add `split_mode TEXT NOT NULL DEFAULT 'even'` to `court_bookings` (`'even' | 'flat_rate'`).
- Meaning of the existing `price` column becomes mode-dependent: under `'even'` it's the *total* price for the booking (current behavior, unchanged); under `'flat_rate'` it's the *per-player* amount. Same column, different unit by mode — the booking modal must label the input accordingly (e.g. "Total price" vs "Amount per person") so it's unambiguous which one is being entered, since mixing them up would silently double- or under-charge people.
- Close-time calculation (`closeSession`, see [Cost-splitting rule](#cost-splitting-rule-courts)) branches on `split_mode`:
  - `'even'`: `amount_per_player = price / participant_count` (unchanged).
  - `'flat_rate'`: `amount_per_player = price` directly, no division. Total collected (`price * participant_count`) is informational only, not stored.
- No change needed to `court_payments` — it already stores a per-player `amount_paid`, regardless of how that amount was derived.
- Low implementation cost: one new column, one branch in the split calculation, one UI toggle in `bookCourtModal.tsx`. No change to `court_payments` shape or to the zero-participant guard (still applies — a flat rate with zero participants has nothing to charge either).

## Implementation phases (for this build)

### Phase A: Schema + services
- Add `status`/`closed_date` to `sessions` in `setupDatabase()`; add `court_bookings`/`court_payments` tables + indexes; add both new tables to `dropDatabase()`.
- `services/court.ts` (new): `bookCourt({ sessionId, label?, price })`, `fetchCourtBookingsBySessionId(sessionId)`.
- `services/session.ts`: add `closeSession(sessionId)` implementing the lifecycle above; extend `fetchSessionById` to include `status`, `closed_date`, and court bookings.
- Validate: manual query via `debugDatabase()` / Reset Database + re-run, since there's no test framework in this repo.

### Phase B: UI
- `components/session/bookCourtModal.tsx` (new).
- Update `app/session/[sessionId]/index.tsx`: status badge, "Book a Court" action, "Courts Booked" section, "Close Session" button + confirmation.
- Update player-owed aggregation (`services/player.ts`) to include `court_payments`.

### Phase C: Manual verification
- Run the app (`npx expo start`), Settings → Reset Database, then: create a session, add 2+ matches with different players, book 2 courts, close the session, confirm the split amounts and that "Add Match"/"Book a Court" are disabled post-close, confirm player debt totals include court cost.

**Phases A-C are complete and shipped as of this writing.**

### Phase D: Progressive "Pay Early" settlement (not yet built)
- Add `amount_owed` to `court_payments` (baked into the `CREATE TABLE`, per this repo's no-migrations convention — requires Reset Database); `amount_paid` changes meaning from "the locked share" to "how much has been collected," defaulting to `0`.
- Change full-payment call sites (`payShuttleByPlayers`'s court branch, `payCourtBySessionId`, `paySessionInFull`) from `SET amount_paid = 0, date_paid = ?` to `SET amount_paid = amount_owed, date_paid = ?`.
- Update `services/player.ts`'s owed-amount aggregations (`fetchAllPlayerPaymentsBySession`, `fetchAllPlayerPayments`) to sum `amount_owed - amount_paid` instead of `amount_paid` — must ship in the same change as the line above, not separately.
- New `services/court-payments.ts`: `payCourtShareEarly({ courtBookingId, playerId })` implementing the live formula, writing both `amount_owed` and `amount_paid` (paid in full, immediately).
- Rework `closeSession`'s court step to skip already-settled participants (those with an existing row) and insert `amount_owed = current_share, amount_paid = 0` for the rest, per the Pay Early section above.
- UI: "Pay Early" action per row in "Courts Booked" on the session page, with a player picker and a live-computed confirmation amount.
- Validate: worked example from the Pay Early section above (4 players, $20 court, one pays early at $5, two more join, remaining 5 settle at $3 each; total collected sums to exactly $20).

## Acceptance

- [x] Schema changes applied and `dropDatabase()`/`setupDatabase()` cover the new tables. *(shipped)*
- [x] Courts can be booked with a price while a session is open. *(shipped)*
- [x] Closing a session locks in a split of each court's price across that session's distinct match participants. *(shipped, one-shot even split)*
- [x] Closing with court bookings but zero participants is rejected with a clear message. *(shipped)*
- [x] Session UI reflects open/closed state and disables further match/court additions once closed. *(shipped)*
- [x] Player debt views include court cost alongside shuttle cost. *(shipped)*
- [x] Phase 2 (shuttle settlement rework) is implemented — see `specs/shuttle-instance-settlement.md`.
- [ ] **(Phase D)** A player can lock in their current fair share of a court booking before session close, and it never changes afterward.
- [ ] **(Phase D)** Session close settles only the remaining not-yet-paid participants, using the same live formula as Pay Early.
- [ ] **(Phase D)** `court_payments` splits into `amount_owed`/`amount_paid` columns; all "total owed" aggregations correctly compute `amount_owed - amount_paid` instead of relying on a zeroed `amount_paid`.
