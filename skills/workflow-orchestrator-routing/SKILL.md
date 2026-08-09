---
name: workflow-orchestrator-routing
description: Route tasks across specialist agents with explicit state transitions, bounded retries, and escalation rules. Use when planning multi-agent execution, resolving cross-agent conflicts, or tracking job progression.
---

# Workflow Orchestrator Routing

## Task classification

Classify incoming work before routing:

| Classification | Signals | Route to |
| --- | --- | --- |
| `draft_execution_plans` | "draft plans", "plan only", "create exec plans", "break into execution plans" | `execution-plan-author` |
| `implement_execution_plan` | "run plan", "execute plan", path to `docs/execution-plans/`, dispatcher handoff | `implementation-quality-loop` (single plan scope) |
| `drain_execution_plans` | "drain plans", "next plan", "advance phase", `/execution-plan-dispatch` | `execution-plan-dispatcher` |
| `implementation` | Feature, bug fix, refactor with direct code changes | Full SDLC pipeline |
| `investigation` | Research, explain, diagnose without code changes | Context gathering + report |
| `unknown` | Ambiguous intent | Clarify with operator |

When `draft_execution_plans` is classified, **never** route to implementation stages. Output is markdown under `docs/execution-plans/` only.

When `implement_execution_plan` is classified, scope is **one numbered plan file** — commit with `exec-plan(<phase>): <title>` and delete the plan file when done.

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
