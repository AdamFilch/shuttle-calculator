# Features: Shuttle Calculator

The detailed, per-feature reference. Read `product.md` first for the why, the money model, and priorities. **Don't read this whole file**: use the index to jump to the entries your task touches.

Each entry has the same shape: **What it does** (user flow, fields, validation, empty states), **Status**, **Where** (screens, components, services), **Rules**, **Known gaps**. Currency is RM everywhere, even where the UI currently shows `$`.

## Index

| # | Feature | Status |
|---|---|---|
| 1 | [Players](#1-players) | Built |
| 2 | [Deleting and restoring players](#2-deleting-and-restoring-players) | Built |
| 3 | [Sessions](#3-sessions) | Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md) |
| 4 | [Court bookings](#4-court-bookings) | Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md) |
| 5 | [Creating a match](#5-creating-a-match) | Built |
| 6 | [Shuttle usage in a match (New / Reused / Free)](#6-shuttle-usage-in-a-match-new--reused--free) | Built |
| 7 | [Match detail](#7-match-detail) | Built |
| 8 | [Shuttle inventory](#8-shuttle-inventory) | Built (manual verification pending) |
| 9 | [Closing a session (settlement)](#9-closing-a-session-settlement) | Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md) |
| 10 | [Player balance and payments](#10-player-balance-and-payments) | Built |
| 11 | [Pay Early](#11-pay-early) | Planned |
| 12 | [Home dashboard](#12-home-dashboard) | Built |
| 13 | [Insights](#13-insights) | Planned (future improvement) |
| 14 | [Player play history](#14-player-play-history) | Planned |
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

**What it does**
- Delete from the player detail screen, behind a confirmation dialog.
- Deleted players disappear from the Players list and match player pickers, and appear under "Recently Deleted" (newest first, with the deletion date) with a Restore button.

**Where**: `app/player/[playerId]/index.tsx`, `app/player/deleted/index.tsx`, `components/user/deletePlayerDialog.tsx`, `services/player.ts` (`deletePlayer`, `restorePlayer`, `fetchDeletedPlayers`).

**Rules**
- Soft delete only (`status = 'deleted'`, `deleted_date` set).
- Blocked while the player has any unpaid court or shuttle charge: "This player has unpaid charges. Settle their balance before deleting."

**Known gaps**
- The unpaid check only sees charges from closed sessions. A player who has played in a still-open session can be deleted before that session is settled.

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

**Where**: `app/session/[sessionId]/[matchId]/index.tsx`, `services/match.ts` (`fetchMatchById`).

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

## 9. Closing a session (settlement)

**Status**: Built: [PRD 3](../prds/completed/3-session-detail-redesign.prd.md).

**What it does**
- The sage Close session button (shown once the session has a match) opens "Close session?", which lists the exact shares that will be recorded, grouping players with the same amount ("Alice, Ben · RM 5.84 each"), and the share total. Confirming computes all charges, marks the session closed with a closed date, and stores the total charged in `sessions.amount_due`; the screen switches to the closed layout.

**Where**: `app/session/[sessionId]/index.tsx`, `components/session/CloseSessionDialog.tsx`, `services/session.ts` (`previewSessionCharges`, `closeSession`). Specs: `specs/court-rental-and-session-settlement.md`, `specs/shuttle-instance-settlement.md`, `.claude/prds/completed/3-session-detail-redesign.prd.md`.

**Rules**
- Court: for each booking, (price × quantity) ÷ number of distinct players in the session, one charge per player.
- Shuttle: for each charged (non-free) instance, (type total price ÷ type quantity) ÷ number of distinct players across all matches that used the instance, one charge per player.
- Each share is rounded to 2 decimals.
- `closeSession` inserts exactly the rows `previewSessionCharges` computes; `amount_due` is the sum of those rows and never changes afterwards (paid so far = `amount_due` − still owed).
- A session with no matches can't be closed (the button isn't shown and `closeSession` throws); it is deleted instead (see [3](#3-sessions)).
- Closing can't be undone.

**Known gaps**
- Rounding per share can leave totals a cent off (RM10 ÷ 3 = RM9.99 collected).

## 10. Player balance and payments

**What it does**
- Player detail lists every session where the player still owes money, with the session total. Each session expands to its matches (date, number of shuttles, amount) and each match to its shuttle charges.
- Per session: "Pay All (RM…)" and "Pay Court Only (RM…)".
- "Pay Shuttles Individually" switches to a select mode with checkboxes on shuttle charges, then "Pay Selected (N)".
- Every payment opens a confirmation dialog stating what is being paid and that it's irreversible.
- When nothing is owed: "Nothing owed."

**Where**: `app/player/[playerId]/index.tsx`, `components/shared/PaymentConfirmationDialog.tsx`, `components/shared/DebtChip.tsx`, `services/player.ts` (`fetchShuttlePaymentsByPlayerSessions`, `fetchAllPlayerPayments`), `services/shuttle-payments.ts` (`paySessionInFull`, `payCourtBySessionId`, `payShuttleInstancesByIds`).

**Rules**
- Charges carry across sessions until paid.
- Paying sets the charge's stored amount to 0 and records the date paid.

**Known gaps**
- The stored column is called `amount_paid` but holds the amount still owed, and paying zeroes it. So the amount a player paid is lost, and paid history can't be shown or analysed.
- No undo for a mistaken payment.
- No "pay everything across all sessions" action.
- No partial payment of an amount (only whole charges).
- A bulk-pay-by-player modal exists (`PayByPlayerModal` in `components/session/modal.tsx`), but its button is commented out on the session screen.

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

**Known gaps**
- The usage chart is analytics and probably belongs on the Insights page once it exists.
- No quick action to start a session or match from Home.

## 13. Insights

**Status**: Future improvement, not available yet. The Insights tab exists but is an empty placeholder (`app/(tabs)/insights/index.jsx`).

**Intended content**
- Shuttle usage over time (move or extend the Home chart), per type.
- Attendance: how many players joined each session, over time.
- Spend per session: court vs shuttles.
- Per-player activity: sessions attended, matches played, shuttles used, total spent.
- Outstanding money over time, and the collection rate.
- Inventory burn rate and when to restock.

**Dependencies**
- Paid amounts must be kept (see [10](#10-player-balance-and-payments), known gaps) for spend and collection insights.
- Purchase cost isn't recorded (see [8](#8-shuttle-inventory)), so inventory spend can't be calculated yet.

## 14. Player play history

**Status**: Planned.

**What it would do**: on the player detail screen, show the sessions a player attended, the matches they played (with partners and opponents), the shuttles they used, and what they paid, including sessions that are fully settled. Today the screen shows only what's still owed.

**Where**: `app/player/[playerId]/index.tsx`, `services/player.ts`.

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
