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

Deleted plan files count as **completed** dependencies for remaining plans in the same phase.

## Cross-phase ordering (`phases.yaml`)

Optional manifest at `docs/execution-plans/phases.yaml` controls `--all-phases` drain order. When absent, phases drain in alphabetical folder order (legacy behavior).

```yaml
active:
  - composition-ir
  - preview-editor
  - export-pipeline
  - hardening-qa

depends:
  preview-editor: [composition-ir]
  export-pipeline: [composition-ir]
  hardening-qa: [preview-editor, export-pipeline]
```

- `active` — phase folders included in `--all-phases` (omit archive folders).
- `depends` — cross-phase prerequisites. A phase is drained when it has zero pending `NN-*.md` files.
- Parallel siblings (same `depends` set) drain sequentially in unattended mode; use separate `--phase` terminals for true parallelism.

## CLI

```bash
# after one-time: cd ~/src/agent-sdlc && npm install && npm link
agent-sdlc-drain --phase <phase> [--max-parallel N] [--dry-run]
agent-sdlc-drain --phase .                  # no phase folder
agent-sdlc-drain --all-phases               # respects phases.yaml when present
```

See `execution-plan-author` and `execution-plan-dispatcher` skills for full protocol.
