# Specs

Lightweight spec-driven development. Each feature gets a short spec that a human approves before any code is
written, and the spec stays the source of truth while the feature is built.

## Layout

```
SPECS/
  README.md          how we work (this file)
  CHANGELOG.md       agent work log, newest first
  {NNN}-{part}-{feature}/
    spec.md          what and why
    plan.md          how
    task.md          the checklist being worked
```

- `NNN` is a zero-padded sequence number in build order (`001`, `002`, ...).
- `part` is `a` or `b`. A folder is a feature, not a whole test part.
- `feature` is a short kebab-case name, for example `001-a-subscription-overview`.

## Lifecycle

1. **Discuss.** Human and agent agree on the direction in conversation. Open product questions are settled here,
   not in code.
2. **Spec.** The agent writes `spec.md` with status `Draft`. The human reviews it, and it becomes `Approved`.
3. **Plan and tasks.** The agent writes `plan.md` and `task.md`. The human reviews them before implementation starts.
4. **Build.** The agent works through `task.md` one task at a time. After each completed task, it:
   - runs `npm run check` and fixes every failure
   - ticks the task in `task.md`
   - adds an entry to `CHANGELOG.md`
5. **Edge cases.** After the core functionality works, the agent asks the human which edge cases and e2e flows to
   cover. Those become new tasks.
6. **Done.** All tasks are ticked, `check` is green, and the spec status is `Implemented`.

## Rules

- **Spec first.** If the code needs to diverge from the spec, update the spec (and say so in the log) before
  changing the code. Never let them drift silently.
- **Traceability.** Requirements are numbered (`R1`, `R2`, ...). Tasks and tests reference the requirement they
  cover.
- **Be honest about limits.** Anything simulated, faked or not covered goes under _Known limitations_ in the spec.
- **Small tasks.** A task should be reviewable in one sitting and leave `check` green.

## spec.md

```md
# NNN: Feature name

Status: Draft | Approved | Implemented

## Problem

Who it is for and why it matters.

## Requirements

- R1 ...

## Acceptance criteria

- [ ] R1: Given / when / then ...

## Out of scope

## Known limitations

## Open questions
```

## plan.md

Approach, component and state shape, files touched, testing strategy (unit vs e2e vs a11y), and risks.

## task.md

```md
- [ ] T1 (R1, R2): short imperative description
```

## CHANGELOG.md entries

Newest entry on top. Keep entries short and factual:

```md
## YYYY-MM-DD: NNN-part-feature / T3: summary

- **Changed:** files and what changed
- **Decisions:** anything non-obvious, and why
- **Verified:** what was run or checked, and the result
```
