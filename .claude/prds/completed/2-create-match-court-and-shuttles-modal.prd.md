# [2]: Create Match court and shuttles modal redesign

## Summary
Rebuild the Create Match page (`app/session/[sessionId]/create-match`) to the "Shuttle Calculator" design system (https://claude.ai/artifact/SwExfmY2Nyrak23xp4vSxS: `project/components/Court`, `ShuttleChip`, `ShuttlesModal`, `Stepper`, plus `project/README.md` and `project/tokens.json`). The court follows the design exactly: four CourtSlots coloured with each player's stored avatar colour, the ShuttleChip top-right, and a full-width "Start match" button with a hint underneath. The shuttle picker becomes the ShuttlesModal. Its "New shuttle" tab lists steppers for the top 3 shuttle types across all sessions, then types already used this session, then any type added through "Add a different shuttle", then Free shuttle. Its "Reuse shuttle" tab keeps today's reuse of shuttles from this session.

Two process changes: "Start match" now needs at least one player on each side of the net, and shuttle selection becomes a draft that commits on Done. What stays the same: how a match is saved (`createNewMatch`, New / Reused / Free semantics, a match with no shuttles gets one Free shuttle), no charges until session close, and every other screen.

## Users
- **Primary**: the session organiser at the court, logging a match between games, one-handed.

## Scope
**MVP**
- Court + CourtSlot, ShuttleChip, ShuttlesModal (New / Reuse tabs), Stepper, restyled player picker: all on this page only.
- New queries for the top 3 shuttle types and the shuttle types used in a session.
- Start rule: one player on each side.

**Out of scope**
- Any screen other than Create Match and the modals it opens (match detail, session detail, shuttles tab, etc.). No changes to them.
- Remembering locally added shuttle types after leaving the page (deliberately local; see AC6).
- Capping New quantities at remaining stock (known gap in #6 stays open).
- Editing or deleting saved matches.
- Changing the add-shuttle-type form (`components/shuttle/modal.tsx`); "Add a different shuttle" picks an existing type and does not create one.
- Dark theme.

## Acceptance Criteria
- [x] AC1: Behaviour is unchanged apart from the new design and the two process changes in AC4 and AC7. Picking a player for any slot, changing or clearing a slot, adding New / Reused / Free shuttles, and "Start match" saving through `createNewMatch` and returning to the session all work. A match saved with no shuttles still gets one Free shuttle. A placed player can't be picked for a second slot. If no shuttle types exist, the page still says "Add a shuttle first to proceed".
- [x] AC2: Only Create Match and the modals it opens change visually. New service queries are added, but no existing query, schema, or other screen changes. `git diff` touches only the create-match route, `components/session/match/*`, new components under `components/`, and new functions in `services/`.
- [x] AC3: The court matches the design system's Court spec (frame ratio, boundary, singles sidelines, centre line, dashed long-service lines, short-service lines, net with posts and mesh, slots in the four service boxes). An empty slot shows the dashed outline, + icon and "Add player". A filled slot shows the player's Avatar (initials and colour from `players.avatar_colour`), their name, and a fill of that same avatar colour at 30% over `court`. The page title is "New match" with the ShuttleChip top-right. Colours come from theme tokens, not hard-coded hex in screens.
- [x] AC4: "Start match" (sentence case, no "!") is enabled only when at least one player is on the top side (TL or TR, positions 0/2) **and** at least one on the bottom side (BL or BR, positions 1/3). While disabled it uses the disabled style with a caption hint underneath: "Add a player to each side to start" when the court is empty, "Add an opponent to start" when only one side has players.
- [x] AC5: The ShuttleChip shows the number of shuttles currently selected for this match (New quantities + Free count + Reused count), in `clay` / `clay-tint`, switching to `neutral-tint` / `muted` at 0. Tapping it opens the ShuttlesModal.
- [x] AC6: The ShuttlesModal "New shuttle" tab lists Stepper rows in this order: (1) the top 3 shuttle types by number of shuttle instances across all sessions, among types with stock left; if fewer than 3 have history, filled with other in-stock types, newest first; (2) other shuttle types already used in this session's saved matches; (3) types added with "Add a different shuttle"; (4) "Free shuttle". No type appears twice. "Add a different shuttle" opens a bottom drawer (like today's "Select a shuttle" sheet) listing the in-stock types not already shown; picking one adds its row with a count of 1. Rows added this way are local: leaving and reopening Create Match shows only groups (1), (2) and (4). Once a match using that type is saved, the type appears in group (2) for the next match in the session.
- [x] AC7: The modal is a draft. Steppers and Reuse toggles change only the draft; "Done" commits it to the page (ShuttleChip count updates), and "Cancel" or × discards it. Reopening the modal shows the committed selection.
- [x] AC8: Under the header the subtitle reads "N shuttles logged for this session" (correctly pluralised: "1 shuttle logged…"), where N is the number of distinct paid shuttle types used in this session's saved matches. Free shuttles are not counted.
- [x] AC8a: A shuttle row whose type has no stock left (remaining = 0), e.g. a session type in group (2) that has run out, stays visible with a red outline (Gluestack `error` token, since the design system has no destructive colour yet), and its Stepper is disabled (both buttons at 40% opacity). Free shuttle is never out of stock.
- [x] AC9: The "Reuse shuttle" tab lists this session's shuttle instances with their existing labels (e.g. "Yonex AS-50 #2", "Free shuttle #1"). Each can be toggled on or off for this match, and an instance can't be added twice. When the session has no shuttle instances yet, the tab shows a one-line empty state.
- [x] AC10: The player picker uses the design-system modal (`scrim`, `radius-lg`, `modal-title`), with rows showing Avatar + name. Same behaviour as today.
- [x] AC11: All data is live: player names and colours, the shuttle lists, the subtitle count and the chip count update as the user interacts, and they reflect new matches after returning to the page.
- [x] AC12: `npm run lint` and `npx tsc --noEmit` pass. Checked on the iOS Simulator via Expo MCP after `npm run db:fresh` (never on web): fill slots 1v1, 2v1 and 2v2, add New / Free / Reused shuttles, add a different shuttle, save, and confirm that the next match's modal lists that type under this session.

## Required Changes
- **Screen** `app/session/[sessionId]/create-match/index.tsx`: "New match" header + ShuttleChip; Court in place of the bordered boxes and absolutely positioned lines; full-width primary "Start match" + hint (AC4). Keep the existing `onSelect` merge rules for `ShuttleSelection` (New quantities merge by type, Reused deduped by instance), applied on Done.
- **Components (new, under `components/session/match/` or `components/shared/`)**
  - `Court` + `CourtSlot`: props `selectedPlayers`, `players`, `onSelectSlot`; slot order TL, BL, TR, BR maps to `match_players.position`. Reuse `components/shared/Avatar.tsx` and the stored `avatar_colour`.
  - `ShuttleChip`: props `count`, `onPress`.
  - `Stepper`: props `shuttle` (name, colour index cycling `clay`, `primary`, `settled`, `muted`), `value`, `onChange`; minus disabled at 0; `sage` outline when above 0.
  - `ShuttlesModal`: replaces `SelectShuttleModal` / `EditShuttleModal` / `SelectShuttleButton` in `components/session/match/selectShuttleModal.tsx`. Header "Shuttles used" + ×, clay dot + subtitle (AC8), New / Reuse tabs, dashed "Add a different shuttle" row (`primary` text), Cancel (secondary) + Done (primary) in a 2:3 split.
  - Single-colour shuttle glyph to replace `assets/images/shuttlecock.png` on this page.
- **Player picker** `components/session/match/selectUserModal.tsx` / `teamSlot.tsx`: restyle (AC10); `teamSlot.tsx` is replaced by Court/CourtSlot.
- **Queries (new, `services/shuttle.ts` or `services/shuttle_instances.ts`)**
  - Top shuttle types: `COUNT(shuttle_instances)` per `shuttle_id` (non-NULL) across all sessions, joined with inventory remaining > 0, ordered by count desc; fill to 3 with other in-stock types by newest `shuttle_id`.
  - Session shuttle types: distinct non-NULL `shuttle_id` from `shuttle_instances` for the session, with name and remaining (used for the red out-of-stock state); the subtitle count is its length.
  - `Stepper` also takes a `disabled` / out-of-stock flag (AC8a).
  - Reuse the existing `fetchAllShuttlesWithInventory` and `fetchShuttleInstancesBySessionId`.
- **Docs**: update features catalog entries #5 and #6, and add Court / ShuttleChip / Stepper / ShuttlesModal to the built components in `.claude/context/design.md`.
- No schema change, so no DB reset is required beyond `db:fresh` for test data.

## Features Catalog
- **Extends**: #5 Creating a match, #6 Shuttle usage in a match (New / Reused / Free)
- **Closes known gaps**: none. (The Reused tab only appearing after something is already reused, which happens because `alreadyReusedIds.size > 0` gates it, is fixed by AC9 as a side effect.)

## Open Questions
- None. Resolved with the product owner:
  - Start match needs at least one player on each side (any slots).
  - Reuse keeps a tab: "New shuttle" / "Reuse shuttle".
  - Top 3 = most used across all sessions, in stock, filled to 3 with newest in-stock types.
  - The player picker is restyled.
  - Free shuttles don't count toward "N shuttles logged for this session".
  - Out-of-stock rows get a red outline and a disabled stepper.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Court proportions are hard to match exactly in RN layout | Medium | Low | Use percentage positions from the Court spec inside an `aspectRatio: 806/1211` frame |
| Draft vs committed selection drifts (e.g. the stepper lowers a merged New quantity to 0) | Medium | Medium | Hold the draft as a type→count map plus a reused-instance set; on Done, rebuild the `ShuttleSelection[]` from it |
| The new start rule blocks a 1-player "solo" match that was possible before | Low | Low | Intentional; confirmed by the product owner |

---
*Status: COMPLETED — PR #TBD*
