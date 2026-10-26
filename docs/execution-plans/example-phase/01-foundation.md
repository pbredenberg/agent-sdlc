---
id: "01-foundation"
title: "Create foundation scaffold"
depends_on: []
parallel_group: null
---

## Objective

Create the shared foundation that later plans depend on.

## Scope

- In scope:
  - Foundation module stub
  - Root `AGENTS.md` with setup and test commands
- Out of scope:
  - Module A and B implementations

## Steps

1. Create `src/example/foundation.ts` with a `createFoundation()` export.
2. Add a unit test.
3. Create root `AGENTS.md` with verified setup and test commands (see `agents-md-author` skill).

## Acceptance criteria

- [ ] `createFoundation()` exists and is tested
- [ ] Root `AGENTS.md` exists with setup and test commands

## Validation

- `npm test`

## Commit message

exec-plan(example-phase): Create foundation scaffold
