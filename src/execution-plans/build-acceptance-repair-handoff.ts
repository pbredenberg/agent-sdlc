import { buildExecPlanCommitMessage } from "./commit-gate.js";
import {
  classifyAcceptanceFailure,
  extractFailedScript,
} from "./classify-acceptance-failure.js";
import type { AcceptanceFailureKind } from "./classify-acceptance-failure.js";
import type { PendingPlan } from "./types.js";

export type BuildAcceptanceRepairHandoffInput = {
  phase: string;
  plan: PendingPlan;
  reason: string;
  details?: string;
  attempt: number;
  maxAttempts: number;
};

const IMPLEMENTATION_FIRST_RULES = [
  "IMPLEMENTATION-FIRST REPAIR RULES (mandatory):",
  "- Fix the production/source code that causes test, typecheck, or lint failures.",
  "- Do NOT weaken, delete, skip, or `.only` tests to make the suite pass.",
  "- Do NOT change assertions, snapshots, or expected values to match incorrect behavior.",
  "- Do NOT disable lint or type rules to silence failures.",
  "- Update tests ONLY when the plan intentionally changed behavior and tests are provably stale.",
  "- When a test documents expected behavior, treat failures as implementation bugs.",
].join("\n");

function buildCommitRepairSteps(
  phase: string,
  plan: PendingPlan,
): string[] {
  const commitMessage = buildExecPlanCommitMessage(phase, plan.frontmatter.title);

  return [
    "Your job (commit repair):",
    "1. Stage all implementation changes from the plan agent.",
    "2. Delete the execution plan file if it is still present.",
    `3. Create one git commit with message: ${commitMessage}`,
    "4. Run npm test, npm run typecheck, and npm run lint when those scripts exist.",
    "5. Never put secrets in LLM context.",
  ];
}

function buildPlanRepairSteps(
  phase: string,
  plan: PendingPlan,
): string[] {
  const commitMessage = buildExecPlanCommitMessage(phase, plan.frontmatter.title);

  return [
    "Your job (plan cleanup repair):",
    `1. Delete the execution plan file: ${plan.relativePath}`,
    "2. Ensure all plan implementation changes are committed.",
    `3. If no matching commit exists, create one: ${commitMessage}`,
    "4. Run npm test, npm run typecheck, and npm run lint when those scripts exist.",
    "5. Never put secrets in LLM context.",
  ];
}

function buildScriptRepairSteps(
  phase: string,
  plan: PendingPlan,
  failedScript: string,
): string[] {
  const commitMessage = buildExecPlanCommitMessage(
    phase,
    `fix acceptance — ${plan.frontmatter.title}`,
  );

  return [
    IMPLEMENTATION_FIRST_RULES,
    "",
    `Your job (script repair — failing ${failedScript}):`,
    `1. Fix the implementation that causes ${failedScript} to fail.`,
    "2. Run npm test, npm run typecheck, and npm run lint when those scripts exist.",
    "3. Do NOT delete or recreate execution plan files.",
    `4. Create one git commit with message: ${commitMessage}`,
    "5. Never put secrets in LLM context.",
  ];
}

function buildRepairSteps(
  kind: AcceptanceFailureKind,
  phase: string,
  plan: PendingPlan,
  reason: string,
): string[] {
  if (kind === "commit_failure") {
    return buildCommitRepairSteps(phase, plan);
  }

  if (kind === "plan_failure") {
    return buildPlanRepairSteps(phase, plan);
  }

  const failedScript = extractFailedScript(reason) ?? "test";
  return buildScriptRepairSteps(phase, plan, failedScript);
}

export function buildAcceptanceRepairHandoff(
  input: BuildAcceptanceRepairHandoffInput,
): string {
  const failure = {
    ok: false as const,
    reason: input.reason,
    details: input.details,
  };
  const kind = classifyAcceptanceFailure(failure);
  const detailBlock = input.details?.trim() ?? "No output captured.";
  const repairSteps = buildRepairSteps(
    kind,
    input.phase,
    input.plan,
    input.reason,
  );

  return [
    "ACCEPTANCE GATE REPAIR (mandatory — overrides AGENTS.md commit policy):",
    "",
    `The execution plan agent finished plan ${input.plan.relativePath}, but`,
    "acceptance checks failed before the drain CLI could advance.",
    "",
    `Repair attempt: ${input.attempt} of ${input.maxAttempts}`,
    `Failed check: ${input.reason}`,
    `Plan: ${input.plan.relativePath}`,
    `Phase: ${input.phase}`,
    "",
    ...repairSteps,
    "",
    "Failure output:",
    "```text",
    detailBlock.slice(0, 6000),
    "```",
  ].join("\n");
}
