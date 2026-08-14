import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { AcceptanceGateResult } from "./types.js";

export type PackageManager = "npm" | "pnpm" | "yarn";

type PackageJson = {
  workspaces?: string[] | { packages?: string[] };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const REPAIRABLE_TS_CODES = [
  "TS2307",
  "TS2503",
  "TS7026",
  "TS7016",
] as const;

const REPAIRABLE_MODULE_PATTERNS = [
  /Cannot find module ['"]next/i,
  /Cannot find module ['"]react/i,
  /Cannot find namespace ['"]React['"]/i,
  /\.next\/types\//i,
] as const;

export function detectPackageManager(repoRoot: string): PackageManager {
  if (existsSync(join(repoRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (existsSync(join(repoRoot, "yarn.lock"))) {
    return "yarn";
  }

  return "npm";
}

export function rootNodeModulesExists(repoRoot: string): boolean {
  return existsSync(join(repoRoot, "node_modules"));
}

function readPackageJson(packageJsonPath: string): PackageJson | null {
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): { ok: boolean; details: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return {
    ok: result.status === 0,
    details,
  };
}

function installArgs(packageManager: PackageManager): string[] {
  if (packageManager === "pnpm") {
    return ["install", "--frozen-lockfile=false"];
  }

  if (packageManager === "yarn") {
    return ["install"];
  }

  return ["install"];
}

export function runWorkspaceInstall(repoRoot: string): AcceptanceGateResult {
  const packageManager = detectPackageManager(repoRoot);
  const command = packageManager === "pnpm" ? "pnpm" : packageManager;
  const result = runCommand(command, installArgs(packageManager), repoRoot);

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `${command} ${installArgs(packageManager).join(" ")} failed`,
    details: result.details.slice(0, 4000),
  };
}

export function isRepairableScriptFailure(script: string, details: string | undefined): boolean {
  if (details === undefined || details.trim() === "") {
    return false;
  }

  if (script !== "typecheck" && script !== "lint" && script !== "test") {
    return false;
  }

  const hasRepairableCode = REPAIRABLE_TS_CODES.some((code) => {
    return details.includes(code);
  });

  const hasRepairablePattern = REPAIRABLE_MODULE_PATTERNS.some((pattern) => {
    return pattern.test(details);
  });

  return hasRepairableCode && hasRepairablePattern;
}

export function extractFailedWorkspaces(details: string): string[] {
  const workspaces = new Set<string>();

  const workspaceScriptPattern = /^(\S+)\s+(?:typecheck|lint|test):/gm;
  for (const match of details.matchAll(workspaceScriptPattern)) {
    workspaces.add(match[1]);
  }

  const appsPathPattern = /(?:^|\s)(apps\/[A-Za-z0-9._-]+)\//g;
  for (const match of details.matchAll(appsPathPattern)) {
    workspaces.add(match[1]);
  }

  const packagesPathPattern = /(?:^|\s)(packages\/[A-Za-z0-9._-]+)\//g;
  for (const match of details.matchAll(packagesPathPattern)) {
    workspaces.add(match[1]);
  }

  return [...workspaces];
}

function packageUsesNext(packageDir: string): boolean {
  const pkg = readPackageJson(join(packageDir, "package.json"));
  if (pkg === null) {
    return false;
  }

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  return typeof deps.next === "string";
}

function repairNextWorkspace(
  repoRoot: string,
  workspaceRelativePath: string,
  details: string,
  log?: (message: string) => void,
): AcceptanceGateResult {
  const workspaceDir = join(repoRoot, workspaceRelativePath);
  if (!existsSync(workspaceDir)) {
    return { ok: true };
  }

  if (!packageUsesNext(workspaceDir)) {
    return { ok: true };
  }

  const typesDir = join(workspaceDir, ".next", "types");
  if (existsSync(typesDir)) {
    log?.(`Clearing stale Next.js types in ${workspaceRelativePath}/.next/types`);
    rmSync(typesDir, { recursive: true, force: true });
  }

  const needsBuild = /\.next\/types\//i.test(details);
  if (!needsBuild) {
    return { ok: true };
  }

  log?.(`Regenerating Next.js types via build in ${workspaceRelativePath}`);
  const buildResult = runCommand("npx", ["next", "build"], workspaceDir);
  if (buildResult.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `next build failed in ${workspaceRelativePath}`,
    details: buildResult.details.slice(0, 4000),
  };
}

export function runWorkspaceRepair(
  repoRoot: string,
  failedScript: string,
  details: string,
  log?: (message: string) => void,
): AcceptanceGateResult {
  if (!isRepairableScriptFailure(failedScript, details)) {
    return {
      ok: false,
      reason: "script failure is not repairable",
      details: details.slice(0, 4000),
    };
  }

  const installResult = runWorkspaceInstall(repoRoot);
  if (!installResult.ok) {
    return installResult;
  }
  log?.("Installed workspace dependencies at repo root.");

  const workspaces = extractFailedWorkspaces(details);
  const nextWorkspaces = workspaces.filter((workspace) => {
    return packageUsesNext(join(repoRoot, workspace));
  });

  for (const workspace of nextWorkspaces) {
    const repairResult = repairNextWorkspace(repoRoot, workspace, details, log);
    if (!repairResult.ok) {
      return repairResult;
    }
  }

  return { ok: true };
}

export function ensureWorkspaceReady(repoRoot: string): AcceptanceGateResult {
  if (!existsSync(join(repoRoot, "package.json"))) {
    return { ok: true };
  }

  if (rootNodeModulesExists(repoRoot)) {
    return { ok: true };
  }

  return runWorkspaceInstall(repoRoot);
}
