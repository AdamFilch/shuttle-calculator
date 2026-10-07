# [5]: Player payments backend

This ticket is the backend half of the Player detail redesign. [PRD 4](4-player-detail-redesign.prd.md) builds the screen visually, with three placeholders:
- paid amounts are sample values, because today's data can't supply them
- picked charges are paid with the existing, non-atomic writers
- Delete is blocked only in the UI

This ticket makes them real:
- each payment row gains a stored `amount_charged`, so a paid charge keeps its amount
- PRD 4's sample file is deleted and real values replace it
- picked charges are paid in one transaction
- `deletePlayer` refuses a player who is in an open session
- the shared payment readers expose charged and paid totals, and session detail's "paid so far" comes from those stored facts

The organiser sees no new UI. The numbers they already see become true.

**Depends on:** PRD [4] merged.

## Summary
What changes:
- A schema change: `amount_charged` on `shuttle_payments` and `court_payments`.
- `closeSession` writes the new column.
- `fetchPlayerLedger` reads real paid amounts, and `services/player-ledger-sample.ts` is removed.
- A **new** atomic writer, `payChargesByKeys`, replaces the two-writer path for Pay individually.
- A guard in `deletePlayer`.
- `amount_charged` in `fetchAllPlayerPaymentsBySession` and `fetchAllPlayerPayments`, and session detail's paid-so-far.

What stays the same:
- How shares are computed and split.
- `amount_paid` still holds the amount still owed.
- Every screen's layout.

## Users
- **Primary**: the session organiser. They need the paid history on player detail to be real, and payments to be all or nothing.
- **Not for**: players (single-user app).

## Problem
After PRD 4:
- The paid figures on player detail are samples.
- Paying several picked charges can half-succeed.
- A player in an open session can still be deleted through `deletePlayer`.
- Session detail works out "paid so far" by subtraction, not from stored facts.

## Evidence
- features.md #10 known gap: "The stored column is called `amount_paid` but holds the amount still owed, and paying zeroes it. So the amount a player paid is lost, and paid history can't be shown or analysed."
- features.md #2 known gap: "A player who has played in a still-open session can be deleted before that session is settled."
- features.md #13 dependency: "Paid amounts must be kept … for spend and collection insights."

## Hypothesis
We believe **storing each charge's original amount and paying picks atomically** will **make player and session payment history trustworthy** for **session organisers**.
We'll know we're right when **every paid amount on player detail matches the share charged at close, and no payment can half-apply**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Paid amounts matching the share at close | 100% | Compare `amount_charged` with `previewSessionCharges` before closing, on the seed |
| Rows changed after a forced failure in `payChargesByKeys` | 0 | Throw inside the transaction in a dev scenario and check the rows |

## Scope
**MVP**
- `amount_charged` column, written by `closeSession` (D1)
- Real paid values in `fetchPlayerLedger`, with the sample file deleted (D2)
- `payChargesByKeys`, with Pay individually switched to it (D3)
- Guard in `deletePlayer` via `fetchPlayerDeleteBlockers` (D4)
- Reader updates and session detail's paid-so-far (D5)

**Out of scope**
- Waive storage and writer: the user deferred them.
- Partial payment, undo, and renaming `amount_paid`: separate future changes.
- Any visual change: PRD [4] owns the UI.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Data Model](#data-model)
4. [State Machine](#state-machine)
5. [Writers](#writers)
6. [Readers](#readers)
7. [End-to-End Flows](#end-to-end-flows)
8. [Blast Radius](#blast-radius)
9. [File Reference](#file-reference)
10. [Acceptance Criteria](#acceptance-criteria)
11. [Required Changes](#required-changes)

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Keeping paid amounts | **New** `amount_charged REAL NOT NULL` on `shuttle_payments` and `court_payments`. `closeSession` writes it with the same share as `amount_paid`, and nothing changes it afterwards. Needs a DB reset (`npm run db:fresh`). The seed keeps working because it goes through `closeSession` | Paying zeroes `amount_paid`, so the original share is lost | User |
| D2 | Removing the samples | `fetchPlayerLedger` reads paid amounts from `amount_charged`. `services/player-ledger-sample.ts` is deleted | The work was split into visual (PRD [4]) and backend (PRD [5]) | User |
| D3 | Pay individually | **New** `payChargesByKeys({ playerId, keys })` in `services/shuttle-payments.ts`, in one transaction. `court:{sessionId}` pays all of the player's unpaid court rows in that session. `shuttle:{instanceId}` pays that one row. The player screen switches to it. `payShuttleInstancesByIds` stays for other callers | Courts and shuttles are paid in one all-or-nothing write | User |
| D4 | Delete rule | `deletePlayer` throws when owed > 0 or the player is in an open session, using `fetchPlayerDeleteBlockers` | Closes the #2 gap. Matches the UI rule from PRD [4] | User |
| D5 | Which readers change | `fetchAllPlayerPaymentsBySession` and `fetchAllPlayerPayments` return `amount_charged` per row, plus `total_charged_amount` and `total_paid_amount` per player. Session detail's paid-so-far becomes the sum of `amount_charged` over paid rows. Owed maths and visuals stay unchanged | Every reader exposes the new data, and paid comes from stored facts | User |
| D6 | Pay all | Stays a loop over `paySessionInFull` | The user chose this in PRD [4]. Each call is idempotent | User |
| D7 | Transaction API | `db.withTransactionAsync`, as `deleteEmptySession` in `services/session.ts` does | Follows the existing pattern | Claude — straightforward |
| D8 | Already-paid rows | Writers filter on `date_paid IS NULL` | A double tap can't overwrite a paid date. Matches `paySessionInFull` | Claude — straightforward |

## Overview
Each payment row records three things:
- what was charged: `amount_charged`, **new**, never changed
- what is still owed: `amount_paid`, a legacy name
- when it was paid: `date_paid`

A charge is addressed by a `ChargeKey`: `court:{sessionId}` or `shuttle:{shuttleInstanceId}`.

Questions the data answers:
1. **How much has a player paid?** → `SUM(amount_charged) WHERE date_paid IS NOT NULL`, over both tables.
2. **How much did a paid charge cost?** → its `amount_charged`.
3. **How much of a session has been paid?** → `SUM(amount_charged)` over the session's paid rows.
4. **Can this player be deleted?** → `fetchPlayerDeleteBlockers` returns owed = 0 and `inOpenSession = false`.

Non-obvious design decisions:
1. **`amount_charged` is written once** ([D1](#decision-log)). Payments only touch `amount_paid` and `date_paid`. If a payment overwrote it, the history would be lost again.
2. **Session paid-so-far is summed, not subtracted** ([D5](#decision-log)). `amount_due − owed` and `SUM(amount_charged of paid)` agree for a freshly closed session. Only the sum stays correct once waivers exist.

## Data Model
### `shuttle_payments` and `court_payments` tables (changed)
> Source: [services/database.js](../../services/database.js)

| Column | Type | Stored | Default | Description |
|---|---|---|---|---|
| `amount_paid` | REAL | yes | — | Amount still **owed**. Paying sets it to 0 |
| `amount_charged` | REAL NOT NULL | yes | — | **New**. The share charged at close. Never changed |
| `date_paid` | TIMESTAMP | yes | NULL | Set when paid |
| paid amount | — | **derived** | — | `amount_charged` when `date_paid IS NOT NULL` |

**Constraints:** primary keys unchanged.
**Reset needed:** yes. Tables use `CREATE TABLE IF NOT EXISTS` and there are no migrations, so run `npm run db:fresh`. The `default` seed fills the column through `closeSession`.

## State Machine
```
[owed] ──► [paid]     paySessionInFull / payChargesByKeys (amount_paid → 0, date_paid set, amount_charged untouched)
```

**Delete is blocked when:** owed > 0, or the player played a match in a session with `status = 'open'`.

## Writers
### 1. Close a session → `closeSession` (changed)
> Source: [services/session.ts](../../services/session.ts)

**What it does:** both `INSERT`s also write `amount_charged`, with the same value as `amount_paid`.

**Does not write:** anything else new.

### 2. Pay picked charges → `payChargesByKeys` (**new**)
> Source: [services/shuttle-payments.ts](../../services/shuttle-payments.ts)

**Trigger:** the confirmation in player detail's selection mode. It replaces the two calls PRD [4] makes.

**What it does:**
1. Runs inside `db.withTransactionAsync`, with one timestamp from `convertTimeToSQLTimeStamp`.
2. For each `shuttle:{id}`: `UPDATE shuttle_payments SET amount_paid = 0, date_paid = ? WHERE shuttle_instance_id = ? AND player_id = ? AND date_paid IS NULL`.
3. For each `court:{sessionId}`: the same update on `court_payments`, for every `court_booking_id` in that session.

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|
| At least one key | The bottom bar is disabled (PRD [4]) |
| A key is malformed | It throws before any write. Inline error |
| An error inside the transaction | Everything rolls back. Inline error, picks kept |

**Does not write:** `amount_charged`, or other players' rows.

### 3. Delete a player → `deletePlayer` (changed)
> Source: [services/player.ts](../../services/player.ts)

**What it does:** calls `fetchPlayerDeleteBlockers`. It throws if:
- owed > 0, with the current message
- `inOpenSession` is true: "This player is in an open session. Close it before deleting."

Otherwise it soft-deletes, as today.

## Readers
### `fetchPlayerLedger` (changed)
- `paid` and `paidAmount` now come from `amount_charged`.
- Adds `totals.charged` and a per-session `charged`.
- Removes the import of the sample file.

| Consumer | File |
|---|---|
| Player detail | `app/player/[playerId]/index.tsx` |

### `fetchAllPlayerPaymentsBySession` / `fetchAllPlayerPayments` (changed)
> Source: [services/player.ts](../../services/player.ts)

**Returns:** the same as today, plus:
- `amount_charged` on each shuttle and court payment item
- `total_charged_amount` and `total_paid_amount` per player

| Consumer | File |
|---|---|
| Session detail (paid so far) | `app/session/[sessionId]/index.tsx`, `components/session/EstimateCard.tsx` |
| Players tab, Home, PayByPlayer modal | `app/(tabs)/player/index.tsx`, `app/(tabs)/index.tsx`, `components/session/modal.tsx` (visuals unchanged) |

## End-to-End Flows
### Happy path: pay a pick that includes a court share
```
Confirm in selection mode
  └─► payChargesByKeys(playerId, ['court:7', 'shuttle:31'])
        ├─ BEGIN
        ├─ court_payments rows for session 7 → amount_paid 0, date_paid now
        ├─ shuttle_payments row 31 → amount_paid 0, date_paid now
        └─ COMMIT → refetch → struck-through rows show real amount_charged
```

### Edge case: a write fails partway
```
payChargesByKeys → second UPDATE throws → ROLLBACK → no row changed → inline error
```

### Edge case: deleting a player who is in an open session
```
deletePlayer(id) → fetchPlayerDeleteBlockers → inOpenSession = true → throw → nothing written
```

## Blast Radius
| Change | What breaks |
|---|---|
| New NOT NULL column | Old on-device databases don't have it, so `closeSession` fails until the database is reset. Every tester must run `npm run db:fresh` |
| `closeSession` insert | Seeds depend on it. `default` must still load |
| Sample file deleted | Anything still importing `services/player-ledger-sample.ts` fails to compile. That's intended, and `tsc` catches it |
| Session paid-so-far | `EstimateCard` takes the paid amount as a prop instead of computing `amountDue − stillOwed` |
| `deletePlayer` guard | Players in open sessions can no longer be deleted. That's intended |

## File Reference
| File | Role |
|---|---|
| [services/database.js](../../services/database.js) | `amount_charged` on both payment tables |
| [services/session.ts](../../services/session.ts) | `closeSession` writes `amount_charged` |
| [services/shuttle-payments.ts](../../services/shuttle-payments.ts) | **New** `payChargesByKeys` |
| [services/player.ts](../../services/player.ts) | `fetchPlayerLedger` reads real values, `deletePlayer` gets its guard, the `fetchAll…` readers are extended |
| `services/player-ledger-sample.ts` | Created by PRD [4], **deleted** here |
| [app/player/[playerId]/index.tsx](../../app/player/[playerId]/index.tsx) | Pay individually calls `payChargesByKeys` |
| [app/session/[sessionId]/index.tsx](../../app/session/[sessionId]/index.tsx), [components/session/EstimateCard.tsx](../../components/session/EstimateCard.tsx) | Paid-so-far from `amount_charged` |
| [services/seed.ts](../../services/seed.ts) | Unchanged. Must still load |

---

## Acceptance Criteria
- [x] AC1: After `npm run db:fresh`, every `shuttle_payments` and `court_payments` row has `amount_charged` equal to the share at close.
- [x] AC2: Paying a row, through any writer, sets `amount_paid` to 0 and stamps `date_paid`. `amount_charged` doesn't change.
- [ ] AC3: `services/player-ledger-sample.ts` no longer exists. On player detail, the paid legend, the struck-through amounts and "· paid RM X" equal the stored `amount_charged` values.
- [x] AC4: `payChargesByKeys` pays the picked shuttles, and every court row of a picked `court:{sessionId}`, in one transaction. A forced error inside it changes no rows. Rows that were already paid keep their original `date_paid`.
- [ ] AC5: Pay individually on player detail calls only `payChargesByKeys`.
- [x] AC6: `deletePlayer` throws for a player who owes money or is in an open session, even when called directly. Otherwise it succeeds.
- [x] AC7: `fetchAllPlayerPaymentsBySession` and `fetchAllPlayerPayments` return `amount_charged`, `total_charged_amount` and `total_paid_amount`. Session detail's paid-so-far equals the sum of `amount_charged` over paid rows.
- [x] AC8: Owed totals on the Players tab, Home and session detail don't change against the `default` seed.
- [ ] AC9: `npm run lint` and `npx tsc --noEmit` pass, and the change is checked on the iOS Simulator through Expo MCP after `npm run db:fresh`. It is never checked on web.

## Required Changes
- **Schema**: `amount_charged` on both tables ([Data Model](#data-model)). Run `npm run db:fresh`, and tell the user to reset too.
- **closeSession**: write the column ([Writers §1](#writers)).
- **Ledger**: replace the samples with real values, and delete the sample file ([Readers](#readers)).
- **Writer**: add `payChargesByKeys` and switch the player screen to it ([Writers §2](#writers)).
- **deletePlayer**: add the guard ([Writers §3](#writers)).
- **Shared readers and session detail**: see [Readers](#readers).
- **Docs**: in features.md, remove the "amount paid is lost" gap from #10, remove the open-session gap from #2, and note in #13 that paid amounts are now kept.

## Features Catalog
- **Extends**: #10 Player balance and payments, #2 Deleting and restoring players, #9 Closing a session
- **Closes known gaps**:
  - "So the amount a player paid is lost, and paid history can't be shown or analysed." (#10)
  - "A player who has played in a still-open session can be deleted before that session is settled." (#2)

## Open Questions
- [ ] Now that both columns exist, should a later ticket rename `amount_paid` to `amount_owed`?

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A tester forgets to reset the database | Medium | Medium | AC1 and AC9 require `db:fresh`. Mention it in the PR and the report |
| Paid-so-far is a cent off the old subtraction | Low | Low | Both use the same rounded shares. Check against the seed |

---
## Implementation Status
Shipped backend-only, ahead of PRD [4]. Verified on the iOS Simulator (iPhone 17 Pro, iOS 26.0, Expo Go) after `db:fresh` (Metro log: `[dev-db] fresh default done`), using `simctl` screenshots, read-only `sqlite3` queries of the on-device database, and a temporary dev seed scenario (not committed) that called the real service functions. The Expo MCP local tools weren't available in that session.

| AC | Status | Evidence / notes |
|---|---|---|
| AC1 | ✅ done | After `db:fresh`, all 16 shuttle and 6 court rows have a non-NULL `amount_charged`. 0 rows differ from the share recomputed independently in SQL (unit price ÷ distinct players, and court price × qty ÷ session players, both rounded to 2 dp) |
| AC2 | ✅ done | `paySessionInFull` (seed, Alice) and `payChargesByKeys` (Ben) left `amount_paid = 0`, set `date_paid`, and kept `amount_charged` (e.g. court 10, shuttle 2.5). No payment writer in `services/shuttle-payments.ts` references `amount_charged` (grep) |
| AC3 | ❌ Blocked: needs PRD [4] | `fetchPlayerLedger`, `services/player-ledger-sample.ts` and the redesigned screen don't exist yet. PRD [4] should read `amount_charged` directly and never create the sample file |
| AC4 | ✅ done | `payChargesByKeys(Ben, ['court:1', 'shuttle:1'])` paid both rows in one transaction. A malformed key (`bogus:1`) threw before any write (0 rows paid). With a `BEFORE UPDATE` trigger on `court_payments` raising ABORT, the call threw and Chloe's rows were unchanged (shuttle update rolled back). Paying again 2 s later left every `date_paid` the same |
| AC5 | ❌ Blocked: needs PRD [4] | The redesigned Pay individually doesn't exist yet. Meanwhile, the current screen's "Pay Selected" already calls only `payChargesByKeys` with `shuttle:` keys |
| AC6 | ✅ done | `deletePlayer(Ben)` (owes 4) threw the unpaid message. `deletePlayer(Alice)` (owes 0, in open session 2) threw "This player is in an open session. Close it before deleting." The seed's `deletePlayer(Gina)` (no charges, no open session) succeeded (`status = 'deleted'`) |
| AC7 | ✅ done | Both readers return `amount_charged` per item and `total_charged_amount` / `total_paid_amount` per player (e.g. Ben 16.5 / 12.5 after paying). Session detail showed "Paid RM 16.50" on the fresh seed and "Paid RM 29" after Ben paid, equal to the SQL sum of `amount_charged` over paid rows |
| AC8 | ✅ done | On the `default` seed: Home "Total outstanding $79.50" (same as `main` before the change), Players tab Ben 16.50, Chloe 17.50, Daniel 17.50, Elena 14, Farid 14, Alice Settled, and session detail "Still owed RM 79.50 of RM 96" |
| AC9 | ⚠️ unverified | `npx tsc --noEmit` passes. `npm run lint` shows 0 errors (the 4 warnings in touched files were already there). Checked on the iOS Simulator after `db:fresh`, never on web, but with `simctl` and `sqlite3` rather than the Expo MCP tools the AC names, and no UI taps were driven |

### Needs attention
- Implement PRD [4] using the real `amount_charged` (no sample file) and `payChargesByKeys`, then tick AC3 and AC5.
- Re-check AC9 with the Expo MCP local tools, including tapping "Pay Selected" on player detail.
- Everyone must run `npm run db:fresh` (or Settings → Reset Database) after pulling: the new NOT NULL column breaks `closeSession` and the payment readers on an old database.

*Status: PARTIAL — PR #TBD*
