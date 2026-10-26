---
name: implementation-quality-loop
description: Drive implementation through a tight loop of coding, testing, defect isolation, and concise change notes. Use when delivering feature slices, fixing regressions, or preparing changes for QA handoff.
---

# Implementation Quality Loop

## Workflow

1. Confirm acceptance criteria and scope boundaries.
2. Implement smallest viable change set.
3. Run tests/lint/typecheck relevant to changed behavior.
4. Fix failures with root-cause-first reasoning.
5. If commands, layout, or conventions changed, flag `agents-md-author` for re-check before QA handoff.
6. Prepare QA handoff notes with residual risks.

## Executing a numbered plan

When implementing a plan from `docs/execution-plans/<phase>/NN-*.md`:

1. Read the plan file and phase README; scope work to that plan only.
2. Implement deliverables per plan acceptance criteria.
3. Run project test/lint/typecheck commands listed in the plan.
4. Create **one** git commit: `exec-plan(<phase>): <title>` (from plan frontmatter).
5. Delete the plan file and update the phase README index in the same change.
6. Do not start other pending plans in the same commit.

See [execution-plans.md](../references/execution-plans.md).

## Output template

```markdown
## Change summary
- Scope:
- Why:

## Validation
- Commands run:
- Results:

## Known risks
- ...

## Handoff to QA
- Scenarios to verify:
- Areas likely to regress:
```

## Guardrails

- Do not redefine acceptance criteria.
- Keep diffs minimal and cohesive.
- Never bypass required checks to force green output.
- If architecture assumptions break, escalate instead of guessing.
