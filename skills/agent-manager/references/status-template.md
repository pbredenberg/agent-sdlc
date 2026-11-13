# One-screen status template

Keep it to one phone screen. Lead with decisions.

```markdown
**Needs you**
- <decision, with a link> — I recommend <option>.

**Merged since last update**
- <repo>: <PR URL> — <one line>

**Running**
- <repo>: <topic> — <stage: implementing / review / CI>

**State**
| Repo | Open PRs | Open issues | Plans left | Default-branch CI | Deploy |
| --- | --- | --- | --- | --- | --- |
| owner/name | n | n | n (phase…) | green/red | ok/failing/n/a |

**Proposed next batch**
1. <repo> plan `NN-…` → `claude/<topic>` (parallel group A)
2. <repo> fix CI on main → `claude/<topic>` (parallel group A)
3. <repo> plan `NN+1-…` (after 1 merges)

Reply "go" to start, or tell me what to change.
```
