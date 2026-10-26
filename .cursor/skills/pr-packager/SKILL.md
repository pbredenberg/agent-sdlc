---
name: pr-packager
description: Prepare review-ready pull requests with clear rationale, risk notes, and test plan while preserving repository policies. Use when creating PR titles/bodies, changelog notes, reviewer assignment guidance, or release metadata updates.
---

# PR Packager

## Workflow

1. Confirm all required checks and approvals are present.
2. Summarize the change in reviewer-first language.
3. Produce structured PR body with validation evidence.
4. Call out risks, migration notes, and rollback guidance.
5. Include ticket linkage and reviewer expectations.

## PR body template

```markdown
## Summary
- ...

## Why
- ...

## Changes
- ...
- AGENTS.md: created | updated | unchanged (when applicable)

## Test plan
- [ ] Command/result 1
- [ ] Command/result 2

## Risks
- ...

## Rollback
- ...

## Linked work
- Ticket:
```

## Guardrails

- Never include secrets or sensitive logs in PR text.
- Respect branch protection and required-review policies.
- Keep claims grounded in executed validation evidence.
