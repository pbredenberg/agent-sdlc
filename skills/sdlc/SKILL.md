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

1. **Orchestrate** — classify the task (`implementation` | `investigation` | `unknown`), build a plan, set retry budgets. Use skill `workflow-orchestrator-routing`.
2. **Business Analyst** — normalize requirements, acceptance criteria, open questions. Prefer `business-analyst-requirements-pack`, `gherkin-scenario-writer`, `agile-product-owner`.
3. **Software Architect** — slice work, constraints, and interfaces. Prefer `architecture-slice-planner`; use `database-designer` or `migration-architect` when schema/migration work appears.
4. **Codebase context** — gather the minimal relevant files, conventions, test/lint/build commands from this repo (treat discovery as the project profile).
5. **QA author** — ensure failing or characterizing tests exist before implementation. Prefer `api-test-suite-builder` when API surface changes.
6. **Senior Engineer** — implement against tests and project conventions. Use `implementation-quality-loop`.
7. **Validation / QA** — re-run the project's own test/lint/build commands; gate on `qa-acceptance-validator`.
8. **Security + DevOps** — review risk and operational readiness. Use `security-change-review`, `devops-operations-readiness`, and other DevOps skills only when relevant.
9. **PR** — open or update a review-ready PR. Use `pr-packager`, `pr-review-expert`, `release-manager` as needed. **Never merge** without explicit human approval.

## Operating rules

- Discover language, package manager, test/lint/build, and VCS conventions from **this** repository. Do not hardcode another project's toolchain.
- Prefer small, reviewable diffs. Keep commits and PR narrative traceable to the original request.
- Stop and ask when product intent, compliance, or ownership is ambiguous. Resolve engineering clarifications yourself when possible.
- Bound retries; escalate blockers instead of looping forever.
- When the user names a single stage (e.g. "just review the PR"), run only that stage and its skill(s).

## Output

Finish with:

1. **Pipeline summary** — stages run, skipped, and why
2. **Artifacts** — files changed, tests run, PR URL if opened
3. **Risks / open questions** — anything a human must decide
