# AGENTS.md

Agent runbook for the agent-sdlc repository — ships as both a Cursor plugin and a Claude Code plugin. Human docs live in [README.md](README.md).

## Setup commands

- First-time setup: `npm run setup` (install deps + dev install)
- Install plugin for dev in this repo: `npm run install:dev`
- Install for Cloud builds only: `npm run install:cloud`
- Vendor into another app repo: `npm run vendor -- <app>`
- Link drain CLI globally: `npm run install:global-cli` (exposes `agent-sdlc-drain`)

## Update commands

- Update this checkout: `npm run update`
- Refresh global drain CLI: `npm run update:global-cli`
- Refresh vendored skills in an app repo: `npx github:pbredenberg/agent-sdlc update --commit`

## Dev commands

- Drain execution plans (dry run): `agent-sdlc-drain --phase <name> --dry-run`
- Drain execution plans: `agent-sdlc-drain --phase <name>` (requires `CURSOR_API_KEY`)
- Drain on Claude instead of Cursor: `agent-sdlc-drain --phase <name> --backend claude` (requires `ANTHROPIC_API_KEY`)
- Drain root (no phase folder): `agent-sdlc-drain --phase .`
- Drain all phases: `agent-sdlc-drain --all-phases`
- Drain without global link: `npm run execution-plans:drain -- --phase <name> [--cwd <app>]`

## Testing instructions

- Run tests: `npm test`

## Code style

- TypeScript with block function bodies over concise arrow bodies
- Declarative, composable code; avoid nested `if` statements
- Match existing skill and agent doc conventions when editing under `skills/` or `agents/`
- After editing skills under `skills/`, re-run `npm run install:dev` so `.cursor/skills/` stays in sync (Claude Code reads `skills/` directly — no copy step needed there)

## PR / commit conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Execution plan commits: `exec-plan(<phase>): <title>`
- Run `npm test` before opening a PR
- Do not commit unless explicitly asked

## Security notes

- Never commit `CURSOR_API_KEY`, `ANTHROPIC_API_KEY`, or other secrets
- `.agent-sdlc/` is gitignored — do not force-add dispatch state

## SDLC kit

- Use `/sdlc` for the full ticket-to-PR pipeline in Agent chat
- **Cloud Agents:** if `/sdlc` is missing from the slash palette, type `/sdlc` in your prompt (the `sdlc-kit` rule applies) or attach the **sdlc** skill manually
- Use `/execution-plan-dispatch` to advance numbered plans under `docs/execution-plans/`
- Use `/agents-md-author` to create or refresh AGENTS.md when scaffolding or when commands drift
- Skill source of truth: `skills/` (copied to `.cursor/skills/` by install script)
