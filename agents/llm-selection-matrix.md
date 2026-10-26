# LLM Selection Matrix

Provider-agnostic guidance for choosing model classes by task type across planned agents.

**Status:** Planned
**Scope:** `docs/agents/*.md` role assignments
**Use with:** Orchestrator routing and per-agent task policies

## Model tiers

| Tier | Typical use | Primary optimization | Trade-offs |
| --- | --- | --- | --- |
| `Fast` | Classification, extraction, formatting, triage | Low latency and cost | Lower deep-reasoning reliability |
| `Balanced` | Implementation, review, test analysis, synthesis | Quality-cost balance | Slower and costlier than fast tier |
| `HighReasoning` | Architecture, security analysis, complex debugging | Accuracy on multi-step reasoning | Highest latency and cost |
| `LocalPrivate` | Sensitive/private workflows | Data control and residency | Usually lower capability per token |

## Selection criteria

1. **Task complexity:** Multi-step reasoning and long dependency chains favor `HighReasoning`.
2. **Output determinism:** Structured JSON/contract output requires strong tool-calling or schema compliance.
3. **Context window needs:** Large transcript or repo context may require larger-context models.
4. **Latency budget:** Interactive routing and triage favor `Fast`.
5. **Cost budget:** High-volume workloads should default to `Fast` with escalation policy.
6. **Privacy constraints:** Sensitive domains may require `LocalPrivate` or private endpoint deployment.

## Role-to-task recommendations

| Role | Task type | Preferred tier | Fallback tier |
| --- | --- | --- | --- |
| Orchestrator Agent | Routing, assignment, retry policy | `Fast` | `Balanced` |
| Business Analyst | Transcript extraction and normalization | `Fast` | `Balanced` |
| Business Analyst | Gherkin drafting and ambiguity resolution | `Balanced` | `HighReasoning` |
| Software Architect | Design decomposition and trade-off analysis | `HighReasoning` | `Balanced` |
| Senior Engineer | Multi-file implementation and refactor | `Balanced` | `HighReasoning` |
| QA Engineer | Failure triage, report generation | `Balanced` | `Fast` |
| Security Specialist | Threat modeling and exploit-path analysis | `HighReasoning` | `Balanced` |
| DevOps Specialist | Pipeline diagnostics and runbook generation | `Balanced` | `HighReasoning` |
| PR Agent | PR body drafting and metadata formatting | `Balanced` | `Fast` |

## Provider examples by tier

These are examples, not hard requirements. Keep routing abstracted from provider lock-in.

| Tier | Anthropic examples | OpenAI examples | Google examples | Open-weight examples |
| --- | --- | --- | --- | --- |
| `Fast` | Claude Haiku class | GPT mini class | Gemini Flash class | Llama 3.x 8B/70B instruct |
| `Balanced` | Claude Sonnet class | GPT flagship class | Gemini Pro class | Qwen coder/instruct mid-tier |
| `HighReasoning` | Claude Opus class | GPT reasoning class | Gemini advanced reasoning class | DeepSeek/Qwen top reasoning variants |
| `LocalPrivate` | Private-hosted compatible option | Azure/private endpoint variant | Vertex private deployment | Self-hosted vLLM/Ollama stacks |

## Routing policy template

Use a default-escalate strategy:

1. Start at `Fast` for classification/extraction tasks.
2. Escalate to `Balanced` when confidence, schema validity, or quality checks fail.
3. Escalate to `HighReasoning` only for unresolved high-impact tasks.
4. Fall back to `LocalPrivate` when policy prohibits external processing.

## Quality and risk controls

- Require schema validation for structured outputs before downstream execution.
- Track tokens, latency, and retry count per `jobId` for cost governance.
- Use deterministic prompts and stable system instructions for repeatable behavior.
- Maintain benchmark tasks per role to detect model drift before rollout.
