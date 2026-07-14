---
name: architecture-slice-planner
description: Convert approved requirements into architecture decisions, interface contracts, and phased implementation slices with explicit trade-offs. Use when planning components, integration boundaries, or architecture-level sequencing.
---

# Architecture Slice Planner

## Workflow

1. Restate requirements and non-functional constraints.
2. Propose 2-3 options with trade-offs.
3. Choose a preferred option with rationale.
4. Define interface contracts and data-flow boundaries.
5. Break work into ordered slices with dependency notes.

## Output template

```markdown
## Architecture decision
- Decision:
- Context:
- Constraints:

## Options
1. Option A - pros / cons
2. Option B - pros / cons

## Selected approach
- Rationale:
- Risks:
- Rollback or migration path:

## Interfaces
- Component:
  - Inputs:
  - Outputs:
  - Failure behavior:

## Implementation slices
1. Slice 1 (owner, dependencies, done criteria)
2. Slice 2 ...
```

## Guardrails

- Keep recommendations aligned with current project phase constraints.
- Avoid speculative abstractions not needed by current requirements.
- **Self-resolve engineering trade-offs** in `tradeoffLog` with `selected` + `rationale`; prefer `status: ready`.
- Use `needs_decision` only when product intent, compliance, ownership, or unresolvable contradictions remain after ticket + memory + profile + code context + best-practice review — tag options with `suggestedRole`.
