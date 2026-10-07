# Design spec: Player detail

**Screen**: `app/player/[playerId]/index.tsx` (the page you land on after tapping a player)
**Status**: Designed 2026-10-07, not yet implemented. PRDs: [4] `.claude/prds/4-player-detail-redesign.prd.md` (visual, sample paid amounts), then [5] `.claude/prds/5-player-payments-backend.prd.md` (backend).
**Mockup**: https://claude.ai/artifact/4q4VyNMLykPH61DpY7SdkM (owing, session opened, Pay individually, Waive, confirmation, options sheet, all settled)
**Source of truth**: the "Shuttle Calculator" design system (see `.claude/context/design.md`). Every colour, type style, radius and spacing value below is a token from it.
**Method**: the ui-ux-pro-max skill supplied the UX rules: one primary CTA per screen, progressive disclosure (collapsed sessions), a bulk-select mode with a fixed action bar, 44pt touch targets, checkboxes that announce checked/mixed state, status in words as well as colour, confirmation before money-changing actions, and secondary/destructive actions in an overflow. Its generated palette and fonts were not used because the project design system overrides them.

## Problem and goal

Today the screen lists only sessions with money owed, offers "Pay All" and "Pay Court Only" per session, and has a select mode that covers shuttles but not courts. It has no history, no way to forgive a charge, and a red Delete button in the header next to money actions. It still uses the old teal theme and `$`.

An organiser opens this screen to answer, in this order:

1. **How much does this player owe?**
2. **Which sessions did they join?**
3. **How much do they owe for each session?**
4. **Which matches did they play in each, and which shuttles is each charge for?**
5. **What do I do?** Pay all, pay individually (shuttles *and* courts), or waive.

## User and situation

- **Who**: the session organiser, on their phone, usually at the court or just after, while a player hands over cash or says they've transferred money.
- **Job**: record that money changed hands, quickly and without mistakes, and answer "why do I owe this much?" when the player asks.
- **Most important**: the total owed, and a one-tap way to clear it. Detail is there to check against, not to read every time.
- **Constraints**: design principles 1–4 in `design.md` (one-handed, fewest taps, money actions confirm, native iOS feel). Light only. Amounts use `formatRM`.

## Flow

- **Entry**: tap a player on the Players tab, or a player row on session detail.
- **Pay everything**: Pay all → confirmation → toast "Paid RM X". The page shows All settled.
- **Pay one session**: Pay session on a collapsed card → confirmation → toast.
- **Pay or waive some charges**: Pay individually (or Waive) → selection mode → tick charges → bottom bar button → confirmation → toast → back to normal mode.
- **Delete**: ⋯ → Player options → Delete player (only when nothing is owed) → the existing `DeletePlayerDialog` → back to the Players tab.
- **Exit**: Back returns to the previous screen. In selection mode, Cancel (or the back gesture) leaves selection mode and discards the picks without confirming, because nothing has changed yet.

## Layout, top to bottom

```
NORMAL                                  SELECTION (Pay individually)
┌────────────────────────────────┐      ┌────────────────────────────────┐
│ ‹ Players                   ⋯  │      │ Cancel                Select all│
│ (CH) Chloe                     │      │ Pay individually               │
│      5 sessions · 11 matches   │      │ Tick what Chloe is paying now. │
│ ┌────────────────────────────┐ │      │ ┌────────────────────────────┐ │
│ │ OWES            (2 sessions)│ │     │ │[–] Weekly Smash   RM 17.50 │ │
│ │ RM 23.75                   │ │      │ │    29 Sep · 3 of 4 picked  │ │
│ │ ▓▓▓▓▓▓░░░░░░░░             │ │      │ │ COURTS                     │ │
│ │ ■ Paid RM 18 ■ Owed 23.75  │ │      │ │[✓] Court share       RM 10 │ │
│ │ Tonight adds about RM 5.84 │ │      │ │ MATCH 1  Chloe & Alice VS..│ │
│ │ [   Pay all · RM 23.75   ] │ │      │ │[✓] Yonex AS-30     RM 2.25 │ │
│ │ [Pay individually][Waive ] │ │      │ │[ ] Victor No.1        RM 3 │ │
│ └────────────────────────────┘ │      │ └────────────────────────────┘ │
│ SESSIONS            Owing first│      │ ┌────────────────────────────┐ │
│ ┌────────────────────────────┐ │      │ │[ ] Tuesday Social  RM 6.25 │ │
│ │ Weekly Smash (Owes 17.50) ›│ │      │ │ ...  Court share  Paid ~~~ │ │
│ │ 29 Sep 2026 · 2 matches    │ │      │ └────────────────────────────┘ │
│ │ [ Pay session · RM 17.50 ] │ │      ├────────────────────────────────┤
│ └────────────────────────────┘ │      │ 3 charges picked      RM 14.50 │
│ Friday Doubles   (≈ RM 5.84) › │      │ [        Pay RM 14.50        ] │
│ Weekly Smash 8 Sep  (Settled) ›│      └────────────────────────────────┘
│ Holiday Hit          (Waived) ›│
└────────────────────────────────┘
```

### 1. Header
- Native stack back button ("Players") and a `⋯` icon button on the right (44×44pt, `accessibilityLabel="Player options"`, `accessibilityRole="button"`). It replaces `PageHeader`'s red "Delete" action.
- Identity row: a 56px `Avatar` (colour from `player_id % 4`, as everywhere else), then the name in `screen-title` and a `body` / `muted` meta line: "N sessions · M matches" (correct plurals, counted over all sessions the player joined, open sessions included).
- The header stays in the scroll content.

### 2. Balance card (priority 1)
A `surface-raised` card with a `border-subtle` hairline, `radius-md`, 16px padding.

| | Owing | Nothing owed |
|---|---|---|
| `section-label` (left) | OWES | ALL SETTLED |
| Badge (right) | `N sessions` (clay `owes` style) | `Settled` |
| Value (34px, 600, tabular-nums) | `RM 23.75` | `RM 0` |
| 6px split bar on `neutral-tint` | `sage` = paid to date, `clay` = owed | hidden |
| Legend (13px) | Paid RM 18 · Owed RM 23.75 | hidden |
| `caption` | Only if the player is in an open session: "Tonight's open session adds about RM 5.84 when it closes." ("This open session…" if the date isn't today) | "Paid RM X · waived RM Y across N closed sessions" (leave out the waived part if 0) |
| Actions | see below | none |

- **Owed** = the sum of every unpaid, unwaived court and shuttle charge across closed sessions. Open sessions are never in this number.
- **Actions** (owing only), a 2-column grid with an 8px gap, 12px above:
  - **Pay all · RM 23.75**: full width, `sage` fill, `on-sage` label. This is the screen's one primary action. It settles money, which is sage's role in the design system.
  - **Pay individually** and **Waive**: half width each, secondary (`surface-raised`, `border` outline, `ink` label).
- The bar is decoration. Mark it `accessibilityElementsHidden`. The card's accessibilityLabel reads e.g. "Owes RM 23.75 across 2 sessions. Paid RM 18 so far."

### 3. Sessions section (priorities 2–4)
- A `section-label` "SESSIONS" with the right-aligned caption "Owing first" (or "Newest first" when nothing is owed).
- **Order**: closed sessions with something owed (newest first), then open sessions (newest first), then settled and waived sessions (newest first).
- **Every session the player joined is listed**, including open, settled and fully waived ones. Today only owing sessions are shown.

#### Session card (collapsed)
A `card`. The header row has a minimum height of 64px and is one pressable (`accessibilityRole="button"`, `accessibilityState={{ expanded }}`):
- Title: the session name in `card-title`, or the date if the name is empty (same fallback as `formatSessionTitle`).
- Sub-line (13px `muted`, tabular-nums): `D Mon YYYY · N matches`, plus a suffix for the state:
  - open: `Tonight · N matches · open` (use "Tonight" when the date is today)
  - settled: `· paid RM X`
  - waived: `· RM X waived`
  - settled with part waived: `· paid RM X · RM Y waived`
- Right badge:

| State | Badge |
|---|---|
| Closed, something owed | `Owes RM 17.50` (`clay-strong` on `clay-tint`) |
| Open | `≈ RM 5.84` (`StatusBadge` `estimate`) |
| Closed, all paid (any part may be waived) | `Settled` |
| Closed, every charge waived, nothing paid | `Waived` (`muted` on `neutral-tint`, new variant) |

- A 18px `muted` chevron, rotated 90° when expanded (150ms, off under reduced motion).
- **Owing cards only**: a footer under a `border-subtle` hairline holding a full-width **Pay session · RM 17.50** button (`sage` 1.5px outline, `on-sage` label, `surface-raised` fill, 44pt). It's the per-session suggestion to pay everything at once. Outline, not fill, so Pay all stays the one filled primary.
- Default expansion: all collapsed. The page has to answer "how much" and "which sessions" first, and the detail is one tap away.

#### Session card (expanded)
Below the header, grouped rows, each group introduced by a `group-label` (12px, 500, uppercase, `muted`, letter-spacing 0.04em) under a `border-subtle` hairline:

1. **COURTS**: one **Court share** row if the session had court bookings. Sub-line: `RM {total court cost} ÷ N players`. There's one row per session, not per booking, because `court_payments` is split per booking but the player thinks of "my court share". If there are several bookings, the row sums them, and paying or waiving it acts on all of this player's court payments for the session.
2. **MATCH N**, one group per match the player played, oldest first, with the teams line under it ("Chloe & Alice VS Ben & Daniel", same pairing rules as `MatchCard`: TL+TR vs BL+BR, singles one name per side, wraps and never truncates).
   - One **charge row** per paid shuttle instance used in that match: a 32px `clay-tint` tile holding the clay shuttle glyph (`ShuttleGlyph`), the shuttle type name (14px 500), sub-line `RM {unit price} ÷ N players`, plus `· reused` when the instance was also used in an earlier match, and the share on the right (600, tabular-nums).
   - A reused shuttle is charged once. List it under the **first** match that used it, and only add "· reused" to the sub-line, so the same charge never shows twice.
   - Free shuttles cost nothing and are not listed. If a match had only free shuttles, show the caption "Free shuttles only" under its teams line.
3. **Charge row states**:
   - Owed: as above.
   - Paid: the title and amount in `muted`, the amount struck through, and the sub-line replaced by `Paid D Mon YYYY` in `settled`.
   - Waived: the same, but `Waived D Mon YYYY` in `muted`.
4. The **Pay session** footer stays at the bottom of an expanded owing card.

**Open session expanded**: same groups, but amounts are estimates (`≈ RM 2.25`), there's no footer, and there's a caption at the end: "Final shares are set when the session closes." Estimates come from `previewSessionCharges`, so they match session detail.

### 4. Selection mode (Pay individually, Waive)
Entered from the balance card. It's the same screen in a different mode, not a new route, so scroll position and the session data stay.

- **Nav bar**: `Cancel` (left, `primary` text) and `Select all` / `Clear all` (right, `primary` text). The back chevron and `⋯` are hidden.
- **Title**: `screen-title` "Pay individually" or "Waive charges", with a `body` `muted` helper: "Tick what Chloe is paying now." / "Tick what Chloe no longer has to pay." The identity row and balance card are hidden.
- **List**: only closed sessions with something owed, all expanded. Open, settled and waived sessions are hidden.
- **Checkboxes**: 24px visual box, 6px radius, in a 44×44pt hit area, at the left of every session header and every **owed** charge row. The whole row toggles too.
  - Pay mode: ticked = `sage` fill with an `on-sage` check. A picked row fills `settled-tint`, and a session with any pick gets a `sage` outline (the design system's selected state).
  - Waive mode: ticked = `clay` fill with a `surface` check, picked rows fill `clay-tint`, and the session outline is `clay`.
  - Session checkbox: tri-state. Unchecked / checked / mixed (a dash) when some of its owed charges are picked. Tapping when unchecked or mixed picks all of them. Tapping when checked clears them.
  - Paid and waived rows stay visible with a `disabled` filled box and are not focusable or tappable.
  - Session sub-line becomes `D Mon YYYY · N of M picked`. Its badge drops "Owes" and just shows `RM 17.50`.
- **Bottom action bar** (`BottomActionBar`), fixed, on `surface` with a `border-subtle` top hairline and the safe-area inset. Pad the ScrollView by its height.
  - A summary row: `N charges picked` (`muted`) and the total (600 `ink`, tabular-nums).
  - Full-width button: **Pay RM 14.50** (`sage` fill) or **Waive RM 6.25** (`clay` fill, `surface` label).
  - With nothing picked: the `disabled` button, labelled "Pay" / "Waive", and the summary reads "Tick charges to pay" / "Tick charges to waive".
- Clay rather than red for Waive: forgiving a charge changes money but deletes nothing. Red stays for Delete.

### 5. Confirmation dialog
Every money action confirms (design principle 3). It's one dialog component in the style of `CloseSessionDialog`: `scrim`, `radius-lg`, `shadow-modal`, 20px padding.

| | Pay | Waive |
|---|---|---|
| Title (`modal-title`) | `Mark RM 14.50 paid?` | `Waive RM 6.25?` |
| Body | "Chloe has paid these charges. You can't undo this." | "Chloe won't be asked to pay these. You can't undo this." |
| Confirm button | **Mark paid** (`sage`) | **Waive** (`clay`) |

- A breakdown list (`border-subtle` box, `radius-md`): a session group header (`D Mon` and the session title, uppercase 12px `muted` on `surface`), then one line per court share or per match ("Match 1 · 2 shuttles RM 4.50"), then **Total**.
- For Pay all and Pay session: one line per session (e.g. "Weekly Smash · 29 Sep: RM 17.50") and the total.
- A caption under the list: `Still owed afterwards: RM 9.25` (or "Nothing left to pay" when it reaches 0).
- **Cancel** (secondary) on the left, confirm on the right. While the write runs, show a spinner in the confirm button and disable both.
- **After success**: close the dialog, leave selection mode, refetch, and show a toast "Paid RM 14.50" / "Waived RM 6.25" (`ink` pill, `surface` text, check icon, `accessibilityLiveRegion="polite"`, auto-hides after 3s).
- **On failure**: keep the dialog open and show an inline error above the buttons: "Couldn't save the payment. Try again." Picks are kept.

### 6. Player options sheet (`⋯`)
The same `ActionSheet` pattern as Session options: grabber, `modal-title` "Player options", a close `x` (44pt), menu-card rows, and a secondary **Cancel**.

- **Delete player** row: a 36px `error-tint` tile with a `error` trash icon, title "Delete player", and a chevron.
  - While the player owes anything: disabled. A `disabled` tile with a `muted` icon, a `muted` title, the sub-line "Settle or waive RM 23.75 first", no chevron, and `accessibilityState={{ disabled: true }}`.
  - When nothing is owed: the title in `error`, with the sub-line "Moves Chloe to Recently deleted". Tapping closes the sheet and opens the existing `DeletePlayerDialog`.
- The sheet leaves room for future rows (rename player, and so on).

## States

| State | What shows |
|---|---|
| Loading | A skeleton: the avatar circle, two text bars, a balance card block and three session card blocks in `neutral-tint`. Don't use a spinner. |
| Never played | Identity row with "No sessions yet", the balance card in its All settled form with `RM 0` and no caption, then an `EmptyState` (clay feather): "No sessions yet" / "Chloe's sessions and charges appear here once they play a match." |
| Only open sessions | Balance card All settled `RM 0`, with the open-session caption. The open sessions are listed. |
| Long names / large Dynamic Type | The name wraps (no truncation). The session badge moves under the title when the row can't fit. Balance actions stack to one column. Charge amounts never wrap. |
| Deleted player (`status = 'deleted'`) | Out of scope. Deleted players are reached from Recently deleted, which has its own screen. |

## Components

**Reuse**
- `Avatar`, `StatusBadge` (`owes`, `estimate`, `settled`, plus the new `waived` variant), `EmptyState`, `ActionSheet`, `BottomActionBar`, `ShuttleGlyph`, `DeletePlayerDialog`
- the team-pairing logic from `MatchCard`, and `formatRM` (`services/money-display.ts`)
- `formatSessionTitle` (`services/session.ts`) and `previewSessionCharges` for open sessions

**Retire on this screen**: `PageHeader`, `ListRow`, `PaymentConfirmationDialog` (replaced by the dialog below), and the Gluestack `Checkbox`.

**New**
- `components/player/BalanceCard.tsx`: `{ owed, paid, waived, sessionsOwing, closedSessions, openEstimate?, onPayAll, onPayIndividually, onWaive }`
- `components/player/SessionChargesCard.tsx`: `{ session, expanded, onToggle, mode: 'view' | 'pay' | 'waive', selected: Set<ChargeKey>, onToggleCharge, onToggleSession, onPaySession }`
- `components/player/ChargeRow.tsx`: `{ kind: 'court' | 'shuttle', title, sub, amount, state: 'owed' | 'paid' | 'waived' | 'estimate', date?, mode, checked, onToggle }`
- `components/shared/SelectBox.tsx`: a tri-state checkbox in `sage` or `clay`, with a 44pt hit area and `accessibilityRole="checkbox"`, plus `accessibilityState={{ checked: true | false | 'mixed', disabled }}`
- `components/player/SettleChargesDialog.tsx`: `{ mode: 'pay' | 'waive', groups, total, remaining, onConfirm, onClose }`
- `components/player/PlayerOptionsSheet.tsx`: `{ owed, playerName, onDelete }`
- `components/shared/Toast.tsx` if no toast exists yet. Session delete already shows a "Session deleted" toast, so reuse that one.

`ChargeKey` = `court:{sessionId}` or `shuttle:{shuttleInstanceId}`.

## Data the screen needs (for the PRD)

The design needs more than `fetchShuttlePaymentsByPlayerSessions` returns today. The PRD should define one reader, e.g. `fetchPlayerLedger(playerId)`, that returns:
- the player, plus counts: sessions joined (any status) and matches played
- every session the player joined, each with: status, date, title, match list (match number, teams by position), court share (amount, total court cost, players in session, paid/waived date), and charges per paid shuttle instance (type name, unit price, number of players sharing, first match it appeared in, reused flag, owed/paid/waived and date)
- totals: owed, paid to date, waived to date
- for open sessions, the player's estimate from `previewSessionCharges`

Writers needed: pay all (exists in effect: `paySessionInFull` per session), pay session (`paySessionInFull`), pay charges by key (extend `payShuttleInstancesByIds` to take court keys), and **waive** charges by key (new).

## Accessibility

- All touch targets are ≥44pt: the ⋯, checkboxes (hit area), session headers (64px), buttons and Cancel/Select all.
- Checkboxes announce role, label ("Yonex AS-30, match 1, RM 2.25") and checked/mixed state. The session checkbox's label is "Weekly Smash, all charges".
- Status is always a word: Owes, Settled, Waived, Paid, ≈ estimate. Colour is never the only signal. Pay vs Waive mode is named in the title, the helper line and the button.
- Small clay text uses `clay-strong`. `muted` text stays on white cards.
- The toast is a polite live region and doesn't take focus. The dialog traps focus and returns it to the triggering button.
- In selection mode, VoiceOver order is: Cancel, Select all, the title, sessions in order, then the bottom bar.
- Reduced motion turns off the chevron rotation and expand animation. Content just appears.

## Acceptance criteria

- [ ] The header shows the avatar, name and "N sessions · M matches", with ⋯ on the right. There's no Delete button in the header.
- [ ] The balance card shows the total owed across closed sessions, the paid/owed legend, and the open-session caption when the player is in an open session.
- [ ] Pay all is the only filled primary button on the screen. Pay individually and Waive are secondary.
- [ ] Every session the player joined is listed, in the order: owing, open, settled/waived. Each has the right badge.
- [ ] Owing sessions show a Pay session · RM X button while collapsed.
- [ ] Expanding a session shows the court share and each match (with teams) and its shuttle charges, with how each share was worked out. Paid and waived charges show their date.
- [ ] A reused shuttle appears once, under its first match, marked "reused".
- [ ] Pay individually and Waive enter selection mode, which shows only owing sessions, expanded, with checkboxes on court and shuttle charges and a tri-state session checkbox.
- [ ] The bottom bar shows the count and total picked, and is disabled with nothing picked.
- [ ] Every pay and waive action opens a confirmation listing the grouped charges, the total and what's left. Confirming writes, shows a toast and leaves selection mode.
- [ ] Cancel leaves selection mode without changes.
- [ ] ⋯ opens Player options. Delete player is disabled with "Settle or waive RM X first" while anything is owed, and opens `DeletePlayerDialog` otherwise.
- [ ] All settled shows RM 0, the Settled badge and the paid/waived history, with no action buttons.
- [ ] All money is shown with `formatRM`. No `$` remains on this screen.
- [ ] Loading, no-sessions and large-text states behave as described above.

## Open questions

1. **Waive storage** (deferred to the backend ticket). A waived charge must stay distinguishable from a paid one, for example a `waived_date` column on `shuttle_payments` and `court_payments`, or a `status` of `owed | paid | waived`. Until then the waived states in this spec can't be built.
2. **Who waived and why**: should a waiver take an optional note ("Birthday", "Coach")? Not designed. It would be an optional text field in the Waive confirmation.
3. **Session detail totals**: does a waived share count as "settled" in session detail's "N of M players settled" and in the still-owed amount? The recommendation is yes for settled, and the amount is excluded from both paid and owed and shown as "waived RM X" in that legend.
4. **Partial payment**: paying part of a single charge (e.g. RM 5 of RM 10) is not supported. Charges are paid or waived whole.
5. **Undo**: both actions are final, matching today's payments. An "Undo" in the toast would be friendlier, but it needs a reversible writer.

## Proposed design-system changes (for `design.md`'s decision log)

| Decision | Why |
|---|---|
| Player detail leads with a balance card holding Pay all (`sage`, the one primary), Pay individually and Waive (secondary) | Money first, and one obvious way to clear it, as on session detail |
| Sessions are collapsible cards. Collapsed owing cards offer "Pay session" (sage outline) before showing detail | Most payments are per session, and detail is there to check against |
| Pay individually and Waive share one selection mode, coloured `sage` for paying and `clay` for waiving, with a fixed bottom bar | One interaction to learn, and the colour plus wording keep the two apart |
| Waive uses `clay`, not a destructive red | It forgives money but deletes nothing. Red stays for Delete |
| Delete player moves into a ⋯ Player options sheet, disabled with a reason while the player owes | Matches the session detail ⋯ pattern and keeps destructive actions away from money actions |
| New `StatusBadge` variant `waived` (`muted` on `neutral-tint`) and a tri-state `SelectBox` | Waived needs its own word-state, and a group select needs a mixed state |
