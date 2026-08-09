import { spawnSync } from "node:child_process";
import { buildCommitMessagePattern } from "./parse-frontmatter.js";
import type { CommitGateResult } from "./types.js";

export type CommitGateInput = {
  repoRoot: string;
  phase: string;
  baseHead: string;
  planTitle?: string;
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
    return {
      ok: false,
      reason: "no new commit since batch start",
      details: `HEAD is still ${input.baseHead}`,
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
