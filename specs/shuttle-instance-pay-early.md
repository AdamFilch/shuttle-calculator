# Shuttle Instance Pay Early

## Status
Draft — not yet implemented. Follow-up to `specs/shuttle-instance-settlement.md` (implemented), directly analogous to the still-unbuilt "Pay Early" Phase D in `specs/court-rental-and-session-settlement.md`.

## Motivation

Today, `shuttle_payments` rows don't exist until `closeSession()` runs — a player cannot pay for a shuttle they used until the whole session closes. This was an accepted, explicitly documented gap when shuttle-instance-settlement shipped (see that spec's Risks table: *"Deferring settlement to session close removes the ability to pay off shuttle debt mid-session... a per-instance equivalent of Pay Early is a candidate follow-up, not in this spec's scope"*).

Courts already have this same gap, and already have a full design for fixing it (court-rental spec's Phase D): a player can lock in their **current** fair share of a cost at any point, computed live against however many people are known to share it *right now* — never revised afterward, even if the pool grows later. This spec applies that exact mechanism to shuttle instances.

**The math generalizes directly.** For courts, the shared pool is the whole session's participants. For shuttle instances, the pool is narrower and reuse-driven: only the distinct players across matches that used *that specific instance* (matching how instance settlement already works at close time). Worked example, confirmed in conversation: a $4 shuttle split 2 ways ($2 each) — one player pays early. The shuttle instance is later reused into a different match with 2 new players, growing the known pool to 4. The remaining player now shares `(4 - 2) / 3 = $0.67` with the 2 new players — not a fresh `4/4` split. Same deduction logic as courts, just scoped to the instance instead of the session.

## The `amount_owed` / `amount_paid` column split

Court-rental's Phase D (design finalized, not yet built) settled on splitting the old single `amount_paid` column into two, rather than leaving it as one column that's zeroed on payment:

- **`amount_owed`** — the player's permanent locked-in share for this instance, written once at settlement time (either via Pay Early or at session close) and never touched again.
- **`amount_paid`** — starts at `0` (nothing paid) and tracks how much has actually been collected. A full payment sets `amount_paid = amount_owed` in one step. **`amount_paid === amount_owed` is the "fully paid" signal** — not a separate flag, not a zeroed value.
- **`date_paid`** — `NULL` until the first payment, then the timestamp of the most recent payment action (partial or full). Purely informational under this model; it's `amount_paid` vs `amount_owed` that decides paid/unpaid, not `date_paid`'s presence.

This applies identically to `shuttle_payments` and `court_payments` — it's shared infrastructure, not something either spec owns exclusively. Whichever spec ships it first should be treated as the source of truth; the other builds on top of it rather than redoing it.

## How easily can this be built?

**The shuttle-specific mechanics are cheap** — the live formula is a straightforward generalization of code that already exists (the per-instance participant query in `closeSession`'s shuttle settlement step).

**The expensive part is the shared column-split migration**, and building this spec means being the first to actually ship it (court's Phase D isn't built either). The blast radius touches every place that currently reads `amount_paid` as "how much is owed":
- `services/player.ts`: `fetchShuttlePaymentsByPlayerSessions`, `fetchAllPlayerPaymentsBySession`, `fetchAllPlayerPayments` — every `total_owed_amount` / `owed_amount` / `court_total_owed` / `shuttle_total_owed` sum needs to switch from `SUM(amount_paid)` to `SUM(amount_owed - amount_paid)`.
- `app/player/[playerId]/index.tsx` — the session/match drill-down, per-charge display, and "Pay All" / "Pay Court Only" totals, all built on the old single-column reading this session.
- `components/session/modal.tsx` (`PayByPlayerModal` / `DebtChip`).
- Every existing full-payment call site in `services/shuttle-payments.ts` (`payShuttleInstancesByIds`, `payShuttleByPlayers`, `payCourtBySessionId`, `paySessionInFull`) changes from `SET amount_paid = 0, date_paid = ?` to `SET amount_paid = amount_owed, date_paid = ?`.

None of this is individually hard — it's a mechanical column-rename-plus-formula-swap — but it's easy to miss one call site and silently misreport a paid debt as still owed (or vice versa), which is exactly the failure mode court-rental's Phase D already calls "correctness-critical." **Verdict: comparable in size to shuttle-instance-settlement's original Phase A — worth building in phases, not one shot, with the column-split migration verified in isolation before anything else.** One upside worth noting: this column split also makes **partial payments** (documented as court-rental's Phase E) nearly free once it's in place — `amount_owed - amount_paid` already *is* the remaining balance, no separate ledger table needed for that part.

## Scope

**In scope:**
- Add `amount_owed` to both `shuttle_payments` and `court_payments`; repurpose `amount_paid` to mean "amount collected so far," defaulting to `0`. Shared infra, built once, used by both.
- All owed-amount aggregations in `services/player.ts` switch to `SUM(amount_owed - amount_paid)`.
- All existing full-payment call sites switch to `SET amount_paid = amount_owed, date_paid = ?`.
- A live, reusable "known participants + settled total" query per shuttle instance, shared between the new Pay Early action and `closeSession`.
- New `payShuttleInstanceEarly` service function.
- A new UI surface listing individual open-session shuttle instances with a Pay Early action (no such surface exists today — "Shuttles Used" is deliberately batch-aggregated per shuttle-instance-settlement's own design).
- `closeSession`'s shuttle settlement step reworked to skip already-settled players and split only the remainder for the rest.

**Explicitly out of scope:**
- Building court's own Phase D UI/wiring (the live pre-close court payment action itself) — though this spec's column-split migration is a hard prerequisite for it too, so building this spec first substantially de-risks building that one later.
- Actually implementing partial payments end-to-end (still documented as court-rental's Phase E) — this spec only sets up the column shape that makes it cheap later.
- Any change to the New / Reused / Free match-creation flow.

## Decisions assumed (flag if wrong)

1. **A shuttle instance's pool only grows via explicit "Reused" selections**, never via unrelated new matches in the session — this matches how per-instance participant derivation already works in `closeSession`.
2. **Free instances (`shuttle_id IS NULL`) never appear in the Pay Early list** — nothing to pay, consistent with close-time settlement already skipping them.
3. **UI placement: the open session detail page, not the player detail page.** Modeled on where court's Phase D was designed to live ("Courts Booked" gets a per-row Pay Early button). The player detail page currently only reads *already-settled* data; a live, per-instance, cross-player picker action fits the session page's "things I can act on while this session is open" model better. If you pictured this next to the existing "Pay Shuttles Individually" flow on the player page instead, say so — it changes where the new query/component lives, not the underlying mechanism.

## Data Model

`shuttle_payments` gains `amount_owed`, and `amount_paid`'s meaning changes (baked into the `CREATE TABLE`, per this repo's no-migrations convention — requires Reset Database):

```sql
CREATE TABLE IF NOT EXISTS shuttle_payments (
  shuttle_instance_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  amount_owed REAL NOT NULL,           -- the player's LOCKED-IN share for this instance, permanent once written.
  amount_paid REAL NOT NULL DEFAULT 0, -- how much of amount_owed has been collected. Starts at 0. Fully paid
                                        -- when amount_paid = amount_owed.
  date_paid TIMESTAMP,                 -- NULL until first payment; then timestamp of the most recent payment
                                        -- action. Informational -- amount_paid vs amount_owed is the real signal.
  date_created TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (shuttle_instance_id, player_id),
  FOREIGN KEY (shuttle_instance_id) REFERENCES shuttle_instances(shuttle_instance_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id)
);
```

`court_payments` gets the identical treatment — see `specs/court-rental-and-session-settlement.md`'s Data Model section for that table's definition. No other schema changes.

## The Formula (per shuttle instance)

```
known_participants(instance) = SELECT DISTINCT player_id FROM match_players
                                WHERE match_id IN (
                                  SELECT match_id FROM match_shuttle_instances WHERE shuttle_instance_id = ?
                                )
settled_total(instance)      = SUM(amount_paid) across existing shuttle_payments rows for this instance
unsettled_count(instance)    = known_participants(instance).length - COUNT(existing shuttle_payments rows for this instance)
price_per_unit                = shuttle.total_price / shuttle.num_of_shuttles   -- skip entirely if shuttle_id IS NULL (free)
current_share                  = (price_per_unit - settled_total) / unsettled_count
```

A player paying early gets a new row inserted with `amount_owed = current_share.toFixed(2)` and `amount_paid` set equal to it immediately (Pay Early means paying in full, right now), `date_paid = now()`. This never changes afterward. Whoever hasn't settled yet absorbs however the remaining pool changes as the instance gets reused further.

**Worked example** (from conversation): $4 shuttle, 2 known players (A, B). A pays early: `current_share = 4/2 = $2` — row inserted with `amount_owed = 2, amount_paid = 2`. The instance is reused into a new match with 2 new players (C, D) — `known_participants` grows to 4. B settles: `unsettled_count = 4 - 1 = 3`, `current_share = (4 - 2) / 3 = $0.67` — row inserted with `amount_owed = 0.67, amount_paid = 0.67`. C and D settle later against whatever's left in the pool at the moment each of them pays — same accepted "settle-order affects your share" tradeoff already signed off on for courts.

Rows inserted by `closeSession` for players who never paid early instead get `amount_owed = current_share, amount_paid = 0` — owed, not yet paid, settled later via the existing "Pay Shuttles" flows on the player page (which already understand this column shape once the migration lands).

## Service changes

### `services/shuttle-payments.ts`
- Change full-payment call sites (`payShuttleInstancesByIds`, `payShuttleByPlayers`, `payCourtBySessionId`, `paySessionInFull`) from `SET amount_paid = 0, date_paid = ?` to `SET amount_paid = amount_owed, date_paid = ?`.
- New shared function computing the live formula above (e.g. `computeShuttleInstanceShare(shuttleInstanceId)`), used by both the new Pay Early action and `closeSession` — mirrors the court spec's explicit instruction that "`closeSession` should reuse a single shared function for this rather than duplicating the formula."
- New `payShuttleInstanceEarly({ shuttleInstanceId, playerId })`: computes `current_share`, guards (reject if the player already has a row for this instance; reject if the player isn't in `known_participants`; reject if the instance is free), inserts one row with `amount_owed = current_share`, `amount_paid = current_share`, `date_paid = now()`, inside a transaction.

### `services/session.ts` (`closeSession`)
- Shuttle settlement step reworked: for each instance, for each known participant who does **not** already have a `shuttle_payments` row (i.e., didn't pay early), compute `current_share` via the shared function and insert a row with `amount_owed = current_share`, `amount_paid = 0` (owed, settled later) — exactly mirrors how court's Phase D changes `closeSession`'s court step.

### `services/player.ts`
- `fetchShuttlePaymentsByPlayerSessions`, `fetchAllPlayerPaymentsBySession`, `fetchAllPlayerPayments`: every owed-amount sum switches from "sum `amount_paid` over all rows" to `SUM(amount_owed - amount_paid)`. **Must ship in the same change as the column split, not separately** — otherwise a player's collected amount would silently be reported as still owed, or vice versa. Identical warning already exists verbatim in court-rental's Phase D section; this spec inherits it.

## UI changes

### `app/session/[sessionId]/index.tsx` (open sessions only)
New **"Shuttles In Play"** section, alongside the existing "Shuttles Used" / "Courts Booked" sections: one row per not-yet-fully-settled instance, subtitle showing live "$X of $Y settled" / "N of M players paid," with a "Pay Early" action that opens a player picker scoped to `known_participants` minus whoever's already settled, computes `current_share` live, and confirms via the existing `PaymentConfirmationDialog` (reused, same pattern planned for court's Phase D).

### `app/player/[playerId]/index.tsx`
No changes required. The existing "Pay Shuttles Individually" / "Pay All" / "Pay Court Only" flows already read from `shuttle_payments`/`court_payments`; once the column-split migration lands, an early-paid instance just shows up as already settled (`amount_paid === amount_owed`), filtered out the same way "unpaid" is filtered today.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Live share formula | `specs/court-rental-and-session-settlement.md`, Pay Early section | Direct template — same formula shape, instance-scoped instead of session-scoped |
| `amount_owed`/`amount_paid` column split | Same spec, "`amount_paid` / `amount_owed` split, replacing the zero-on-payment convention" | Identical fix, applied to `shuttle_payments` too since it's shared infra |
| Session-page list section | `app/session/[sessionId]/index.tsx`, "Courts Booked" | New "Shuttles In Play" section follows the same shape |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Column-split migration missed in one of the three `player.ts` functions or the player-detail-page UI, silently misreporting a paid debt as still owed | High if rushed | Ship the schema change and every reader in the same change; explicitly verify all three `player.ts` functions and `app/player/[playerId]/index.tsx` before calling this done |
| Court's Phase D gets built independently later and re-does the column-split migration, causing a merge conflict or duplicated work | Low (neither built yet) | Whichever spec ships the migration first should be treated as the source of truth; the other should build on top of it, not redo it |
| Rounding drift from multiple independent, settle-order-dependent per-instance divisions | Low (already an accepted tradeoff for courts) | Same acceptance as courts — not solving broader currency-precision handling here |

## Implementation Phases

### Phase A: Shared column-split migration (build and verify in isolation first)
- Add `amount_owed` to `shuttle_payments` and `court_payments`; repurpose `amount_paid` to mean "collected so far," defaulting to `0`.
- Change all four full-payment functions in `services/shuttle-payments.ts` to `SET amount_paid = amount_owed, date_paid = ?`.
- Update `fetchShuttlePaymentsByPlayerSessions`, `fetchAllPlayerPaymentsBySession`, `fetchAllPlayerPayments` to compute `SUM(amount_owed - amount_paid)` for every owed-amount total.
- Manual verification: pay off a shuttle/court charge via any existing flow, confirm the player-detail-page totals correctly show $0 owed for that item afterward — this is the regression most likely to slip through.

### Phase B: Live share function + `payShuttleInstanceEarly`
- Extract the live formula into a shared function.
- New `payShuttleInstanceEarly` with the three guards.

### Phase C: `closeSession` rework
- Skip already-settled participants per instance, split the remainder for the rest, using the shared function from Phase B.

### Phase D: UI
- New "Shuttles In Play" section, player picker, and Pay Early action on the open session detail page.

### Phase E: Manual verification
- Reproduce the worked example end to end: 2 players use a shuttle, one pays early, reuse it into a match with 2 new players, confirm the remaining 3 split the leftover pool correctly, confirm the total collected always reconciles to the full price regardless of settle order.

## Acceptance
- [ ] `shuttle_payments` and `court_payments` both split into `amount_owed`/`amount_paid` columns; `amount_paid` starts at `0` and equals `amount_owed` when fully paid.
- [ ] All owed-amount aggregations in `services/player.ts` compute `SUM(amount_owed - amount_paid)`.
- [ ] `payShuttleInstanceEarly` lets a player lock in their live share of a shuttle instance before session close, with correct guards.
- [ ] `closeSession` settles only not-yet-paid participants per instance, using the same live formula.
- [ ] New "Shuttles In Play" UI on the open session page.
- [ ] Worked example verified manually end-to-end.
