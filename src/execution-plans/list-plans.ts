import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, parsePlanFileName } from "./parse-frontmatter.js";
import {
  EXECUTION_PLANS_DIR,
  ROOT_PHASE,
  planRelativePath,
} from "./paths.js";
import type { PendingPlan, PlanFrontmatter } from "./types.js";

export { parsePlanFileName } from "./parse-frontmatter.js";

export async function listPendingPlans(
  repoRoot: string,
  phase: string,
  phaseDirectory: string,
): Promise<PendingPlan[]> {
  if (!existsSync(phaseDirectory)) {
    return [];
  }

  const entries = await readdir(phaseDirectory, { withFileTypes: true });
  const plans: PendingPlan[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const order = parsePlanFileName(entry.name);
    if (order === null) {
      continue;
    }

    const absolutePath = join(phaseDirectory, entry.name);
    const markdown = await readFile(absolutePath, "utf8");
    const parsed = parseFrontmatter(markdown);

    const frontmatter: PlanFrontmatter = parsed ?? {
      id: entry.name.replace(/\.md$/, ""),
      title: entry.name,
      dependsOn: [],
      parallelGroup: null,
    };

    plans.push({
      order,
      fileName: entry.name,
      absolutePath,
      relativePath: planRelativePath(phase, entry.name),
      frontmatter,
    });
  }

  return plans.sort((a, b) => {
    return a.order - b.order || a.fileName.localeCompare(b.fileName);
  });
}

export async function hasRootPlans(repoRoot: string): Promise<boolean> {
  const root = join(repoRoot, EXECUTION_PLANS_DIR);
  if (!existsSync(root)) {
    return false;
  }

  const entries = await readdir(root, { withFileTypes: true });
  return entries.some((entry) => {
    return entry.isFile() && parsePlanFileName(entry.name) !== null;
  });
}

/**
 * Phase folders under docs/execution-plans/, plus "." when numbered plans
 * sit directly in that directory (no phase folder).
 */
export async function listPhases(repoRoot: string): Promise<string[]> {
  const root = join(repoRoot, EXECUTION_PLANS_DIR);
  if (!existsSync(root)) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const phases = entries
    .filter((entry) => {
      return entry.isDirectory();
    })
    .map((entry) => {
      return entry.name;
    })
    .sort();

  const rootHasPlans = entries.some((entry) => {
    return entry.isFile() && parsePlanFileName(entry.name) !== null;
  });

  if (!rootHasPlans) {
    return phases;
  }

  return [ROOT_PHASE, ...phases];
}
