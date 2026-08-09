---
name: devops-operations-readiness
description: Build and review CI/CD, rollout, rollback, and observability plans for production changes. Use when the task involves deployment pipelines, release safety, incident handling, runtime reliability, or environment promotion.
---

# DevOps Operations Readiness

## Workflow

1. Classify the change: app code only, infra only, or mixed.
2. Verify required gates: lint, typecheck, tests, security checks, and migration checks.
3. Produce rollout plan with blast-radius and rollback steps.
4. Confirm telemetry: logs, metrics, and alert thresholds for changed paths.
5. Emit go/no-go with blockers and owner-specific next actions.

## Required output format

Use this template:

```markdown
## Deployment readiness
- Change type:
- Target environment:
- Risk level: low|medium|high

## Quality gates
- [ ] Lint
- [ ] Typecheck
- [ ] Tests
- [ ] Security checks
- [ ] Migration safety

## Rollout and rollback
- Rollout strategy:
- Rollback trigger:
- Rollback command/procedure:

## Observability
- New/updated logs:
- New/updated metrics:
- New/updated alerts:

## Decision
- Status: ready|blocked|degraded
- Blockers:
```

## Guardrails

- Never suggest bypassing protected branches or required checks.
- Never place secrets in workflow files, logs, or examples.
- Prefer deterministic, reversible deployment steps.
- If environment assumptions are missing, mark `blocked` and request specifics.
