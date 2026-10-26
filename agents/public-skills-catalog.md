# Public Skills Catalog

Curated external OSS skill sources and role mappings for agent development.

**Status:** Planned
**Purpose:** Identify reusable public skills that can accelerate specialist agent behavior definitions.

## Primary source libraries

| Source | URL | Strength | Notes |
| --- | --- | --- | --- |
| VoltAgent awesome list | https://github.com/VoltAgent/awesome-agent-skills | Broad catalog with many official vendor-maintained skills | Good discovery index; quality varies by contributor |
| Kodus awesome list | https://github.com/kodustech/awesome-agent-skills | Category-driven curation (DevOps, QA, Security, Infra, Tooling) | Helpful for quick role-based filtering |
| alirezarezvani/claude-skills | https://github.com/alirezarezvani/claude-skills | Large concrete skill corpus with many engineering workflows | Includes scripts; requires stronger security review |

## Role-based skill candidates

Each role should start with 2-4 vetted skills, then expand based on measured benefit.

| Role | Candidate skills | Why it helps | Risk notes |
| --- | --- | --- | --- |
| DevOps Specialist | `gitops-workflow`, `ci-cd-pipeline-builder`, `observability-designer`, `incident-commander` | Improves deployment safety and operations consistency | Validate generated workflow permissions and environment assumptions |
| Business Analyst | `internal-comms`, PM toolkit skills, product strategy skills | Better requirement normalization and stakeholder-ready outputs | Watch for overconfident assumptions in ambiguous transcript interpretation |
| Software Architect | `senior-architect`, `agent-workflow-designer`, `database-designer`, `migration-architect` | Improves architecture trade-off quality and decomposition | Validate against existing ADRs and avoid speculative abstractions |
| Senior Engineer | `api-test-suite-builder`, `agents-md-author`, `pr-review-expert`, `tech-debt-tracker` | Accelerates implementation validation and refactor quality | Ensure generated patterns match repo conventions |
| QA Engineer | `playwright-pro`, `tdd-workflow`, `lint-and-validate`, `agentic-eval` | Better defect reproducibility and output quality checks | Mitigate flaky test generation and false confidence |
| Security Specialist | `skill-security-auditor`, `dependency-auditor`, `checking-owasp-compliance`, `auditing-access-control` | Adds structured security review and policy checks | Treat results as advisory until validated with repo-specific controls |
| PR Agent | `release-manager`, `changelog-generator`, `gh-issue-triage` | Improves release hygiene, changelog quality, and metadata consistency | Avoid over-automation that bypasses branch protection expectations |
| Orchestrator Agent | `agent-designer`, `orchestrator`, `self-improving-agent`, `agentic-eval` | Improves routing policies, handoffs, and quality feedback loops | Prevent unbounded autonomous loops; enforce retry budgets |

## Adoption workflow

1. Select a candidate skill aligned to one role and one measurable objective.
2. Review `SKILL.md` and any scripts for safety, portability, and quality.
3. Run a bounded pilot on representative tasks with baseline comparison.
4. Approve, reject, or adapt into internal skill docs with version pinning.

## Vetting checklist (required before adoption)

- License compatibility with project usage and distribution model.
- Active maintenance (recent updates, issue responsiveness, community adoption).
- Security screening for prompt-injection vectors and unsafe command guidance.
- Clear constraints and failure behavior in the skill instructions.
- Reproducible evaluation task showing measurable improvement over baseline.

## Security review checklist for skill content

- No hardcoded secrets, tokens, or unsafe default credentials.
- No instructions that bypass branch protection, code review, or policy gates.
- No destructive commands without explicit confirmation requirements.
- External network calls are explicit, bounded, and policy-allowed.
- Tool execution scope is least-privilege and auditable.

## Integration guidance for this repository

- Keep external skills as reference inputs; do not blindly import large bundles.
- Normalize adopted guidance into concise, role-specific docs under `docs/agents/`.
- Preserve project constraints from `AGENTS.md`, `docs/plan.md`, and `docs/decisions.md`.
- Record major adoption decisions in `docs/decisions.md` when they change architecture or process.
