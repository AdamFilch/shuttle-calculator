# Design spec: Home

**Screen**: `app/(tabs)/index.tsx` (the Home tab, the first screen after launch)
**Status**: Spec written 2026-10-08. Not built. Feeds a backend / frontend PRD pair.
**Mockup**: https://claude.ai/artifact/6VdzQQDJddjiyJTCcahsb3 (direction A, approved: between sessions, session in progress, empty first launch, partly set up; plus the brainstorm and the directions not chosen, B Dashboard and C Feed)
**Source of truth**: the "Shuttle Calculator" design system (see `.claude/context/design.md`). Colours, type, radius and spacing below are its tokens.
**Method**: UX rules come from the ui-ux-pro-max skill: one primary CTA per state, primary action reachable in one tap from launch, sections that only appear when they have something to say, status in words as well as colour, tabular figures for money, 44pt touch targets, a helpful empty state instead of empty widgets. Its palette and fonts were not used; the design system overrides them.

## 1. Problem and goal

Home today leads with a large "Total outstanding" figure, then two shuttle stat cards, the 2 newest sessions and a shuttle-usage line chart (`features.md` §12). Two problems:

- **The big number repeats** what Player detail and Session detail already lead with, and on its own it is not something the manager can act on.
- **Home has no next step.** There is no way to start a session or record a match from Home (a known gap in §12), and the chart is analysis the manager does not need when they open the app.

**Goal**: make Home answer "what do I do next" first, then give a quick read on the club, then show who to chase and the latest sessions. No section uses a single huge number.

## 2. User and situation

- **Who**: the club manager, the only user.
- **At the court**: phone in one hand, between games. They open the app to record the next match. Home must put New match one tap away.
- **Between sessions**: at home or on the way. They open the app to start the next session, check whether shuttles will last, and see who still owes.
- **What matters most**: starting or continuing the session (priority 2, fast entry), then anything about to go wrong (stock), then money (priority 3, clarity).
- **Constraints**: light theme only; Home is a tab, so no fixed bottom action bar above the tab bar; money in RM via `formatRM`; nothing is charged while a session is open, so open-session money is always an estimate (`≈`).

**Alternatives rejected** (both in the mockup): **B Dashboard**, where tiles and a chart lead and Start session shrinks to a header button. It is good for review but weak at the court. **C Feed**, a dated activity timeline. It spreads debt across days, so it is poor for chasing money, and it needs the largest new query.

## 3. Flow

Entry: launch, or tapping the Home tab. Data reloads on focus (`useFocusEffect`), as today.

| From Home | Goes to | Back |
|---|---|---|
| Start session | `AddSessionModal` (existing). On save Home refetches and shows the open-session card | Modal Cancel |
| Open session | `/session/[sessionId]` | Stack back to Home |
| New match | `/session/[sessionId]/create-match` | Stack back to Home |
| Low-stock alert | Shuttles tab | Tab bar |
| Owing player row | `/player/[playerId]` | Stack back to Home |
| Waiting on payment "See all" | Players tab | Tab bar |
| Recent session row | `/session/[sessionId]` | Stack back to Home |
| Recent sessions "See all" | Sessions tab | Tab bar |
| Setup step 1 / 2 / 3 | `AddPlayerModal` / `AddShuttleModal` / `AddSessionModal` | Modal Cancel |

The 30-day tiles are not tappable and link nowhere.

## 4. Screens

### 4a. Default: between sessions (no session open)

```
 Thursday 8 Oct                      <- caption, muted
 Home                                <- screen-title
┌─────────────────────────────────┐
│ No session open                 │  session card
│ Last one: Tuesday Smash, 2 days │
│ [ +  Start session            ] │  primary, full width, 48pt
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ /!\ Yonex AS-50 running low   > │  low-stock alert (only when low)
│     5 left · about 1 session    │
└─────────────────────────────────┘
 LAST 30 DAYS   Today and the 29 days before
┌──────────────┐┌──────────────┐
│ Sessions     ││ Shuttles used│
│ 4            ││ 37           │
│ 42 matches   ││ 9 a session  │
└──────────────┘└──────────────┘
┌──────────────┐┌──────────────┐
│ Players      ││ Charged      │
│ 9            ││ RM 396       │
│ 7 a session  ││ RM 79 still  │
└──────────────┘└──────────────┘
 WAITING ON PAYMENT          See all
┌─────────────────────────────────┐
│ (CH) Chloe          [RM 30.50]  │  oldest unpaid first
│      2 sessions · since 2 Oct   │
│ (DA) Daniel         [RM 13]     │
│      Since 6 Oct                │
│ (BE) Ben            [RM 13]     │
│ ─────────────────────────────── │
│ 5 players owe            RM 79  │  footer line
└─────────────────────────────────┘
 RECENT SESSIONS             See all
┌─────────────────────────────────┐
│ Tuesday Smash   [RM 61.50 due]  │
│ 6 Oct · 8 players · 11 matches · RM 104
│ Friday Doubles  [RM 17.50 due]  │
│ Tuesday Smash   [Settled]       │
└─────────────────────────────────┘
```

**Header**: `PageHeader` with title "Home" and the date as a muted line above or below it ("Thursday 8 Oct"). No header action, because Start session lives in the card.

**Session card, no-session state**
- Title "No session open" (`text-card-title`, `font-semibold`, `ink`, 18/24 in the mockup; use `card-title` if 18 is not a token).
- Sub "Last one: {name or date}, {relative day}" (`caption` or `body`, `muted`). Relative day uses "today", "yesterday", "N days ago" up to 13 days, then the date ("29 Sep"). Hidden when there are no sessions.
- Button "Start session": full width, `primary`, plus icon, 48pt tall. It is the one primary action in this state.
- **Still-open variant**: if the only open session is from an earlier day, the card shows the open-session layout (4b) with its date in the meta ("Started Fri 2 Oct") and the caption "Still open. Close it to settle what everyone owes." The buttons stay the same.
- If several sessions are open (the app allows it), show the newest and add a line "+1 more open session" that goes to the Sessions tab.

**Low-stock alert**
- Shown once per low shuttle type, max 2 alerts, lowest runway first. A third or more collapse to "3 shuttle types running low".
- A type is **low** when its runway is 2 sessions or fewer. With no usage history, it falls back to today's Shuttles-tab rule (2 or fewer left).
- Copy: title "{Type} running low"; sub "{n} left · about {k} session(s)". Use "less than 1 session" when k < 1, and "{n} left" alone with no history. At 0 left the title is "{Type} is out of stock" with sub "Buy again on the Shuttles tab".
- Visual: `clay-tint` background, `clay-strong` text, a warning-triangle icon in a `surface-raised` 36pt square, and a chevron. The whole row is one button.

**Last 30 days tiles**
- Section label "Last 30 days" with a muted right-side note "Today and the 29 days before". No link.
- Window: rolling, from the start of the day 29 days ago through today, by session `date`.
- 2×2 `StatTile`s with no `onPress`:
  - Sessions: value = sessions in window; sub "{matches} matches".
  - Shuttles used: value = shuttle instances with a type (paid) in window, clay feather icon; sub "{avg} a session", rounded to a whole number.
  - Players: value = distinct players in window; sub "{avg} a session".
  - Charged: value = `formatRM` of the sum of `amount_due` of closed sessions in window; sub "RM {x} still due" (still owed on those sessions), or "All paid" when 0.
- Open sessions count toward Sessions, matches, shuttles and players, but not toward Charged, because nothing is charged until close.
- The whole section is hidden while a session is open (4b), and when the window has no sessions.

**Waiting on payment**
- Hidden when nobody owes.
- `PlayerRow`s for the top 3 owing active players, **sorted by oldest unpaid charge first**, then by amount owed descending.
- Sub-line: "{n} sessions · since {d Mon}" when owing from more than one session, else "Since {d Mon}". "since" is the `date_created` of the player's oldest unpaid charge (the close date).
- Right badge: `StatusBadge variant="owes" format="amount"` ("RM 30.50").
- Footer row inside the card: "{N} player(s) owe" on the left, `formatRM(total)` on the right, `ink` `font-semibold`. This is the only total, at body size.
- "See all" (link style, `primary`) opens the Players tab.

**Recent sessions**
- Up to 3 newest closed or open sessions (the open one in the session card is excluded so it doesn't appear twice). Hidden when there are none.
- One card containing compact `SessionCard` rows (see Components): title = name or date; meta "{d Mon} · {n} players · {m} matches · RM {total}"; badge "RM {x} due", "Settled" or "Open session".
- Total: `amount_due` for closed sessions. For an open session not in the card (when several are open) use the `previewSessionCharges` total with "≈".
- "See all" opens the Sessions tab.

### 4b. Session in progress today

```
┌─────────────────────────────────┐
│ Thursday Doubles  [Open session]│
│ Started 7:30 pm · Community Ctr │
│ 6 players 4 matches 5 shuttles  │
│ [≈ RM 38 so far]                │
│ [ Open session ][ +  New match ]│  secondary | primary, 48pt
└─────────────────────────────────┘
 /!\ Yonex AS-50: 1 left  >          (if low)
 WAITING ON PAYMENT ...              (as 4a; tags owers playing tonight)
 RECENT SESSIONS ...                 (as 4a, max 2)
```

- Card title = session name (or date), `StatusBadge variant="open"` at top right; meta "Started {time} · {location}", leaving out missing parts.
- Facts line: players, matches and shuttles (`ink` numbers, `muted` labels), then `StatusBadge variant="estimate"` with the `previewSessionCharges` total. With 0 matches the estimate badge is hidden and the line reads "No matches yet".
- Buttons: "Open session" (secondary, outline) and "New match" (primary, plus icon), ratio 1 : 1.35 as in the session-detail bottom bar. New match is the screen's one primary action.
- Low-stock alert sub-copy during a session: "{n} left" plus, if another type has stock, "{Other} has {m}".
- Waiting on payment: an ower who has played in the open session gets "Playing tonight · " at the start of their sub-line, so the manager can collect in person.
- Last 30 days: hidden.

### 4c. Empty: first launch

Shown while there are **no sessions** (closed or open). Replaces sections 4a/4b entirely.

```
 Thursday 8 Oct
 Welcome
 Three steps to your first session. Shuttle Calculator
 splits courts across everyone who played, and each
 shuttle only across the players who used it.
┌─────────────────────────────────┐
│ (1) Add your players          > │  next step: filled primary circle
│     Everyone who plays at your club
│ (2) Add the shuttles you buy  > │
│     Name, tube price and how many in a tube
│ (3) Start your first session  > │
│     Book courts and record matches as you play
└─────────────────────────────────┘
 Once you've played, this page shows your open session,
 who still owes, low stock and recent sessions.
```

- Title "Welcome" instead of "Home".
- Step done rules: 1 when at least one active player exists; 2 when at least one shuttle type exists. Step 3 is never "done" here, because creating a session leaves this state.
- The next step (the first that isn't done) has a filled `primary` circle with a `surface` number. Later steps have an outlined `border` circle with a `muted` number. A done step shows a `settled` check on `settled-tint` and its sub-line becomes a count ("8 players added", "2 shuttle types added").
- Every step stays tappable, including step 3 before step 2, because free shuttles are a valid way to play.

### 4d. Empty: partly set up

As 4c with step 1 done. When step 2 isn't done, the hint below changes to "You can skip shuttles and use free ones, but they won't be charged to anyone."

## 5. Components

**Reuse**
- `PageHeader` (title, subtitle as the date).
- `StatTile` for the four 30-day tiles (no `onPress`). This also closes the "StatCard on Home is still to be replaced by StatTile" item in `design.md`.
- `PlayerRow` with `subLine` and `badge` for owers; `Avatar` inside it.
- `StatusBadge`: `open`, `estimate`, `owes` (`format="amount"` and `"due"`), `settled`.
- `AddSessionModal`, `AddPlayerModal`, `AddShuttleModal` for the actions.
- Buttons as on session detail (primary and secondary, `rounded-lg`).

**Remove from Home**: the big `StatCard`, the two shuttle `StatCard`s and `InsightsSection`. `StatCard` has no other users after this, so the developer may delete it. `InsightsSection` stays in the codebase for the follow-up move (see 11).

**New: `HomeSessionCard`** (`components/home/HomeSessionCard.tsx`)
- Props: `session: { session_id, name, date, start_time, location, player_count, match_count, shuttle_count } | null`, `estimate?: number`, `lastSession?: { name, date } | null`, `isStale: boolean`, `extraOpenCount?: number`, `onStart`, `onOpen`, `onNewMatch`.
- Variants: `none` (Start session), `open` (today), `stale` (open from an earlier day).
- Surface: `surface-raised`, `border-subtle`, `rounded-xl`, padding 16, gap 12.

**New: `LowStockAlert`** (`components/home/LowStockAlert.tsx`)
- Props: `name`, `remaining`, `runwaySessions: number | null`, `otherTypeHint?: string`, `onPress`.
- One `Pressable` row; pressed state darkens to `clay-tint` at 85% opacity.

**New: `SetupChecklist`** (`components/home/SetupChecklist.tsx`)
- Props: `playerCount`, `shuttleTypeCount`, `onAddPlayers`, `onAddShuttles`, `onStartSession`.

**Changed: `SessionCard` gets a `compact` variant**
- New prop `variant?: "card" | "compact"` (default `card`, today's look) and new optional props `matchCount?: number`, `totalAmount?: number`, `isEstimate?: boolean`.
- `compact`: no border or radius of its own (rows sit inside one parent card, divided by `border-subtle` hairlines), padding 10/14, min height 56. Title `card-title` medium; one meta line "{d Mon} · {n} players · {m} matches · RM {total}" (`caption`/`body` `muted`, tabular). Same right-hand badge logic as today. No shuttle line.
- The Sessions tab keeps the `card` variant.

## 6. Visual details

- Screen background `surface`; cards `surface-raised` with `border-subtle`, `rounded-xl` (12).
- Page padding 16; gap between sections 24; gap from section label to content 8; tile gap 8.
- Type: `screen-title` (Home/Welcome), `section-label` (uppercase labels), `card-title` (card and row titles), `body`, `caption` (sub-lines), `badge`. All money and counts use tabular figures.
- Colour roles: `primary` for Start session / New match and links; `clay` / `clay-tint` / `clay-strong` for the stock alert and owed badges; `settled` for settled badges and done steps; `muted` for sub-lines.
- Icons: `MaterialCommunityIcons` as used elsewhere (`feather` for shuttles, `alert-outline`, `plus`, `chevron-right`, `check`).

## 7. States

| State | What shows |
|---|---|
| Loading (first focus) | Section skeletons at final height (session card, 2×2 tiles, 3 rows); no spinners. Later refocus keeps old data until new data arrives |
| No sessions at all | 4c / 4d checklist only |
| Sessions exist, none open | 4a |
| Open session today | 4b |
| Open session from an earlier day | 4b layout with the stale caption |
| Several open sessions | Newest in the card, "+N more open sessions" link |
| Nobody owes | Waiting on payment hidden |
| No low stock | Alert hidden |
| No sessions in the last 30 days | Tiles hidden |
| Error loading a section | That section shows "Couldn't load. Pull to refresh." in `muted`; other sections still render. Home supports pull to refresh |
| Long content | Session names and player names wrap to 2 lines, then end with an ellipsis; badges never wrap; amounts up to "RM 1,234.50" fit the badge |
| Destructive or money-changing actions | None on Home. Payments happen on player detail |

## 8. Accessibility

- All buttons and rows are at least 44pt (buttons 48pt); 8pt between targets.
- Session card: `accessibilityLabel` "Thursday Doubles, open session, 6 players, 4 matches, 5 shuttles, about RM 38 so far". Buttons are labelled by their text.
- Low-stock alert: role button, label "Yonex AS-50 running low, 5 left, about 1 session. Opens Shuttles."
- Owers: `PlayerRow` label "Chloe owes RM 30.50 since 2 October, 2 sessions". Footer: "5 players owe RM 79 in total".
- Tiles: `StatTile` default label (label, value, sub-line); not focusable as buttons.
- Setup steps: role button, label "Step 1 of 3, Add your players, done" or "not done".
- Status is never colour-only: badges carry words or amounts, and done steps carry a check and a count.
- Dynamic Type: tiles keep 2 columns down to `fontScale` 1.3 (StatTile's min width), then stack; button rows stack vertically above `fontScale` 1.5.
- Contrast: `clay-strong` on `clay-tint` and `muted` on `surface-raised` meet 4.5:1 (design-system pairs).

## 9. Data each block needs

| Block | Source | Status |
|---|---|---|
| Session card | `fetchAllSessions` (status `open`, newest; last closed for "Last one") + `previewSessionCharges(id).total` | Exists |
| Low-stock alert | `fetchAllShuttlesWithInventory` (`remaining`) + **runway** | **New query** |
| Last 30 days | **30-day summary** | **New query** |
| Waiting on payment | `fetchAllPlayerPayments` (owed per player, oldest unpaid `date_created`, sessions owed) or **top owers** | Exists, optional new query |
| "Playing tonight" tag | Players in the open session (`fetchSessionById(id).matches[].players`) | Exists |
| Recent sessions | `fetchAllSessions` (`player_count`, `match_count`, `amount_due`, `outstanding_amount`) | Exists |
| Setup checklist | `fetchAllPlayers().length`, `fetchAllShuttles().length`, `fetchAllSessions().length` | Exists |

**New query: shuttle runway** (`services/shuttle.ts`)
- `fetchShuttleRunway(): Promise<{ shuttle_id, name, remaining, avg_per_session: number | null, runway_sessions: number | null }[]>`
- `avg_per_session` = paid instances of that type ÷ sessions, over the last 5 sessions (closed or open) that used that type. Null with no history.
- `runway_sessions` = `remaining / avg_per_session`, rounded down to a whole number (0 means less than one session).

**New query: rolling 30-day summary** (`services/session.ts`)
- `fetchActivitySummary(from: string, to: string): Promise<{ sessions, matches, players, shuttles_used, charged, still_due }>`
- Home calls it with today minus 29 days at 00:00 through today at 23:59, local time (the same convention as session `date`).
- `players` = distinct `match_players.player_id`; `shuttles_used` = `shuttle_instances` with `shuttle_id IS NOT NULL`; `charged` = sum of `amount_due` of closed sessions in the window; `still_due` = owed on those sessions (as `outstanding_amount`).

**Optional new query: top owers** (`services/player.ts`)
- `fetchTopOwers(limit = 3): Promise<{ owers: { player_id, name, avatar_colour, owed, oldest_unpaid_date, sessions_owed }[], total_owed, owing_count }>`
- Sorted by `oldest_unpaid_date` ascending, then `owed` descending; active players only; an owed amount below RM 0.01 counts as nothing.
- Without it, the UI derives the same from `fetchAllPlayerPayments`, but that loads every charge row for every player.

## 10. Acceptance criteria

- [ ] Home no longer shows "Total outstanding", the two shuttle StatCards or the usage chart.
- [ ] Section order with no open session: session card, low-stock alert (if any), Last 30 days, Waiting on payment, Recent sessions.
- [ ] With no open session the card shows "No session open", the last session's name and relative day, and a full-width Start session button that opens `AddSessionModal`. After saving, Home shows the open-session card without leaving the tab.
- [ ] With a session open today the card shows its name, start time and location, players / matches / shuttles, the "≈ RM X so far" estimate (equal to session detail's estimate), and Open session + New match buttons that go to session detail and create-match.
- [ ] An open session from an earlier day shows the stale caption.
- [ ] During an open session the Last 30 days tiles are hidden.
- [ ] A low-stock alert appears for each type whose runway is 2 sessions or fewer (or 2 or fewer left with no history), max 2, and opens the Shuttles tab. None appears when stock is fine.
- [ ] Last 30 days covers today and the 29 days before; tiles show sessions (+ matches), shuttles used (+ per session), players (+ per session), charged (+ still due). Charged excludes open sessions. No link on the section.
- [ ] Waiting on payment lists at most 3 owing players, oldest unpaid charge first, with "since {date}" and the owed amount, plus a footer "{N} players owe RM X"; rows open the player; See all opens Players. Hidden when nobody owes.
- [ ] Owers who played in the open session show "Playing tonight".
- [ ] Recent sessions shows up to 3 sessions with date, player count, match count and total in RM, plus a due / settled / open badge, using the compact SessionCard. Rows open the session; See all opens Sessions.
- [ ] With no sessions, Home shows the Welcome checklist; steps mark done from real counts and open the matching add modal.
- [ ] Every amount uses `formatRM` (no `$`).
- [ ] Touch targets ≥ 44pt; screen-reader labels as in section 8; checked at the largest Dynamic Type size on the iOS Simulator.
- [ ] Verified with `npm run db:fresh` (default seed: an open session today, low stock if seeded) and `npm run db:fresh -- empty`. A seed scenario with a low-stock type and no open session may be needed.

## 11. Out of scope (follow-up work)

- **Insights live where their data lives; there is no separate Insights page.** Moving the shuttle-usage chart (`InsightsSection`, which shuttles were used on which days) to the **Shuttles tab** is a separate ticket. So are other insights on the screens that own their data, such as attendance and spend on Sessions, per-player activity on Players / player detail, and collection rate with the money it describes. The hidden `app/(tabs)/insights/` route can then be removed.
- Recent payments or an activity feed (direction C).
- Purchase cost tracking (needed for real inventory spend).

## 12. Open questions

Answered in PRD [7] (2026-10-08):
1. After Start session saves, Home goes straight to the new session's detail page (D2).
2. The low-stock threshold becomes a per-shuttle "Warn at: N [Shuttle / Session]" setting in the shuttle detail pop-up, which is a future feature. Until then the alert is built but never shown (D3, D4).
3. A stale open session is flagged on Home and with a "Still open since {d Mon}" badge on the Sessions tab (D5, D6).

## 13. Proposed design-system changes (for `.claude/context/design.md`'s decision log, pending the product owner)

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | Home has no headline number. Order: session card (Start session, or Open session + New match), low-stock alert, Last 30 days tiles, Waiting on payment, Recent sessions | Player and session detail already lead with a big number; Home's job is the next action. Product owner approved direction A with the tiles moved above Waiting on payment |
| 2026-10-08 | Waiting on payment sorts by oldest unpaid charge first | Stale debt is what slips; the age is the reason to chase |
| 2026-10-08 | Home's activity tiles use a rolling 30 days (today and the 29 days before), not the calendar month | A calendar month is nearly empty early in the month |
| 2026-10-08 | Insights sit on the screen that owns their data (shuttle usage on the Shuttles tab); no separate Insights page. The chart leaves Home | Product owner decision; analysis belongs next to the thing it describes |
| 2026-10-08 | Home sections hide when they have nothing to say; first launch shows a 3-step setup checklist instead of empty widgets | Keeps Home short and actionable; empty dashboards teach nothing |
| 2026-10-08 | `SessionCard` gains a `compact` row variant; new `HomeSessionCard`, `LowStockAlert`, `SetupChecklist`; `StatCard` retired in favour of `StatTile` | Reuse across Home; closes the StatCard → StatTile item |
