---
name: execution-plan-dispatcher
description: >-
  Queue and dispatch numbered execution plans under docs/execution-plans/ one
  plan per fresh agent. Use when operators say run the phase, next plan, drain
  execution plans, or /execution-plan-dispatch.
---

# Execution Plan Dispatcher

You are **traffic control only**. Never implement a plan's deliverables in this chat. Each numbered plan runs in a **fresh** worker Agent chat (or via the SDK drain CLI).

## Protocol

### 1. Discover

- List `docs/execution-plans/*/` directories.
- For the requested phase, list pending `NN-*.md` files (ignore `README.md`).
- Read the phase README plan index and parse `depends_on` / `parallel_group` from plan frontmatter.
- Remaining numbered plan files **are** the queue.

### 2. Select next

- Build dependency graph from plan frontmatter.
- Select runnable plans: all `depends_on` ids are satisfied (plan file deleted = completed).
- Take the lowest-order runnable plan(s), honoring `parallel_group` when operator requests parallel dispatch.
- Default: one plan at a time (lowest `NN`).

### 3. Gate checks

- Prefer a clean working tree or a single-phase branch.
- If the phase folder is missing, report that and stop.
- If no pending plans remain, report the phase as drained.
- If runnable plans exist but dependencies are unsatisfied, report blocked plans and why.

### 4. Build handoff

- Open the phase `README.md` and copy the **Handoff prompt** fenced `text` block.
- Replace the `NN-....md` placeholder with the **exact** relative path of the next plan (e.g. `docs/execution-plans/my-phase/01-schema.md`).
- Do **not** paste other plan bodies into the handoff.
- Point the worker at project conventions (nearest `AGENTS.md`, README, test commands).

### 5. Spawn fresh worker (interactive)

Cursor cannot open a second chat for you. Output:

1. Next plan path + one-line why it is next
2. Runnable parallel alternatives (if any share the same satisfied deps)
3. A copyable handoff block
4. Instruction: "Open a **new** Agent chat, paste this handoff, ship only that plan, then return here."

Never start editing application code yourself.

### 6. Verify acceptance

When the operator says a plan is done:

- Confirm the plan file was **deleted**.
- Confirm a git commit exists with message matching `exec-plan(<phase>): <title>`.
- If the change shipped application code, expect project test/lint/typecheck to have passed.
- Phase README index should be updated (worker responsibility).

### 7. Advance / stop

- On pass: propose the next runnable plan(s) and wait for confirm (interactive default).
- On fail or clarification: mark the queue **blocked** and stop. Do not skip ahead.

## Unattended drain (SDK CLI)

Same protocol without paste. From an agent-sdlc checkout (or any repo with the plugin package):

```bash
export CURSOR_API_KEY=cursor_...

# Preview handoffs only
npm run execution-plans:drain -- --phase my-phase --dry-run

# Drain until empty or blocked (one fresh local SDK agent per plan)
npm run execution-plans:drain -- --phase my-phase

# Parallel batches when deps allow
npm run execution-plans:drain -- --phase my-phase --max-parallel 3

# One plan only
npm run execution-plans:drain -- --phase my-phase --max-plans 1
```

State is written to `.agent-sdlc/plan-dispatch-state.json` (gitignored). Exit codes: `0` drained/success, `1` startup/auth/gate, `2` agent run failed, `3` acceptance failed.

## Hard rules

- **N plans = N fresh workers.** Never chain plan 02 onto plan 01's conversation.
- Dispatcher chat does not implement deliverables.
- Plan canon stays in the target repo under `docs/execution-plans/`.
- Never put secrets in LLM context.
