# [4]: Player detail redesign

The player detail screen (`app/player/[playerId]/index.tsx`) is where a session organiser lands after tapping a player. They are usually at the court or just after, while a player hands over cash or says they've transferred money. This ticket rebuilds the screen to the approved design spec ([.claude/design/specs/player-detail.md](../design/specs/player-detail.md), mockup https://claude.ai/artifact/4q4VyNMLykPH61DpY7SdkM). The screen answers the organiser's questions in this order:
1. How much does the player owe?
2. Which sessions did they join?
3. How much do they owe for each one?
4. Which matches did they play, and which shuttles is each charge for?
5. What should I do next?

This ticket is **frontend only**. Every read and write it needs already exists from [PRD 5](partial/5-player-payments-backend.prd.md) (see its [Contract for frontend](partial/5-player-payments-backend.prd.md#contract-for-frontend)):
- `fetchPlayerLedger` supplies the screen, with real paid amounts and no sample data.
- `fetchPlayerDeleteBlockers` sets the Delete row's state.
- `paySessionInFull` and `payChargesByKeys` record payments.

This ticket never edits `services/` or the schema. Waive is design only.

At the top, a balance card shows the total owed, a paid/owed bar, and the one primary action **Pay all**, with **Pay individually** and **Waive** beside it. Below it, every session the player joined is a collapsible card. Owing sessions come first, then open ones (with an estimate), then settled ones. Expanding a card shows the court share, and each match with its teams and shuttle charges.

Pay individually switches the screen to a selection mode. It has tri-state checkboxes over shuttle charges and court shares, and a fixed bottom bar. Every payment asks for confirmation, then a new global toast ("Paid RM 23.75") shows for 1.5 seconds. Waive opens the same selection mode in clay, but its button stays disabled. Delete player moves into a ⋯ Player options sheet, and is disabled while the player owes anything or is in an open session.

## Summary
This replaces the old teal player screen, which showed only owing sessions and used `$`, with the design-system screen from the spec. It adds:
- new player components
- a reusable 1.5s toast, which also replaces the inline "Session deleted" toast on session detail
- two small additions to shared components

Unchanged: everything under `services/`, the schema, and every other screen's data. The backend half is PRD [5], which ships first.

## Users
- **Primary**: the session organiser, on their phone. They record that a player has paid (all, one session, or specific shuttles and courts), and answer "why do I owe this much?".
- **Not for**:
  - Players. The app is single-user and local-only.
  - Deleted players. They are reached from Recently deleted, which keeps its own screen.

## Problem
The organiser can't see a player's history, and one cash handover takes several separate payments to record:
- Only owing sessions are listed. Settled sessions disappear.
- There is no "pay everything" action.
- Courts can't be picked alongside shuttles.
- The red Delete button sits next to the money actions.

## Evidence
- features.md #14 "Player play history" is planned but not built: "Today the screen shows only what's still owed."
- features.md #10 known gap: "No 'pay everything across all sessions' action."
- The user approved the mockup ("Looks fantastic").

## Hypothesis
We believe **a ledger-first player screen with Pay all, Pay session and a mixed Pay individually** will **make recording a payment one or two taps and answer "why do I owe this?"** for **session organisers**.
We'll know we're right when **a payment is recorded in 2 taps before confirming, and no organiser needs another screen to explain a charge**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Taps from opening player detail to confirming Pay all | 2 | Manual walkthrough on the simulator |
| Charges explainable from this screen alone | 100% (every court and shuttle share shows how it was worked out) | Manual check against the seed data |
| Real-world usage | TBD — needs validation via organiser feedback after release | — |

## Scope
**MVP**
- Header with avatar, name, "N sessions · M matches" and ⋯
- Balance card with owed, the paid/owed bar (real paid amounts), the open-session caption, and Pay all / Pay individually / Waive
- Every session the player joined, as collapsible cards with the court share, matches, teams and charges
- Pay all (D5), Pay session, and Pay individually including court shares (D6), each behind a confirmation
- Waive: the selection-mode UI only, with a disabled button (D3)
- A Player options sheet with Delete player only, disabled while the player owes or is in an open session (D7)
- A global 1.5s toast, with session detail's "Session deleted" moved onto it (D4)

**Out of scope**
- Any `services/` or schema change. That is PRD [5]. If the ledger is missing something, raise a backend follow-up instead of editing services (D2).
- The waive backend. The user deferred it.
- Partial payment, undo, waive notes, a detail view for deleted players, and Pay Early (#11).

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [State Machine](#state-machine)
4. [Writers](#writers)
5. [Readers](#readers)
6. [End-to-End Flows](#end-to-end-flows)
7. [Blast Radius](#blast-radius)
8. [File Reference](#file-reference)
9. [Acceptance Criteria](#acceptance-criteria)
10. [Required Changes](#required-changes)

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Scope | Frontend only. Rebuild `app/player/[playerId]/index.tsx` to the spec, and add a global toast | The spec is approved. The backend lives in PRD [5] | User |
| D2 | Backend tasks | Every read and write comes from PRD [5]'s Contract for frontend: `fetchPlayerLedger`, `fetchPlayerDeleteBlockers`, `deletePlayer`, `paySessionInFull` and `payChargesByKeys`. No sample data, and no `services/` edits | Keeps this ticket frontend only, with the backend shipped first | User |
| D3 | Waive | Waive opens the clay selection mode with tri-state checkboxes. The bottom button reads "Waive · coming soon" and stays disabled, so there is no confirmation and nothing is written. The `waived` badge and row states are built but can't be reached | Shows the design without pretending the backend works | User |
| D4 | Toast | Global, at the bottom above the tab bar or action bar. An `ink` pill with `surface` text and a check icon. It auto-hides after **1.5s**, is a polite live region, and needs no tap. The existing "Session deleted" toast moves onto it | One standard toast that can be reused anywhere | User |
| D5 | Pay all | The screen loops `paySessionInFull` over every closed session the player owes on | The user chose this. Each call is idempotent | User |
| D6 | Pay individually | One `payChargesByKeys` call, with the `key` values from the ledger (`court:{sessionId}`, `shuttle:{id}`) | Courts and shuttles are paid in one atomic write (PRD [5]) | User |
| D7 | Delete rule | The options sheet uses `fetchPlayerDeleteBlockers`. It is disabled with "Settle RM X first" while the player owes money, and with "In an open session — close it first" while they're in an open session. `deletePlayer` enforces the same rule | The UI and the service share one rule (PRD [5]) | User |
| D8 | Acceptance criteria groups | Screen layout, Payments, Options + delete, Toast | Confirmed in the drill | User |
| D9 | Old reader | Stop calling `fetchShuttlePaymentsByPlayerSessions`, but don't delete it, because that's a `services/` change | Frontend-only rule | Claude — straightforward |
| D10 | `BottomActionBar` | Add a `clay` tone and a `disabled` prop | Selection mode needs a clay Waive button and a disabled empty state. This is a component, not a service | Claude — straightforward |
| D11 | `StatusBadge` | Add a `waived` variant: `muted` on `neutral-tint` | From the spec. It can't be reached until a waive backend exists | Claude — straightforward (spec) |
| D12 | Ledger rendering | Render `PlayerLedger` as returned: its order, first-match placement, the `reused` flag, `freeOnly` and `estimate`. Components don't re-sort or re-group | PRD [5] D10 already shapes it for this screen | Claude — straightforward |

## Overview
The screen renders one `PlayerLedger` (from PRD [5]), plus `fetchPlayerDeleteBlockers` for the options sheet. Every charge in the ledger carries a `key`, either `court:{sessionId}` or `shuttle:{id}`. The selection state is a `Set` of those keys, passed unchanged to `payChargesByKeys`.

What the screen shows, and where each value comes from:
1. **Owed, paid, sessions owing** → `ledger.totals`
2. **"N sessions · M matches"** → `ledger.sessionCount`, `ledger.matchCount`
3. **Session cards** → `ledger.sessions`, already in display order. `state` drives the badge
4. **Court row** → `session.court`: "RM {courtTotal} ÷ {playerCount} players"
5. **Shuttle rows** → `match.charges`: "RM {unitPrice} ÷ {playerCount} players", plus "· reused" when it applies
6. **Paid rows** → `datePaid` is set: `charged` struck through, and "Paid D Mon YYYY"
7. **Open estimate** → `session.estimate`
8. **Delete state** → `fetchPlayerDeleteBlockers`

Non-obvious design decisions:
1. **The selection holds charge keys, not row objects.** That's exactly what `payChargesByKeys` takes. The confirmation dialog builds its grouped breakdown by looking the keys up in the ledger.
2. **Waive is a dead end on purpose** ([D3](#decision-log)).
3. **Owed leaves out open sessions.** The ledger gives open sessions only an `estimate`, so they show a caption and an `≈` figure.

## State Machine
Session badge, from `session.state`:
| `state` | Badge |
|---|---|
| `owing` | `Owes RM X` |
| `open` | `≈ RM X` |
| `settled` | `Settled` |

Screen mode:
```
[view] ──Pay individually──► [pay-select] ──Pay RM X──► [confirming] ──success──► [view] + toast
  │                              │ Cancel / back ─────────────────────────────► [view]
  ├──Waive──► [waive-select] ── button disabled; Cancel / back ──► [view]
  ├──Pay all / Pay session──► [confirming] ──success──► [view] + toast
  └──⋯──► [options sheet] ──Delete──► DeletePlayerDialog
```

**Pay actions are blocked when:** nothing is owed (the buttons are hidden), or nothing is picked (the bottom bar is disabled).
**Delete is blocked when:** `owed > 0` or `inOpenSession`.

## Writers
There are no new writers. The screen calls these from PRD [5]:

| User action | Call | On failure |
|---|---|---|
| Pay all | `paySessionInFull({ sessionId, player_id })` for each owing session | The dialog stays open with "Couldn't save the payment. Try again." A retry is safe |
| Pay session | `paySessionInFull({ sessionId, player_id })` | Same as Pay all |
| Pay picked | `payChargesByKeys({ playerId, keys: [...selected] })` | Everything rolls back. Inline error, and the picks are kept |
| Delete player | `deletePlayer(player_id)` via `DeletePlayerDialog` | `Alert` with the thrown message, as today |

## Readers
There are no new readers. The screen consumes:

| Function (PRD [5]) | Used for | File |
|---|---|---|
| `fetchPlayerLedger(playerId)` | The whole screen | `app/player/[playerId]/index.tsx` |
| `fetchPlayerDeleteBlockers(playerId)` | The Player options row | `app/player/[playerId]/index.tsx` → `PlayerOptionsSheet` |

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
              └─► Mark paid → payChargesByKeys → refetch → view → toast "Paid RM 14.50"
```

### Edge case: Waive
```
User taps "Waive" → waive-select (clay), helper "Tick what Chloe no longer has to pay."
  └─ bottom button "Waive · coming soon", disabled → Cancel returns to view, nothing written
```

### Edge case: Delete blocked or allowed
```
⋯ → Player options (fetchPlayerDeleteBlockers)
  ├─ owed > 0         → disabled, "Settle RM 23.75 first"
  ├─ in open session  → disabled, "In an open session — close it first"
  └─ neither          → "Delete player" → DeletePlayerDialog → deletePlayer → Players tab
```

### Edge case: Write fails
```
Mark paid → writer throws → dialog stays open, spinner stops, inline "Couldn't save the payment. Try again.", picks kept
```

### Edge case: Never played
```
ledger.sessions = [] → "No sessions yet", ALL SETTLED RM 0 (no caption), EmptyState "No sessions yet"
```

## Blast Radius
| Change | What breaks |
|---|---|
| Toast moved to `useAppToast` | Session detail's "Session deleted" now shows for 1.5s |
| `BottomActionBar` `disabled` / `clay` | Nothing. Both props are optional |
| `StatusBadge` `waived` | Nothing. It's a new variant |
| `PageHeader`, `ListRow`, `PaymentConfirmationDialog` and `Checkbox` retired **on this screen** | Nothing. Other screens still import them |
| Screen stops calling `fetchShuttlePaymentsByPlayerSessions` | Nothing. The function stays in `services/` (D9) |

## File Reference
| File | Role |
|---|---|
| [app/player/[playerId]/index.tsx](../../app/player/[playerId]/index.tsx) | The rebuilt screen: modes, selection state, dialogs |
| [app/session/[sessionId]/index.tsx](../../app/session/[sessionId]/index.tsx) | Toast moved to `useAppToast` |
| [components/shared/StatusBadge.tsx](../../components/shared/StatusBadge.tsx) | `waived` variant |
| [components/layout/BottomActionBar.tsx](../../components/layout/BottomActionBar.tsx) | `clay` tone, `disabled` prop |
| [components/shared/ActionSheet.tsx](../../components/shared/ActionSheet.tsx), [Avatar.tsx](../../components/shared/Avatar.tsx), [EmptyState.tsx](../../components/shared/EmptyState.tsx) | Reused |
| [components/session/match/ShuttleGlyph.tsx](../../components/session/match/ShuttleGlyph.tsx) | The tile on each charge row |
| [components/session/MatchCard.tsx](../../components/session/MatchCard.tsx) | Team pairing logic to reuse (extract it into a component helper if needed) |
| [components/user/deletePlayerDialog.tsx](../../components/user/deletePlayerDialog.tsx) | The delete confirmation, reused |
| `components/player/BalanceCard.tsx`, `SessionChargesCard.tsx`, `ChargeRow.tsx`, `SettleChargesDialog.tsx`, `PlayerOptionsSheet.tsx` | **New** |
| `components/shared/SelectBox.tsx` | **New**. A tri-state checkbox in `sage` or `clay`, with a 44pt hit area |
| `components/shared/AppToast.tsx` | **New**. `useAppToast()` → `show(message)`, built on Gluestack's `useToast` with `duration: 1500` and bottom placement |
| [services/player.ts](../../services/player.ts), [services/shuttle-payments.ts](../../services/shuttle-payments.ts), [services/money-display.ts](../../services/money-display.ts) | Read only: the PRD [5] contract and `formatRM` |

---

## Acceptance Criteria
**Screen layout**
- [ ] AC1: The header shows the avatar, the name and "N sessions · M matches" (correct plurals, open sessions included), with ⋯ on the right and no Delete button.
- [ ] AC2: The balance card shows the total owed across closed sessions, the paid/owed bar and legend (real paid amounts from the ledger), and the open-session caption when the player is in an open session.
- [ ] AC3: Pay all is the only filled primary button. Pay individually and Waive are secondary.
- [ ] AC4: Every session the player joined is listed in the ledger's order (owing → open → settled), with the right badge: `Owes RM X`, `≈ RM X` or `Settled`.
- [ ] AC5: Owing sessions show **Pay session · RM X** while collapsed.
- [ ] AC6: Expanding a session shows the court share ("RM X ÷ N players"), and each match with its teams and its shuttle charges ("RM X ÷ N players"). Paid charges show "Paid D Mon YYYY", with the real charged amount struck through.
- [ ] AC7: A reused shuttle appears once, under its first match, marked "reused". A match with only free shuttles shows "Free shuttles only".
- [ ] AC8: Open session cards show `≈` amounts from the ledger's `estimate` that match session detail, and have no Pay button.
- [ ] AC9: Loading shows a skeleton. A player who never played sees the "No sessions yet" state. At large Dynamic Type, names wrap and the balance actions stack.
- [ ] AC10: Every amount uses `formatRM`, and no `$` remains on this screen.

**Payments**
- [ ] AC11: Pay all and Pay session open a confirmation that lists one line per session, the total, and either "Nothing left to pay" or the amount still owed. Confirming pays through `paySessionInFull`.
- [ ] AC12: Pay individually enters selection mode:
  - Only owing sessions show, and they are expanded.
  - Court shares and shuttle charges have checkboxes, and each session has a tri-state checkbox.
  - Paid rows are disabled.
  - Select all / Clear all work.
- [ ] AC13: The bottom bar shows "N charges picked" and the total. With nothing picked, it is disabled and reads "Tick charges to pay".
- [ ] AC14: Confirming a pick calls `payChargesByKeys` once with the picked keys. On failure, the inline error shows and the picks are kept.
- [ ] AC15: After a successful payment, the dialog closes, the screen returns to view mode and refetches, and the toast "Paid RM X" shows.
- [ ] AC16: Cancel (or back) in selection mode returns to view mode with no changes.
- [ ] AC17: Waive enters the clay selection mode with the "Waive charges" title and helper. Its button reads "Waive · coming soon" and is always disabled. Nothing is written.

**Options + delete**
- [ ] AC18: ⋯ opens Player options, which has only Delete player.
- [ ] AC19: Delete player is disabled with "Settle RM X first" while anything is owed, and with "In an open session — close it first" while the player is in an open session. Both come from `fetchPlayerDeleteBlockers`.
- [ ] AC20: Otherwise it opens `DeletePlayerDialog`. Confirming soft-deletes the player and returns to the Players tab.

**Toast**
- [ ] AC21: `useAppToast().show(message)` shows an `ink` pill with a check icon at the bottom, above the tab bar or action bar. It is a polite live region and disappears after 1.5s. Session detail's "Session deleted" uses it.

**Checks**
- [ ] AC22: The PR changes nothing under `services/` and doesn't touch the schema (`git diff --stat` against the base shows none).
- [ ] AC23: `npm run lint` and `npx tsc --noEmit` pass, and the change is checked on the iOS Simulator via Expo MCP with the `default` seed (`npm run db:fresh`). Never checked on web.

## Required Changes
- **Toast**: add `components/shared/AppToast.tsx` and move session detail onto it ([D4](#decision-log)).
- **Shared components**: add the `StatusBadge` `waived` variant, the `BottomActionBar` `clay` tone and `disabled` prop, and the new `SelectBox`.
- **Player components**: build `BalanceCard`, `SessionChargesCard`, `ChargeRow`, `SettleChargesDialog` and `PlayerOptionsSheet`, following the spec's layout sections.
- **Screen**: rebuild `app/player/[playerId]/index.tsx` with the modes in [State Machine](#state-machine), calling the functions listed in [Writers](#writers) and [Readers](#readers).
- **PRD [5]**: tick its AC5 once Pay individually calls only `payChargesByKeys`. Move it to `completed/` if everything else there is verified.
- **Docs**: update features.md #10 and #14, and the spec's Status line. Copy the spec's proposed design-system changes into `design.md`'s decision log.

## Features Catalog
- **Extends**: #10 Player balance and payments, #2 Deleting and restoring players (UI)
- **Closes**: #14 Player play history
- **Closes known gaps**: "No 'pay everything across all sessions' action." (#10)

## Open Questions
- [ ] Once a waive backend exists, does a waived share count as "settled" on session detail? (spec OQ3)
- [ ] Should a waiver take an optional note? (spec OQ2)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The ledger is missing a field the design needs | Low | Medium | Raise a backend follow-up. Don't edit `services/` here (D2) |
| Someone mistakes the Waive UI for a working feature | Medium | Low | The button is disabled and labelled "coming soon" |

---
*Status: READY — ticket [4]. Requires PRD [5] (PR #22) merged first.*
