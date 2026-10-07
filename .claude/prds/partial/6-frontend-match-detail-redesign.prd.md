# [6]: Frontend — Match Detail Redesign

**Depends on:** [[6]: Backend — Match Detail Redesign](../completed/6-backend-match-detail-redesign.prd.md) merged

Match detail is the screen the manager lands on after tapping a match card on Session detail. This ticket rebuilds `app/session/[sessionId]/[matchId]/index.tsx` to the approved [Match Detail mockup](https://claude.ai/artifact/RiroM71BXm2VpHVb9QMnGv) and [spec](../../design/specs/match-detail.md). It answers four questions in order: who played where (the Create match court, read-only), who won (in words and on the court), the score (optional), and which shuttles were used (per type and origin, with the price per shuttle).

The screen loads everything from one reader, `fetchMatchById`, as defined in the backend's Contract for frontend. The winner and score live only in screen state: picking a side or typing a score updates the result banner and the court right away, and leaving the screen resets them, as the helper copy says ("Results aren't saved yet"). There's no bottom bar and no primary action. A missing match shows "Match not found". The screen is identical for open and closed sessions.

## Summary
Replaces today's plain screen (title off by one, tile buttons that do nothing, no prices) with a header, a result card, a read-only court that shows the winner, and a shuttles-used list with New / Reused / Free badges and the price per shuttle. `Court` gains a read-only mode, and Create match doesn't change. No service, schema or data changes: everything comes from `fetchMatchById` as the backend ticket delivered it.

## Users
- **Primary**: the club manager at the court right after a match, phone in one hand, checking who played, saying who won, and seeing which shuttles were used.
- **Not for**: players; anyone expecting the result to be saved (D2).

## Scope
**MVP**
- Header with match number, date, time and format.
- Result card: banner, Who won? side toggles, optional score inputs, Clear.
- Read-only court with the full-half rule and winner styling, animated (D6).
- Shuttles used list.
- Loading skeleton and "Match not found" state.

**Out of scope**
- Saving the result, or showing it on `MatchCard`: D2.
- "‹ {session name}" back label: D3, chevron only.
- A ⋯ options sheet (delete match, edit shuttles): spec open question 3.
- Per-player cost for the match: not in the spec.
- Any change to `services/` or the schema: backend ticket only.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Behaviour](#behaviour)
4. [State Machine](#state-machine)
5. [Readers](#readers)
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
The screen holds one `MatchFull | null` from `fetchMatchById` plus three pieces of local state: `winnerSide: 'top' | 'bottom' | null`, `topScore: string` and `bottomScore: string`. The top side is the players at positions 0 and 2 and the bottom side is positions 1 and 3 (D16). The displayed winner is derived from those three values by the [Result rules](#result-rules).

Non-obvious design decisions:
1. **The court reuses Create match's `Court`** in a new read-only mode, so both screens draw the same picture of who stood where. Create match passes none of the new props and doesn't change.
2. **A lone player fills the whole half.** Singles and 2 vs 1 never show an empty service box, which would look like a missing player.
3. **The winner on the court is ink + white, not sage.** `sage` (#7fc8a9) is almost the same colour as `court` (#7ab698). Sage marks the win in the result card instead.
4. **Scores and toggles can't contradict each other.** Differing scores pick the winner. Tapping the other side while the scores disagree clears both scores.

## Behaviour
Token-level styling (colours, type styles, radii, spacing) is in the [spec](../../design/specs/match-detail.md). Use it exactly. One `ScrollView` on `surface`, `space-4` gutter, `space-6` between sections, no bottom bar.

### 1. Header
- `Stack.Screen` with the same header options as Session detail (D20): chevron-only back (D3), `surface` background, `primary` tint.
- `PageHeader` title `Match {match_number + 1}`.
- Subtitle `D Mon YYYY · h:mm am · {format}`: `DisplayDateDMonYYYY` and `DisplayTimeOfDay(parseSQLTimestamp(date))` (D4). Format is `Doubles` (2 v 2), `Singles` (1 v 1) or `2 vs 1` (either way round).

### 2. Result card (`MatchResultCard`, new)
- Head row: `RESULT` and a `Clear` text button (44pt hit area), shown only when a winner or either score is set.
- Banner (`accessibilityLiveRegion="polite"`):

| State | Title | Sub-line |
|---|---|---|
| Winner set | "{side names} won", with a sage trophy circle on `settled-tint` | "21–17" (winner's score first) or "No score entered" |
| No result | "No result yet", dashed outline | "Tap the side that won, or enter the score." |
| Scores level | "Scores are level", dashed outline | "Change a score, or tap the side that won." |

- **Who won?**: two side buttons (≥56pt, two columns, stacked under large text). Each shows the side's avatar dots, its names ("Aisyah & Ben" or "Dev"), and "Tap if they won", or "Won" when selected with the sage outline. `accessibilityState={{ selected }}`.
- **Score (optional)**: two inputs, each with a visible label of the side's names (ellipsised). `number-pad`, `maxLength={2}`, non-digits stripped, `accessibilityLabel="{names} score"`, with a `–` between them. Helper text: "The higher score picks the winner. Results aren't saved yet."

#### Result rules
| Input | Winner |
|---|---|
| Both scores filled in and different | The higher score's side. The toggles follow it. |
| Both scores filled in and equal | None ("Scores are level") |
| One or no score filled in | Whichever side toggle is selected, if any |
| Tap the selected toggle (with no deciding score) | Clears the winner |
| Tap the other toggle while the scores pick a winner | That side wins, and both scores are cleared |
| Clear | Clears everything |
| Leave the screen | Everything resets (not stored) |

### 3. Court (read-only)
- `Court` with `readOnly` and `winnerSide`. Slots render as `View`s: not pressable, no button role, no "Add player".
- Each half renders only its filled slots. A lone player gets one `solo` slot spanning the half, with a 60pt avatar and a `card-title`-sized name. Two players sit in their saved positions.
- Winning half: a 3px white ring, fill raised from 30% to 50% avatar colour, and an ink `Winner` pill with a trophy, centred on that half's back line. Losing half: 45% opacity. No winner: neutral, no pill.
- Changes animate over 200ms ease-out on opacity and ring only, and are instant under Reduce Motion (D6, D19).
- The court is one accessibility element: "Court. Top: Aisyah and Ben, winners. Bottom: Chloe and Dev."

### 4. Shuttles used (`MatchShuttleRow`, new)
- Head: `SHUTTLES USED`, plus the shuttle glyph and "{n} shuttle(s)" (sum of `quantity`, pluralised).
- One `surface-raised` card with dashed separators and one row per reader row, in the order returned:
  - Icon tile: clay for paid, neutral for free.
  - Name: `name`, or "Free shuttle" when `null`.
  - Sub-line: "×{quantity} · RM {unit_price} each" with cents dropped when zero ("RM 6 each"), or "×{quantity} · no charge" when free.
  - Badge: `New`, `Reused from match {from_match_number + 1}`, or `Free`.

### States
- **Loading**: `Skeleton` blocks for the result card, the court and one shuttle row, not a spinner.
- **Not found**: `EmptyState` "Match not found" / "It may have been deleted." (D5).
- **Long names**: side buttons wrap to two lines, score labels and court names ellipsise.
- **Large text**: side buttons stack, and the court keeps its proportions.
- **Closed session**: identical.

## State Machine
```
[no result] ──tap side / scores differ──► [winner set]
     ▲                                      │
     ├──── tap selected side / Clear ───────┤
     │                                      │
     └── scores equal ──► [scores level] ◄──┘ (both scores filled, equal)
```

| Condition | State |
|---|---|
| Both scores filled and different | winner set (higher score) |
| Both scores filled and equal | scores level |
| Otherwise, `winnerSide` set | winner set |
| Otherwise | no result |

## Readers
### `fetchMatchById` (from the backend Contract for frontend)
> Source: [services/match.ts](services/match.ts)

**Returns:** `MatchFull | null`: `match_number`, `date`, `players: MatchPlayer[]`, `shuttles: MatchShuttleRow[]`. **Why:** every block on the screen. Called in `useFocusEffect`.

| Consumer | File |
|---|---|
| Match detail screen | [app/session/[sessionId]/[matchId]/index.tsx](app/session/[sessionId]/[matchId]/index.tsx) |

No writers.

## End-to-End Flows
### Happy path: record who won by score
```
Manager taps match 1 on Session detail
  └─► fetchMatchById(matchId) → MatchFull
        ├─ header "Match 1 · 7 Oct 2026 · 8:40 pm · Doubles"
        ├─ banner "No result yet", court neutral
        ├─ types 21 (top) and 17 (bottom)
        │     └─ banner "Alice & Ben won · 21–17", top toggle "Won",
        │        top half ringed with the Winner pill, bottom faded
        └─ leaves the screen → state resets
```

### Edge case: the toggle disagrees with the score
```
Scores 21–17 (top wins) → tap bottom toggle
  └─ bottom wins, both scores cleared, banner "… won · No score entered"
```

### Edge case: 2 vs 1
```
players at positions 0, 2 (top) and 1 (bottom)
  └─ meta "2 vs 1", bottom half is one solo slot spanning the half
```

## Blast Radius
| Change | What breaks |
|---|---|
| `Court` gets `readOnly`, `winnerSide`, optional `onSelectSlot`; `CourtSlot` gets `solo` | Create match (`app/session/[sessionId]/create-match/index.tsx`) must look and behave exactly as before; the defaults keep today's behaviour |
| `PlayerButton` removed | It's only exported from the match screen; grep before removing |
| New `Skeleton` in `components/shared/` | None (new) |

## File Reference
| File | Role |
|---|---|
| [app/session/[sessionId]/[matchId]/index.tsx](app/session/[sessionId]/[matchId]/index.tsx) | Rewritten screen; holds the result state; `PlayerButton` removed |
| [components/session/match/Court.tsx](components/session/match/Court.tsx) | Read-only mode, `winnerSide`, `solo` slot, animation |
| `components/session/match/MatchResultCard.tsx` | **new**: banner, side toggles, score inputs, Clear |
| `components/session/match/MatchShuttleRow.tsx` | **new**: one shuttles-used row |
| `components/session/match/TrophyGlyph.tsx` | **new**: SVG in the style of `ShuttleGlyph` |
| `components/shared/Skeleton.tsx` | **new**: loading placeholder block |
| [components/session/match/ShuttleGlyph.tsx](components/session/match/ShuttleGlyph.tsx), [components/layout/PageHeader.tsx](components/layout/PageHeader.tsx), [components/shared/Avatar.tsx](components/shared/Avatar.tsx), [components/shared/EmptyState.tsx](components/shared/EmptyState.tsx) | Reused |
| [services/time-display.ts](services/time-display.ts) | `parseSQLTimestamp`, `DisplayDateDMonYYYY`, `DisplayTimeOfDay` (reused, unchanged) |

---

## Acceptance Criteria
- [x] AC1 (Header + states): the title is "Match {match_number + 1}". The meta reads "D Mon YYYY · h:mm am · Doubles/Singles/2 vs 1", with the time in local time. The back button is chevron only. Loading shows skeletons. An unknown match id shows "Match not found".
- [ ] AC2 (Result card): the banner shows "{names} won" + score or "No score entered", "No result yet", or "Scores are level". Side toggles show "Won" / "Tap if they won" and set `accessibilityState.selected`. Score inputs accept digits only, at most 2. Every row of the Result rules table holds. Clear shows only when something is set and clears everything. Leaving and reopening the screen resets the result. The helper copy reads "The higher score picks the winner. Results aren't saved yet." The banner is a polite live region, and the inputs have visible labels.
- [x] AC3 (Read-only court): slots can't be tapped and don't show "Add player". A lone player on a side fills the whole half. The winning half gets a white ring, a stronger fill and the ink Winner pill, and the losing half fades to 45%. Changes animate over 200ms, and are instant with Reduce Motion on. The court is a single accessibility element. Create match looks and behaves exactly as before.
- [x] AC4 (Shuttles used + checks): the head reads "{n} shuttle(s)", correctly pluralised. Rows read "×2 · RM 10 each" / "×1 · no charge" with `New` / `Reused from match N` / `Free` badges, in the reader's order, and cents are dropped when zero. `PlayerButton` is gone. `npm run lint` and `npx tsc --noEmit` pass. Checked on the iOS Simulator via Expo MCP after `npm run db:fresh` on a doubles, a singles and a 2 vs 1 match, with screenshots of each in the PR. Never checked on web. No file under `services/` changes.

## Required Changes
- **Court**: add the read-only mode, `winnerSide`, `solo` and the animation to `components/session/match/Court.tsx`, without changing Create match (see [Behaviour §3](#3-court-read-only)).
- **New components**: `MatchResultCard`, `MatchShuttleRow`, `TrophyGlyph`, `Skeleton` (see [File Reference](#file-reference)).
- **Screen**: rewrite `app/session/[sessionId]/[matchId]/index.tsx`, covering the header, result state and rules, court, shuttles and states (see [Behaviour](#behaviour)).
- **Docs**: update `.claude/context/features.md` #7 (what it does now, gaps closed). Set the Match detail row in `.claude/design/mockups.md` to `implemented (PRD [6])`. Add the spec's proposed design-log rows to `.claude/context/design.md`, noting the chevron-only back (D3). List the new components under Components in `design.md`.

## Features Catalog
- **Extends**: #7 Match detail
- **Closes known gaps**: "The title shows the raw match number ("Match 0" for the first match) while the session list shows "Match 1": an off-by-one inconsistency."; "Player and shuttle tiles look tappable but do nothing."

## Open Questions
- [ ] Where results are stored later, and whether `MatchCard` shows them (spec open questions 1–2). Not needed for this ticket.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Court changes alter Create match | Medium | High | All new props are optional, with today's behaviour as the default; check Create match on the simulator |
| Winner pill clipped at the court edge | Medium | Low | `space-3` of vertical room around the court, as the spec says |
| Reduce Motion not respected | Low | Medium | `useReducedMotion` from reanimated; toggle it in the simulator's accessibility settings |

---
*Status: PARTIAL — PR #TBD*

## Implementation Status
| AC | Status | Evidence / notes |
|---|---|---|
| AC1 | ✅ done | Simulator: "Match 1 / 8 Oct 2026 · 5:43 am · Doubles", "Match 3 … Singles", "Match 4 … 2 vs 1" (seed time 05:43 local); chevron-only back when pushed; skeleton blocks captured with the fetch held (temporary, uncommitted); `session/2/999` shows "Match not found / It may have been deleted." |
| AC2 | ⚠️ unverified (in part) | Verified on the simulator: banner in all three states ("Alice won · 21–17", "Elena won · No score entered", "No result yet", "Scores are level"); toggles read "Won" / "Tap if they won" with XCUITest `is_selected` true/false; tapping the selected toggle with deciding scores does nothing, tapping the other side clears both scores, tapping the selected side with no scores clears the winner; Clear hides when nothing is set and clears everything; leaving to Session detail and reopening resets (court label back to "Court. Top: Alice. Bottom: Elena."); helper copy and visible input labels shown. Scores were pre-filled through a temporary, uncommitted route param. **Not verified**: typing into the score inputs (digits-only stripping, 2-digit limit) and the polite live-region announcement. |
| AC3 | ✅ done | Court is one XCUITest element labelled "Court. Top: Alice and Ben, winners. Bottom: Chloe and Elena." (no per-slot buttons, no "Add player"); singles and 2 vs 1 show one slot spanning the half; winning half ringed with the Winner pill on its back line, losing half faded; screen recording shows the fade over several frames (6.833s→6.94s+, ease-out), and with Reduce Motion on it changes in a single frame; Create match still shows four "Add player" buttons and opens the player picker. |
| AC4 | ✅ done | "1 shuttle" / "2 shuttles"; rows "×2 · RM 10 each" + New (closed session match 1), "×1 · RM 10 each" + Reused from match 1 then "Free shuttle ×1 · no charge" + Free; `PlayerButton` removed; `npx tsc --noEmit` exit 0, `npm run lint` 0 errors (23 pre-existing warnings, none in changed files); driven on the iOS Simulator through the Expo MCP local tools (`automation_tap`, `automation_take_screenshot`, `automation_find_view`) after `npm run db:fresh`; screenshots in the PR; never run on web; no `services/` change. |

### Needs attention
- Type into both score inputs on the simulator (with the software keyboard) and confirm only digits are kept, at most 2, and that a deciding score flips the toggles and the court.
- Check with VoiceOver that a result change is announced (polite live region).
