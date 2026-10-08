# [8]: Backend — Shuttles Redesign

The Shuttles tab (`app/(tabs)/shuttles/index.tsx`) is being rebuilt to the approved [Shuttles mockup](https://claude.ai/artifact/SpNQs6c9XTShD7LpsTSPGt) and [spec](../design/specs/shuttles.md). It answers one question before the next session: *do I need to buy shuttles, and which type?* It shows a stock list sorted by urgency, with each type's runway in sessions and a restock meter, two tiles (shuttles left, average per session) and a per-session usage chart. A per-type, optional **Warn at** (N shuttles or N sessions) decides when a type is low. One query drives the tab, a dot on the Shuttles tab icon and Home's low-stock alert.

This backend half adds two columns to `shuttles`, two stock readers, a name check, and changes `createShuttle` / `updateShuttle` so the money maths and the duplicate-name rule live in the service. It also updates the seed and removes the dead Insights usage queries. The frontend half, [[8]: Frontend — Shuttles Redesign](../8-frontend-shuttles-redesign.prd.md), is built on the [Contract for frontend](#contract-for-frontend) once this is merged.

## Summary
- **Schema:** `shuttles` gains `warn_at` and `warn_unit`, both nullable, with CHECK constraints. A database reset is needed.
- **Writers:**
  - `createShuttle` takes what's printed on the receipt (tube price, shuttles per tube, tubes). It stores the unit price rounded to 2 dp × the shuttle count, so every existing reader charges the rounded price (D8, D9).
  - `createShuttle` and `updateShuttle` reject a duplicate name (D3, D5).
  - `updateShuttle` saves or clears Warn at.
- **New readers:**
  - `fetchShuttleStock()`: per-type stock, averages, runway, status and totals, already sorted.
  - `fetchShuttlesPerSession(limit)`: the chart data.
  - `isShuttleNameTaken(name, excludeId?)`.
- **Seed and cleanup:** the `default` seed gets a low and an out type, and a new `shuttles` scenario fills the chart. The Insights usage queries and route are removed.
- **Unchanged:**
  - `closeSession` and the settlement split.
  - `addShuttlePurchase` and `fetchShuttlePurchaseHistory`.
  - `fetchAllShuttlesWithInventory`, which Create match still uses.

## Users
- **Primary**: the club manager (the only user), deciding between sessions whether to buy shuttles and which type, and recording purchases.
- **Not for**: players; there are no player-facing screens.

## Scope
**MVP**
- `addShuttlePurchase` optional `date` (seed only).
- `warn_at` / `warn_unit` columns, and the writer changes in [Writers](#writers).
- `fetchShuttleStock`, `fetchShuttlesPerSession`, `isShuttleNameTaken`.
- Seed updates (`default` + new `shuttles` scenario).
- Removal of `fetchShuttleUsageTimeSeries`, `fetchEarliestShuttleUsageDate`, `fetchShuttleUsageSummary`, `components/insights/InsightsSection.tsx` and `app/(tabs)/insights/`.

**Out of scope**
- A dev verification scenario for these readers and writers. Deferred to a future ticket (D26).
- Any screen or component redesign. That's in the frontend PRD. The only exceptions are the named files in [Required Changes → Special exception](#required-changes) (D21).
- A stock check inside `createNewMatch`. The cap lives in the Create match stepper (D20, frontend).
- Recording what a purchase cost. This is a known gap in features §8, and nothing on screen needs it.
- Deleting or archiving shuttle types. Not in the mockup.
- Re-pricing existing types to 2 dp. Only new types and edited prices are stored rounded.

---

## Table of Contents
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. [Data Model](#data-model)
4. [State Machine](#state-machine)
5. [Writers](#writers)
6. [Readers](#readers)
7. [Contract for frontend](#contract-for-frontend)
8. [End-to-End Flows](#end-to-end-flows)
9. [Blast Radius](#blast-radius)
10. [File Reference](#file-reference)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Required Changes](#required-changes)

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
| D12 | Meter basis | Paid instances used after the latest purchase (revised by D24: by session date, not insert time) | Uses existing data | User |
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
| D24 | Meter date basis | A paid instance counts as "used since the latest purchase" when its session's `sessions.date` is after the purchase's `date` (via `shuttle_instances.session_id`), compared with `datetime()` on both sides | The session link gives the real play date; insert time doesn't | User |
| D25 | Backdated purchases for the seed | `addShuttlePurchase` gains an optional `date`; only `services/seed.ts` passes it | The seed's past sessions need purchases dated before them so meters show use | Claude — straightforward |
| D26 | Dev verification scenario | Deferred to a future ticket; AC checks use a temporary Metro log | Not needed to ship | User |
| D27 | Price edited while a session is open | Allowed; the open session is charged the new price at close, as today | Charges are read at close | User |
| D28 | "Uses ~X a session" when it rounds to 0 | Hide that part of the detail hint | "~0" reads as wrong | User |
| D29 | Sessions Warn at for a type unused in the window | Status falls back to the club average: `runway = floor(remaining ÷ club_avg_per_session)` for the low check only; the row still shows no runway | Otherwise it can't warn until 0 | User |

## Overview
A shuttle type (`shuttles`) has stock: purchases (`shuttle_purchases`) minus paid shuttles opened (`shuttle_instances` with that `shuttle_id`). Usage history comes from `shuttle_instances` joined to closed `sessions`. Warn at is two new nullable columns on the type. Everything else on the tab is derived when it's read.

Questions the data answers:
1. **How many of each type are left?** → `SUM(shuttle_purchases.num_of_shuttles) − COUNT(shuttle_instances)` per type (as `fetchAllShuttlesWithInventory` does today).
2. **How fast does the club use shuttles?** → paid instances in the window ÷ sessions in the window (D2).
3. **How long will a type last?** → `floor(remaining ÷ type average)`.
4. **Is a type low?** → its `warn_at` / `warn_unit` against remaining or runway.
5. **How much of the last restock is gone?** → paid instances of the type dated after its latest purchase (D12).

Non-obvious design decisions:
1. **The window is closed sessions only (D2).** A session being played tonight would count as a "session" with only a few shuttles. That pulls the average down and makes the runway look longer than it is. `remaining` still counts every instance, open session or not.
2. **Rounding is stored, not read (D8, D9).** `services/match.ts`, the session/player readers and `closeSession` all divide `total_price / num_of_shuttles`. Storing `round2(unit) × count` makes all of them return the rounded unit price with no change. The cost: `total_price` no longer equals the receipt (RM 50 / 12 → 4.17 × 12 = 50.04).
3. **The service computes status and sort order (D15).** The tab, the tab dot and Home must agree on what's low. Computing it once in `fetchShuttleStock` means no screen re-implements spec §7.

## Data Model
### `shuttles` table (changed)
> Source: [services/database.js](../../services/database.js)

| Column | Type | Stored | Default | Description |
|---|---|---|---|---|
| `shuttle_id` | INTEGER PK | yes | — | unchanged |
| `name` | TEXT NOT NULL | yes | — | Trimmed on write; unique ignoring case (enforced in the service, D5) |
| `total_price` | REAL NOT NULL | yes | — | Now `round2(unit) × num_of_shuttles` on create and on price edit (D9) |
| `num_of_shuttles` | INTEGER NOT NULL | yes | — | unchanged |
| `warn_at` | INTEGER, `CHECK (warn_at >= 1)` | yes | NULL | **new**. Threshold; NULL = warn only when out |
| `warn_unit` | TEXT, `CHECK (warn_unit IN ('shuttles','sessions'))` | yes | NULL | **new**. Unit of `warn_at` |

**Constraints:** add a table CHECK `((warn_at IS NULL) = (warn_unit IS NULL))` so the two are always both set or both NULL (D10).
**Reset needed:** yes, run `npm run db:fresh`.

### Supporting tables (unchanged)
| Table | Purpose in this feature |
|---|---|
| `shuttle_purchases` | Stock in. The latest `date` per type anchors the meter |
| `shuttle_instances` | Stock out (`shuttle_id` NOT NULL = paid). `session_id` and `date` give the window and the meter |
| `sessions` | `status = 'closed'` filters the averaging window; `date` labels chart bars |

## State Machine
Status is derived per type, never stored.

```
            remaining ≤ 0
   [ok] ─────────────────────► [out]
    │  ▲                         │
    │  │ restock above Warn at   │ addShuttlePurchase
    ▼  │                         ▼
   [low] ◄─────────────── (remaining > 0, at or under Warn at)
```

| Condition | Status |
|---|---|
| `remaining ≤ 0` | `out` |
| `warn_unit = 'shuttles'` and `remaining ≤ warn_at` | `low` |
| `warn_unit = 'sessions'` and runway (type average, else club average, D29) `≤ warn_at` | `low` |
| no Warn at and `remaining < 2` (i.e. 1 left) | `low` (D18) |
| otherwise (incl. sessions Warn at with no history) | `ok` |

**Alert** (derived, separate from status): `alert = warn_at IS NOT NULL AND status !== 'ok'`. Only alerting types light the tab dot and appear in Home's alert (D19). A type with no Warn at shows low/out on its row only.

## Writers
### 1. Add shuttle → `createShuttle` (changed)
> Source: [services/shuttle.ts](../../services/shuttle.ts)

**Trigger:** Add shuttle dialog (`components/shuttle/modal.tsx`), and the seed.

**Signature:** `createShuttle({ name, tube_price, per_tube, tubes }: { name: string; tube_price: number; per_tube: number; tubes: number }): Promise<number>`

**What it does:**
1. `name = name.trim()`.
2. Validate (see below), and throw an `Error` with the message shown.
3. `num_of_shuttles = per_tube × tubes`; `unit = roundToCents(tube_price / per_tube)`; `total_price = unit × num_of_shuttles`.
4. In one transaction, insert the `shuttles` row (warn columns NULL) and the first `shuttle_purchases` row of `num_of_shuttles`, as today.
5. Return the new `shuttle_id`.

`roundToCents` already exists in `services/session.ts`; reuse it.

**Pre-conditions:**
| Check | Error message |
|---|---|
| trimmed name non-empty | `Name is required` |
| `isShuttleNameTaken(name)` is false | `A shuttle with this name already exists` |
| `per_tube` integer ≥ 1, `tubes` integer ≥ 1 | `Shuttles per tube and tubes must be at least 1` |
| `tube_price > 0` | `Tube price must be more than 0` |

**Edge cases:**
- RM 50 per 12, 2 tubes → unit 4.17, 24 shuttles, `total_price` 100.08.
- If an insert fails, the transaction rolls back and no purchase row is left behind.

**Does not write:** `warn_at`, `warn_unit`, existing types.

### 2. Save in detail → `updateShuttle` (changed)
**Trigger:** shuttle detail dialog Save (`components/shuttle/editShuttleModal.tsx`).

**Signature:** `updateShuttle({ shuttle_id, name, price_per_shuttle, warn_at, warn_unit }: { shuttle_id: number; name: string; price_per_shuttle: number; warn_at: number | null; warn_unit: 'shuttles' | 'sessions' | null }): Promise<void>`

**What it does:**
1. Trims the name.
2. Checks `isShuttleNameTaken(name, shuttle_id)`.
3. Writes `name`, `total_price = roundToCents(price_per_shuttle) × num_of_shuttles`, `warn_at` and `warn_unit`. Passing `warn_at = null` clears both columns.

**Pre-conditions:**
| Check | Error message |
|---|---|
| trimmed name non-empty | `Name is required` |
| name not taken by another type | `A shuttle with this name already exists` |
| `price_per_shuttle > 0` | `Price must be more than 0` |
| `warn_at` null, or integer ≥ 1 with a `warn_unit` | `Warn at must be a whole number of at least 1` |

**Edge cases:**
- Renaming to the same name with different case, e.g. "rsl classic" → "RSL Classic", is allowed because the type itself is excluded.
- No upper limit on `warn_at` (D7).

**Does not write:** purchases or instances. A session still open when the price changes is charged the new price at close (D27); closed sessions keep their charges.

### 3. Add to stock → `addShuttlePurchase` (optional `date` added)
**Signature:** `addShuttlePurchase({ shuttle_id, num_of_shuttles, date? }: { shuttle_id: number; num_of_shuttles: number; date?: string })`. When `date` is given it's stored in `shuttle_purchases.date`; otherwise the column default (`datetime('now')`) applies, as today. Only the seed passes it (D25). The app's Add to stock never does.

## Readers
### 1. `fetchShuttleStock` (new)
> Source: [services/shuttle.ts](../../services/shuttle.ts)

**Returns:** `ShuttleStock` (see [Contract](#contract-for-frontend)). **Why:** the tab, the tab dot and Home's alert.

**Computation:**
- **Window:** the last 8 sessions (by `sessions.date` desc, then `session_id` desc) with `status = 'closed'` and at least one `shuttle_instances` row where `shuttle_id IS NOT NULL`. `window_sessions` = how many there are (0–8).
- **Averages:**
  - `club_avg_per_session` = paid instances in the window ÷ `window_sessions`, or null when `window_sessions = 0`.
  - Per type, `avg_per_session` = that type's paid instances in the window ÷ `window_sessions`. It's null when that's 0 or there's no window.
- **Stock:**
  - `remaining` = purchased − all instances of the type, open sessions included.
  - `runway_sessions` = `Math.floor(remaining / avg)` when `avg` is set and `remaining > 0`. It's 0 when `remaining ≤ 0` and `avg` is set, and null otherwise.
  - For the **sessions Warn at check only**, when the type's `avg` is null but `club_avg_per_session` is set, use `Math.floor(remaining / club_avg_per_session)` (D29). `runway_sessions` in the result stays null.
  - `used_since_last_purchase` = paid instances of the type whose session has `datetime(sessions.date) > datetime(latest shuttle_purchases.date)`, joined through `shuttle_instances.session_id` (D24).
  - `price_per_shuttle` = `total_price / num_of_shuttles`.
- **Status and alert:** per the [State Machine](#state-machine).
- **Sort:** out, then low, then ok. Within each group, by `runway_sessions` ascending with nulls last, then by name A–Z (case-insensitive).
- **Totals:**
  - `total_remaining` = sum of `max(remaining, 0)`.
  - `type_count`, plus `out_count` and `low_count` (all types, for the tile sub-line), and `alert_count` (types with `alert`, for the tab dot).
  - `club_avg_per_session` and `window_sessions`.

One or two SQL queries plus a small TS pass is fine. Match the style of `fetchAllShuttlesWithInventory`.

| Consumer | File |
|---|---|
| Shuttles tab | `app/(tabs)/shuttles/index.tsx` |
| Tab icon dot | `app/(tabs)/_layout.tsx` |
| Home low-stock alert | `app/(tabs)/index.tsx` |
| Detail dialog hint | `components/shuttle/editShuttleModal.tsx` (via props from the tab) |

### 2. `fetchShuttlesPerSession` (new)
**Signature:** `fetchShuttlesPerSession(limit = 8): Promise<{ session_id: number; date: string; count: number }[]>`

**Returns:** the same window as above, one row per session, `count` = paid instances, **oldest first**. Sessions with only free shuttles, and open sessions, are excluded.

| Consumer | File |
|---|---|
| Shuttles per session chart | `components/shuttle/ShuttlesPerSessionChart.tsx` (new, frontend) |

### 3. `isShuttleNameTaken` (new)
**Signature:** `isShuttleNameTaken(name: string, excludeId?: number): Promise<boolean>`

**Returns:** true if another type has `LOWER(TRIM(name)) = LOWER(TRIM(?))`, excluding `excludeId`. Used by both writers and by the dialogs' live field error. Players check names only in the UI (`components/user/modal.tsx`); shuttles also enforce it in the service (D5).

### Removed
- `fetchShuttleUsageTimeSeries`, `fetchEarliestShuttleUsageDate` and the `ShuttleUsageRange` / `ShuttleUsagePoint` types. Only `InsightsSection` used them.
- `fetchShuttleUsageSummary`. Nothing calls it.
- The `date-fns` imports that become unused.

## Contract for frontend
Screen → data mapping (confirmed, D13):

| Screen element | Reader field / writer |
|---|---|
| Shuttles left tile + sub-line | `fetchShuttleStock().totals.total_remaining`, `type_count`, `out_count`, `low_count` |
| Avg per session tile + "Last N sessions" | `totals.club_avg_per_session` (null → "–"), `totals.window_sessions` |
| Stock row name / status text | `types[].name`, `remaining`, `runway_sessions`, `status` |
| Row meter | `types[].used_since_last_purchase` (fill = remaining ÷ (remaining + used)) |
| Row note "Low · warns at N unit" | `types[].warn_at`, `warn_unit` |
| Row order | `types[]` already sorted |
| Detail hint "uses ~X a session" | `types[].avg_per_session` |
| Detail price field | `types[].price_per_shuttle` |
| Chart bars | `fetchShuttlesPerSession(8)` |
| Tab dot + a11y count | `totals.alert_count` |
| Home alert (≤ 2 rows) | `types[]` where `alert`, same order |
| Add shuttle | `createShuttle({ name, tube_price, per_tube, tubes })` |
| Live duplicate error | `isShuttleNameTaken(name, excludeId?)` |
| Detail Save | `updateShuttle({ shuttle_id, name, price_per_shuttle, warn_at, warn_unit })` |
| Recent purchases / Add to stock | `fetchShuttlePurchaseHistory`, `addShuttlePurchase` (unchanged) |

```ts
export type WarnUnit = 'shuttles' | 'sessions'
export type StockStatus = 'out' | 'low' | 'ok'

export type ShuttleStockType = {
    shuttle_id: number,
    name: string,
    price_per_shuttle: number,
    remaining: number,
    used_since_last_purchase: number,
    avg_per_session: number | null,
    runway_sessions: number | null,
    warn_at: number | null,
    warn_unit: WarnUnit | null,
    status: StockStatus,
    alert: boolean
}

export type ShuttleStock = {
    types: ShuttleStockType[],
    totals: {
        total_remaining: number,
        type_count: number,
        out_count: number,
        low_count: number,
        alert_count: number,
        club_avg_per_session: number | null,
        window_sessions: number
    }
}

export function fetchShuttleStock(): Promise<ShuttleStock>
export function fetchShuttlesPerSession(limit?: number): Promise<{ session_id: number, date: string, count: number }[]>
export function isShuttleNameTaken(name: string, excludeId?: number): Promise<boolean>
export function createShuttle(args: { name: string, tube_price: number, per_tube: number, tubes: number }): Promise<number>
export function updateShuttle(args: { shuttle_id: number, name: string, price_per_shuttle: number, warn_at: number | null, warn_unit: WarnUnit | null }): Promise<void>
```

**Errors (D22):** writers throw `Error` with the exact messages in [Writers](#writers), and validate before any write, so a thrown error leaves nothing written. Readers don't catch: a failed query rejects the promise and the caller decides what to show. The frontend maps messages to fields:

| Message | Shown |
|---|---|
| `Name is required`, `A shuttle with this name already exists` | under Name |
| `Tube price must be more than 0`, `Price must be more than 0` | under the price field |
| `Shuttles per tube and tubes must be at least 1` | under Shuttles per tube |
| `Warn at must be a whole number of at least 1` | under Warn at |
| anything else (SQLite failure) | `AppToast` "Couldn't save. Try again.", dialog stays open |

## End-to-End Flows
### Happy path: manager restocks a low type
```
Shuttles tab focus
  └─► fetchShuttleStock()
        ├─ RSL Classic: remaining 5, warn 10 shuttles → status low, sorted first
        └─ totals.low_count = 1
Manager opens RSL Classic → Add to stock 24
  └─► addShuttlePurchase({ shuttle_id, num_of_shuttles: 24 })
        └─ reload: remaining 29, used_since_last_purchase 0 → ok, meter full
```

### Happy path: add a type by the tube
```
createShuttle({ name: ' Aeroplane Gold ', tube_price: 54, per_tube: 12, tubes: 2 })
  ├─ name → 'Aeroplane Gold', not taken
  ├─ unit = 4.50, num = 24, total_price = 108.00
  └─ shuttles row + shuttle_purchases(24) in one transaction
```

### Edge case: duplicate name
```
createShuttle({ name: 'yonex as-50', … })
  └─ isShuttleNameTaken → true → throw 'A shuttle with this name already exists' (nothing written)
```

### Edge case: no closed history
```
fetchShuttleStock() with only an open session today
  ├─ window_sessions 0 → club_avg null, every avg/runway null
  └─ a sessions Warn at can't apply → ok unless remaining ≤ 0
```

## Blast Radius
| Change | What breaks |
|---|---|
| `createShuttle` signature | `components/shuttle/modal.tsx` and `services/seed.ts` call it. The seed is updated here. The modal gets a stopgap mapping (tube price = old total, per tube = old count, tubes = 1) so it keeps working until the frontend redesign |
| `updateShuttle` signature | `components/shuttle/editShuttleModal.tsx` gets a stopgap passing `warn_at: null, warn_unit: null` until the frontend adds the Warn at field. Note: the stopgap clears any Warn at on Save |
| `total_price` stored rounded | Any future "spend" feature reading `total_price` sees the rounded total, not the receipt |
| Schema columns | Existing on-device DBs need `npm run db:fresh` (no migrations) |
| Removing `InsightsSection` + `app/(tabs)/insights/` | `app/(tabs)/_layout.tsx` registers the hidden insights screen; remove that entry too or expo-router warns |

## File Reference
| File | Role |
|---|---|
| [services/database.js](../../services/database.js) | `shuttles` gains `warn_at`, `warn_unit`, CHECKs |
| [services/shuttle.ts](../../services/shuttle.ts) | Writers changed; `fetchShuttleStock`, `fetchShuttlesPerSession`, `isShuttleNameTaken` **new**; usage queries removed |
| [services/session.ts](../../services/session.ts) | `roundToCents` reused (unchanged) |
| [services/seed.ts](../../services/seed.ts) | `default` updated; `shuttles` scenario **new**; calls use the new `createShuttle` |
| [components/shuttle/modal.tsx](../../components/shuttle/modal.tsx) | Stopgap call update only |
| [components/shuttle/editShuttleModal.tsx](../../components/shuttle/editShuttleModal.tsx) | Stopgap `warn_at: null, warn_unit: null` only |
| [components/insights/InsightsSection.tsx](../../components/insights/InsightsSection.tsx) | Removed |
| [app/(tabs)/insights/index.jsx](../../app/(tabs)/insights/index.jsx) | Removed, with its `app/(tabs)/_layout.tsx` entry |

---

## Acceptance Criteria
- [x] AC1: After `npm run db:fresh`, `shuttles` has `warn_at` and `warn_unit`. Inserting `warn_at = 0`, `warn_unit = 'days'`, or only one of the two set fails on the CHECK.
- [x] AC2: `createShuttle({ name: ' X ', tube_price: 50, per_tube: 12, tubes: 2 })` stores name `X`, `num_of_shuttles` 24, `total_price` 100.08, and one purchase of 24. A unit price read from it is 4.17.
- [x] AC3: `createShuttle` and `updateShuttle` throw `A shuttle with this name already exists` for a name matching another type, trimmed and case-insensitive. `updateShuttle` allows a type's own name in a different case. `updateShuttle` saves Warn at, and clears both columns when `warn_at` is null.
- [x] AC4: `fetchShuttleStock` uses only the last 8 closed sessions with a paid shuttle. It returns the averages, runway (rounded down), `used_since_last_purchase`, status and totals as in [Readers §1](#1-fetchshuttlestock-new), sorted out → low → ok, by runway with nulls last, then name.
- [x] AC5: With no closed sessions that used a paid shuttle, `club_avg_per_session` and every `avg_per_session` / `runway_sessions` are null. A sessions Warn at doesn't make a type low.
- [x] AC5b: A type with no Warn at is `low` at 1 left and `out` at 0, whatever its average, and its `alert` is false. `alert_count` counts only out/low types that have a Warn at.
- [x] AC5c: `used_since_last_purchase` counts paid instances from sessions dated after the latest purchase; after `npm run db:fresh` at least one seeded type has a partly used meter. A type with a sessions Warn at and no use in the window is judged against the club average.
- [x] AC6: `fetchShuttlesPerSession(8)` returns at most 8 rows, oldest first, closed sessions only, and leaves out sessions that used only free shuttles.
- [x] AC7: `isShuttleNameTaken` returns true or false correctly, with and without `excludeId`.
- [x] AC8: After `npm run db:fresh`, the `default` scenario gives at least one `low` type (with a Warn at) and one `out` type. `npm run db:fresh -- shuttles` gives 8+ closed sessions with paid shuttles and one type with no history. Both log `[dev-db] … done`.
- [x] AC9: `fetchShuttleUsageTimeSeries`, `fetchEarliestShuttleUsageDate`, `fetchShuttleUsageSummary`, `InsightsSection` and `app/(tabs)/insights/` are gone, and nothing references them.
- [x] AC10: `npm run lint` and `npx tsc --noEmit` pass. The readers are checked on the iOS Simulator after `npm run db:fresh` (a temporary dev log of the reader output, removed before commit). Never checked on web.

## Required Changes
- **Schema**: [Data Model](#data-model) columns and CHECKs in `setupDatabase()`.
- **Writers**: `createShuttle`, `updateShuttle` per [Writers §1–2](#writers).
- **Readers**: `fetchShuttleStock`, `fetchShuttlesPerSession`, `isShuttleNameTaken`, plus the exported types from the [Contract](#contract-for-frontend).
- **Cleanup**: remove the usage queries, `InsightsSection` and the insights route plus its `_layout.tsx` entry (see [Readers → Removed](#removed)).
- **Seed**:
  - Switch `createShuttle` calls to the tube arguments.
  - Pass a `date` to `addShuttlePurchase` so restocks fall between past sessions and the meters show partial use (D25).
  - `default`: set a Warn at so one type is low, and use up another type completely.
  - Add a `shuttles` scenario: 8–10 closed sessions over recent weeks using two paid types plus some free shuttles, one type with a Warn at in sessions, and one newly added type with no use.
- **Special exception, screen files (D21)**: this backend PRD may edit exactly these files under `app/` and `components/`, and only as described:
  - `app/(tabs)/_layout.tsx`: remove the `insights/index` screen entry.
  - `app/(tabs)/insights/`, `components/insights/`: delete.
  - `components/shuttle/modal.tsx`, `components/shuttle/editShuttleModal.tsx`: stopgap call-site updates so tsc passes and they keep working (see [Blast Radius](#blast-radius)). No UI changes.

  Any other screen change belongs to the frontend PRD.

## Features Catalog
- **Extends**: #8 Shuttle inventory; #12 Home dashboard (low-stock data); #13 Insights (removed route)
- **Closes known gaps**: "Planned (no PRD yet): an optional "Warn at: N" input with a Shuttle / Session toggle in the shuttle detail pop-up. It triggers Home's low-stock alert (PRD [7] D3, D4)." (data side)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rounded `total_price` confuses a later spend feature | Low | Low | D9 is documented here; record it in features §8 when shipped |
| A purchase made on the same day as a session, before play, is compared with the session's date and start of day | Low | Low | Compare with `datetime()`; a same-day restock counts that session's use as before it. Accept |
| The stopgap edit dialog clears a Warn at on Save before the frontend lands | Medium | Low | The frontend follows straight after; the seed sets Warn at directly |

---
*Status: COMPLETED — PR #29*
