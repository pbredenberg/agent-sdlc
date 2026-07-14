# Business Analyst

Converts stakeholder inputs (tickets, notes, transcripts) into unambiguous, testable requirements for **any target project**. This agent stands at the front of the factory pipeline: it normalizes problem statements and writes Gherkin acceptance criteria that every downstream agent consumes.

**Status:** Shipped — wired in the full factory graph (`business_analyst` LangGraph node).
**Location:** [`src/agents/business-analyst-agent.ts`](../../../src/agents/business-analyst-agent.ts), [`src/orchestration/run-business-analyst-node.ts`](../../../src/orchestration/run-business-analyst-node.ts)
**Schemas:** [`src/models/business-analyst.ts`](../../../src/models/business-analyst.ts) (`BusinessAnalystInput`, `RequirementsPack`, discriminated `BusinessAnalystOutput`)
**Model class:** Fast for extraction and normalization, balanced for Gherkin authoring, high-reasoning for conflict resolution across ambiguous requirements.

## Pipeline position

- **Consumes:** Raw ticket (any source: Jira / Notion / Trello / Linear / GitHub Issues), optional meeting transcripts, project profile (domain vocabulary, existing requirements index).
- **Produces:** `requirementsPack` artifact — the canonical input for Software Architect and QA Engineer.
- **Fails the pipeline fast** when evidence is insufficient rather than passing through ambiguity.

## Responsibilities

1. Parse meeting transcripts and ticket metadata into a normalized requirement package.
2. Draft feature narratives and acceptance criteria in Gherkin (`Given/When/Then`) — implementation-agnostic so they work for any language/stack the target project uses.
3. Identify missing assumptions, dependencies, and open questions.
4. Tag requirements with risk, priority, and non-functional constraints.
5. Provide traceability from source evidence to final acceptance criteria.

## Inputs

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID for logging |
| `ticket` | object | Title, description, labels, priority, source metadata |
| `meetingTranscripts` | object[] | Speaker-attributed transcript blocks |
| `projectProfile` | object | Target project identity — domain, glossary, existing requirement index, compliance context |
| `domainContext` | object[] | Product vocabulary, existing requirements, policy notes |
| `formatPolicy` | object | Output format and style constraints |

## Outputs

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `ready`, `needs_clarification`, `blocked` |
| `problemStatement` | string | Consolidated business objective |
| `gherkinScenarios` | object[] | Structured acceptance criteria with tags |
| `assumptions` | string[] | Explicitly declared assumptions |
| `openQuestions` | string[] | Clarifications needed from humans |
| `traceabilityMap` | object[] | Links from source statements to requirements |

## Decision boundaries

- Can rephrase and normalize, but cannot invent product policy or legal commitments.
- **Self-resolve first:** attempt answers from ticket text, prior artifacts, shared memory, project profile, and domain best practices; record reasonable inferences as **assumptions** and prefer `status: ready` when Gherkin is testable.
- Use `needs_clarification` only for **product intent**, **compliance/legal**, **ownership**, or **contradictions** no specialist can settle — not for engineering pattern choices.
- Must preserve source meaning and flag low-confidence interpretations.
- Defers technical implementation details to Software Architect and Senior Engineer.
- When emitting blocking questions, tag each with **`suggestedRole`**: `architect` | `ba` | `qa` | `human` (via `blockingQuestionItems` when present; legacy `blockingQuestions` string arrays remain valid).

## Failure modes and escalation

- Transcript ambiguity across stakeholders → self-resolve from memory/profile when possible; otherwise escalate with tagged questions (`suggestedRole: human` for ownership/product).
- Contradictory acceptance criteria → split into alternatives in assumptions or escalate with owner-facing questions tagged `human`.
- Missing domain policy (compliance, permissions, SLAs) → escalate to product owner (`suggestedRole: human`).
- Low confidence extraction after self-resolution pass → return `needs_clarification` with source snippets and role tags.

## Ticket clarification feedback

When the BA returns **`needs_clarification`**, the factory routes through **`internal_clarification`** first — specialist-routable questions are delegated and merged into graph state; only residual human-bound questions post to the **origin ticket** and pause in **`awaiting_input`**. Operators answer by editing the ticket **page body** or Notion comment thread, then resume via CLI `--resume --job-id`, dev-console **Resume after clarification**, or optional **`CLARIFICATION_AUTO_RESUME`** on Notion webhooks. See [docs/systems/orchestration.md](../../systems/orchestration.md).

## Skills

In-house (authoritative):

- `business-analyst-requirements-pack` — the structured output contract this agent produces.
- `gherkin-scenario-writer` — Given/When/Then authoring discipline.

Vendored (reference guidance):

- `agile-product-owner` (from `alirezarezvani/claude-skills`) — INVEST, user-story patterns, acceptance-criteria templates.

Rejected for portability (not imported):

- `product-manager-toolkit`, `ux-researcher-designer` — skill-bundled Python scripts make them tool-dependent.
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — curated link lists, not hosted skills.

## Guardrails

- Never include sensitive transcript data beyond least-required context.
- Keep acceptance criteria testable, measurable, and implementation-agnostic.
- Label inferred statements as assumptions, never as facts.
- Maintain auditable traceability from source input to generated requirements.
