# Skills Attribution

This directory vendors third-party agent skills from public OSS repositories. All vendored skills are redistributed verbatim under the original authors' MIT licenses.

Skills are retained only if they are **model-agnostic** (work with any LLM) and **tool-agnostic** (no dependence on a specific host, plugin runtime, or skill-bundled executable scripts). Skills that violated those criteria have been removed — see the "Rejected" section below.

## Sources

| Source | URL | License |
| --- | --- | --- |
| alirezarezvani/claude-skills | https://github.com/alirezarezvani/claude-skills | MIT (Copyright (c) 2025 Alireza Rezvani) |
| wshobson/agents | https://github.com/wshobson/agents | MIT (Copyright (c) 2024 Seth Hobson) |

## Retained skills (14 entries across 7 agents)

Stored under `docs/agents/<agent>/skills/<skill-name>/`. The same skill may appear under multiple agents when reused.

| Agent | Skill | Source |
| --- | --- | --- |
| `pr-agent` | `pr-review-expert` | alirezarezvani/claude-skills `engineering/pr-review-expert` |
| `pr-agent` | `release-manager` | alirezarezvani/claude-skills `engineering/release-manager` |
| `orchestrator-agent` | `agent-designer` | alirezarezvani/claude-skills `engineering/agent-designer` |
| `software-architect` | `database-designer` | alirezarezvani/claude-skills `engineering/database-designer` |
| `software-architect` | `migration-architect` | alirezarezvani/claude-skills `engineering/migration-architect` |
| `senior-engineer` | `pr-review-expert` | alirezarezvani/claude-skills `engineering/pr-review-expert` |
| `senior-engineer` | `api-test-suite-builder` | alirezarezvani/claude-skills `engineering/api-test-suite-builder` |
| `business-analyst` | `agile-product-owner` | alirezarezvani/claude-skills `product-team/agile-product-owner` |
| `qa-engineer` | `api-test-suite-builder` | alirezarezvani/claude-skills `engineering/api-test-suite-builder` |
| `qa-engineer` | `pr-review-expert` | alirezarezvani/claude-skills `engineering/pr-review-expert` |
| `devops-specialist` | `gitops-workflow` | wshobson/agents `plugins/kubernetes-operations/skills/gitops-workflow` |
| `devops-specialist` | `istio-traffic-management` | wshobson/agents `plugins/cloud-infrastructure/skills/istio-traffic-management` |
| `devops-specialist` | `observability-designer` | alirezarezvani/claude-skills `engineering/observability-designer` |
| `devops-specialist` | `release-manager` | alirezarezvani/claude-skills `engineering/release-manager` |

The `security-specialist` agent has **no retained vendored skills**. All three candidates were rejected (see below) because they duplicate ecosystem-native scanners that should be invoked directly through the project profile instead of wrapped in bundled Python scripts.

## Removed for portability (14 entries)

These were originally imported and have since been removed. They failed the model- or tool-agnostic bar in one of two ways.

### Hard host coupling (plugin bundles)

| Skill | Prior location | Reason |
| --- | --- | --- |
| `self-improving-agent` | `orchestrator-agent/skills/` | Claude Code plugin with `.claude-plugin/`, `settings.json`, and `/si:*` commands tied to the Claude Code runtime and `MEMORY.md`. |
| `playwright-pro` | `qa-engineer/skills/` | Claude Code plugin with `.claude-plugin/`, `.mcp.json`, `settings.json`, and `/pw:*` commands. |

### Skill-bundled executable scripts as primary workflow

The SKILL.md of each of these makes its primary instruction "run `python3 scripts/X.py`" against Python files shipped inside the skill directory. Those scripts are not callable from the TypeScript engine, and instructing a foreign LLM to execute them in arbitrary target-project sandboxes produces hallucinated output.

| Skill | Prior location |
| --- | --- |
| `agent-workflow-designer` | `orchestrator-agent/skills/`, `software-architect/skills/` |
| `senior-architect` | `software-architect/skills/` |
| `ci-cd-pipeline-builder` | `devops-specialist/skills/` |
| `incident-commander` | `devops-specialist/skills/` |
| `tech-debt-tracker` | `senior-engineer/skills/` |
| `skill-security-auditor` | `security-specialist/skills/` |
| `env-secrets-manager` | `security-specialist/skills/` |
| `dependency-auditor` | `security-specialist/skills/` |
| `product-manager-toolkit` | `business-analyst/skills/` |
| `ux-researcher-designer` | `business-analyst/skills/` |
| `changelog-generator` | `pr-agent/skills/` |

For security and DevOps capabilities previously covered by these skills, the factory relies on **ecosystem-native tooling invoked through the target project's profile** (e.g. `npm audit`, `pip-audit`, `cargo audit`, `govulncheck`, `gitleaks`, `trufflehog`, standard `kubectl`/Helm commands). That keeps the engine portable across any project stack.

## Never imported (link-only sources)

These are curated awesome-lists rather than hosted skill repositories — individual skills would need to be fetched from their upstream repos and vetted independently.

- All `kodustech/awesome-agent-skills` references in every agent's `AGENT.md`.
- All `VoltAgent/awesome-agent-skills` references (e.g. `cloudflare/agents-sdk`, `anthropics/webapp-testing`, `hashicorp/terraform-*`, `openai/codex`, `trailofbits`, `addy-osmani/web-quality`). Any adoption would follow the pilot workflow in `docs/agents/public-skills-catalog.md`.

## Retained skill caveats

The retained skills are reference guidance, not plug-in capability. They carry the following caveats:

1. **Not yet vetted** against the security review checklist in `docs/agents/public-skills-catalog.md`.
2. A few retained skills (`agile-product-owner`, `migration-architect`, `observability-designer`, `pr-review-expert`, `release-manager`, `api-test-suite-builder`) still ship `scripts/`, `references/`, or `assets/` subfolders from upstream. Those supporting files are not invoked by the engine. If the content references running a script, treat it as documentation only and produce equivalent output inline.
3. `wshobson/agents` skills assume standard Kubernetes tooling (`kubectl`, `helm`, `argocd`, `istioctl`). These are universal in the cloud-native ecosystem and acceptable as "tool-agnostic" — the agent does not ship them.
