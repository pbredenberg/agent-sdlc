import { describe, expect, it } from "vitest";
import { buildAcceptanceRepairHandoff } from "../build-acceptance-repair-handoff.js";
import type { PendingPlan } from "../types.js";

function makePlan(): PendingPlan {
  return {
    order: 1,
    fileName: "01-schema.md",
    absolutePath: "/tmp/01-schema.md",
    relativePath: "docs/execution-plans/example/01-schema.md",
    frontmatter: {
      id: "01-schema",
      title: "Add schema",
      dependsOn: [],
      parallelGroup: null,
    },
  };
}

describe("buildAcceptanceRepairHandoff", () => {
  it("includes implementation-first rules for script failures", () => {
    const handoff = buildAcceptanceRepairHandoff({
      phase: "example",
      plan: makePlan(),
      reason: "npm run test failed (exit 1)",
      details: "FAIL src/foo.test.ts",
      attempt: 1,
      maxAttempts: 2,
    });

    expect(handoff).toContain("ACCEPTANCE GATE REPAIR");
    expect(handoff).toContain("IMPLEMENTATION-FIRST REPAIR RULES");
    expect(handoff).toContain("Do NOT weaken, delete, skip, or `.only` tests");
    expect(handoff).toContain("Do NOT change assertions, snapshots, or expected values");
    expect(handoff).toContain("exec-plan(example): fix acceptance — Add schema");
    expect(handoff).toContain("FAIL src/foo.test.ts");
    expect(handoff).toContain("Do NOT delete or recreate execution plan files");
  });

  it("requires the original exec-plan commit message for commit failures", () => {
    const handoff = buildAcceptanceRepairHandoff({
      phase: "example",
      plan: makePlan(),
      reason: "no new commit since batch start",
      details: "working tree clean",
      attempt: 1,
      maxAttempts: 2,
    });

    expect(handoff).toContain("Your job (commit repair):");
    expect(handoff).toContain("exec-plan(example): Add schema");
    expect(handoff).not.toContain("fix acceptance");
    expect(handoff).toContain("Delete the execution plan file if it is still present");
  });

  it("instructs plan cleanup for plan file failures", () => {
    const handoff = buildAcceptanceRepairHandoff({
      phase: "example",
      plan: makePlan(),
      reason: "plan file still present: docs/execution-plans/example/01-schema.md",
      attempt: 1,
      maxAttempts: 2,
    });

    expect(handoff).toContain("Your job (plan cleanup repair):");
    expect(handoff).toContain(
      "Delete the execution plan file: docs/execution-plans/example/01-schema.md",
    );
  });
});
