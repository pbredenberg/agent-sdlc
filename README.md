# agent-sdlc

Cursor plugin that turns this multi-agent SDLC kit into an invokable slash command across your projects.

## Slash commands

| Invoke | What it does |
| --- | --- |
| `/sdlc` | Runs the full factory pipeline against the **current** workspace (orchestrate → BA → architecture → context → QA → implement → validate → security/DevOps → PR) |
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

## Install for all Desktop projects

### Option A — local plugin (fastest)

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git ~/src/agent-sdlc
mkdir -p ~/.cursor/plugins/local
ln -s ~/src/agent-sdlc ~/.cursor/plugins/local/agent-sdlc
```

Reload Cursor (**Developer: Reload Window**). Confirm `/sdlc` appears when you type `/` in Agent chat.

Install at **user** scope in Customize so every local project sees it.

### Developing this plugin in its own repo

Clone this repository and run the dev installer once (or let Cloud Agents run it via `.cursor/environment.json`):

```bash
git clone https://github.com/pbredenberg/agent-sdlc.git
cd agent-sdlc
bash scripts/install-plugin-dev.sh
```

That script:

1. Copies every skill under `.cursor/skills/` from `skills/` so **this repo** exposes `/sdlc` and specialist slash commands (Desktop + Cloud). Real files are required — symlinks are not reliably discovered by Cloud Agents.
2. Copies `commands/sdlc.md` to `.cursor/commands/sdlc.md` for workspace slash-command discovery.
3. Symlinks `~/.cursor/plugins/local/agent-sdlc` → this checkout so the full plugin manifest (`commands/`, `plugin-agents/`, etc.) loads on Desktop after reload.

Re-run the script after adding a new skill directory under `skills/`.

### Option B — Team Marketplace (Desktop + Cloud)

1. Cursor Dashboard → **Plugins** → **Team Marketplaces** → import this GitHub repo.
2. Set the plugin to **Default On** or **Required** for your team.
3. Teammates get `/sdlc` in the IDE; Cloud Agents on team repos pick up the same plugin distribution.

User-only `~/.cursor/...` paths do **not** reach Cursor Cloud VMs. Use a Team Marketplace (or commit skills into each repo) for Cloud.

## Install for Cursor Cloud on every project

| Approach | When to use |
| --- | --- |
| **Team Marketplace** Required / Default On | Best for all team Cloud Agent runs |
| **Commit this plugin into each app repo** | Solo / no Team plan — add as submodule or vendored `.cursor/` skills |
| **AGENTS.md** | Agent runbook at repo root — `/sdlc` auto-generates and maintains it via `agents-md-author`; see [agents.md](https://agents.md/) |

### Solo / per-repo fallback

```bash
# from an application repository
mkdir -p .cursor/skills
git submodule add https://github.com/pbredenberg/agent-sdlc.git vendor/agent-sdlc
ln -s ../../vendor/agent-sdlc/skills/sdlc .cursor/skills/sdlc
# optionally link other skills the same way
```

Or copy `skills/sdlc` (and any specialists you need) into `.cursor/skills/` and commit them so Cloud clones include them.

## Updating installations in other repos

After this repository changes (new skills, `/sdlc` updates, plugin layout), refresh each install method as follows. Pick the path that matches how you installed.

### Local plugin (Option A symlink)

The Desktop plugin is a symlink into your clone, so updating is a pull + reload:

```bash
# in the clone that ~/.cursor/plugins/local/agent-sdlc points at
cd ~/src/agent-sdlc   # or your clone path
git pull
```

Then **Developer: Reload Window** in Cursor. Re-link only if you moved the clone or deleted the symlink; otherwise `git pull` is enough.

### In-repo plugin development (`install-plugin-dev.sh`)

Workspace skills under `.cursor/skills/` are **copies**, not live links to `skills/`. After pulling this repo:

```bash
cd /path/to/agent-sdlc
git pull
bash scripts/install-plugin-dev.sh
```

Re-run the script whenever `skills/` or `commands/` change so Desktop and Cloud Agents see the new files. Reload Cursor after the script finishes.

### Team Marketplace

Marketplace installs track the imported GitHub repo for your team.

1. Merge (or release) the desired changes on the branch Cursor imports for this plugin.
2. Wait for teammates’ Cursor clients to refresh the marketplace plugin, or ask them to open **Plugins → Team Marketplaces**, confirm **agent-sdlc**, and reinstall/refresh if `/sdlc` or new skills do not appear.
3. Reload the window if slash commands still look stale.

No per-app-repo `git pull` is required for marketplace consumers.

### Per-repo submodule

From each application repository that vendors this plugin via submodule:

```bash
# from the application repository
git submodule update --remote vendor/agent-sdlc
git add vendor/agent-sdlc
git commit -m "chore: bump agent-sdlc submodule"
```

If you symlinked `.cursor/skills/<name>` into the submodule, those links pick up the new tip automatically after the submodule bump. Commit the submodule pointer in the app repo so Cloud clones get the update.

Adjust `vendor/agent-sdlc` if your submodule path differs.

### Vendored / copied skills (no submodule)

If you copied `skills/` (or selected skill folders) into another repo’s `.cursor/skills/`:

1. Pull or download the desired revision of this repository.
2. Re-copy the skill directories you use (at least `skills/sdlc`, plus any specialists you linked).
3. Commit the updated files in the application repository.

Copied trees do not update themselves — treat each bump as a deliberate vendor refresh.

### Quick reference

| Install method | Update action | Reload Cursor? |
| --- | --- | --- |
| Local plugin symlink | `git pull` in the clone | Yes |
| `install-plugin-dev.sh` | `git pull` + re-run script | Yes |
| Team Marketplace | Ship upstream; refresh plugin in Cursor if needed | Yes if commands stale |
| Submodule in app repo | `git submodule update --remote` + commit pointer | Yes (Desktop); Cloud uses next clone/PR |
| Copied `.cursor/skills` | Re-copy from upstream + commit | Yes (Desktop); Cloud uses next clone/PR |

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

From the agent-sdlc checkout (target repo as cwd):

```bash
npm install
export CURSOR_API_KEY=cursor_...

# Preview handoffs
npm run execution-plans:drain -- --phase example-phase --dry-run

# Drain sequentially
npm run execution-plans:drain -- --phase my-phase

# Parallel batches when dependencies allow
npm run execution-plans:drain -- --phase my-phase --max-parallel 3
```

State file: `.agent-sdlc/plan-dispatch-state.json` (gitignored).

## Notes

- `skills/` is the Cursor plugin discovery root (unique skill names). Role trees under `agents/*/skills/` keep the original organization; when the same skill existed on multiple roles, the plugin exports one canonical copy.
- Full contracts and schemas remain in `agents/**/AGENT.md`.
- After editing a skill under `agents/`, mirror the change into `skills/<name>/` (or re-copy) so the slash command surface stays in sync.
