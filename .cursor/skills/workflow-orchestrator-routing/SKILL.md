---
name: workflow-orchestrator-routing
description: Route tasks across specialist agents with explicit state transitions, bounded retries, and escalation rules. Use when planning multi-agent execution, resolving cross-agent conflicts, or tracking job progression.
---

# Workflow Orchestrator Routing

## Routing process

1. Classify task type and required artifacts.
2. Select next specialist agent by policy and confidence.
3. Define handoff contract (inputs, expected outputs, timeout).
4. Record transition rationale and retry budget status.
5. Escalate when blockers exceed policy thresholds.

## State update template

```markdown
## State transition
- jobId:
- from:
- to:
- selected agent:
- rationale:

## Handoff contract
- required inputs:
- expected output:
- timeout:

## Retry and escalation
- retries used / budget:
- blocker:
- escalation target:
```

## Conflict resolution

When specialist outputs conflict:
1. isolate exact disagreement,
2. request targeted reconciliation from the narrowest owner (use `suggestedRole` tags for **`internal_clarification`** routing),
3. escalate to human ticket only if still unresolved after self-resolution and bounded internal rounds.

## Guardrails

- Keep retries bounded to control latency and cost.
- Do not bypass mandatory human approvals.
- Minimize cross-agent data sharing to least-required context.
- Prefer agent-resolved recommendations over human tickets for engineering and standards questions; human input is for product intent, compliance, ownership, and true unknowns.
