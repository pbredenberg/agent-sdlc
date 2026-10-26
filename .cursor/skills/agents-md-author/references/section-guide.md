# AGENTS.md Section Guide

Minimal examples. Adapt commands to the actual project — never copy verbatim.

## Node / TypeScript (single package)

```markdown
# AGENTS.md

## Setup commands
- Install deps: `npm install`

## Dev commands
- Run tests in watch mode: `npm test -- --watch`

## Testing instructions
- Run tests: `npm test`
- Typecheck: `npx tsc --noEmit` (if no script)

## Code style
- TypeScript strict mode
- Block function bodies over concise arrow bodies
- Avoid nested `if` statements

## PR / commit conventions
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Run `npm test` before opening a PR

## Security notes
- Never commit `.env` or API keys
- Use environment variables for secrets
```

## Python

```markdown
# AGENTS.md

## Setup commands
- Install deps: `pip install -e ".[dev]"`

## Testing instructions
- Run tests: `pytest`
- Lint: `ruff check .`

## Code style
- Follow `pyproject.toml` formatter settings
- Type hints on public functions
```

## Monorepo (nested file — `packages/api/AGENTS.md`)

Only when this package differs from root. Keep under ~30 lines.

```markdown
# AGENTS.md

## Setup commands
- From repo root: `pnpm install`
- This package only: `pnpm install --filter @org/api`

## Testing instructions
- Run package tests: `pnpm --filter @org/api test`
- Lint: `pnpm --filter @org/api lint`

## Code style
- Express handlers use block bodies
- API routes live under `src/routes/`
```

Root `AGENTS.md` in a monorepo should list workspace-wide commands and point to nested files:

```markdown
## Monorepo layout
- Root: workspace install and CI commands
- `packages/api/AGENTS.md` — API service conventions
- `packages/web/AGENTS.md` — frontend conventions
```
