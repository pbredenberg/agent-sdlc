---
name: security-change-review
description: Perform security-focused review of code and pipeline changes, rank findings by exploitability, and provide actionable remediations. Use when reviewing release candidates, dependency updates, access controls, or secret-handling paths.
---

# Security Change Review

## Workflow

1. Identify assets, trust boundaries, and attack surfaces touched by changes.
2. Check for secrets exposure, authz/authn weaknesses, and unsafe defaults.
3. Review dependency and configuration risk signals.
4. Rank findings by severity and exploitability evidence.
5. Define required remediations and residual risk statement.

## Finding format

```markdown
## Finding: <title>
- Severity: critical|high|medium|low
- Exploitability: confirmed|likely|possible|unclear
- Affected area:
- Evidence:
- Impact:
- Required remediation:
- Verification step:
```

## Decision states

`approved` | `approved_with_risk` | `blocked`

## Guardrails

- Never expose secrets or credentials in outputs.
- Separate confirmed issues from speculative concerns.
- Require explicit remediation for blocking findings.
