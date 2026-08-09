---
name: sdlc
description: Run the agent-sdlc multi-agent factory against the current project. Use when the user types /sdlc or asks to run the SDLC pipeline, agent factory, or full ticket-to-PR workflow.
disable-model-invocation: true
---

# /sdlc — Agent SDLC Factory

You are running the **agent-sdlc** factory against the **current workspace**. Follow the orchestrator pipeline. Do not invent a parallel process.

## Goal

Turn the user's request (or the active ticket/issue context) into a review-ready change set using the specialist agents and skills from this plugin.

## Pipeline (default)

Execute stages in order. Skip a stage only when the orchestrator policy says it is not applicable. Record a short handoff note between stages.

1. **Orchestrate** — classify the task (`scaffold` | `implementation` | `investigation` | `unknown`), build a plan, set retry budgets. Use skill `workflow-orchestrator-routing`.
2. **Business Analyst** — normalize requirements, acceptance criteria, open questions. Prefer `business-analyst-requirements-pack`, `gherkin-scenario-writer`, `agile-product-owner`.
3. **Software Architect** — slice work, constraints, and interfaces. Prefer `architecture-slice-planner`; use `database-designer` or `migration-architect` when schema/migration work appears.
4. **Codebase context** — gather the minimal relevant files, conventions, test/lint/build commands from this repo (treat discovery as the project profile).
5. **Agent context profile** — create or maintain `AGENTS.md` using `agents-md-author`. On scaffold: always create root file. On every implementation run: diff project profile vs existing file and patch when commands, layout, or conventions drift.
6. **QA author** — ensure failing or characterizing tests exist before implementation. Prefer `api-test-suite-builder` when API surface changes.
7. **Senior Engineer** — implement against tests and project conventions. Use `implementation-quality-loop`.
8. **Validation / QA** — re-run the project's own test/lint/build commands; gate on `qa-acceptance-validator`.
9. **Security + DevOps** — review risk and operational readiness. Use `security-change-review`, `devops-operations-readiness`, and other DevOps skills only when relevant.
10. **PR** — open or update a review-ready PR. Use `pr-packager`, `pr-review-expert`, `release-manager` as needed. **Never merge** without explicit human approval.

## Execution plan branches

When the operator's intent is execution-plan work, **do not** run the full pipeline. Route instead:

| Intent | Skill | Notes |
| --- | --- | --- |
| Draft execution plans | `execution-plan-author` | Plan files only under `docs/execution-plans/`; never implement |
| Advance / drain plans | `execution-plan-dispatcher` | Traffic control only; one fresh agent per plan |
| Implement a single numbered plan | `implementation-quality-loop` | Follow plan file; commit + delete plan when done |

Unattended drain: `agent-sdlc-drain --phase <name>` (requires `CURSOR_API_KEY`; one-time `npm link` from this repo).

See [execution-plans.md](../references/execution-plans.md) for the shared format.

## Operating rules

- Discover language, package manager, test/lint/build, and VCS conventions from **this** repository. Do not hardcode another project's toolchain.
- Maintain `AGENTS.md` on every run when the project profile drifts from the existing file (see `agents-md-author`).
- Prefer small, reviewable diffs. Keep commits and PR narrative traceable to the original request.
- Stop and ask when product intent, compliance, or ownership is ambiguous. Resolve engineering clarifications yourself when possible.
- Bound retries; escalate blockers instead of looping forever.
- When the user names a single stage (e.g. "just review the PR"), run only that stage and its skill(s).

## Output

Finish with:

1. **Pipeline summary** — stages run, skipped, and why
2. **Artifacts** — files changed, tests run, PR URL if opened
3. **Risks / open questions** — anything a human must decide
