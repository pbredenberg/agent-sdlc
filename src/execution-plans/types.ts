export type PlanFrontmatter = {
  id: string;
  title: string;
  dependsOn: string[];
  parallelGroup: string | null;
};

export type PendingPlan = {
  order: number;
  fileName: string;
  absolutePath: string;
  relativePath: string;
  frontmatter: PlanFrontmatter;
};

export type SelectRunnableResult =
  | { ok: true; batch: PendingPlan[] }
  | {
      ok: false;
      reason:
        | "no_pending_plans"
        | "phase_missing"
        | "blocked_dependencies"
        | "cyclic_dependencies";
      details?: string;
    };

export type DispatchStatus =
  | "idle"
  | "running"
  | "advanced"
  | "blocked"
  | "drained"
  | "dry_run";

export type DispatchState = {
  phase: string;
  planRelativePaths: string[];
  status: DispatchStatus;
  agentIds: string[];
  runIds: string[];
  message: string | null;
  updatedAt: string;
};

export type AcceptanceGateResult =
  | { ok: true }
  | { ok: false; reason: string; details?: string };

export type CommitGateResult =
  | { ok: true; commitSha: string; commitMessage: string }
  | { ok: false; reason: string; details?: string };

export type DrainCliOptions = {
  /** Single phase to drain; null when allPhases is true. */
  phase: string | null;
  allPhases: boolean;
  cwd: string;
  model: string;
  maxPlans: number | null;
  maxParallel: number;
  dryRun: boolean;
  skipAcceptance: boolean;
  apiKey: string | null;
};
