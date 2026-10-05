# [1]: Players and Sessions redesign on design-system tokens

## Summary
Restyle the Players and Sessions tabs to match the "Shuttle Calculator" design system (https://claude.ai/artifact/SwExfmY2Nyrak23xp4vSxS: `project/README.md`, the "Applying it to the app" table, and `project/tokens.json`). Apply the palette at the root through the Gluestack theme tokens, so every screen inherits `primary`, `secondary` and the rest. Build the new pieces as shared components that later screens reuse, so similar features look alike.

This is a design change: behaviour stays the same, and only the look and the data shown change.

## Users
- **Primary**: the session organiser, checking players and sessions at the court between games.

## Scope
**MVP**
- Root theme token remap, plus the tab bar and PageHeader restyle.
- Players tab: search input; PlayerRow with Avatar, name, "N sessions" and StatusBadge; "Recently deleted" as a text link under the list.
- Sessions tab: SessionCard with title, "date · N players", feather icon + "N shuttles used", and StatusBadge.
- A consistent avatar colour per player, stored in the database.
- "RM" instead of "$" on these two screens.

**Out of scope**
- The dashed "Not started" SessionCard variant (e.g. "Sunday Morning open play · Not started"). Sessions with no matches use the normal card.
- Restyling other screens (Home, player detail, session detail, create match, shuttles, modals). They only pick up the new token colours.
- Changing "$" to "RM" outside the Players and Sessions tabs. Currency gap #16 stays open elsewhere.
- Editing a player's avatar colour, and photo avatars.
- A dark theme (light only, per the design decision log).

## Acceptance Criteria
- [x] AC1: Every existing action on both tabs works as before: Add player (including empty and duplicate-name validation), fuzzy search, tap a player to open their detail, "Recently deleted" opening the deleted list, Add session, and tap a session to open its detail. Both empty states still appear.
- [x] AC2: Every value shown comes from a database query, not a placeholder: player name, session count and amount owed; session title, date, player count, shuttles used, and the status / amount due. Verified by adding data in the app and seeing both lists update.
- [x] AC3: Money on both tabs reads "RM", e.g. "Owes RM 12" and "RM 12 due". Whole amounts drop the cents ("RM 12"); other amounts keep 2 decimals ("RM 4.50"). Neither tab shows "$".
- [x] AC4: The design-system palette is applied through the theme tokens in `components/ui/gluestack-ui-provider/config.ts` (and exposed in `tailwind.config.js`), not hard-coded hex values in screens or components. The tab bar and PageHeader use these tokens.
- [x] AC5: Each player has an initials avatar: the first 2 letters of the name, uppercased (1 letter for a 1-character name). The colour is stored in the `players` table when the player is created, rotating primary → clay → sage → muted. A player shows the same colour on every render and after an app restart.
- [x] AC6: Avatar, StatusBadge, PlayerRow and SessionCard (plus a search TextInput if needed) are shared components under `components/`, used by both tabs where they apply. These replace the `ListRow` / `DebtChip` usages on these two tabs. The old components stay in place for other screens.
- [x] AC7: The SessionCard badge follows session status. Open sessions show "Open session" (`primary` on `primary-tint`). Closed sessions show "Settled" when nothing is owed, or "RM N due" (clay) for the outstanding shuttle and court charges. Sessions with no matches use the same normal card. There is no dashed "Not started" variant.
- [x] AC8: "N sessions" on PlayerRow counts every distinct session the player has played in, paid or not, and is pluralised ("1 session", "3 sessions").
- [x] AC9: `npm run lint` and `npx tsc --noEmit` pass. Both tabs are checked visually on the iOS Simulator via Expo MCP after `npm run db:fresh` (never on web).

## Required Changes
- **Theme (root)**: in `components/ui/gluestack-ui-provider/config.ts`, apply the design system's token remap:
  - `primary-500/600` → `primary`, `primary-50` → `primary-tint`
  - `typography-900` → `ink`, `typography-500` → `muted`
  - `background-0` → `surface-raised`, `background-50` → `surface`
  - `outline-100` → `border-subtle`, `outline-200/300` → `border`
  - `success-*` → `settled` / `settled-tint`

  Add `clay`, `sage` and `on-sage` (and their tints) as named tokens in `config.ts` and `tailwind.config.js`, so components use classes, not hex. Point the dark scale at the same values.
- **Tab bar** (`app/(tabs)/_layout.tsx`): active `primary`, inactive `muted`, bar `surface-raised` with a `border-subtle` top hairline.
- **PageHeader** (`components/layout/PageHeader.tsx`): `screen-title` plus a primary button with a + icon, on `surface`.
- **Database**: in `services/database.js`, add `avatar_colour TEXT` to `players`. Store a token name (`primary` / `clay` / `sage` / `muted`), not a hex value. `services/player.ts::createPlayer` assigns the next colour in rotation (e.g. existing player count % 4), and the `Player` type gains the field. Check `services/seed.ts` still produces coloured players. This needs a database reset (`npm run db:fresh`), because there are no migrations.
- **Queries**
  - Players: extend `fetchAllPlayerPayments` (or add a query) to also return `avatar_colour` and the number of distinct sessions the player played in (via `match_players` → `matches.session_id`).
  - Sessions: extend `fetchAllSessions` (`services/session.ts`) to also return shuttles used per session and, for closed sessions, the outstanding amount (unpaid `shuttle_payments` + `court_payments`). Keep `player_count` and `status`.
- **Shared components (new)**
  - `Avatar`: props `name` and `colour`. Shows initials in a pill shape, with `surface` text (`on-sage` on sage).
  - `StatusBadge`: three variants:
    - `settled`: "Settled"
    - `owes`: clay, "Owes RM N" / "RM N due"
    - `open`: "Open session", `primary` on `primary-tint`

    It replaces `DebtChip` on these tabs.
  - `PlayerRow`: Avatar, name, "N sessions" (pluralised) and StatusBadge. Pressed state fills `primary-tint`.
  - `SessionCard`: title, "D Mon YYYY · N players", feather icon (clay) + "N shuttles used", and StatusBadge ("Open session" when open; "Settled" / "RM N due" when closed).
  - A money formatter helper (e.g. `formatRM(amount)`), used by StatusBadge.
- **Screens**: `app/(tabs)/player/index.tsx` and `app/(tabs)/session/index.tsx` switch to the components above. Their existing handlers, modals (`components/user/modal.tsx`, `components/session/modal.tsx`) and navigation stay unchanged.

## Features Catalog
- **Extends**: #1 Players, #3 Sessions, and partly #16 Currency (Players and Sessions tabs only)
- **Closes known gaps**: none fully. #16, "amounts are shown with `$`", is closed only for the Players and Sessions tabs.

## Open Questions
- None. Resolved with the product owner:
  - Open sessions show "Open session"; closed sessions show "Settled" or "RM N due".
  - "N sessions" counts every session the player has played.
  - The avatar colour is stored in the database.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The token remap changes colours on screens that haven't been migrated yet | High | Low | Expected: per `design.md`, gaps on unmigrated screens are known issues |
| The schema change wipes on-device data | High | Medium | Dev-only data today; `npm run db:fresh` reloads sample data. Mention it in the PR. |
| Rotating by player count repeats colours after deletes | Medium | Low | Acceptable: colours only need to stay the same for each player, not be unique |

---
*Status: READY — ticket [1]*
