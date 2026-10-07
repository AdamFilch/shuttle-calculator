# Design spec: Session detail

**Screen**: `app/session/[sessionId]/index.tsx` (the page you land on after tapping a session)
**Status**: Implemented through PRD [3] (`.claude/prds/partial/3-session-detail-redesign.prd.md`), 2026-10-06; verification partial. Where the two disagree, the PRD's Decision Log wins: "Open session" badge (D12), the closed total from `sessions.amount_due` (D3, D32), Delete session for empty sessions (D21, D24–D29), and a duration field in Book courts (D7). The open questions below are resolved by D3, D7 and D11.
**Mockup**: https://claude.ai/artifact/MTwbggBYKAzt7EBQq55n5G (open, closed, options sheet, Book courts sheet, close confirmation)
**Source of truth**: the "Shuttle Calculator" design system (see `.claude/context/design.md`). Every colour, type style, radius and spacing value below is a token from it.
**Method**: the ui-ux-pro-max skill supplied the UX rules: one primary CTA per screen, primary actions in thumb reach, secondary actions in an overflow, tabular figures for money, 44pt touch targets, status in words as well as colour, and confirmation before money-changing actions. Its generated palette and fonts were not used because the project design system overrides them.

## Goal and priorities

A session organiser at the court, between games, opens this screen to answer these questions, in this order:

1. **How much is owed.** While open this is an estimate; once closed it's the real outstanding amount.
2. **How many players have joined.**
3. **How many shuttles were used.**
4. **What can I do next**: Create match, Close session, and Book courts (how many courts, and at what price each, in RM).
5. **Which matches were played.**

## Layout, top to bottom

```
OPEN                                   CLOSED
┌────────────────────────────────┐     ┌────────────────────────────────┐
│ ‹ Sessions                  ⋯  │     │ ‹ Sessions                  ⋯  │
│ Friday Doubles                 │     │ Weekly Smash                   │
│ 6 Oct 2026 · 7:30 pm · Centre  │     │ 29 Sep 2026 · 8:00 pm · Hall A │
│ (In progress)                  │     │ (RM 79.50 due)                 │
│ ┌────────────────────────────┐ │     │ ┌────────────────────────────┐ │
│ │ ESTIMATED SO FAR           │ │     │ │ STILL OWED                 │ │
│ │ ≈ RM 47                    │ │     │ │ RM 79.50  of RM 96         │ │
│ │ ▓▓▓▓▓▓▓▓░░░░░░░            │ │     │ │ ▓▓░░░░░░░░░░░░░            │ │
│ │ ■ Courts RM 25 ■ Shuttles  │ │     │ │ ■ Paid RM 16.50 ■ Owed ... │ │
│ │ Final split is set when... │ │     │ │ 1 of 6 settled · closed .. │ │
│ └────────────────────────────┘ │     │ └────────────────────────────┘ │
│ [Players][Shuttles][Courts  ›] │     │ [Players][Shuttles][Courts]    │
│ PLAYERS        Estimated share │     │ PLAYERS            Final share │
│ (AL) Alice  2 matches ≈RM 8.84 │     │ (CH) Chloe       Owes RM 17.50 │
│ ...                            │     │ ...  (AL) Alice        Settled │
│ MATCHES               3 played │     │ MATCHES               3 played │
│ Match 3  8:41 pm  [* 2 shuttles]│    │ ...                            │
│ oo Alice & Elena VS oo Daniel..│     │ [lock] This session is closed… │
├────────────────────────────────┤     └────────────────────────────────┘
│ [Close session][+ Create match]│
└────────────────────────────────┘
```
`*` = clay feather icon, `oo` = overlapped avatar dots.

### 1. Header
- A native stack back button ("Sessions") and a `⋯` icon button on the right (44×44pt, `accessibilityLabel="Session options"`, `accessibilityRole="button"`).
- `screen-title`: the session name, or the date if the name is empty (keep today's fallback).
- `body` / `muted` meta line, joined with a middle dot: `D Mon YYYY · h:mm am · Location`. Leave out any part that is missing.
- A `StatusBadge` below the meta line: `In progress` (`primary` on `primary-tint`) while open. Once closed, `RM N due` (`clay` on `clay-tint`), or `Settled` when nothing is owed.
- The header stays in the scroll content. It replaces `PageHeader`'s "Add Match" action, which moves to the bottom bar.

### 2. Estimate card (priority 1)
A `surface-raised` card with a `border-subtle` hairline, `radius-md`, 16px padding.

| | Open | Closed |
|---|---|---|
| `section-label` | ESTIMATED SO FAR | STILL OWED |
| Value (28–34px, 600, tabular-nums) | `≈ RM 47`, with the `≈` in `clay` at weight 500 | `RM 79.50`, followed by `of RM 96` in `body` `muted` |
| 6px split bar on `neutral-tint` | `primary` = courts, `clay` = shuttles | `sage` = paid, `clay` = still owed |
| Legend (13px, labels muted, values ink) | Courts RM 25 · Shuttles RM 22 | Paid RM 16.50 · Owed RM 79.50 |
| `caption` | "The final split is set when you close the session." | "N of M players settled · closed D Mon YYYY" |

- **Open value** = court cost (Σ price × quantity) + paid shuttle cost (Σ unit price of each paid instance used). This is the real spend, not the sum of rounded shares.
- Amounts use `formatRM` (`services/money-display.ts`), which drops zero cents (`RM 25`, `RM 8.84`). The app already uses RM; the design system README's `$` examples are out of date.
- The bar is decoration. The legend and value carry the meaning, so mark the bar `accessibilityElementsHidden`. The card's accessibilityLabel reads e.g. "Estimated so far, about RM 47: courts RM 25, shuttles RM 22".
- If the session has nothing to charge yet, show `RM 0` with the caption "Book courts or add a match to start the estimate."

### 3. Stat tiles (priorities 2 and 3)
Three equal tiles in one row, `gap` 8px, each a `surface-raised` card with 12px padding. Label 12px `muted` 500, value 22px 600 tabular-nums, sub-line 12px `muted`.

| Tile | Value | Sub-line | Tap |
|---|---|---|---|
| Players | distinct players in the session's matches | "in N matches" | none |
| Shuttles (clay feather icon before the label) | distinct shuttle instances used (free included) | open: "N free" (omit if 0); closed: shuttle cost `RM N` | none |
| Courts | Σ quantity across bookings | Σ price × quantity | **Open only**: opens Book courts. Show a 16px `muted` chevron top-right as the affordance. |

The tiles replace today's "Shuttles Used" and "Courts Booked" list sections. Per-type shuttle detail lives on the match screen.

### 4. Players section
- A `section-label` "PLAYERS", with the right-aligned caption "Estimated share" (open) or "Final share" (closed).
- One card row per player: `Avatar` (36px, colour from `player_id % 4`), name (`card-title`), sub-line "N matches" (closed and settled: "N matches · paid RM X"), and a badge on the right.
  - Open: `≈ RM 8.84` on `clay-tint`, text in `clay-strong` (12px clay text needs `clay-strong` to pass AA).
  - Closed: `Owes RM 17.50` (clay) or `Settled` (`settled` on `settled-tint`).
- Sort open sessions by estimated share, highest first. Sort closed sessions by owed, highest first, with settled players last. Break ties by name.
- Tapping a row opens `app/player/[playerId]`. The pressed state fills `primary-tint`.

### 5. Matches section (priority 5)
- A `section-label` "MATCHES", with the right-aligned caption "N played". Newest match first.
- Each match card (12px × 14px padding):
  - Row 1: "Match N" (`card-title`) plus the start time as 12px `muted` (open sessions only). On the right, a ShuttleChip-style pill: clay feather + "N shuttles" on `clay-tint` / `clay-strong`. If every shuttle in the match was free, use "Free" on `neutral-tint` / `muted`.
  - Row 2: teams. Two overlapped 20px avatar dots, then "Alice & Ben", then a `muted` uppercase "VS", then the other pair. The top side is positions 0 and 2 (TL, TR) and the bottom side is 1 and 3 (BL, BR). A singles match shows one name per side. The row wraps on narrow screens and never truncates names.
  - Optional row 3 (caption): "1 reused from match 1 · 1 free" when a match reused or had free shuttles.
- Tapping a card opens `app/session/[sessionId]/[matchId]`.
- Empty: an `EmptyState` (clay feather icon) with "No matches yet" and "Create your first match to start tracking shuttles."

### 6. Bottom action bar (priority 4, open sessions only)
- Fixed to the bottom on `surface` with a `border-subtle` top hairline, 12px top padding, 16px sides, and safe-area bottom inset. Give the ScrollView a bottom padding equal to the bar's height so the last card stays reachable.
- A two-column grid with an 8px gap, about 1 : 1.35:
  - **Close session**: `sage` fill, `on-sage` label. Sage is the design system's colour for settling money.
  - **Create match**: `primary` fill, `surface` label, 16px + icon. This is the screen's one primary action and sits in the right-hand thumb zone.
- Both are 44pt tall, `radius-sm`, with pressed opacity 0.85.
- Close session is disabled (`disabled` fill, `muted` label) when there are courts but no matches, with the caption "Add a match before closing" above the bar. This mirrors the guard in `closeSession` so the user never hits an error alert.
- On closed sessions the bar is not shown. A card note at the end of the scroll reads "This session is closed, so no new matches or courts can be added. Record payments from each player's page." with a `settled` lock icon.

## Overflow sheet (`⋯`)
- A bottom sheet on `scrim`, `radius-lg` top corners, `shadow-modal`, a grabber, `modal-title` "Session options", and a close `x` (44pt).
- Rows are menu cards: a 36px `primary-tint` icon tile, a title (`card-title`), a sub-line and a chevron.
  - **Book courts**, with the sub-line "N courts booked · RM X" (or "No courts booked yet"). Open sessions only.
- A secondary **Cancel** button below.
- Hide ⋯ on closed sessions until there's something to put in the sheet (see Open questions).

## Book courts sheet
A restyle of `components/session/bookCourtModal.tsx` as a sheet.
- `modal-title` "Book courts", a close `x`, and the sub-line "Split evenly across everyone who played when you close the session."
- **BOOKED** list: one card per booking, showing the label (or "Court booking N"), the sub-line "RM 25 × 1 · 90 min" (duration only if set), and the total on the right in 600 tabular-nums. Hidden when there are no bookings.
- **ADD A BOOKING** form:
  - Label (optional) text input.
  - Price per court: a decimal-pad input with a muted "RM" prefix. Validate it on blur ("Enter a price above RM 0"). Today the field defaults to "0" with no check.
  - Courts: a `Stepper` (min 1), replacing the free-text quantity field.
  - A dashed `border-dashed` divider, then "This booking" with the price × courts total.
- Cancel (secondary) + **Book court** (primary). Book court stays disabled until the price is valid. On save, the new booking appears in the BOOKED list and the estimate card updates.

## Close session confirmation
- `PaymentConfirmationDialog`, with title "Close session?" and the body "This locks in each player's share. You can't add matches or courts afterwards."
- Below the body, a bordered list of the exact shares `closeSession` will insert, grouping players with the same amount ("Alice, Daniel, Elena, Farid · RM 8.84 each"), then a Total row.
- Confirm button: **Close session** in `sage` / `on-sage`, next to a secondary Cancel.
- The total can be a few sen above the estimate card's value because shares are rounded per player. The dialog shows the share total, so it matches what gets recorded.

## States
- **Loading**: skeleton cards (hero, three tiles, two rows) on `surface`, not the centred spinner.
- **Empty open session**: the estimate shows `RM 0` (or the court cost if courts are booked), tiles show 0, Players is hidden, Matches shows the EmptyState, and the bar is visible.
- **Long names and locations**: wrap and never truncate. The meta line wraps to two lines.
- **Large text (Dynamic Type)**: tiles stack their value under the label, and the three-tile row may become 1 + 2 at the largest sizes.

## Data each block needs

| Block | Reader |
|---|---|
| Header, matches | `fetchSessionById` (`services/session.ts`). Matches need sorting newest first, and each match needs reused/free counts (free = `shuttle_id === null`; reused = an instance linked to an earlier match). |
| Courts tile, Book courts list | `fetchSessionById().courts` / `fetchCourtBookingsBySessionId` (`services/court.ts`) |
| Shuttles tile | `fetchAllShuttlesBySessionId` (`services/shuttle.ts`), or count distinct instances from `fetchSessionById` |
| Open estimate, per-player shares, close dialog | **New** `previewSessionCharges(sessionId)` in `services/session.ts` (see below) |
| Closed amounts | `fetchAllPlayerPaymentsBySession` (`services/player.ts`). `amount_paid` holds the amount still **owed** and paying zeroes it, so "Paid RM X" can't be derived today (see Open questions). |

### Estimate rule
The estimate must match the settlement exactly. Pull the split maths out of `closeSession` (`services/session.ts`) into a pure, read-only function:

```
previewSessionCharges(sessionId) -> {
  courtTotal, shuttleTotal,
  players: [{ player_id, name, matches, court_share, shuttle_share, total }],
  shareTotal
}
```

`closeSession` then calls it and inserts the rows. This way the screen, the confirmation dialog and the final `shuttle_payments` / `court_payments` can't drift apart, rounding included (`toFixed(2)` per player per charge).

## Accessibility and touch (ui-ux-pro-max §1–2)
- Every tappable element is ≥44×44pt: ⋯, the Courts tile, rows, cards, bar buttons and stepper buttons.
- Status is always in words (`In progress`, `Settled`, `Owes RM X`, `≈ RM X`), never colour alone.
- Small clay text uses `clay-strong`. `muted` text sits on `surface-raised` cards wherever possible.
- VoiceOver order: header → estimate → tiles → players → matches → bar. Each match card reads as one element: "Match 3, Alice and Elena versus Daniel and Farid, 2 shuttles".
- The `≈` is announced as "about".
- No layout shift on press: pressed states change fill/opacity only.

## Components

| Component | Status |
|---|---|
| `Avatar`, `StatusBadge`, `PlayerRow`, `Stepper`, `PaymentConfirmationDialog`, `ShuttleChip` | Reuse. `PlayerRow` needs a right-slot badge if it lacks one. `StatusBadge` gains an `estimate` variant (`≈ RM X`) and an `in progress` label for the open variant. |
| `EstimateCard` | New, `components/session/` |
| `StatTile` | New, `components/shared/`. Replaces `StatCard` here and later on Home. |
| `MatchCard` | New, `components/session/` |
| `BottomActionBar` | New, `components/layout/` (reusable for Create match's Start match) |
| `ActionSheet` | New, `components/shared/` (overflow and Book courts) |
| `EmptyState` | Named by the design system; build it if it doesn't exist yet |
| `ListRow` | No longer used on this screen |

## Proposed decision-log entries (for `.claude/context/design.md`, pending product-owner approval)

| Date | Decision | Why |
|---|---|---|
| 2026-10-06 | Session detail leads with an estimate card ("≈ RM X so far") on open sessions and "Still owed" on closed ones | Money is the first question at the court; nothing is charged until close, so the estimate is the only way to show it |
| 2026-10-06 | Create match and Close session move to a fixed bottom bar; Book courts moves behind a ⋯ options sheet and the Courts stat tile | Thumb reach for the hot path; one primary action per screen; settings don't compete with play |
| 2026-10-06 | Close session uses `sage`, not `primary` or a destructive red | It settles money (the design system's sage role) and is confirmed with the exact shares |
| 2026-10-06 | Estimates come from a shared `previewSessionCharges` used by `closeSession` | The estimate and the settlement must never disagree |

## Open questions (resolved by PRD [3])
1. ~~Should the Book courts sheet take a duration (the create-session form does, the current modal doesn't)? The mockup shows it only in the booked row's sub-line.~~ Resolved (D7): an optional duration in hours, stored as minutes.
2. ~~Closed "Paid RM X": `amount_paid` stores what is still owed and is zeroed on payment, so the original share is lost. Store the original share in a new column (e.g. `amount_due`), or drop "paid" figures and show only "Still owed" plus "N of M settled"?~~ Resolved (D3, D32, D34): the session total is stored in `sessions.amount_due`; the card shows paid vs owed for the session, with no per-player paid amount.
3. ~~Should a closed session's ⋯ hold anything (share summary, export), or stay hidden?~~ Resolved (D11): hidden.
