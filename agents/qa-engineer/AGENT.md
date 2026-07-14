# QA Engineer

Owns test authoring **and** validation across the factory pipeline. Writes the test files the coding agent iterates against, and later verifies that the implementation meets functional + non-functional acceptance criteria. Operates against the target project's own test runner — detected via `projectProfile`, not assumed.

**Status:** Partial — **`author_tests`** ships in the full factory graph (`src/agents/qa-test-authoring-agent.ts`, `src/orchestration/run-author-tests-node.ts`). Post-implementation **`validate_changes`** remains deferred; the **validation agent** node absorbs the post-coding gate today.
**Location:** `src/agents/qa-test-authoring-agent.ts` (authoring); validation agent handles post-coding gate today.
**Model class:** Fast for triage and report formatting, balanced for test authoring and analysis, high-reasoning for flaky diagnostics and coverage gap analysis.

## Pipeline position

- **Called first (authoring):** consumes BA's `requirementsPack` + optional architect output + test locator result + `projectProfile` → produces primary `testFile` (`path` + `content`) in the target project's test runner idioms (Node: vitest or jest per profile; pytest / go test / cargo test for other ecosystems). The coding sandbox runs Node vitest/jest via [`SandboxPlan`](../../models/sandbox-plan.ts) so authored idioms must match the detected runner.
- **Called second (validation):** consumes Senior Engineer's `candidateChangeSet` + test outputs → emits `approved` / `rejected` / `needs_retest` signal for Orchestrator. **Not yet a dedicated QA agent module** — validation agent runs this gate today.
- **Critical quality bottleneck:** bad generated tests let bad code pass; test quality is measured explicitly in `coverageNotes` (authoring) and validation `coverageGaps` (post-coding).

## Authoring mode (`author_tests`)

### Discover-first behavior

| Locator result | Behavior |
| --- | --- |
| `single_match` | Read existing file from checkout; LLM **extends** with new scenarios or **reuses** unchanged when coverage is sufficient. |
| `none_found` | **Create** new file at `suggestedNewPath` from locator/conventions. |
| `multiple_candidates` | Pick best candidate: highest locator score plus keyword overlap with architect `workBreakdown.pathHints` (and component `pathHint`s); log chosen path and alternate count; then extend/reuse like `single_match`. |

Test file content is written to **graph state** and **materialized on `repoRoot`** before the coding node ([docs/systems/pr-stage.md](../../systems/pr-stage.md)) so coding, validation, and the PR commit use the same path. The PR changeset includes the file when `action` is `created` or `extended`; byte-identical `reused` files are omitted from the diff.

### Extend heuristic (`coverageNotes`)

When extending an existing test file, the agent prompt requires preserving all existing test cases unless obsolete. Removals or gaps must be explained in **`coverageNotes`** on the success output and in job event audit payloads (path + action only — no raw test body in events).

Forbidden paths (`.env`, `.git/`, secret filenames) align with `isForbiddenCommitPath` — authoring blocks before LLM when the target path is forbidden.

Optional env: **`QA_TEST_AUTHOR_MODEL`** (defaults to `claude-sonnet-4-6`; shares `ANTHROPIC_API_KEY`; global override: `ANTHROPIC_SONNET_MODEL`).

## Responsibilities

1. Execute validation suite (unit, integration, lint, typecheck, scenario checks) — **validation mode (deferred)**.
2. Verify Gherkin acceptance criteria and edge-case behavior.
3. Detect regressions and classify issue severity and reproducibility.
4. Provide actionable defect reports with reproduction steps.
5. Emit approval/rejection signal for Orchestrator routing.

## Inputs

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID |
| `mode` | enum | `author_tests` (pre-impl) or `validate_changes` (post-impl) |
| `requirementsPack` | object | Gherkin scenarios from BA (**author_tests**) |
| `locatorResult` | object | Discover-first locator output (**author_tests**) |
| `projectProfile` | object | Target project's test runner, lint tool, test layout conventions |
| `architecturePlan` | object | Optional architect plan for scope hints (**author_tests**) |
| `candidateChangeSet` | object | Files changed, commit context, implementation notes (validation mode) |
| `acceptanceCriteria` | object[] | Gherkin scenarios and constraints |
| `testOutputs` | object[] | Test results, logs, failure traces |
| `qualityPolicy` | object | Required checks and pass thresholds |

## Outputs

| Field | Type | Description |
| --- | --- | --- |
| `status` / `ok` | enum / boolean | Authoring: `ok: true` with `action` (`created` \| `extended` \| `reused`); validation: `approved`, `rejected`, `needs_retest` (deferred) |
| `testFile` | object | Primary test file path + content (**author_tests**) |
| `coverageNotes` | string | Scenario coverage and extend/reuse rationale (**author_tests**) |
| `validationResult` | object | Summary of executed checks and pass/fail (validation mode) |
| `defects` | object[] | Bug reports with severity and reproduction details |
| `coverageGaps` | string[] | Unverified behaviors and risk areas |
| `handoffNotes` | string | Guidance for Senior Engineer or Orchestrator |

## Decision boundaries

- Can reject changes that fail acceptance or quality gates.
- Can request additional tests when confidence is insufficient.
- Cannot change product requirements or architecture decisions directly.
- Must distinguish deterministic failures from flaky/environmental failures.
- **Self-resolve first:** derive test scope, naming, and coverage from requirements pack, architecture context, project profile, source context, and target-stack testing best practices. Prefer producing tests with **`coverageNotes`** documenting assumptions — block only when acceptance criteria are untestable due to product gaps (not engineering pattern ambiguity).

## Failure modes and escalation

- Flaky tests with uncertain root cause -> return `needs_retest` and isolate trigger pattern.
- Environment-only failures -> escalate to DevOps Specialist with environment diff.
- Acceptance criteria mismatch after self-resolution -> escalate to Business Analyst via **`internal_clarification`**; human origin-ticket post remains last resort.
- High-risk regression with unclear owner -> notify Orchestrator for reassignment.

## Ticket clarification feedback

When **`author_tests`** returns qualifying **`blocked`** (missing acceptance input — not infra blocks such as **`forbidden_path`**), the factory routes through **`internal_clarification`** first; residual human-bound questions post to the **origin ticket** and pause in **`awaiting_input`**. Operators update the ticket page body or Notion comment thread and resume. See [docs/systems/orchestration.md](../../systems/orchestration.md).

## Skills

In-house (authoritative):

- `qa-acceptance-validator` — validation-mode checklist, pass/fail discipline, reproducible defect reports.

Vendored (reference guidance):

- `api-test-suite-builder` (from `alirezarezvani/claude-skills`) — coverage patterns (auth, validation, error codes, pagination) the authoring mode consults.
- `pr-review-expert` (from `alirezarezvani/claude-skills`) — checklist-driven review guidance applied to validation reports.

Rejected for portability (not imported):

- `playwright-pro` — Claude Code plugin with `/pw:*` commands, MCP config, and settings.json host coupling.
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — link lists.

## Guardrails

- Require reproducible evidence for all blocking defects.
- Keep pass/fail criteria transparent and tied to acceptance scenarios.
- Avoid false precision when confidence is low; flag uncertainty explicitly.
- Ensure reports are concise, actionable, and traceable to specific checks.
