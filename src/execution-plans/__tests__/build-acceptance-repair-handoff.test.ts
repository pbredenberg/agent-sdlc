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
  it("includes failure context and repair instructions", () => {
    const handoff = buildAcceptanceRepairHandoff({
      phase: "example",
      plan: makePlan(),
      reason: "npm run test failed (exit 1)",
      details: "FAIL src/foo.test.ts",
      attempt: 1,
      maxAttempts: 2,
    });

    expect(handoff).toContain("ACCEPTANCE GATE REPAIR");
    expect(handoff).toContain("Repair attempt: 1 of 2");
    expect(handoff).toContain("npm run test failed (exit 1)");
    expect(handoff).toContain("exec-plan(example): fix acceptance — Add schema");
    expect(handoff).toContain("FAIL src/foo.test.ts");
    expect(handoff).toContain("Do NOT delete or recreate execution plan files");
  });
});
