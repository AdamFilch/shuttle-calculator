# [7]: Frontend — Home Redesign

**Depends on:** [[7]: Backend — Home Redesign](completed/7-backend-home-redesign.prd.md) merged

Home (`app/(tabs)/index.tsx`) is rebuilt to the approved [Home mockup](https://claude.ai/artifact/6VdzQQDJddjiyJTCcahsb3) and [spec](../design/specs/home.md), direction A. When the manager opens the app, Home answers "what do I do next". At the top, a session card offers **Start session** when nothing is open, or **Open session / New match** with a "≈ RM X so far" estimate while a session is running. Below it come:
- a low-stock alert slot (built, never shown yet);
- rolling **Last 30 days** tiles;
- **Waiting on payment**, the three players owing longest, with a one-line total;
- **Recent sessions** as compact rows.

Sections with nothing to show hide themselves. With no sessions at all, Home becomes a three-step **Welcome** checklist.

Starting a session from Home saves it and goes straight to the new session's detail page. A session left open from an earlier day gets a "Still open" caption on Home and a "Still open since {d Mon}" badge on the Sessions tab, because nobody is charged until it is closed. This half is screen work only. It calls the readers in the backend's [Contract for frontend](completed/7-backend-home-redesign.prd.md#contract-for-frontend) and changes nothing under `services/`.

## Summary
Removed from Home:
- the big "Total outstanding" `StatCard`
- the two shuttle `StatCard`s
- the `InsightsSection` chart

`StatCard` is deleted (D15). `InsightsSection` stays in the codebase for its later move to the Shuttles tab (D11).

New components in `components/home/`:
- `HomeSessionCard`
- `LowStockAlert`
- `SetupChecklist`

Changed components:
- `SessionCard` gains a `compact` variant and a stale badge.
- `StatusBadge` gains a `stale` variant.
- `AddSessionModal` gains an optional `onCreated(sessionId)`.

The Sessions tab otherwise looks and behaves as it does today. Nothing about money, settlement or the schema changes.

## Users
- **Primary**: the club manager. At the court, they open the app to record the next match. Between sessions, they open it to start a session or see who to chase.
- **Not for**: players. The manager is the only user.

## Scope
**MVP**
- Home rebuilt to spec §4a–4d with D2, D3, D7 applied (see [End-to-End Flows](#end-to-end-flows)).
- New `HomeSessionCard`, `LowStockAlert`, `SetupChecklist`.
- `SessionCard` `compact` variant and stale badge. `StatusBadge` `stale` variant.
- `AddSessionModal` `onCreated` prop.
- Sessions tab stale badge (D5, D6).
- Delete `components/shared/StatCard.tsx`.

**Out of scope**
- Showing the low-stock alert. It needs the future "Warn at: N [Shuttle / Session]" setting in the shuttle detail pop-up (D3, D4).
- Moving the usage chart to the Shuttles tab and other insights to their screens. That's follow-up work (D11).
- Recent payments or an activity feed (direction C, not chosen).
- Any `services/` or schema change. That's the backend half.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [End-to-End Flows](#end-to-end-flows)
4. [Blast Radius](#blast-radius)
5. [File Reference](#file-reference)
6. [Acceptance Criteria](#acceptance-criteria)
7. [Required Changes](#required-changes)

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
Home is a read-only screen. Its one write path is `AddSessionModal`, which already calls `createNewSession`. On focus (`useFocusEffect`, as today), it loads:

| Section | Reader (backend contract) |
|---|---|
| Session card, Recent sessions, setup check, stale logic | `fetchAllSessions()` |
| Estimate on the open card | `previewSessionCharges(sessionId).total` |
| "Playing tonight" tag | `fetchSessionById(sessionId).matches[].players` |
| Last 30 days | `fetchActivitySummary(from, to)`, where `from` = local start of day 29 days ago and `to` = local end of today, both `toISOString()` (`date-fns` `startOfDay`, `endOfDay`, `subDays`) |
| Waiting on payment | `fetchTopOwers(3)` |
| Setup checklist | `fetchAllPlayers().length`, `fetchAllShuttles().length` |

Which state Home shows:

| Condition | Home shows |
|---|---|
| `fetchAllSessions()` is empty | Welcome checklist only (spec §4c, §4d) |
| No session with `status = 'open'` | §4a: no-session card, Last 30 days, Waiting on payment, Recent sessions (3) |
| The newest open session's `date` is today | §4b: open card, Waiting on payment with "Playing tonight", Recent sessions (2); tiles hidden |
| The newest open session's `date` is before the start of today | §4b layout plus the caption "Still open. Close it to settle what everyone owes." (D5) |
| More than one open session | Newest in the card, plus "+N more open session(s)", which goes to the Sessions tab |

Non-obvious design decisions:
1. **Start session hands off to session detail.** `AddSessionModal` gets an optional `onCreated(sessionId: number)`, called after the save and any court booking, before `onClose`. Home passes `(id) => router.push('/session/' + id)` (D2, D13). The Sessions tab passes nothing and behaves as today.
2. **The low-stock slot exists but nothing fills it.** `LowStockAlert` is built to spec §5 and placed in Home's order. Home passes it an empty list for now, so nothing renders (D3). The future "Warn at" ticket only has to supply the list.
3. **Stale is decided on screen.** Stale means `status === 'open'` and `date` before the start of today. One helper is shared by the Home card and `SessionCard`, so both always agree (D16).
4. **Recent sessions skips the session already in the card**, so it isn't listed twice.

## End-to-End Flows

### Happy path: starting a session from Home
```
Home (no open session) → tap Start session
  └─► AddSessionModal opens
        └─ Save → createNewSession → id
              ├─ bookCourt (if courts entered)
              ├─ onCreated(id) → router.push('/session/' + id)
              └─ onClose()
Back from session detail → Home refocuses → open-session card
```

### Happy path: recording a match at the court
```
Home (open session today) → tap New match
  └─► router.push('/session/{id}/create-match')
```

### Happy path: chasing money
```
Home → Waiting on payment row (oldest unpaid first)
  └─► router.push('/player/{player_id}')
See all → Players tab
```

### Edge case: first launch
```
fetchAllSessions() = []
  └─ Welcome checklist: step 1 done if players > 0, step 2 done if shuttle types > 0
       ├─ step 1 → AddPlayerModal
       ├─ step 2 → AddShuttleModal
       └─ step 3 → AddSessionModal (with onCreated → session detail)
```

### Edge case: stale open session
```
Open session dated 3 days ago
  ├─ Home: card in open layout + "Still open. Close it to settle what everyone owes."
  └─ Sessions tab: its SessionCard badge reads "Still open since {d Mon}" (clay)
```

## Blast Radius
| Change | What breaks |
|---|---|
| Delete `components/shared/StatCard.tsx` | Nothing; Home was its only user (check with grep before deleting) |
| `SessionCard` new optional props / `compact` variant | Nothing if the defaults keep today's `card` look; the Sessions tab must render the same as before, apart from the stale badge |
| `StatusBadge` new `stale` variant | Additive; existing variants unchanged |
| `AddSessionModal` new optional `onCreated` | Additive; the Sessions tab doesn't pass it |
| Removing `InsightsSection` from Home | The usage chart isn't visible anywhere until the follow-up ticket (accepted, D11) |

## File Reference
| File | Role |
|---|---|
| [app/(tabs)/index.tsx](../../app/(tabs)/index.tsx) | Home, rebuilt |
| [app/(tabs)/session/index.tsx](../../app/(tabs)/session/index.tsx) | Sessions tab; passes the stale flag/date to `SessionCard` |
| [components/home/HomeSessionCard.tsx](../../components/home/HomeSessionCard.tsx) | **new**; spec §5 |
| [components/home/LowStockAlert.tsx](../../components/home/LowStockAlert.tsx) | **new**; spec §5; not rendered yet (D3) |
| [components/home/SetupChecklist.tsx](../../components/home/SetupChecklist.tsx) | **new**; spec §5 |
| [components/shared/SessionCard.tsx](../../components/shared/SessionCard.tsx) | `compact` variant, `matchCount`, `totalAmount`, `isEstimate`, stale badge |
| [components/shared/StatusBadge.tsx](../../components/shared/StatusBadge.tsx) | **new** `stale` variant ("Still open since {d Mon}", clay) |
| [components/session/modal.tsx](../../components/session/modal.tsx) | `AddSessionModal` optional `onCreated(sessionId)` |
| [components/shared/StatTile.tsx](../../components/shared/StatTile.tsx) | Reused for the 30-day tiles |
| [components/shared/PlayerRow.tsx](../../components/shared/PlayerRow.tsx) | Reused for owers |
| [components/layout/PageHeader.tsx](../../components/layout/PageHeader.tsx) | Reused; title Home or Welcome, date subtitle |
| [components/user/modal.tsx](../../components/user/modal.tsx), [components/shuttle/modal.tsx](../../components/shuttle/modal.tsx) | `AddPlayerModal`, `AddShuttleModal` for the checklist |
| [components/shared/StatCard.tsx](../../components/shared/StatCard.tsx) | Deleted (D15) |
| [services/money-display.ts](../../services/money-display.ts) | `formatRM` for every amount |

---

## Acceptance Criteria
- [x] AC1 (layout and removals): Home shows no "Total outstanding", no shuttle StatCards and no chart.
  - Order: session card → (low-stock slot) → Last 30 days → Waiting on payment → Recent sessions.
  - Empty sections hide.
  - `StatCard.tsx` is deleted.
  - Every amount uses `formatRM` (no `$`).
- [ ] AC2 (session card states):
  - **No session open:** "No session open" with the last session and its relative day. Start session opens `AddSessionModal`, and saving lands on the new session's detail page.
  - **Open today:** shows name, start time · location, players / matches / shuttles, and "≈ RM X so far" equal to session detail's estimate. Open session and New match navigate correctly.
  - **Open from an earlier day:** shows the stale caption.
  - **Several open:** shows "+N more".
  - **Tiles:** Last 30 days is hidden while a session is open. When shown, it covers today and the 29 days before, and Charged counts closed sessions only (with "RM X still due" or "All paid").
- [ ] AC3 (owers, recent, checklist):
  - **Waiting on payment:** at most 3 rows, oldest unpaid first, with "{n} sessions · since {d Mon}" or "Since {d Mon}" and the owed badge. The footer reads "{N} player(s) owe RM X". Owers in the open session get "Playing tonight · ". Rows open the player, and See all opens Players. Hidden when nobody owes.
  - **Recent sessions:** up to 3 compact rows (2 during an open session), excluding the card's session, each with "{d Mon} · {n} players · {m} matches · RM {total}" and a due / settled / open badge. Rows open the session, and See all opens Sessions.
  - **No sessions:** the Welcome checklist, with steps marked done from real counts, each opening the matching add modal.
- [ ] AC4 (Sessions tab and device check):
  - **Sessions tab:** a session open from an earlier day shows "Still open since {d Mon}" on its card, and other cards are unchanged.
  - **Seed data:** checked on the iOS Simulator via Expo MCP with `npm run db:fresh` for the `default`, `closed-today`, `stale-open` and `empty` scenarios.
  - **Accessibility:** labels as in spec §8, with touch targets ≥ 44pt.
  - **Checks:** `npm run lint` and `npx tsc --noEmit` pass. No file under `services/` is changed. Never checked on web.

## Required Changes
- **StatusBadge**: add `{ variant: "stale", since: string }`, rendered as "Still open since {d Mon}" with clay tint/strong (see [Overview](#overview) decision 3).
- **Stale helper**: one small function, e.g. `isStaleOpen(session)` in `components/shared/SessionCard.tsx` or a shared format file, used by Home and `SessionCard`.
- **SessionCard**: add `variant?: "card" | "compact"`, `matchCount?`, `totalAmount?` and `isEstimate?` (spec §5 "Changed: SessionCard"), plus the stale badge when the session is stale. The default look is unchanged.
- **AddSessionModal**: add `onCreated?: (sessionId: number) => void`, called after the save and booking, before `onClose` (see [Flows](#happy-path-starting-a-session-from-home)).
- **components/home/**: build `HomeSessionCard`, `LowStockAlert` and `SetupChecklist` to spec §4–§5, §7 (loading skeletons, per-section errors, pull to refresh) and §8 (accessibility).
- **Home**: rewrite `app/(tabs)/index.tsx` to the states in [Overview](#overview). Render `LowStockAlert` from an empty list (D3). Remove `StatCard`, `InsightsSection` and `fetchShuttleUsageSummary` usage.
- **Sessions tab**: `app/(tabs)/session/index.tsx` uses the stale helper for the badge.
- **Delete** `components/shared/StatCard.tsx` after grep confirms there are no users.
- **features.md**: on ship, update #12 Home dashboard (new layout, gaps closed). Keep the open gap "Low-stock alert built but not triggered; needs 'Warn at' (shuttle detail)".

## Features Catalog
- **Extends**: #12 Home dashboard; #3 Sessions (stale badge)
- **Closes known gaps**: "No quick action to start a session or match from Home"; "The usage chart is analytics and probably belongs on the Insights page once it exists" (removed from Home; the move itself is follow-up)

## Open Questions
- None.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The chart disappears until the Shuttles-tab follow-up ships | Certain | Usage history isn't visible for a while | Accepted (D11); schedule the follow-up next |
| Timezone edge: a session saved late at night (UTC vs local) looks stale or falls outside the window | Low | Wrong badge or tile count at day edges | Compute "start of today" and the window with local `date-fns` helpers; compare `Date` objects, not strings |
| Many sections each fetching on focus | Low | Brief flicker | Keep old data while refetching (spec §7) |

---
*Status: PARTIAL — PR #28*

## Implementation Status
| AC | Status | Evidence / notes |
|---|---|---|
| AC1 | ✅ done | iOS Simulator screenshots (default, closed-today, stale-open): no Total outstanding, shuttle StatCards or chart; order session card → Last 30 days → Waiting on payment → Recent sessions; sections hide when empty; `components/shared/StatCard.tsx` deleted (grep found no other users); all amounts via `formatRM` |
| AC2 | ⚠️ unverified (taps) | Seen on the simulator: "No session open" + "Last one: Friday Doubles, today" (closed-today); open card "Friday Doubles · Started 7:30 pm · Community Centre · 6 players 4 matches 4 shuttles · ≈ RM 45 so far", equal to session detail's "≈ RM 45" (default); stale caption and "Started Mon 5 Oct" (stale-open with today's session closed by a throwaway local seed, reverted); "+1 more open session" (stale-open); tiles hidden while open, shown with Sessions 2 / 7 matches, Shuttles 6 / 3 a session, Players 6 / 6 a session, Charged RM 161.02 / RM 144.52 still due (closed-today). **Not driven**: tapping Start session → save → session detail, Open session, New match, "+N more" (no tap tool, see below) |
| AC3 | ⚠️ unverified (taps) | Seen: Waiting on payment 3 rows, oldest first, "Playing tonight · Since 8 Oct" (default) and "2 sessions · since 8 Oct" (closed-today), amount badge, footer "5 players owe RM 79.50"; Recent sessions compact rows "8 Oct · 6 players · 4 matches · RM 65.02" with due badges, max 2 while a session is open, card's session excluded, extra open session shown with "≈ RM 10" and the stale badge; Welcome checklist (empty) and step 1 done "3 players added" + skip-shuttles hint (players-only throwaway seed). **Not driven**: row taps, See all, checklist steps opening the add modals |
| AC4 | ⚠️ partly verified | Sessions tab shows "Still open since 5 Oct" on the stale session only; other cards unchanged (stale-open). `npm run lint` 0 errors (23 pre-existing warnings, none in changed files), `npx tsc --noEmit` passes, no file under `services/` changed, never run on web. Largest Dynamic Type checked: title/badge and the card buttons stack. Accessibility labels and ≥ 44pt targets are in code (`min-h-11`/`min-h-12`/`min-h-14`) but not checked with VoiceOver. Seeds were checked with `xcrun simctl io booted screenshot`, not Expo MCP (its local tools were not connected) |

### Needs attention
- Drive the taps on the iOS Simulator with Expo MCP local tools connected (`npm run start:mcp`, then `/mcp` reconnect): Start session → save lands on the new session's detail; Open session / New match; "+1 more open session" → Sessions tab; owers rows → player, See all → Players; recent rows → session, See all → Sessions; Welcome steps 1–3 open AddPlayerModal / AddShuttleModal / AddSessionModal.
- Check the VoiceOver labels from spec §8 with the Accessibility Inspector.
