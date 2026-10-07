# Design spec: Match detail

**Screen**: `app/session/[sessionId]/[matchId]/index.tsx` (the page you land on after tapping a match card on Session detail)
**Status**: Designed 2026-10-07, not yet implemented. No PRD yet.
**Mockup**: https://claude.ai/artifact/RiroM71BXm2VpHVb9QMnGv (result set, no result yet, singles, two against one, scores level)
**Source of truth**: the "Shuttle Calculator" design system (see `.claude/context/design.md`). Every colour, type style, radius and spacing value below is a token from it.
**Method**: the ui-ux-pro-max skill supplied the UX rules: status in words as well as colour, 44pt touch targets, visible labels on inputs, a numeric keyboard for numbers, tabular figures, read-only state that looks different from disabled, and no layout shift on press. Its generated palette and fonts were not used because the project design system overrides them.

## Goal and priorities

Someone at the court opens this screen right after a match to answer these questions, in this order:

1. **Who played where.** The same court as Create match, with each player in the slot they were placed in, and nothing on it can be changed.
2. **Who won.** In words, and shown on the court.
3. **The score**, if anyone wants to enter it. It's optional.
4. **Which shuttles were used**: how many of each type, whether each was new, reused from an earlier match or free, and the price per shuttle.

**Result storage**: the winner and score are **UI-only for now**. Nothing is written to the database, there's no schema change, and the values reset when you leave the screen. The copy says so ("Results aren't saved yet").

## Layout, top to bottom

```
DOUBLES, RESULT SET                    SINGLES, WINNER TAPPED
┌────────────────────────────────┐     ┌────────────────────────────────┐
│ ‹ Thursday doubles             │     │ ‹ Thursday doubles             │
│ Match 3                        │     │ Match 4                        │
│ 7 Oct 2026 · 8:40 pm · Doubles │     │ 7 Oct 2026 · 9:05 pm · Singles │
│ ┌────────────────────────────┐ │     │ ┌────────────────────────────┐ │
│ │ RESULT               Clear │ │     │ │ RESULT               Clear │ │
│ │ (trophy) Aisyah & Ben won  │ │     │ │ (trophy) Dev won           │ │
│ │          21–17             │ │     │ │          No score entered  │ │
│ │ Who won?                   │ │     │ │ Who won?                   │ │
│ │ [Aisyah & Ben  Won][Chloe…]│ │     │ │ [Aisyah] [Dev  Won]        │ │
│ │ Score (optional)           │ │     │ │ Score (optional)           │ │
│ │ [ 21 ]  –  [ 17 ]          │ │     │ │ [    ]  –  [    ]          │ │
│ │ The higher score picks …   │ │     │ │ The higher score picks …   │ │
│ └────────────────────────────┘ │     │ └────────────────────────────┘ │
│        ( Winner )              │     │ ┌────────────────────────────┐ │
│ ┌────────────────────────────┐ │     │ │      ( Aisyah )   faded    │ │
│ │ [Aisyah] [ Ben ]  ringed   │ │     │ │══════════ net ═════════════│ │
│ │══════════ net ═════════════│ │     │ │      ( Dev )      ringed   │ │
│ │ [Chloe ] [ Dev ]  faded    │ │     │ └────────────────────────────┘ │
│ └────────────────────────────┘ │     │        ( Winner )              │
│ SHUTTLES USED        3 shuttles│     │ SHUTTLES USED        2 shuttles│
│ Aerosensa 30  ×2 · RM 4.50 each│     │ Aerosensa 30  ×1  Reused …     │
│                         (New)  │     │ Free shuttle  ×1 · no charge   │
│ Aerosensa 30  ×1  (Reused from │     │                       (Free)   │
│                     match 2)   │     │                                │
└────────────────────────────────┘     └────────────────────────────────┘
```

The screen is one `ScrollView` on `surface` with the `space-4` gutter and `space-6` between sections. There is no bottom bar and no primary button. Nothing on this screen needs a primary action.

### 1. Header
- Native stack back button: `‹ {session name}` in `primary`.
- `screen-title`: `Match {match_number + 1}`. This fixes today's off-by-one: the current screen shows `match_number`, but `MatchCard` shows `match_number + 1`.
- Meta line (`body`, `muted`): `D Mon YYYY · h:mm am · {format}`. The format is `Doubles` (2 v 2), `Singles` (1 v 1) or `2 vs 1`.
- Uses the existing `PageHeader` (title + subtitle, no action).

### 2. Result card (priorities 2 and 3)
A `surface-raised` card with a `border-subtle` hairline, `radius-md` and `space-4` padding. Its sections are `space-4` apart (14px in the mockup).

**Head row**: `RESULT` in `section-label`. On the right is `Clear`, a `primary` text button with a 44pt hit area. It only shows once a winner or either score is set. Tapping it clears the winner and both scores.

**Banner** (`accessibilityLiveRegion="polite"`):

| State | Look | Text |
|---|---|---|
| Winner set | `settled-tint` fill, `radius-sm`, 12px padding. A 40pt `sage` circle with an `on-sage` trophy icon | `card-title` 600: "Aisyah & Ben won". Under it in `body`, `settled`: "21–17" (winner's score first) or "No score entered" |
| No result | 1px dashed `border-dashed` outline, no fill | `card-title` 500: "No result yet". `caption`: "Tap the side that won, or enter the score." |
| Scores level | Same as No result | "Scores are level". `caption`: "Change a score, or tap the side that won." |

**Who won?** (`caption` label, then a two-column grid with an 8px gap):
- One button per side. It's at least 56pt tall, `radius-sm`, with a `surface-raised` fill and a 1px `border` outline.
- Contents: the side's avatar-colour dots (18pt, overlapping by 6, with a 2px `surface-raised` ring), then the names (`button` style, `ink`), then a state line in `caption`.
- Unselected: the state line reads "Tap if they won" in `muted`.
- Selected: a 2px `sage` outline (the design system's Selected state), `settled-tint` fill, and a state line reading "Won" in `settled` 500. `accessibilityState={{ selected: true }}`.
- Side names come from the players in the half: "Aisyah & Ben", or just "Dev" for one player.

**Score (optional)** (`caption` label, then a `1fr auto 1fr` row):
- Two inputs, each with a visible `caption` label giving the side's names (ellipsised if long). They're 48pt tall, `radius-sm`, with a `border` outline, centred 20px/600 tabular `ink` text and a `0` placeholder in `border-dashed`.
- `keyboardType="number-pad"`, `maxLength={2}`. Non-digits are stripped.
- A `–` in `muted` sits between them.
- Helper `caption` underneath: "The higher score picks the winner. Results aren't saved yet."
- Focus: a 2px `primary` ring.

### 3. Court (priority 1)
The same `Court` component as Create match, in a new **read-only** mode. It keeps the same proportions, lines and net, and gets `space-3` of vertical room so the Winner pill can sit on the court edge.

- **Slots aren't tappable.** Render a `View`, not a `Pressable`: no press opacity, no button role and no "Add player" text. Each filled slot keeps its avatar-colour fill at 30% over `court`, the avatar (44pt) and the name in white with the soft shadow.
- **Full-half rule.** Each half only renders the players it has. A lone player on a side (singles, or one side of 2 vs 1) gets **one slot spanning the whole half**, with a bigger avatar (60pt, 20px initials) and a `card-title`-sized name. It never sits in one service box next to an empty one. Two players share the half as they do today, in their saved positions (TL/TR on top, BL/BR on the bottom).
- **Winning half**:
  - Slots get a 3px `court-line` (white) ring, and their fill goes from 30% to 50% avatar colour.
  - An ink `Winner` pill sits centred on that half's back line, half over the court edge. It has white text in `badge` 600, a 16pt trophy icon and a 3px white outer ring.
- **Losing half**: slots fade to 45% opacity.
- **No winner**: both halves look normal and there's no pill.
- **Why not sage on the court**: `sage` (#7fc8a9) is almost the same colour as `court` (#7ab698), so it wouldn't show up. Sage marks the win in the result card instead, on white.
- Changes animate with a 200ms ease-out on opacity and ring only. They're disabled under Reduce Motion.

### 4. Shuttles used (priority 4)
- Head row: `SHUTTLES USED` in `section-label`. On the right, the shuttle glyph plus "3 shuttles" in `clay-strong`, correctly pluralised ("1 shuttle").
- One `surface-raised` card holding the rows, separated by 1px dashed `border-subtle` lines (as on the player-detail mockup).
- **One row per (shuttle type, origin)**:
  - A 32pt `radius-sm` icon tile: `clay-tint` with a `clay` glyph, or `neutral-tint` with a `muted` glyph when free.
  - The type name, in `button` style 500.
  - A sub-line in `body`, `muted`, tabular: "×2 · RM 4.50 each", or "×1 · no charge" when free.
  - A right-hand badge: `New` (`clay-tint` / `clay-strong`), `Reused from match N` (`neutral-tint` / `muted`) or `Free` (`neutral-tint` / `muted`).
- The price per shuttle is `total_price / num_of_shuttles`, with cents dropped when they're zero ("RM 6 each").
- Order: new first, then reused (oldest source match first), then free.
- A match always has at least one shuttle instance (`createNewMatch` adds a free one when none is chosen), so there's no empty state.

## Result rules

| Input | Winner |
|---|---|
| Both scores filled in and different | The higher score's side. The toggles follow it. |
| Both scores filled in and equal | None ("Scores are level") |
| One or no score filled in | Whichever side toggle is selected, if any |
| Tap the selected toggle (with no deciding score) | Clears the winner |
| Tap the other toggle while the scores pick a winner | That side wins, and both scores are cleared so the two never contradict each other |
| Clear | Clears everything |
| Leave the screen | Everything resets (not stored) |

## States
- **Loading**: skeletons for the result card, court and one shuttle row on `surface`, not the centred spinner that's there today.
- **No result** (the default on open): see the banner table. The court is neutral.
- **Long names**: side buttons wrap to two lines. Score labels ellipsise, and the button above still shows the full names. Court names ellipsise inside the slot.
- **Large text (Dynamic Type)**: side buttons stack to one column. The court keeps its proportions, and names may ellipsise.
- **Closed session**: identical. The result is still UI-only.

## Data each block needs

| Block | Reader |
|---|---|
| Header | `fetchMatchById` (`services/match.ts`): `match_number`, `date`. The session name comes from the stack param or `fetchSessionById`. |
| Court | `fetchMatchById().players`. It needs **`avatar_colour`** added to the select, and the player type fixed (`players_id` → `player_id`), so a `Player`-shaped object can go to `CourtSlot`. |
| Shuttles | `fetchMatchById().shuttles`, extended with `s.total_price`, `s.num_of_shuttles` and a first-use match number per instance (`MIN(m2.match_number)` over that instance's `match_shuttle_instances`). Group by `(shuttle_id, origin)`, where origin is `new` (first use is this match), `reused` (with `from_match_number`) or `free` (`shuttle_id IS NULL`). This is the same rule as `reused_from` in `fetchSessionById` (`services/session.ts`). |
| Result | Screen state only (`useState`): `winnerSide: 'top' \| 'bottom' \| null`, `topScore`, `bottomScore` |

## Accessibility and touch (ui-ux-pro-max §1–2)
- Side buttons are at least 56pt tall and `Clear` has a 44pt hit area. Score inputs are 48pt tall. Court slots aren't interactive, so they need no hit area.
- The result is always in words: the banner, "Won" on the toggle, and "Winner" on the court pill. Colour is never the only signal.
- The court is one accessibility element: "Court. Top: Aisyah and Ben, winners. Bottom: Chloe and Dev." Slots aren't focusable separately.
- The banner is a polite live region, so a change in the result is announced without moving focus.
- Score inputs have visible labels with the side's names, and `accessibilityLabel` "{names} score".
- Read-only looks different from disabled: slots keep their full colour (no `disabled` grey), and there's simply nothing to press.
- No layout shift: the ring is a shadow/outline and the fade is opacity.

## Components

| Component | Status |
|---|---|
| `Court`, `CourtSlot` (`components/session/match/Court.tsx`) | Extend. New props: `readOnly`, `winnerSide`, with `onSelectSlot` optional; `CourtSlot` gets `solo`. In read-only mode each half renders only its filled slots. Create match passes none of these, so it doesn't change. |
| `TrophyGlyph` | New, `components/session/match/`. An SVG in the style of `ShuttleGlyph` |
| `MatchResultCard` | New, `components/session/match/`. The banner, side toggles and score inputs, controlled by the screen |
| `MatchShuttleRow` | New, `components/session/match/` |
| `ShuttleGlyph`, `PageHeader`, `Avatar` | Reuse |
| `PlayerButton` and the button-tile `FlatList` in the current screen | Remove |

## Proposed decision-log entries (for `.claude/context/design.md`, pending product-owner approval)

| Date | Decision | Why |
|---|---|---|
| 2026-10-07 | Match detail reuses the Create match court in a read-only mode | Same picture of who stood where on both screens. Read-only, so a finished match can't be changed by accident |
| 2026-10-07 | A lone player on a side fills the whole half of the court | Singles and 2 vs 1 read clearly. An empty service box looks like a missing player |
| 2026-10-07 | The match result (winner + optional score) is UI-only for now and says "Results aren't saved yet" | Product-owner decision: try the interaction before adding a schema change |
| 2026-10-07 | The court shows the winner with an ink "Winner" pill, a white ring and a faded losing half, not sage | Sage is almost the same colour as `court`. Sage still marks the win in the result card |
| 2026-10-07 | Scores pick the winner when both are filled in and differ; tapping a side that disagrees clears the scores | The two inputs can never contradict each other |

## Open questions
1. When the result is saved later, where does it go? `matches.winner_side` + `top_score` / `bottom_score` columns are the obvious choice. That needs a DB reset (there are no migrations) and a seed update.
2. Should `MatchCard` on Session detail show the result once it's stored (for example a small "Won" mark beside the winning side)?
3. Should match detail get a ⋯ options sheet later (delete match, edit shuttles)? This spec leaves it out.
