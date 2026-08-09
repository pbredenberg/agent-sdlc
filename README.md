# agent-sdlc

Cursor plugin that turns this multi-agent SDLC kit into an invokable slash command across your projects.

## Slash commands

| Invoke | What it does |
| --- | --- |
| `/sdlc` | Runs the full factory pipeline against the **current** workspace (orchestrate → BA → architecture → context → QA → implement → validate → security/DevOps → PR) |
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
| **AGENTS.md pointer** | Optional Cloud runbook that tells agents to follow `/sdlc` when present |

### Solo / per-repo fallback

```bash
# from an application repository
mkdir -p .cursor/skills
git submodule add https://github.com/pbredenberg/agent-sdlc.git vendor/agent-sdlc
ln -s ../../vendor/agent-sdlc/skills/sdlc .cursor/skills/sdlc
# optionally link other skills the same way
```

Or copy `skills/sdlc` (and any specialists you need) into `.cursor/skills/` and commit them so Cloud clones include them.

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

## Notes

- `skills/` is the Cursor plugin discovery root (unique skill names). Role trees under `agents/*/skills/` keep the original organization; when the same skill existed on multiple roles, the plugin exports one canonical copy.
- Full contracts and schemas remain in `agents/**/AGENT.md`.
- After editing a skill under `agents/`, mirror the change into `skills/<name>/` (or re-copy) so the slash command surface stays in sync.
