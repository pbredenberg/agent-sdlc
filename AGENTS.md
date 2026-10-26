# AGENTS.md

Agent runbook for the agent-sdlc repository — ships as both a Cursor plugin and a Claude Code plugin. Human docs live in [README.md](README.md).

## Setup commands

- First-time setup: `npm run setup` (install deps + dev install)
- Install plugin for dev in this repo: `npm run install:dev`
- Install for Cloud builds only: `npm run install:cloud`
- Vendor into another app repo: `npm run vendor -- <app>`
- Link drain CLI globally: `npm run install:global-cli` (exposes `agent-sdlc-drain`)

## Update commands

- Update this checkout: `npm run update` — refreshes `.cursor/*` (Cursor); also auto-detects and refreshes a project-scope, GitHub-hosted Claude Code marketplace registration if `.claude/settings.json` has one. A local Claude Code install needs no refresh — it reads `skills/`/`commands/` live (verified: adding a skill file shows up in `claude plugin details` instantly, no update step).
- Refresh global drain CLI: `npm run update:global-cli`
- Refresh vendored skills in an app repo: `npx github:pbredenberg/agent-sdlc update --commit` — refreshes both `.cursor/*` and the `.agent-sdlc-plugin/` Claude Code ad hoc bundle, committing both. See README's [Updating](README.md#updating) for the full Cursor vs. Claude Code breakdown, and [Claude Code in a vendored app repo](README.md#claude-code-in-a-vendored-app-repo) for why that bundle has no team-shareable persistent option.

## Dev commands

- Drain execution plans (dry run): `agent-sdlc-drain --phase <name> --dry-run`
- Drain execution plans: `agent-sdlc-drain --phase <name>` (requires `CURSOR_API_KEY`)
- Drain on Claude instead of Cursor: `agent-sdlc-drain --phase <name> --backend claude` (requires `ANTHROPIC_API_KEY`)
- Drain root (no phase folder): `agent-sdlc-drain --phase .`
- Drain all phases: `agent-sdlc-drain --all-phases`
- Drain without global link: `npm run execution-plans:drain -- --phase <name> [--cwd <app>]`

## Testing instructions

- Run tests: `npm test`
- Lint: `npm run lint` (ESLint, flat config in `eslint.config.js`)
- Typecheck / build check: `npm run typecheck` (`tsc --noEmit`)
- CI runs lint + typecheck + test on every PR (open/sync/reopen against `main`) and on push to `main`: `.github/workflows/ci.yml`

## Code style

- TypeScript with block function bodies over concise arrow bodies
- Declarative, composable code; avoid nested `if` statements
- Match existing skill and agent doc conventions when editing under `skills/` or `agents/`
- After editing skills under `skills/`, re-run `npm run install:dev` so `.cursor/skills/` stays in sync (Claude Code reads `skills/` directly — no copy step needed there)

## PR / commit conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:` — both the PR title and every individual commit (this repo merges with a merge commit, not squash, so real commit messages drive the changelog)
- Execution plan commits: `exec-plan(<phase>): <title>`
- Run `npm test`, `npm run lint`, and `npm run typecheck` before opening a PR
- Do not commit unless explicitly asked

## Releases

- [release-please](https://github.com/googleapis/release-please) watches `main` (`.github/workflows/release-please.yml`) and maintains a standing "Release PR" that accumulates the next version bump and `CHANGELOG.md` entry from Conventional Commit commits merged since the last release
- Merge commit subjects (`Merge pull request #N from …`) don't match the Conventional Commits format, so release-please ignores them automatically — only the real `feat:`/`fix:`/etc. commits count
- Merging the Release PR cuts the actual release: it bumps `package.json`'s `version`, updates `CHANGELOG.md`, tags the commit, and publishes a GitHub Release — no manual version bumping
- Config: `release-please-config.json` / `.release-please-manifest.json`. This package is `private`, so nothing is published to npm

## Security notes

- Never commit `CURSOR_API_KEY`, `ANTHROPIC_API_KEY`, or other secrets
- `.agent-sdlc/` is gitignored — do not force-add dispatch state. `.agent-sdlc-plugin/` (a vendor-time output in a *target* app repo, not this repo) is a different, unrelated, committed directory — do not conflate the two.

## SDLC kit

- Use `/sdlc` for the full ticket-to-PR pipeline in Agent chat
- **Cloud Agents:** if `/sdlc` is missing from the slash palette, type `/sdlc` in your prompt (the `sdlc-kit` rule applies) or attach the **sdlc** skill manually
- Use `/execution-plan-dispatch` to advance numbered plans under `docs/execution-plans/`
- Use `/agents-md-author` to create or refresh AGENTS.md when scaffolding or when commands drift
- Skill source of truth: `skills/` (copied to `.cursor/skills/` by install script)
