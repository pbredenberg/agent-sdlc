# Agent manager config (`AGENTS.md` section)

Put this in the `AGENTS.md` of the workspace you launch the manager from (often a "hub" repo, or the main app repo). `/agent-manager` with no arguments reads it.

```markdown
## Agent manager

- Name: DigUp Food
- Repos:
  - digupfood/digup-platform-dev
  - digupfood/digup-more
  - digupfood/digup-pitch-deck
- Deploy platform: Coolify (read-only for the manager)
- Merge method: merge commit        # optional; otherwise read each repo's AGENTS.md / settings
- Release PRs: release-please       # never merged by the manager
- Extra ask-first:
  - Changes to pitch-deck copy
- Extra don'ts for workers:
  - Do not touch `infra/terraform/`
```

Rules:

- **Repos** is required. Everything else is optional.
- Per-repo `AGENTS.md` / `CLAUDE.md` still wins on repo specifics (commands, merge method, commit format). This section only adds manager-level policy.
- Overrides can only **tighten** the defaults in `SKILL.md` (more ask-first items, more don'ts). They cannot grant the manager permission for anything the skill lists under "Ask the owner first".
- Never put secrets, tokens, or env values here.
