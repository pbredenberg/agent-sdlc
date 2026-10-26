# Security Specialist

Assesses code, infrastructure, and workflow changes for security risk before release across **any target project's ecosystem**. Delegates scanning to ecosystem-native tools the target project already runs (or ought to run) rather than bundling agent scanners.

**Status:** Implemented — orchestration gate between validation and PR.
**Location:** `src/agents/security-specialist.ts`
**Model class:** Balanced for routine policy checks, high-reasoning for threat modeling and exploit-path analysis.

## Pipeline position

- **Consumes:** approved `changeSet`, ingestion/webhook config, ecosystem-specific vulnerability reports (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`, etc. — selected via `projectProfile`), and `threatContext` for the target domain.
- **Produces:** severity-ranked findings, blocking `requiredRemediations`, and a residual `riskStatement` PR Agent embeds in the PR body.
- **Can halt the pipeline** independently of QA approval — security decisions are not overridden by test pass signals.

## Responsibilities

1. Run security review over candidate changes and CI/CD pipeline updates.
2. Validate controls for secrets, access boundaries, and dependency hygiene.
3. Perform threat-model checks (STRIDE-style) for high-impact flows.
4. Verify webhook signature and ingestion hardening requirements where applicable.
5. Produce risk-ranked findings and remediation actions.

## Inputs

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID |
| `changeSet` | object[] | Code and config changes under review |
| `projectProfile` | object | Target project's ecosystem-native scanners and policy files (`.trivyignore`, `.semgrepignore`, etc.) |
| `runtimeConfig` | object | Sandbox/network/memory/time constraints and env usage |
| `dependencyReport` | object | Vulnerability and license scan results from ecosystem-native tooling |
| `threatContext` | object | Assets, trust boundaries, attack surfaces |

## Outputs

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `approved`, `approved_with_risk`, `blocked` |
| `findings` | object[] | Severity-ranked vulnerabilities and evidence |
| `requiredRemediations` | object[] | Blocking actions before release |
| `advisories` | object[] | Non-blocking hardening recommendations |
| `riskStatement` | string | Residual risk summary |

## Decision boundaries

- Can block release on critical findings, secret exposure, or policy violations.
- Can require additional controls for high-risk deployment paths.
- Cannot waive mandatory security policy without human approval.
- Must separate exploitable findings from speculative concerns.

## Failure modes and escalation

- Incomplete artifact set for review -> return `blocked` with missing evidence checklist.
- Potential secret leak -> immediate escalation and rotation workflow.
- Ambiguous exploitability -> mark `approved_with_risk` and require follow-up validation.
- Policy conflict between teams -> escalate to governance owner with decision memo.

## Skills

In-house (authoritative):

- `security-change-review` — STRIDE-lite change review, secret-detection checklist, pipeline-gating discipline.

Vendored (reference guidance):

- None retained. All three candidates below were rejected for portability.

Rejected for portability (not imported):

- `skill-security-auditor` — primary workflow is bundled Python scripts, and the skill itself references Claude Code plugin installation paths.
- `dependency-auditor` — primary workflow is bundled Python scripts that duplicate ecosystem-native tools (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`). Prefer native scanners invoked via the project profile.
- `env-secrets-manager` — primary workflow is bundled Python scripts; secret-detection should use project-native tooling (`gitleaks`, `trufflehog`, `detect-secrets`).
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — link lists.

Security tooling is intentionally kept **ecosystem-native**: the agent instructs the sandbox to run the scanner appropriate to the target project's language, then interprets the JSON output. This keeps the engine tool-agnostic and avoids duplicating battle-tested OSS scanners.

## Guardrails

- Never send plaintext secrets, credentials, or private keys into model context.
- Treat security findings as evidence-driven and reproducible whenever possible.
- Preserve principle-of-least-privilege for tokens, roles, and deployment credentials.
- Keep audit trail complete with `jobId` correlation and immutable finding history.

## Current implementation

The gate is **rules-based** (no LLM in v1):

| Piece | Location |
| --- | --- |
| Zod I/O | `src/models/security-specialist.ts` |
| Agent | `runSecuritySpecialist` in `src/agents/security-specialist.ts` |
| Secrets scan | `src/security/scan-change-set-secrets.ts` (reuses `isForbiddenCommitPath`) |
| Env / routing | `src/config/security-review-env.ts` — `SECURITY_REVIEW_REQUIRED`, `SECURITY_AUDIT_COMMAND`, high-risk task keywords |
| Graph node | `security_review` in `src/orchestration/linear-graph.ts` (after `validation`, before `open_pr`) |
| Events | `security_review_passed`, `security_review_failed` on `job_events` |
| PR body | `riskStatement` → `## Security` in `buildPullRequestBody` (sanitized) |

**Dependency audit:** sandbox runs `npm audit --json` by default (`SECURITY_AUDIT_COMMAND` override). Tests inject `dependencyReport` or `fetchDependencyReport` — **`npm test` does not hit the network**.

**When the gate runs:** after validation passes on the PR path; also on `--skip-pr` when `SECURITY_REVIEW_REQUIRED=1` or the task description matches high-risk keywords (auth, webhook, secret, …).

**Outcomes:** `blocked` → job `failed`, no PR; `approved_with_risk` → PR opens with residual `riskStatement`; `approved` → PR proceeds normally.
