import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAcceptanceWithRepair } from "../acceptance-repair.js";
import type { PendingPlan } from "../types.js";

vi.mock("../acceptance-gate.js", () => {
  return {
    runAcceptanceGate: vi.fn(),
  };
});

import { runAcceptanceGate } from "../acceptance-gate.js";

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

function makeInput(maxAcceptanceRetries = 2) {
  return {
    repoRoot: "/tmp/repo",
    phase: "example",
    plan: makePlan(),
    baseHead: "abc123",
    batchStartedClean: true,
    skipAcceptance: false,
    maxAcceptanceRetries,
    apiKey: "test-key",
    model: "composer-2.5",
    agentId: "agent-1",
    runId: "run-1",
  };
}

describe("runAcceptanceWithRepair", () => {
  beforeEach(() => {
    vi.mocked(runAcceptanceGate).mockReset();
  });

  it("returns true when initial acceptance passes", async () => {
    vi.mocked(runAcceptanceGate).mockReturnValue({ ok: true });

    const logs: string[] = [];
    const result = await runAcceptanceWithRepair(
      makeInput(),
      async () => {
        return { ok: true, agentId: null, runId: null };
      },
      (message) => {
        logs.push(message);
      },
    );

    expect(result).toBe(true);
    expect(runAcceptanceGate).toHaveBeenCalledTimes(1);
    expect(logs).toEqual([]);
  });

  it("dispatches repair agent and retries scripts on script failure", async () => {
    vi.mocked(runAcceptanceGate)
      .mockReturnValueOnce({
        ok: false,
        reason: "npm run test failed (exit 1)",
        details: "expected true to be false",
      })
      .mockReturnValueOnce({ ok: true });

    const repairPrompts: string[] = [];
    const logs: string[] = [];

    const result = await runAcceptanceWithRepair(
      makeInput(2),
      async (prompt) => {
        repairPrompts.push(prompt);
        return { ok: true, agentId: "repair-agent", runId: "repair-run" };
      },
      (message) => {
        logs.push(message);
      },
    );

    expect(result).toBe(true);
    expect(repairPrompts).toHaveLength(1);
    expect(repairPrompts[0]).toContain("ACCEPTANCE GATE REPAIR");
    expect(runAcceptanceGate).toHaveBeenCalledTimes(2);
    expect(runAcceptanceGate).toHaveBeenLastCalledWith(
      expect.objectContaining({ skipCommit: true }),
    );
    expect(logs.some((line) => line.includes("Dispatching acceptance repair agent"))).toBe(
      true,
    );
    expect(logs.some((line) => line.includes("Acceptance repair succeeded"))).toBe(true);
  });

  it("stops after max retries without dispatching beyond budget", async () => {
    vi.mocked(runAcceptanceGate).mockReturnValue({
      ok: false,
      reason: "npm run test failed (exit 1)",
      details: "still failing",
    });

    let repairCalls = 0;
    const result = await runAcceptanceWithRepair(
      makeInput(1),
      async () => {
        repairCalls += 1;
        return { ok: true, agentId: null, runId: null };
      },
      () => {},
    );

    expect(result).toBe(false);
    expect(repairCalls).toBe(1);
    expect(runAcceptanceGate).toHaveBeenCalledTimes(2);
  });

  it("does not dispatch repair for commit failures", async () => {
    vi.mocked(runAcceptanceGate).mockReturnValue({
      ok: false,
      reason: "no new commit since batch start",
    });

    let repairCalls = 0;
    const result = await runAcceptanceWithRepair(
      makeInput(2),
      async () => {
        repairCalls += 1;
        return { ok: true, agentId: null, runId: null };
      },
      () => {},
    );

    expect(result).toBe(false);
    expect(repairCalls).toBe(0);
    expect(runAcceptanceGate).toHaveBeenCalledTimes(1);
  });
});
