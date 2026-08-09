# Execution Plans (agent-sdlc)

Shared convention for drafting and draining numbered execution plans in the **target workspace**.

## Location

```text
docs/execution-plans/<phase>/
  README.md
  01-slug.md
  02-slug.md
```

Plans may also sit directly under `docs/execution-plans/` (no phase folder). Drain those with `--phase .`.

## Modes

| Mode | Skill | May edit app code? |
| --- | --- | --- |
| Draft plans | `execution-plan-author` | **No** |
| Dispatch (interactive) | `execution-plan-dispatcher` | **No** |
| Drain (unattended) | `agent-sdlc-drain` | Agents implement; CLI orchestrates |

## Plan frontmatter

```yaml
---
id: "02-slug"
title: "Human title"
depends_on: ["01-slug"]
parallel_group: null
---
```

## Completion (implementing agent)

1. Ship plan deliverables
2. Run project test/lint/typecheck when applicable
3. Commit: `exec-plan(<phase>): <title>` (use `exec-plan(.): <title>` for root plans)
4. Delete plan file; update phase README index

## CLI

```bash
# after one-time: cd ~/src/agent-sdlc && npm install && npm link
agent-sdlc-drain --phase <phase> [--max-parallel N] [--dry-run]
agent-sdlc-drain --phase .                  # no phase folder
agent-sdlc-drain --all-phases               # every phase, sort order
```

See `execution-plan-author` and `execution-plan-dispatcher` skills for full protocol.
