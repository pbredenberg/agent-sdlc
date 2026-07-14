# Software Architect

Translates approved requirements into implementation plans, architecture decisions, and execution slices for **any target project, any language**. Design output must respect the target project's existing conventions, not impose a house style.

**Status:** Shipped — full factory graph node with repo profile preflight.
**Location:** [`src/agents/software-architect-agent.ts`](../../../src/agents/software-architect-agent.ts), [`src/orchestration/run-software-architect-node.ts`](../../../src/orchestration/run-software-architect-node.ts)
**Schemas:** [`src/models/software-architect.ts`](../../../src/models/software-architect.ts) (`SoftwareArchitectInput`, `ArchitecturePlan`, `WorkBreakdownSlice`, discriminated `SoftwareArchitectOutput`)
**Model class:** Balanced for standard design planning, high-reasoning for complex trade-offs and multi-system decomposition. Optional env `SOFTWARE_ARCHITECT_MODEL` (defaults to Sonnet; shares `ANTHROPIC_API_KEY`).

## Pipeline position

- **Consumes:** `requirementsPack` from Business Analyst, `projectProfile` (detected language, framework, ORM, layout, key paths, Prisma models), and `codeContext` (manifest/schema excerpts from repo preflight).
- **Produces:** `architecturePlan` (components + interfaces) and a `workBreakdown` of implementable slices consumed by Senior Engineer and QA Engineer.
- **Language-agnostic by design:** recommends patterns using the project's existing stack, never dictates TypeScript/Node idioms into, e.g., a Go or Python target repo.

## Responsibilities

1. Produce solution architecture aligned with current phase constraints in `docs/plan.md`.
2. Define component boundaries, interfaces, and data flow contracts.
3. Generate implementation sequencing for Senior Engineer and QA Engineer.
4. Recommend updates to ADRs when decisions change architectural direction.
5. Quantify trade-offs across complexity, cost, reliability, and security.

## Inputs

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID for traceability |
| `requirementsPack` | object | Problem statement, Gherkin, constraints, priorities |
| `projectProfile` | object | Target project identity (language, frameworks, module layout, ADR history, dependency graph) |
| `codeContext` | object[] | Relevant source files, architecture docs, existing patterns |
| `platformConstraints` | object | Runtime limits, phase scope, data/storage assumptions |
| `nonFunctionalTargets` | object | Performance, reliability, security, cost targets |

## Outputs

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `ready`, `blocked`, `needs_decision` |
| `architecturePlan` | object | Components, interfaces, and sequencing |
| `workBreakdown` | object[] | Implementable slices with dependencies |
| `tradeoffLog` | object[] | Option comparisons and selected rationale |
| `adrProposals` | object[] | Draft decision records where needed |

## Decision boundaries

- Can define architecture and propose patterns, but cannot override explicit phase boundaries or the target project's established conventions without an ADR proposal.
- Must keep runtime execution in Docker sandbox constraints where code execution applies.
- Can recommend data model changes, but final schema governance remains with human owners.
- **Self-resolve first:** resolve engineering trade-offs (resilience, caching, retries, layering, test strategy, interface shape when conventions exist) by **recommending a default** with rationale — prefer `status: ready` and record in **`tradeoffLog`** / **`adrProposals`** / assumptions. Do **not** emit `needs_decision` option lists solely because multiple valid patterns exist (e.g. fail-fast vs backoff vs cache).
- Use `needs_decision` only for **product intent**, **compliance/legal**, **ownership**, or **contradictions** no specialist can settle from ticket + memory + profile + code context + stack best practices.
- Must avoid cross-ecosystem idioms (e.g. do not propose Node-only tooling for a Python target project).
- When emitting decision options, tag each with **`suggestedRole`**: `architect` | `ba` | `qa` | `human`.

## Failure modes and escalation

- Ambiguous **product** requirements → return `needs_decision` with options, impact, and role tags (typically `human`).
- Engineering resilience/reliability choices → **recommend** in `tradeoffLog` and continue `ready`; do not pose A/B/C to humans when standards apply.
- Architecture conflicts with existing ADRs → propose ADR update; escalate only if human approval is required.
- Excessive implementation scope → split into phased increments in work breakdown; flag risk in tradeoff log.
- Unclear ownership boundaries → emit integration contract draft; tag ownership questions `human`.

## Ticket clarification feedback

When the architect returns **`needs_decision`** (or qualifying **`blocked`** / `insufficient_requirements`), the factory routes through **`internal_clarification`** first — specialist-routable questions are delegated and merged into graph state; only residual human-bound questions post to the **origin ticket** and pause in **`awaiting_input`**. Same resume paths as BA clarification — edit ticket page body or comment thread (Notion), then CLI, dev-console, or webhook auto-resume. See [docs/systems/orchestration.md](../../systems/orchestration.md).

## Skills

In-house (authoritative):

- `architecture-slice-planner` — decomposition into implementable slices with explicit handoff contracts.

Vendored (reference guidance):

- `database-designer` (from `alirezarezvani/claude-skills`) — schema normalization, index strategy, migration patterns.
- `migration-architect` (from `alirezarezvani/claude-skills`) — phased migration planning, rollback strategy.

Rejected for portability (not imported):

- `senior-architect`, `agent-workflow-designer` — primary workflow is bundled Python scripts.
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — link lists.

## Guardrails

- Keep design decisions explicit, versioned, and linked to rationale.
- Avoid speculative abstractions that are not required by current phase.
- Ensure every major design recommendation has a rollback or migration path.
- Keep interfaces testable; validation primitives are chosen per target project (Zod for TS targets, Pydantic for Python, etc.), not mandated by the engine.
