# Features: Shuttle Calculator

The detailed, per-feature reference. Read `product.md` first for the why, the money model, and priorities. **Don't read this whole file**: use the index to jump to the entries your task touches.

Each entry has the same shape: **What it does** (user flow, fields, validation, empty states), **Status**, **Where** (screens, components, services), **Rules**, **Known gaps**. Currency is RM everywhere, even where the UI currently shows `$`.

## Index

| # | Feature | Status |
|---|---|---|
| 1 | [Players](#1-players) | Built |
| 2 | [Deleting and restoring players](#2-deleting-and-restoring-players) | Built: [PRD 5](../prds/partial/5-player-payments-backend.prd.md), [PRD 4](../prds/partial/4-player-detail-redesign.prd.md) (partial: delete taps not yet driven on the simulator) |
| 3 | [Sessions](#3-sessions) | Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md) |
| 4 | [Court bookings](#4-court-bookings) | Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md) |
| 5 | [Creating a match](#5-creating-a-match) | Built |
| 6 | [Shuttle usage in a match (New / Reused / Free)](#6-shuttle-usage-in-a-match-new--reused--free) | Built |
| 7 | [Match detail](#7-match-detail) | Built |
| 8 | [Shuttle inventory](#8-shuttle-inventory) | Built (manual verification pending) |
| 9 | [Closing a session (settlement)](#9-closing-a-session-settlement) | Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md) |
| 10 | [Player balance and payments](#10-player-balance-and-payments) | Built: [PRD 5](../prds/partial/5-player-payments-backend.prd.md), [PRD 4](../prds/partial/4-player-detail-redesign.prd.md) (partial: tap-driven checks pending) |
| 11 | [Pay Early](#11-pay-early) | Planned |
| 12 | [Home dashboard](#12-home-dashboard) | Built |
| 13 | [Insights](#13-insights) | Planned (future improvement) |
| 14 | [Player play history](#14-player-play-history) | Built: [PRD 4](../prds/partial/4-player-detail-redesign.prd.md) (partial: tap-driven checks pending) |
| 15 | [Settings](#15-settings) | Built (developer tools only) |
| 16 | [Currency](#16-currency) | Gap |
| 17 | [Web](#17-web) | Notice only |

---

## 1. Players

**What it does**
- Players tab lists all active players as PlayerRows: an initials Avatar, the name, "N sessions" (every distinct session the player has played in, paid or not, pluralised) and a StatusBadge: "Settled" when nothing is owed, otherwise "Owes RM N" (clay).
- Fuzzy search by name (tolerant of typos).
- "Add player" opens a modal with a name field. Save is disabled when the name is empty or matches an existing active player (case-insensitive, trimmed).
- Tapping a player opens their detail screen (see [10](#10-player-balance-and-payments)).
- Empty states: "no players yet" and "no search results".
- A "Recently deleted" text link under the list opens deleted players (see [2](#2-deleting-and-restoring-players)).

**Where**: `app/(tabs)/player/index.tsx`, `components/user/modal.tsx`, `components/shared/` (`PlayerRow`, `Avatar`, `StatusBadge`, `SearchInput`), `services/player.ts` (`createPlayer`, `fetchAllPlayers`, `fetchAllPlayerPayments`), `services/money-display.ts` (`formatRM`). Spec: `.claude/prds/completed/1-players-and-sessions-redesign.prd.md`.

**Rules**
- Players are never hard-deleted, so past matches and charges always keep their player.
- Each player's avatar colour is stored in `players.avatar_colour` as a token name (`primary` / `clay` / `sage` / `muted`), assigned in rotation by the number of existing players (including deleted ones) when the player is created. Initials are the first 2 letters of the name, uppercased.
- Money on this tab is "RM 12" for whole amounts and "RM 4.50" otherwise.

**Known gaps**
- Players cannot be renamed.
- The duplicate-name check only compares against active players, so a new player can share a deleted player's name.

## 2. Deleting and restoring players

**Status**: Built: [PRD 5](../prds/partial/5-player-payments-backend.prd.md), [PRD 4](../prds/partial/4-player-detail-redesign.prd.md) (partial: delete taps not yet driven on the simulator).

**What it does**
- Delete from the player detail screen: ⋯ → **Player options** sheet → **Delete player** → the existing confirmation dialog → back to the Players tab.
- The Delete player row shows why it's blocked up front: disabled with "Settle RM X first" while the player owes anything, or "In an open session — close it first" while they're in a match of an open session. Otherwise it reads "Moves {name} to Recently deleted".
- Deleted players disappear from the Players list and match player pickers, and appear under "Recently Deleted" (newest first, with the deletion date) with a Restore button.

**Where**: `app/player/[playerId]/index.tsx`, `components/player/PlayerOptionsSheet.tsx`, `app/player/deleted/index.tsx`, `components/user/deletePlayerDialog.tsx`, `services/player.ts` (`deletePlayer`, `fetchPlayerDeleteBlockers`, `restorePlayer`, `fetchDeletedPlayers`). Spec: `.claude/prds/partial/5-player-payments-backend.prd.md`, `.claude/prds/partial/4-player-detail-redesign.prd.md`.

**Rules**
- Soft delete only (`status = 'deleted'`, `deleted_date` set).
- `deletePlayer` checks `fetchPlayerDeleteBlockers(playerId)`, which returns `{ owed, inOpenSession }`, and throws before writing anything:
  - owed > 0: "This player has unpaid charges. Settle their balance before deleting."
  - the player is in a match of a session with `status = 'open'`: "This player is in an open session. Close it before deleting."
- The guard holds even when `deletePlayer` is called directly. The options sheet reads the same blockers, so the UI and the service share one rule. If the service still throws, the screen shows the message in an alert.

**Known gaps**
- Tapping through ⋯ → Delete player → Delete hasn't been driven on the simulator yet (PRD [4] AC18, AC20).

## 3. Sessions

**Status**: Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md).

**What it does**
- Sessions tab lists all sessions newest first as SessionCards: the title (the session name, or the date when unnamed), "D Mon YYYY · N players", a clay feather icon with "N shuttles used" (every shuttle instance in the session, including free ones), and a StatusBadge. Open sessions show "Open session"; closed sessions show "Settled" when nothing is owed, or "RM N due" for the outstanding shuttle and court charges. Sessions with no matches use the same card.
- "Add Session" modal fields: title (optional), date, start time, location (optional), and an optional "book courts" section (label, price, quantity, duration in hours). When booking courts, price, quantity, and duration are required.
- Session detail (open), top to bottom: title, "D Mon YYYY · h:mm am · Location" (missing parts left out), "Open session" badge; an estimate card "≈ RM X" (court cost + paid shuttle cost, with a courts/shuttles split bar and legend); three stat tiles (Players "in N matches", Shuttles "N free", Courts with Σ price × quantity, which opens Book courts); Players with each player's estimated share (`≈ RM X`, highest first); Matches newest first (number, local start time, shuttle chip or "Free", teams per side, "N reused from match M · N free" note); a fixed bottom bar with Create match plus Close session (once a match exists) or a red Delete session (while there are no matches). The header ⋯ opens Session options: Book courts (count · RM total) and Delete session (disabled with "Sessions with matches can't be deleted" once a match exists).
- Session detail (closed): "RM X due" or "Settled" badge; "Still owed RM X of RM {amount_due}" with a paid (sage) vs owed (clay) bar, "Paid RM Y · Owed RM X", "N of M players settled · closed D Mon YYYY"; players sorted by amount owed with Owes/Settled badges and settled players last; no bottom bar, no ⋯, and a closed note at the end.
- Player rows open player detail; match cards open match detail. Loading shows skeleton cards. At large Dynamic Type sizes tiles, teams, player rows and the bar wrap or stack instead of clipping.
- Deleting an empty session asks "Delete session?" naming the session and its court bookings (count + RM), then removes the session and its bookings, returns to the Sessions tab and shows a "Session deleted" toast.

**Where**: `app/(tabs)/session/index.tsx`, `app/session/[sessionId]/index.tsx`, `components/session/modal.tsx` (`AddSessionModal`), `components/session/` (`EstimateCard`, `MatchCard`, `SessionOptionsSheet`, `BookCourtsSheet`, `CloseSessionDialog`, `DeleteSessionDialog`), `components/shared/` (`SessionCard`, `StatusBadge`, `PlayerRow`, `StatTile`, `EmptyState`, `ActionSheet`), `components/layout/BottomActionBar.tsx`, `components/ui/actionsheet/`, `services/session.ts` (`createNewSession`, `fetchAllSessions`, `fetchSessionById`, `previewSessionCharges`, `deleteEmptySession`, `formatSessionTitle`). Spec: `.claude/prds/completed/1-players-and-sessions-redesign.prd.md`, `.claude/prds/completed/3-session-detail-redesign.prd.md`, `.claude/design/specs/session-detail.md`.

**Rules**
- A session is `open` until closed (see [9](#9-closing-a-session-settlement)). Closed sessions can't take new matches or courts.
- An open session with no matches can be deleted (with its court bookings) but never closed. Once it has a match it can be closed but not deleted.
- The open estimate and per-player shares come from `previewSessionCharges`, the same calculation `closeSession` uses.

**Known gaps**
- No edit for sessions; delete only for open sessions with no matches.
- No per-player "paid RM X" on closed sessions (only the session total is stored, in `sessions.amount_due`).

## 4. Court bookings

**Status**: Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md).

**What it does**
- Courts are booked when creating a session, or from the Book courts sheet on an open session (⋯ → Book courts, or the Courts tile).
- The Book courts sheet lists what is booked (label or "Court booking N", "RM 25 × 1 · 90 min", total), then adds a booking: label (optional), price per court (RM prefix), courts stepper (min 1), and duration in hours (optional, stored as minutes), with a "This booking RM X" total.
- Validation: Book court stays disabled until the price is a number above 0 ("Enter a price above RM 0" on blur); the duration must be empty or above 0 ("Enter hours above 0, or leave it empty"). After saving, the booking appears in the list and the estimate updates.

**Where**: `components/session/BookCourtsSheet.tsx`, `components/session/modal.tsx`, `services/court.ts` (`bookCourt`, `fetchCourtBookingsBySessionId`). Spec: `.claude/prds/completed/3-session-detail-redesign.prd.md`.

**Rules**
- Booking cost = price × quantity, split at session close across all distinct session players (see `product.md`, "How charges work").

**Known gaps**
- No edit or delete for a single booking (an empty session's bookings go when the session is deleted).

## 5. Creating a match

**What it does**
- From an open session, "Add Match" opens "New match": the screen title with the ShuttleChip top-right, a top-down Court with four CourtSlots (top-left, bottom-left, top-right, bottom-right; top pair and bottom pair are the two sides of the net), and a full-width "Start match" button.
- An empty slot shows a dashed outline, a + icon and "Add player". A filled slot shows the player's Avatar and name on a fill of their stored avatar colour at 30% over the court.
- Tapping a slot opens the player picker ("Top left player", etc.): Avatar + name rows. A player already placed in another slot isn't listed. On a filled slot, "Remove player" clears it.
- Shuttles are added through the ShuttleChip (see [6](#6-shuttle-usage-in-a-match-new--reused--free)). If no shuttle types exist yet, the chip is hidden and the screen says "Add a shuttle first to proceed".
- "Start match" is enabled once at least one player is on the top side and one on the bottom side. While disabled, a hint underneath says "Add a player to each side to start" (empty court) or "Add an opponent to start" (one side filled). It saves the match and returns to the session.

**Where**: `app/session/[sessionId]/create-match/index.tsx`, `components/session/match/Court.tsx` (`Court`, `CourtSlot`), `components/session/match/selectUserModal.tsx` (`SelectPlayerModal`), `components/shared/Avatar.tsx`, `services/match.ts` (`createNewMatch`). Spec: `.claude/prds/completed/2-create-match-court-and-shuttles-modal.prd.md`.

**Rules**
- Slot order TL, BL, TR, BR maps to `match_players.position` 0–3.
- Matches are numbered in creation order within the session.
- A match with no shuttles selected is saved with one Free shuttle.
- No charges are created here; they are created at session close.

**Known gaps**
- Matches can't be edited or deleted after saving.
- No player search in the picker.

## 6. Shuttle usage in a match (New / Reused / Free)

**What it does**
- The ShuttleChip shows how many shuttles are selected for this match (New quantities + Free + Reused), in clay, or grey at 0. Tapping it opens the "Shuttles used" modal, with the subtitle "N shuttles logged for this session" (distinct paid shuttle types used in this session's saved matches; Free not counted).
- **New shuttle** tab: a Stepper row per shuttle type, in this order: the top 3 types by shuttle instances across all sessions among types with stock left (filled with the newest in-stock types if fewer than 3 have history); other types already used in this session; types added with "Add a different shuttle"; then "Free shuttle". A row with a count above 0 has a sage outline. A type with no stock left (e.g. a session type that ran out) stays visible with a red outline, "Out of stock" and a disabled stepper.
- "Add a different shuttle" opens a bottom drawer of the in-stock types not already shown ("Name (N left)"); picking one adds its row with a count of 1. These rows are local to the page: leaving Create Match drops them, and once a match using the type is saved it appears with this session's types.
- **Reuse shuttle** tab: this session's shuttles, labelled like "Yonex AS-50 #2" or "Free shuttle #1", each toggled on or off for this match. With none yet, it says "No shuttles used in this session yet."
- The modal is a draft: "Done" commits it to the page, "Cancel" or × discards it, and reopening shows the committed selection.

**Where**: `components/session/match/selectShuttleModal.tsx` (`ShuttlesModal`), `components/session/match/ShuttleChip.tsx`, `components/session/match/Stepper.tsx`, `components/session/match/ShuttleGlyph.tsx`, `services/shuttle.ts` (`fetchTopShuttleTypes`, `fetchSessionShuttleTypes`, `fetchAllShuttlesWithInventory`), `services/shuttle_instances.ts` (`fetchShuttleInstancesBySessionId`), `services/match.ts` (`ShuttleSelection`, `createNewMatch`). Spec: `.claude/prds/completed/2-create-match-court-and-shuttles-modal.prd.md`.

**Rules**
- Each New shuttle creates one shuttle instance (one physical shuttlecock) and takes one off that type's stock.
- Reused links an existing instance to this match, so its cost is shared with this match's players at close. An instance can't be added twice to one match.
- Free instances have no type and cost RM0.
- Reuse is limited to shuttles from the same session.

**Known gaps**
- The New quantity isn't capped at the remaining stock, so stock can go negative.

## 7. Match detail

**What it does**
- Shows the match title and date, players laid out by court position (two rows, split by a net), and "Shuttles used this match" (per type with a count, Free shuttles grouped).

- `fetchMatchById` returns `null` for an unknown match, the players as full `Player` objects plus `position` (sorted by position, deleted players included), and the shuttles grouped by type and origin (`new`, `reused` with the 0-based `from_match_number` of its first use, `free`) with `quantity` and an unrounded `unit_price`, ordered new, reused (oldest source first), free. The screen itself is still the old layout until the frontend half ships.
- The `default` seed's open session has a doubles, a doubles with a reused and a free shuttle, a singles and a 2 vs 1 match.

**Where**: `app/session/[sessionId]/[matchId]/index.tsx`, `services/match.ts` (`fetchMatchById`). Spec: `.claude/prds/completed/6-backend-match-detail-redesign.prd.md`.

**Known gaps**
- The title shows the raw match number ("Match 0" for the first match) while the session list shows "Match 1": an off-by-one inconsistency.
- Player and shuttle tiles look tappable but do nothing.
- No per-match cost shown.

## 8. Shuttle inventory

**What it does**
- Shuttles tab shows a grid of cards, one per shuttle type: name, price per shuttle, remaining stock. Cards turn warning-coloured at 2 remaining and error-coloured at 1 or fewer.
- "Add Shuttle" modal: name, total price, number of shuttles (price and number must be > 0). This creates the type and records the first purchase.
- Tapping a card opens the edit modal: change name and price per shuttle, see recent purchases (quantity and date), and "Buy Again" with a quantity to add stock.

**Where**: `app/(tabs)/shuttles/index.tsx`, `components/shuttle/ShuttleCard.tsx`, `components/shuttle/modal.tsx`, `components/shuttle/editShuttleModal.tsx`, `services/shuttle.ts` (`createShuttle`, `addShuttlePurchase`, `updateShuttle`, `fetchAllShuttlesWithInventory`, `fetchShuttlePurchaseHistory`). Spec: `specs/shuttle-inventory-tracking.md`.

**Rules**
- Remaining = total purchased − New shuttles used (Free shuttles don't count).
- Each type has one fixed reference price per shuttle; purchases add quantity only, not a new price.

**Known gaps**
- Editing the price changes the charges of any session that is still open, because prices are read at close. Closed sessions are unaffected.
- A purchase doesn't record what was paid for it, so inventory spend can't be tracked.
- Shuttle types can't be deleted or archived.
- The spec's manual verification on a simulator hasn't been run.
- Planned (no PRD yet): an optional "Warn at: N" input with a Shuttle / Session toggle in the shuttle detail pop-up. It triggers Home's low-stock alert (PRD [7] D3, D4).

## 9. Closing a session (settlement)

**Status**: Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md).

**What it does**
- The sage Close session button (shown once the session has a match) opens "Close session?", which lists the exact shares that will be recorded, grouping players with the same amount ("Alice, Ben · RM 5.84 each"), and the share total. Confirming computes all charges, marks the session closed with a closed date, and stores the total charged in `sessions.amount_due`; the screen switches to the closed layout.

**Where**: `app/session/[sessionId]/index.tsx`, `components/session/CloseSessionDialog.tsx`, `services/session.ts` (`previewSessionCharges`, `closeSession`), `components/session/EstimateCard.tsx`. Specs: `specs/court-rental-and-session-settlement.md`, `specs/shuttle-instance-settlement.md`, `.claude/prds/completed/3-session-detail-redesign.prd.md`, `.claude/prds/partial/5-player-payments-backend.prd.md`.

**Rules**
- Court: for each booking, (price × quantity) ÷ number of distinct players in the session, one charge per player.
- Shuttle: for each charged (non-free) instance, (type total price ÷ type quantity) ÷ number of distinct players across all matches that used the instance, one charge per player.
- Each share is rounded to 2 decimals.
- `closeSession` inserts exactly the rows `previewSessionCharges` computes, writing each share to both `amount_paid` (still owed) and `amount_charged` (the share, never changed afterwards). `amount_due` is the sum of those rows and never changes afterwards.
- Session detail's "paid so far" is the sum of `amount_charged` over the session's paid rows (`total_paid_amount` from `fetchAllPlayerPaymentsBySession`), not `amount_due` − still owed.
- A session with no matches can't be closed (the button isn't shown and `closeSession` throws); it is deleted instead (see [3](#3-sessions)).
- Closing can't be undone.

**Known gaps**
- Rounding per share can leave totals a cent off (RM10 ÷ 3 = RM9.99 collected).

## 10. Player balance and payments

**Status**: Built: [PRD 5](../prds/partial/5-player-payments-backend.prd.md), [PRD 4](../prds/partial/4-player-detail-redesign.prd.md) (partial: tap-driven checks pending).

**What it does**
- Player detail opens on a **balance card**: OWES and the total owed across closed sessions (with an "N sessions" badge), a paid/owed bar and legend from real paid amounts, and a caption when the player is in an open session ("Tonight's open session adds about RM X when it closes."). When nothing is owed it reads ALL SETTLED, RM 0, "Paid RM X across N closed sessions."
- **Pay all · RM X** (the one filled `sage` button) pays every owing session. **Pay session · RM X** (sage outline) sits on each owing session card.
- **Pay individually** switches the same screen into a selection mode: Cancel / Select all (Clear all) in the nav bar, only owing sessions, expanded, a tri-state checkbox per session, checkboxes on the court share and each owed shuttle charge, paid rows disabled, and a fixed bottom bar ("N charges picked · RM X", "Pay RM X"; disabled "Pay" and "Tick charges to pay" when nothing is picked). Cancel or the back gesture leaves without changes.
- **Waive** opens the same selection mode in `clay` ("Waive charges"), but its button reads "Waive · coming soon" and is always disabled. Nothing is written.
- Every payment opens one confirmation dialog: "Mark RM X paid?", a breakdown (one line per session for Pay all / Pay session; for picks, grouped by session with "Court share" and "Match N · K shuttles"), Total, and "Still owed afterwards: RM X" or "Nothing left to pay". A failed write keeps the dialog open with "Couldn't save the payment. Try again." and keeps the picks.
- After a payment the screen returns to view mode, refetches, and shows the global 1.5 s toast "Paid RM X".

**Where**: `app/player/[playerId]/index.tsx`, `components/player/` (`BalanceCard`, `SessionChargesCard`, `ChargeRow`, `SettleChargesDialog`, `PlayerOptionsSheet`, `charges.ts`, `format.ts`), `components/shared/SelectBox.tsx`, `components/shared/AppToast.tsx`, `components/layout/BottomActionBar.tsx`, `services/player.ts` (`fetchPlayerLedger`, `fetchAllPlayerPayments`, `fetchAllPlayerPaymentsBySession`), `services/shuttle-payments.ts` (`paySessionInFull`, `payChargesByKeys`, `payCourtBySessionId`, `payShuttleInstancesByIds`). Spec: `.claude/prds/partial/5-player-payments-backend.prd.md`, `.claude/prds/partial/4-player-detail-redesign.prd.md`, `.claude/design/specs/player-detail.md`.

**Rules**
- Charges carry across sessions until paid. Owed never includes open sessions; they only carry an estimate.
- Pay all and Pay session call `paySessionInFull` once per owing session (idempotent, so a retry is safe). Pay individually calls `payChargesByKeys` once with the picked ledger keys.
- Each payment row stores `amount_charged` (the share at close, never changed), `amount_paid` (a legacy name for the amount still owed) and `date_paid`. Paying sets `amount_paid` to 0 and stamps `date_paid`; no writer touches `amount_charged`. A row's paid amount is its `amount_charged` once `date_paid` is set.
- `payChargesByKeys({ playerId, keys })` takes `court:{sessionId}` (all of the player's unpaid court rows in that session) and `shuttle:{shuttleInstanceId}` keys. It throws on a malformed key before writing, runs in one `withTransactionAsync` with a single timestamp, and only updates rows where `date_paid IS NULL`, so a repeat tap keeps the original date.
- `fetchAllPlayerPayments` and `fetchAllPlayerPaymentsBySession` return `amount_charged` on every shuttle and court item, plus `total_charged_amount` and `total_paid_amount` per player.

**Known gaps**
- Not yet driven with real taps on the simulator (no Expo MCP local tools in the PRD [4] run): Select all / Clear all, Cancel and the back gesture in selection mode, and the ⋯ button (PRD [4] AC12, AC16, AC18, AC23). "Free shuttles only" and the loading skeleton haven't been seen on screen (AC7, AC9).
- Waive is UI only: the button is disabled until a waive backend exists, and the `waived` badge and row states can't be reached.
- `payShuttleInstancesByIds` and `payShuttleByPlayers` don't filter `date_paid IS NULL`, so they can overwrite an existing paid date (they still never touch `amount_charged`).
- `paySessionInFull` isn't wrapped in a transaction, so Pay all across several sessions can stop partway on an error (a retry finishes it).
- `date_paid` comes from `convertTimeToSQLTimeStamp` and doesn't line up with `date_created` (`datetime('now')`, UTC): on the simulator a payment made seconds after close was stamped 5 hours earlier. Not yet investigated.
- No undo for a mistaken payment.
- No partial payment of an amount (only whole charges).
- A bulk-pay-by-player modal exists (`PayByPlayerModal` in `components/session/modal.tsx`), but its button is commented out on the session screen.
- `fetchShuttlePaymentsByPlayerSessions` is no longer used by any screen but still lives in `services/player.ts` (to remove in a backend ticket).

## 11. Pay Early

**Status**: Planned. Not built.

**What it would do**: let a player pay their current fair share of courts and shuttles while the session is still open, locked in at the share known at that moment. Later players share the remainder.

**Where**: specs `specs/court-rental-and-session-settlement.md` (Phase D, courts) and `specs/shuttle-instance-pay-early.md` (shuttles). The "Pay Early" button on the session screen is commented out.

**Rules (from the specs)**: worked example: an RM4 shuttle split 2 ways (RM2 each); one player pays early. The shuttle is then reused with 2 new players, so the remaining RM2 is split 3 ways (RM0.67 each), not re-split 4 ways.

## 12. Home dashboard

**What it does**
- "Total outstanding" across all active players.
- "Total Shuttle Used" and "Remaining Shuttles" across all types.
- "Recent Sessions": the 2 newest, tappable.
- A shuttle-usage chart (shuttles used over time) with ranges 1W, 1M (daily), 6M (weekly), 12M (monthly).

**Where**: `app/(tabs)/index.tsx`, `components/shared/StatCard.tsx`, `components/insights/InsightsSection.tsx`, `services/shuttle.ts` (`fetchShuttleUsageSummary`, `fetchShuttleUsageTimeSeries`).

**Planned redesign** (not built, PRD [7] backend + frontend): spec `.claude/design/specs/home.md`, direction A approved 2026-10-08. Start session goes straight to the new session; a session left open from an earlier day is flagged on Home and on the Sessions tab. Order: session card (Start session, or Open session + New match), low-stock alert with runway, Last 30 days tiles (rolling), Waiting on payment (oldest debt first), Recent sessions (compact). The big Total outstanding figure, the shuttle StatCards and the usage chart leave Home.

**Known gaps**
- The usage chart is analytics and moves to the Shuttles tab (see [13](#13-insights)); addressed by the Home spec.
- No quick action to start a session or match from Home; addressed by the Home spec's session card.
- Low-stock alert will be built in PRD [7] but not triggered; needs the per-shuttle "Warn at" setting (see [8](#8-shuttle-inventory)).

## 13. Insights

**Status**: Future improvement, not available yet. The Insights tab exists but is an empty placeholder (`app/(tabs)/insights/index.jsx`).

**Direction changed 2026-10-08**: no separate Insights page. Each insight lives on the screen that owns its data: shuttle usage over time on the Shuttles tab, attendance and spend on Sessions, per-player activity on Players and player detail, collection rate with the money it describes. Follow-up work; the hidden `app/(tabs)/insights/` route can be removed afterwards.

**Intended content**
- Shuttle usage over time (move or extend the Home chart), per type.
- Attendance: how many players joined each session, over time.
- Spend per session: court vs shuttles.
- Per-player activity: sessions attended, matches played, shuttles used, total spent.
- Outstanding money over time, and the collection rate.
- Inventory burn rate and when to restock.

**Dependencies**
- Paid amounts are now kept: each payment row stores `amount_charged`, and a paid row's amount is its `amount_charged` (see [10](#10-player-balance-and-payments), PRD [5]).
- Purchase cost isn't recorded (see [8](#8-shuttle-inventory)), so inventory spend can't be calculated yet.

## 14. Player play history

**Status**: Built: [PRD 4](../prds/partial/4-player-detail-redesign.prd.md) (partial: tap-driven checks pending).

**What it does**: player detail shows a header (56px avatar, name, "N sessions · M matches", or "No sessions yet") and, under SESSIONS ("Owing first" / "Newest first"), every session the player joined, open and settled ones included, as collapsible cards:
- Order: owing (newest first), then open, then settled. Badges: `Owes RM X`, `≈ RM X` (open estimate), `Settled`. The sub-line is "D Mon YYYY · N matches", with "Tonight … · open" for today's open session and "· paid RM X" for settled ones.
- Expanding shows COURTS (one "Court share" row, "RM {court total} ÷ N players") and MATCH N groups with the teams ("A & B vs C & D", TL+TR vs BL+BR) and one row per paid shuttle ("RM {unit price} ÷ N players", plus "· reused"). A reused shuttle is listed once, under the player's first match that used it. A match with only free shuttles says "Free shuttles only".
- Paid rows show "Paid D Mon YYYY" in `settled` green with the charged amount struck through. Open sessions show `≈` amounts from `previewSessionCharges` (the same numbers as session detail) and "Final shares are set when the session closes."
- Never played: ALL SETTLED RM 0 and the "No sessions yet" empty state. Large Dynamic Type stacks the balance actions and moves session badges under the title.

**Where**: `app/player/[playerId]/index.tsx`, `components/player/SessionChargesCard.tsx`, `components/player/ChargeRow.tsx`, `components/session/MatchCard.tsx` (`splitTeams`), `services/player.ts` (`fetchPlayerLedger`, `PlayerLedger`). Specs: `.claude/prds/partial/5-player-payments-backend.prd.md` (data), `.claude/prds/partial/4-player-detail-redesign.prd.md` (screen), `.claude/design/specs/player-detail.md`.

**Rules**: the screen renders `fetchPlayerLedger` as returned (its order, first-match placement, `reused`, `freeOnly` and `estimate`) and never re-sorts or re-groups.

**Known gaps**
- Only charges are shown: free shuttles aren't listed, and there's no per-match score or result.
- Deleted players have no detail view (Recently deleted keeps its own screen).

## 15. Settings

**What it does**: developer tools only. "Check Tables" (inspects the schema; logs nothing at present) and "Reset Database" (drops and recreates all tables, wiping all data). In dev builds only, "Reset & Load Sample Data" resets and then fills the DB with the `default` seed scenario. The same reset/seed can be triggered without tapping via `npm run db:reset` / `db:seed` / `db:fresh` (dev-only deep link to `app/dev/db.tsx`).

**Where**: `app/(tabs)/settings/index.tsx`, `services/database.js`, `services/seed.ts`, `app/dev/db.tsx`, `scripts/dev-db.js`.

**Known gaps**
- Reset Database has no confirmation and deletes everything. This conflicts with the rule that destructive actions must confirm.
- No user-facing settings (e.g. club name, currency, data export or backup).

## 16. Currency

**Status**: Gap. The club works in RM, but amounts are shown with `$` (Home, player detail, shuttle cards). The Players and Sessions tabs and the shuttle picker already show "RM" (the two tabs via `formatRM` in `services/money-display.ts`: "RM 12", "RM 4.50"). All money should be shown as RM.

## 17. Web

**Status**: Notice only. The web build shows "Not available on Web" (`app/_layout.web.tsx`) because expo-sqlite doesn't work there. Web isn't a target (see `product.md`, Non-goals).
