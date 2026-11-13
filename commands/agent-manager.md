---
name: agent-manager
description: Run a multi-repo agent manager that dispatches background sub-agents through the agent-sdlc orchestrator and skills, gates on review + CI, and merges green decision-free PRs. Usage: /agent-manager [owner/repo …]
disable-model-invocation: true
---

# /agent-manager — Multi-repo Agent Manager

Read and follow the `agent-manager` skill in this plugin (`skills/agent-manager/SKILL.md`) in full. It is the single source of truth for scope resolution, worker briefs, merge rules, ask-first policy, and reporting — do not restate or reimplement any of that here.

Arguments (optional): the managed repositories as `owner/repo`, space-separated. Without arguments, read the `## Agent manager` section of the workspace `AGENTS.md`.
