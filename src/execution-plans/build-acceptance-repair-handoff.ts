import { buildExecPlanCommitMessage } from "./commit-gate.js";
import { extractFailedScript } from "./classify-acceptance-failure.js";
import type { PendingPlan } from "./types.js";

export type BuildAcceptanceRepairHandoffInput = {
  phase: string;
  plan: PendingPlan;
  reason: string;
  details?: string;
  attempt: number;
  maxAttempts: number;
};

export function buildAcceptanceRepairHandoff(
  input: BuildAcceptanceRepairHandoffInput,
): string {
  const failedScript = extractFailedScript(input.reason) ?? "test";
  const commitMessage = buildExecPlanCommitMessage(
    input.phase,
    `fix acceptance — ${input.plan.frontmatter.title}`,
  );

  const detailBlock = input.details?.trim() ?? "No output captured.";

  return [
    "ACCEPTANCE GATE REPAIR (mandatory — overrides AGENTS.md commit policy):",
    "",
    `The execution plan agent finished plan ${input.plan.relativePath}, but`,
    `acceptance checks failed before the drain CLI could advance.`,
    "",
    `Repair attempt: ${input.attempt} of ${input.maxAttempts}`,
    `Failed check: ${input.reason}`,
    `Plan: ${input.plan.relativePath}`,
    `Phase: ${input.phase}`,
    "",
    "Your job:",
    `1. Fix the failing ${failedScript} (and any related typecheck/lint issues).`,
    "2. Prefer fixing implementation bugs; update tests only when they are outdated.",
    "3. Run npm test, npm run typecheck, and npm run lint when those scripts exist.",
    "4. Do NOT delete or recreate execution plan files.",
    "5. Create one git commit with message:",
    `   ${commitMessage}`,
    "6. Never put secrets in LLM context.",
    "",
    "Failure output:",
    "```text",
    detailBlock.slice(0, 6000),
    "```",
  ].join("\n");
}
