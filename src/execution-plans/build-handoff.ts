import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { phaseReadmePath } from "./paths.js";
import type { PendingPlan } from "./types.js";

const HANDOFF_SECTION_RE =
  /##\s+Handoff prompt[\s\S]*?```(?:text)?\r?\n([\s\S]*?)```/i;
const PLAN_PLACEHOLDER_RE =
  /docs\/execution-plans\/[^\s`]+NN-\.\.\.\.md/g;

export type BuildHandoffInput = {
  repoRoot: string;
  phase: string;
  plan: PendingPlan;
};

export function extractHandoffTemplate(readmeMarkdown: string): string | null {
  const match = HANDOFF_SECTION_RE.exec(readmeMarkdown);
  if (!match) {
    return null;
  }
  return match[1].trim();
}

export function injectPlanPath(template: string, planRelativePath: string): string {
  const withPath = template.replace(PLAN_PLACEHOLDER_RE, planRelativePath);
  const alreadyMentions = withPath.includes(planRelativePath);
  if (alreadyMentions) {
    return withPath;
  }
  return `${withPath}\n\nExecute ONLY this execution plan: ${planRelativePath}`;
}

export function buildFallbackHandoff(
  phase: string,
  plan: PendingPlan,
): string {
  return [
    "Before changing code:",
    "1. Read the plan file and phase README.",
    `2. Execute ONLY this execution plan: ${plan.relativePath}`,
    "3. Implement only what the plan specifies.",
    "4. Run project test/lint/typecheck when applicable.",
    `5. Create one git commit: exec-plan(${phase}): ${plan.frontmatter.title}`,
    "6. Delete this plan file and update the phase README index.",
    "7. Never put secrets in LLM context.",
  ].join("\n");
}

export async function buildHandoff(input: BuildHandoffInput): Promise<string> {
  const readmePath = phaseReadmePath(input.repoRoot, input.phase);
  if (!existsSync(readmePath)) {
    return buildFallbackHandoff(input.phase, input.plan);
  }

  const readme = await readFile(readmePath, "utf8");
  const template = extractHandoffTemplate(readme);
  if (template === null) {
    return buildFallbackHandoff(input.phase, input.plan);
  }

  return injectPlanPath(template, input.plan.relativePath);
}
