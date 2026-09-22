# Web Not-Available Notice

## Problem
The web build of Shuttle Calculator is currently non-functional: `expo-sqlite`'s web implementation crashes (a `SharedArrayBuffer` error tied to how every service file opens its database connection). Right now, anyone who opens the app in a browser hits a broken, crashing experience instead of a clear signal that web isn't supported yet.

## Evidence
Directly observed this session, not an assumption: reproduced a Metro bundling failure (unresolved `.wasm` import), then a server-rendering/Worker incompatibility, then a persistent `SharedArrayBuffer` runtime crash traced to `openDatabaseSync` calls used across all 9 `services/*.ts` files plus `services/database.js`. Fixing that properly is separate, deferred work.

## Users
- **Primary**: the developer, and any early visitor who opens the app via a browser/web link instead of the mobile app, before web is officially supported.
- **Not for**: mobile app users (iOS/Android) — this change has no effect on native platforms.

## Hypothesis
We believe **replacing the web build with a static notice** will **prevent visitors from hitting a broken/crashing app on web** for **anyone who opens the app via a browser**.
We'll know we're right when the web build renders only the static notice, executes no app or database code, and produces no console errors.

## Success Metrics
This is a personal project, so the bar is functional correctness rather than a growth metric:
| Metric | Target | How measured |
|---|---|---|
| Web build renders without JS errors | 0 console errors on load | Manual browser check (Chrome DevTools console) |
| No app/database code executes on web | `setupDatabase()` and the tab navigator never run on web | Code review of the root layout's platform branch |

## Scope
**MVP** — On web only, render a single static screen: a centered "Not available on Web" message plus one short line explaining why (e.g. "Web support is coming soon — please use the mobile app for now"). Nothing else loads on web: no tab bar, no navigation, no database initialization.

**Out of scope**
- Fixing the underlying `expo-sqlite`/web `SharedArrayBuffer` compatibility issue — separate, deferred work per the user's own plan ("other plans to fix before I can let it work")
- Any richer web experience (marketing page, app store links, waitlist signup) — no published store listings to link to yet
- Ads/monetization — unrelated, separate thread
- Responsive/tablet-web nuance — web is fully blocked regardless of screen size

## Delivery Milestones
| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Static notice page on web | Visiting the app via any browser shows only the centered message + reason line; no app code runs | pending | — |
| 2 | Re-enable full web support | Once the `expo-sqlite`/web `SharedArrayBuffer` issue is resolved, restore the real app on web | pending | — |

## Open Questions
- [ ] Should the notice use the app's existing teal branding/theme, or stay plain/minimal? (leaning minimal, given the chosen "message + short reason" content — confirm during `/plan`)
- [ ] Should the block apply to `npm run web` dev builds too, or only production/exported web builds? (assumed: both, since the request said web is "not compatible" without qualification)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Blocking web regresses any web-based testing/demo workflow the developer relies on | Low | Low | Explicitly requested; a single platform conditional is easy to revert |
| The gate is placed too late (after some service/database import already ran) | Medium | Medium | `/plan` should gate at the earliest point — the root layout — before any service import executes |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
