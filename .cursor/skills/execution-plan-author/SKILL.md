---
name: execution-plan-author
description: >-
  Draft numbered execution plans under docs/execution-plans/ with dependency and
  parallel metadata. Use when the operator asks to draft execution plans, create
  exec plans, plan only, or break work into phased plans without implementing.
---

# Execution Plan Author

You are **drafting execution plans only**. Never implement application code, tests, or configs outside `docs/execution-plans/`.

## Triggers

Use this skill when the operator says:

- "draft execution plans"
- "create exec plans"
- "plan only"
- "break this into execution plans"
- "write the plans, don't implement"

## Hard rules

1. **Draft only** — output lives under `docs/execution-plans/<phase>/` and nowhere else.
2. **Never implement** — do not edit `src/`, application tests, configs, or infrastructure.
3. **One plan per deliverable slice** — each numbered plan is independently shippable by a fresh agent.
4. **Acyclic dependencies** — validate the DAG has no cycles before finishing.
5. **Explicit parallelism** — mark plans that may run concurrently with `parallel_group`.

## Workflow

1. Confirm phase name (kebab-case, e.g. `rate-limit-api`).
2. Gather requirements from ticket, prior BA/architecture artifacts, or operator context.
3. Decompose into ordered slices with clear `depends_on` edges.
4. Identify parallel batches (plans with the same satisfied dependencies).
5. Write phase `README.md` with plan index, dependency graph, and handoff template.
6. Write numbered plan files `NN-slug.md` with YAML frontmatter.
7. For foundation/scaffold phases, include "Create or verify root `AGENTS.md`" in the first plan's steps and acceptance criteria.
8. Summarize: plan count, execution order, parallel batches, open questions.

## Phase layout

```text
docs/execution-plans/
  <phase>/
    README.md
    01-slug.md
    02-slug.md
    ...
```

## Plan file format

Each `NN-slug.md` must start with YAML frontmatter:

```yaml
---
id: "02-add-rate-limit-middleware"
title: "Add rate limit middleware"
depends_on: ["01-add-rate-limit-schema"]
parallel_group: null
---
```

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Unique within phase; conventionally matches file slug |
| `title` | yes | Short human-readable title for commit messages |
| `depends_on` | yes | List of plan `id` values that must complete first; `[]` if none |
| `parallel_group` | no | Same value = may run together when all deps are satisfied; `null` if sequential |

Plan body sections:

```markdown
## Objective
<what this plan delivers>

## Scope
- In scope:
- Out of scope:

## Steps
1. ...

## Acceptance criteria
- [ ] ...

## Validation
- Commands to run after implementation (discover from project profile)

## Commit message
exec-plan(<phase>): <title>
```

## Phase README format

The phase `README.md` must include:

1. **Overview** — goal and constraints
2. **Plan index** — table with columns: `id`, file, `depends_on`, `parallel_group`, status
3. **Dependency graph** — mermaid diagram or bullet list of order + parallel batches
4. **Handoff prompt** — fenced `text` block with `NN-....md` placeholder:

````markdown
## Handoff prompt

```text
Execute ONLY this execution plan: docs/execution-plans/<phase>/NN-....md

Before changing code:
1. Read the plan file and phase README.
2. Implement only what the plan specifies.
3. Run project test/lint/typecheck when applicable.
4. Create one git commit: exec-plan(<phase>): <title>
5. Delete this plan file and update the phase README index.
6. Never put secrets in LLM context.
```
````

## Dependency validation

Before finishing, verify:

- Every `depends_on` entry references a valid `id` in the same phase
- No plan depends on itself
- The graph is acyclic (topological sort succeeds)
- Parallel groups only contain plans with identical dependency sets

## References

- [plan-template.md](references/plan-template.md) — copy-paste plan skeleton
- [manifest-guide.md](references/manifest-guide.md) — dependency and parallelism patterns

## Output summary

Finish with:

```markdown
## Execution plan draft summary
- Phase:
- Plans created:
- Execution order:
- Parallel batches:
- Open questions:
```
