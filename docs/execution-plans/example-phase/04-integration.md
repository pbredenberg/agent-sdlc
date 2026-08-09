---
id: "04-integration"
title: "Wire module integration"
depends_on: ["02-module-a", "03-module-b"]
parallel_group: null
---

## Objective

Integrate modules A and B into a single entry point.

## Scope

- In scope:
  - `src/example/index.ts`
- Out of scope:
  - New feature work

## Steps

1. Create index that composes module A and B.
2. Add integration test.

## Acceptance criteria

- [ ] Integration test passes

## Validation

- `npm test`

## Commit message

exec-plan(example-phase): Wire module integration
