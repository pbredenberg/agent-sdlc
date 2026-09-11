# agent-sdlc

Cursor and Claude Code plugin that turns this multi-agent SDLC kit into an invokable slash command across your projects.

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
  plugin.json          # Cursor plugin manifest
  marketplace.json     # team marketplace entry (this repo = one plugin)
.claude-plugin/
  plugin.json          # Claude Code plugin manifest (same skills/commands)
  marketplace.json     # self-referential marketplace entry
commands/
  sdlc.md              # /sdlc command
skills/
  sdlc/SKILL.md        # preferred slash surface for /sdlc
  <skill>/             # plugin-discoverable specialists (single canonical copy)
plugin-agents/         # Cursor agent personas (frontmatter + concise prompts)
agents/                # Full role docs (AGENT.md) + vendoring/licensing provenance
```

`skills/` and `commands/` are shared source for **both** plugins — there is no separate copy step for Claude Code (unlike Cursor's `.cursor/` install), since Claude Code plugins read `commands/`, `skills/`, etc. directly from the plugin root.

## Install

Pick **one** path. Do not mix submodule + symlink setups — Cursor Cloud needs **real files** under `.cursor/skills/` (copies), not symlinks.

### Install modes

Use **`agent-sdlc-install`** (ships with this repo) or the npm script shortcut — no multiline bash required. This single table is the canonical reference; every path below just says which mode to run.

| Mode | npm script | Positional CLI | What it does | Use when |
| --- | --- | --- | --- | --- |
| `dev` | `npm run install:dev` (first time: `npm run setup`, which also runs `npm install`) | `agent-sdlc-install dev` | Copy `skills/`, `commands/`, `rules/` → `.cursor/*` + symlink `~/.cursor/plugins/local/agent-sdlc` | Developing this plugin |
| `cloud` | `npm run install:cloud` | `agent-sdlc-install cloud` | Same copy, no Desktop symlink | Cloud environment builds (also runs automatically via `.cursor/environment.json`) |
| `desktop` | `npm run install:desktop` | `agent-sdlc-install desktop` | Desktop symlink only, no copy | Re-linking Desktop without re-copying |
| `vendor-full` | `npm run vendor -- <app>` | `agent-sdlc-install vendor <app>` | Copy full kit into `<app>/.cursor/*` | Vendoring into another app repo |
| `vendor-minimal` | `npm run vendor:minimal -- <app>` | `agent-sdlc-install minimal <app>` | Copy only the `/sdlc` skill + command + cloud rule | Vendoring `/sdlc` only, no specialists |
| `global-cli` | `npm run install:global-cli` | — | `npm link`s `agent-sdlc-drain` onto your `PATH` | Draining execution plans from any repo |

Legacy flag form still works: `npm run install:plugin -- --mode dev`. Positional CLI example with an explicit source: `agent-sdlc-install vendor . --source-url https://github.com/pbredenberg/agent-sdlc.git`.

| Path | Use when |
| --- | --- |
| [1. Desktop local plugin](#1-desktop--local-plugin-all-projects) | Solo Desktop; one install for every local project |
| [2. Team Marketplace](#2-team-marketplace-desktop--cloud) | Team Desktop + Cloud Agents across repos |
| [3. Copy skills into each app repo](#3-copy-skills-into-each-app-repo-cloud--solo) | Solo Cloud, no Team plan, or you want skills committed with the app |

### Cloud Agents and `/sdlc`

Cloud Agents do not use `~/.cursor/plugins/local/`. They discover skills from committed `.cursor/skills/` (real files, not symlinks). Slash palettes can be inconsistent — if `/sdlc` does not appear, type `/sdlc` in your prompt anyway (the `sdlc-kit` rule picks it up) or attach the **sdlc** skill from Customize → Skills.

`.cursor/environment.json` in this repo runs `npm run install:cloud` at build time. **Also commit** `.cursor/skills/`, `.cursor/commands/`, and `.cursor/rules/` so indexing works before install finishes.

### 1. Desktop — local plugin (all projects)

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git ~/src/agent-sdlc
cd ~/src/agent-sdlc
npm run setup
```

`npm run setup` is `npm install` + `dev` mode (see the Install modes table above): it copies `skills/` → `.cursor/skills/`, `commands/*.md` → `.cursor/commands/`, and `rules/*.mdc` → `.cursor/rules/` (real files, required for Cloud Agents), then symlinks `~/.cursor/plugins/local/agent-sdlc` → this checkout.

Then in Cursor: **Developer: Reload Window**. Confirm `/sdlc` appears when you type `/` in Agent chat. Install the plugin at **user** scope in Customize so every local project sees it. Re-run `npm run install:dev` after adding a skill under `skills/` (Cloud Agents also re-run `npm run install:cloud` automatically via `.cursor/environment.json`).

`~/.cursor/...` does **not** reach Cursor Cloud VMs. For Cloud, use path 2 or 3.

### 2. Team Marketplace (Desktop + Cloud)

1. Cursor Dashboard → **Plugins** → **Team Marketplaces** → import `https://github.com/pbredenberg/agent-sdlc`.
2. Set the plugin to **Default On** or **Required**.
3. Teammates get `/sdlc` in the IDE; Cloud Agents on team repos pick up the same distribution.

### 3. Copy skills into each app repo (Cloud / solo)

**Preferred** when you are not on Team Marketplace. Copy skills into the application repo and commit them so every clone (including Cloud) has `/sdlc`.

From the **application repository** root:

```bash
npx github:pbredenberg/agent-sdlc vendor .
git add .cursor/skills .cursor/commands .cursor/rules
git commit -m "chore: vendor agent-sdlc skills for Cursor"
```

Or with a local agent-sdlc checkout:

```bash
npm run vendor -- /path/to/your-app
```

Minimum (pipeline command only — specialists will be missing unless you copy them too):

```bash
npm run vendor:minimal -- /path/to/your-app
```

`AGENTS.md` at the app repo root is the agent runbook — `/sdlc` auto-generates and maintains it via `agents-md-author` (see [agents.md](https://agents.md/)).

### Claude Code

`.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` register the same `skills/` and `commands/` as a Claude Code plugin — no copy step needed; Claude Code reads them straight from the plugin root.

Ad hoc, for one session:

```bash
cd agent-sdlc
claude --plugin-dir .
```

Personal, persistent (this machine only — writes to gitignored `.claude/settings.local.json`):

```bash
claude plugin marketplace add ./ --scope local
claude plugin install agent-sdlc@agent-sdlc-marketplace --scope local -y
```

Shared, persistent (so every clone of this repo gets `/sdlc` automatically — writes to committed `.claude/settings.json`). This only resolves once `.claude-plugin/` exists on the repo's default branch, so run it **after** this change is merged:

```bash
claude plugin marketplace add pbredenberg/agent-sdlc --scope project
claude plugin install agent-sdlc@agent-sdlc-marketplace --scope project -y
git add .claude/settings.json
git commit -m "chore: enable agent-sdlc Claude Code plugin for this repo"
```

Then `/sdlc` and the individual specialist skills are available the same way they are in Cursor. `claude plugin validate .` checks the manifests; `claude plugin details agent-sdlc@agent-sdlc-marketplace` shows the loaded skill/command inventory.

**Known limitation:** `plugin-agents/*.md` (Cursor's agent personas) are not currently exposed as Claude Code subagents — the installed Claude Code CLI's plugin loader silently drops a `plugin.json` `agents` array even though it validates, so `.claude-plugin/plugin.json` intentionally declares `"agents": []`. This doesn't block `/sdlc`: the pipeline is driven by skills, not by delegating to formal subagents, in both plugins.

## Updating

Use **`agent-sdlc-update`** or `npm run update` — profile is auto-detected.

| Install method | Update command |
| --- | --- |
| Desktop local plugin (this repo) | `npm run update` |
| Global `agent-sdlc-drain` | `npm run update:global-cli` |
| Copied `.cursor/skills` in an app | `npx github:pbredenberg/agent-sdlc update --commit` |
| Team Marketplace | Merge upstream; refresh plugin in Dashboard |

Then **Developer: Reload Window** when Desktop commands look stale.

### Desktop local plugin

```bash
cd ~/src/agent-sdlc
npm run update
```

### Team Marketplace

1. Merge the desired changes on the branch Cursor imports for this plugin.
2. Refresh under **Plugins → Team Marketplaces** if `/sdlc` looks stale.
3. Reload the window if needed.

No per-app-repo update is required for marketplace consumers.

### Copied skills in an app repo

```bash
cd /path/to/your-app
npx github:pbredenberg/agent-sdlc update --commit
```

Add `--commit` to stage and commit the refreshed `.cursor` files in one step.

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

## CI & Releases

`.github/workflows/ci.yml` runs on every PR (open, update, reopen) targeting `main` and on every push to `main`: `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`), and `npm test`.

`.github/workflows/release-please.yml` runs [release-please](https://github.com/googleapis/release-please) on push to `main`. It keeps a standing "Release PR" whose diff is the next version bump + `CHANGELOG.md` entry, built from Conventional Commit commits merged since the last release (PR titles *and* individual commits should use `feat:`/`fix:`/`chore:`/etc. — this repo merges with real merge commits, so the changelog is generated from the actual commits, not the PR title; `Merge pull request #N from …` subjects are ignored automatically since they aren't Conventional Commits). Merging that Release PR bumps `package.json`, updates the changelog, tags the commit, and publishes a GitHub Release. Nothing is published to npm (`private: true`).

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

Paste the handoff into a **new** Agent chat. The implementing agent commits with `exec-plan(<phase>): <title>` and deletes the plan file. Handoffs prepend a mandatory commit mandate (overrides `AGENTS.md` "do not commit" policy). From a clean working tree, the drain CLI auto-commits if the agent forgets.

### Drain (unattended CLI)

Plans live in the **app** repo under `docs/execution-plans/<phase>/`. The CLI ships with this repository.

#### One-time global install

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git ~/src/agent-sdlc
cd ~/src/agent-sdlc
npm run install:global-cli
```

That puts `agent-sdlc-drain` on your `PATH`. Refresh after pulling CLI changes with `npm run update:global-cli`.

#### Run from any app repo

`--backend` picks which SDK spawns each plan's agent: `cursor` (default, needs `CURSOR_API_KEY`) or `claude` (needs `ANTHROPIC_API_KEY`).

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

# Run on Claude instead of Cursor Cloud Agents
export ANTHROPIC_API_KEY=sk-ant-...
agent-sdlc-drain --phase my-phase --backend claude
```

`--cwd` defaults to the current directory (the app). Override if needed: `agent-sdlc-drain --cwd /path/to/your-app --phase my-phase`.

`--model` defaults to `composer-2.5` for `--backend cursor` and `claude-sonnet-5` for `--backend claude`; pass `--model <id>` to override either.

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

- `skills/` is the single canonical source for every skill body (unique skill names), and the plugin discovery root for **both** Cursor and Claude Code. There is no per-role copy anywhere else — edit a skill only under `skills/<name>/`.
- `agents/**/AGENT.md` holds the full role contracts/schemas and, per role, which `skills/` entries it draws on (see `agents/SKILLS-ATTRIBUTION.md` for vendoring/licensing provenance). These are narrative/reference docs, not a second copy of skill bodies.
- `.claude-plugin/` and `.cursor-plugin/` both point at the same `commands/` and `skills/` — edit those once, not per tool.
