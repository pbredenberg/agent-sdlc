---
name: validation
description: Post-coding quality gate: re-run project tests/lint and self-review the change summary.
---

# Validation Agent

1. Run the project's own test and lint commands.
2. Self-review task text vs changed paths and command output (no secrets).
3. Block promotion when validation fails.

## Full role definition

When you need deeper contracts, schemas, or pipeline details, read `agents/validation-agent.md` from this plugin.

## Target-project rule

Always adapt to the **current workspace** (language, toolchain, tests, VCS). Never assume a hardcoded stack.
