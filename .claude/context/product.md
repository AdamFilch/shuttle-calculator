# Product: Shuttle Calculator

What we are building, for whom, and why. For how to run and navigate the code, see `CLAUDE.md`. For the visual system, see `.claude/context/design.md`.

## Pitch

A mobile app for badminton club managers to track sessions, matches, and shuttlecock usage, and to split costs fairly so each player knows exactly what they owe.

**Fairness principle:** if a match uses a shuttle, only the players in that match pay for it. Nobody subsidises shuttles they did not play with. Every money-related feature must preserve this.

## Who uses it, and where

- **Primary user: the club manager / organiser.** They run the session, buy the shuttles, rent the court, and collect money afterwards.
- **At the court:** phone in one hand, often between games, possibly sweaty or distracted. Entering a match must be fast and hard to get wrong.
- **After the session:** reviewing who owes what, settling up, and chasing players with outstanding debt across sessions.
- Players do not use the app themselves; the manager operates it on their behalf.

## Core concepts

Full definitions live in `specs/overall.md`. Note that it predates court rental and session settlement; the specs listed under Roadmap describe those.

- **Player**: a club member with a running debt that carries across sessions until paid.
- **Session**: one club event/day; contains matches and may carry a court rental cost.
- **Match**: one game in a session; up to 4 players in court positions TL, BL, TR, BR.
- **Shuttle batch**: a purchase (name, total price, quantity), giving a per-shuttle price.
- **Shuttle usage**: which batch, and how many shuttles, a match used.
- **Debt / settle**: each player's share per match accumulates; the manager marks it paid.

## Priorities (in order)

1. **Correct money.** Amounts owed must always be right and explainable.
2. **Fast entry at the court.** Fewest taps for the common path.
3. **Clarity.** Who owes what should be visible at a glance.
4. **Polish.** Looks matter, but never at the cost of the above.

## Current state

The core flow is built: players, sessions, matches, shuttle batches, per-match cost splitting, per-player debt history, settling up, a Settings screen with "Reset Database", and an Insights tab. Data is local-only on the device (SQLite).

## Roadmap

Check the status line at the top of each spec before relying on it.

- `specs/shuttle-inventory-tracking.md`: purchases and stock. Built; manual verification on a simulator still pending.
- `specs/shuttle-instance-settlement.md`: per-shuttle instance tracking and session-close settlement. Implemented and verified.
- `specs/court-rental-and-session-settlement.md`: court rental cost split. Phases A to C shipped; progressive "Pay Early" settlement (Phase D) not yet built.
- `specs/shuttle-instance-pay-early.md`: pay early for shuttles. Draft, not implemented.
- `.claude/prds/`: PRDs for smaller tickets.

## Non-goals (for now)

- No backend, accounts, sync, or multi-device sharing.
- No player-facing app; the manager is the only user.
- No dark mode (light theme only, see `design.md`).
- No web target; web shows a "not available" notice only.
