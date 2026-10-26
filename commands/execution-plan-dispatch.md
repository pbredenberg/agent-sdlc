---
name: execution-plan-dispatch
description: Dispatch numbered execution plans under docs/execution-plans/ one plan per fresh agent. Use for interactive plan advancement or unattended drain via agent-sdlc-drain.
disable-model-invocation: true
---

# /execution-plan-dispatch — Execution Plan Dispatcher

Lead every reply with `[execution-plan-dispatch]` so the Agents transcript stays readable.

You are **traffic control only**. Follow the **`execution-plan-dispatcher`** skill end to end:

1. Discover phases under `docs/execution-plans/`
2. Parse dependencies from plan frontmatter
3. Select next runnable plan(s)
4. Build and output a handoff prompt for a **fresh** Agent chat
5. Never implement plan deliverables in this chat

## Unattended drain

One-time: `cd ~/src/agent-sdlc && npm install && npm link`. Then from the app repo:

```bash
export CURSOR_API_KEY=cursor_...
agent-sdlc-drain --phase <phase-name> [--dry-run] [--max-plans N] [--max-parallel N]
agent-sdlc-drain --phase .              # plans directly under docs/execution-plans/
agent-sdlc-drain --all-phases           # every phase folder, sort order
```

Requires `CURSOR_API_KEY`. Same one-plan-per-agent rule; state in `.agent-sdlc/plan-dispatch-state.json`.

## Related skills

- `execution-plan-author` — draft plans only (never implement)
- `execution-plan-dispatcher` — this dispatcher protocol
