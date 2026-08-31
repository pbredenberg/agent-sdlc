import { describe, expect, it } from "vitest";
import {
  classifyAcceptanceFailure,
  extractFailedScript,
  isRepairableAcceptanceFailure,
  shouldSkipCommitOnRetry,
} from "../classify-acceptance-failure.js";

describe("classifyAcceptanceFailure", () => {
  it("classifies npm script failures as script_failure", () => {
    const result = {
      ok: false as const,
      reason: "npm run test failed (exit 1)",
      details: "AssertionError",
    };

    expect(classifyAcceptanceFailure(result)).toBe("script_failure");
    expect(isRepairableAcceptanceFailure(result)).toBe(true);
    expect(extractFailedScript(result.reason)).toBe("test");
  });

  it("classifies typecheck and lint failures", () => {
    const typecheck = {
      ok: false as const,
      reason: "npm run typecheck failed (exit 2)",
    };
    const lint = {
      ok: false as const,
      reason: "npm run lint failed (exit 1)",
    };

    expect(classifyAcceptanceFailure(typecheck)).toBe("script_failure");
    expect(classifyAcceptanceFailure(lint)).toBe("script_failure");
  });

  it("classifies commit gate failures as repairable", () => {
    const result = {
      ok: false as const,
      reason: "no new commit since batch start",
    };

    expect(classifyAcceptanceFailure(result)).toBe("commit_failure");
    expect(isRepairableAcceptanceFailure(result)).toBe(true);
  });

  it("classifies plan file failures as repairable", () => {
    const result = {
      ok: false as const,
      reason: "plan file still present: docs/execution-plans/example/01-a.md",
    };

    expect(classifyAcceptanceFailure(result)).toBe("plan_failure");
    expect(isRepairableAcceptanceFailure(result)).toBe(true);
  });
});

describe("shouldSkipCommitOnRetry", () => {
  it("skips commit verification only after script failures", () => {
    expect(shouldSkipCommitOnRetry("script_failure")).toBe(true);
    expect(shouldSkipCommitOnRetry("commit_failure")).toBe(false);
    expect(shouldSkipCommitOnRetry("plan_failure")).toBe(false);
  });
});
