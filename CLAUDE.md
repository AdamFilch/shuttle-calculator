# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shuttle Calculator: an Expo / React Native app for tracking badminton sessions, matches, players, and shuttlecock usage, and splitting the cost of shuttles used per match among the players in that match.

## Commands

```bash
npm install            # install dependencies
npm run start          # start the dev server (`expo start`)
npm run start:mcp      # start the dev server with the Expo MCP local tools enabled (see below)
npm run ios            # start with iOS simulator target (DARK_MODE=media)
npm run android        # start with Android emulator target (DARK_MODE=media)
npm run web            # start with web target (DARK_MODE=media)
npm run lint           # expo lint (eslint-config-expo flat config)
```

There is no test framework configured in this repo (no test script, no Jest/Vitest dependency).

**Test on mobile only.** All manual testing and visual verification happens on the iOS Simulator (or an Android emulator) via the Expo MCP local tools, never on the web target or in Chrome: `npm run web` is broken (expo-sqlite's web worker can't resolve `wa-sqlite.wasm`), so web results don't reflect the real app. Expo MCP can't drive physical devices or iPhone Mirroring, so use a simulator. If none is available, say so rather than falling back to web.

`npm run reset-project` is the leftover `create-expo-app` script: it deletes or moves `app/`, `components/`, `hooks/`, `scripts/`, and `constants/` into `app-example/` and scaffolds a blank app. Do not run it.

### Running the project

1. `npm install`
2. `npm run start` (or `npm run start:mcp` when using Expo MCP)
3. In the Expo CLI, press `i` for the iOS simulator, `a` for the Android emulator, or `w` for web, or scan the QR code with Expo Go / a development build.

After any schema change in `services/database.js`, use Settings → "Reset Database" in the running app (see Architecture).

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

**Routing**: `expo-router` file-based routing under `app/`. `app/(tabs)/` is the tab group (Home, Sessions, Players, Settings); `app/session/[sessionId]/`, `app/session/[sessionId]/[matchId]/`, `app/session/[sessionId]/create-match/`, and `app/player/[playerId]/` are stack routes pushed from within tabs. `app/_layout.tsx` is the root layout — it wraps everything in `GluestackUIProvider` / `SQLiteProvider` and calls `setupDatabase()` once on mount.

**Data layer**: local-only SQLite via `expo-sqlite`, no backend, no ORM — raw SQL throughout. Each file under `services/` owns one entity (`player.ts`, `session.ts`, `match.ts`, `shuttle.ts`, `match-players.ts`, `match-shuttles.ts`, `shuttle-payments.ts`) and calls `openDatabaseSync('db.db')` itself at module scope to get a handle to the same on-disk database — there's no shared/exported db singleton.

**Schema and lifecycle**: `services/database.js` is the source of truth for the schema (`setupDatabase()`) and defines `dropDatabase()` / `debugDatabase()`. Tables are created with `CREATE TABLE IF NOT EXISTS`, so there is no migration mechanism — if the schema changes, existing on-device databases will *not* pick up new/changed columns until the app's tables are dropped and recreated. The Settings tab (`app/(tabs)/settings/index.tsx`) exposes a "Reset Database" button that calls `dropDatabase()` then `setupDatabase()` for exactly this reason — reach for it whenever a schema change is made.

Core tables: `players`, `sessions`, `matches` (belongs to a session), `match_players` (join table, `position` is one of 4 court slots: TL/BL/TR/BR), `shuttles` (a purchased batch: name, total_price, num_of_shuttles), `match_shuttles` (join table: how many shuttles from a given batch were used in a given match), `shuttle_payments` (per-player, per-match, per-shuttle-batch amount owed, derived at match-creation time from `shuttles.total_price / shuttles.num_of_shuttles`).

**Cost-splitting logic** lives in `services/match.ts::createNewMatch`: for each shuttle batch used in a match, its per-unit price is split evenly across the non-null players in that match and inserted into `shuttle_payments`. Payment state (paid/unpaid, amounts owed) is aggregated back out per-player elsewhere in `services/shuttle-payments.ts` / `services/player.ts`.

**UI**: styling via NativeWind (Tailwind for RN, `tailwind.config.js`) plus the Gluestack UI component library (`components/ui/`, generated/vendored — treat as a component library, not app code). App-specific components live under `components/` (e.g. `components/session/match/`, `components/shuttle/`, `components/user/`) as modals/forms that call into `services/`.

**Path alias**: `@/*` maps to the repo root (configured in both `tsconfig.json` and `babel.config.js` via `module-resolver`).

## Agents and context files

- `.claude/agents/developer.md` and `.claude/agents/designer.md` are project subagents. They hold generic role instructions only, so they can be copied to `~/.claude/agents/` for reuse in other projects; keep project facts out of them.
- `.claude/context/product.md` is the product brief (why, for whom, how charges work, priorities, roadmap, non-goals). `.claude/context/design.md` links the design system artifact (the design source of truth) and holds the decision log. Both agents read these first; update them when product direction or design decisions change.
- `.claude/context/features.md` is the detailed features catalogue (per-feature flows, rules, code locations, status, known gaps). Read it on demand, only the entries a task touches. Update the matching entry whenever a feature ships, changes, or a gap is closed.
- Tickets/PRDs live in `.claude/prds/`. The designer writes only to `.claude/design/specs/` (new designs) and `.claude/design/reviews/` (audits); the developer implements PRDs and any matching design spec.
- PRDs are numbered tickets created with `/plan-prd` (`.claude/commands/plan-prd.md`, a project copy of the ecc plugin's command): heading `# [N]: Title`, file `.claude/prds/N-kebab-title.prd.md`, where `N` is one more than the highest existing numbered PRD across `.claude/prds/`, `completed/`, and `partial/`. Each PRD has an Acceptance Criteria checklist and a Required Changes section.
- The developer agent implements one PRD per branch (`prd-N-kebab-title`) and opens a PR titled `[N]: Title` (needs the `gh` CLI, authenticated). In the same PR it moves the PRD to `.claude/prds/completed/` if every acceptance criterion is verified, or to `.claude/prds/partial/` with an Implementation Status table of what's done and what needs attention.
