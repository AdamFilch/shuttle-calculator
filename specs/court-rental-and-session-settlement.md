# Court Rental & Session Settlement

## Status
Draft — not yet implemented. Written before any code changes, per request.

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
  amount_paid REAL NOT NULL,     -- reuses shuttle_payments' naming: this is amount OWED; 0 once settled, mirroring existing payShuttleBy* convention
  date_paid TIMESTAMP,
  date_created TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (court_booking_id, player_id),
  FOREIGN KEY (court_booking_id) REFERENCES court_bookings(court_booking_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id)
);

CREATE INDEX IF NOT EXISTS idx_court_bookings_session ON court_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_court_payments_player ON court_payments(player_id);
```

`court_payments` rows don't exist until the session is closed — unlike `shuttle_payments`, which today is written at match-creation time. `court_bookings` rows exist as soon as a court is added (price is known immediately; only the *split* waits for close).

`dropDatabase()` must add `court_bookings` and `court_payments` to its `DROP TABLE IF EXISTS` list.

## Cost-splitting rule (courts)

At session close, for each `court_bookings` row in the session:

```
participant_count = COUNT(DISTINCT player_id) across match_players
                     for all matches where session_id = this session
booking_total      = price * quantity
amount_per_player  = booking_total / participant_count
```

One `court_payments` row per (booking, participant), `amount_paid` = `amount_per_player.toFixed(2)` — mirroring the rounding convention already used for `shuttle_payments` in `services/match.ts:58`.

**Edge case — zero participants:** if a session has court bookings but no player has ever appeared in a match in that session, `participant_count` is 0 and the split is undefined. `closeSession()` should reject the close with an error in this case (surfaced in the UI as "Add at least one match before closing this session") rather than silently skipping or dividing by zero.

## Session lifecycle

- New sessions start `status = 'open'` (default).
- **While open:** matches, court bookings can be added/edited freely, same as today. No court debt exists yet — `court_payments` has no rows for this session.
- **Closing a session** (`closeSession(sessionId)` in `services/session.ts`):
  1. Reject if `status != 'open'`.
  2. Compute distinct participants (query above).
  3. Reject if participants is empty and `court_bookings` is non-empty (see edge case above). A session with zero court bookings can close with zero participants — there's nothing to split.
  4. For each court booking, insert `court_payments` rows per the rule above, inside a transaction (mirror `createNewMatch`'s `BEGIN TRANSACTION` / `COMMIT` pattern in `services/match.ts:41-71`).
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

## Phase 2 (not built now) — shuttle settlement rework

Documented so the intent isn't lost, not part of this build:

- Stop writing `shuttle_payments` inside `createNewMatch`. Instead, at session close, aggregate `match_shuttles.quantity_used` for each shuttle batch across *all* matches in the session, compute total cost for that batch, and split it evenly across the distinct set of players who used it anywhere in the session (not per-match).
- This changes `services/match.ts::createNewMatch` (remove the immediate `shuttle_payments` insert) and moves that logic into the same `closeSession()` used for courts, so both settle at the same instant.
- Needs its own design pass on what "used it anywhere in the session" means precisely, and how partially-open sessions display *provisional* (not-yet-owed) shuttle cost in the UI before close — deliberately deferred.

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

## Acceptance

- [ ] Schema changes applied and `dropDatabase()`/`setupDatabase()` cover the new tables.
- [ ] Courts can be booked with a price while a session is open.
- [ ] Closing a session locks in an even split of each court's price across that session's distinct match participants.
- [ ] Closing with court bookings but zero participants is rejected with a clear message.
- [ ] Session UI reflects open/closed state and disables further match/court additions once closed.
- [ ] Player debt views include court cost alongside shuttle cost.
- [ ] Phase 2 (shuttle settlement rework) is *not* implemented as part of this — confirmed still isolated/documented only.
