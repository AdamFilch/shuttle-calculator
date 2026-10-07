# [3]: Session detail redesign

The session detail screen (`app/session/[sessionId]/index.tsx`) is where a session organiser lands after tapping a session, usually at the court between games. This ticket rebuilds it to the approved design spec ([.claude/design/specs/session-detail.md](../design/specs/session-detail.md), mockup https://claude.ai/artifact/MTwbggBYKAzt7EBQq55n5G). The order of the screen follows the organiser's questions: how much is owed, how many players joined, how many shuttles were used, what to do next, and which matches were played.

While a session is open, nothing has been charged yet, so the screen shows a live estimate built from the same maths `closeSession` uses. Each player's estimated share is listed, and new matches and court bookings update the figures as soon as the user returns to the screen. A fixed bottom bar holds Create match and either Close session (once a match exists) or Delete session (while the session has no matches, because an empty session is deleted rather than closed). The ⋯ button opens a Session options bottom sheet with Book courts and Delete session, and Book courts is itself a bottom sheet. Closing asks for confirmation in a new dialog that lists each player's exact share. Closing also stores the session's total charge in a new `sessions.amount_due` column, for accounting. Once closed, the screen shows what is still owed out of that total, how much has been paid, and who has settled, and offers no actions.

## Summary
This is a restyle of the session detail screen to the design system, plus a few process changes from the spec:
- an open-session estimate, from a new shared `previewSessionCharges`
- a close confirmation that shows each player's share
- Book courts as a validated bottom sheet with an optional duration
- empty sessions are deleted instead of closed
- a new `sessions.amount_due` column records the total charged at close

Settlement amounts, rounding, payments and every other screen stay exactly as they are. The schema change needs a database reset (`npm run db:fresh`).

## Users
- **Primary**: the session organiser, on their phone at the court. They create matches between games, book courts, and close the session at the end of the night to settle who owes what.
- **Not for**: players recording their own payments. That stays on the player detail screen, which this screen now links to.

## Scope
**MVP**
- New layout: header, estimate card, three stat tiles, Players, Matches, fixed bottom bar (open sessions).
- Closed layout: still owed of `amount_due`, paid vs owed, N of M settled, Owes/Settled badges, closed note, no actions.
- `sessions.amount_due` (**new** column), written by `closeSession`.
- `previewSessionCharges` (**new**), shared by the screen, the close dialog and `closeSession`.
- Session options sheet and Book courts sheet (Gluestack Actionsheet, **new** in `components/ui`).
- **New** `CloseSessionDialog` with grouped shares.
- Delete empty session: bottom bar button, ⋯ row, confirmation dialog, `deleteEmptySession` (**new**), toast.

**Out of scope**
- Rounding fix — settlement must not change (D9); this belongs in its own ticket.
- Per-player original shares (`amount_due` on payment rows) and per-player "paid RM X" — only the session total is stored (D3, D32).
- A migration for existing data — the project resets instead (D33).
- Home `StatCard` → `StatTile`, Sessions list redesign, the "In progress" label — other screens stay unchanged (AC5, D12).
- Pay Early / `PayByPlayerModal` — it's commented out today (D22).
- Edit session and closed-session options — nothing to put in ⋯ yet (D11).

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Data Model](#data-model)
4. [State Machine](#state-machine)
5. [Writers](#writers)
6. [Readers](#readers)
7. [Screen Behaviour](#screen-behaviour)
8. [End-to-End Flows](#end-to-end-flows)
9. [Blast Radius](#blast-radius)
10. [File Reference](#file-reference)

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Ticket type and framing | Change ticket: session detail redesign plus the spec's small process changes | Restyle of a built screen; actions keep their behaviour | User |
| D2 | Which dialog AC3 means | The new "Close session?" confirmation listing each player's share | Matches the spec and mockup | User |
| D3 | Closed-session money view (revised in round 6) | "Still owed RM X of RM {amount_due}", session-level Paid / Owed, and "N of M settled". No per-player "paid RM X" | The user wants each session to keep the amount due, for accounting and to check prices; `amount_paid` alone is zeroed on payment | User |
| D4 | How the estimate is computed | New shared `previewSessionCharges()`, also used by `closeSession` | One source of truth, so the estimate can't drift from settlement | User |
| D5 | How the drawers are built | Gluestack Actionsheet added to `components/ui` | Same vendored library as `modal` and `menu` | User |
| D6 | Book courts inputs | Price > 0 validation; courts stepper (min 1) | Prevents RM 0 / NaN bookings | User |
| D7 | Duration in Book courts | Add an optional duration field | Parity with the create-session form | User |
| D8 | Close guard (revised in round 5) | Close session appears only once the session has a match; with 0 matches the slot is Delete session; the `closeSession` check stays as a backstop | An empty session can never be closed | User |
| D9 | Rounding | Unchanged: per-share `toFixed(2)` | Settlement must not change; fix in its own ticket | User |
| D10 | Open estimate figure | Real cost (courts + paid shuttles); the close dialog shows the share total | The headline matches its breakdown | User |
| D11 | ⋯ on closed sessions | Hidden | No empty menu | User |
| D12 | Open badge label | Keep "Open session" everywhere (not the spec's "In progress") | User preference | User |
| D13 | Tapping a player row | Opens player detail | Short path from "who owes" to "mark paid" | User |
| D14 | Duration unit | Hours in the form, stored as minutes | Same as [components/session/modal.tsx](../../components/session/modal.tsx) (`durationMinutes: hours * 60`) | Claude — straightforward |
| D15 | Closed card total (revised in round 6) | "of RM {amount_due}" comes from the stored column, never recomputed; the bar shows paid (`amount_due` − owed, sage) vs owed (clay) | Follows D3/D32. Shuttle prices can be edited after close (`updateShuttle`), so a recomputed total could be wrong | Claude — straightforward |
| D16 | Closed Shuttles tile sub-line | "N free", not an RM amount | Same reason as D15 | Claude — straightforward |
| D17 | Closed per-player amounts | `fetchAllPlayerPaymentsBySession`; participants with no payment rows show Settled | Existing reader in `services/player.ts` | Claude — straightforward |
| D18 | Where ⋯ lives | `headerRight` on the native stack header; title block stays in the content | The route already uses the root Stack's default header (`app/_layout.tsx`) | Claude — straightforward |
| D19 | Close confirmation component | New `CloseSessionDialog`; `PaymentConfirmationDialog` unchanged | Payment dialog callers stay untouched (AC5) | Claude — straightforward |
| D20 | Where `previewSessionCharges` lives | `services/session.ts` | `closeSession` is there | Claude — straightforward |
| D21 | Empty sessions (revised in round 5) | An empty open session can't be closed; it is deleted with everything tied to it, as if it never existed | User rule | User |
| D22 | Pay Early button | Stays out | Commented out today (features §10) | Claude — straightforward |
| D23 | Loading state | Skeleton cards | Per the spec | Claude — straightforward |
| D24 | What "empty" means | No matches yet, even with courts booked (those bookings are deleted too) | No dead end for "courts but no matches" | User |
| D25 | Where Delete appears | Both: replaces Close session in the bottom bar (red) and a row in ⋯ under Book courts | Discoverable | User |
| D26 | Delete in ⋯ once a match exists | Shown disabled with the caption "Sessions with matches can't be deleted" | Explains the rule | User |
| D27 | Delete confirmation | Dialog naming the session and its court bookings (count + RM); red Delete session + Cancel | Irreversible, so name what is lost | User |
| D28 | After deleting | Back to the Sessions list with a "Session deleted" toast | Clear outcome | User |
| D29 | Delete writer | New `deleteEmptySession(sessionId)` in `services/session.ts`: one transaction deletes `court_bookings` then `sessions`; throws unless `status = 'open'` and 0 matches | Session writers live there; with no matches there are no `shuttle_instances`, `match_players` or payment rows | Claude — straightforward |
| D30 | Destructive colour | Gluestack `error` red | design.md decision log 2026-10-06: no destructive colour in the system yet | Claude — straightforward |
| D31 | Old closed sessions with no matches | Left as they are | Already settled with no charges; not in scope | Claude — straightforward |
| D32 | Where the amount due is stored | New `sessions.amount_due` (REAL, NULL while open): the session's total charge | Accounting and checking prices; per-row storage not needed | User |
| D33 | Existing on-device data | Reset (`npm run db:fresh`); no migration code | Project rule in CLAUDE.md; no data to keep | User |
| D34 | Value of `amount_due` | Sum of the charged shares written at close (e.g. RM 47.04), so it always equals Σ of the session's payment rows at close | Reconciles with the payment rows; paid so far = `amount_due` − still owed | User |
| D35 | When `amount_due` is written | Inside `closeSession`'s transaction, in the same `UPDATE sessions` that sets `status = 'closed'`; never changed afterwards | One atomic close; the pattern is in `services/session.ts` | Claude — straightforward |

## Overview
A `sessions` row owns its `matches` (and through them `match_players`, `shuttle_instances` and `match_shuttle_instances`) plus its `court_bookings`. While the session is `open`, no charge rows exist. `closeSession` creates `shuttle_payments` / `court_payments` rows, one per player per charge, holding the amount still owed. This ticket only adds a read-only preview of those charges and a delete path for a session that never got a match.

Questions the data answers:
1. **How much is this session costing so far?** → `previewSessionCharges().courtTotal + shuttleTotal`. That is Σ `court_bookings.price × quantity` plus Σ unit price (`shuttles.total_price / num_of_shuttles`) over the distinct paid `shuttle_instances` used in the session's matches.
2. **What will each player owe?** → `previewSessionCharges().players[].total`, which is the same per-share `toFixed(2)` split `closeSession` uses (D4, D9).
3. **Who still owes after closing?** → `fetchAllPlayerPaymentsBySession(id)[].total_owed_amount > 0` (D17).
3a. **What was this session charged, and how much has been paid?** → `sessions.amount_due` (**new**); paid = `amount_due` − Σ `total_owed_amount` (D32, D34).
4. **Can this session be closed or deleted?** → `status = 'open'` and the match count: 0 matches means delete, ≥1 means close (D8, D21, D24).
5. **How many players and shuttles?** → distinct `match_players.player_id`; distinct `shuttle_instances` (free ones are those with `shuttle_id IS NULL`).

Non-obvious design decisions:
1. **`closeSession` is refactored to call `previewSessionCharges`.** The screen, the close dialog and the inserted rows then come from one calculation, so the estimate can't drift (D4). The risk is changing settlement by accident, so AC8 compares the inserted rows before and after on the default seed.
2. **The open headline is the real cost, not the sum of shares** (D10). Rounding each share can add a few sen. The dialog shows the share total so the user sees exactly what gets recorded.
3. **The closed total is stored, never recomputed** (D3, D15, D32). Shares are overwritten when paid, and shuttle prices can change after close, so a recomputed "of RM X" could be wrong. `sessions.amount_due` freezes what was billed at the moment of closing, which also gives the organiser a fixed figure to check against court and shuttle receipts.
4. **An empty session is deleted, not closed** (D21). Closing a session with no matches used to create a closed session with no charges. Deleting it leaves no trace, which is what the organiser means when a planned session didn't happen.

## Data Model
### `sessions` table (changed)
> Source: [services/database.js](../../services/database.js)

| Column | Type | Stored | Default | Description |
|---|---|---|---|---|
| `session_id` | INTEGER PK | yes | — | unchanged |
| `name`, `date`, `start_time`, `location` | TEXT | yes | — | unchanged |
| `status` | TEXT | yes | `'open'` | `open` / `closed`, unchanged |
| `closed_date` | TIMESTAMP | yes | NULL | unchanged |
| `amount_due` | REAL | yes | NULL | **New.** The total charged when the session closed: the sum of every `shuttle_payments` and `court_payments` amount inserted by `closeSession` (D34). NULL while open. Never updated after close. |

**Derived, not stored:** paid so far = `amount_due` − Σ current `amount_paid` of the session's payment rows. The estimate while open comes from `previewSessionCharges`.
**Constraints:** none new. `amount_due` is written only by `closeSession`.
**Reset needed:** yes. Run `npm run db:fresh` (or Settings → Reset Database), because `CREATE TABLE IF NOT EXISTS` won't add the column to an existing database (D33).

### Supporting tables (unchanged)
| Table | Purpose in this feature |
|---|---|
| `court_bookings` | Court cost; deleted along with an empty session |
| `shuttle_payments`, `court_payments` | Per-player charges written at close; `amount_paid` = still owed |
| `matches`, `match_players`, `shuttle_instances`, `match_shuttle_instances`, `shuttles` | Inputs to `previewSessionCharges` |

## State Machine
```
            create session
                  │
                  ▼
   ┌──────── [open, 0 matches] ──── Delete session ───► (row gone)
   │              │
   │        Create match
   │              ▼
   │      [open, ≥1 match] ──── Close session ───► [closed]
   │              │  ▲
   │              └──┘ Create match / Book courts
   └── Book courts (stays in [open, 0 matches])
```

| Condition | State | Bottom bar | ⋯ sheet |
|---|---|---|---|
| `status = 'open'`, 0 matches | open, empty | red **Delete session** + **Create match** | Book courts, Delete session (enabled) |
| `status = 'open'`, ≥1 match | open | sage **Close session** + **Create match** | Book courts, Delete session (disabled, with caption) |
| `status = 'closed'` | closed | none | ⋯ hidden |

**Close is blocked when:** there are 0 matches (the button isn't shown; `closeSession` still throws as a backstop).
**Delete is blocked when:** there is ≥1 match, or `status = 'closed'`.

## Writers
### 1. Close session → `closeSession` (changed)
> Source: [services/session.ts](../../services/session.ts)

**Trigger:** the sage Close session button in the bottom bar, then confirm in `CloseSessionDialog`.

**What it does:**
1. Checks that the session exists and is `open`.
2. Calls `previewSessionCharges(sessionId)` (**new**) to get every per-player court share and shuttle share.
3. In one transaction, inserts one `court_payments` row per player per booking and one `shuttle_payments` row per player per paid instance, with the same amounts as today. It then sets `status = 'closed'`, `closed_date = datetime('now')` and `amount_due = shareTotal` (the sum of the inserted amounts; **new**, D34, D35).

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|
| Session is open | Not reachable (no bar on closed sessions) |
| At least one match | Not reachable (Close isn't shown; the backstop error appears as today's alert) |

**Edge cases:**
- A paid instance with no players: skipped, as today.
- Free instances (`shuttle_id IS NULL`): no charge, as today.

**Does not write:** anything other than the rows it inserts today plus `sessions.amount_due`. Amounts and rounding are identical (D9).

### 2. Book a court → `bookCourt` (unchanged function, new form)
> Source: [services/court.ts](../../services/court.ts)

**Trigger:** the Book court button in the Book courts sheet.

**What it does:** inserts one `court_bookings` row with label, price, quantity, and `durationMinutes = hours × 60` when a duration is entered (D7, D14).

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|
| Price > 0 and a number | Book court disabled; on blur, "Enter a price above RM 0" under the field |
| Courts ≥ 1 | The stepper can't go below 1 |
| Duration empty or > 0 | "Enter hours above 0, or leave it empty" |

**Does not write:** payment rows (charges happen at close).

### 3. Delete an empty session → `deleteEmptySession` (**new**)
> Source: [services/session.ts](../../services/session.ts)

**Trigger:** the red Delete session button in the bottom bar, or the Delete session row in ⋯, then confirm in `DeleteSessionDialog` (**new**).

**What it does:**
1. Reads the session and counts its matches.
2. In one transaction: `DELETE FROM court_bookings WHERE session_id = ?`, then `DELETE FROM sessions WHERE session_id = ?`.

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|
| Session exists and `status = 'open'` | Error text in the dialog ("This session can't be deleted") |
| 0 matches | The button isn't shown and the ⋯ row is disabled; the function throws as a backstop |

**Edge cases:** there are no `shuttle_instances`, `match_players`, `match_shuttle_instances` or payment rows to delete, because those are only created by `createNewMatch` and `closeSession`.

**Does not write:** players, shuttles, `shuttle_purchases` or inventory.

## Readers
### `previewSessionCharges` (**new**)
> Source: [services/session.ts](../../services/session.ts)

**Returns:** `{ courtTotal, shuttleTotal, shareTotal, players: [{ player_id, name, avatar_colour, matches, court_share, shuttle_share, total }] }`. **Why:** the estimate card, the Players section (open), the close dialog, and the inserts in `closeSession`.

| Consumer | File |
|---|---|
| Session screen (open) | `app/session/[sessionId]/index.tsx` |
| `CloseSessionDialog` | `components/session/CloseSessionDialog.tsx` (**new**) |
| `closeSession` | `services/session.ts` |

### Existing readers
| Function | Used for | File |
|---|---|---|
| `fetchSessionById` | Header, matches (teams by position, shuttles, `match_date`), courts, and `amount_due` (comes through `SELECT *`; add it to the `Session` type) | [services/session.ts](../../services/session.ts) |
| `fetchCourtBookingsBySessionId` | Courts tile, Booked list, delete dialog | [services/court.ts](../../services/court.ts) |
| `fetchAllPlayerPaymentsBySession` | Closed: per-player owed, still owed total, N of M settled | [services/player.ts](../../services/player.ts) |

Each match needs a derived "reused / free" note. Free means `shuttle_id === null`. Reused means the instance is linked to an earlier match in the session. Derive this in `fetchSessionById` or in the screen; it is not stored.

## Screen Behaviour
The layout, tokens, copy and accessibility follow the [design spec](../design/specs/session-detail.md), with these overrides from the Decision Log:
- Open badge says **"Open session"** (D12).
- Closed estimate card: "STILL OWED RM X of RM {amount_due}"; a bar of paid (sage) vs owed (clay); the legend "Paid RM Y · Owed RM X"; and the caption "N of M players settled · closed D Mon YYYY" (D3, D15). Player rows show "N matches" with no per-player paid amount. The Shuttles tile sub-line is "N free" (D16).
- Bottom bar: red Delete session while there are 0 matches, sage Close session after the first match (D8, D25). There is no disabled "Add a match before closing" state.
- ⋯ is `headerRight` on the stack header and is hidden when closed (D11, D18). Session options holds Book courts, a separator, then Delete session (disabled with the caption once a match exists, D26).
- Book courts sheet: Booked list; label; price (RM prefix); courts stepper; optional duration (hours); "This booking RM X"; Cancel + Book court (D6, D7).
- `CloseSessionDialog`: "Close session?", the body text, shares grouped by amount, the share total, Cancel + sage Close session (D2, D19).
- `DeleteSessionDialog`: "Delete session?", then "This removes {title} and its {n} court booking(s) (RM X). This can't be undone." (the booking clause is left out when there are none). Cancel + red Delete session (D27, D30).
- Loading shows skeleton cards (D23). An empty session shows the Matches EmptyState and the estimate shows the court cost or RM 0.
- Player rows open `app/player/[playerId]` (D13). Match cards open `app/session/[sessionId]/[matchId]`.

## End-to-End Flows
### Happy path: play and close
```
Organiser opens an open session
  └─► previewSessionCharges + fetchSessionById
        └─ estimate, tiles, players (≈ shares), matches, bar [Close session][Create match]
Taps Create match → saves a match → returns
  └─► useFocusEffect refetch → estimate and shares update
Taps Close session
  └─► CloseSessionDialog (grouped shares, total)
        └─ Confirm → closeSession
              ├─ previewSessionCharges
              ├─ INSERT court_payments / shuttle_payments
              ├─ UPDATE sessions SET status = 'closed', closed_date, amount_due = shareTotal
              └─ screen refetches → closed layout, no bar, no ⋯
```

### Book courts from the options sheet
```
Taps ⋯ (or the Courts tile)
  └─► Session options sheet → Book courts
        └─► Book courts sheet: price 25, courts 2, duration 1.5
              └─ Book court → bookCourt(durationMinutes 90)
                    └─ Booked list and estimate update
```

### Edge case: delete an empty session
```
Session has 0 matches (courts may be booked)
  └─► Bar shows [Delete session][Create match]  (also ⋯ → Delete session)
        └─ DeleteSessionDialog names the bookings → Confirm
              └─► deleteEmptySession
                    ├─ guard: open and 0 matches
                    ├─ DELETE court_bookings, DELETE sessions (one transaction)
                    └─ navigate to the Sessions tab, toast "Session deleted"
```

### Edge case: ⋯ Delete after a match exists
```
⋯ → Delete session row is disabled: "Sessions with matches can't be deleted"
```

## Blast Radius
| Change | What breaks |
|---|---|
| `closeSession` refactored onto `previewSessionCharges` | Any mistake changes real charges for every future close. Covered by AC8 (rows identical before and after). `services/seed.ts` calls `closeSession`, so `db:fresh` exercises it. |
| New `deleteEmptySession` | Deleting a session with matches would orphan rows. The guard and the transaction prevent this. |
| New `sessions.amount_due` column | Existing installs miss the column until reset (queries reading it get `undefined`/NULL). Every dev must run `npm run db:fresh`. `fetchAllSessions` uses `s.*` and is unaffected. |
| Gluestack Actionsheet added to `components/ui` | New vendored code; existing `modal` / `menu` are untouched. |
| Session screen no longer uses `PageHeader`'s action, `ListRow` or `BookCourtModal` | `BookCourtModal` was only used here, so it is replaced by `BookCourtsSheet`. `ListRow` and `PageHeader` are still used elsewhere and stay. |
| `PlayerRow` gains a right-slot / sub-line prop | The Players tab uses it; the defaults must keep it unchanged (AC14). |

## File Reference
| File | Role |
|---|---|
| [app/session/[sessionId]/index.tsx](../../app/session/[sessionId]/index.tsx) | Rebuilt screen |
| [services/database.js](../../services/database.js) | `sessions.amount_due` (**new** column) |
| [services/session.ts](../../services/session.ts) | `previewSessionCharges` (**new**), `deleteEmptySession` (**new**), `closeSession` (refactored, writes `amount_due`), `Session` type gains `amount_due` |
| [services/court.ts](../../services/court.ts) | `bookCourt` (unchanged) |
| [services/player.ts](../../services/player.ts) | `fetchAllPlayerPaymentsBySession` (read) |
| `components/ui/actionsheet/` | **New**: vendored Gluestack Actionsheet |
| `components/session/EstimateCard.tsx` | **New** |
| `components/shared/StatTile.tsx` | **New** |
| `components/session/MatchCard.tsx` | **New** |
| `components/layout/BottomActionBar.tsx` | **New** |
| `components/session/SessionOptionsSheet.tsx` | **New** |
| `components/session/BookCourtsSheet.tsx` | **New**; replaces [components/session/bookCourtModal.tsx](../../components/session/bookCourtModal.tsx) |
| `components/session/CloseSessionDialog.tsx` | **New** |
| `components/session/DeleteSessionDialog.tsx` | **New** |
| `components/shared/EmptyState.tsx` | **New** (named by the design system) |
| [components/shared/PlayerRow.tsx](../../components/shared/PlayerRow.tsx) | Optional props for sub-line text and the right badge |
| [components/shared/StatusBadge.tsx](../../components/shared/StatusBadge.tsx) | Optional `estimate` variant (`≈ RM X`) |
| [components/session/match/Stepper.tsx](../../components/session/match/Stepper.tsx) | Reused, or a generic stepper extracted, for the courts count |
| [.claude/context/features.md](../context/features.md), [.claude/context/design.md](../context/design.md) | Updated on ship |

---

## Acceptance Criteria
- [x] AC1: The open layout matches the mockup: header, estimate card, 3 tiles, Players, Matches, fixed bottom bar. Checked on an iPhone SE and an iPhone Pro Max simulator; nothing clipped; the bar never covers the last card.
- [x] AC2: The closed layout shows "Still owed RM X of RM {amount_due}", "Paid RM Y · Owed RM X" (Y = `amount_due` − X), "N of M players settled", Owes/Settled badges sorted owed-first, no bottom bar, no ⋯, and the closed note at the end. On the default seed: of RM 96, paid RM 16.50, owed RM 79.50.
- [x] AC3: At the largest Dynamic Type size, tiles and match teams wrap instead of clipping or truncating.
- [x] AC4: Every colour, type style and radius on the screen is a design-system token. No teal, `DebtChip` or `ListRow` remains on this screen.
- [x] AC5: The estimate and per-player shares come from `previewSessionCharges`. After creating a match or booking a court, the screen shows the new numbers on return, without a restart.
- [x] AC6: Matches are listed newest first, with real teams per side, local start time (open only), shuttle count, and the reused/free note where it applies.
- [x] AC7: A player row opens player detail; a match card opens match detail.
- [x] AC8: `closeSession` uses `previewSessionCharges` and inserts exactly the same `shuttle_payments` / `court_payments` rows as before for the default seed (compared before and after the refactor).
- [x] AC8a: After closing, `sessions.amount_due` equals the sum of the `amount_paid` values that `closeSession` inserted for that session (checked in the DB before any payment). It is NULL on open sessions and doesn't change when a player pays.
- [x] AC9: "Close session?" lists the grouped per-player shares and the share total. The sage Close session button confirms; Cancel changes nothing; after confirming, the screen switches to the closed layout.
- [x] AC10: With 0 matches, the bar shows red Delete session + Create match. After the first match it shows sage Close session. An empty session can never be closed.
- [x] AC11: ⋯ opens the "Session options" Actionsheet with Book courts (count · RM total) and Delete session. Delete is disabled with "Sessions with matches can't be deleted" once a match exists. Swiping down or Cancel dismisses the sheet. The Courts tile also opens Book courts.
- [x] AC12: The Book courts sheet shows the Booked list, then label, price (RM), courts stepper (min 1) and optional duration (hours). Book court is disabled until price > 0. Saving adds the booking and updates the estimate.
- [x] AC13: The delete confirmation names the session and its court bookings (count + RM). Cancel changes nothing. After confirming, the session row and its `court_bookings` are gone (checked in the DB), the user lands on Sessions with a "Session deleted" toast, and the session no longer appears in any list or Home stat.
- [x] AC14: Create match, match detail, player payments, the Sessions list (still "Open session") and Home behave exactly as before.
- [x] AC15: `npm run lint` and `npx tsc --noEmit` pass, and the change is checked on the iOS Simulator via Expo MCP after `npm run db:fresh`. Never checked on web.
- [x] AC16: `features.md` §3, §4 and §9 are updated (gaps closed); `design.md`'s decision log gets the accepted entries; the spec's open questions are marked resolved.

## Required Changes
- **Schema**: add `amount_due REAL` to `sessions` in `services/database.js`, add it to the `Session` type, run `npm run db:fresh`, and tell the user to reset ([Data Model](#data-model)).
- **Services**: add `previewSessionCharges` and refactor `closeSession` onto it, writing `amount_due` ([Writers §1](#writers), [Readers](#readers)). Capture the default-seed payment rows before the refactor to prove AC8. Add `deleteEmptySession` ([Writers §3](#writers)).
- **UI primitives**: vendor Gluestack Actionsheet into `components/ui/actionsheet` (D5). Add `EmptyState`, `StatTile` and `BottomActionBar`.
- **Session components**: `EstimateCard`, `MatchCard`, `SessionOptionsSheet`, `BookCourtsSheet` (validation, stepper, duration), `CloseSessionDialog`, `DeleteSessionDialog`. Delete `bookCourtModal.tsx` once it has no imports left.
- **Screen**: rebuild `app/session/[sessionId]/index.tsx` per [Screen Behaviour](#screen-behaviour). Set `headerRight` ⋯ via `Stack.Screen` options. Refetch on focus as today.
- **Shared tweaks**: give `PlayerRow` and `StatusBadge` optional props whose defaults keep the Players and Sessions tabs unchanged.
- **Delete flow**: on success, navigate to the Sessions tab and show the "Session deleted" toast (Gluestack toast in `components/ui/toast`).
- **Docs**: update features §3 (money now shown; delete for empty sessions), §4 (validation, duration), §9 (empty sessions deleted, not closed; confirmation shows shares) and design.md's decision log; link this PRD from the spec.

## Features Catalog
- **Extends**: #3 Sessions, #4 Court bookings, #9 Closing a session (settlement)
- **Closes known gaps**:
  - "Session detail doesn't show any money (total cost, per-player split, who has paid)." (partly: who has paid is out of scope, D3)
  - "There is no per-session view of who still owes; balances are only visible per player."
  - "The Book Courts modal has no validation (price defaults to 0 and isn't checked)."
  - "The confirmation text mentions only courts, even though closing also settles shuttles."
  - "No edit or delete for sessions." (partly: empty sessions only)

## Open Questions
- [ ] Should per-player paid history be kept (an `amount_due` on each payment row)? Deferred by D32; it ties to features §10's `amount_paid` gap.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The refactor changes settlement amounts | Medium | High | AC8 row-by-row comparison on the default seed before and after |
| The Gluestack Actionsheet version doesn't match `@gluestack-ui/core` 3.x / RN 0.86 | Low | Medium | Vendor the same generation as the existing `modal`; check swipe-dismiss on the simulator |
| Deleting the wrong session | Low | High | Guard in `deleteEmptySession` (open + 0 matches) and a confirmation naming what goes |
| Someone runs the app without resetting | Medium | Medium | The PRD and the developer's report both say to run `npm run db:fresh`; the closed card treats a missing `amount_due` as unknown and leaves out "of RM X" rather than crashing |
| Keyboard covers the Book courts form | Medium | Low | Keyboard-avoiding sheet content; check on the SE simulator |

---
*Status: COMPLETED — PR #21*

## Implementation Status
Verified on the iOS Simulator with Expo MCP taps (iPhone 17 Pro, iPhone 17 Pro Max, iPhone SE 3rd gen), after `npm run db:fresh`.

| AC | Status | Evidence / notes |
|---|---|---|
| AC1 | ✅ done | Open layout checked on iPhone 17 Pro, 17 Pro Max and SE: top and end of scroll; nothing clipped; the last match card sits above the bar on all three. |
| AC2 | ✅ done | Default seed: "RM 79.50 of RM 96", Paid RM 16.50 · Owed RM 79.50, 1 of 6 settled, owed-first, Alice Settled last, no bar/⋯, closed note. After paying Ben by tap: RM 63 of RM 96, Paid RM 33, 2 of 6 settled; `amount_due` stays 96. |
| AC3 | ✅ done | Largest Dynamic Type (after an app relaunch): tiles, teams, player rows, headers and the bar wrap/stack. |
| AC4 | ✅ done | Token-only classes; no teal, hex, `DebtChip` or `ListRow` on the screen. |
| AC5 | ✅ done | By tap: booked RM 30 × 2 and RM 20 × 1 (1.5 h) → estimate RM 35 → RM 115; created Alice vs Elena with a Victor shuttle → RM 121, 3 matches, shares re-sorted; no restart. |
| AC6 | ✅ done | Newest first, local time, teams by side, chips, "1 reused from match 1 · 1 free". |
| AC7 | ✅ done | Tapped Alice's row → player detail; tapped Match 3 card → that match's detail (Alice/Elena, Victor). |
| AC8 | ✅ done | Payment rows identical before/after the refactor on `default` (22) and `closed-today` (40). |
| AC8a | ✅ done | `amount_due` = Σ inserted rows (55.02; 65.04; tap-closed 121.02); unchanged after a payment (96). |
| AC9 | ✅ done | Dialog grouped "Alice, Elena · RM 22.17 each", "Ben, Chloe, Daniel, Farid · RM 19.17 each", Total RM 121.02. Cancel → still open, 0 payment rows. Confirm → closed layout, ⋯ gone, `amount_due` 121.02. |
| AC10 | ✅ done | Red Delete session + Create match at 0 matches; sage Close session after a match. |
| AC11 | ✅ verified (swipe-down confirmed manually by the user on 2026-10-06) | By tap: ⋯ opens "Session options" (Book courts "1 court booked · RM 25"; Delete disabled with "Sessions with matches can't be deleted", tapping it does nothing); Cancel dismisses; backdrop tap dismisses; the Courts tile opens Book courts; ⋯ hidden when closed. **Swipe-down to dismiss could not be driven**: Expo MCP only offers tap, screenshot and find-view (no swipe/drag), and macOS Accessibility is off for host-side gestures. |
| AC12 | ✅ done | By tap/paste: label "Court 2", price 30, stepper to 2 ("This booking RM 60") → saved; second booking price 20, duration 1.5 → stored 90 min; both appear in Booked; "Enter a price above RM 0" shows on blur; Book court disabled with an empty price. |
| AC13 | ✅ done | `empty-session` seed: dialog "This removes Saturday Social and its 2 court bookings (RM 70)…"; Cancel kept the session and 2 bookings; Confirm deleted both, landed on Sessions; gone from Sessions and Home. |
| AC14 | ✅ done | Tap smoke test: Sessions list ("Open session"), Create match (slots, shuttle picker, Start match), match detail, player detail, Pay All payment, Home. |
| AC15 | ✅ done | `tsc` clean, lint 0 errors; verified via Expo MCP on the iOS Simulator after `db:fresh`; never web. |
| AC16 | ✅ done | features.md, design.md, spec open questions updated. |

### Needs attention
- None. AC11 swipe-down dismissal was confirmed manually by the user; every acceptance criterion is verified.
