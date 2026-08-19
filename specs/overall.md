# Shuttle Calculator — Project Overview

## The idea

Shuttle Calculator is an app for badminton club managers to track how much each player owes for the shuttlecocks they used during play.

Shuttlecocks ("shuttles") get bought in batches, and different batches cost different amounts. The app's core fairness principle: if a match uses a more expensive shuttle, only the players who were actually in that match pay for it — nobody subsidizes shuttles they didn't play with.

## Core concepts

- **Players** — the people in the club. Each player has a running record of what they owe.
- **Sessions** — a single club event/day. A session contains one or more matches.
- **Matches** — one game within a session, played by up to 4 people in court positions (top-left, bottom-left, top-right, bottom-right).
- **Shuttles** — a purchased batch of shuttlecocks: a name, a total price, and how many shuttles are in the batch (e.g. "Yonex AS-50, 12 for RM120"). This gives a per-shuttle price.
- **Shuttle usage** — when a match is created, the manager records which shuttle batch(es) were used and how many shuttles from each batch were used in that match.
- **Cost splitting** — the cost of the shuttles used in a match is split evenly across only the players who played in that match. A player who wasn't in the match owes nothing for it, even if a very expensive shuttle was used.
- **Debt** — each player accumulates an owed amount per shuttle usage, per match. This debt isn't tied to a single session — it carries forward across sessions until the player pays it off. A player can have unpaid debt from several past sessions at once.
- **Settling up** — the manager can mark a player's outstanding debt as paid, clearing what they owe.

## What the app currently does

- Create and list players, sessions, and shuttle batches (with price and quantity).
- Create a match inside a session: assign up to 4 players to court positions and record which shuttle batches (and how many shuttles) were used in that match.
- Automatically calculate and record each player's share of the cost for the shuttles used in a match they played in, split evenly among that match's players.
- View a player's full payment history, including matches and sessions, and how much they still owe.
- View, per session, how much every player owes.
- Settle a player's debt (mark their outstanding amounts as paid).
- Reset the local database from the app's Settings screen, for testing/recovery.

The app is functionally nearly complete for this core workflow: sessions → matches → shuttle usage → per-player debt → settling up.
