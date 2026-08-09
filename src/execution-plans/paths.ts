import { join } from "node:path";

export const EXECUTION_PLANS_DIR = "docs/execution-plans";
export const DISPATCH_STATE_DIR = ".agent-sdlc";
export const DISPATCH_STATE_FILE = "plan-dispatch-state.json";

/** Plans living directly under docs/execution-plans/ (no phase folder). */
export const ROOT_PHASE = ".";

export function isRootPhase(phase: string): boolean {
  return phase === ROOT_PHASE;
}

export function phaseDir(repoRoot: string, phase: string): string {
  if (isRootPhase(phase)) {
    return join(repoRoot, EXECUTION_PLANS_DIR);
  }
  return join(repoRoot, EXECUTION_PLANS_DIR, phase);
}

export function phaseReadmePath(repoRoot: string, phase: string): string {
  return join(phaseDir(repoRoot, phase), "README.md");
}

export function planRelativePath(phase: string, fileName: string): string {
  if (isRootPhase(phase)) {
    return `${EXECUTION_PLANS_DIR}/${fileName}`;
  }
  return `${EXECUTION_PLANS_DIR}/${phase}/${fileName}`;
}

export function dispatchStatePath(repoRoot: string): string {
  return join(repoRoot, DISPATCH_STATE_DIR, DISPATCH_STATE_FILE);
}

export function formatPhaseLabel(phase: string): string {
  if (isRootPhase(phase)) {
    return `${EXECUTION_PLANS_DIR}/ (root)`;
  }
  return phase;
}
