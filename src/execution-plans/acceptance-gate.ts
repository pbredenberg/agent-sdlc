import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { verifyCommitForPlan } from "./commit-gate.js";
import type { AcceptanceGateResult, PendingPlan } from "./types.js";
import {
  ensureWorkspaceReady,
  isRepairableScriptFailure,
  runWorkspaceRepair,
} from "./workspace-repair.js";

const DEFAULT_SCRIPTS = ["test", "typecheck", "lint"] as const;

export type AcceptanceGateInput = {
  repoRoot: string;
  phase: string;
  plan: PendingPlan;
  baseHead: string;
  skipScripts?: boolean;
  skipCommit?: boolean;
  log?: (message: string) => void;
};

type PackageJson = {
  scripts?: Record<string, string>;
};

export function listAcceptanceScripts(repoRoot: string): string[] {
  const packageJsonPath = join(repoRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
  const scripts = pkg.scripts ?? {};
  return DEFAULT_SCRIPTS.filter((name) => {
    return typeof scripts[name] === "string";
  });
}

export function planFileRemoved(plan: PendingPlan): boolean {
  return !existsSync(plan.absolutePath);
}

function runNpmScript(repoRoot: string, script: string): AcceptanceGateResult {
  const result = spawnSync("npm", ["run", script], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status === 0) {
    return { ok: true };
  }

  const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return {
    ok: false,
    reason: `npm run ${script} failed (exit ${result.status ?? "null"})`,
    details: details.slice(0, 4000),
  };
}

export function runAcceptanceGate(input: AcceptanceGateInput): AcceptanceGateResult {
  if (!planFileRemoved(input.plan)) {
    return {
      ok: false,
      reason: `plan file still present: ${input.plan.relativePath}`,
    };
  }

  if (input.skipCommit !== true) {
    const commitResult = verifyCommitForPlan({
      repoRoot: input.repoRoot,
      phase: input.phase,
      baseHead: input.baseHead,
      planTitle: input.plan.frontmatter.title,
    });

    if (!commitResult.ok) {
      return {
        ok: false,
        reason: commitResult.reason,
        details: commitResult.details,
      };
    }
  }

  if (input.skipScripts === true) {
    return { ok: true };
  }

  const ready = ensureWorkspaceReady(input.repoRoot);
  if (!ready.ok) {
    return ready;
  }

  const scripts = listAcceptanceScripts(input.repoRoot);
  for (const script of scripts) {
    const scriptResult = runAcceptanceScript(input.repoRoot, script, input.log);
    if (!scriptResult.ok) {
      return scriptResult;
    }
  }

  return { ok: true };
}

function runAcceptanceScript(
  repoRoot: string,
  script: string,
  log?: (message: string) => void,
): AcceptanceGateResult {
  const firstAttempt = runNpmScript(repoRoot, script);
  if (firstAttempt.ok) {
    return firstAttempt;
  }

  const details = firstAttempt.details ?? "";
  if (!isRepairableScriptFailure(script, details)) {
    return firstAttempt;
  }

  log?.(`Attempting workspace repair after npm run ${script} environment failure...`);
  const repair = runWorkspaceRepair(repoRoot, script, details, log);
  if (!repair.ok) {
    return {
      ok: false,
      reason: `workspace repair failed after npm run ${script} error: ${repair.reason}`,
      details: [details, repair.details].filter(Boolean).join("\n\n--- repair ---\n").slice(0, 4000),
    };
  }

  const retry = runNpmScript(repoRoot, script);
  if (retry.ok) {
    log?.(`Workspace repair succeeded; npm run ${script} passed on retry.`);
    return retry;
  }

  return {
    ok: false,
    reason: `npm run ${script} failed after workspace repair`,
    details: [details, retry.details].filter(Boolean).join("\n\n--- after repair ---\n").slice(0, 4000),
  };
}
