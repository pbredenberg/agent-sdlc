# Execution Plan Template

Copy this skeleton for each numbered plan file.

## File naming

`NN-kebab-case-slug.md` where `NN` is zero-padded two-digit order (01, 02, …).

## Skeleton

```markdown
---
id: "NN-kebab-case-slug"
title: "Human-readable title"
depends_on: []
parallel_group: null
---

## Objective

<Single sentence describing what this plan delivers.>

## Scope

- In scope:
  - ...
- Out of scope:
  - ...

## Steps

1. ...
2. ...
3. ...

## Acceptance criteria

- [ ] ...
- [ ] ...

## Validation

- `npm test` (if present)
- `npm run typecheck` (if present)
- `npm run lint` (if present)

## Commit message

exec-plan(<phase>): <title>
```

## Example with dependency

```markdown
---
id: "02-add-rate-limit-middleware"
title: "Add rate limit middleware"
depends_on: ["01-add-rate-limit-schema"]
parallel_group: null
---

## Objective

Add Express middleware that enforces per-IP rate limits using the schema from plan 01.

## Scope

- In scope:
  - Middleware function
  - Unit tests for middleware
- Out of scope:
  - Admin UI for limit configuration

## Steps

1. Create `src/middleware/rate-limit.ts`
2. Wire middleware into public API routes
3. Add unit tests

## Acceptance criteria

- [ ] Requests over limit return 429
- [ ] Tests pass

## Validation

- `npm test`
- `npm run lint`

## Commit message

exec-plan(rate-limit-api): Add rate limit middleware
```
