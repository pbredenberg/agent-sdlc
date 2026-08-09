---
name: agents-md-author
description: >-
  Create and maintain succinct AGENTS.md agent runbooks for the current project.
  Use when scaffolding a project, refreshing agent context, or when setup/test/lint
  commands or conventions drift from the existing AGENTS.md.
---

# AGENTS.md Author

You own [AGENTS.md](https://agents.md/) files for the **current workspace**. AGENTS.md is an agent runbook — not a second README. Keep it short so agents spend fewer tokens on repeated discovery.

## Triggers

Use this skill when:

- The operator scaffolds or bootstraps a new project (`scaffold`, `greenfield`, `new project`, `bootstrap`)
- `/sdlc` stage **Agent context profile** runs after codebase context (every implementation run)
- Setup, dev, test, lint, build, or typecheck commands change
- Workspace layout gains a package with a distinct toolchain (monorepo)
- Commit/PR conventions are detected or change
- The operator says "refresh AGENTS.md" or "update agent context"

## Hard rules

1. **Succinct** — target ~40–80 lines at repo root; shorter for nested files.
2. **Verified commands only** — list commands that exist in `package.json`, `Makefile`, `pyproject.toml`, CI config, or equivalent.
3. **No README duplication** — link to README for human narrative; do not copy marketing or architecture essays.
4. **Closest file wins** — per [agents.md nested rules](https://agents.md/), place nested `AGENTS.md` only where a subproject has different commands.
5. **Minimal diff** — patch only sections that drift; do not rewrite unchanged content.

## Workflow

1. **Discover project profile** from the repo:
   - Language, package manager, monorepo layout
   - Install, dev, test, lint, typecheck, build commands
   - Code style signals (`.editorconfig`, linter config, existing conventions)
   - PR/commit conventions (`.github/pull_request_template.md`, `commitlint`, recent git history)
   - Security-sensitive areas (auth, webhooks, secrets, CI)
   - Whether agent-sdlc plugin is present (`.cursor/skills/sdlc` or vendored skills)
2. **Read nearest AGENTS.md** — root `AGENTS.md`, or the closest file to the changed paths in a monorepo.
3. **Diff profile vs file** — identify missing, stale, or incorrect sections.
4. **Create or patch**:
   - **Scaffold / greenfield:** always create root `AGENTS.md`; add nested files only for packages with distinct toolchains.
   - **Implementation run:** patch when material drift exists; skip with reason when current.
   - **Investigation:** read only; do not write unless the operator asks.
5. **Validate** — confirm listed commands resolve to real scripts or targets (dry-check via config files).

## Section template

Include only sections with real content. Omit empty sections.

```markdown
# AGENTS.md

## Setup commands
- Install deps: `<command>`

## Dev commands
- Start dev server: `<command>`

## Testing instructions
- Run tests: `<command>`
- Run single test: `<command>` (when applicable)

## Code style
- <bullet conventions agents violate often>

## PR / commit conventions
- <format, branch rules, required checks>

## Security notes
- <secrets, auth boundaries, never-commit paths>

## SDLC factory
- Use `/sdlc` for full ticket-to-PR pipeline when this plugin is installed.
```

## Maintenance triggers

Patch AGENTS.md when any of these drift from the file:

| Signal | Example |
| --- | --- |
| Script changes | New `npm run lint` in `package.json` |
| Command path changes | Test runner moved from Jest to Vitest |
| New workspace package | `packages/api/` with its own `package.json` scripts |
| Convention detection | PR template or commitlint config added |
| Security paths | New auth middleware or webhook handler dirs |

**No-op when:** file exists, sections match the discovered profile, and listed commands are still valid.

## Scaffold mode

For `scaffold` / `greenfield` classification:

1. Create root `AGENTS.md` as part of the foundation deliverable.
2. Include setup and test commands once they exist (may be updated in the same PR as toolchain setup).
3. Add `/sdlc` pointer when the agent-sdlc plugin is present or will be installed.
4. For monorepos, add nested `AGENTS.md` per package **only** when scripts or conventions differ from root.

## Output template

```markdown
## AGENTS.md handoff
- Action: created | updated | skipped
- Path(s): AGENTS.md [, packages/foo/AGENTS.md]
- Sections changed: ...
- Reason: ...
- Commands verified: ...
```

## Guardrails

- Do not invent commands or conventions not evidenced in the repo.
- Do not exceed ~80 lines at root without strong justification.
- Do not generate proprietary formats (`.cursorrules`, `CLAUDE.md`) — AGENTS.md only.
- Bundle AGENTS.md changes in the same PR as related toolchain or layout changes.
- When unsure about a convention, omit it or mark as inferred — do not state as fact.

## References

- [section-guide.md](references/section-guide.md) — minimal examples for Node, Python, and monorepo layouts
