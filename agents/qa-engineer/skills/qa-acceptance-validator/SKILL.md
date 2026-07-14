---
name: qa-acceptance-validator
description: Validate changes against acceptance criteria, classify defects by severity and reproducibility, and produce clear approve/reject decisions. Use when executing QA checks, regression review, or release-readiness validation.
---

# QA Acceptance Validator

## Workflow

1. Map acceptance criteria to executable checks.
2. Run required validation suite and record evidence.
3. Classify failures: deterministic, flaky, or environment-specific.
4. Produce defect reports with reproducible steps.
5. Return approval decision and retest requirements.

## Defect report format

```markdown
## Defect
- Severity: critical|high|medium|low
- Reproducibility: always|intermittent|unknown
- Acceptance criterion impacted:
- Environment:

### Steps to reproduce
1. ...
2. ...

### Expected
...

### Actual
...

### Evidence
- test output / logs
```

## Decision format

`approved` | `rejected` | `needs_retest` with short rationale.

## Guardrails

- Block only on evidence-backed failures.
- Distinguish product defects from environment failures.
- Avoid inflated confidence; flag unknowns clearly.
