# Orchestrator Agent

Coordinates the multi-agent workflow by deciding which specialist executes each step and when to escalate. This agent owns state transitions, routing decisions, and end-to-end task progress for **any target project** the factory runs against.

**Status:** Shipped — rules-based orchestrator gates plus **full factory LangGraph** (`orchestrate` → BA → architect → context → locator → QA author → coding → validation → security → PR). Optional dedicated orchestrator LLM agent split remains future work.
**Location:** `src/orchestration/` (current LangGraph node + policy) → `src/agents/orchestrator-agent.ts` (planned full split).
**Model class:** Fast for deterministic routing and bookkeeping, balanced for normal planning, high-reasoning for ambiguous tasks and dynamic replanning. The current implementation uses **no LLM** — gates and classification are rules-based and unit-tested.

## Pipeline position

- **Wraps the entire pipeline:** `Ticket → BA → Architect → QA(tests) → Senior Eng → QA(validate) → Sec/DevOps → PR`.
- **Today** it wraps the implemented subset: `orchestrate → codebase_context → coding → validation`.
- **Consumes:** Normalized ticket, job state, specialist results, routing policy, and — critically — the `projectProfile` (language, toolchain, test/lint/build commands, VCS provider, branch policy) so routing reflects target-project reality rather than defaults.
- **Produces:** Next-action assignments, state transitions, and final outcome summary.
- **Classifies before planning:** bug/feature/refactor/spike → different sub-pipelines. The current rules-based classifier maps tasks to `implementation` | `investigation` | `unknown`.

## Responsibilities

1. Classify incoming work and create an execution plan across specialist agents.
2. Route tasks and artifacts between agents with explicit handoff contracts.
3. Track progress, retries, and escalation decisions in job state.
4. Enforce policy checks before advancing to next stage.
5. Publish final outcome and operational telemetry.

## Inputs (target schema)

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID |
| `normalizedTask` | object | Standardized task payload from ingestion |
| `projectProfile` | object | Target project identity (language, package manager, test/lint/build commands, VCS provider, conventions) |
| `jobState` | object | Current workflow state and historical events |
| `agentResults` | object[] | Outputs returned by specialist agents |
| `routingPolicy` | object | Role selection, retry budgets, escalation rules |
| `taxonomy` | object | Ticket classifier output (bug/feature/refactor/spike) gating sub-pipeline selection |

## Outputs (target schema)

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `in_progress`, `completed`, `blocked`, `failed` |
| `nextAction` | object | Assigned agent, task payload, and deadline |
| `stateUpdate` | object | Persisted transition and rationale |
| `escalation` | object? | Escalation target and blocking context |
| `finalSummary` | object? | Outcome, artifacts, and handoff links |

## Current implementation (factory graph)

The following sub-sections describe the orchestrator and LangGraph pipeline that ships today. They are the source of truth for the existing code path.

### Inputs (current schema)

Validated by `OrchestratorInputSchema` in [`src/models/orchestrator.ts`](../../../src/models/orchestrator.ts) (same shape as `LinearOrchestrationGraphInputSchema` / graph invoke input):

| Field | Description |
| --- | --- |
| `jobId` | UUID v4; correlation id for logging and `jobs.job_id` |
| `stateVersion` | Graph state version (default `1`) |
| `taskDescription` | Natural language task; **may be empty** (gate emits `skipped`) |
| `repoId` | Logical repo id for retrieval (required after trim) |
| `pathPrefix` | Optional path scope for vector search |
| `topK` | Optional retrieval breadth override |
| `testFile` | Optional `FileContext` — omit at invoke; populated by `author_tests` or CLI `--test-file` override |
| `testFileOverride` | When true, skip `locate_tests` + `author_tests` (CLI sets this with `--test-file`) |
| `repoRoot` | Writable checkout for locator, QA author, and PR stage |

Alignment with `npm run dev:orchestrate-task`: `--repo-id`, `--task`, optional `--test-file`, optional `--path-prefix`, `--top-k`, `--root`.

### Classification and policy

**Approach:** rules-based classification and gates (**no LLM** at orchestrate). Behavior is **deterministic** and covered by unit tests in [`src/orchestration/__tests__/orchestrator-policy.test.ts`](../../../src/orchestration/__tests__/orchestrator-policy.test.ts).

- **`classifyTaskDescription`** maps text to `implementation` | `investigation` | `unknown` using keyword heuristics.
- **`evaluateOrchestratorPolicy`** applies gates: `repoId` → non-empty task → classification. **No test-file gate at invoke** — `testFile` is populated by `author_tests` or CLI override.

Downstream factory agents are **not** invoked when the decision is `skipped` or `blocked` at orchestrate.

### Decision and outcome shapes

`OrchestratorDecisionSchema` (discriminated on `kind`):

| `kind` | Meaning |
| --- | --- |
| `routed` | Proceed through factory head → coding tail |
| `skipped` | Not actionable — codes: `empty_task`, `not_actionable`, `unsupported_task` |
| `blocked` | Missing prerequisites at orchestrate — e.g. `missing_repo_id`, `token_budget_exceeded` |
| `error` | Reserved for internal policy errors (`internal`) |

After a full graph run, use **`deriveOrchestratorRunOutcomeFromSnapshot`** / **`parseOrchestratorRunOutcome`** ([`src/models/orchestration-graph.ts`](../../../src/models/orchestration-graph.ts)) to obtain `OrchestratorRunOutcomeSchema`:

- Factory stage failures map to **`blocked`** with codes such as `needs_clarification`, `needs_decision`, `tests_author_failed`, `missing_test_file`.
- **`routed`** includes `codingStatus` and, when coding succeeds, **`validationStatus`** from the validation agent.
- BA **`needs_clarification`** → exit **2** (`blocked`) without sandbox or coding.

**Post-coding validation (v1):** keep the **validation agent** node; QA **`validate_changes`** remains planned — see [QA Engineer](../qa-engineer/AGENT.md).

### Job status: `awaiting_input` vs `failed`

| Job status | Meaning | Operator action |
| --- | --- | --- |
| **`awaiting_input`** | Human-input gate fired; questions posted to origin ticket (when linked). Factory paused — **resumable**. | Edit ticket **page body**, then resume via CLI `--resume --job-id`, dev-console **Resume after clarification**, or **`CLARIFICATION_AUTO_RESUME`** Notion webhook path. |
| **`failed`** | Terminal error — infra blocks, exhausted clarification rounds (`clarification_exhausted`), validation/coding failure, or non-resumable gates. | Inspect `job_events`, fix root cause, start a new run or use checkpoint resume only when applicable. |

Resume paths and ticket refresh before resume: [docs/systems/orchestration.md](../../systems/orchestration.md).

### LangGraph integration

- Graph order: **`orchestrate`** → **`repo_context_preflight`** → **`business_analyst`** → **`software_architect`** → **`codebase_context`** → **`locate_tests`** → **`author_tests`** → **`coding`** → **`validation`** → (conditional) **`security_review`** → **`open_pr`**. Human-input gates route through **`internal_clarification`** before **`clarification_feedback`** when specialist delegation cannot resolve all questions ([`run-internal-clarification-step.ts`](../../../src/orchestration/run-internal-clarification-step.ts)).
- **`testFile` required before `coding`** — set by `author_tests` or CLI override.
- Compile options include `jobPersistence`, `factoryAgentDeps` (tests), and the Postgres checkpointer.

### Persistence (`jobs` / `job_events`)

Factory milestone events include: `requirements_pack_ready`, `architecture_plan_ready`, `tests_located`, `tests_authored`, plus failure variants. See [`src/orchestration/README.md`](../../../src/orchestration/README.md).

## Target implementation (future orchestrator agent split)

No separate orchestrator LLM is configured in this plan. Optional future: `ORCHESTRATOR_MODEL` (document here and in `AGENTS.md` when introduced).

## Decision boundaries

- Can assign and reassign specialist agents within routing policy.
- Can halt workflow on policy violations, repeated failures, or missing prerequisites.
- Cannot override mandatory human approvals or governance constraints.
- Must keep decisions explainable with concise rationale in state logs.
- **Escalation policy:** factory head agents (BA, architect, QA author) self-resolve engineering and standards questions before emitting `needs_clarification` / `needs_decision`. **`internal_clarification`** classifies open questions by optional `suggestedRole` tags (with text heuristics fallback), delegates once per specialist role per stage, merges answers into graph state, and continues the pipeline when all questions resolve. Human origin-ticket posts are **last resort** for product intent, compliance, ownership, and unresolvable contradictions — only residual human-bound questions reach **`clarification_feedback`**. Internal loops are capped by **`CLARIFICATION_INTERNAL_MAX_ROUNDS`** (default **1**); exceeding the cap forces the human path.

## Failure modes and escalation

Factory-level escalation (planned multi-specialist orchestrator):

- Conflicting specialist outputs → request targeted reconciliation pass (prefer **`internal_clarification`** before human ticket).
- Repeated failures beyond retry budget → escalate to human operator.
- Missing required artifact for next stage → mark `blocked` with checklist.
- Undefined routing path for novel task type → fallback to triage workflow and alert governance owner.

Operator view (current implementation):

| Symptom | Likely cause |
| --- | --- |
| `skipped` + `empty_task` | Empty/whitespace task |
| `skipped` + `not_actionable` | Task reads as Q&A / explanation |
| `skipped` + `unsupported_task` | No implementation-style keywords |
| `blocked` + `needs_clarification` | BA could not proceed — job may be **`awaiting_input`**; check dev-console or `job_events` for clarification questions |
| `blocked` + `tests_author_failed` | QA author did not produce a test file |
| Context/coding never called | Gate or factory head returned terminal outcome — check `orchestratorDecision` and factory outputs on the snapshot |

## Skills

In-house (authoritative):

- `workflow-orchestrator-routing` — project-profile-aware routing and escalation policy.

Vendored (reference guidance):

- `agent-designer` (from `alirezarezvani/claude-skills`) — multi-agent architecture patterns (supervisor, swarm, hierarchical) as conceptual reference.

Rejected for portability (not imported):

- `agent-workflow-designer` — primary workflow is bundled Python scripts.
- `self-improving-agent` — Claude Code plugin; hard host coupling via `/si:*` commands and `MEMORY.md`.
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — link lists rather than hosted skills.

## Guardrails

- Enforce strict state traceability for every routing decision.
- Preserve per-stage least-privilege access and minimal context sharing.
- Keep retry loops bounded by policy to control latency and cost.
- Ensure outputs include enough context for deterministic downstream execution.
