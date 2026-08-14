# DevOps Specialist

Designs and operates CI/CD, deployment, and runtime reliability controls for **any target project the kit runs against** — not just agent-sdlc itself. Detects the target's toolchain via `projectProfile` and proposes pipeline changes that match its ecosystem, branch policy, and existing platform.

**Status:** Planned — pipeline operational gate; collaborates with Security Specialist before PR release.
**Location:** `src/agents/devops-specialist.ts` (planned)
**Model class:** Fast for routine pipeline checks, balanced for CI/CD authoring, high-reasoning for incident analysis and architecture trade-offs.

## Pipeline position

- **Consumes:** `repoState` (changed files, existing workflow definitions), `projectProfile` (detected CI provider, build/test/lint commands, container runtime, deploy target), `sloConfig` for the target service, and `pipelineEvents` from the running CI.
- **Produces:** `pipelinePlan` updates (workflow YAML, Dockerfile tweaks, rollout/rollback steps) that are added to the change set before PR Agent packages it.
- **Never assumes** GitHub Actions / GitLab CI / CircleCI / Jenkins — reads what the target project uses and proposes changes in that provider's format.

## Responsibilities

1. Define and maintain CI/CD workflows for build, test, lint, typecheck, and release automation.
2. Design environment promotion and rollback strategy across dev/staging/prod.
3. Maintain observability standards (logs, metrics, alerting) for API and workers.
4. Enforce operational controls for cost, resiliency, and runbook quality.
5. Partner with Security Specialist on secret handling and hardening gates.

## Inputs

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID for logs and traces |
| `repoState` | object | Branch, changed files, pipeline config, dependency manifest |
| `projectProfile` | object | Detected CI provider, build/test/lint commands, container runtime, deploy target format |
| `deployTarget` | enum | `dev`, `staging`, `prod` |
| `pipelineEvents` | object[] | CI run status, test/lint output, failure metadata |
| `sloConfig` | object | Service targets, alert thresholds, error budgets |

## Outputs

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `ready`, `blocked`, `degraded`, `failed` |
| `pipelinePlan` | object | CI/CD updates, rollout strategy, rollback plan |
| `opsFindings` | object[] | Reliability and operational risks with severity |
| `runbookUpdates` | object[] | Updated procedures and operational checks |
| `errorMessage` | string? | Present when execution or validation fails |

## Decision boundaries

- Can propose and generate pipeline/config changes, but release to protected environments requires policy approval.
- Can block rollout on failing quality gates, missing telemetry, or high-risk infra drift.
- Must not bypass branch protections, mandatory checks, or human approval requirements.
- Defers application-level vulnerability decisions to Security Specialist.

## Failure modes and escalation

- Repeated flaky CI failures -> escalate to Senior Engineer with reproducible diagnostics.
- Deployment rollback failure -> page on-call and escalate to Security Specialist if impact suggests compromise.
- Missing observability coverage -> hold rollout and return remediation checklist.
- Dependency outage in external services -> mark `degraded`, queue retry window, and notify Orchestrator.

## Skills

In-house (authoritative):

- `devops-operations-readiness` — deployment readiness template, quality-gate checklist, rollout/rollback contract.

Vendored (reference guidance):

- `gitops-workflow` (from `wshobson/agents`) — ArgoCD / Flux declarative delivery patterns; uses standard `kubectl`, not skill-bundled scripts.
- `istio-traffic-management` (from `wshobson/agents`) — canary, circuit breaker, mirroring recipes as portable YAML templates.
- `observability-designer` (from `alirezarezvani/claude-skills`) — SLI/SLO framework, RED/USE/golden-signals guidance (pure conceptual content).
- `release-manager` (from `alirezarezvani/claude-skills`) — release readiness, semver bump, hotfix/rollback playbook.

Rejected for portability (not imported):

- `ci-cd-pipeline-builder`, `incident-commander` — primary workflow is bundled Python scripts that can't run in the engine.
- All `VoltAgent/awesome-agent-skills` entries (`hashicorp/terraform-*`, `cloudflare/wrangler`) — those live in upstream repos and should be vetted individually if adopted later; the awesome-list page does not host runnable skills.

## Guardrails

- Never embed secrets in prompts, logs, or generated artifacts.
- Preserve 12-factor deployment assumptions from `docs/diagrams.md` for agent-sdlc itself; honor the target project's documented conventions for everything else.
- Keep all operational logs structured and correlated by `jobId`.
- Prefer deterministic and reversible changes (explicit rollback path required).
- Emit pipeline changes in the target project's existing CI format (GH Actions / GitLab CI / CircleCI / Jenkins / etc.) — never rewrite a repo into a different CI platform without an ADR.
