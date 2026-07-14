# PR Agent

Packages validated work into review-ready pull/merge requests on **whichever VCS provider the target project uses** (GitHub / GitLab / Bitbucket / Gitea) and updates the originating task system (Jira / Notion / Trello / Linear) with traceable release metadata. Provider selection is driven by `projectProfile`, not hardcoded to GitHub.

**Status:** Planned — final factory stage; closes the loop from ticket to reviewable change.
**Location:** `src/agents/pr-agent.ts` (planned)
**Model class:** Fast for formatting and metadata tasks, balanced for PR narrative synthesis and change-risk communication.

## Pipeline position

- **Consumes:** `approvedChangeSet` from QA + Security, `ticketContext` (original ticket source + id), `projectProfile` (VCS provider, branch naming, commit convention, review rules, CODEOWNERS equivalents), and the full chain of agent artifacts for PR-body synthesis.
- **Produces:** A branch, one or more commits, an opened PR/MR, and a ticket status transition.
- **Never merges.** Human approval is a hard boundary enforced upstream of this agent.

## Responsibilities

1. Create/update feature branches and commit approved changes.
2. Generate structured PR title/body with summary, rationale, and test plan.
3. Link PR to originating ticket and update status to `In Review`.
4. Assign reviewers using CODEOWNERS and ownership metadata.
5. Emit PR lifecycle events for Orchestrator state updates.

## Inputs

| Field | Type | Description |
| --- | --- | --- |
| `jobId` | UUID | Correlation ID |
| `approvedChangeSet` | object[] | Files and commit-ready metadata |
| `validationResult` | object | QA/security approvals and caveats |
| `ticketContext` | object | Source ticket identifiers and links |
| `projectProfile` | object | VCS provider + host, branch naming, commit conventions, CODEOWNERS-equivalent, ticket-linkback format |
| `repoPolicy` | object | Branch protection, required checks, review rules |

## Outputs

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `opened`, `updated`, `blocked`, `failed` |
| `prUrl` | string? | Pull request URL |
| `branchName` | string | Feature branch name |
| `commitShas` | string[] | Commits included in PR |
| `ticketUpdate` | object | Ticket status transition payload |
| `errorMessage` | string? | Present on failures |

## Decision boundaries

- Can create branches, commits, and PRs using scoped automation credentials for the target project's VCS provider.
- Can block if required approvals, tests, or metadata are missing.
- Must not merge PRs or bypass required reviews/human approval policy.
- Must preserve commit and PR conventions defined by the target project (Conventional Commits, repo-specific prefixes, template fields) — fall back to  defaults from `AGENTS.md` only when none are detected.

## Failure modes and escalation

- Git conflict or branch protection rejection -> escalate to Senior Engineer with conflict summary.
- Missing ticket mapping -> return `blocked` and request source linkage.
- API/auth failure with VCS provider -> retry within budget then escalate to DevOps Specialist.
- Reviewer assignment ambiguity -> fallback to default owner group and flag follow-up.

## Skills

In-house (authoritative):

- `pr-packager` — branch/commit/PR mechanics, ticket-linkback, reviewer assignment discipline.

Vendored (reference guidance):

- `pr-review-expert` (from `alirezarezvani/claude-skills`) — PR-body checklist, blast-radius framing, breaking-change callouts.
- `release-manager` (from `alirezarezvani/claude-skills`) — release-note framing and hotfix discipline for PRs that cut releases.

Rejected for portability (not imported):

- `changelog-generator` — primary workflow is bundled Python scripts. Conventional-Commits summarization is produced directly by the agent instead.
- All `kodustech/awesome-agent-skills` and `VoltAgent/awesome-agent-skills` entries — link lists rather than hosted skills.

## Guardrails

- Respect branch protection and human-in-the-loop merge requirements.
- Never include secrets or sensitive logs in PR descriptions.
- Keep PR description factual, test-backed, and minimally verbose.
- Ensure every PR includes reproducible validation steps.
