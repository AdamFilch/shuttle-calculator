# [4]: Player detail redesign

The player detail screen (`app/player/[playerId]/index.tsx`) is where a session organiser lands after tapping a player, usually at the court or just after, while a player hands over cash or says they've transferred money. This ticket rebuilds the screen to the approved design spec ([.claude/design/specs/player-detail.md](../design/specs/player-detail.md), mockup https://claude.ai/artifact/4q4VyNMLykPH61DpY7SdkM). It answers the organiser's questions in order: how much the player owes, which sessions they joined, how much they owe for each, which matches they played and which shuttles each charge is for, and what to do next.

This ticket is **visual only**. There is no schema change, no new writer, and no change to how a service behaves. A new read-only reader builds the screen from the tables that exist today. Paid amounts can't be built from today's data, because paying zeroes `amount_paid`. Those values come from clearly named **sample** constants in a single file, which [PRD 5](5-player-payments-backend.prd.md) deletes when it stores real paid amounts. The money buttons use the payment writers that already exist. Waive is design only.

On screen, a balance card shows the total owed, a paid/owed bar, and the one primary action **Pay all**, with **Pay individually** and **Waive** beside it. Every session the player joined is listed as a collapsible card: owing first, then open sessions (with an estimate), then settled ones. Expanding a card shows the court share and each match with its teams and shuttle charges. Pay individually switches to a selection mode with tri-state checkboxes over shuttle charges and court shares, and a fixed bottom bar. Every payment asks for confirmation, then a new global toast ("Paid RM 23.75") shows for 1.5 seconds. Waive opens the same selection mode in clay, but its button stays disabled. Delete player moves into a ⋯ Player options sheet and is disabled while the player owes anything or is in an open session.

## Summary
This replaces the old teal player screen, which showed only owing sessions and used `$`, with the design-system screen from the spec. It adds:
- a read-only ledger reader
- new player components
- a reusable 1.5s toast, which also replaces the inline "Session deleted" toast on session detail
- two small additions to shared components

These stay the same:
- the schema, `closeSession`, and every payment writer
- `deletePlayer`
- every other screen's data

The backend work is in [PRD 5](5-player-payments-backend.prd.md): real paid amounts, an atomic pick writer, the delete guard in the service, and reader updates.

## Users
- **Primary**: the session organiser, on their phone, recording that a player has paid (in full, one session, or specific shuttles and courts), and answering "why do I owe this much?".
- **Not for**: players themselves (the app is single-user and local-only). Deleted players are reached from Recently deleted, which keeps its own screen.

## Problem
The organiser can't see a player's history, and recording one cash handover takes several separate payments. Only owing sessions are listed, and settled sessions disappear. There is no "pay everything" action. Courts can't be picked alongside shuttles. The red Delete button sits next to the money actions.

## Evidence
- features.md #14 "Player play history" is planned but not built: "Today the screen shows only what's still owed."
- features.md #10 known gap: "No 'pay everything across all sessions' action."
- The user approved the mockup ("Looks fantastic").

## Hypothesis
We believe **a ledger-first player screen with Pay all, Pay session and a mixed Pay individually** will **make recording a payment take one or two taps and answer "why do I owe this?"** for **session organisers**.
We'll know we're right when **a payment can be recorded in 2 taps before confirming, and no organiser needs another screen to explain a charge**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Taps from opening player detail to confirming Pay all | 2 | Manual walkthrough on the simulator |
| Owed charges explainable from this screen alone | 100% (every court and shuttle share shows how it was worked out) | Manual check against the seed data |
| Real-world usage | TBD — needs validation via organiser feedback after release | — |

## Scope
**MVP**
- Header with avatar, name, "N sessions · M matches" and ⋯ (D1)
- Balance card with owed, the paid/owed bar (paid is a sample, D2), the open-session caption, and Pay all / Pay individually / Waive
- Every session the player joined, as collapsible cards with the court share, matches, teams and charges (D8, D10, D11)
- Pay all (D5), Pay session, and Pay individually including court shares (D6), each behind a confirmation, using the existing writers
- Waive: the selection-mode UI only, with a disabled button (D3)
- A Player options sheet with Delete player only, disabled in the UI while the player owes or is in an open session (D7)
- A global 1.5s toast, with session detail's "Session deleted" moved onto it (D4)

**Out of scope (moved to [PRD 5](5-player-payments-backend.prd.md))**
- `amount_charged` storage and real paid amounts. They need a schema change.
- The atomic `payChargesByKeys` writer.
- The open-session guard inside `deletePlayer`.
- `amount_charged` in `fetchAllPlayerPaymentsBySession` / `fetchAllPlayerPayments`, and session detail's paid-so-far.

**Out of scope (not planned)**
- The waive backend: the user deferred it.
- Partial payment, undo, waive notes, a deleted-player detail view, and Pay Early (#11).

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
| D1 | Scope | Visual and design only. Rebuild `app/player/[playerId]/index.tsx` to the spec and add a global toast. Every backend change goes to PRD [5] | Keeps the design ticket free of schema and money-logic risk | User |
| D2 | Data a DB change would provide | It comes **only** from sample constants in **new** `services/player-ledger-sample.ts`. These are the paid amount of a paid charge and court share, the paid-to-date total, and a settled session's "paid RM X". No schema change, no reset. PRD [5] deletes the file | Paying zeroes `amount_paid`, so real paid amounts don't exist yet | User |
| D3 | Waive | Waive enters the clay selection mode with tri-state checkboxes. The bottom button reads "Waive · coming soon" and stays disabled. There's no confirmation and no write. The `waived` badge and row states are built but can't be reached | Shows the design without pretending the backend works | User |
| D4 | Toast | Global, at the bottom above the tab bar or action bar. An `ink` pill with `surface` text and a check icon. Auto-hides after **1.5s**, is a polite live region, and needs no tap. The existing "Session deleted" toast moves onto it | One standard toast that can be reused anywhere | User |
| D5 | Pay all | Loop the existing `paySessionInFull` over each owing closed session | Reuses what already exists. Each call skips paid rows, so a retry is safe | User |
| D6 | Pay individually | Use the existing writers. Picked shuttles go through `payShuttleInstancesByIds`, and each picked court share through `payCourtBySessionId`. These aren't atomic. The atomic `payChargesByKeys` is PRD [5] | No new writer in a visual ticket | User |
| D7 | Delete rule | The options sheet disables Delete while the player owes anything ("Settle RM X first") or is in an open session ("In an open session — close it first"). Both come from read-only queries. `deletePlayer` itself is unchanged until PRD [5] | The UI follows the final rule now. The service guard is backend work | User |
| D8 | Data source | **New** read-only `fetchPlayerLedger(playerId)` built from existing tables (sessions, matches, teams, charges, owed, `date_paid`). Only the D2 gaps are sample values | Real data wherever it already exists | User |
| D9 | Acceptance criteria groups | Screen layout, Payments, Options + delete, Toast | Confirmed in the drill | User |
| D10 | One ledger reader | `fetchPlayerLedger` replaces `fetchShuttlePaymentsByPlayerSessions` on this screen | The old reader only sees sessions with charges | Claude — straightforward (spec) |
| D11 | Open-session estimates | `previewSessionCharges` for each open session the player is in | Numbers match session detail exactly (spec) | Claude — straightforward (spec) |
| D12 | `BottomActionBar` | Add a `clay` tone and a `disabled` prop | Selection mode needs a clay Waive button and a disabled empty state | Claude — straightforward |
| D13 | `StatusBadge` | Add a `waived` variant: `muted` on `neutral-tint` | From the spec. Can't be reached until a waive backend exists | Claude — straightforward (spec) |
| D14 | Rounding | Sum stored 2-decimal shares and round totals to cents, as `roundToCents` does in `services/session.ts` | Avoids float drift in displayed totals | Claude — straightforward |

## Overview
A player's charges live in two tables, both created by `closeSession`:
- `shuttle_payments`: one row per player per paid shuttle instance
- `court_payments`: one row per player per court booking

`amount_paid` holds the amount still **owed**. Paying sets it to 0 and stamps `date_paid`. Open sessions have no rows yet, so their figures are estimates from `previewSessionCharges`. The screen addresses charges by a `ChargeKey`: `court:{sessionId}` or `shuttle:{shuttleInstanceId}`.

Questions the data answers:
1. **How much does this player owe?** → `SUM(amount_paid)` over both payment tables for the player.
2. **How much have they paid to date?** → a **sample** for now (D2): the sum of the sample paid amounts of rows with `date_paid IS NOT NULL`. PRD [5] makes it real.
3. **Which sessions did they join?** → `DISTINCT matches.session_id` via `match_players`, for any session status.
4. **How much do they owe per session?** → payment rows grouped by `shuttle_instances.session_id` / `court_bookings.session_id`.
5. **Which matches did they play, and with whom?** → `matches` + `match_players` + `players.name`, grouped by `position` the way `MatchCard` does.
6. **How was each share worked out?** →
   - shuttle: unit price (`shuttles.total_price / num_of_shuttles`) ÷ the instance's distinct players
   - court: `SUM(price × quantity)` ÷ the session's distinct players
7. **Can they be deleted (UI)?** → owed = 0 **and** they haven't played a match in an open session.

Non-obvious design decisions:
1. **Sample values live in one file and nowhere else** ([D2](#decision-log)). Components never hard-code an amount. `fetchPlayerLedger` asks `services/player-ledger-sample.ts` for the paid figures it can't read. When PRD [5] removes that file, every sample goes with it.
2. **A reused shuttle is listed once, under its first match.** A player is charged once per instance. Listing it under every match would make the shown total disagree with the owed total. The sub-line adds "· reused".
3. **The court share is one row per session, not per booking.** The player thinks of "my court share". Picking it pays every court row of theirs in that session.
4. **Owed leaves out open sessions.** Nothing is charged until close, so an open session shows only a caption and an `≈` estimate.
5. **Waive is a dead end on purpose** ([D3](#decision-log)).

## Data Model
No schema change. **Reset needed:** no. `npm run db:fresh` is still used to load the `default` seed for checking.

### Tables read
| Table | Purpose in this feature |
|---|---|
| `players` | Name, `avatar_colour`, `status` |
| `sessions` | Name, date, `status`, and the title via `formatSessionTitle` |
| `matches` / `match_players` | Sessions joined, matches played, team pairing by `position` |
| `shuttle_instances` / `match_shuttle_instances` | Which instance a charge is for, its first match, the reused flag |
| `shuttles` | Type name and unit price |
| `court_bookings` | Total court cost |
| `shuttle_payments` / `court_payments` | Owed (`amount_paid`) and `date_paid` |

### Sample values (**new** `services/player-ledger-sample.ts`)
| Export | Used for | Replaced by (PRD [5]) |
|---|---|---|
| `SAMPLE_PAID_SHUTTLE_SHARE` (e.g. 2.25) | Struck-through amount on a paid shuttle charge | `shuttle_payments.amount_charged` |
| `SAMPLE_PAID_COURT_SHARE` (e.g. 10) | Struck-through amount on a paid court share | `court_payments.amount_charged` |
| derived sums | Paid-to-date legend and bar, settled session "· paid RM X", the All settled caption | Sums of `amount_charged` over paid rows |

## State Machine
Charge (one payment row):
```
[owed] ──► [paid]          (paySessionInFull / payShuttleInstancesByIds / payCourtBySessionId)
   ┆
   └┄┄► [waived]           reserved, can't be reached (D3)
```

Session, as the player sees it:
| Condition | State | Badge |
|---|---|---|
| `sessions.status = 'open'` and the player played in it | open | `≈ RM X` |
| closed, any of the player's rows has `amount_paid > 0` | owing | `Owes RM X` |
| closed, every row paid | settled | `Settled` |

Screen mode:
```
[view] ──Pay individually──► [pay-select] ──Pay RM X──► [confirming] ──success──► [view] + toast
  │                              │ Cancel / back ─────────────────────────────► [view]
  ├──Waive──► [waive-select] ── button disabled; Cancel / back ──► [view]
  ├──Pay all / Pay session──► [confirming] ──success──► [view] + toast
  └──⋯──► [options sheet] ──Delete──► DeletePlayerDialog
```

**Pay actions are blocked when:** nothing is owed (the buttons are hidden), or nothing is picked (the bottom bar is disabled).
**Delete is blocked (UI) when:** owed > 0, or the player is in an open session.

## Writers
No new or changed writers. The screen calls these existing ones:

### 1. Pay all → loop `paySessionInFull`
> Source: [services/shuttle-payments.ts](../../services/shuttle-payments.ts)

**Trigger:** **Pay all · RM X** → confirmation → Mark paid.

**What it does:** calls `paySessionInFull({ sessionId, player_id })` once per owing closed session.

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|
| owed > 0 | Pay all isn't shown |
| a call throws | The dialog stays open with "Couldn't save the payment. Try again." Sessions already paid stay paid, and a retry pays the rest |

### 2. Pay session → `paySessionInFull`
**Trigger:** **Pay session · RM X** on an owing card → confirmation.

### 3. Pay picked charges → `payShuttleInstancesByIds` + `payCourtBySessionId`
**Trigger:** selection mode (pay) → **Pay RM X** → confirmation.

**What it does:**
1. Calls `payShuttleInstancesByIds({ shuttleCharges, player_id })` once with the picked shuttle charges. The screen passes objects carrying `shuttle_instance_id`, mapped from the ledger to `ShuttleInstanceCharge`.
2. Calls `payCourtBySessionId({ sessionId, player_id })` for each picked court share.

**Edge cases:**
- It isn't atomic. If a call fails partway, the inline error shows and the screen refetches, so picks that already went through show as paid.
- The writers don't skip already-paid shuttle rows, so the UI only allows owed rows to be picked.

**Does not write:** schema, `deletePlayer`, or any service code.

## Readers
### `fetchPlayerLedger(playerId)` (**new**, read-only)
> Source: [services/player.ts](../../services/player.ts)

**Returns:**
- `player`
- `sessionCount`, `matchCount`: across every session joined, open ones included
- `totals`: `{ owed, paid, sessionsOwing, closedSessions }`. `paid` is a sample (D2).
- `sessions[]`, sorted owing → open → settled, newest first within each group. Each session has:
  - `session_id`, `name`, `date`, `status`, `title`, `state`, `owed`, `paid` (sample)
  - `matches[]`: `match_id`, `match_number`, players with `position`, `charges[]` (the charges whose **first** match this is), and `freeOnly`
  - `court`: `{ owed, paidAmount (sample when paid), datePaid, courtTotal, playerCount } | null`
  - each shuttle charge: `shuttle_instance_id`, `shuttleName`, `unitPrice`, `playerCount`, `firstMatchId`, `reused`, `owed`, `paidAmount` (sample when paid), `datePaid`
  - open sessions: `estimate` from `previewSessionCharges` (the player's total and the estimated share per instance)

Free shuttles are left out.

**Why:** one read builds the whole screen.

| Consumer | File |
|---|---|
| Player detail screen | `app/player/[playerId]/index.tsx` |

### `fetchPlayerDeleteBlockers(playerId)` (**new**, read-only)
**Returns:** `{ owed: number, inOpenSession: boolean }`. **Why:** the options sheet row. PRD [5] makes `deletePlayer` call it too.

### `previewSessionCharges` (existing, reused)
> Source: [services/session.ts](../../services/session.ts)

## End-to-End Flows
### Happy path: Pay all
```
User taps "Pay all · RM 23.75"
  └─► SettleChargesDialog: one line per owing session + Total, "Nothing left to pay"
        └─► Mark paid
              ├─ for each owing session: paySessionInFull
              ├─ refetch fetchPlayerLedger
              └─ close dialog → toast "Paid RM 23.75" (1.5s) → ALL SETTLED, RM 0
```

### Happy path: Pay individually, including a court share
```
User taps "Pay individually"
  └─► pay-select: owing sessions only, expanded, checkboxes on Court share + shuttle charges
        ├─ session box: unchecked/mixed → all; checked → none
        ├─ bottom bar "3 charges picked · RM 14.50" / "Pay RM 14.50"
        └─► SettleChargesDialog grouped by session, Total, "Still owed afterwards: RM 9.25"
              └─► Mark paid → payShuttleInstancesByIds + payCourtBySessionId → refetch → view → toast "Paid RM 14.50"
```

### Edge case: Waive
```
User taps "Waive" → waive-select (clay), helper "Tick what Chloe no longer has to pay."
  └─ bottom button "Waive · coming soon", disabled → Cancel returns to view, nothing written
```

### Edge case: Delete blocked or allowed
```
⋯ → Player options
  ├─ owed > 0         → disabled, "Settle RM 23.75 first"
  ├─ in open session  → disabled, "In an open session — close it first"
  └─ neither          → "Delete player" → DeletePlayerDialog → deletePlayer → Players tab
```

### Edge case: Write fails
```
Mark paid → writer throws → dialog stays open, inline "Couldn't save the payment. Try again.", picks kept, refetch
```

### Edge case: Never played
```
sessions = [] → "No sessions yet", ALL SETTLED RM 0 (no caption), EmptyState "No sessions yet"
```

## Blast Radius
| Change | What breaks |
|---|---|
| Sample paid amounts | Paid figures on this screen are not real until PRD [5]. Nothing else reads them |
| Toast moved to `useAppToast` | Session detail's "Session deleted" now shows for 1.5s |
| `BottomActionBar` `disabled` / `clay` | Nothing. Both props are optional |
| `StatusBadge` `waived` | Nothing. It's a new variant |
| Retiring `PageHeader`, `ListRow`, `PaymentConfirmationDialog`, `Checkbox` **on this screen** | Nothing. Other screens still import them |
| `fetchShuttlePaymentsByPlayerSessions` unused here | Delete it only if grep finds no other caller |

## File Reference
| File | Role |
|---|---|
| [app/player/[playerId]/index.tsx](../../app/player/[playerId]/index.tsx) | Rebuilt screen: modes, selection state, dialogs |
| [services/player.ts](../../services/player.ts) | **new** `fetchPlayerLedger`, `fetchPlayerDeleteBlockers` (read-only) |
| `services/player-ledger-sample.ts` | **new**. The only place sample paid values live. PRD [5] deletes it |
| [services/shuttle-payments.ts](../../services/shuttle-payments.ts) | Existing writers, unchanged |
| [services/session.ts](../../services/session.ts) | `previewSessionCharges`, `formatSessionTitle`, reused |
| [services/money-display.ts](../../services/money-display.ts) | `formatRM` |
| [app/session/[sessionId]/index.tsx](../../app/session/[sessionId]/index.tsx) | Toast moved to `useAppToast` |
| [components/shared/StatusBadge.tsx](../../components/shared/StatusBadge.tsx) | `waived` variant |
| [components/layout/BottomActionBar.tsx](../../components/layout/BottomActionBar.tsx) | `clay` tone, `disabled` prop |
| [components/shared/ActionSheet.tsx](../../components/shared/ActionSheet.tsx), [Avatar.tsx](../../components/shared/Avatar.tsx), [EmptyState.tsx](../../components/shared/EmptyState.tsx) | Reused |
| [components/session/match/ShuttleGlyph.tsx](../../components/session/match/ShuttleGlyph.tsx) | Charge row tile |
| [components/session/MatchCard.tsx](../../components/session/MatchCard.tsx) | Team pairing logic to reuse |
| [components/user/deletePlayerDialog.tsx](../../components/user/deletePlayerDialog.tsx) | Reused delete confirmation |
| `components/player/BalanceCard.tsx`, `SessionChargesCard.tsx`, `ChargeRow.tsx`, `SettleChargesDialog.tsx`, `PlayerOptionsSheet.tsx` | **new** |
| `components/shared/SelectBox.tsx` | **new**. Tri-state checkbox, `sage` / `clay`, 44pt hit area |
| `components/shared/AppToast.tsx` | **new**. `useAppToast()` → `show(message)`, Gluestack `useToast` with `duration: 1500`, bottom placement |

---

## Acceptance Criteria
**Screen layout**
- [ ] AC1: The header shows the avatar, name and "N sessions · M matches" (correct plurals, open sessions included), with ⋯ on the right and no Delete button.
- [ ] AC2: The balance card shows the real total owed across closed sessions, the paid/owed bar and legend (paid from the sample file), and the open-session caption when the player is in an open session.
- [ ] AC3: Pay all is the only filled primary button. Pay individually and Waive are secondary.
- [ ] AC4: Every session the player joined is listed in the order owing → open → settled, with the right badge (`Owes RM X`, `≈ RM X`, `Settled`).
- [ ] AC5: Owing sessions show **Pay session · RM X** while collapsed.
- [ ] AC6: Expanding a session shows the court share ("RM X ÷ N players"), each match with its teams, and its shuttle charges ("RM X ÷ N players"). Paid charges show "Paid D Mon YYYY" (real date) with a struck-through amount.
- [ ] AC7: A reused shuttle appears once, under its first match, marked "reused". A match with only free shuttles shows "Free shuttles only".
- [ ] AC8: Open session cards show `≈` amounts from `previewSessionCharges` that match session detail, and have no Pay button.
- [ ] AC9: Loading shows a skeleton. A player who never played shows the "No sessions yet" state. At large Dynamic Type, names wrap and the balance actions stack.
- [ ] AC10: Every amount uses `formatRM`, and no `$` remains on this screen. Sample values come only from `services/player-ledger-sample.ts` (grep finds no other hard-coded paid amounts).

**Payments**
- [ ] AC11: Pay all and Pay session open a confirmation listing one line per session, the total, and "Nothing left to pay" or the remaining amount. Confirming pays through `paySessionInFull`.
- [ ] AC12: Pay individually enters selection mode:
  - only owing sessions are shown, all expanded
  - checkboxes appear on court shares and shuttle charges, plus a tri-state checkbox per session
  - paid rows are disabled
  - Select all / Clear all work
- [ ] AC13: The bottom bar shows "N charges picked" and the total, and is disabled with "Tick charges to pay" when nothing is picked.
- [ ] AC14: Confirming a pick pays the picked shuttles (`payShuttleInstancesByIds`) and court shares (`payCourtBySessionId`). If it fails, the inline error shows.
- [ ] AC15: After a successful payment, the dialog closes, the screen returns to view mode and refetches, and the toast "Paid RM X" shows.
- [ ] AC16: Cancel (or back) in selection mode returns to view with no changes.
- [ ] AC17: Waive enters the clay selection mode with the "Waive charges" title and helper. Its button reads "Waive · coming soon" and is always disabled. Nothing is written.

**Options + delete**
- [ ] AC18: ⋯ opens Player options, which contains only Delete player.
- [ ] AC19: Delete player is disabled with "Settle RM X first" while anything is owed, and with "In an open session — close it first" while the player is in an open session.
- [ ] AC20: Otherwise it opens `DeletePlayerDialog`. Confirming soft-deletes the player and returns to the Players tab.

**Toast**
- [ ] AC21: `useAppToast().show(message)` shows an `ink` pill with a check icon at the bottom, above the tab bar or action bar. It is a polite live region and disappears after 1.5s. Session detail's "Session deleted" uses it.

**Checks**
- [ ] AC22: No changes in `services/database.js`, `closeSession`, `deletePlayer` or `services/shuttle-payments.ts` (`git diff` shows none).
- [ ] AC23: `npm run lint` and `npx tsc --noEmit` pass, and the change is checked on the iOS Simulator via Expo MCP with the `default` seed (`npm run db:fresh`). Never checked on web.

## Required Changes
- **Readers**: add `fetchPlayerLedger` and `fetchPlayerDeleteBlockers` ([Readers](#readers)).
- **Sample file**: add `services/player-ledger-sample.ts` ([Data Model](#data-model)).
- **Toast**: add `components/shared/AppToast.tsx` and move session detail onto it ([D4](#decision-log)).
- **Shared components**: `StatusBadge` `waived`, `BottomActionBar` `clay` + `disabled`, and the new `SelectBox`.
- **Player components**: `BalanceCard`, `SessionChargesCard`, `ChargeRow`, `SettleChargesDialog`, `PlayerOptionsSheet`, per the spec's layout sections.
- **Screen**: rebuild `app/player/[playerId]/index.tsx` with the modes in [State Machine](#state-machine), calling the writers in [Writers](#writers).
- **Docs**:
  - update features.md #10 and #14, noting that paid amounts are samples until PRD [5]
  - update the spec's Status line
  - copy the spec's proposed design-system changes into `design.md`'s decision log

## Features Catalog
- **Extends**: #10 Player balance and payments, #2 Deleting and restoring players (UI only)
- **Closes**: #14 Player play history (paid amounts become real in PRD [5])
- **Closes known gaps**: "No 'pay everything across all sessions' action." (#10)

## Open Questions
- [ ] Once a waive backend exists: does a waived share count as "settled" on session detail? (spec OQ3)
- [ ] Should a waiver take an optional note? (spec OQ2)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sample paid amounts are taken as real | Medium | Medium | They live in one named file, and PRD [5] is next. Note it in the PR and features.md |
| Pay individually isn't atomic (D6) | Low | Low | Refetch after a failure so paid rows show as paid. PRD [5] adds `payChargesByKeys` |
| Delete blocked in the UI but still possible from the service | Low | Low | No other caller deletes players. PRD [5] adds the service guard |
| Waive UI mistaken for a working feature | Medium | Low | The button is disabled and labelled "coming soon" |

---
*Status: READY — ticket [4]. Backend follow-up: [5].*
