import { describe, expect, it } from "vitest";
import {
  buildCommitMessagePattern,
  parseFrontmatter,
  parseYamlList,
} from "../parse-frontmatter.js";
import {
  validateDependencyGraph,
  topologicalSort,
} from "../dependency-graph.js";
import {
  extractHandoffTemplate,
  injectPlanPath,
} from "../build-handoff.js";
import type { PendingPlan } from "../types.js";

function makePlan(
  order: number,
  id: string,
  dependsOn: string[],
  parallelGroup: string | null = null,
): PendingPlan {
  const fileName = `${String(order).padStart(2, "0")}-${id}.md`;
  return {
    order,
    fileName,
    absolutePath: `/tmp/${fileName}`,
    relativePath: `docs/execution-plans/test/${fileName}`,
    frontmatter: { id, title: id, dependsOn, parallelGroup },
  };
}

describe("parseFrontmatter", () => {
  it("parses yaml frontmatter", () => {
    const markdown = `---
id: "02-middleware"
title: "Add middleware"
depends_on: ["01-schema"]
parallel_group: "batch-a"
---

## Objective
test
`;
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({
      id: "02-middleware",
      title: "Add middleware",
      dependsOn: ["01-schema"],
      parallelGroup: "batch-a",
    });
  });

  it("parses empty depends_on", () => {
    const markdown = `---
id: "01-schema"
title: "Schema"
depends_on: []
parallel_group: null
---
`;
    const result = parseFrontmatter(markdown);
    expect(result?.dependsOn).toEqual([]);
    expect(result?.parallelGroup).toBeNull();
  });
});

describe("parseYamlList", () => {
  it("parses bracket list", () => {
    expect(parseYamlList('["a", "b"]')).toEqual(["a", "b"]);
  });

  it("parses empty list", () => {
    expect(parseYamlList("[]")).toEqual([]);
  });
});

describe("buildCommitMessagePattern", () => {
  it("matches phase and title", () => {
    const pattern = buildCommitMessagePattern("example-phase", "Create foundation");
    expect(pattern.test("exec-plan(example-phase): Create foundation scaffold")).toBe(true);
    expect(pattern.test("exec-plan(other): Create foundation")).toBe(false);
  });
});

describe("validateDependencyGraph", () => {
  it("accepts valid DAG", () => {
    const plans = [
      makePlan(1, "01-a", []),
      makePlan(2, "02-b", ["01-a"]),
    ];
    expect(validateDependencyGraph(plans)).toEqual({ ok: true });
  });

  it("accepts dependency on deleted non-pending plan id", () => {
    const plans = [makePlan(2, "02-b", ["01-a"])];
    expect(validateDependencyGraph(plans)).toEqual({ ok: true });
  });

  it("rejects cycles", () => {
    const plans = [
      makePlan(1, "01-a", ["02-b"]),
      makePlan(2, "02-b", ["01-a"]),
    ];
    const result = validateDependencyGraph(plans);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("cyclic_dependencies");
    }
  });
});

describe("topologicalSort", () => {
  it("orders dependencies before dependents", () => {
    const plans = [
      makePlan(3, "03-c", ["01-a", "02-b"]),
      makePlan(1, "01-a", []),
      makePlan(2, "02-b", ["01-a"]),
    ];
    const sorted = topologicalSort(plans);
    const ids = sorted.map((p) => p.frontmatter.id);
    expect(ids.indexOf("01-a")).toBeLessThan(ids.indexOf("02-b"));
    expect(ids.indexOf("02-b")).toBeLessThan(ids.indexOf("03-c"));
  });
});

describe("buildHandoff", () => {
  it("extracts handoff template from readme", () => {
    const readme = `## Handoff prompt\n\n\`\`\`text\nPath: docs/execution-plans/phase/NN-....md\n\`\`\`\n`;
    expect(extractHandoffTemplate(readme)).toBe(
      "Path: docs/execution-plans/phase/NN-....md",
    );
  });

  it("injects plan path", () => {
    const template = "Path: docs/execution-plans/phase/NN-....md";
    expect(injectPlanPath(template, "docs/execution-plans/phase/01-a.md")).toBe(
      "Path: docs/execution-plans/phase/01-a.md",
    );
  });
});
