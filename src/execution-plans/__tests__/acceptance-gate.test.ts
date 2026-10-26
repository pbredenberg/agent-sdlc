import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAcceptanceGate } from "../acceptance-gate.js";
import type { PendingPlan } from "../types.js";

function makePlan(relativePath: string): PendingPlan {
  return {
    order: 1,
    fileName: "01-test.md",
    absolutePath: `/tmp/${relativePath}`,
    relativePath,
    frontmatter: {
      id: "01-test",
      title: "Test plan",
      dependsOn: [],
      parallelGroup: null,
    },
  };
}

describe("runAcceptanceGate workspace repair", () => {
  it("runs install when node_modules is missing before scripts", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "acceptance-gate-"));
    writeFileSync(
      join(repoRoot, "package.json"),
      JSON.stringify({
        scripts: {
          test: "node -e \"process.exit(0)\"",
        },
      }),
      "utf8",
    );

    const result = runAcceptanceGate({
      repoRoot,
      phase: "example",
      plan: makePlan("docs/execution-plans/example/01-test.md"),
      baseHead: "abc123",
      skipCommit: true,
    });

    expect(result.ok).toBe(true);
  });
});
