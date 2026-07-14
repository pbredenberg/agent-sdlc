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
5. Prepare QA handoff notes with residual risks.

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
