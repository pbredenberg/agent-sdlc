---
name: business-analyst-requirements-pack
description: Convert tickets, notes, and transcripts into a normalized requirements package with traceability, assumptions, and open questions. Use when user asks for requirement synthesis, acceptance criteria prep, or stakeholder-ready requirement artifacts.
---

# Business Analyst Requirements Pack

## Workflow

1. Extract source facts from ticket and transcript evidence.
2. Normalize into a clear problem statement and business goal.
3. Separate facts from assumptions.
4. Identify missing constraints, dependencies, and ambiguities.
5. Produce a requirement package ready for architecture and implementation.

## Required output format

```markdown
## Problem statement
<single concise objective>

## Scope
- In scope:
- Out of scope:

## Requirements
1. ...
2. ...

## Non-functional constraints
- Performance:
- Security/privacy:
- Reliability:

## Assumptions
- ...

## Open questions
- ...

## Traceability map
- Requirement R1 <- source note/transcript reference
- Requirement R2 <- source note/transcript reference
```

## Guardrails

- Do not invent policy or compliance statements.
- Keep implementation details out of business requirements.
- **Self-resolve** from ticket, memory, and profile before escalation; record inferences as assumptions.
- When evidence conflicts after self-resolution, present alternatives and request owner decision with `suggestedRole: human`.
- Keep source-linked traceability for each critical requirement.
