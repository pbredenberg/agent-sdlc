import type { AcceptanceGateResult } from "./types.js";

export type AcceptanceFailureKind =
  | "script_failure"
  | "commit_failure"
  | "plan_failure"
  | "workspace_failure"
  | "other";

const SCRIPT_FAILURE_PREFIX = /^npm run (test|typecheck|lint) failed/;

const COMMIT_FAILURE_REASONS = new Set([
  "no new commit since batch start",
  "no commits between baseHead and HEAD",
  "not a git repository",
  "could not read HEAD",
  "auto-commit failed at git add",
  "auto-commit failed at git commit",
  "auto-commit succeeded but HEAD is unreadable",
]);

export function classifyAcceptanceFailure(
  result: Extract<AcceptanceGateResult, { ok: false }>,
): AcceptanceFailureKind {
  if (result.reason.startsWith("plan file still present")) {
    return "plan_failure";
  }

  if (COMMIT_FAILURE_REASONS.has(result.reason)) {
    return "commit_failure";
  }

  if (result.reason.startsWith("no commit matching exec-plan(")) {
    return "commit_failure";
  }

  if (
    result.reason.startsWith("workspace repair failed")
    || result.reason.includes("workspace setup failed")
    || result.reason.includes("script failure is not repairable")
  ) {
    return "workspace_failure";
  }

  if (SCRIPT_FAILURE_PREFIX.test(result.reason)) {
    return "script_failure";
  }

  return "other";
}

export function isRepairableAcceptanceFailure(
  result: Extract<AcceptanceGateResult, { ok: false }>,
): boolean {
  return classifyAcceptanceFailure(result) === "script_failure";
}

export function extractFailedScript(reason: string): string | null {
  const match = SCRIPT_FAILURE_PREFIX.exec(reason);
  if (match === null) {
    return null;
  }
  return match[1];
}
