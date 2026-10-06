---
description: "Drill a feature idea with picker questions, then write a numbered PRD ([N]: Title) that is also a full feature spec: decision log, data model, writers, readers, flows, blast radius, acceptance criteria."
argument-hint: "[product/feature idea] (blank = start with questions)"
---

# PRD Command

Produces a **Product Requirements Document** that is both a numbered ticket and a full **feature spec**. It records:

- **what** must be true for success, and **why**
- **every decision** you and the user made along the way (the Decision Log)
- **how** the feature works: data model, state, who writes and reads the data, flows, and what breaks if you change it
- the **acceptance criteria** that prove it is done

The developer agent implements it and checks its work against the acceptance criteria.

**Input**: `$ARGUMENTS`

## Scope of this command

| This command does | This command does NOT do |
|---|---|
| Frame the problem and users | Write or edit application code |
| Drill the user on every open decision (via the `drill-me` skill) | Create branches or PRs |
| Read the code the idea touches so the spec names real tables, functions and files | Invent requirements the user did not state |
| Capture scope, decisions, spec and acceptance criteria | Implement the ticket (that's the developer agent) |
| Assign a unique ticket ID and write `.claude/prds/{N}-{name}.prd.md` | |

**Anti-fluff rule**: When information is missing, write `TBD — needs validation via {method}`. Never invent plausible-sounding requirements.

**Questions**: every question to the user goes through the AskUserQuestion picker (recommended option first, alternatives after it, and the picker's own "Type something"). Never send a numbered list of questions for the user to answer in one reply.

## Ticket IDs

Every PRD gets a unique numeric ticket ID `N`.

- **Heading**: `# [N]: {Title}`
- **Filename**: `.claude/prds/{N}-{kebab-case-name}.prd.md`
- **Next ID**: the highest `N` among files named `{N}-*.prd.md` in `.claude/prds/`, `.claude/prds/completed/`, and `.claude/prds/partial/`, plus 1. If there are none, use 1. Files without a numeric prefix are ignored. Check every local branch too (`git ls-tree`), because a PRD may be on a branch that hasn't merged yet.

```bash
{ ls .claude/prds .claude/prds/completed .claude/prds/partial 2>/dev/null; for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do git ls-tree -r --name-only "$b" -- .claude/prds 2>/dev/null | xargs -n1 basename; done; } | grep -Eo '^[0-9]+-' | tr -d '-' | sort -n | tail -1
```

## Workflow

### Phase 1 — FRAME

If `$ARGUMENTS` is empty, ask in plain text: *What do you want to build? One or two sentences.* Otherwise restate the idea in one sentence and confirm it with a picker question: **"Correct (Recommended)"** / **"Adjust"**.

Read for context:

- `.claude/context/product.md`: the product brief.
- `.claude/context/design.md`: design system link and decision log.
- The index of `.claude/context/features.md`, then only the entries this idea touches. If the feature is already built, say so and ask whether this is a change to it. Note which entry it extends (or that it is new) and any of that entry's known gaps it would close.

Decide the ticket type, and ask with the picker only if it's unclear:

- **Feature**: a new capability, or a problem to solve. The drill covers problem, users, evidence and hypothesis too.
- **Change**: a design change, restyle, or adjustment to something already built. Skip problem, evidence, hypothesis and success metrics. The **Summary** carries what changes and why.

### Phase 2 — EXPLORE

Read the code the idea touches before asking anything about it:

- the schema in `services/database.js`
- the service functions in `services/*.ts` that read or write the affected tables
- the screens under `app/` and the components under `components/` that show or change the data

For a wide area, use an Explore agent. The goal is that the drill only asks real decisions, never facts, and that the spec sections name real tables, columns, functions and files.

### Phase 3 — DRILL

Invoke the **`drill-me`** skill on the framed idea, with what Phase 1 and 2 found as context. Seed the design tree with these branches, and skip a branch when it doesn't apply to the ticket:

1. **Problem and users** (feature tickets only): who has the problem, the observable pain, why existing features don't solve it, why now, evidence, hypothesis.
2. **Scope**: the MVP, and what is explicitly out of scope and why.
3. **Behaviour**: what the user sees and does, screen by screen, including empty, error and loading states.
4. **Data model**: new or changed tables and columns, what is stored vs derived, constraints, and whether a database reset is needed.
5. **State**: the states a record moves through, what moves it, and what is blocked in each state.
6. **Writers**: which service functions create or change data, their pre-conditions, edge cases, and what they must *not* write.
7. **Readers**: which queries and screens consume the data.
8. **Money**: anything touching charges, settlement, splitting or rounding. Always ask the user about these, never decide them yourself.
9. **Acceptance criteria**: propose a list derived from the decisions, then confirm it with a `multiSelect` picker question ("Keep these criteria") plus "Type something" for additions.

The drill ends when `drill-me` reports an empty frontier and the user confirms the Decision Log.

### Phase 4 — GENERATE

Compute the next ticket ID, then write the PRD from the template below.

```bash
mkdir -p .claude/prds
```

**Output path**: `.claude/prds/{N}-{kebab-case-name}.prd.md`

**Writing rules**

- **Write like a spec, not a form.** Open with an intro that explains what the feature is and how it behaves, in plain prose. Write the rest in short sentences, with tables for anything with columns and `└─►` trees for flows.
- **Drop sections that don't apply.** Sections marked *(optional)* are left out entirely when they have no content, e.g. a pure restyle has no Data Model, State Machine or Writers. Never leave an empty heading or a "N/A".
- **Ground everything.** Every table, column, function and file named must either exist today (checked in Phase 2) or be marked **new** in the text. Links are repo-relative.
- **The Decision Log goes in verbatim**, with the `Claude — straightforward` rows included.
- Required Changes stays a practical checklist for the developer, pointing back to the spec sections rather than repeating them.

**How the spec vocabulary maps to this app**

| Spec term | In this app |
|---|---|
| Collection / record | SQLite table in `services/database.js`, row |
| Endpoint, hook, mutation | Service function in `services/*.ts` (often in a transaction) |
| HTTP error / rejection | Validation result, disabled button, or on-screen error message |
| Virtual / computed field | Value computed in the SQL query or in TypeScript, not stored |
| Frontend query + component | Service read function + the screen/component under `app/` or `components/` that calls it |
| Access control | Usually none (local-only, single user); only include if the ticket adds a guard such as `__DEV__` |

#### PRD Template

````markdown
# [{N}]: {Feature Name}

{Intro, 1–2 paragraphs: what this feature is, who uses it and when, and how it behaves end to end. Plain prose, no bullet points.}

## Summary
{One paragraph: what changes, why, and what stays the same.}

## Users
- **Primary**: {role, context, what triggers the need}
- **Not for**: {who this explicitly excludes}

## Problem
<!-- Feature tickets only. Drop this section, Evidence, Hypothesis and Success Metrics for a change ticket. -->
{2–3 sentences: who has what problem, and what's the cost of leaving it unsolved?}

## Evidence
- {User quote, data point, or observation | "Assumption — needs validation via {method}"}

## Hypothesis
We believe **{capability}** will **{solve problem}** for **{users}**.
We'll know we're right when **{measurable outcome}**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|

## Scope
**MVP**
- {item}

**Out of scope**
- {item} — {why deferred}

---

## Table of Contents
<!-- Only the sections actually present below. -->
1. [Decision Log](#decision-log)
2. [Overview](#overview)
3. …

---

## Decision Log
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | {decision} | {choice} | {reason} | User |
| D2 | {decision} | {choice} | {reason, file that sets the pattern} | Claude — straightforward |

## Overview
{The key record(s) and how they relate, in 2–4 sentences.}

Questions the data answers:
1. **{Question the UI needs answered}** → {the column, query or condition that answers it}

Non-obvious design decisions:
1. **{Decision in bold.}** {Why, what it enables, and what would break if it were done the other way. Link the D# it came from.}

## Data Model  *(optional)*
### `{table}` table  ({new | changed | unchanged, for reference})
> Source: [services/database.js](services/database.js)

| Column | Type | Stored | Default | Description |
|---|---|---|---|---|
| `{column}` | {INTEGER / TEXT / REAL, FK → table} | yes / **derived** | {default} | {meaning; mark **new** columns} |

**Constraints:** {unique, foreign keys, cascade behaviour}
**Reset needed:** {yes, run `npm run db:fresh` | no}

### Supporting tables
| Table | Purpose in this feature |
|---|---|

## State Machine  *(optional)*
```
[state_a] ──► [state_b] ──► [state_c]
     ▲             │
     └─────────────┘  {transition}
```

| Condition | State |
|---|---|

**{Action} is blocked when:** {condition}

## Writers  *(optional)*
### {n}. {What the user does} → `{functionName}`
> Source: [services/{file}.ts](services/{file}.ts)

**Trigger:** {screen and control that calls it}

**What it does:**
1. {step}

**Pre-conditions:**
| Check | What the user sees if it fails |
|---|---|

**Edge cases:**
- {edge case and the behaviour}

**Does not write:** {tables/columns it must leave alone}

## Readers  *(optional)*
### `{functionName}`
> Source: [services/{file}.ts](services/{file}.ts)

**Returns:** {fields}. **Why:** {what needs it}

| Consumer | File |
|---|---|

## End-to-End Flows
### Happy path: {name}
```
User {does something}
  └─► {function}
        ├─ {check}
        ├─ {write}
        └─ {result shown}
```

### Edge case: {name}
```
…
```

## Blast Radius
| Change | What breaks |
|---|---|
| {renaming / removing / changing X} | {consequence} |

## File Reference
| File | Role |
|---|---|
| [{path}]({path}) | {role; mark **new** files} |

---

## Acceptance Criteria
<!-- Each item must be observable and verifiable. The developer agent ticks these off with evidence. -->
- [ ] AC1: {observable, testable condition}
- [ ] AC{n}: `npm run lint` and `npx tsc --noEmit` pass, and the change is checked on the iOS Simulator via Expo MCP (after `npm run db:fresh` if the data model changed). Never checked on web.

## Required Changes
<!-- Practical checklist for the developer. Point to the spec sections above instead of repeating them. -->
- **{Area}**: {change} (see [Writers §{n}](#writers))

## Features Catalog
<!-- From .claude/context/features.md. The developer agent updates these entries when the ticket ships. -->
- **Extends**: {#N Feature name} | New feature
- **Closes known gaps**: {gap, quoted from the entry} | none

## Open Questions
- [ ] {question that could change scope or approach}

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

---
*Status: READY — ticket [{N}]*
````

#### Report to user

```
PRD created: [{N}]: {Title}
File:        .claude/prds/{N}-{name}.prd.md

Summary:     {one line}
MVP:         {one line}
Decisions:   {count} ({user count} by you, {claude count} straightforward by Claude)
Spec:        {sections included, e.g. Data Model, Writers, Flows, Blast Radius}

Acceptance criteria: {count}
Open questions:      {count}

Next step: use the developer agent on .claude/prds/{N}-{name}.prd.md
```

## Success criteria

- **ID_UNIQUE**: the ticket ID is higher than every existing numbered PRD, and it appears in both the heading and the filename.
- **ASKED_VIA_PICKER**: every question went through AskUserQuestion, and the drill ran until the frontier was empty.
- **DECISIONS_LOGGED**: every non-trivial choice has a D# row saying who decided it. Money and data-shape decisions were made by the user.
- **PROBLEM_CLEAR**: the problem is specific and evidenced (or flagged as an assumption). For a change ticket, the Summary says what changes and what stays the same.
- **USER_CONCRETE**: the primary user is a specific role, not "users".
- **SCOPE_BOUNDED**: there is an explicit MVP and an explicit out-of-scope list.
- **SPEC_GROUNDED**: every file, table, column and function named exists today or is marked **new**.
- **SECTIONS_PRUNED**: no empty or "N/A" sections.
- **CRITERIA_TESTABLE**: every acceptance criterion can be verified by observation or by running something.
