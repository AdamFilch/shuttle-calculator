---
description: "Generate a numbered, implementation-ready PRD ticket ([N]: Title) with acceptance criteria, ready to hand to the developer agent."
argument-hint: "[product/feature idea] (blank = start with questions)"
---

# PRD Command

Produces a **Product Requirements Document** that doubles as a numbered ticket. It captures *what* must be true for success, *why*, the acceptance criteria that prove it, and the changes required to get there. The developer agent implements it and checks its work against the acceptance criteria.

**Input**: `$ARGUMENTS`

## Scope of this command

| This command does | This command does NOT do |
|---|---|
| Frame the problem and users | Write or edit application code |
| Capture success criteria, scope, and acceptance criteria | Create branches or PRs |
| Describe the required changes in as much detail as the user gives | Invent requirements the user did not state |
| Assign a unique ticket ID and write `.claude/prds/{N}-{name}.prd.md` | Implement the ticket (that's the developer agent) |

**Anti-fluff rule**: When information is missing, write `TBD — needs validation via {method}`. Never invent plausible-sounding requirements.

## Ticket IDs

Every PRD gets a unique numeric ticket ID `N`.

- **Heading**: `# [N]: {Title}`
- **Filename**: `.claude/prds/{N}-{kebab-case-name}.prd.md`
- **Next ID**: the highest `N` among files named `{N}-*.prd.md` in `.claude/prds/`, `.claude/prds/completed/`, and `.claude/prds/partial/`, plus 1. If there are none, use 1. Files without a numeric prefix are ignored.

```bash
ls .claude/prds .claude/prds/completed .claude/prds/partial 2>/dev/null | grep -Eo '^[0-9]+-' | tr -d '-' | sort -n | tail -1
```

## Workflow

Four phases. Each phase is a single gate: ask the questions, wait for the user, then move on.

### Phase 1 — FRAME

If `$ARGUMENTS` is empty, ask:

> What do you want to build? One or two sentences.

If provided, restate in one sentence and ask:

> I understand: *{restated}*. Correct, or should I adjust?

Before the framing questions, read the index of `.claude/context/features.md` and only the entries this idea touches. If the feature is already built, say so and ask whether this is a change to it. Note which entry it extends (or that it is new) and any of that entry's known gaps it would close; these go in the PRD's Features Catalog section.

Then ask the framing questions in a single set:

> 1. **Who** has this problem? (specific role or segment)
> 2. **What** is the observable pain? (describe behavior, not assumed needs)
> 3. **Why** can't they solve it with what exists today?
> 4. **Why now?** — what changed that makes this worth doing?

Wait for the user. Do not proceed without answers (or explicit "skip").

### Phase 2 — GROUND

> What evidence do you have that this problem is real and worth solving? (user quotes, support tickets, metrics, observed behavior, failed workarounds — anything concrete)

If the user has none, record the Evidence section as `Assumption — needs validation via {user research | analytics | prototype}`.

### Phase 3 — DECIDE

Ask in a single set:

> 1. **Hypothesis** — Complete: *We believe **{capability}** will **{solve problem}** for **{users}**. We'll know we're right when **{measurable outcome}**.*
> 2. **MVP** — The minimum needed to test the hypothesis?
> 3. **Out of scope** — What are you explicitly **not** building (even if users ask)?
> 4. **Acceptance criteria** — What must be observably true for this ticket to count as done? (each one testable)
> 5. **Required changes** — Which screens, data, and behaviour change? Include as much detail as you have.
> 6. **Open questions** — Uncertainties that could change the approach?

Wait for responses. If the user gives no acceptance criteria, propose a list derived from the MVP and ask them to confirm it.

### Phase 4 — GENERATE

Compute the next ticket ID, create the directory if needed, write the PRD, and report.

```bash
mkdir -p .claude/prds
```

**Output path**: `.claude/prds/{N}-{kebab-case-name}.prd.md`

#### PRD Template

```markdown
# [{N}]: {Product / Feature Name}

## Problem
{2–3 sentences: who has what problem, and what's the cost of leaving it unsolved?}

## Evidence
- {User quote, data point, or observation}
- {OR: "Assumption — needs validation via {method}"}

## Users
- **Primary**: {role, context, what triggers the need}
- **Not for**: {who this explicitly excludes}

## Hypothesis
We believe **{capability}** will **{solve problem}** for **{users}**.
We'll know we're right when **{measurable outcome}**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| {primary} | {number} | {method} |

## Scope
**MVP** — {the minimum to test the hypothesis}

**Out of scope**
- {item} — {why deferred}

## Acceptance Criteria
<!-- Each item must be observable and verifiable. The developer agent ticks these off with evidence. -->
- [ ] AC1: {observable, testable condition}
- [ ] AC2: {observable, testable condition}

## Required Changes
<!-- Screens, data, and behaviour that change. As detailed as the user provided. -->
- {change}

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
```

#### Report to user

```
PRD created: [{N}]: {Title}
File:        .claude/prds/{N}-{name}.prd.md

Problem:    {one line}
Hypothesis: {one line}
MVP:        {one line}

Acceptance criteria: {count}
Open questions:      {count}

Next step: use the developer agent on .claude/prds/{N}-{name}.prd.md
```

## Success criteria

- **ID_UNIQUE**: the ticket ID is higher than every existing numbered PRD, and it appears in both the heading and the filename.
- **PROBLEM_CLEAR**: the problem is specific and evidenced (or flagged as an assumption).
- **USER_CONCRETE**: the primary user is a specific role, not "users".
- **SCOPE_BOUNDED**: there is an explicit MVP and an explicit out-of-scope list.
- **CRITERIA_TESTABLE**: every acceptance criterion can be verified by observation or by running something.
