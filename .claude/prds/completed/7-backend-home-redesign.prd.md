# [7]: Backend — Home Redesign

Home (`app/(tabs)/index.tsx`) is being rebuilt to the approved [Home mockup](https://claude.ai/artifact/6VdzQQDJddjiyJTCcahsb3) and [spec](../design/specs/home.md), direction A. It drops the big "Total outstanding" figure and the usage chart and becomes a "what do I do next" screen. From top to bottom it shows: a session card (Start session, or Open session + New match), a low-stock alert slot, rolling Last 30 days tiles, a short "Waiting on payment" list with the oldest debt first, and recent sessions. This backend half adds the two readers the screen can't get from existing code, plus a seed scenario for the "session left open" case.

When Home gains focus, the frontend calls `fetchActivitySummary(from, to)` for the tiles and `fetchTopOwers(3)` for the owers list. Everything else on Home comes from readers that already exist. Neither new function writes anything. The frontend half, [[7]: Frontend — Home Redesign](7-frontend-home-redesign.prd.md), is built on this contract once this PR is merged.

## Summary
Two new read-only functions are added:
- `fetchActivitySummary` in `services/session.ts`: counts and money for a date window.
- `fetchTopOwers` in `services/player.ts`: the players who have owed money longest, with session counts and the overall total.

A new `stale-open` seed scenario creates a session left open from 3 days ago. The schema, every writer, the settlement logic and every existing reader stay the same. `fetchShuttleUsageSummary` and `fetchShuttleUsageTimeSeries` are kept, because the usage chart moves to the Shuttles tab in a later ticket (D11).

## Users
- **Primary**: the club manager. They open the app at the court to record the next match, or between sessions to see who to chase and how the club is doing.
- **Not for**: players. The manager is the only user.

## Scope
**MVP**
- `fetchActivitySummary(from, to)` (**new**), see [Readers §1](#1-fetchactivitysummary-new).
- `fetchTopOwers(limit)` (**new**), see [Readers §2](#2-fetchtopowers-new).
- A `stale-open` seed scenario (**new**).

**Out of scope**
- Low-stock runway query and threshold: deferred to the future "Warn at" feature in the shuttle detail pop-up (D3, D4).
- Moving the usage chart and other insights to the screens that own the data: follow-up (D11).
- Any screen or component work: the frontend half.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Readers](#readers)
4. [Contract for frontend](#contract-for-frontend)
5. [End-to-End Flows](#end-to-end-flows)
6. [Blast Radius](#blast-radius)
7. [File Reference](#file-reference)
8. [Acceptance Criteria](#acceptance-criteria)
9. [Required Changes](#required-changes)

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Scope | Build spec `home.md` direction A as a backend + frontend pair | Approved mockup; touches services and UI | User |
| D2 | After Start session saves | Go straight to the new session's detail page (overrides spec §3) | At the court the next step is creating a match; saves a tap | User |
| D3 | Low-stock alert | Build `LowStockAlert` and its Home slot, but never show it: no runway query and no rule yet | The threshold will come from a per-shuttle setting that doesn't exist yet | User |
| D4 | Low-stock threshold | Future feature: "Warn at: N [Shuttle / Session]" toggle in the shuttle detail pop-up. Recorded as follow-up, no PRD now | Manager sets it per type, in shuttles or sessions of runway | User |
| D5 | Stale open session | Warn on Home (caption) **and** on the Sessions tab | Nobody is charged until close, so a forgotten open session hides debt | User |
| D6 | Sessions tab form | Badge on that session's card, "Still open since {d Mon}" | Small change to `SessionCard`; no new banner | User |
| D7 | Charged tile | Closed sessions only (`amount_due`), plus "RM X still due" | Money model: nothing is charged until close | User |
| D8 | Owers data | New `fetchTopOwers`, because `fetchAllPlayerPayments` has no session ids, so it can't count sessions owed | One SQL query instead of loading every charge row | User |
| D9 | Waiting on payment sort | Oldest unpaid first, then largest amount | Stale debt is what slips | User (design round) |
| D10 | 30-day window | Rolling: today and the 29 days before | A calendar month is nearly empty early on | User (design round) |
| D11 | Chart and insights | Leave Home. They move to the screens that own the data (chart → Shuttles tab), as follow-up | Analysis belongs next to the thing it describes | User (design round) |
| D12 | Screen → data mapping | Confirmed as the Contract for frontend | Backend builds only what screens use | User |
| D13 | Navigating after create | Optional `onCreated(sessionId)` prop on `AddSessionModal`. `createNewSession` already returns the id, and the Sessions tab keeps its behaviour | `services/session.ts` `createNewSession` returns `lastInsertRowId` | Claude — straightforward |
| D14 | Seeds | Add a `stale-open` scenario. `closed-today` already covers the between-sessions state | `services/seed.ts` `scenarios` pattern | Claude — straightforward |
| D15 | Old Home pieces | Delete `StatCard` (no other users). Keep `fetchShuttleUsageSummary` and `InsightsSection` for the follow-up | Follow-up move needs them | Claude — straightforward |
| D16 | Stale badge | New `StatusBadge` variant `stale` (clay); stale means `status='open'` and `date` before the start of today | `StatusBadge` already uses variants per state | Claude — straightforward |

## Overview
Home reads from sessions, matches, shuttle instances and the two payment tables, and writes nothing. The new readers add up existing rows. In `shuttle_payments` and `court_payments`, `amount_paid` holds the amount still **owed** (0 once paid), and `date_created` is when the session closed and the charge was created.

Questions the data answers:
1. **How busy was the club in the last 30 days?** → `fetchActivitySummary`: sessions, matches, distinct players and paid shuttles in the window.
2. **How much was charged, and how much is still due?** → `fetchActivitySummary`: `charged` is the sum of `sessions.amount_due` for closed sessions in the window, and `still_due` is the sum of the owed amounts on those sessions' payment rows.
3. **Who should I chase first?** → `fetchTopOwers`: the active players owing ≥ RM 0.01, ordered by the `MIN(date_created)` of their unpaid rows, then by owed amount descending.
4. **How many players owe, and how much in total?** → `fetchTopOwers`: `owing_count` and `total_owed`, across all owers, not just the top `limit`.

Non-obvious design decisions:
1. **Open sessions count toward activity but never toward money.** Sessions, matches, players and shuttles include open sessions, so a session played today shows up. `charged` and `still_due` include closed sessions only, because an open session has no charges (D7). Showing an estimate there would mix real money with guesses.
2. **The window is passed in, not computed in SQL.** The frontend passes `from` and `to` as ISO strings for local start of day 29 days ago and local end of today (D10). The query compares with `datetime(s.date)`, so seed data written with `toISOString()` and rows with the `datetime('now')` default are compared the same way.
3. **The totals ignore `limit`.** `fetchTopOwers(3)` returns 3 rows, but `owing_count` and `total_owed` cover every ower, because the footer reads "5 players owe RM 79" (D8).
4. **No runway query.** The low-stock slot ships with no trigger (D3). Writing a runway reader now would invent a threshold the user has deferred to "Warn at" (D4).

## Readers

### 1. `fetchActivitySummary` (new)
> Source: [services/session.ts](../../services/session.ts)

```ts
export type ActivitySummary = {
    sessions: number,
    matches: number,
    players: number,
    shuttles_used: number,
    charged: number,
    still_due: number
}
export async function fetchActivitySummary(from: string, to: string): Promise<ActivitySummary>
```

| Field | How it's computed (sessions with `datetime(date)` between `datetime(from)` and `datetime(to)`) |
|---|---|
| `sessions` | `COUNT(*)` of sessions in the window, open or closed |
| `matches` | `COUNT(*)` of `matches` in those sessions |
| `players` | `COUNT(DISTINCT match_players.player_id)` across those sessions' matches, ignoring NULL `player_id` |
| `shuttles_used` | `COUNT(*)` of `shuttle_instances` in those sessions with `shuttle_id IS NOT NULL` (free shuttles excluded) |
| `charged` | `SUM(amount_due)` of sessions in the window with `status = 'closed'`, rounded to 2 dp; 0 when none |
| `still_due` | `SUM(amount_paid)` from `shuttle_payments` (via `shuttle_instances.session_id`) plus `court_payments` (via `court_bookings.session_id`) for closed sessions in the window, rounded with `roundToCents`; 0 when none |

Every field is 0 when the window has no sessions. The function never returns null.

| Consumer | File |
|---|---|
| Home, Last 30 days tiles | `app/(tabs)/index.tsx` (frontend half) |

### 2. `fetchTopOwers` (new)
> Source: [services/player.ts](../../services/player.ts)

```ts
export type TopOwer = {
    player_id: number,
    name: string,
    avatar_colour: AvatarColour | null,
    owed: number,
    oldest_unpaid_date: string,
    sessions_owed: number
}
export type TopOwers = {
    owers: TopOwer[],
    total_owed: number,
    owing_count: number
}
export async function fetchTopOwers(limit: number = 3): Promise<TopOwers>
```

| Field | How it's computed |
|---|---|
| unpaid rows | `UNION ALL` of `shuttle_payments` (with `session_id` from `shuttle_instances`) and `court_payments` (with `session_id` from `court_bookings`), where `amount_paid > 0` |
| `owed` | `SUM(amount_paid)` per player, rounded with `roundToCents` |
| `oldest_unpaid_date` | `MIN(date_created)` of that player's unpaid rows |
| `sessions_owed` | `COUNT(DISTINCT session_id)` of that player's unpaid rows |
| filter | `players.status = 'active'` and `owed >= 0.01` |
| order | `oldest_unpaid_date ASC`, then `owed DESC`, then `name ASC` |
| `owers` | first `limit` rows |
| `total_owed`, `owing_count` | sum and count over **all** players that pass the filter |

When nobody owes, it returns `{ owers: [], total_owed: 0, owing_count: 0 }`.

| Consumer | File |
|---|---|
| Home, Waiting on payment | `app/(tabs)/index.tsx` (frontend half) |

## Contract for frontend
The confirmed screen → data mapping (D12). Home and the Sessions tab use only these functions.

| Screen element | Reader / writer · field | Status |
|---|---|---|
| Session card: newest open session, name, date, start time, location, player/match/shuttle counts | `fetchAllSessions()` · `status`, `name`, `date`, `start_time`, `location`, `player_count`, `match_count`, `shuttle_count` | exists |
| Session card: "≈ RM X so far" | `previewSessionCharges(sessionId)` · `total` | exists |
| Session card: "Last one: {name}, N days ago" | `fetchAllSessions()` · newest by `date` | exists |
| Session card: stale caption, "+N more open" | `fetchAllSessions()` · `status`, `date` (logic on screen) | exists |
| Start session → open new session | `createNewSession(...)` returns `session_id` (through `AddSessionModal`, D13) | exists |
| Low-stock alert | none (D3) | deferred |
| Last 30 days tiles | `fetchActivitySummary(from, to)` · all fields | **new** |
| Waiting on payment rows + footer | `fetchTopOwers(3)` · `owers[]`, `total_owed`, `owing_count` | **new** |
| "Playing tonight" tag | `fetchSessionById(sessionId)` · `matches[].players` | exists |
| Recent sessions rows | `fetchAllSessions()` · `name`, `date`, `status`, `player_count`, `match_count`, `amount_due`, `outstanding_amount` | exists |
| Setup checklist | `fetchAllPlayers().length`, `fetchAllShuttles().length`, `fetchAllSessions().length` | exists |
| Sessions tab "Still open since {d Mon}" | `fetchAllSessions()` · `status`, `date` | exists |

Signatures of the new functions are in [Readers](#readers). The existing ones are unchanged.

## End-to-End Flows

### Happy path: Home loads between sessions
```
Home gains focus
  ├─► fetchActivitySummary(startOfDay(today − 29d), endOfDay(today))
  │     └─ { sessions: 2, matches: …, players: 6, shuttles_used: …, charged: …, still_due: … }
  └─► fetchTopOwers(3)
        └─ owers sorted oldest unpaid first, plus total_owed / owing_count for the footer
```

### Edge case: open session today
```
fetchActivitySummary(...)
  ├─ the open session counts toward sessions / matches / players / shuttles_used
  └─ not toward charged / still_due (no payment rows exist until close)
```

### Edge case: a player paid in full
```
closeSession → payment rows with amount_paid > 0
paySessionInFull → amount_paid = 0
fetchTopOwers → the player has no unpaid rows, so they're left out of owers, owing_count and total_owed
```

### Edge case: a deleted player
Deleted players can't owe money (`deletePlayer` is blocked while they owe), and the `status = 'active'` filter excludes them anyway.

## Blast Radius
| Change | What breaks |
|---|---|
| New exports in `services/session.ts` and `services/player.ts` | Nothing; they're additive |
| New `stale-open` seed scenario | Nothing; `default` is unchanged |
| A later rename of `amount_paid` to an owed column | Both new readers rely on `amount_paid` meaning "still owed"; update them along with the existing readers |

## File Reference
| File | Role |
|---|---|
| [services/session.ts](../../services/session.ts) | **new** `ActivitySummary`, `fetchActivitySummary`; reuses `roundToCents` |
| [services/player.ts](../../services/player.ts) | **new** `TopOwer`, `TopOwers`, `fetchTopOwers` |
| [services/seed.ts](../../services/seed.ts) | **new** `stale-open` scenario |
| [services/database.js](../../services/database.js) | Unchanged; reference for `sessions`, `shuttle_payments`, `court_payments` |

---

## Acceptance Criteria
- [x] AC1: `fetchActivitySummary` is correct. On the `default` seed, called for today and the 29 days before, its six fields match hand-counted SQL run from the dev tools / Metro log. `charged` and `still_due` count closed sessions only. A session dated outside the window is excluded.
- [x] AC2: `fetchTopOwers` is correct. It returns at most `limit` active owers, ordered oldest unpaid first, then largest owed. `sessions_owed` counts distinct sessions. Owed amounts below RM 0.01 are ignored. `total_owed` and `owing_count` cover all owers, not just the top `limit`. On the `default` seed, the fully-paid player is absent.
- [x] AC3: `npm run db:fresh -- stale-open` loads data with a session left open from 3 days ago (plus the default data), and Metro logs `[dev-db] fresh stale-open done`.
- [x] AC4: no table or column changes, and no file under `app/` or `components/` is touched. `npm run lint` and `npx tsc --noEmit` pass. Checked on the iOS Simulator via Expo MCP (logs), never on web.

## Required Changes
- **services/session.ts**: add `ActivitySummary` and `fetchActivitySummary` (see [Readers §1](#1-fetchactivitysummary-new)).
- **services/player.ts**: add `TopOwer`, `TopOwers` and `fetchTopOwers` (see [Readers §2](#2-fetchtopowers-new)).
- **services/seed.ts**: add `seedStaleOpen`. It runs `seedDefault`, then `createNewSession({ name: 'Friday Doubles', date: subDays(new Date(), 3).toISOString(), startTime: '19:30', location: 'Community Centre' })` with one match through `createNewMatch`, left open. Register it as `'stale-open'` in `scenarios`.
- **Verification**: to check AC1 and AC2 without a screen, temporarily log the results from `app/dev/db.tsx` or the Metro console, or compare against `debugDatabase()`. Remove any temporary logging before the PR.

## Features Catalog
- **Extends**: #12 Home dashboard
- **Closes known gaps**: none on its own (the frontend half closes "No quick action to start a session or match from Home")

## Open Questions
- None.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mixed date formats (`toISOString()` vs `datetime('now')`) compare wrongly as strings | Medium | Tiles miscount at the window edges | Compare with `datetime(...)` on both sides |
| Rounding drift between `owed` and the player detail balance | Low | Totals differ by a cent | Use `roundToCents` on sums, as existing readers do |

---
*Status: COMPLETED — PR #TBD*
