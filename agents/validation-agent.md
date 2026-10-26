# Validation agent

Post-coding quality gate: re-run the **test suite** and **ESLint** inside the same **Docker sandbox** constraints as the coding agent, then a **self-review** LLM pass that only sees task text, file paths, and truncated command output (no secrets).

## Input (`ValidationAgentInput`)

Defined in [`src/models/validation-agent.ts`](../../src/models/validation-agent.ts):

| Field | Description |
| --- | --- |
| `jobId` | Correlation id (UUID); every log line includes it via `createJobLogger`. |
| `taskDescription` | Task text for self-review (same rules as other agents: no env secrets in prompts). |
| `repoRoot` | Optional; reserved for CLIs that validate against a real checkout path. |
| `testFile` | Test file context (`path` + `content`), aligned with the coding agent. |
| `relevantFiles` | Files retrieved for coding — used to rebuild the sandbox workspace for validation. |
| `codingOutput` | Coding agent output; if `status !== "success"`, validation **skips** heavy work and returns a typed skip result. |
| `projectProfile` | Optional; when present, drives [`SandboxPlan`](../../src/models/sandbox-plan.ts) (test command, runner stubs, lint command). |

## Behavior

1. **Skip** — If coding did not finish with `success`, return `status: "skipped"` with explicit step summaries (no sandbox, no LLM).
2. **Tests** — Build the workspace via [`buildSandboxWorkspace`](../../src/sandbox/build-sandbox-workspace.ts) from the same `SandboxPlan` as coding (plus ESLint toolchain extras) and run the plan's `testCommand` (Vitest or Jest). Operator override: `VALIDATION_TEST_COMMAND`.
3. **Lint** — Second sandbox run with `projectProfile.lintCommand` when set, otherwise ESLint on the union of generated paths, the test path, and relevant file paths. Can be turned off with env (see below).
4. **Self-review** — If tests and lint are green (or lint was intentionally skipped with a passing test pass), call Claude with a **JSON-only** response shape. On truncation (`stop_reason === "max_tokens"` or unterminated JSON), retries **once** with a compact-output instruction before soft-failing to `needs_attention`. If tests or lint failed, self-review is **not** invoked; the result records that tests or lint must be fixed first.

## Commands and limits

- **Sandbox:** Same profile-driven defaults as the coding sandbox — no network in the container unless sandbox options override it (not used by default). Memory and timeout match [`SandboxRunner`](../../src/sandbox/runner.ts) defaults.
- **Self-review:** One short `messages.create` call; token usage is included in `totalTokensUsed` and in `selfReview.tokensUsed`.

## Environment variables

| Variable | Effect |
| --- | --- |
| `VALIDATION_TEST_COMMAND` | Whitespace-split argv for the test sandbox command (overrides `SandboxPlan.testCommand` after plan defaults). |
| `VALIDATION_SKIP_LINT` | If `1` or `true`, lint step is skipped (recorded as `lint.status: "skipped"`). |
| `VALIDATION_SKIP_SELF_REVIEW` | If `1` or `true`, self-review is bypassed with a recorded pass summary. |
| `VALIDATION_AGENT_MAX_OUTPUT_TOKENS` | Self-review `max_tokens` (default `1024`). |

## Output (`ValidationAgentOutput`)

- `status`: overall rollup — `passed` \| `failed` \| `skipped` \| `error`.
- `tests` / `lint`: per-step `ValidationStepResult` (status, optional exit code, timeout flag, truncated summary).
- `selfReview`: `verdict` (`pass` \| `fail` \| `needs_attention`), `summary`, `tokensUsed`.
- `totalTokensUsed`: self-review tokens only (sandbox steps do not use the LLM).

## Orchestration

The linear LangGraph wires **validation** after **coding** ([`src/orchestration/linear-graph.ts`](../../src/orchestration/linear-graph.ts)). Job events include `validation_passed` and `validation_failed` payloads (status only). `deriveOrchestratorRunOutcomeFromSnapshot` adds `validationStatus` on `routed` outcomes when coding succeeded.

## Failure modes

- Test or lint non-zero exit or timeout → `failed` (unless overall skip).
- Self-review `fail` or `needs_attention` → overall `failed`.
- Internal inconsistency (e.g. coding success without validation output in the snapshot) → orchestrator outcome `error` / job failed.

## Limitations

Validation is **not** a substitute for human review on security-sensitive or high-risk changes. It automates checks that fit the sandbox; full-repo or host-bound workflows need an explicit design change and ADR if they bypass the sandbox.
