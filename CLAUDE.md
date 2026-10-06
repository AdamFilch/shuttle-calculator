# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shuttle Calculator: an Expo / React Native app for tracking badminton sessions, matches, players, and shuttlecock usage, and splitting the cost of the shuttles and courts used in a session among the players who used them.

## Commands

```bash
npm install            # install dependencies
npm run start          # start the dev server (`expo start`)
npm run start:mcp      # start the dev server with the Expo MCP local tools enabled (see below)
npm run ios            # start with iOS simulator target (DARK_MODE=media)
npm run android        # start with Android emulator target (DARK_MODE=media)
npm run web            # start with web target (DARK_MODE=media)
npm run lint           # expo lint (eslint-config-expo flat config)
npm run db:reset       # drop and recreate all tables in the running app (no data)
npm run db:seed        # insert sample data (the `default` scenario, or `npm run db:seed -- <scenario>`)
npm run db:fresh       # db:reset then db:seed in one go
```

The `db:*` commands need the dev server running and the app open in a booted iOS Simulator. Add `-- --android` for an Android emulator, or `-- --url <exp://host:port>` (or set `EXPO_DEV_URL`) if the app was opened from a different dev server URL. See "Dev database tools" below.

There is no test framework configured in this repo (no test script, no Jest/Vitest dependency).

**Test on mobile only.** All manual testing and visual verification happens on the iOS Simulator (or an Android emulator) via the Expo MCP local tools, never on the web target or in Chrome: `npm run web` is broken (expo-sqlite's web worker can't resolve `wa-sqlite.wasm`), so web results don't reflect the real app. Expo MCP can't drive physical devices or iPhone Mirroring, so use a simulator. If none is available, say so rather than falling back to web.

`npm run reset-project` is the leftover `create-expo-app` script: it deletes or moves `app/`, `components/`, `hooks/`, `scripts/`, and `constants/` into `app-example/` and scaffolds a blank app. Do not run it.

### Running the project

1. `npm install`
2. `npm run start` (or `npm run start:mcp` when using Expo MCP)
3. In the Expo CLI, press `i` for the iOS simulator, `a` for the Android emulator, or `w` for web, or scan the QR code with Expo Go / a development build.

**Reset the database before checking a DB change.** If your change touched the schema (`services/database.js`) or how data is written, the existing on-device database will not reflect it. Before checking the app, reset it with `npm run db:reset` (or tap Settings → "Reset Database"), then load test data with `npm run db:seed`; `npm run db:fresh` does both. Do this every time you verify such a change, and mention in your report that the user must reset too.

## Tech stack

- **Expo SDK 57** with **React Native 0.86** and **React 19.2**, written in **TypeScript 6**
- **expo-router** for file-based routing
- **expo-sqlite**: local SQLite database, raw SQL, no backend or ORM
- **NativeWind 4** (Tailwind CSS 3 for React Native) for styling
- **Gluestack UI** (`@gluestack-ui/core`) components, vendored under `components/ui/`
- **ESLint** via `eslint-config-expo`
- **expo-mcp** (dev only) for AI tooling against the running app

## Expo MCP

The Expo MCP server lets Claude Code inspect and drive the running app (screenshots, taps, logs) and query the Expo account. It works on the free Expo plan; only the `search_documentation` tool needs a paid EAS plan.

One-time setup:

1. `claude mcp add --transport http expo https://mcp.expo.dev/mcp`
2. In Claude Code, run `/mcp`, select `expo`, and sign in with the Expo account in the browser.
3. `npx expo whoami || npx expo login` with the same Expo account.

Each time:

1. `npm run start:mcp` (sets `EXPO_UNSTABLE_MCP_SERVER=1`; local tools need SDK 54+ and the `expo-mcp` dev dependency)
2. Open the app in a simulator/emulator.
3. Run `/mcp` and reconnect `expo` so the local tools appear. Reconnect again whenever the dev server is restarted.

## Architecture

**Routing**: `expo-router` file-based routing under `app/`. `app/(tabs)/` is the tab group: Home (`index.tsx`), Sessions (`session/`), Players (`player/`), Shuttles (`shuttles/`, inventory) and Settings (`settings/`); `insights/` exists but is hidden from the tab bar (`href: null`). `app/session/[sessionId]/`, `app/session/[sessionId]/[matchId]/`, `app/session/[sessionId]/create-match/`, `app/player/[playerId]/` and `app/player/deleted/` are stack routes pushed from within tabs, and `app/dev/db.tsx` is the dev-only database route (see Dev database tools). `app/_layout.tsx` is the root layout — it wraps everything in `GluestackUIProvider` / `SQLiteProvider` and calls `setupDatabase()` once on mount.

**Data layer**: local-only SQLite via `expo-sqlite`, no backend, no ORM — raw SQL throughout. Each file under `services/` owns one area: `player.ts` (players, soft delete/restore, per-player balances), `session.ts` (sessions, closing/settlement), `match.ts` (match creation and detail), `shuttle.ts` (shuttle types, purchases, inventory, usage stats), `shuttle_instances.ts` (shuttles used in a session), `court.ts` (court bookings), `shuttle-payments.ts` (marking shuttle and court charges paid), `match-players.ts`, and `seed.ts` (dev sample data). Each one calls `openDatabaseSync('db.db')` itself at module scope to get a handle to the same on-disk database — there's no shared/exported db singleton.

**Schema and lifecycle**: `services/database.js` is the source of truth for the schema (`setupDatabase()`) and defines `dropDatabase()` / `debugDatabase()`. Tables are created with `CREATE TABLE IF NOT EXISTS`, so there is no migration mechanism — if the schema changes, existing on-device databases will *not* pick up new/changed columns until the app's tables are dropped and recreated. The Settings tab (`app/(tabs)/settings/index.tsx`) exposes a "Reset Database" button that calls `dropDatabase()` then `setupDatabase()` for exactly this reason — reach for it (or `npm run db:reset`) whenever a schema change is made.

**Dev database tools**: reset and seeding run inside the app, because the DB lives in the app's sandbox and the schema and settlement logic are app code.
- `scripts/dev-db.js` (behind `npm run db:*`) opens the deep link `exp://127.0.0.1:8081/--/dev/db?action=<reset|seed|fresh>&scenario=<name>` with `xcrun simctl openurl` (or `adb` with `--android`). It exits non-zero if the link could not be opened, so it can be used in a pipeline.
- `app/dev/db.tsx` is the route that does the work. It does nothing outside `__DEV__`. On success it logs `[dev-db] <action> [scenario] done` to Metro and returns to Home; on failure it logs `[dev-db] <action> failed: …` and shows the error on screen (`testID="dev-db-error"`). Confirm the result from the Metro logs or a screenshot via Expo MCP.
- `services/seed.ts` holds the sample data as named `scenarios`. `default` gives 6 active players plus 1 deleted, 2 shuttle types, a closed and settled session from last week (one player fully paid) and an open session today with new, reused and free shuttles and court bookings. `empty` inserts nothing. Seeds use the real service functions (`createNewMatch`, `closeSession`, …) so data follows the app's rules; keep it that way rather than inserting raw rows.
- To test an unusual case, add a new scenario to `scenarios` and run `npm run db:fresh -- <name>`, instead of changing `default`. Update `default` when a schema change would break it.
- Settings also has a dev-only "Reset & Load Sample Data" button.

Core tables:
- `players`: `status` is `active` or `deleted` (soft delete with `deleted_date`; a player who still owes money can't be deleted).
- `sessions`: name, date, `start_time`, `location`, `status` `open` or `closed`, `closed_date`.
- `matches`: belongs to a session, with a per-session `match_number`.
- `match_players`: join table; `position` is one of 4 court slots, in order TL/BL/TR/BR (0–3).
- `shuttles`: a shuttle type (name, `total_price`, `num_of_shuttles`); its unit price is `total_price / num_of_shuttles`.
- `shuttle_purchases`: stock added for a shuttle type. Inventory remaining = purchased minus `shuttle_instances` of that type.
- `shuttle_instances`: one physical shuttle opened in a session; `shuttle_id` is NULL for a free shuttle.
- `match_shuttle_instances`: join table of which shuttle instances were used in which match. A reused shuttle is the same instance linked to several matches.
- `court_bookings`: courts booked for a session (`price` × `quantity`, optional label and duration).
- `shuttle_payments` / `court_payments`: one row per player per shuttle instance / court booking, created when the session closes. `amount_paid` holds the amount still **owed**; paying sets it to 0 and stamps `date_paid`.

`services/schema.sql` and `services/match-shuttles.ts` are leftovers from an older `match_shuttles` design; nothing uses them and the table no longer exists.

**Cost-splitting logic**: nothing is charged while a session is open. `createNewMatch` (`services/match.ts`) only records players and shuttle usage (`new` creates instances, `reused` links an existing instance, `free` creates a NULL-shuttle instance). Charges are created in `closeSession` (`services/session.ts`), in one transaction:
- Each paid shuttle instance's unit price is split evenly across every distinct player in any match that used it, and inserted into `shuttle_payments`. Free instances cost nothing.
- Each court booking's `price × quantity` is split evenly across every distinct player who played in the session, and inserted into `court_payments`.
- Amounts are rounded to 2 decimal places per player.

Outstanding balances are aggregated per player in `services/player.ts`, and payments are recorded in `services/shuttle-payments.ts` (`paySessionInFull`, `payShuttleInstancesByIds`, `payCourtBySessionId`, `payShuttleByPlayers`).

**UI**: styling via NativeWind (Tailwind for RN, `tailwind.config.js`) plus the Gluestack UI component library (`components/ui/`, generated/vendored — treat as a component library, not app code). App-specific components live under `components/` (e.g. `components/session/match/`, `components/shuttle/`, `components/user/`) as modals/forms that call into `services/`.

**Path alias**: `@/*` maps to the repo root (configured in both `tsconfig.json` and `babel.config.js` via `module-resolver`).

## Agents and context files

- `.claude/agents/developer.md` and `.claude/agents/designer.md` are project subagents. They hold generic role instructions only, so they can be copied to `~/.claude/agents/` for reuse in other projects; keep project facts out of them.
- `.claude/context/product.md` is the product brief (why, for whom, how charges work, priorities, roadmap, non-goals). `.claude/context/design.md` links the design system artifact (the design source of truth) and holds the decision log. Both agents read these first; update them when product direction or design decisions change.
- `.claude/context/features.md` is the detailed features catalogue (per-feature flows, rules, code locations, status, known gaps). Read it on demand, only the entries a task touches. Update the matching entry whenever a feature ships, changes, or a gap is closed.
- Tickets/PRDs live in `.claude/prds/`. The designer writes only to `.claude/design/specs/` (new designs) and `.claude/design/reviews/` (audits); the developer implements PRDs and any matching design spec.
- PRDs are numbered tickets created with `/plan-prd` (`.claude/commands/plan-prd.md`, a project copy of the ecc plugin's command): heading `# [N]: Title`, file `.claude/prds/N-kebab-title.prd.md`, where `N` is one more than the highest existing numbered PRD across `.claude/prds/`, `completed/`, and `partial/`. Each PRD is also a full feature spec: Summary, Scope, a Decision Log, the spec sections that apply (Overview, Data Model, State Machine, Writers, Readers, End-to-End Flows, Blast Radius, File Reference), an Acceptance Criteria checklist and a Required Changes section.
- `/plan-prd` gathers decisions with the `drill-me` skill (`.claude/skills/drill-me/SKILL.md`). It asks one decision per AskUserQuestion picker question, with the recommended option first, round after round until nothing is left open. Claude decides alone only when the existing code already sets the pattern, and logs it as `Claude — straightforward`. `/drill-me` also works on its own for any idea or plan.
- The developer agent implements one PRD per branch (`prd-N-kebab-title`) and opens a PR titled `[N]: Title` (needs the `gh` CLI, authenticated). In the same PR it moves the PRD to `.claude/prds/completed/` if every acceptance criterion is verified, or to `.claude/prds/partial/` with an Implementation Status table of what's done and what needs attention.
