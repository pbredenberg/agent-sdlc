import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listPhases } from "../list-plans.js";
import { finalizeDrainArgs } from "../parse-args.js";
import {
  ROOT_PHASE,
  formatPhaseLabel,
  phaseDir,
  planRelativePath,
} from "../paths.js";

async function writePlan(dir: string, name: string): Promise<void> {
  const id = name.replace(/\.md$/, "");
  await writeFile(
    join(dir, name),
    `---
id: "${id}"
title: "Plan"
depends_on: []
parallel_group: null
---

## Objective
test
`,
    "utf8",
  );
}

describe("paths root phase", () => {
  it("maps '.' to docs/execution-plans", () => {
    expect(phaseDir("/repo", ROOT_PHASE)).toBe(join("/repo", "docs/execution-plans"));
    expect(planRelativePath(ROOT_PHASE, "01-a.md")).toBe("docs/execution-plans/01-a.md");
    expect(formatPhaseLabel(ROOT_PHASE)).toBe("docs/execution-plans/ (root)");
  });

  it("maps named phases to subfolders", () => {
    expect(phaseDir("/repo", "example-phase")).toBe(
      join("/repo", "docs/execution-plans/example-phase"),
    );
    expect(planRelativePath("example-phase", "01-a.md")).toBe(
      "docs/execution-plans/example-phase/01-a.md",
    );
  });
});

describe("listPhases", () => {
  it("lists phase folders only when root has no plan files", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-sdlc-phases-"));
    await mkdir(join(root, "docs/execution-plans/b-phase"), { recursive: true });
    await mkdir(join(root, "docs/execution-plans/a-phase"), { recursive: true });
    await writeFile(join(root, "docs/execution-plans/README.md"), "# plans\n", "utf8");

    expect(await listPhases(root)).toEqual(["a-phase", "b-phase"]);
  });

  it("includes '.' first when numbered plans sit at the root", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-sdlc-root-plans-"));
    const plansRoot = join(root, "docs/execution-plans");
    await mkdir(join(plansRoot, "later-phase"), { recursive: true });
    await writePlan(plansRoot, "01-foundation.md");

    expect(await listPhases(root)).toEqual([ROOT_PHASE, "later-phase"]);
  });
});

describe("finalizeDrainArgs", () => {
  const base = {
    cwd: "/repo",
    model: "composer-2.5",
    maxPlans: null,
    maxParallel: 1,
    maxAcceptanceRetries: 2,
    dryRun: true,
    skipAcceptance: false,
  };

  it("requires --phase or --all-phases", () => {
    expect(() => {
      finalizeDrainArgs({ ...base, phase: null, allPhases: false });
    }).toThrow(/--phase|--all-phases/);
  });

  it("rejects both --phase and --all-phases", () => {
    expect(() => {
      finalizeDrainArgs({ ...base, phase: "example-phase", allPhases: true });
    }).toThrow(/not both/);
  });

  it("accepts root phase '.'", () => {
    const options = finalizeDrainArgs({
      ...base,
      phase: ".",
      allPhases: false,
    });
    expect(options.phase).toBe(ROOT_PHASE);
    expect(options.allPhases).toBe(false);
  });

  it("accepts --all-phases", () => {
    const options = finalizeDrainArgs({
      ...base,
      phase: null,
      allPhases: true,
    });
    expect(options.phase).toBeNull();
    expect(options.allPhases).toBe(true);
  });
});
