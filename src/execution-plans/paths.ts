import { join } from "node:path";

export const EXECUTION_PLANS_DIR = "docs/execution-plans";
export const DISPATCH_STATE_DIR = ".agent-sdlc";
export const DISPATCH_STATE_FILE = "plan-dispatch-state.json";

export function phaseDir(repoRoot: string, phase: string): string {
  return join(repoRoot, EXECUTION_PLANS_DIR, phase);
}

export function phaseReadmePath(repoRoot: string, phase: string): string {
  return join(phaseDir(repoRoot, phase), "README.md");
}

export function planRelativePath(phase: string, fileName: string): string {
  return `${EXECUTION_PLANS_DIR}/${phase}/${fileName}`;
}

export function dispatchStatePath(repoRoot: string): string {
  return join(repoRoot, DISPATCH_STATE_DIR, DISPATCH_STATE_FILE);
}
