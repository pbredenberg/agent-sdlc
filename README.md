# agent-sdlc

Cursor plugin that turns this multi-agent SDLC kit into an invokable slash command across your projects.

## Slash commands

| Invoke | What it does |
| --- | --- |
| `/sdlc` | Runs the full SDLC pipeline against the **current** workspace (orchestrate → BA → architecture → context → QA → implement → validate → security/DevOps → PR) |
| `/execution-plan-dispatch` | Dispatches numbered execution plans one plan per fresh agent |
| `/workflow-orchestrator-routing`, `/pr-packager`, … | Individual specialist skills (also listed under Customize → Skills) |

`/sdlc` is slash-only (`disable-model-invocation: true`) so it runs when you invoke it, not because the model guessed the workflow.

## Layout

```text
.cursor-plugin/
  plugin.json          # plugin manifest
  marketplace.json     # team marketplace entry (this repo = one plugin)
commands/
  sdlc.md              # /sdlc command
skills/
  sdlc/SKILL.md        # preferred slash surface for /sdlc
  <skill>/             # plugin-discoverable specialists (exported from agents/)
plugin-agents/         # Cursor agent personas (frontmatter + concise prompts)
agents/                # Full role docs + role-organized skill copies
```

## Install

Pick **one** path. Do not mix submodule + symlink setups — Cursor Cloud needs **real files** under `.cursor/skills/` (copies), not symlinks.

Use the **`agent-sdlc-install`** CLI (ships with this repo) instead of hand-copying bash snippets:

```bash
npm install
npm run install:plugin -- --mode <mode> [options]
# or after npm link: agent-sdlc-install --mode <mode>
```

| Mode | Command | Use when |
| --- | --- | --- |
| `dev` | `npm run install:plugin -- --mode dev` | Developing this plugin (copy + Desktop symlink) |
| `cloud` | `npm run install:plugin -- --mode cloud` | Cloud environment builds (copy only) |
| `desktop` | `npm run install:plugin -- --mode desktop` | Desktop local plugin symlink only |
| `vendor-full` | `npm run install:plugin -- --mode vendor-full --target <app>` | Copy full kit into an app repo |
| `vendor-minimal` | `npm run install:plugin -- --mode vendor-minimal --target <app>` | Copy `/sdlc` skill + command + cloud rule only |
| `global-cli` | `npm run install:plugin -- --mode global-cli` | `npm link` for `agent-sdlc-drain` |

Clone upstream into an app repo without a local checkout:

```bash
npm run install:plugin -- --mode vendor-full --target /path/to/app --source-url https://github.com/pbredenberg/agent-sdlc.git
```

| Path | Use when |
| --- | --- |
| [1. Desktop local plugin](#1-desktop--local-plugin-all-projects) | Solo Desktop; one install for every local project |
| [2. Team Marketplace](#2-team-marketplace-desktop--cloud) | Team Desktop + Cloud Agents across repos |
| [3. Copy skills into each app repo](#3-copy-skills-into-each-app-repo-cloud--solo) | Solo Cloud, no Team plan, or you want skills committed with the app |

### Cloud Agents and `/sdlc`

Cloud Agents do not use `~/.cursor/plugins/local/`. They discover skills from committed `.cursor/skills/` (real files, not symlinks). Slash palettes can be inconsistent — if `/sdlc` does not appear, type `/sdlc` in your prompt anyway (the `sdlc-kit` rule picks it up) or attach the **sdlc** skill from Customize → Skills.

`.cursor/environment.json` in this repo runs `npm run install:plugin -- --mode cloud` at build time. **Also commit** `.cursor/skills/`, `.cursor/commands/`, and `.cursor/rules/` so indexing works before install finishes.

### 1. Desktop — local plugin (all projects)

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git ~/src/agent-sdlc
cd ~/src/agent-sdlc
npm install
npm run install:plugin -- --mode dev
```

Then in Cursor: **Developer: Reload Window**. Confirm `/sdlc` appears when you type `/` in Agent chat. Install the plugin at **user** scope in Customize so every local project sees it.

`~/.cursor/...` does **not** reach Cursor Cloud VMs. For Cloud, use path 2 or 3.

### 2. Team Marketplace (Desktop + Cloud)

1. Cursor Dashboard → **Plugins** → **Team Marketplaces** → import `https://github.com/pbredenberg/agent-sdlc`.
2. Set the plugin to **Default On** or **Required**.
3. Teammates get `/sdlc` in the IDE; Cloud Agents on team repos pick up the same distribution.

### 3. Copy skills into each app repo (Cloud / solo)

**Preferred** when you are not on Team Marketplace. Copy skills into the application repo and commit them so every clone (including Cloud) has `/sdlc`.

From the **application repository** root:

```bash
# Full kit (pipeline + specialists + cloud /sdlc rule)
git clone https://github.com/pbredenberg/agent-sdlc.git /tmp/agent-sdlc
cd /tmp/agent-sdlc && npm install
npm run install:plugin -- --mode vendor-full --target /path/to/your-app

cd /path/to/your-app
git add .cursor/skills .cursor/commands .cursor/rules
git commit -m "chore: vendor agent-sdlc skills for Cursor"
```

Or clone upstream in one step (no local agent-sdlc checkout):

```bash
cd /path/to/your-app
npx --yes github:pbredenberg/agent-sdlc agent-sdlc-install \
  --mode vendor-full \
  --target . \
  --source-url https://github.com/pbredenberg/agent-sdlc.git
git add .cursor/skills .cursor/commands .cursor/rules
git commit -m "chore: vendor agent-sdlc skills for Cursor"
```

Minimum (pipeline command only — specialists will be missing unless you copy them too):

```bash
npm run install:plugin -- --mode vendor-minimal --target /path/to/your-app
```

`AGENTS.md` at the app repo root is the agent runbook — `/sdlc` auto-generates and maintains it via `agents-md-author` (see [agents.md](https://agents.md/)).

### Developing this plugin (this repository only)

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git
cd agent-sdlc
npm install
npm run install:plugin -- --mode dev
```

That command:

1. Copies every skill from `skills/` → `.cursor/skills/` (real files — required for Cloud Agents).
2. Copies `commands/*.md` → `.cursor/commands/`.
3. Copies `rules/*.mdc` → `.cursor/rules/` (Cloud `/sdlc` fallback).
4. Symlinks `~/.cursor/plugins/local/agent-sdlc` → this checkout for Desktop after reload.

Re-run after adding a skill under `skills/`. Cloud Agents also run `npm run install:plugin -- --mode cloud` via `.cursor/environment.json`.

## Updating

Use the same path you installed with.

### Desktop local plugin

```bash
cd ~/src/agent-sdlc   # path your ~/.cursor/plugins/local/agent-sdlc symlink points at
git pull
```

Then **Developer: Reload Window**. Re-run the `ln -sfn` install only if you moved the clone.

If you use the drain CLI globally, refresh the link after CLI changes:

```bash
cd ~/src/agent-sdlc
npm install
npm link
```

### Team Marketplace

1. Merge the desired changes on the branch Cursor imports for this plugin.
2. Refresh under **Plugins → Team Marketplaces** if `/sdlc` looks stale.
3. Reload the window if needed.

No per-app-repo update is required for marketplace consumers.

### Copied skills in an app repo

Re-run the vendor install, then commit. Example (full kit):

```bash
cd /path/to/your-app
npx --yes github:pbredenberg/agent-sdlc agent-sdlc-install \
  --mode vendor-full \
  --target . \
  --source-url https://github.com/pbredenberg/agent-sdlc.git

git add .cursor/skills .cursor/commands .cursor/rules
git commit -m "chore: refresh agent-sdlc skills"
```

Copied trees do not update themselves — each bump is a deliberate re-copy + commit.

### This repo (`install:plugin`)

```bash
cd /path/to/agent-sdlc
git pull
npm install
npm run install:plugin -- --mode dev
```

Reload Cursor after the script finishes.

### Quick reference

| Install method | Update | Reload Cursor? |
| --- | --- | --- |
| Desktop local plugin | `git pull` in the clone (+ `npm link` if you use the drain CLI) | Yes |
| Team Marketplace | Ship upstream; refresh plugin if needed | If commands look stale |
| Copied `.cursor/skills` in an app | Re-copy from upstream + commit | Yes (Desktop); Cloud on next clone/PR |
| `install:plugin --mode dev` (this repo) | `git pull` + re-run install | Yes |
| `agent-sdlc-install` / `install:plugin` | See mode table above | Yes for dev/desktop |
| Global `agent-sdlc-drain` | `git pull` + `npm install` + `npm link` in the clone | No |

## Usage

In Agent chat (Desktop or Cloud):

```text
/sdlc Implement rate limiting on the public API and open a PR
```

Stage-only examples:

```text
/pr-packager
/security-change-review
/business-analyst-requirements-pack
```

## Execution plans

Draft numbered plans (no implementation) and drain them with one fresh agent per plan.

### Draft (agent chat)

```text
/execution-plan-author Draft execution plans for rate limiting under phase rate-limit-api
```

Or via architecture:

```text
/architecture-slice-planner Break the rate limit feature into execution plans only — do not implement
```

Plans are written to `docs/execution-plans/<phase>/` with YAML frontmatter (`depends_on`, `parallel_group`).

### Dispatch (interactive)

```text
/execution-plan-dispatch What's next for phase rate-limit-api?
```

Paste the handoff into a **new** Agent chat. The implementing agent commits with `exec-plan(<phase>): <title>` and deletes the plan file.

### Drain (unattended CLI)

Plans live in the **app** repo under `docs/execution-plans/<phase>/`. The CLI ships with this repository.

#### One-time global install

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git ~/src/agent-sdlc
cd ~/src/agent-sdlc
npm install
npm run install:plugin -- --mode global-cli
```

That puts `agent-sdlc-drain` on your `PATH`. Re-run `npm install && npm link` after pulling CLI changes.

#### Run from any app repo

```bash
export CURSOR_API_KEY=cursor_...
cd /path/to/your-app

# Preview handoffs
agent-sdlc-drain --phase example-phase --dry-run

# Drain sequentially
agent-sdlc-drain --phase my-phase

# Parallel batches when dependencies allow
agent-sdlc-drain --phase my-phase --max-parallel 3

# Plans with no phase folder (files directly under docs/execution-plans/)
agent-sdlc-drain --phase .

# Every active phase (uses docs/execution-plans/phases.yaml when present; else alphabetical)
agent-sdlc-drain --all-phases
agent-sdlc-drain --all-phases --dry-run
```

`--cwd` defaults to the current directory (the app). Override if needed: `agent-sdlc-drain --cwd /path/to/your-app --phase my-phase`.

#### Without a global link

From the agent-sdlc checkout:

```bash
cd ~/src/agent-sdlc
npm install
export CURSOR_API_KEY=cursor_...

npm run execution-plans:drain -- --cwd /path/to/your-app --phase my-phase --dry-run
npm run execution-plans:drain -- --cwd /path/to/your-app --phase my-phase
```

State file (in the app repo): `.agent-sdlc/plan-dispatch-state.json` (gitignored).

## Notes

- `skills/` is the Cursor plugin discovery root (unique skill names). Role trees under `agents/*/skills/` keep the original organization; when the same skill existed on multiple roles, the plugin exports one canonical copy.
- Full contracts and schemas remain in `agents/**/AGENT.md`.
- After editing a skill under `agents/`, mirror the change into `skills/<name>/` (or re-copy) so the slash command surface stays in sync.
