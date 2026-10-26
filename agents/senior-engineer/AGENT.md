# Senior Engineer

Implements approved feature slices with production-quality code and test updates. This agent owns code changes, local reasoning over failures, and iterative improvement before QA and security review. It writes code in **whatever language the target project uses** — discovered via the `projectProfile`, not hardcoded.

**Status:** Implemented as the **Coding Agent** (`src/agents/coding-agent.ts`); Senior Engineer is the planned extension that adds project-profile awareness and richer feedback handling on top of the same loop.
**Location:** `src/agents/coding-agent.ts` (current) → `src/agents/senior-engineer.ts` (planned).
**Model:** `claude-sonnet-4-6` via `@anthropic-ai/sdk` today (override with `CODING_AGENT_MODEL` or `ANTHROPIC_SONNET_MODEL`).
**Model class (planned):** Balanced for implementation and refactoring, high-reasoning for complex debugging and multi-file changes.

## Pipeline position

- **Consumes:** `workItem` slice from Software Architect, QA-authored test file(s), `repoContext` from Codebase Context Agent, `projectProfile` (language, test/lint/build commands, style conventions), and any prior-iteration feedback.
- **Produces:** `generatedFiles` change set ready for QA validation, plus `testNotes` and `changeSummary` consumed by PR Agent and reviewers.
- **Iterates inside the sandbox** against the project's own test command until tests pass or the iteration cap is reached.

## Responsibilities

1. Convert architecture work items into concrete code changes.
2. Add and update tests to verify behavior and prevent regressions.
3. Resolve implementation defects discovered by sandbox/QA feedback.
4. Maintain readability, consistency, and backward compatibility where required.
5. Produce concise implementation notes for downstream review.

## Inputs (target schema)

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID |
| `workItem` | object | Task slice with constraints and acceptance criteria |
| `projectProfile` | object | Target project identity (language, package manager, test/lint/build commands, style conventions) |
| `repoContext` | object[] | Relevant source files and current test files |
| `feedback` | object[] | QA/security comments and failing outputs |
| `engineeringPolicy` | object | Coding standards, lint/test commands, limits |

## Outputs (target schema)

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `ready_for_qa`, `needs_architecture`, `blocked` |
| `generatedFiles` | object[] | Updated file paths and content |
| `testNotes` | object | Commands run, outcomes, unresolved gaps |
| `changeSummary` | string | Why and what changed |
| `knownRisks` | string[] | Residual risks for QA/security focus |

## Current implementation (Coding Agent)

The following sub-sections describe the Coding Agent — the precursor that powers the Senior Engineer role today. It is the source of truth for the existing code path; the Senior Engineer extension layers `projectProfile` awareness, feedback handling, and richer outputs on top of this contract.

### Input schema (current)

Defined in `src/models/coding-agent.ts` as `CodingAgentInputSchema`:

| Field             | Type                  | Description                            |
| ----------------- | --------------------- | -------------------------------------- |
| `jobId`           | UUID                  | Correlation ID for logging and tracing |
| `taskDescription` | string                | What to implement, in plain language   |
| `relevantFiles`   | `{ path, content }[]` | Source files for context (min 1)       |
| `testFile`        | `{ path, content }`   | Test file the implementation must pass |

### Output schema (current)

Defined as `CodingAgentOutputSchema`:

| Field             | Type                                      | Description                               |
| ----------------- | ----------------------------------------- | ----------------------------------------- |
| `jobId`           | UUID                                      | Same as input                             |
| `status`          | `"success" \| "tests_failing" \| "error" \| "budget_exceeded" \| "sandbox_unavailable"` | Outcome                                   |
| `generatedFiles`  | `{ path, content }[]`                     | Files the agent wrote                     |
| `iterationCount`  | int (1–5)                                 | How many attempts were made               |
| `totalTokensUsed` | int                                       | Cumulative tokens across all LLM calls    |
| `errorMessage`    | string?                                   | Present on non-`success` statuses         |

### Iteration loop

1. Build a prompt with the task, context files, and test file.
2. Call Claude Sonnet — expect a JSON array of `{ path, content }` objects.
3. Send generated files + test file into a Docker sandbox (see [sandbox.md](../sandbox.md)).
4. Exit code 0 → return `"success"`.
5. Non-zero → feed **structured test feedback** back to Claude with a retry prompt (see [Test feedback](#test-feedback)).
6. After 5 failures → return `"tests_failing"` with the last feedback block.

On the first iteration, the prompt includes the task description, existing files, and test file. On retries, the prompt includes the previous implementation and structured failing-test feedback instead of raw vitest output.

### Test feedback

**Decision:** Structured JSON report to a file — Vitest writes `.vitest-report.json`; Jest writes `.jest-report.json`. Providers capture the path from `SandboxPlan.report` onto `SandboxResult.artifacts`. See [sandbox.md](../sandbox.md#json-report-capture).

[`test-feedback.ts`](../../../src/agents/test-feedback.ts) parses the matching report ([`vitest-json-report.ts`](../../../src/models/vitest-json-report.ts) / [`jest-json-report.ts`](../../../src/models/jest-json-report.ts)) and builds a compact retry block:

- Summary counts (failed / passed / total)
- Per failing test: full name, assertion message, first stack frame pointing at generated (non-test) code
- Suite-level errors (module-not-found, syntax errors) verbatim
- Hard size budget with explicit `… [elided for size budget]` markers — never silent truncation
- **Fallback:** when the report is missing or unparseable, the retry prompt uses the raw stdout/stderr dump (prior behavior)

Raw sandbox output is still logged on the `tests_failed_raw_output` event for operators; only the structured block goes to the LLM.

### Dependency injection

The agent accepts an optional `CodingAgentDeps` object:

- `anthropic` — override the Anthropic client (used in tests)
- `sandbox` — override the SandboxRunner (used in tests)
- `sandboxOptions` — custom sandbox configuration

This keeps unit tests fast — no real LLM calls or Docker containers.

### Sandbox file assembly

On each iteration, the agent assembles sandbox files via [`buildSandboxWorkspace`](../../../src/sandbox/build-sandbox-workspace.ts) from a [`SandboxPlan`](../../../src/models/sandbox-plan.ts) derived from `projectProfile`:

1. Generated files from the LLM response
2. The test file (unmodified)
3. Any `relevantFiles` not overwritten by generated files
4. Plan workspace stubs — synthetic `package.json` plus runner config (`vitest.config.ts` or `jest.config.cjs`) matching the detected Node runner
5. Sandbox options (`testCommand`, preflight binary, report capture) from the same plan

Unsupported ecosystems / runners return `sandbox_unavailable` before any sandbox exec.

### Error handling

- **No text in LLM response:** Returns `"error"` immediately, does not retry.
- **Invalid or truncated JSON from LLM:** Logs `llm_json_parse_failed`; retries **once** per LLM call — with a compact-output instruction when `stop_reason === "max_tokens"` or the parse error indicates truncation (`llm_json_truncation_retry`), otherwise with a JSON-only format-correction instruction (`llm_json_format_retry`) — then returns `"error"` if the retry still fails. Before any retry, the parser in [`parse-llm-json.ts`](../../../src/agents/parse-llm-json.ts) strips markdown fences and falls back to extracting a JSON payload embedded in prose (fenced block, then bracket-delimited substring), so prose-wrapped responses usually parse without a retry.
- **Output token limit:** Default `8192` (`CODING_AGENT_MAX_OUTPUT_TOKENS` override).
- **Sandbox timeout (test run):** Counts as a failed iteration (`failureClass: test`), retries with a message naming the configured timeout limit.
- **Sandbox infrastructure failure (daemon down, missing runner, OOM, provider API error):** Abort immediately with `"sandbox_unavailable"` — no further LLM iterations; `errorMessage` carries operator-actionable detail.

## Decision boundaries

- Can modify implementation and tests, but cannot redefine acceptance criteria.
- Can request architecture clarification when constraints conflict.
- Must not weaken security controls or bypass required checks to force passing tests.
- Must keep host execution restrictions and sandbox assumptions intact.

## Failure modes and escalation

- Repeated failing tests with unclear root cause -> escalate with narrowed hypotheses.
- Hidden dependency or environment mismatch -> mark `blocked` with reproduction steps.
- Scope expansion beyond agreed work item -> return `needs_architecture`.
- Risky migration or data-impacting change -> request software architect review.

## Skills

In-house (authoritative):

- `implementation-quality-loop` — iteration, feedback handling, and self-review discipline inside the sandbox loop.

Vendored (reference guidance):

- `pr-review-expert` (from `alirezarezvani/claude-skills`) — self-review checklist before handing off to QA.
- `api-test-suite-builder` (from `alirezarezvani/claude-skills`) — contract-coverage patterns to guide implementation.

Rejected for portability (not imported):

- `tech-debt-tracker` — primary workflow is bundled Python scripts.
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — link lists.

## Guardrails

- Keep diffs minimal and targeted to accepted scope.
- Prefer deterministic tests and avoid introducing flaky behavior.
- Respect the target project's structured-logging and secret-handling conventions — never write defaults into a foreign repo.
- Preserve compatibility and migration safety for shared interfaces.
- Only invoke tools the target project ships (its `testCmd`, `lintCmd`, `buildCmd` from the project profile); do not assume Node/npm commands in non-Node projects.
