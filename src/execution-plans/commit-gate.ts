import { spawnSync } from "node:child_process";
import { buildCommitMessagePattern } from "./parse-frontmatter.js";
import type { CommitGateResult } from "./types.js";

export type CommitGateInput = {
  repoRoot: string;
  phase: string;
  baseHead: string;
  planTitle?: string;
  planRelativePath?: string;
  /** When true, auto-commit agent changes if the batch started with a clean tree. */
  allowAutoCommit?: boolean;
  batchStartedClean?: boolean;
};

type GitLogEntry = {
  sha: string;
  message: string;
};

function runGit(args: string[], repoRoot: string): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function getNewCommits(repoRoot: string, baseHead: string): GitLogEntry[] {
  const result = runGit(
    ["log", `${baseHead}..HEAD`, "--format=%H %s"],
    repoRoot,
  );

  if (!result.ok) {
    return [];
  }

  if (result.stdout === "") {
    return [];
  }

  return result.stdout.split("\n").map((line) => {
    const spaceIndex = line.indexOf(" ");
    return {
      sha: line.slice(0, spaceIndex),
      message: line.slice(spaceIndex + 1),
    };
  });
}

export function getHeadSha(repoRoot: string): string | null {
  const result = runGit(["rev-parse", "HEAD"], repoRoot);
  if (!result.ok) {
    return null;
  }
  return result.stdout;
}

export function isGitRepo(repoRoot: string): boolean {
  const result = runGit(["rev-parse", "--git-dir"], repoRoot);
  return result.ok;
}

export function isWorkingTreeClean(repoRoot: string): boolean {
  const result = runGit(["status", "--porcelain"], repoRoot);
  if (!result.ok) {
    return false;
  }
  return result.stdout === "";
}

export function describeWorkingTree(repoRoot: string): string {
  const status = runGit(["status", "--porcelain"], repoRoot);
  if (!status.ok) {
    return "could not read git status";
  }
  if (status.stdout === "") {
    return "working tree clean";
  }
  const lines = status.stdout.split("\n");
  const preview = lines.slice(0, 12).join("\n");
  const suffix = lines.length > 12 ? `\n... and ${lines.length - 12} more` : "";
  return `${lines.length} uncommitted change(s):\n${preview}${suffix}`;
}

export function buildExecPlanCommitMessage(phase: string, planTitle: string): string {
  return `exec-plan(${phase}): ${planTitle}`;
}

export function syncRepoFromRemote(
  repoRoot: string,
  log?: (message: string) => void,
): void {
  const branchResult = runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  if (!branchResult.ok || branchResult.stdout === "" || branchResult.stdout === "HEAD") {
    return;
  }

  const branch = branchResult.stdout;
  const fetchResult = runGit(["fetch", "origin", branch], repoRoot);
  if (!fetchResult.ok) {
    return;
  }

  const remoteRef = `origin/${branch}`;
  const behindResult = runGit(["rev-list", "--count", `HEAD..${remoteRef}`], repoRoot);
  if (!behindResult.ok) {
    return;
  }

  const behindCount = Number.parseInt(behindResult.stdout, 10);
  if (!Number.isFinite(behindCount) || behindCount <= 0) {
    return;
  }

  const mergeResult = runGit(["merge", "--ff-only", remoteRef], repoRoot);
  if (mergeResult.ok) {
    log?.(`Fast-forwarded ${behindCount} commit(s) from ${remoteRef}`);
    return;
  }

  log?.(`Could not fast-forward from ${remoteRef}: ${mergeResult.stderr || mergeResult.stdout}`);
}

function attemptAutoCommitForPlan(input: CommitGateInput): CommitGateResult | null {
  if (input.allowAutoCommit !== true || input.batchStartedClean !== true) {
    return null;
  }

  if (input.planTitle === undefined || input.planTitle === "") {
    return null;
  }

  if (isWorkingTreeClean(input.repoRoot)) {
    return null;
  }

  const message = buildExecPlanCommitMessage(input.phase, input.planTitle);
  const addResult = runGit(["add", "-A"], input.repoRoot);
  if (!addResult.ok) {
    return {
      ok: false,
      reason: "auto-commit failed at git add",
      details: addResult.stderr || addResult.stdout,
    };
  }

  const commitResult = runGit(["commit", "-m", message], input.repoRoot);
  if (!commitResult.ok) {
    return {
      ok: false,
      reason: "auto-commit failed at git commit",
      details: commitResult.stderr || commitResult.stdout,
    };
  }

  const sha = getHeadSha(input.repoRoot);
  if (sha === null) {
    return {
      ok: false,
      reason: "auto-commit succeeded but HEAD is unreadable",
    };
  }

  return {
    ok: true,
    commitSha: sha,
    commitMessage: message,
    autoCommitted: true,
  };
}

function buildNoCommitDetails(input: CommitGateInput): string {
  const parts = [`HEAD is still ${input.baseHead}`];
  const treeSummary = describeWorkingTree(input.repoRoot);
  parts.push(treeSummary);

  if (input.batchStartedClean === false) {
    parts.push(
      "The working tree was dirty before this batch; auto-commit was skipped. Start from a clean tree or commit manually.",
    );
  }

  if (isWorkingTreeClean(input.repoRoot)) {
    parts.push(
      "No uncommitted changes detected. The agent may have finished without changing the repo, or changes were pushed to a remote branch only.",
    );
  } else {
    parts.push(
      "The agent left uncommitted changes. Re-run after committing with exec-plan(<phase>): <title>, or start the next drain from a clean tree so auto-commit can apply.",
    );
  }

  return parts.join("\n");
}

export function verifyCommitForPlan(input: CommitGateInput): CommitGateResult {
  if (!isGitRepo(input.repoRoot)) {
    return {
      ok: false,
      reason: "not a git repository",
      details: "Commit gate requires a git repo. Use --skip-acceptance for docs-only workflows.",
    };
  }

  const currentHead = getHeadSha(input.repoRoot);
  if (currentHead === null) {
    return { ok: false, reason: "could not read HEAD" };
  }

  if (currentHead === input.baseHead) {
    const autoCommit = attemptAutoCommitForPlan(input);
    if (autoCommit !== null) {
      return autoCommit;
    }

    return {
      ok: false,
      reason: "no new commit since batch start",
      details: buildNoCommitDetails(input),
    };
  }

  const newCommits = getNewCommits(input.repoRoot, input.baseHead);
  if (newCommits.length === 0) {
    return {
      ok: false,
      reason: "no commits between baseHead and HEAD",
    };
  }

  const pattern = buildCommitMessagePattern(input.phase, input.planTitle);
  const matching = newCommits.filter((commit) => {
    return pattern.test(commit.message);
  });

  if (matching.length === 0) {
    return {
      ok: false,
      reason: `no commit matching exec-plan(${input.phase}): <title>`,
      details: `Found commits: ${newCommits.map((c) => c.message).join("; ")}`,
    };
  }

  const commit = matching[0];
  return {
    ok: true,
    commitSha: commit.sha,
    commitMessage: commit.message,
  };
}

export function verifyCommitForPlans(
  repoRoot: string,
  phase: string,
  baseHead: string,
  planCount: number,
): CommitGateResult {
  if (!isGitRepo(repoRoot)) {
    return {
      ok: false,
      reason: "not a git repository",
    };
  }

  const newCommits = getNewCommits(repoRoot, baseHead);
  const pattern = buildCommitMessagePattern(phase);
  const matching = newCommits.filter((commit) => {
    return pattern.test(commit.message);
  });

  if (matching.length < planCount) {
    return {
      ok: false,
      reason: `expected ${planCount} commit(s) matching exec-plan(${phase}):, found ${matching.length}`,
      details: `Commits since ${baseHead}: ${newCommits.map((c) => c.message).join("; ")}`,
    };
  }

  const last = matching[matching.length - 1];
  return {
    ok: true,
    commitSha: last.sha,
    commitMessage: last.message,
  };
}
