# Design spec: Shuttles

**Screen**: `app/(tabs)/shuttles/index.tsx` (the Shuttles tab), its Add shuttle dialog (`components/shuttle/modal.tsx`) and shuttle detail dialog (`components/shuttle/editShuttleModal.tsx`); plus the Shuttles tab icon dot (`app/(tabs)/_layout.tsx`) and Home's low-stock alert (`app/(tabs)/index.tsx`).
**Status**: Spec written 2026-10-08. Not built. Feeds the PRD [8] backend / frontend pair.
**Mockup**: https://claude.ai/artifact/SpNQs6c9XTShD7LpsTSPGt (approved: stocked, one low + one out with the tab dot, no usage history, empty tab, Add shuttle filled, Add shuttle duplicate name, detail with Warn at in shuttles, detail with Warn at in sessions; source `.claude/design/mockups/shuttles.html`)
**Source of truth**: the "Shuttle Calculator" design system (see `.claude/context/design.md`). Colours, type, radius and spacing below are its tokens.
**Method**: UX rules from the ui-ux-pro-max skill: status in words as well as colour, the most urgent item first, one primary action per state, visible labels on every field, numeric keyboards for numbers, 44pt touch targets, tabular figures, a helpful empty state instead of zeros. Its palette and fonts were not used; the design system overrides them.

## 1. Problem and goal

Today the Shuttles tab is a 2-column grid of square cards (name, `$` price per shuttle, "N Remaining"), coloured warning at 2 left and error at 1 or fewer (`features.md` §8). The manager can't tell from it whether stock will last the next session, the thresholds are fixed and tiny, and the grid order (by creation) hides the type that is about to run out. The usage chart left Home in PRD [7] and is shown nowhere (§12, §13). Home's low-stock alert is built but never shown because there is no threshold to trigger it (PRD [7] D3, D4).

**Goal**: the tab answers one question before the next session: *do I need to buy shuttles, and which type?* In order: how many are left, how long they will last, restock in two taps. The usage chart moves here. A per-type "Warn at" setting drives the low state on this tab, the tab-icon dot and Home's alert, all from one query.

## 2. User and situation

- **Who**: the club manager, the only user.
- **Where / when**: mostly between sessions (at home, or at the shop deciding what to buy), occasionally at the court when a tube runs out. One hand, a quick glance.
- **Job**: decide whether to buy, which type and roughly how many; record the purchase; set when each type should warn.
- **What matters most**: the type that runs out first, stated in words ("~1 session", "Out of stock"); then the club's usage rate; then the history chart.
- **Constraints**: light theme only; money in RM via `formatRM`; correct money first, so the Add form shows the per-shuttle price players will be charged before saving; no schema migrations, so new columns need a database reset; insights live on the screen that owns their data (decision 2026-10-08).

**Alternative rejected**: keeping the card grid with coloured cards. A grid has no reading order, so "which runs out first" needs scanning; a sorted list puts it at the top.

## 3. Flow

| Entry | Goes to | Back |
|---|---|---|
| Shuttles tab | Shuttles screen | Tab bar |
| Home low-stock alert | Shuttles tab (`router.navigate("/shuttles")`, as today) | Tab bar |
| Shuttles tab icon dot | Shuttles tab | Tab bar |
| Header "Add shuttle" / empty state "Add your first shuttle" | Add shuttle dialog | Cancel, ✕, backdrop; Add shuttle saves and closes |
| Tap a stock row | Shuttle detail dialog | Cancel, ✕, backdrop; Save saves name, price, Warn at and closes; Add to stock records a purchase (as today) |

Data reloads on focus and after either dialog closes (as today).

## 4. Screens

### 4a. Default: stocked (mockup state 1)

```
┌──────────────────────────────────────┐
│ Shuttles                [+ Add shuttle]│  PageHeader, primary action
│ ┌─────────────────┐┌─────────────────┐│
│ │ Shuttles left   ││ ✒ Avg per session││  2 StatTiles, not tappable
│ │ 46              ││ 9.3             ││
│ │ Across 3 types  ││ Last 8 sessions ││
│ └─────────────────┘└─────────────────┘│
│ STOCK                                 │  section-label
│ ┌───────────────────────────────────┐ │
│ │ RSL Classic   22 left · ~4 sessions›│ │  ShuttleStockRow
│ │ ███████████████░░░░░░░░░░          │ │  meter
│ ├───────────────────────────────────┤ │
│ │ Victor Gold    6 left · ~4 sessions›│ │
│ │ ██████████████░░░░░░░░░░           │ │
│ ├───────────────────────────────────┤ │
│ │ Yonex AS-50   18 left · ~6 sessions›│ │
│ │ ██████████████████░░░░░            │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ SHUTTLES PER SESSION     Paid only │ │  ShuttlesPerSessionChart
│ │  ▆  ▇  █  ▇  █  ▆  █  [▇]9        │ │
│ │ 11 Aug                     6 Oct   │ │
│ └───────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Tiles**
- *Shuttles left*: sum of `remaining` across types (a negative remaining counts as 0). Sub-line "Across {n} types" ("1 type" for one). When any type is out or low, the sub-line becomes "{a} out · {b} low" (omit a zero part: "1 low", "2 out") in `clay-strong`, weight medium.
- *Avg per session*: clay feather icon. Club average of paid shuttles per session over the averaging window (see §7 Rules), 1 decimal ("9.3"). Sub-line "Last {N} sessions" where N is the number of sessions in the window (up to 8; "Last session" for 1).

**Stock list** (section label "Stock")
- One card with hairline dividers, one row per type.
- Row: name (left, `card-title`, medium, truncates to one line) and status text (right, `body` medium, tabular). Below, a 6pt meter. Chevron at the right. Whole row is one button, min height 56pt.
- Status text: "{n} left · ~{k} session(s)" when a runway exists; "{n} left" when it doesn't; "Out of stock" at 0 or below.
- Runway `k` = floor(remaining ÷ this type's average per session). Rounded down to stay on the safe side. When remaining > 0 but k = 0, show "<1 session" (Home says "less than 1 session"), never "~0 sessions".
- Meter fill = remaining ÷ (remaining + paid shuttles of this type used since its latest purchase). Full right after a restock, empties as shuttles are used. Clamp 0–100%.
- Sort: out first, then low, then ok. Within each group by runway ascending; types with no runway after those with one; ties by name A–Z.

**Chart** (section card)
- Header: section label "Shuttles per session", right note "Paid only" (`caption`, `muted`).
- One bar per session in the averaging window, oldest left, up to 8. Bars `clay-tint`, latest bar `clay` with its value above it (`ink`, semibold). Baseline hairline `border-subtle`. Date labels under the first and last bar only ("11 Aug", "6 Oct", `d MMM`). Bar height scales to the window's max. No axis numbers, no interaction.
- Bars are plain `View`s; no chart library.

### 4b. One low, one out (mockup state 2)

```
│ Shuttles left 11   │ Avg per session 9.3│
│ 1 out · 1 low      │ Last 8 sessions    │   sub-line clay-strong
│ STOCK                                   │
│ Yonex AS-50              Out of stock  ›│   error text
│ (empty meter)                           │
│ Buy again to restock                    │   note, error
│ RSL Classic        5 left · ~1 session ›│   clay-strong text
│ ██░░░░░░░░░░░░ (clay)                   │
│ Low · warns at 10 shuttles              │   note, clay-strong
│ Victor Gold        6 left · ~4 sessions›│
```

- **Out** (remaining ≤ 0): status "Out of stock", note "Buy again to restock", both in Gluestack `error` (the red Create match already uses for out-of-stock rows; decision 2026-10-06). Meter empty.
- **Low**: status and note in `clay-strong`, meter fill `clay`. Note "Low · warns at {N} shuttles" or "Low · warns at {N} sessions".
- **OK**: status `ink`, meter fill `primary`, no note.
- A type with no Warn at is never low; it only shows as out at 0.
- **Tab dot**: while any type is out or low, an 8pt `clay` dot with a 2pt `surface-raised` ring sits at the top-right of the Shuttles tab icon, on every tab. Screen-reader label "Shuttles, {n} type(s) need restocking".
- **Home alert**: the same out/low types, out first then lowest runway, at most 2 `LowStockAlert` rows (Home already slices to 2). This replaces home.md's interim rule ("runway 2 sessions or fewer, else 2 or fewer left"): Home now follows each type's Warn at.

### 4c. No usage history (mockup state 3)

- No session has used a paid shuttle yet (sessions with only free shuttles don't count).
- Avg tile: value "–", sub-line "After your first session".
- Rows: "{n} left" with no runway; meter full if nothing used since the purchase.
- A type with Warn at in *sessions* can't be checked, so it is not low (it still shows out at 0).
- Chart: replaced inside its card by a dashed box (`border-dashed`, `radius-md`): title "No sessions yet" (medium), line "Bars appear after your first session that uses a paid shuttle." (`caption`, `muted`).
- Same treatment per row for a new type added to a club with history: no runway, sorts after every type with one.

### 4d. Empty tab (mockup state 4)

```
│ Shuttles                               │   no header button
│ ┌ - - - - - - - - - - - - - - - - - ┐  │
│ │        (clay feather)             │  │   EmptyState
│ │       No shuttles yet             │  │
│ │ Add the shuttles you buy to track │  │
│ │ how many are left and split their │  │
│ │ cost fairly.                      │  │
│ └ - - - - - - - - - - - - - - - - - ┘  │
│ [       Add your first shuttle       ] │   full-width primary, 44pt
```

- The header button is hidden so there is one primary action. Tiles and chart are hidden.

### 4e. Add shuttle dialog (mockup state 5, filled and duplicate name)

```
┌ Add shuttle ─────────────────── ✕ ┐
│ Name                               │
│ [Aeroplane Gold                  ] │
│ Shuttles per tube                  │
│ [12                              ] │  number pad
│ Tube price                         │
│ [RM 54                           ] │  decimal pad
│ Tubes bought                       │
│ │ Tubes                 [−] 2 [+] │ │  stepper, 44pt buttons
│ ┌────────────────────────────────┐ │
│ │ RM 4.50 per shuttle · 24 shuttles│ │  live line
│ └────────────────────────────────┘ │
│ [ Cancel ]          [ Add shuttle ] │
└────────────────────────────────────┘
```

- Fields: Name (text), Shuttles per tube (integer ≥ 1, default 12), Tube price (RM, > 0, empty by default), Tubes bought (stepper, default 1, min 1). Every field has a visible label (`caption`, `muted`) above a 44pt input; focused input has a 2pt `primary` border.
- Live line (`surface` background, `body`, `muted` with the numbers in `ink` semibold): "RM {tube price ÷ per tube} per shuttle · {per tube × tubes} shuttles". Until price and per tube are valid it reads "Enter the tube price to see the price per shuttle."
- Saved with the existing `createShuttle`: `total_price` = tube price × tubes, `num_of_shuttles` = per tube × tubes. The first purchase row is created as today.
- **Duplicate name**: compared trimmed and case-insensitive against existing types (same rule as players). Input gets a 2pt `error` border, error line under it with an alert icon: "A shuttle with this name already exists". Below the buttons, a hint (`caption`, `muted`): "To add stock to {existing name}, open it from the list and use Buy again." Add shuttle stays disabled.
- Add shuttle (`primary`) is disabled (`disabled` fill, `muted` text) until name is non-empty and unique, per tube ≥ 1 and price > 0. Cancel is secondary.
- Name is trimmed before saving.

### 4f. Shuttle detail dialog (mockup state 6, Warn at in shuttles and in sessions)

```
┌ RSL Classic ─────────────────── ✕ ┐
│ Name                               │
│ [RSL Classic                     ] │
│ Price per shuttle                  │
│ [RM 4.50                         ] │
│ Warn at (optional)                 │
│ [10     ] [ Shuttles | Sessions ]  │  number + segmented control
│ Shows as low at 10 or fewer left.  │  hint, clay-strong when low
│ Now 5 left, so it's low.           │
│ ────────────────────────────────── │
│ Recent purchases                   │
│ 2 Oct 2026 · +24 shuttles          │
│ 14 Sep 2026 · +12 shuttles         │
│ ────────────────────────────────── │
│ Buy again (shuttles)               │
│ [24        ] [ Add to stock ]      │  outline primary
│ [ Cancel ]               [ Save ]  │
└────────────────────────────────────┘
```

The dialog stays as it is today, titled with the type's name. Changes:
- Price field shows an "RM" prefix; label "Price per shuttle".
- New **Warn at (optional)**: an 84pt-wide number input (integer ≥ 1, number pad) next to a two-option segmented control Shuttles / Sessions (default Shuttles). Saved with Save. Empty means no warning except at 0. Clearing the number clears the setting.
- **Hint** under it, live as the manager types, `caption`:
  - Empty: "Leave empty to warn only when it's out." (`muted`)
  - Shuttles: "Shows as low at {N} or fewer left. Now {r} left." + ", so it's low." when low.
  - Sessions with history: "Shows as low when about {N} session(s) or fewer are left. Now about {k} session(s) (uses ~{avg} a session)." + ", so it's low." when low. `avg` is this type's average, rounded to a whole number.
  - Sessions without history: "No sessions with paid shuttles yet, so this can't warn by sessions until there are."
  - `clay-strong` when the typed value would make the type low; `muted` otherwise.
- Recent purchases: "{d MMM yyyy} · +{n} shuttles" (`body-sm`, `muted`, tabular). "No purchases yet" when none.
- Buy again label "Buy again (shuttles)"; button "Add to stock" (was "Add to Inventory"), outline `primary`.
- Section heading "Recent purchases" (was "Recent Purchases").

## 5. Components

**Reuse**
- `PageHeader` (header action; hidden in the empty state).
- `StatTile` for both tiles. Needs a way to colour the sub-line `clay-strong` (see new prop below).
- `EmptyState` with the clay feather icon, plus a full-width primary button under it in the screen.
- Vendored Gluestack `Modal`, `Input`, `Button` as the two dialogs use today.
- `LowStockAlert` on Home (no change to its props).

**Change**
- `StatTile`: optional `subLineTone?: "muted" | "warn"`; `warn` = `clay-strong`, medium.
- `components/shuttle/modal.tsx` (Add shuttle): new fields and live line per §4e.
- `components/shuttle/editShuttleModal.tsx`: Warn at row, copy per §4f.
- `app/(tabs)/_layout.tsx`: the Shuttles `tabBarIcon` renders the dot and the tab gets the `tabBarAccessibilityLabel` from §4b. Reloads on any tab focus.
- Extract the New / Reuse toggle in `components/session/match/selectShuttleModal.tsx` (lines ~174–190) into a shared **`SegmentedControl`** (`components/shared/SegmentedControl.tsx`): `options: {value, label}[]`, `value`, `onChange`, `accessibilityLabel`. 44pt high, `surface` track with `border-subtle`, selected segment `surface-raised` with a light shadow and `ink` text, others `muted`. Role `radiogroup` / `radio`. Use it in both places.
- Tubes stepper: give the existing `Stepper` a plain-label variant (`label` instead of `shuttle`, `min` defaulting to 0) rather than a second stepper component.

**New**
- `components/shuttle/ShuttleStockRow.tsx`: props `name`, `remaining`, `runwaySessions: number | null`, `meterFraction: number`, `status: "out" | "low" | "ok"`, `warnAt?: {value, unit}`, `onPress`. Renders the row, meter and note per §4a/4b.
- `components/shuttle/ShuttlesPerSessionChart.tsx`: props `points: {date: string, count: number}[]`. Renders bars or the empty box per §4a/4c.

**Remove**
- `components/shuttle/ShuttleCard.tsx` (replaced by `ShuttleStockRow`).
- `components/insights/InsightsSection.tsx`, the day/week/month usage queries and the hidden `app/(tabs)/insights/` route (see §9).

## 6. Visual details

- Screen: `surface` background, 16pt side padding, 16pt between sections, `section-label` for "Stock" and "Shuttles per session".
- Cards: `surface-raised`, 1pt `border-subtle`, `radius-lg` (12).
- Tiles: as `StatTile` today (`badge` label, `modal-title` value, `caption` sub-line).
- Stock row: name `card-title` medium `ink`; status `body` medium tabular; note `caption`; padding 10/14; meter 6pt, full radius, track `neutral-tint`, fill `primary` / `clay` (low) / none (out).
- Out colour: Gluestack `error` (`error-600` text, as Create match). Low colour: `clay-strong` text, `clay` fill.
- Tab dot: 8pt `clay`, 2pt `surface-raised` ring, offset top 8 right 8 inside the 44pt tab target.
- Chart bars: `clay-tint`, latest `clay`, radius 3, value label 11pt semibold `ink`, date labels 10pt medium `muted`.
- Dialogs: as today; inputs 44pt, `radius-md` (8), `border`; focus 2pt `primary`; error 2pt `error`.
- All numbers tabular. Money via `formatRM`.

## 7. States

| State | Behaviour |
|---|---|
| Loading (first) | Skeletons for the two tiles and three rows (`Skeleton`); later loads keep old data |
| Error | Inline "Couldn't load. Pull to refresh." in place of the list, as on Home |
| Empty (no types) | §4d |
| No usage history | §4c |
| Stocked | §4a |
| Low / out | §4b, plus tab dot and Home alert |
| Long names | Name truncates with an ellipsis; status text never wraps |
| Many types | List grows; screen scrolls; chart stays last |
| Add: invalid / duplicate | Add disabled; duplicate shows the field error and Buy again hint |
| Detail: Warn at typed | Hint updates live; nothing changes on the list until Save |

**Rules** (shared by the tab, the tab dot and Home, from one query)
- *Averaging window*: the last 8 sessions that used at least one paid shuttle (a shuttle instance with a type). Fewer than 8 → all of them.
- *Club average* = paid shuttles used in the window ÷ sessions in the window.
- *Type average* = paid shuttles of that type used in the window ÷ sessions in the window. If 0 (type unused in the window), the type has no runway.
- *Runway* = floor(remaining ÷ type average); null with no history or a zero average.
- *Status*: `out` if remaining ≤ 0; else `low` if Warn at is in shuttles and remaining ≤ N, or Warn at is in sessions, runway is not null and runway ≤ N; else `ok`.

## 8. Accessibility

- Stock row: role button, label e.g. "RSL Classic, low, 5 left, about 1 session. Warns at 10 shuttles." / "Yonex AS-50, out of stock. Buy again to restock." / "Victor Gold, 6 left, about 4 sessions."
- Meter is decorative (hidden from screen readers); its meaning is in the label.
- Chart: one accessible element, label "Shuttles per session, last {N} sessions: {counts…}. Latest {n} on {d MMMM}." Empty: "Shuttles per session. No sessions with paid shuttles yet."
- Tab dot: in the tab's accessibility label, never colour alone. Every status is written in words.
- Touch targets ≥ 44pt: rows (56pt), header button, stepper buttons, segmented options, dialog close.
- Inputs have visible labels and matching accessibility labels; the duplicate-name error is announced (`accessibilityLiveRegion="polite"` / announce on iOS).
- Keyboards: Shuttles per tube, Tubes, Warn at and Buy again use `number-pad`; Tube price and Price per shuttle use `decimal-pad`.
- Text scaling: tiles wrap as `StatTile` does; row status may drop below the name at large sizes rather than truncate.
- Contrast: `clay-strong` and `error-600` on `surface-raised` meet 4.5:1 for small text.

## 9. Data for backend PRD [8]

Kept exactly as in the approved mockup.

- **Exists**: `createShuttle` (the dialog does the tube maths), `addShuttlePurchase`, `fetchShuttlePurchaseHistory`, `updateShuttle` for name and price.
- **New query: `fetchShuttleStock()`**. One place that works out stock for both this tab and Home's alert and tab dot. Per type it returns remaining, used since the latest purchase (for the meter), average per session, runway, Warn at and a status of out, low or ok. It also returns totals. Averages count paid shuttles over the last 8 sessions that used at least one paid shuttle.
- **New query: `fetchShuttlesPerSession(8)`**. Session date and paid shuttles used, for the last 8 sessions that used at least one paid shuttle, oldest first.
- **Schema change**: `shuttles.warn_at` and `shuttles.warn_unit` (`'shuttles'` or `'sessions'`), both optional; `updateShuttle` saves them. Needs a database reset. Duplicate-name check on create (ignoring case and spaces at either end).
- **Removed**: `InsightsSection`, the day/week/month usage queries and the hidden `app/(tabs)/insights/` route.

Field-level detail for the contract (suggested, the drill confirms):
- Per type: `shuttle_id`, `name`, `price_per_shuttle`, `remaining`, `used_since_last_purchase`, `avg_per_session: number | null`, `runway_sessions: number | null`, `warn_at: number | null`, `warn_unit: 'shuttles' | 'sessions' | null`, `status: 'out' | 'low' | 'ok'`; already sorted per §4a.
- Totals: `total_remaining`, `type_count`, `out_count`, `low_count`, `club_avg_per_session: number | null`, `window_sessions: number`.
- Home's `lowStock` list = the `out` and `low` types from this query, in order.
- The seed `default` scenario should leave one type low (with a Warn at) so the state is visible after `db:fresh`.

## 10. Acceptance criteria

- [ ] Shuttles tab shows two tiles, the Stock list and the chart, in that order, with the copy in §4a.
- [ ] Rows sort out, then low, then ok; by runway within each; no-runway types last; ties by name.
- [ ] Row status reads "{n} left · ~{k} sessions", "{n} left" (no runway) or "Out of stock"; runway rounds down; "<1 session" when 0 < remaining and k = 0.
- [ ] Meter is full after a purchase and shrinks as shuttles of that type are used.
- [ ] Out rows use `error` text and the "Buy again to restock" note; low rows use `clay-strong` text, `clay` meter and "Low · warns at {N} {unit}".
- [ ] A type with no Warn at is never low; a sessions Warn at with no history is never low.
- [ ] Shuttles left sub-line switches to "{a} out · {b} low" in `clay-strong` when any type is out or low.
- [ ] Avg per session shows one decimal and "Last {N} sessions"; shows "–" / "After your first session" with no history.
- [ ] Chart shows up to 8 bars oldest first, latest bar `clay` with its value, first and last dates; dashed empty box with no history. Free-only sessions are excluded.
- [ ] Empty tab shows the EmptyState and "Add your first shuttle", with no header button, tiles or chart.
- [ ] Add shuttle asks for name, shuttles per tube (default 12), tube price (RM), tubes (stepper, default 1) and shows the live per-shuttle line; saves total and count via `createShuttle`.
- [ ] A duplicate name (trimmed, case-insensitive) shows the field error and Buy again hint and keeps Add disabled.
- [ ] Detail dialog shows RM on price, the Warn at number + Shuttles / Sessions control with the live hint variants in §4f, "Add to stock", and saves Warn at on Save.
- [ ] The Shuttles tab icon shows a clay dot on every tab while any type is out or low, with the accessibility label; it updates after a match or a purchase.
- [ ] Home's low-stock alert shows up to 2 out/low types from the same query, out first then lowest runway.
- [ ] `ShuttleCard`, `InsightsSection`, the unused usage queries and the insights route are removed; lint passes.
- [ ] All touch targets ≥ 44pt; rows and chart have the screen-reader labels in §8.
- [ ] Verified on the iOS Simulator after `npm run db:fresh`.

## 11. Open questions (for the PRD [8] drill)

1. **Do open sessions count in the averaging window?** Recommended: closed sessions only, so tonight's half-played session doesn't drag the average and runway down mid-evening. (Stock `remaining` still counts every instance, as today.)
2. **Duplicate-name check on rename** in the detail dialog too (excluding the type itself)? Recommended yes, same error copy; the mockup only shows it on create.
3. **Tab dot refresh**: re-query on every tab focus and on returning from a stack screen (recommended), or only on app focus? Affects how soon the dot appears after Create match.
4. **Home alert with 3+ types**: home.md collapses a third into "3 shuttle types running low"; the mockup says "at most 2". Recommended: keep 2 rows and drop the collapse line (the tab dot already says how many).
5. **Warn at upper bound**: allow any integer ≥ 1, or cap (e.g. 999 shuttles / 20 sessions)? Recommended: no cap.

## 12. Proposed design-system changes (added to `.claude/context/design.md`'s decision log)

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | Shuttles tab is a stock list sorted by urgency (out, low, then shortest runway) with a runway in sessions and a restock meter, replacing the card grid | The question is "which runs out first"; a sorted list answers it without scanning |
| 2026-10-08 | Low stock is a per-type optional "Warn at N shuttles / sessions"; no Warn at means warn only at 0. One query drives the tab, the tab-icon dot and Home's alert | One rule everywhere; the manager sets what "low" means per type |
| 2026-10-08 | Usage averages and the chart count paid shuttles over the last 8 sessions that used one; runway rounds down | Free shuttles don't deplete stock; rounding down errs on the safe side |
| 2026-10-08 | Low uses `clay`, out uses Gluestack `error`; a `clay` dot on the Shuttles tab icon flags either | Clay is the shuttle colour; red stays for "can't use it" as in Create match |
| 2026-10-08 | Add shuttle asks per tube, tube price and tubes, and previews the per-shuttle price | Matches the receipt; shows what players will be charged before saving |
| 2026-10-08 | New shared `SegmentedControl` (extracted from the New / Reuse toggle); `Stepper` gains a plain-label variant; `StatTile` gains a `warn` sub-line tone | Reuse instead of one-off controls |
