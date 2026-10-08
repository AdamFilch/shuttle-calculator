# [8]: Frontend — Shuttles Redesign

The Shuttles tab becomes a stock screen that answers *do I need to buy shuttles, and which type?* It matches the approved [Shuttles mockup](https://claude.ai/artifact/SpNQs6c9XTShD7LpsTSPGt) and [spec](../design/specs/shuttles.md). From top to bottom:
- Two tiles: shuttles left, and average per session.
- A stock list sorted by urgency, each row with its status in words, a runway in sessions and a restock meter.
- A per-session bar chart.

The Add shuttle dialog asks for what's on the receipt (shuttles per tube, tube price, tubes) and previews the per-shuttle price. The detail dialog gains an optional Warn at (N shuttles or N sessions). While any type is low or out, a clay dot shows on the Shuttles tab icon, and Home's low-stock alert lists up to two of them.

This half is visual only and reads real data through the backend's [Contract for frontend](8-backend-shuttles-redesign.prd.md#contract-for-frontend). It adds no table, column or service function. The spec is the source for copy, layout, colours and accessibility; this PRD points to its sections rather than repeating them.

**Depends on:** [8]: Backend — Shuttles Redesign merged

## Summary
What changes:
- `app/(tabs)/shuttles/index.tsx` is rebuilt around `fetchShuttleStock` and `fetchShuttlesPerSession`.
- `components/shuttle/modal.tsx` and `components/shuttle/editShuttleModal.tsx` are redesigned.
- `app/(tabs)/_layout.tsx` gets the tab dot.
- Home's `lowStock` placeholder in `app/(tabs)/index.tsx` is wired to `fetchShuttleStock`.
- New `ShuttleStockRow` and `ShuttlesPerSessionChart` components, plus a shared `SegmentedControl`.
- `StatTile` gets a warn tone, and `Stepper` gets a plain-label variant.
- `ShuttleCard` is removed.

Create match's shuttle picker keeps its behaviour; only its New / Reuse toggle becomes the shared `SegmentedControl`.

## Users
- **Primary**: the club manager, between sessions or at the shop, glancing to decide what to buy, recording purchases and setting when each type warns.
- **Not for**: players.

## Scope
**MVP**
- Spec §4a–4f screens and dialogs, §7 states, §8 accessibility.
- Tab dot (D4) and Home alert (D6).
- `SegmentedControl` extraction, `Stepper` label variant, `StatTile` warn tone (spec §5).

**Out of scope**
- Any change under `services/` or to the schema. Those are in the backend PRD.
- Chart interaction (tap a bar). The spec says no interaction.
- Deleting shuttle types. Not in the mockup.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Readers](#readers)
4. [End-to-End Flows](#end-to-end-flows)
5. [Blast Radius](#blast-radius)
6. [File Reference](#file-reference)
7. [Acceptance Criteria](#acceptance-criteria)
8. [Required Changes](#required-changes)

---

## Decision Log
| # | Decision | Choice | Why | Decided by |
|---|---|---|---|---|
| D1 | Ticket shape | Change ticket, split backend/frontend, screen behaviour from `specs/shuttles.md` | Touches schema and UI | User |
| D2 | Averaging window | Last 8 **closed** sessions with ≥1 paid shuttle | Half-played session doesn't distort runway | User |
| D3 | Duplicate name on rename | Same check as create, excluding self | Names stay unambiguous | User |
| D4 | Tab dot refresh | App foreground + every Shuttles tab reload | Dot never contradicts the list | User |
| D5 | Duplicate enforcement | Service throws + `isShuttleNameTaken` reader for live UI error | Clean data, matches players | User |
| D6 | Home with 3+ low types | 2 rows, no collapse line | Home stays short; dot + tab carry the rest | User |
| D7 | Warn at cap | None, integer ≥ 1 | Harmless, editable | User |
| D8 | Unit price | Rounded to 2 dp | Charges match the price shown | User |
| D9 | Where rounding happens | At save: `total_price = round2(unit) × count` | All existing readers unchanged | User |
| D10 | Warn schema | `warn_at INTEGER CHECK ≥1`, `warn_unit TEXT CHECK IN ('shuttles','sessions')`, both NULL or both set | DB guards bad values | User |
| D11 | Seed | Update `default` (one low, one out) + new `shuttles` scenario | All states visible | User |
| D12 | Meter basis | Paid instances dated after the latest purchase | Uses existing timestamps | User |
| D13 | Contract | Mapping table as confirmed; `createShuttle({name, tube_price, per_tube, tubes})` | Money maths stays in the service | User |
| D14 | Acceptance criteria | All four groups for each half | Confirmed | User |
| D15 | Status/sort computed in service | `fetchShuttleStock` returns `status` and sorted `types[]` | One rule for tab, dot and Home (spec §7) | Claude — straightforward |
| D16 | Remove unused readers | Drop `fetchShuttleUsageTimeSeries`, `fetchEarliestShuttleUsageDate`, `fetchShuttleUsageSummary` (no callers besides `InsightsSection`/none); keep `fetchAllShuttlesWithInventory` (used by `selectShuttleModal.tsx`) | Grep shows callers | Claude — straightforward |
| D17 | Shared refresh between screen and tab layout | Small module-level subscribe/notify in `components/shuttle/` | Frontend-only; no service change | Claude — straightforward |
| D18 | Type with no Warn at | Row shows `low` at fewer than 2 left (1) and `out` at 0, regardless of average; it never lights the tab dot or Home's alert (`alert = false`) | Warnings are opt-in per type; the row still tells the truth | User |
| D19 | Only types with a Warn at alert | `alert = warn_at IS NOT NULL AND status !== 'ok'`; tab dot and Home read `alert`, not `status` | Follows D18 | User |
| D20 | Create match over-picking stock | The New-shuttle stepper stops at the type's remaining count (frontend) | `createNewMatch` doesn't check stock, so remaining could go negative | User |
| D21 | Backend touching screen files | Allowed as named exceptions only: insights route removal in `app/(tabs)/_layout.tsx`, stopgap call sites in the two shuttle dialogs | Removing a route needs its layout entry gone; signatures change here | User |
| D22 | Error handling | Shared pattern: field errors under the field, save failures as an `AppToast` with the dialog kept open, load failures inline "Couldn't load. Pull to refresh.", tab dot keeps its last value | One behaviour across all shuttle writers and readers | User |
| D23 | Restock unit | Add shuttle uses tubes (min 1); Buy again stays a plain shuttle count, no tubes | Restocks are often loose shuttles | User |

## Overview
Every number on the tab, the dot and Home's alert comes from one reader, `fetchShuttleStock()`, which returns sorted `types[]` with a `status` and `totals`. The chart reads `fetchShuttlesPerSession(8)`. The two dialogs call `createShuttle`, `updateShuttle`, `isShuttleNameTaken`, `addShuttlePurchase` and `fetchShuttlePurchaseHistory`. The screen never works out status, runway or sort order itself (D15). Its only maths is display: meter fill, the live per-shuttle line and the Warn at hint preview.

Non-obvious design decisions:
1. **The live preview uses the same rounding as the service (D8).** The Add line shows the tube price ÷ per tube rounded to 2 dp, and the detail hint compares typed values against `remaining` / `runway_sessions` from the reader. What the manager sees is what players are charged.
2. **The tab dot shares a refresh signal with the screen (D4, D17).** `_layout.tsx` re-queries when the app returns to the foreground (`AppState` → `active`), and whenever the Shuttles screen reloads. The screen calls a tiny `notifyShuttleStockChanged()` exported from `components/shuttle/stockSignal.ts` (**new**), which the layout subscribes to. No context provider, no new dependency.
3. **The Home alert is a filter, not a new rule (D6).** Home takes `types.filter(t => t.alert).slice(0, 2)` (only types with a Warn at, D19) and maps it into the existing `LowStockAlert` props (`name`, `remaining`, `runwaySessions`). It doesn't add a collapse line.
4. **A type with no Warn at shows on its row only (D18).** Its row reads low at 1 left and "Out of stock" at 0, in the same colours as any low/out row, but its note has no "warns at" text and it never lights the dot or Home.
5. **Create match can't over-pick (D20).** In `selectShuttleModal.tsx` the New-shuttle stepper's + is disabled at the type's `remaining` (the `Stepper` gets a `max` prop), so stock can't go negative from the app.
6. **One error pattern (D22).** Writer errors map to fields by message (table in the [backend contract](8-backend-shuttles-redesign.prd.md#contract-for-frontend)); an unknown error shows an `AppToast` "Couldn't save. Try again." and the dialog stays open with input kept. A failed load on the tab or Home shows "Couldn't load. Pull to refresh." inline. A failed tab-dot query keeps the last value.
7. **Tubes only on Add (D23).** Add shuttle's Tubes stepper has min 1. Buy again in the detail dialog stays a plain shuttle count (integer ≥ 1), no tubes.

## Readers
All from [the backend contract](8-backend-shuttles-redesign.prd.md#contract-for-frontend).

| Screen element | Reader field / writer | Spec |
|---|---|---|
| Shuttles left tile + sub-line | `totals.total_remaining`, `type_count`, `out_count`, `low_count` | §4a, §4b |
| Avg per session tile | `totals.club_avg_per_session` (null → "–" / "After your first session"), `window_sessions` | §4a, §4c |
| Stock rows (order, name, status, note) | `types[]` as returned; `remaining`, `runway_sessions`, `status`, `warn_at`, `warn_unit` | §4a, §4b |
| Row meter | `remaining ÷ (remaining + used_since_last_purchase)`, clamped 0–1 | §4a |
| Chart | `fetchShuttlesPerSession(8)` `{date, count}` | §4a, §4c |
| Empty tab | `totals.type_count === 0` | §4d |
| Add shuttle | `createShuttle({ name, tube_price, per_tube, tubes })`; live dup error via `isShuttleNameTaken(name)` | §4e |
| Detail dialog | `price_per_shuttle`, `avg_per_session`, `remaining`, `runway_sessions` from the tapped row; Save → `updateShuttle({ …, warn_at, warn_unit })`; rename dup via `isShuttleNameTaken(name, shuttle_id)` | §4f |
| Recent purchases / Add to stock | `fetchShuttlePurchaseHistory`, `addShuttlePurchase` | §4f |
| Tab dot | `totals.alert_count > 0` (only types with a Warn at, D19) | §4b |
| Home alert | `types.filter(t => t.alert).slice(0, 2)` | §4b |

## End-to-End Flows
### Happy path: a type runs low after a session
```
Manager plays a session; a match uses RSL Classic shuttles
  └─► app goes background → foreground
        └─► _layout re-runs fetchShuttleStock → low_count 1 → clay dot on Shuttles icon
Manager opens Home
  └─► Home reads fetchShuttleStock → LowStockAlert "RSL Classic running low"
Tap alert → Shuttles tab (reload → notifyShuttleStockChanged)
  └─► RSL Classic first, clay text, "Low · warns at 10 shuttles"
Tap row → detail → Buy again 24 → Add to stock
  └─► addShuttlePurchase → reload → row ok, meter full → dot clears
```

### Happy path: add by the tube
```
Add shuttle → Name "Aeroplane Gold", per tube 12, tube price 54, tubes 2
  ├─ live line "RM 4.50 per shuttle · 24 shuttles"
  └─ Add shuttle → createShuttle({...}) → close → reload
```

### Edge case: duplicate name
```
Name "yonex as-50" → isShuttleNameTaken → true
  ├─ red field error + "To add stock to Yonex AS-50, open it from the list and use Buy again."
  └─ Add shuttle disabled. If createShuttle still throws, show error.message under the field
```

### Edge case: Warn at in sessions, no history
```
Detail → Warn at 2, Sessions, avg_per_session null
  └─ hint "No sessions with paid shuttles yet, so this can't warn by sessions until there are." (muted)
```

## Blast Radius
| Change | What breaks |
|---|---|
| Removing `ShuttleCard.tsx` | Only `app/(tabs)/shuttles/index.tsx` imports it |
| `SegmentedControl` extraction | `components/session/match/selectShuttleModal.tsx` New / Reuse toggle must look and behave the same |
| `Stepper` label variant | Existing `shuttle` prop callers in Create match must render unchanged |
| `StatTile` `subLineTone` | Optional prop; Home tiles unchanged |
| Tab layout re-query | One extra small query on foreground and on each Shuttles reload |

## File Reference
| File | Role |
|---|---|
| [app/(tabs)/shuttles/index.tsx](../../app/(tabs)/shuttles/index.tsx) | Rebuilt: tiles, stock list, chart, empty/loading/error |
| [app/(tabs)/_layout.tsx](../../app/(tabs)/_layout.tsx) | Shuttles icon dot + accessibility label; foreground + signal refresh |
| [app/(tabs)/index.tsx](../../app/(tabs)/index.tsx) | `lowStock` from `fetchShuttleStock` |
| [components/shuttle/modal.tsx](../../components/shuttle/modal.tsx) | Add shuttle by the tube (§4e) |
| [components/shuttle/editShuttleModal.tsx](../../components/shuttle/editShuttleModal.tsx) | RM price, Warn at, hint, copy (§4f) |
| components/shuttle/ShuttleStockRow.tsx | **new** row + meter + note |
| components/shuttle/ShuttlesPerSessionChart.tsx | **new** View-based bars / empty box |
| components/shuttle/stockSignal.ts | **new** subscribe / notify for the tab dot |
| components/shared/SegmentedControl.tsx | **new**, extracted from `selectShuttleModal.tsx` |
| [components/session/match/selectShuttleModal.tsx](../../components/session/match/selectShuttleModal.tsx) | Uses `SegmentedControl` |
| [components/session/match/Stepper.tsx](../../components/session/match/Stepper.tsx) | `label` variant, `min` and `max` props |
| [components/shared/StatTile.tsx](../../components/shared/StatTile.tsx) | `subLineTone?: "muted" \| "warn"` |
| [components/shuttle/ShuttleCard.tsx](../../components/shuttle/ShuttleCard.tsx) | Removed |

---

## Acceptance Criteria
- [ ] AC1: The Shuttles tab shows the two tiles, the Stock list and the chart, with the copy, colours, sort order, runway text ("~k sessions", "<1 session", "{n} left", "Out of stock"), meter and notes from spec §4a–4c. The empty tab shows the EmptyState and "Add your first shuttle" with no header button, tiles or chart (§4d). Loading shows skeletons and errors show an inline message (§7). `ShuttleCard` is removed.
- [ ] AC2: Add shuttle asks for name, shuttles per tube (default 12), tube price (RM) and tubes (stepper, default 1). It shows the live per-shuttle line (§4e) and saves via `createShuttle`. A duplicate name (trimmed, case-insensitive) shows the field error and the Buy again hint, and keeps Add disabled.
- [ ] AC3: The detail dialog shows "RM" on the price, the Warn at number + Shuttles/Sessions `SegmentedControl` with each live hint variant in §4f, and "Add to stock". Save stores Warn at, and clearing the number clears it. Renaming to another type's name shows the duplicate error.
- [ ] AC4: While any type is out or low, a clay dot shows on the Shuttles tab icon on every tab, with the label "Shuttles, {n} type(s) need restocking". It updates when the app returns to the foreground and whenever the Shuttles tab reloads.
- [ ] AC5: Home's low-stock alert shows up to 2 out/low types from `fetchShuttleStock`, out first then lowest runway, with no collapse line. Tapping one opens the Shuttles tab. Types with no Warn at never appear in the alert or light the dot, but their rows still show low at 1 and out at 0.
- [ ] AC6: Touch targets are at least 44pt. Rows and the chart have the screen-reader labels in §8, and number fields open the number or decimal pad. Create match's New / Reuse toggle uses the shared `SegmentedControl` and looks the same. `Stepper` and `StatTile` changes don't alter existing screens.
- [ ] AC6b: In Create match the New-shuttle stepper stops at the type's remaining count. Add shuttle's Tubes stepper stops at 1; Buy again takes a shuttle count.
- [ ] AC6c: Writer errors appear under the matching field; any other save failure shows the "Couldn't save. Try again." toast and keeps the dialog open with input kept; a failed load shows "Couldn't load. Pull to refresh." inline.
- [ ] AC7: `npm run lint` and `npx tsc --noEmit` pass. Every state is checked on the iOS Simulator via Expo MCP after `npm run db:fresh` (default) and `npm run db:fresh -- shuttles`. Never checked on web.

## Required Changes
- **Shuttles tab**: rebuild per spec §4a–4d and §7, using the [Readers](#readers) mapping. Call `notifyShuttleStockChanged()` after each load.
- **Components**: create `ShuttleStockRow`, `ShuttlesPerSessionChart`, `stockSignal`, `SegmentedControl` (spec §5); update `Stepper`, `StatTile`; delete `ShuttleCard`.
- **Dialogs**: `modal.tsx` per §4e, `editShuttleModal.tsx` per §4f. Both use `isShuttleNameTaken` for the live error and show a thrown `error.message`. Replace the backend's stopgap call sites.
- **Tab layout**: dot + label (§4b) and the refresh in [Overview](#overview) note 2.
- **Create match**: `Stepper` gains `max`; `selectShuttleModal.tsx` passes `remaining` (D20).
- **Errors**: apply the pattern in [Overview](#overview) note 6 in both dialogs, the tab and Home's alert.
- **Home**: replace the empty `lowStock` array with the filter in Overview note 3.

## Features Catalog
- **Extends**: #8 Shuttle inventory; #12 Home dashboard (low-stock alert now live)
- **Closes known gaps**: "Planned (no PRD yet): an optional "Warn at: N" input with a Shuttle / Session toggle in the shuttle detail pop-up. It triggers Home's low-stock alert (PRD [7] D3, D4)."; "The spec's manual verification on a simulator hasn't been run." (for the redesigned tab)

## Open Questions
- [ ] Detail hint "uses ~X a session" rounds the average to a whole number, so 0.4 reads "~0". Show one decimal below 1?
- [ ] A type with a sessions Warn at that wasn't used in the last 8 sessions has no average, so it never shows low until 0. Fall back to the club average?

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The tab dot misses a change made in Create match until the app is next foregrounded | Medium | Low | Chosen trade-off (D4). Visiting Shuttles also refreshes it |
| The name check races with typing | Low | Low | The service throws anyway (D5); show its message |

---
*Status: READY — ticket [8]*
