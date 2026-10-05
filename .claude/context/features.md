# Features: Shuttle Calculator

The detailed, per-feature reference. Read `product.md` first for the why, the money model, and priorities. **Don't read this whole file**: use the index to jump to the entries your task touches.

Each entry has the same shape: **What it does** (user flow, fields, validation, empty states), **Status**, **Where** (screens, components, services), **Rules**, **Known gaps**. Currency is RM everywhere, even where the UI currently shows `$`.

## Index

| # | Feature | Status |
|---|---|---|
| 1 | [Players](#1-players) | Built |
| 2 | [Deleting and restoring players](#2-deleting-and-restoring-players) | Built |
| 3 | [Sessions](#3-sessions) | Built |
| 4 | [Court bookings](#4-court-bookings) | Built |
| 5 | [Creating a match](#5-creating-a-match) | Built |
| 6 | [Shuttle usage in a match (New / Reused / Free)](#6-shuttle-usage-in-a-match-new--reused--free) | Built |
| 7 | [Match detail](#7-match-detail) | Built |
| 8 | [Shuttle inventory](#8-shuttle-inventory) | Built (manual verification pending) |
| 9 | [Closing a session (settlement)](#9-closing-a-session-settlement) | Built |
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
- Players tab lists all active players, each with a debt chip showing their total outstanding balance.
- Fuzzy search by name (tolerant of typos).
- "Add Player" opens a modal with a name field. Save is disabled when the name is empty or matches an existing active player (case-insensitive, trimmed).
- Tapping a player opens their detail screen (see [10](#10-player-balance-and-payments)).
- Empty states: "no players yet" and "no search results".
- A "Recently Deleted" row at the bottom links to deleted players (see [2](#2-deleting-and-restoring-players)).

**Where**: `app/(tabs)/player/index.tsx`, `components/user/modal.tsx`, `services/player.ts` (`createPlayer`, `fetchAllPlayers`, `fetchAllPlayerPayments`).

**Rules**
- Players are never hard-deleted, so past matches and charges always keep their player.

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

**What it does**
- Sessions tab lists all sessions newest first. Each row shows the title (name and date, or just the date), player count and match count, and an Open (shuttlecock icon) or Closed indicator.
- "Add Session" modal fields: title (optional), date, start time, location (optional), and an optional "book courts" section (label, price, quantity, duration in hours). When booking courts, price, quantity, and duration are required.
- Session detail shows: Open/Closed status, Book Courts and Close Session buttons (open sessions only), an "Add Match" header action (open only), the match list (match number, date, player names), "Shuttles Used" (per type: count and number of matches), and "Courts Booked" (label, price, × quantity).

**Where**: `app/(tabs)/session/index.tsx`, `app/session/[sessionId]/index.tsx`, `components/session/modal.tsx` (`AddSessionModal`), `services/session.ts` (`createNewSession`, `fetchAllSessions`, `fetchSessionById`, `formatSessionTitle`).

**Rules**
- A session is `open` until closed (see [9](#9-closing-a-session-settlement)). Closed sessions can't take new matches or courts.

**Known gaps**
- No edit or delete for sessions.
- Session detail doesn't show any money (total cost, per-player split, who has paid).
- There is no per-session view of who still owes; balances are only visible per player.

## 4. Court bookings

**What it does**
- Courts are booked when creating a session, or with "Book Courts" on an open session.
- Fields: label (optional), price per court, number of courts. The create-session form also takes a duration (hours); the Book Courts modal does not.

**Where**: `components/session/bookCourtModal.tsx`, `components/session/modal.tsx`, `services/court.ts` (`bookCourt`, `fetchCourtBookingsBySessionId`).

**Rules**
- Booking cost = price × quantity, split at session close across all distinct session players (see `product.md`, "How charges work").

**Known gaps**
- The Book Courts modal has no validation (price defaults to 0 and isn't checked).
- No edit or delete for a booking.

## 5. Creating a match

**What it does**
- From an open session, "Add Match" opens a court diagram with 4 slots (top-left, bottom-left, top-right, bottom-right) arranged as two teams.
- Tapping a slot opens a player picker; a player already placed in another slot can't be picked again.
- Shuttles are added with the shuttle selector (see [6](#6-shuttle-usage-in-a-match-new--reused--free)). If no shuttle types exist yet, the screen says "Add a shuttle first to proceed".
- "Start Match!" is enabled once at least one player is placed. It saves the match and returns to the session.

**Where**: `app/session/[sessionId]/create-match/index.tsx`, `components/session/match/teamSlot.tsx`, `components/session/match/selectUserModal.tsx`, `services/match.ts` (`createNewMatch`).

**Rules**
- Matches are numbered in creation order within the session.
- A match with no shuttles selected is saved with one Free shuttle.
- No charges are created here; they are created at session close.

**Known gaps**
- Matches can't be edited or deleted after saving.
- No player search in the picker.

## 6. Shuttle usage in a match (New / Reused / Free)

**What it does**
- The shuttle selector has three modes:
  - **New**: pick a shuttle type (only types with stock remaining are listed, showing their price) and a quantity. Picking the same type again adds to its quantity.
  - **Reused**: pick a specific shuttle already used in this session, labelled like "Yonex AS-50 #2" or "Free shuttle #1". The same shuttle can't be added twice to one match.
  - **Free**: adds one uncharged shuttle.
- Selected shuttles appear as chips; tapping one lets you change a New quantity with a stepper or remove it.

**Where**: `components/session/match/selectShuttleModal.tsx`, `services/shuttle_instances.ts` (`fetchShuttleInstancesBySessionId`), `services/match.ts` (`ShuttleSelection`, `createNewMatch`).

**Rules**
- Each New shuttle creates one shuttle instance (one physical shuttlecock) and takes one off that type's stock.
- Reused links an existing instance to this match, so its cost is shared with this match's players at close.
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

**What it does**
- "Close Session" on an open session asks for confirmation, then computes all charges and marks the session closed with a closed date.

**Where**: `app/session/[sessionId]/index.tsx`, `services/session.ts` (`closeSession`). Specs: `specs/court-rental-and-session-settlement.md`, `specs/shuttle-instance-settlement.md`.

**Rules**
- Court: for each booking, (price × quantity) ÷ number of distinct players in the session, one charge per player.
- Shuttle: for each charged (non-free) instance, (type total price ÷ type quantity) ÷ number of distinct players across all matches that used the instance, one charge per player.
- Each share is rounded to 2 decimals.
- Closing is blocked with an error if courts are booked but no match has been played.
- Closing can't be undone.

**Known gaps**
- The confirmation text mentions only courts, even though closing also settles shuttles.
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

**What it does**: developer tools only. "Check Tables" (inspects the schema; logs nothing at present) and "Reset Database" (drops and recreates all tables, wiping all data).

**Where**: `app/(tabs)/settings/index.tsx`, `services/database.js`.

**Known gaps**
- Reset Database has no confirmation and deletes everything. This conflicts with the rule that destructive actions must confirm.
- No user-facing settings (e.g. club name, currency, data export or backup).

## 16. Currency

**Status**: Gap. The club works in RM, but amounts are shown with `$` (Home, Players, player detail, shuttle cards). The shuttle picker already shows "RM". All money should be shown as RM.

## 17. Web

**Status**: Notice only. The web build shows "Not available on Web" (`app/_layout.web.tsx`) because expo-sqlite doesn't work there. Web isn't a target (see `product.md`, Non-goals).
