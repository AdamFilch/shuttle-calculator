# Product: Shuttle Calculator

What we are building, for whom, and why. For how to run and navigate the code, see `CLAUDE.md`. For the visual system, see `.claude/context/design.md`. For the detailed, per-feature reference (flows, fields, rules, code locations, gaps), see `.claude/context/features.md`; open only the entries your task touches.

## Pitch

A mobile app for badminton club managers to run their club's sessions, keep track of players, court bookings, and shuttlecock inventory, and split the cost of each session fairly so every player knows exactly what they owe and the manager knows who has paid.

All money is in **Malaysian Ringgit (RM)**.

## Why it exists

A club manager books courts, buys shuttlecocks in tubes at different prices, and runs sessions where many players rotate through many matches. Afterwards they have to work out who owes what. Done by hand this is:

- **Slow**: tallying who played which match with which shuttle, across a whole evening, on paper or in chat.
- **Unfair**: splitting everything evenly makes players subsidise expensive shuttles they never played with.
- **Easy to lose track of**: players pay at different times, some per game and some at the end, and debts carry across sessions.

Shuttle Calculator records the session as it happens and does the splitting, so the amounts are fair, explainable, and tracked until paid.

## Who it is for, and where

- **Primary (and only) user: the club manager / organiser.** They run the session, book the courts, buy the shuttles, and collect money. Players do not use the app; the manager operates it on their behalf.
- **At the court:** phone in one hand, between games, possibly sweaty or distracted. Recording a match and the shuttles it used must be fast and hard to get wrong.
- **After the session:** closing the session, reviewing who owes what, marking payments, and chasing players with outstanding debt across sessions.
- **Over time:** keeping the shuttle inventory topped up and (in future) understanding club activity through insights.

## How charges work (the money model)

This is the heart of the product. Every money-related feature must preserve it.

**Fairness rule:** court costs are shared by everyone who played in the session; a shuttle's cost is shared only by the players who actually played with that shuttle. Nobody pays for a shuttle they did not use.

### Court cost

- A session can have one or more court bookings, each with a price per court and a number of courts.
- Booking cost = price × number of courts.
- It is split evenly across **every distinct player who played at least one match in the session**, regardless of how many matches each played.

### Shuttle cost

- Shuttles are bought as a **type** (e.g. "Yonex AS-50") with a reference price: total price ÷ number of shuttles in the tube = **price per shuttle**.
- Each physical shuttlecock used in a match is tracked individually (a *shuttle instance*). When recording a match, the manager adds shuttles in one of three ways:
  - **New**: N fresh shuttles taken from a type in stock.
  - **Reused**: a specific shuttle already used earlier in the *same session*, carried into this match.
  - **Free**: an old or spare shuttle nobody is charged for (costs RM0).
- A shuttle's price is split evenly across **every distinct player in every match that used that shuttle**.

### When charges exist

- Nothing is owed while a session is **open**. Matches, shuttles, and courts are just being recorded.
- When the manager **closes** the session, the app computes every player's court share and shuttle shares and locks them in as charges. Closing cannot be undone.
- Each share is rounded to 2 decimal places.

### Paying

- A player's charges accumulate across sessions until paid.
- The manager can mark, per session: **pay in full** (all remaining court and shuttle charges), **court only**, or **selected shuttles** (pick individual shuttle charges). Every payment asks for confirmation first.
- A player cannot be deleted while they still owe money.

### Worked example

A session with 4 players. The court costs RM20. Players 1 and 2 play a match with a free shuttle; players 3 and 4 play a match using one RM4 shuttle.

| | Court (RM20 ÷ 4) | Shuttle (RM4 ÷ 2) | **Owes** |
|---|---|---|---|
| Player 1 | RM5 | – | **RM5** |
| Player 2 | RM5 | – | **RM5** |
| Player 3 | RM5 | RM2 | **RM7** |
| Player 4 | RM5 | RM2 | **RM7** |

**Reuse example:** an RM4 shuttle is used by players 1 and 2 in match 1, then *reused* by players 3 and 4 in match 2. Four distinct players used it, so each owes RM1 for it (not RM2 each per match, which would charge RM8 for an RM4 shuttle).

## Core concepts

- **Player**: a club member. Active, or soft-deleted (restorable). Has a running balance across sessions.
- **Session**: one club event (name, date, start time, location). **Open** while being recorded, **closed** once settled.
- **Match**: one game in a session. Up to 4 players in court slots (top-left, bottom-left, top-right, bottom-right); singles or doubles. Numbered within its session.
- **Court booking**: courts rented for a session (optional label, price per court, number of courts, optional duration).
- **Shuttle type**: a kind of shuttlecock with a fixed reference price per shuttle.
- **Purchase**: buying more of a shuttle type; adds to stock.
- **Shuttle instance**: one physical shuttlecock used in a session (New from a type, or Free); can be reused across that session's matches.
- **Charge**: what one player owes for one court booking or one shuttle instance; created at session close.
- **Payment**: the manager marking charges as paid.

## What the manager can do today

Each area has a full entry in `features.md`.

- **Players**: add players (no duplicate names), search them, see each player's outstanding balance broken down by session, match, and shuttle, take payments, delete players who owe nothing, and restore deleted players.
- **Sessions and courts**: create sessions (optionally booking courts in the same step), book more courts while open, see a live estimate of the session's cost and each player's share, then close the session to settle it (confirming the exact shares). A closed session shows what is still owed out of the total charged and who has settled. An open session with no matches can be deleted.
- **Matches and shuttle usage**: place players on a court diagram, add New / Reused / Free shuttles, and view each match's players and shuttles.
- **Shuttle inventory**: add shuttle types, see remaining stock and price per shuttle (low stock highlighted), edit name and price, see purchase history, and "buy again" to restock.
- **Payments**: pay a session in full, court only, or selected shuttles.
- **Home dashboard**: total outstanding across all players, shuttles used and remaining, recent sessions, and a shuttle-usage-over-time chart.

## Priorities (in order)

1. **Correct money.** Amounts owed must always be right and explainable back to the matches and shuttles that caused them. When in doubt, favour correctness over convenience.
2. **Fast entry at the court.** Fewest taps for the common path: create a match, place players, add shuttles.
3. **Clarity.** Who owes what, and for what, should be visible at a glance.
4. **Polish.** Looks matter, but never at the cost of the above.

## Current state

The core loop is built and works on iOS/Android: players, sessions, court bookings, matches with New/Reused/Free shuttles, shuttle inventory with purchases, session-close settlement, per-player payments, and the Home dashboard. Data is stored locally on the device (SQLite); there is no backend.

Most important known gaps (full list per feature in `features.md`):

- Amounts are shown with `$` instead of **RM** (except on the Players and Sessions tabs).
- Sessions, matches, and court bookings cannot be edited or deleted (except deleting an open session with no matches); payments and session closes cannot be undone.
- The player screen only shows what is still owed; there is no play history (matches played, shuttles used, sessions attended).
- Players cannot pay before the session is closed.
- Rounding each share to 2 decimals can make a split a cent off (RM10 ÷ 3 = RM3.33 × 3 = RM9.99).
- The Insights tab is an empty placeholder.

## Roadmap / future improvements

Check the status line at the top of each spec before relying on it.

- **Insights page** (not available yet; the tab exists but is empty). Shuttle usage over time (today on Home), how many players joined each session, spend per session (court vs shuttles), per-player activity (sessions, matches, shuttles), outstanding money over time, and inventory burn rate with restock prompts. Depends on keeping paid amounts (see gaps).
- **Pay Early**: let a player pay their current fair share before the session closes.
  - Courts: `specs/court-rental-and-session-settlement.md` Phase D (not built).
  - Shuttles: `specs/shuttle-instance-pay-early.md` (draft, not built).
- **Player play history**: matches, sessions, and shuttles per player, including fully paid ones.
- **Edit and delete** for sessions, matches, and court bookings; undo for mistaken payments.
- **Show RM** throughout the app.
- **Keep payment records** (amount owed vs amount paid) so history and insights are possible.

Existing specs and their status:

- `specs/overall.md`: original concepts. Predates court rental, shuttle instances, and session settlement.
- `specs/shuttle-inventory-tracking.md`: purchases and stock. Built; manual verification on a simulator still pending.
- `specs/shuttle-instance-settlement.md`: per-shuttle instance tracking and session-close settlement. Implemented and verified.
- `specs/court-rental-and-session-settlement.md`: court rental cost split. Phases A to C shipped; Pay Early (Phase D) not built.
- `specs/shuttle-instance-pay-early.md`: Pay Early for shuttles. Draft, not implemented.
- `.claude/prds/`: PRDs for smaller tickets.

## Non-goals (for now)

- No backend, accounts, sync, or multi-device sharing.
- No player-facing app; the manager is the only user.
- No dark mode (light theme only, see `design.md`).
- No web target; web shows a "not available" notice only.
