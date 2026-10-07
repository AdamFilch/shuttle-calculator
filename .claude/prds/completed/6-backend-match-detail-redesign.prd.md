# [6]: Backend — Match Detail Redesign

The Match detail screen (`app/session/[sessionId]/[matchId]/index.tsx`) is being redesigned to the approved [Match Detail mockup](https://claude.ai/artifact/RiroM71BXm2VpHVb9QMnGv) and [spec](../design/specs/match-detail.md). The new screen shows who played where on a read-only court, lets the manager pick a winner and enter an optional score (screen state only, never saved), and lists the shuttles used, one row per type and origin (New, Reused from match N, Free) with the price per shuttle. This backend half reshapes the one reader the screen depends on, `fetchMatchById` in `services/match.ts`, so it returns everything the screen needs in a ready-to-render form. It also extends the `default` seed so every match format and shuttle origin exists in sample data.

When the manager opens a match, the screen calls `fetchMatchById(matchId)`. The reader returns the match header (number and timestamp), the players as full `Player` objects with their court position, and the shuttles already grouped and sorted with a unit price. If the match doesn't exist it returns `null` instead of throwing. Nothing is written: the result is UI-only (D2). The frontend half, [[6]: Frontend — Match Detail Redesign](6-frontend-match-detail-redesign.prd.md), is built on this contract once this PR is merged.

## Summary
`fetchMatchById` changes in place. `players` goes from a `Record` keyed by position (with a `players_id` typo and no avatar colour) to a position-sorted array of full `Player` objects plus `position`. `shuttles` goes from per-type counts to rows grouped by (type, origin, source match), with `origin`, `from_match_number` and `unit_price`. The reader returns `null` for an unknown match. The `default` seed gains a singles match and a 2 vs 1 match in today's open session. The old screen gets the smallest change that keeps it compiling and showing players in the right slots (D11). The schema, the writers and the settlement logic stay the same.

## Users
- **Primary**: the club manager, at the court right after a match, opening it from Session detail to see who played, who won and which shuttles were used.
- **Not for**: players (the manager is the only user); anyone needing saved results (D2).

## Scope
**MVP**
- Reshape `fetchMatchById` to the [Contract for frontend](#contract-for-frontend).
- Return `null` for a missing match.
- Extend `seedDefault` with a singles match and a 2 vs 1 match.
- Minimal compile fix in `app/session/[sessionId]/[matchId]/index.tsx` (D11).

**Out of scope**
- Storing the winner and score: UI-only for now (D2). A later ticket would add `matches` columns and needs a DB reset.
- Showing the result on `MatchCard`: depends on storing it.
- Editing or deleting a match: not part of this redesign.
- Removing the leftover `services/match-shuttles.ts` / `services/schema.sql`: unrelated cleanup.
- Any screen work beyond the D11 fix: that's the frontend half.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Data Model](#data-model)
4. [Readers](#readers)
5. [Contract for frontend](#contract-for-frontend)
6. [End-to-End Flows](#end-to-end-flows)
7. [Blast Radius](#blast-radius)
8. [File Reference](#file-reference)
9. [Acceptance Criteria](#acceptance-criteria)
10. [Required Changes](#required-changes)

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Ticket shape | Two PRDs, same ID [6]: backend first, frontend after merge | Touches `services/` and the UI | User |
| D2 | Result storage | UI-only (useState), no schema change, copy "Results aren't saved yet" | As in the spec; try the interaction before a schema change | User |
| D3 | Back button | Chevron only (`headerBackButtonDisplayMode: "minimal"`), departing from the spec's "‹ {session name}" | Matches Session detail and Create match; the reader doesn't need the session name | User |
| D4 | Meta-line time | `matches.date` (UTC) → local via `parseSQLTimestamp`, shown as `h:mm am` | Each match shows when it was recorded | User |
| D5 | Missing match | Reader returns `null`; screen shows `EmptyState` "Match not found" | Today `matchRows[0]` crashes; mirrors "Session not found" | User |
| D6 | Animation | 200ms ease-out on opacity and ring, off under Reduce Motion, in scope | Spec; reanimated already installed | User |
| D7 | Shuttle grouping | Done in the reader; rows come back ready and sorted | Frontend only formats; same pattern as `reused_from` | User |
| D8 | Price per shuttle | `unit_price = total_price / num_of_shuttles`, unrounded, computed in SQL; 0 when free | Same formula as `closeSession` | User |
| D9 | Players shape | `players: (Player & { position })[]` sorted by position, deleted players included | Goes straight into `Court`/`CourtSlot`; fixes the `players_id` typo | User |
| D10 | Seed | Extend `default`: today's open session gains a singles and a 2 vs 1 match | Every format and origin visible after `npm run db:fresh` | User |
| D11 | Reader change | Change `fetchMatchById` in place; the backend PR also makes the minimal type fix in the old screen | One reader; an accepted exception to "backend never touches app/" | User |
| D12 | Backend verification | Throwaway Metro log of each of today's matches, output pasted in the PR, log removed before commit | No screen to check against | User |
| D13 | Acceptance criteria | The four groups per half, as confirmed | — | User |
| D14 | Match numbers | `match_number` and `from_match_number` stay 0-based in the reader; UI adds 1 | `components/session/MatchCard.tsx` pattern | Claude — straightforward |
| D15 | Free shuttles | `name: null` and `origin: 'free'` whenever `shuttle_id IS NULL` (free wins over reused); UI writes "Free shuttle" | Copy belongs to the UI | Claude — straightforward |
| D16 | Sides and format | Top = positions 0, 2; bottom = 1, 3; format (Doubles / Singles / 2 vs 1) derived in the UI from counts | `components/session/match/Court.tsx` slot layout | Claude — straightforward |
| D17 | Origin rule | First use = `MIN(match_number)` over the instance's `match_shuttle_instances`; first use here → new, else reused from it | Same rule as `reused_from` in `fetchSessionById` (`services/session.ts`) | Claude — straightforward |
| D18 | Loading skeleton | New `components/shared/Skeleton.tsx` (no skeleton is vendored) | Spec asks for skeletons | Claude — straightforward |
| D19 | Animation library | `react-native-reanimated` 4.5.1 + `useReducedMotion` | Already a dependency | Claude — straightforward |
| D20 | Header styling | Same `Stack.Screen` header options as `app/session/[sessionId]/index.tsx` | Existing pattern | Claude — straightforward |

## Overview
A match (`matches`) belongs to a session and has up to four players in `match_players` (position 0–3: TL, BL, TR, BR) and one or more shuttle instances via `match_shuttle_instances`. A shuttle instance (`shuttle_instances`) is either of a shuttle type (`shuttles`) or free (`shuttle_id IS NULL`), and can be linked to several matches in the same session when it's reused.

Questions the data answers:
1. **Which match is this, and when?** → `matches.match_number` (0-based), `matches.date` (UTC timestamp).
2. **Who stood where?** → `match_players.position` + the player's `name` and `avatar_colour`.
3. **Which shuttles, and were they new, reused or free?** → each instance's `shuttle_id`, and the earliest `match_number` among the matches that used it.
4. **What does one shuttle cost?** → `shuttles.total_price / shuttles.num_of_shuttles`.
5. **Does the match exist?** → whether the `matches` row was found.

Non-obvious design decisions:
1. **Origin is derived, not stored.** An instance's first use is the lowest `match_number` among its matches (D17). If that is this match, it's `new`. If it's earlier, it's `reused` with `from_match_number`. This is the same rule `fetchSessionById` uses for `reused_from`, so Session detail's "1 reused from match 2" and Match detail's "Reused from match 2" never disagree.
2. **Grouping happens in the reader** (D7). Rows come back one per (shuttle_id, origin, from_match_number), already sorted, so the frontend never re-derives money-adjacent data.
3. **Two queries instead of one join.** Today's query joins players and shuttles in one go, so each shuttle row repeats once per player and needs deduping. Separate player and instance queries remove the double counting at the source.
4. **`unit_price` is unrounded** (D8). It's display only. Charges are still computed and rounded only in `closeSession`.

## Data Model
No schema change. **Reset needed:** no for the schema; run `npm run db:fresh` to load the new seed matches.

### Supporting tables (unchanged, for reference)
> Source: [services/database.js](services/database.js)

| Table | Purpose in this feature |
|---|---|
| `matches` | `match_id`, `session_id`, `match_number` (0-based), `date` (UTC, `datetime('now')`) |
| `match_players` | `player_id`, `position` (0 TL, 1 BL, 2 TR, 3 BR) |
| `players` | `name`, `status`, `deleted_date`, `avatar_colour` |
| `match_shuttle_instances` | which instances this match used; also the other matches each instance was used in |
| `shuttle_instances` | `shuttle_id` (NULL = free) |
| `shuttles` | `name`, `total_price`, `num_of_shuttles` |

## Readers
### `fetchMatchById`
> Source: [services/match.ts](services/match.ts)

**Signature:** `fetchMatchById(id: string): Promise<MatchFull | null>` (changed: return type and shape).

**What it does:**
1. Selects the `matches` row by `match_id`. If there is none, it returns `null`.
2. Selects the players: `match_players` joined with `players`, returning `player_id, name, status, deleted_date, avatar_colour, position`, ordered by `position`. Deleted players are included (D9).
3. Selects the instances: `match_shuttle_instances` joined with `shuttle_instances` and left-joined with `shuttles`, returning `shuttle_instance_id`, `shuttle_id`, `s.name`, `s.total_price * 1.0 / s.num_of_shuttles AS unit_price` (NULL when free), and `first_match_number` from a subquery: `MIN(m2.match_number)` over `match_shuttle_instances msi2 JOIN matches m2` for that instance.
4. Groups the instances in TypeScript:
   - `shuttle_id IS NULL` → origin `free`, `name: null`, `unit_price: 0`, `from_match_number: null` (D15).
   - `first_match_number === match.match_number` → origin `new`, `from_match_number: null`.
   - otherwise → origin `reused`, `from_match_number: first_match_number`.
   - Key is (shuttle_id, origin, from_match_number), and `quantity` counts the instances.
5. Sorts the rows: `new`, then `reused` by `from_match_number` ascending, then `free`. Within an origin, sorts by `name`.

**Returns:** see [Contract for frontend](#contract-for-frontend). **Why:** everything Match detail renders.

**Edge cases:**
- A match with no players (shouldn't happen; Create match requires one per side) → `players: []`.
- A match always has at least one instance (`createNewMatch` adds a free one when none is chosen) → `shuttles` is never empty in practice, but an empty array is valid.
- Two reused rows of the same type from different source matches stay separate rows.

| Consumer | File |
|---|---|
| Match detail screen | [app/session/[sessionId]/[matchId]/index.tsx](app/session/[sessionId]/[matchId]/index.tsx) |

## Contract for frontend
The frontend calls only `fetchMatchById`. There are no writers: the result card is screen state (D2).

```ts
import { Player } from "./player"

export type MatchPlayer = Player & { position: number }

export type MatchShuttleRow = {
    shuttle_id: number | null,
    name: string | null,
    origin: 'new' | 'reused' | 'free',
    from_match_number: number | null,
    quantity: number,
    unit_price: number
}

export type MatchFull = {
    session_id: number,
    match_id: number,
    match_number: number,
    date: string,
    players: MatchPlayer[],
    shuttles: MatchShuttleRow[]
}

export async function fetchMatchById(id: string): Promise<MatchFull | null>
```

Confirmed screen → data mapping:

| Screen element | Reader field |
|---|---|
| Title "Match N" | `match_number + 1` |
| Meta date · time | `date` (UTC) → `parseSQLTimestamp` → local |
| Meta format (Doubles / Singles / 2 vs 1) | derived: count `players` with position 0/2 (top) vs 1/3 (bottom) |
| "Match not found" state | `null` result |
| Court slots | `players[]` (Player + `position`: `avatar_colour`, `name`, `player_id`) |
| Side names, avatar dots, score labels | `players[]` split by half |
| Shuttles head "N shuttles" | sum of `shuttles[].quantity` |
| Shuttle row name | `shuttles[].name` (`null` = free → "Free shuttle") |
| Row "×2 · RM 4.50 each" | `quantity`, `unit_price` |
| Badge New / Reused / Free | `origin` |
| "Reused from match N" | `from_match_number + 1` |
| Row order | as returned (new, reused oldest first, free) |
| Result card (winner, scores) | screen `useState` only |

## End-to-End Flows
### Happy path: open a doubles match with a reused shuttle
```
Manager taps match 2 of today's seeded session on Session detail
  └─► fetchMatchById(matchId)
        ├─ matches row found (match_number 1)
        ├─ players: [Daniel@0, Farid@1, Chloe@2, Ben@3], full Player objects
        ├─ instances: Yonex instance first used in match 0 → reused, from 0
        │             free instance → free
        └─ returns rows [reused Yonex ×1 from 0 @ 10, free ×1 @ 0]
```

### Edge case: unknown match id
```
fetchMatchById("999999")
  ├─ no matches row
  └─ returns null (no throw)
```

### Seed: `npm run db:fresh`
```
seedDefault
  ├─ … existing players, sessions, matches (unchanged)
  ├─ today: match 3 — singles, one top, one bottom, new Yonex ×1
  ├─ today: match 4 — 2 vs 1, two top, one bottom, reuses an instance from match 2, plus free
  └─ [dev-db] fresh default done
```

## Blast Radius
| Change | What breaks |
|---|---|
| `players` Record → array | `match.players[N]` in the old screen means "Nth player", not "position N" → fixed by looking up by `position` (D11) |
| `quantity_used` → `quantity`; `name` nullable | Old screen's shuttle tiles → renamed field, `name ?? 'Free'` (D11) |
| Return type `MatchFull \| null` | Old screen must handle null (keep the spinner or return early) |
| Seed adds 2 matches to today's session | Today's session estimate and player counts in sample data change; no code depends on the exact numbers |
| Only consumer | `grep fetchMatchById\|MatchFull` finds only `services/match.ts` and the match screen |

## File Reference
| File | Role |
|---|---|
| [services/match.ts](services/match.ts) | `fetchMatchById` reshaped; **new** types `MatchPlayer`, `MatchShuttleRow`; `MatchFull` changed |
| [services/seed.ts](services/seed.ts) | `seedDefault` gains a singles and a 2 vs 1 match |
| [services/player.ts](services/player.ts) | `Player` type (reused, unchanged) |
| [services/session.ts](services/session.ts) | `fetchSessionById`'s `reused_from` (reference for the origin rule) |
| [app/session/[sessionId]/[matchId]/index.tsx](app/session/[sessionId]/[matchId]/index.tsx) | Minimal compile fix only (D11) |

---

## Acceptance Criteria
- [x] AC1 (Reader shape): `fetchMatchById` returns `MatchFull | null`. It returns `null` for an unknown id without throwing. `players` is sorted by `position`, and each entry is a full `Player` (`player_id`, `name`, `status`, `deleted_date`, `avatar_colour`) plus `position`. Deleted players are included.
- [x] AC2 (Shuttle rows): `shuttles` has one row per (`shuttle_id`, `origin`, `from_match_number`) with `name` (`null` when free), `origin`, `from_match_number` (0-based, set only when `reused`), `quantity` and `unit_price` (`total_price / num_of_shuttles`, `0` when free). Rows are ordered new, then reused (oldest source first), then free. Quantities aren't multiplied by the number of players.
- [x] AC3 (Seed): after `npm run db:fresh`, the `default` scenario's open session has a singles match and a 2 vs 1 match as well as the existing two, so every format (doubles, singles, 2 vs 1) and every origin (new, reused, free) is present. Metro logs `[dev-db] fresh default done`.
- [x] AC4 (Old screen + checks): the old match screen compiles with only the D11 fix and shows players in their correct slots. `npm run lint` and `npx tsc --noEmit` pass. A throwaway Metro log of `fetchMatchById` for each of today's matches (run on the iOS Simulator after `npm run db:fresh`) is pasted in the PR description and shows AC1–AC2 hold. The log is removed before commit. Never checked on web.

## Required Changes
- **Reader**: rewrite `fetchMatchById` and its types in `services/match.ts` (see [Readers](#readers), [Contract](#contract-for-frontend)).
- **Seed**: add the two matches to `seedDefault` in `services/seed.ts` using `createNewMatch` only. Find the reused instance with `fetchShuttleInstancesBySessionId` as the existing code does (see [Flows](#seed-npm-run-dbfresh)).
- **Old screen (D11 only)**: in `app/session/[sessionId]/[matchId]/index.tsx`, look players up by `position`, rename `quantity_used` → `quantity`, show `name ?? 'Free'`, and handle `null`. Nothing else; the frontend half replaces this screen.
- **Verify**: `npm run db:fresh`, throwaway log, lint, tsc (AC4).
- **Docs**: in `.claude/context/features.md` #7, note the reader change.

## Features Catalog
- **Extends**: #7 Match detail
- **Closes known gaps**: none on its own. The frontend half closes "The title shows the raw match number…" and "Player and shuttle tiles look tappable but do nothing."

## Open Questions
- [ ] When results are stored later, which columns go on `matches` (spec open question 1)? Not needed for this ticket.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Between the merges, the old screen looks plain but must still work | High | Low | D11 fix keeps it correct; frontend PR follows |
| First-use subquery picks up another session's matches | Low | Medium | Instances belong to one session, and `match_shuttle_instances` only links that session's matches; checked in the AC4 log |
| Seed reuse picks the wrong instance | Low | Low | Pick the instance used by today's match 2 explicitly; check its origin in the log |

---
*Status: COMPLETED — PR #TBD*
