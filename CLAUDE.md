# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shuttle Calculator: an Expo / React Native app for tracking badminton sessions, matches, players, and shuttlecock usage, and splitting the cost of shuttles used per match among the players in that match.

## Commands

```bash
npm install          # install dependencies
npx expo start        # start the dev server (or `npm run start`)
npm run ios           # start with iOS simulator target
npm run android        # start with Android emulator target
npm run web            # start with web target
npm run lint            # expo lint (eslint-config-expo flat config)
```

There is no test framework configured in this repo (no test script, no Jest/Vitest dependency).

## Architecture

**Routing**: `expo-router` file-based routing under `app/`. `app/(tabs)/` is the tab group (Home, Sessions, Players, Settings); `app/session/[sessionId]/`, `app/session/[sessionId]/[matchId]/`, `app/session/[sessionId]/create-match/`, and `app/player/[playerId]/` are stack routes pushed from within tabs. `app/_layout.tsx` is the root layout — it wraps everything in `GluestackUIProvider` / `SQLiteProvider` and calls `setupDatabase()` once on mount.

**Data layer**: local-only SQLite via `expo-sqlite`, no backend, no ORM — raw SQL throughout. Each file under `services/` owns one entity (`player.ts`, `session.ts`, `match.ts`, `shuttle.ts`, `match-players.ts`, `match-shuttles.ts`, `shuttle-payments.ts`) and calls `openDatabaseSync('db.db')` itself at module scope to get a handle to the same on-disk database — there's no shared/exported db singleton.

**Schema and lifecycle**: `services/database.js` is the source of truth for the schema (`setupDatabase()`) and defines `dropDatabase()` / `debugDatabase()`. Tables are created with `CREATE TABLE IF NOT EXISTS`, so there is no migration mechanism — if the schema changes, existing on-device databases will *not* pick up new/changed columns until the app's tables are dropped and recreated. The Settings tab (`app/(tabs)/settings/index.tsx`) exposes a "Reset Database" button that calls `dropDatabase()` then `setupDatabase()` for exactly this reason — reach for it whenever a schema change is made.

Core tables: `players`, `sessions`, `matches` (belongs to a session), `match_players` (join table, `position` is one of 4 court slots: TL/BL/TR/BR), `shuttles` (a purchased batch: name, total_price, num_of_shuttles), `match_shuttles` (join table: how many shuttles from a given batch were used in a given match), `shuttle_payments` (per-player, per-match, per-shuttle-batch amount owed, derived at match-creation time from `shuttles.total_price / shuttles.num_of_shuttles`).

**Cost-splitting logic** lives in `services/match.ts::createNewMatch`: for each shuttle batch used in a match, its per-unit price is split evenly across the non-null players in that match and inserted into `shuttle_payments`. Payment state (paid/unpaid, amounts owed) is aggregated back out per-player elsewhere in `services/shuttle-payments.ts` / `services/player.ts`.

**UI**: styling via NativeWind (Tailwind for RN, `tailwind.config.js`) plus the Gluestack UI component library (`components/ui/`, generated/vendored — treat as a component library, not app code). App-specific components live under `components/` (e.g. `components/session/match/`, `components/shuttle/`, `components/user/`) as modals/forms that call into `services/`.

**Path alias**: `@/*` maps to the repo root (configured in both `tsconfig.json` and `babel.config.js` via `module-resolver`).
