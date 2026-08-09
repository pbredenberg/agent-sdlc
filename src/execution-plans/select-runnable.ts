import { existsSync } from "node:fs";
import { listPendingPlans } from "./list-plans.js";
import { validateDependencyGraph } from "./dependency-graph.js";
import { phaseDir } from "./paths.js";
import type { PendingPlan, SelectRunnableResult } from "./types.js";

export type SelectRunnableInput = {
  repoRoot: string;
  phase: string;
  maxParallel: number;
};

function isRunnable(plan: PendingPlan, completedIds: Set<string>): boolean {
  return plan.frontmatter.dependsOn.every((dep) => {
    return completedIds.has(dep);
  });
}

function sortByOrder(plans: PendingPlan[]): PendingPlan[] {
  return [...plans].sort((a, b) => {
    return a.order - b.order || a.fileName.localeCompare(b.fileName);
  });
}

function selectParallelBatch(
  runnable: PendingPlan[],
  maxParallel: number,
): PendingPlan[] {
  if (runnable.length === 0) {
    return [];
  }

  const sorted = sortByOrder(runnable);
  const first = sorted[0];
  const group = first.frontmatter.parallelGroup;

  if (group === null) {
    return [first];
  }

  const sameGroup = sorted.filter((plan) => {
    return plan.frontmatter.parallelGroup === group;
  });

  const sameDeps = sameGroup.filter((plan) => {
    const depsA = first.frontmatter.dependsOn.join(",");
    const depsB = plan.frontmatter.dependsOn.join(",");
    return depsA === depsB;
  });

  return sameDeps.slice(0, maxParallel);
}

export async function selectRunnableBatch(
  input: SelectRunnableInput,
): Promise<SelectRunnableResult> {
  const directory = phaseDir(input.repoRoot, input.phase);

  if (!existsSync(directory)) {
    return { ok: false, reason: "phase_missing" };
  }

  const pending = await listPendingPlans(input.repoRoot, input.phase, directory);

  if (pending.length === 0) {
    return { ok: false, reason: "no_pending_plans" };
  }

  const validation = validateDependencyGraph(pending);
  if (!validation.ok) {
    if (validation.reason === "cyclic_dependencies") {
      return { ok: false, reason: "cyclic_dependencies" };
    }
    return { ok: false, reason: "blocked_dependencies" };
  }

  const allIds = new Set(pending.map((plan) => {
    return plan.frontmatter.id;
  }));

  const completedIds = new Set<string>();
  for (const plan of pending) {
    for (const dep of plan.frontmatter.dependsOn) {
      if (!allIds.has(dep)) {
        completedIds.add(dep);
      }
    }
  }

  const runnable = pending.filter((plan) => {
    return isRunnable(plan, completedIds);
  });

  if (runnable.length === 0) {
    return { ok: false, reason: "blocked_dependencies" };
  }

  const batch = selectParallelBatch(runnable, input.maxParallel);
  return { ok: true, batch };
}

export async function listDryRunBatches(
  input: SelectRunnableInput,
): Promise<SelectRunnableResult[]> {
  const directory = phaseDir(input.repoRoot, input.phase);
  const results: SelectRunnableResult[] = [];
  const simulatedCompleted = new Set<string>();

  if (!existsSync(directory)) {
    return [{ ok: false, reason: "phase_missing" }];
  }

  let pending = await listPendingPlans(input.repoRoot, input.phase, directory);

  if (pending.length === 0) {
    return [{ ok: false, reason: "no_pending_plans" }];
  }

  const validation = validateDependencyGraph(pending);
  if (!validation.ok) {
    if (validation.reason === "cyclic_dependencies") {
      return [{ ok: false, reason: "cyclic_dependencies" }];
    }
    return [{ ok: false, reason: "blocked_dependencies" }];
  }

  while (pending.length > 0) {
    const allIds = new Set(pending.map((plan) => {
      return plan.frontmatter.id;
    }));

    const completedIds = new Set(simulatedCompleted);
    for (const plan of pending) {
      for (const dep of plan.frontmatter.dependsOn) {
        if (!allIds.has(dep)) {
          completedIds.add(dep);
        }
      }
    }

    const runnable = pending.filter((plan) => {
      return isRunnable(plan, completedIds);
    });

    if (runnable.length === 0) {
      results.push({ ok: false, reason: "blocked_dependencies" });
      break;
    }

    const batch = selectParallelBatch(runnable, input.maxParallel);
    results.push({ ok: true, batch });

    for (const plan of batch) {
      simulatedCompleted.add(plan.frontmatter.id);
    }

    const batchIds = new Set(batch.map((plan) => {
      return plan.frontmatter.id;
    }));
    pending = pending.filter((plan) => {
      return !batchIds.has(plan.frontmatter.id);
    });
  }

  return results;
}
