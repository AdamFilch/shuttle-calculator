---
name: drill-me
description: Drill the user with picker questions (Recommended option first, then alternatives, then "Type something") until every decision in a plan, feature, or idea is settled, and keep a Decision Log of the answers. Use when the user says "drill me", runs /drill-me, or when another command (such as /plan-prd) asks to drill.
argument-hint: "[idea, plan, or feature to drill] (blank = ask what to drill)"
---

# Drill me

Question the user until you both fully understand the topic. Ask the questions through the **AskUserQuestion** picker, never as a numbered text list for the user to answer in one reply. Record every settled decision in a **Decision Log**.

**Topic**: `$ARGUMENTS`. If it is empty, ask what to drill in one picker question, with a few likely topics from the conversation as options.

## The design tree

Treat the topic as a **design tree**: each decision branches into the decisions that depend on it. The **frontier** is every open decision whose prerequisites are already settled, meaning the questions you can ask *now* without guessing at answers you haven't heard yet. If a question depends on another question still open in the same round, it belongs to a later round.

Work in rounds:

1. Work out the frontier.
2. Settle what you can yourself (see "Who decides").
3. Ask the rest with the picker.
4. Add every answer to the Decision Log.
5. Recompute the frontier. Answers often open new branches, and those become the next round.

**There is no limit on the total number of questions.** Keep drilling round after round until the frontier is empty and nothing is silently assumed. Never stop early or merge decisions to save questions. The only cap is technical: one AskUserQuestion call holds at most 4 questions, so split a frontier with more than 4 questions across back-to-back calls in the same round.

## Asking a question

- Ask **one decision per question**. The `header` is a short chip (12 characters or fewer), e.g. "Shuttle UI", "Schema", "Undo".
- Give 2–4 options. Put the **recommended option first** with ` (Recommended)` at the end of its label. Each option's `description` states the trade-off: what you gain and what it costs.
- Never add an "Other" or "Type something" option yourself; the picker adds it automatically.
- Use `preview` when the options are concrete things to compare side by side: an ASCII screen mockup, a table/column sketch, a function signature, a flow. Previews only work on single-select questions.
- Use `multiSelect: true` only when the choices are not mutually exclusive (e.g. "Which of these edge cases must be handled in this ticket?").
- Phrase the question so the user can answer it without opening the code. Include the context they need in the question itself.

## Facts are your job, decisions are the user's

- Never ask the user for a fact you can look up. Read the code, the schema, the project's context docs (product brief, features catalogue, design decisions), or send an Explore agent. A frontier question that waits on a lookup is blocked only until the lookup finishes. Ask the other frontier questions meanwhile.
- When a fact changes the options (e.g. "this table already has a `status` column"), mention it in the question text.

## Who decides

Decide a question yourself only when it is **straightforward**:

- the existing code already sets the pattern (same kind of screen, service function, or query already exists), or
- there is one conventional answer and the alternatives would be odd.

Log each of these as `Claude — straightforward`, with the reason and the file that sets the pattern, so the user can veto it at review.

**Always ask** about anything that touches:

- product behaviour the user will see
- money, charges, settlement, or rounding
- the shape of stored data (new tables or columns, what is derived vs stored)
- deleting or irreversibly changing data
- a real trade-off where reasonable people would pick differently

If you're unsure whether a question is straightforward, ask it.

## Decision Log

Keep one running table. Number decisions in the order they were settled.

```markdown
| #  | Decision | Choice | Why | Decided by |
|----|----------|--------|-----|------------|
| D1 | Where the shuttle picker lives | Bottom-sheet modal | Matches the court-booking modal; keeps the court view visible | User |
| D2 | Where the new query lives | `services/match.ts` | Every match query already lives there | Claude — straightforward |
```

- **Choice**: the option picked. For a "Type something" answer, restate it in one plain line.
- **Why**: the deciding reason, in a few words.
- When a later answer overturns an earlier decision, edit that row and note "revised in round N" rather than adding a contradicting row.

## Finishing

When the frontier is empty:

1. Show the full Decision Log, including every `Claude — straightforward` row.
2. Ask one last picker question: **"Log looks right (Recommended)"** / **"Revisit a decision"**. If the user wants to revisit, ask which decision, re-drill that branch and anything that depended on it, then ask the final question again.
3. Do not act on the decisions (write code, write files) until the user confirms the log.

When the drill is run on its own (`/drill-me`), finish by printing the confirmed Decision Log. When another command started it (e.g. `/plan-prd`), hand the confirmed log back to that command and continue its workflow.
