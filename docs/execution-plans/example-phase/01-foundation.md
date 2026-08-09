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
- Out of scope:
  - Module A and B implementations

## Steps

1. Create `src/example/foundation.ts` with a `createFoundation()` export.
2. Add a unit test.

## Acceptance criteria

- [ ] `createFoundation()` exists and is tested

## Validation

- `npm test`

## Commit message

exec-plan(example-phase): Create foundation scaffold
