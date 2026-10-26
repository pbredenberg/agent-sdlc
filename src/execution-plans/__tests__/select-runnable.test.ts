import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { listPendingPlans } from "../list-plans.js";
import { listDryRunBatches, selectRunnableBatch } from "../select-runnable.js";

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "exec-plans-"));
  const phaseDir = join(root, "docs/execution-plans/example-phase");
  await mkdir(phaseDir, { recursive: true });

  await writeFile(
    join(phaseDir, "01-foundation.md"),
    `---
id: "01-foundation"
title: "Foundation"
depends_on: []
parallel_group: null
---
`,
  );

  await writeFile(
    join(phaseDir, "02-module-a.md"),
    `---
id: "02-module-a"
title: "Module A"
depends_on: ["01-foundation"]
parallel_group: "batch-a"
---
`,
  );

  await writeFile(
    join(phaseDir, "03-module-b.md"),
    `---
id: "03-module-b"
title: "Module B"
depends_on: ["01-foundation"]
parallel_group: "batch-a"
---
`,
  );

  await writeFile(
    join(phaseDir, "04-integration.md"),
    `---
id: "04-integration"
title: "Integration"
depends_on: ["02-module-a", "03-module-b"]
parallel_group: null
---
`,
  );

  return root;
}

describe("selectRunnableBatch integration", () => {
  it("lists pending plans with frontmatter", async () => {
    const root = await createFixture();
    const phaseDir = join(root, "docs/execution-plans/example-phase");
    const plans = await listPendingPlans(root, "example-phase", phaseDir);
    expect(plans).toHaveLength(4);
    expect(plans[0].frontmatter.id).toBe("01-foundation");
  });

  it("dry-run produces correct batch sequence", async () => {
    const root = await createFixture();
    const batches = await listDryRunBatches({
      repoRoot: root,
      phase: "example-phase",
      maxParallel: 3,
    });

    expect(batches).toHaveLength(3);

    const first = batches[0];
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.batch).toHaveLength(1);
      expect(first.batch[0].frontmatter.id).toBe("01-foundation");
    }

    const second = batches[1];
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.batch).toHaveLength(2);
      const ids = second.batch.map((p) => p.frontmatter.id).sort();
      expect(ids).toEqual(["02-module-a", "03-module-b"]);
    }

    const third = batches[2];
    expect(third.ok).toBe(true);
    if (third.ok) {
      expect(third.batch[0].frontmatter.id).toBe("04-integration");
    }
  });

  it("selects plan when predecessor file was deleted", async () => {
    const root = await createFixture();
    const phaseDir = join(root, "docs/execution-plans/example-phase");
    const foundationPath = join(phaseDir, "01-foundation.md");

    const { unlink } = await import("node:fs/promises");
    await unlink(foundationPath);

    const result = await selectRunnableBatch({
      repoRoot: root,
      phase: "example-phase",
      maxParallel: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.batch).toHaveLength(1);
      expect(result.batch[0].frontmatter.id).toBe("02-module-a");
    }
  });
});
