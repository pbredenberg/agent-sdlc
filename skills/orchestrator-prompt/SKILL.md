---
name: orchestrator-prompt
description: >-
  Write a standing prompt that sets up an orchestrating agent for one repository: it plans and
  delegates work to sub-agents, runs changes through the agent-sdlc pipeline, verifies results,
  and brings decisions to the owner. Use when the user asks for an "orchestrator prompt",
  "a prompt for an agent that runs <repo>", or "a prompt like the one you were set up with" for
  any repo, optionally wrapped around a specific task.
---

# Orchestrator Prompt

Produce a paste-ready prompt that turns a fresh agent session into the **orchestrator** for one
repository. The output is a prompt, not a plan or code. Nothing in the target repo changes.

## Inputs

- **Repo** (required): a local path, a clone URL, or `owner/name` on GitHub, Gitea or GitLab.
- **Task** (optional): a concrete first task, such as "build milestone 3 from docs/STATUS.md". When
  given, the prompt opens with a `## Task` section and keeps the standing rules around it.
- **Owner decisions** (gather, don't invent): who merges, what may be pushed directly, what is
  off-limits, open items, and anything the user already said in this conversation.

## Workflow

1. **Discover the repo.** Read, in this order, whatever exists:
   - AGENTS.md (root and nested), CLAUDE.md, README.md
   - status, plan or roadmap docs: `docs/STATUS.md`, `docs/execution-plans/`, ROADMAP, open milestones
   - CI config: `.github/workflows/`, `.gitea/workflows/`, `.gitlab-ci.yml`
   - release flow: release-please config, version-bump scripts, tags, CHANGELOG
   - deploy config: Dockerfile, compose files, Coolify/Vercel/Fly/k8s manifests, deploy docs
   - PR template, branch protections (when the API exposes them), the default branch
   - secret handling: `.env.example`, `.gitignore`, secret-manager notes

   Note the canonical host. If a mirror exists, mark it as one and say where pushes go.
2. **Collect the authority boundaries.** Take them from AGENTS.md first (a "standing authorization"
   section wins), then from what the user said in this conversation. When a boundary is still
   unknown, use the **defaults** below and list it under "Assumptions" in your reply. Ask the user
   only when the answer changes something dangerous: production, real money, deleting data, or
   pushing to the default branch.
3. **Fill the template** in [references/template.md](references/template.md):
   - Keep only sections with real content; drop empty ones.
   - Every fact (resource IDs, URLs, commands, workflow behaviour) must come from step 1 or the
     user. Write "check X" instead of guessing.
   - The open-items list is a snapshot. Tell the agent to check each item's state before acting.
   - Keep the agent-sdlc sections (pipeline, sub-agent report format, verification) in every prompt.
4. **Check the draft** against the rules below, then reply with:
   - the prompt in one fenced `text` block;
   - a short list of assumptions and choices the user may want to change (two to four lines);
   - an offer to save it as a file or as an agent definition, if that would help.

## Defaults (when the repo and the user are silent)

- The orchestrator branches, commits, pushes branches and opens PRs. It does not merge.
- Merging, releases, production deploys, infra/env/secret changes, deletions, scope or product
  choices, and anything costing money need the owner's OK.
- The orchestrator never merges release PRs (release-please or equivalent).
- Read-only inspection of CI, deploy platform and monitoring is allowed.
- Direct pushes to the default branch happen only when the user says so for this repo or task.
  When they do, move the adversarial review to before each push.

## Rules for the generated prompt

- It names the owner as the decision-maker and says what the orchestrator may do alone.
- It points at the repo's own AGENTS.md as the runbook, and says the stricter rule wins on conflict.
- It includes the agent-sdlc pipeline: the `/sdlc` skill (`skills/sdlc/SKILL.md` in
  `pbredenberg/agent-sdlc`), execution plans under `docs/execution-plans/` when present, and the
  stages from requirements to PR.
- It requires every sub-agent report to end with `Owner decision needed: yes/no`, plus the PR
  link, CI status and test evidence. It requires the orchestrator to verify claims itself.
- It covers what a merge to the default branch triggers (CI, version bumps, deploys) and how to
  watch it, when the repo has such automation.
- Hard rules always included:
  - no secrets in commits, logs, fixtures, docs or chat;
  - never ask the owner to paste tokens;
  - never skip, disable or weaken a test to get green;
  - no model identifiers in commits, PRs or code comments;
  - plus any project invariants AGENTS.md calls critical.
- It ends with a "start of every session" checklist: open PRs, CI on the default branch, recent
  deploys/health, pending notifications, then a report of decisions waiting on the owner.
- No personal data beyond what the repo already states. No credentials, only where they are set.
- Plain, direct language. Short bullets. One idea per bullet.
