import type { PendingPlan } from "./types.js";

export type DependencyGraphResult =
  | { ok: true }
  | { ok: false; reason: "cyclic_dependencies" | "unknown_dependency"; details: string };

export function validateDependencyGraph(plans: PendingPlan[]): DependencyGraphResult {
  const ids = new Set(plans.map((plan) => {
    return plan.frontmatter.id;
  }));

  for (const plan of plans) {
    for (const dep of plan.frontmatter.dependsOn) {
      if (!ids.has(dep)) {
        return {
          ok: false,
          reason: "unknown_dependency",
          details: `Plan ${plan.frontmatter.id} depends on unknown id: ${dep}`,
        };
      }
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): boolean {
    if (visited.has(id)) {
      return true;
    }
    if (visiting.has(id)) {
      return false;
    }

    visiting.add(id);
    const plan = plans.find((p) => {
      return p.frontmatter.id === id;
    });

    if (plan) {
      for (const dep of plan.frontmatter.dependsOn) {
        if (!visit(dep)) {
          return false;
        }
      }
    }

    visiting.delete(id);
    visited.add(id);
    return true;
  }

  for (const plan of plans) {
    if (!visit(plan.frontmatter.id)) {
      return {
        ok: false,
        reason: "cyclic_dependencies",
        details: `Cycle detected involving plan: ${plan.frontmatter.id}`,
      };
    }
  }

  return { ok: true };
}

export function topologicalSort(plans: PendingPlan[]): PendingPlan[] {
  const sorted: PendingPlan[] = [];
  const visited = new Set<string>();

  function visit(plan: PendingPlan): void {
    if (visited.has(plan.frontmatter.id)) {
      return;
    }

    for (const depId of plan.frontmatter.dependsOn) {
      const depPlan = plans.find((p) => {
        return p.frontmatter.id === depId;
      });
      if (depPlan) {
        visit(depPlan);
      }
    }

    visited.add(plan.frontmatter.id);
    sorted.push(plan);
  }

  const ordered = [...plans].sort((a, b) => {
    return a.order - b.order;
  });

  for (const plan of ordered) {
    visit(plan);
  }

  return sorted;
}

export function getCompletedIds(
  allPlanIds: string[],
  pendingPlans: PendingPlan[],
): Set<string> {
  const pendingIds = new Set(pendingPlans.map((plan) => {
    return plan.frontmatter.id;
  }));

  const completed = new Set<string>();
  for (const id of allPlanIds) {
    if (!pendingIds.has(id)) {
      completed.add(id);
    }
  }

  return completed;
}

export function collectAllPlanIds(plans: PendingPlan[]): string[] {
  return plans.map((plan) => {
    return plan.frontmatter.id;
  });
}
