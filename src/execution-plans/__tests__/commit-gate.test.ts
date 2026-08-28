import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  buildExecPlanCommitMessage,
  isWorkingTreeClean,
  verifyCommitForPlan,
} from "../commit-gate.js";

function initGitRepo(root: string): string {
  execSync("git init -b main", { cwd: root, stdio: "ignore" });
  execSync("git config user.email test@example.com", { cwd: root, stdio: "ignore" });
  execSync("git config user.name test", { cwd: root, stdio: "ignore" });
  writeFileSync(join(root, "README.md"), "seed\n");
  execSync("git add README.md", { cwd: root, stdio: "ignore" });
  execSync("git commit -m init", { cwd: root, stdio: "ignore" });
  return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
}

describe("verifyCommitForPlan", () => {
  it("auto-commits when batch started clean and agent left uncommitted changes", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "commit-gate-auto-"));
    const baseHead = initGitRepo(repoRoot);
    writeFileSync(join(repoRoot, "feature.txt"), "work\n");

    const result = verifyCommitForPlan({
      repoRoot,
      phase: "action-history-followups",
      baseHead,
      planTitle: "Async remove snapshot reconcile",
      allowAutoCommit: true,
      batchStartedClean: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.autoCommitted).toBe(true);
      expect(result.commitMessage).toBe(
        buildExecPlanCommitMessage(
          "action-history-followups",
          "Async remove snapshot reconcile",
        ),
      );
    }
    expect(isWorkingTreeClean(repoRoot)).toBe(true);
  });

  it("skips auto-commit when batch started dirty", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "commit-gate-dirty-"));
    const baseHead = initGitRepo(repoRoot);
    writeFileSync(join(repoRoot, "dirty.txt"), "pre-existing\n");
    execSync("git add dirty.txt", { cwd: repoRoot, stdio: "ignore" });
    expect(isWorkingTreeClean(repoRoot)).toBe(false);

    writeFileSync(join(repoRoot, "feature.txt"), "work\n");

    const result = verifyCommitForPlan({
      repoRoot,
      phase: "example-phase",
      baseHead,
      planTitle: "Create foundation",
      allowAutoCommit: true,
      batchStartedClean: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no new commit since batch start");
      expect(result.details).toContain("dirty before this batch");
    }
  });

  it("reports working tree details when no commit and tree is clean", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "commit-gate-clean-"));
    const baseHead = initGitRepo(repoRoot);

    const result = verifyCommitForPlan({
      repoRoot,
      phase: "example-phase",
      baseHead,
      planTitle: "Create foundation",
      allowAutoCommit: true,
      batchStartedClean: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no new commit since batch start");
      expect(result.details).toContain("working tree clean");
    }
  });
});
