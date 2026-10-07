# [5]: Player payments backend

This ticket is the backend half of the Player detail redesign, and it ships first. It owns every `services/` and schema change the redesign needs. [PRD 4](../4-player-detail-redesign.prd.md) is then frontend only. It builds the screen on the functions listed in [Contract for frontend](#contract-for-frontend), and never edits `services/` or the schema.

This ticket:
- stores `amount_charged` on each payment row, so a paid charge keeps its amount
- adds `fetchPlayerLedger`, the one read the player detail screen needs, with real paid amounts and no sample data
- pays picked charges in one transaction (`payChargesByKeys`)
- adds `fetchPlayerDeleteBlockers`, and makes `deletePlayer` refuse a player who is in an open session
- makes the shared payment readers expose charged and paid totals, so session detail's "paid so far" comes from those stored facts

Apart from session detail's paid-so-far becoming exact, the organiser sees no new UI here.

**Ships before:** PRD [4]. AC5 is ticked once PRD [4] lands.

## Summary
What changes:
- A schema change: `amount_charged` on `shuttle_payments` and `court_payments`.
- `closeSession` writes the new column.
- **New** `fetchPlayerLedger(playerId)`: the player's full ledger, with real paid amounts. It moved here from PRD [4].
- **New** `fetchPlayerDeleteBlockers(playerId)`, and a guard in `deletePlayer`.
- A **new** atomic writer, `payChargesByKeys`, used by Pay individually.
- `amount_charged` in `fetchAllPlayerPaymentsBySession` and `fetchAllPlayerPayments`, and in session detail's paid-so-far.

What stays the same:
- How shares are computed and split.
- `amount_paid` still holds the amount still owed.
- Every screen's layout.

## Users
- **Primary**: the session organiser. Paid history on player detail must be real, and a payment must go through completely or not at all.
- **Not for**: players. This is a single-user app.

## Problem
Without this ticket:
- The player detail redesign has no data source that covers every session the player joined.
- Paying zeroes `amount_paid`, so paid amounts are lost.
- Paying several picked charges can half-succeed.
- A player in an open session can be deleted through `deletePlayer`.
- Session detail works out "paid so far" by subtraction instead of reading stored facts.

## Evidence
- features.md #10 known gap: "The stored column is called `amount_paid` but holds the amount still owed, and paying zeroes it. So the amount a player paid is lost, and paid history can't be shown or analysed."
- features.md #2 known gap: "A player who has played in a still-open session can be deleted before that session is settled."
- features.md #13 dependency: "Paid amounts must be kept … for spend and collection insights."
- features.md #14 "Player play history" needs every session the player joined, settled ones included. Today's `fetchShuttlePaymentsByPlayerSessions` only returns sessions that have charges.

## Hypothesis
We believe **storing each charge's original amount, exposing one ledger read, and paying picks atomically** will **make player and session payment history trustworthy, and let PRD [4] be built without touching services** for **session organisers**.
We'll know we're right when **every paid amount on player detail matches the share charged at close, no payment can half-apply, and PRD [4] ships with no `services/` diff**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Paid amounts that match the share at close | 100% | On the seed, compare `amount_charged` with `previewSessionCharges` taken before closing |
| Rows changed after a forced failure in `payChargesByKeys` | 0 | Throw inside the transaction in a dev scenario and check the rows |
| `services/` or schema files changed by PRD [4] | 0 | `git diff --stat` on PRD [4]'s PR |

## Scope
**MVP**
- `amount_charged` column, written by `closeSession` (D1)
- `fetchPlayerLedger` with real paid values. No sample file is ever created (D2, D9)
- `payChargesByKeys`, with Pay individually switched to it (D3)
- `fetchPlayerDeleteBlockers`, and the guard in `deletePlayer` (D4)
- Reader updates and session detail's paid-so-far (D5)

**Out of scope**
- Waive storage and writer. The user deferred them.
- Partial payment, undo, and renaming `amount_paid`. These are separate future changes.
- Any player detail UI. PRD [4] owns it.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Data Model](#data-model)
4. [State Machine](#state-machine)
5. [Writers](#writers)
6. [Readers](#readers)
7. [Contract for frontend](#contract-for-frontend)
8. [End-to-End Flows](#end-to-end-flows)
9. [Blast Radius](#blast-radius)
10. [File Reference](#file-reference)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Required Changes](#required-changes)

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Keeping paid amounts | **New** `amount_charged REAL NOT NULL` on `shuttle_payments` and `court_payments`. `closeSession` writes it with the same share as `amount_paid`, and nothing changes it afterwards. Needs a DB reset (`npm run db:fresh`). The seed keeps working because it goes through `closeSession` | Paying zeroes `amount_paid`, so the original share is lost | User |
| D2 | No sample data | `fetchPlayerLedger` reads paid amounts from `amount_charged`. `services/player-ledger-sample.ts` is never created | The backend ships first, so real values exist before the UI does | User |
| D3 | Pay individually | **New** `payChargesByKeys({ playerId, keys })` in `services/shuttle-payments.ts`, in one transaction. `court:{sessionId}` pays all of the player's unpaid court rows in that session. `shuttle:{instanceId}` pays that one row. The player screen uses it. `payShuttleInstancesByIds` stays for other callers | Courts and shuttles in one write that either fully succeeds or changes nothing | User |
| D4 | Delete rule | `deletePlayer` throws when owed > 0 or the player is in an open session. It uses `fetchPlayerDeleteBlockers`, which the frontend also reads | Closes the #2 gap. The UI and the service share one rule | User |
| D5 | Which readers change | `fetchAllPlayerPaymentsBySession` and `fetchAllPlayerPayments` return `amount_charged` per row, plus `total_charged_amount` and `total_paid_amount` per player. Session detail's paid-so-far becomes SUM(`amount_charged`) over paid rows. Owed maths and visuals stay unchanged | Every reader exposes the new data, and paid comes from stored facts | User |
| D6 | Pay all | Stays a loop over `paySessionInFull`, called from the screen | The user chose this. Each call is idempotent | User |
| D7 | Transaction API | `db.withTransactionAsync`, as `deleteEmptySession` in `services/session.ts` does | Follows the existing pattern | Claude — straightforward |
| D8 | Already-paid rows | Writers filter on `date_paid IS NULL` | A double tap can't overwrite a paid date. Matches `paySessionInFull` | Claude — straightforward |
| D9 | Where the backend for PRD [4] lives | Every `services/` change for the redesign belongs to this ticket: `fetchPlayerLedger`, `fetchPlayerDeleteBlockers` and `payChargesByKeys`. PRD [4] only consumes the [Contract for frontend](#contract-for-frontend) | Keeps PRD [4] frontend only, per the backend/frontend PRD split in CLAUDE.md | User |
| D10 | Ledger shape | As PRD [4] and the spec's "Data the screen needs" describe: sessions sorted owing → open → settled, a reused shuttle listed under its first match, one court share per session, open sessions estimated with `previewSessionCharges` | The screen renders it as-is, with no reshaping in components | Claude — straightforward (spec) |
| D11 | Old reader | `fetchShuttlePaymentsByPlayerSessions` stays until PRD [4] stops using it. PRD [4] may stop calling it, but deleting it is a backend change for a later ticket | PRD [4] doesn't edit `services/` | Claude — straightforward |

## Overview
Each payment row records:
- what was charged: `amount_charged`. **New**, and never changed after it's written.
- what is still owed: `amount_paid`. The name is legacy.
- when it was paid: `date_paid`.

Open sessions have no payment rows yet. Their figures are estimates from `previewSessionCharges`. A charge is addressed by a `ChargeKey`, either `court:{sessionId}` or `shuttle:{shuttleInstanceId}`.

Questions the data answers:
1. **How much does a player owe?** → `SUM(amount_paid)` over both tables.
2. **How much have they paid?** → `SUM(amount_charged) WHERE date_paid IS NOT NULL`, over both tables.
3. **How much did a paid charge cost?** → its `amount_charged`.
4. **Which sessions did they join, and which matches did they play?** → `DISTINCT matches.session_id` via `match_players`, for any session status, plus each match's players grouped by `position`.
5. **How was each share worked out?** →
   - shuttle: unit price (`shuttles.total_price / num_of_shuttles`) ÷ the instance's distinct players
   - court: `SUM(price × quantity)` ÷ the session's distinct players
6. **How much of a session has been paid?** → `SUM(amount_charged)` over the session's paid rows.
7. **Can this player be deleted?** → `fetchPlayerDeleteBlockers` returns owed = 0 and `inOpenSession = false`.

Non-obvious design decisions:
1. **`amount_charged` is written once** ([D1](#decision-log)). Payments only touch `amount_paid` and `date_paid`. If a payment overwrote `amount_charged`, the history would be lost again.
2. **Session paid-so-far is summed, not subtracted** ([D5](#decision-log)). `amount_due − owed` and `SUM(amount_charged of paid)` agree for a freshly closed session. Only the sum stays correct once waivers exist.
3. **A reused shuttle appears once in the ledger, under its first match** ([D10](#decision-log)). A player is charged once per instance. Listing it under every match would make the listed total disagree with owed.
4. **The court share is one entry per session.** Its `ChargeKey` `court:{sessionId}` covers every booking in that session, which is exactly what `payChargesByKeys` pays.

## Data Model
### `shuttle_payments` and `court_payments` tables (changed)
> Source: [services/database.js](../../../services/database.js)

| Column | Type | Stored | Default | Description |
|---|---|---|---|---|
| `amount_paid` | REAL | yes | — | Amount still **owed**. Paying sets it to 0 |
| `amount_charged` | REAL NOT NULL | yes | — | **New**. The share charged at close. Never changed |
| `date_paid` | TIMESTAMP | yes | NULL | Set when paid |
| paid amount | — | **derived** | — | `amount_charged` when `date_paid IS NOT NULL` |

**Constraints:** primary keys unchanged.
**Reset needed:** yes. There are no migrations (`CREATE TABLE IF NOT EXISTS`), so run `npm run db:fresh`. The `default` seed fills the column through `closeSession`.

### Tables read by `fetchPlayerLedger`
| Table | Purpose |
|---|---|
| `players` | Name, `avatar_colour`, `status` |
| `sessions` | Name, date, `status`, and the title via `formatSessionTitle` |
| `matches` / `match_players` | Sessions joined, matches played, team positions |
| `shuttle_instances` / `match_shuttle_instances` | Which instance a charge is for, its first match, the reused flag |
| `shuttles` | Type name and unit price |
| `court_bookings` | Total court cost |
| `shuttle_payments` / `court_payments` | Owed, charged, `date_paid` |

## State Machine
```
[owed] ──► [paid]     paySessionInFull / payChargesByKeys (amount_paid → 0, date_paid set, amount_charged untouched)
```

Session state as the ledger reports it:
| Condition | `state` |
|---|---|
| `sessions.status = 'open'` and the player played in it | `open` |
| closed, and any of the player's rows has `amount_paid > 0` | `owing` |
| closed, and every row is paid | `settled` |

**Delete is blocked when:** owed > 0, or the player played a match in a session with `status = 'open'`.

## Writers
### 1. Close a session → `closeSession` (changed)
> Source: [services/session.ts](../../../services/session.ts)

**What it does:** both `INSERT`s also write `amount_charged`, with the same value as `amount_paid`.

**Does not write:** anything else new.

### 2. Pay picked charges → `payChargesByKeys` (**new**)
> Source: [services/shuttle-payments.ts](../../../services/shuttle-payments.ts)

**Trigger:** the confirmation in player detail's selection mode.

**What it does:**
1. Runs inside `db.withTransactionAsync`, with one timestamp from `convertTimeToSQLTimeStamp`.
2. For each `shuttle:{id}`, runs `UPDATE shuttle_payments SET amount_paid = 0, date_paid = ? WHERE shuttle_instance_id = ? AND player_id = ? AND date_paid IS NULL`.
3. For each `court:{sessionId}`, runs the same update on `court_payments` for every `court_booking_id` in that session.

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|
| At least one key | The bottom bar is disabled (PRD [4]) |
| A key is malformed | It throws before any write, and the screen shows an inline error |
| An error inside the transaction | Everything rolls back. The screen shows an inline error and keeps the picks |

**Does not write:** `amount_charged`, or other players' rows.

### 3. Delete a player → `deletePlayer` (changed)
> Source: [services/player.ts](../../../services/player.ts)

**What it does:** calls `fetchPlayerDeleteBlockers`. It throws if:
- owed > 0, with the current message
- `inOpenSession` is true, with "This player is in an open session. Close it before deleting."

Otherwise it soft-deletes the player, as it does today.

## Readers
### `fetchPlayerLedger(playerId)` (**new**, moved from PRD [4])
> Source: [services/player.ts](../../../services/player.ts)

**Returns** an exported `PlayerLedger` type:
- `player`: `Player`
- `sessionCount`, `matchCount`: across every session joined, open ones included
- `totals`: `{ owed, paid, charged, sessionsOwing, closedSessions }`. `paid` and `charged` come from `amount_charged`.
- `sessions[]`: sorted owing (newest first), then open (newest first), then settled (newest first). Each session has:
  - `session_id`, `name`, `date`, `status`, `title` (`formatSessionTitle`), `state` (`'owing' | 'open' | 'settled'`), `owed`, `paid`, `charged`
  - `matches[]`: `match_id`, `match_number`, `players` (`{ player_id, name, position }`), `charges[]` (the shuttle charges whose **first** match this is), and `freeOnly` (the match used only free shuttles)
  - `court`: `{ key: 'court:{sessionId}', owed, charged, datePaid, courtTotal, playerCount } | null`, where `null` means the session had no bookings
  - each shuttle charge: `key: 'shuttle:{id}'`, `shuttle_instance_id`, `shuttleName`, `unitPrice`, `playerCount`, `firstMatchId`, `reused`, `owed`, `charged`, `datePaid`
  - open sessions only: `estimate` = `{ total, courtShare, shuttleShares: Record<shuttle_instance_id, number> }` from `previewSessionCharges`, and `owed`/`paid`/`charged` = 0

Free shuttles are never listed as charges. All totals are rounded to cents (`roundToCents`).

**Why:** one read builds the whole player detail screen, including settled sessions, and shows how each share was worked out.

| Consumer | File |
|---|---|
| Player detail (PRD [4]) | `app/player/[playerId]/index.tsx` |

### `fetchPlayerDeleteBlockers(playerId)` (**new**)
**Returns:** `{ owed: number, inOpenSession: boolean }`.

| Consumer | File |
|---|---|
| `deletePlayer` | `services/player.ts` |
| Player options sheet (PRD [4]) | `components/player/PlayerOptionsSheet.tsx`, via the screen |

### `fetchAllPlayerPaymentsBySession` / `fetchAllPlayerPayments` (changed)
> Source: [services/player.ts](../../../services/player.ts)

**Returns:** what they return today, plus:
- `amount_charged` on each shuttle and court payment item
- `total_charged_amount` and `total_paid_amount` per player

| Consumer | File |
|---|---|
| Session detail (paid so far) | `app/session/[sessionId]/index.tsx`, `components/session/EstimateCard.tsx` |
| Players tab, Home, PayByPlayer modal | `app/(tabs)/player/index.tsx`, `app/(tabs)/index.tsx`, `components/session/modal.tsx` (no visual change) |

### `previewSessionCharges` (existing, reused by `fetchPlayerLedger`)
> Source: [services/session.ts](../../../services/session.ts)

## Contract for frontend
PRD [4] builds the player detail screen using only these, and doesn't change them:

| Screen need | Function | File |
|---|---|---|
| Everything shown on the screen | `fetchPlayerLedger(playerId)` → `PlayerLedger` | `services/player.ts` |
| Delete row state and reason | `fetchPlayerDeleteBlockers(playerId)` | `services/player.ts` |
| Delete player | `deletePlayer(playerId)` | `services/player.ts` |
| Pay all | `paySessionInFull({ sessionId, player_id })` for each owing session | `services/shuttle-payments.ts` |
| Pay session | `paySessionInFull({ sessionId, player_id })` | `services/shuttle-payments.ts` |
| Pay individually (shuttles + court shares) | `payChargesByKeys({ playerId, keys })` with the ledger's `key` values | `services/shuttle-payments.ts` |
| Charge keys | `ChargeKey` type | `services/shuttle-payments.ts` |
| Money formatting | `formatRM` | `services/money-display.ts` |

## End-to-End Flows
### Happy path: load the ledger
```
fetchPlayerLedger(3)
  ├─ player + counts
  ├─ closed sessions: payment rows (owed, amount_charged, date_paid) grouped by session
  ├─ matches + rosters; each charge placed under its first match, reused flagged
  ├─ open sessions: previewSessionCharges → estimate
  └─ sort owing → open → settled, totals rounded
```

### Happy path: pay a pick that includes a court share
```
Confirm in selection mode
  └─► payChargesByKeys(playerId, ['court:7', 'shuttle:31'])
        ├─ BEGIN
        ├─ court_payments rows for session 7 → amount_paid 0, date_paid now
        ├─ shuttle_payments row 31 → amount_paid 0, date_paid now
        └─ COMMIT → refetch ledger → rows show paid with real amount_charged
```

### Edge case: a write fails partway
```
payChargesByKeys → second UPDATE throws → ROLLBACK → no row changed → inline error
```

### Edge case: deleting a player who is in an open session
```
deletePlayer(id) → fetchPlayerDeleteBlockers → inOpenSession = true → throw → nothing written
```

### Edge case: player never played
```
fetchPlayerLedger → sessions = [], sessionCount 0, totals all 0
```

## Blast Radius
| Change | What breaks |
|---|---|
| New NOT NULL column | `closeSession` fails on an old on-device database until it's reset. Every tester must run `npm run db:fresh` |
| `closeSession` insert | Seeds depend on it. `default` must still load |
| `fetchPlayerLedger` added | Nothing. It's a new export |
| Session paid-so-far | `EstimateCard` now takes the paid amount as a prop instead of computing `amountDue − stillOwed` |
| `deletePlayer` guard | Players in open sessions can no longer be deleted. That's intended |

## File Reference
| File | Role |
|---|---|
| [services/database.js](../../../services/database.js) | `amount_charged` on both payment tables |
| [services/session.ts](../../../services/session.ts) | `closeSession` writes `amount_charged`. `previewSessionCharges` and `formatSessionTitle` are reused by the ledger |
| [services/shuttle-payments.ts](../../../services/shuttle-payments.ts) | **New** `payChargesByKeys` and the `ChargeKey` type |
| [services/player.ts](../../../services/player.ts) | **New** `fetchPlayerLedger` + `PlayerLedger` type and `fetchPlayerDeleteBlockers`. The guard in `deletePlayer`. The `fetchAll…` readers extended |
| [app/player/[playerId]/index.tsx](../../../app/player/[playerId]/index.tsx) | The current screen's Pay Selected calls `payChargesByKeys` (redesign in PRD [4]) |
| [app/session/[sessionId]/index.tsx](../../../app/session/[sessionId]/index.tsx), [components/session/EstimateCard.tsx](../../../components/session/EstimateCard.tsx) | Paid-so-far from `amount_charged` |
| [services/seed.ts](../../../services/seed.ts) | Unchanged. Must still load |

---

## Acceptance Criteria
- [x] AC1: After `npm run db:fresh`, every `shuttle_payments` and `court_payments` row has `amount_charged` equal to the share at close.
- [x] AC2: Paying a row, through any writer, sets `amount_paid` to 0 and stamps `date_paid`. `amount_charged` doesn't change.
- [ ] AC3: `fetchPlayerLedger` exists and returns the `PlayerLedger` shape in [Readers](#readers). Its `paid`/`charged` values equal the stored `amount_charged` sums, and `services/player-ledger-sample.ts` doesn't exist.
- [x] AC4: `payChargesByKeys` pays the picked shuttles and every court row of a picked `court:{sessionId}` in one transaction. A forced error inside it changes no rows. Already-paid rows keep their original `date_paid`.
- [ ] AC5: Pay individually on the redesigned player detail (PRD [4]) calls only `payChargesByKeys`. Ticked when PRD [4] lands.
- [x] AC6: `deletePlayer` throws for a player who owes money or is in an open session, even when called directly. Otherwise it succeeds.
- [x] AC7: `fetchAllPlayerPaymentsBySession` and `fetchAllPlayerPayments` return `amount_charged`, `total_charged_amount` and `total_paid_amount`. Session detail's paid-so-far equals the sum of `amount_charged` over paid rows.
- [x] AC8: Owed totals on the Players tab, Home and session detail don't change against the `default` seed.
- [ ] AC9: `npm run lint` and `npx tsc --noEmit` pass, and the change is checked on the iOS Simulator through Expo MCP after `npm run db:fresh`. Never checked on web.
- [ ] AC10: On the `default` seed, `fetchPlayerLedger` for a player in both the closed and the open session returns:
  - sessions ordered owing → open → settled
  - a reused shuttle once, under its first match, with `reused: true`
  - one court share per session, with `key` `court:{sessionId}`
  - an open-session `estimate` equal to that player's row in `previewSessionCharges`
  - `totals.owed` equal to the player's owed total on the Players tab

## Required Changes
- **Schema**: `amount_charged` on both tables ([Data Model](#data-model)). Run `npm run db:fresh` and tell the user to reset too. Done.
- **closeSession**: write the column ([Writers §1](#writers)). Done.
- **Writer**: `payChargesByKeys` ([Writers §2](#writers)). Done.
- **deletePlayer**: `fetchPlayerDeleteBlockers` and the guard ([Writers §3](#writers)). Done.
- **Shared readers and session detail** ([Readers](#readers)). Done.
- **Ledger**: add `fetchPlayerLedger` and export `PlayerLedger` ([Readers](#readers)). Verify it with AC3 and AC10.
- **Docs**: features.md #10, #2, #13 (done), and #14 gets a note that the ledger read exists.

## Features Catalog
- **Extends**: #10 Player balance and payments, #2 Deleting and restoring players, #9 Closing a session, #14 Player play history (data side)
- **Closes known gaps**:
  - "So the amount a player paid is lost, and paid history can't be shown or analysed." (#10)
  - "A player who has played in a still-open session can be deleted before that session is settled." (#2)

## Open Questions
- [ ] Now that both columns exist, should a later ticket rename `amount_paid` to `amount_owed`?

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A tester forgets to reset the database | Medium | Medium | AC1 and AC9 require `db:fresh`. Say so in the PR and the report |
| Paid-so-far differs by a cent from the old subtraction | Low | Low | Both use the same rounded shares. Check against the seed |
| The ledger shape doesn't fit the screen, so PRD [4] needs a service change | Low | Medium | The shape follows the spec's "Data the screen needs". If it's still wrong, open a follow-up backend ticket rather than editing `services/` in PRD [4] |

## Implementation Status
The backend shipped ahead of PRD [4]. It was verified on the iOS Simulator (iPhone 17 Pro, iOS 26.0, Expo Go) after `db:fresh`, and the Metro log shows `[dev-db] fresh default done`. Verification used `simctl` screenshots, read-only `sqlite3` queries of the on-device database, and a temporary dev seed scenario (not committed) that called the real service functions. The Expo MCP local tools weren't available in that session.

| AC | Status | Evidence / notes |
|---|---|---|
| AC1 | ✅ done | After `db:fresh`, all 16 shuttle rows and 6 court rows have a non-NULL `amount_charged`. 0 rows differ from the share recomputed independently in SQL: unit price ÷ distinct players, and court price × qty ÷ session players, both rounded to 2 dp |
| AC2 | ✅ done | `paySessionInFull` (seed, Alice) and `payChargesByKeys` (Ben) left `amount_paid = 0`, set `date_paid`, and kept `amount_charged` (e.g. court 10, shuttle 2.5). No payment writer in `services/shuttle-payments.ts` references `amount_charged` (grep) |
| AC3 | ⏳ to do | `fetchPlayerLedger` moved into this ticket from PRD [4]. Not built yet |
| AC4 | ✅ done | `payChargesByKeys(Ben, ['court:1', 'shuttle:1'])` paid both rows in one transaction. A malformed key (`bogus:1`) threw before any write: 0 rows paid. With a `BEFORE UPDATE` trigger on `court_payments` raising ABORT, the call threw and Chloe's rows were unchanged: the shuttle update rolled back. Paying again 2 s later left every `date_paid` the same |
| AC5 | ❌ Blocked: needs PRD [4] | The redesigned Pay individually doesn't exist yet. The current screen's "Pay Selected" already calls only `payChargesByKeys` with `shuttle:` keys |
| AC6 | ✅ done | `deletePlayer(Ben)` (owes 4) threw the unpaid message. `deletePlayer(Alice)` (owes 0, in open session 2) threw "This player is in an open session. Close it before deleting." The seed's `deletePlayer(Gina)` (no charges, no open session) succeeded: `status = 'deleted'` |
| AC7 | ✅ done | Both readers return `amount_charged` per item and `total_charged_amount` / `total_paid_amount` per player (e.g. Ben 16.5 / 12.5 after paying). Session detail showed "Paid RM 16.50" on the fresh seed and "Paid RM 29" after Ben paid, both equal to the SQL sum of `amount_charged` over paid rows |
| AC8 | ✅ done | On the `default` seed, Home shows "Total outstanding $79.50", the same as `main` before the change. Players tab: Ben 16.50, Chloe 17.50, Daniel 17.50, Elena 14, Farid 14, Alice Settled. Session detail: "Still owed RM 79.50 of RM 96" |
| AC9 | ⚠️ unverified | `npx tsc --noEmit` passes. `npm run lint` shows 0 errors; the 4 warnings in touched files were already there. Checked on the iOS Simulator after `db:fresh` and never on web, but with `simctl` and `sqlite3` instead of the Expo MCP tools the AC names, and no UI taps were driven |
| AC10 | ⏳ to do | Comes with `fetchPlayerLedger` |

### Needs attention
- Build `fetchPlayerLedger` (AC3, AC10).
- Re-check AC9 with the Expo MCP local tools, including tapping "Pay Selected" on player detail.
- Everyone must run `npm run db:fresh` (or Settings → Reset Database) after pulling. The new NOT NULL column breaks `closeSession` and the payment readers on an old database.

*Status: PARTIAL — PR #22*
