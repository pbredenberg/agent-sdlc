import { buildHandoff } from "./build-handoff.js";
import { runAcceptanceWithRepair } from "./acceptance-repair.js";
import { createDispatchState, writeDispatchState } from "./dispatch-state.js";
import { ensureWorkspaceReady } from "./workspace-repair.js";
import { getHeadSha, isWorkingTreeClean, syncRepoFromRemote } from "./commit-gate.js";
import {
  countPendingByPhase,
  formatCrossPhaseBlockMessage,
  getCrossPhaseBlocks,
  getRunnablePhases,
  listPhasesForDrain,
  loadPhaseManifest,
} from "./phase-manifest.js";
import type { PhaseManifest } from "./phase-manifest.js";
import { formatPhaseLabel } from "./paths.js";
import { listDryRunBatches, selectRunnableBatch } from "./select-runnable.js";
import type { DrainCliOptions, PendingPlan } from "./types.js";

export const EXIT_OK = 0;
export const EXIT_STARTUP = 1;
export const EXIT_RUN_FAILED = 2;
export const EXIT_ACCEPTANCE = 3;

export type AgentPromptResult = {
  status: string;
  id?: string;
  agentId?: string;
  result?: string;
};

export type AgentPromptFn = (
  prompt: string,
  options: {
    apiKey: string;
    model: { id: string };
    local: { cwd: string };
  },
) => Promise<AgentPromptResult>;

export type DrainDeps = {
  agentPrompt: AgentPromptFn;
  log?: (message: string) => void;
};

type PhaseDrainOptions = DrainCliOptions & { phase: string };

type PhaseDrainResult = {
  code: number;
  completed: number;
};

export async function drainExecutionPlans(
  options: DrainCliOptions,
  deps: DrainDeps,
): Promise<number> {
  const log = deps.log ?? ((message: string) => {
    console.log(message);
  });

  if (options.allPhases) {
    const manifest = await loadPhaseManifest(options.cwd);
    if (manifest !== null) {
      return drainAllPhasesWave(options, deps, manifest, log);
    }
  }

  const phases = await resolvePhases(options);
  if (phases.length === 0) {
    log("No phases found under docs/execution-plans/");
    return EXIT_STARTUP;
  }

  if (options.allPhases) {
    log(`Draining ${phases.length} phase(s): ${phases.map(formatPhaseLabel).join(", ")}`);
  }

  let completed = 0;

  for (const phase of phases) {
    const remainingBudget = remainingMaxPlans(options.maxPlans, completed);
    if (remainingBudget === 0) {
      log(`Reached --max-plans ${options.maxPlans}; stopping.`);
      return EXIT_OK;
    }

    const phaseOptions: PhaseDrainOptions = {
      ...options,
      phase,
      maxPlans: remainingBudget,
    };

    const result = await drainOnePhase(phaseOptions, deps, log);
    completed += result.completed;

    if (result.code !== EXIT_OK) {
      return result.code;
    }
  }

  return EXIT_OK;
}

async function drainAllPhasesWave(
  options: DrainCliOptions,
  deps: DrainDeps,
  manifest: PhaseManifest,
  log: (message: string) => void,
): Promise<number> {
  log(
    `Draining ${manifest.active.length} active phase(s) from phases.yaml: ${manifest.active.map(formatPhaseLabel).join(", ")}`,
  );

  let completed = 0;

  while (true) {
    const pendingByPhase = await countPendingByPhase(options.cwd, manifest.active);
    const phasesWithPending = manifest.active.filter((phase) => {
      return (pendingByPhase[phase] ?? 0) > 0;
    });

    if (phasesWithPending.length === 0) {
      return EXIT_OK;
    }

    const runnable = getRunnablePhases(manifest, phasesWithPending, pendingByPhase);
    if (runnable.length === 0) {
      const blocks = getCrossPhaseBlocks(manifest, phasesWithPending, pendingByPhase);
      log(formatCrossPhaseBlockMessage(blocks));
      await writeDispatchState(
        options.cwd,
        createDispatchState({
          phase: phasesWithPending[0],
          planRelativePaths: [],
          status: "blocked",
          agentIds: [],
          runIds: [],
          message: "cross_phase_dependencies",
        }),
      );
      return EXIT_STARTUP;
    }

    const phase = runnable[0];
    const remainingBudget = remainingMaxPlans(options.maxPlans, completed);
    if (remainingBudget === 0) {
      log(`Reached --max-plans ${options.maxPlans}; stopping.`);
      return EXIT_OK;
    }

    const phaseOptions: PhaseDrainOptions = {
      ...options,
      phase,
      maxPlans: remainingBudget,
    };

    const result = await drainOnePhase(phaseOptions, deps, log);
    completed += result.completed;

    if (result.code !== EXIT_OK) {
      return result.code;
    }
  }
}

function remainingMaxPlans(
  maxPlans: number | null,
  completed: number,
): number | null {
  if (maxPlans === null) {
    return null;
  }
  return Math.max(0, maxPlans - completed);
}

async function resolvePhases(options: DrainCliOptions): Promise<string[]> {
  if (options.allPhases) {
    return listPhasesForDrain(options.cwd);
  }

  return [options.phase as string];
}

async function drainOnePhase(
  options: PhaseDrainOptions,
  deps: DrainDeps,
  log: (message: string) => void,
): Promise<PhaseDrainResult> {
  if (options.dryRun) {
    return await dryRunHandoffs(options, log);
  }

  if (options.apiKey === null) {
    const envVar = options.backend === "claude" ? "ANTHROPIC_API_KEY" : "CURSOR_API_KEY";
    log(`${envVar} is required unless --dry-run`);
    return { code: EXIT_STARTUP, completed: 0 };
  }

  let completed = 0;

  while (true) {
    if (options.maxPlans !== null && completed >= options.maxPlans) {
      log(`Reached --max-plans budget for this run; stopping.`);
      return { code: EXIT_OK, completed };
    }

    const next = await selectRunnableBatch({
      repoRoot: options.cwd,
      phase: options.phase,
      maxParallel: options.maxParallel,
    });

    if (!next.ok) {
      const code = await handleSelectFailure(options, next.reason, log, next.details);
      return { code, completed };
    }

    const batch = next.batch;
    const remaining = options.maxPlans !== null
      ? Math.min(batch.length, options.maxPlans - completed)
      : batch.length;
    const plansToRun = batch.slice(0, remaining);

    const baseHead = getHeadSha(options.cwd);
    if (baseHead === null && !options.skipAcceptance) {
      log("Could not read git HEAD. Use --skip-acceptance for non-git repos.");
      return { code: EXIT_STARTUP, completed };
    }

    const batchStartedClean = baseHead === null
      ? false
      : isWorkingTreeClean(options.cwd);

    if (!batchStartedClean && !options.skipAcceptance) {
      log(
        "Warning: working tree is not clean before this batch. Auto-commit fallback is disabled; the agent must commit explicitly.",
      );
    }

    log(
      `Running batch of ${plansToRun.length} plan(s): ${plansToRun.map((p) => p.relativePath).join(", ")}`,
    );

    const workspaceReady = ensureWorkspaceReady(options.cwd);
    if (!workspaceReady.ok) {
      log(`Workspace setup failed: ${workspaceReady.reason}`);
      if (workspaceReady.details) {
        log(workspaceReady.details);
      }
      return { code: EXIT_STARTUP, completed };
    }

    const runExit = await runBatch(
      options,
      plansToRun,
      baseHead ?? "",
      batchStartedClean,
      deps,
      log,
    );
    if (runExit !== EXIT_OK) {
      return { code: runExit, completed };
    }

    completed += plansToRun.length;
  }
}

async function dryRunHandoffs(
  options: PhaseDrainOptions,
  log: (message: string) => void,
): Promise<PhaseDrainResult> {
  const batches = await listDryRunBatches({
    repoRoot: options.cwd,
    phase: options.phase,
    maxParallel: options.maxParallel,
  });

  if (batches.length === 0) {
    return { code: EXIT_STARTUP, completed: 0 };
  }

  const first = batches[0];
  if (!first.ok) {
    const code = await handleSelectFailure(options, first.reason, log, first.details);
    return { code, completed: 0 };
  }

  let printed = 0;
  const limit = options.maxPlans ?? Number.POSITIVE_INFINITY;

  for (const batch of batches) {
    if (!batch.ok) {
      log(`Blocked: ${batch.reason}`);
      break;
    }

    for (const plan of batch.batch) {
      if (printed >= limit) {
        break;
      }

      const handoff = await buildHandoff({
        repoRoot: options.cwd,
        phase: options.phase,
        plan,
      });
      log(`Next plan: ${plan.relativePath}`);
      log("--- handoff ---");
      log(handoff);
      log("--- end handoff ---");
      printed += 1;
    }

    if (printed >= limit) {
      break;
    }
  }

  await writeDispatchState(
    options.cwd,
    createDispatchState({
      phase: options.phase,
      planRelativePaths: [],
      status: "dry_run",
      agentIds: [],
      runIds: [],
      message: `dry-run printed ${printed} handoff(s)`,
    }),
  );
  return { code: EXIT_OK, completed: printed };
}

async function handleSelectFailure(
  options: PhaseDrainOptions,
  reason:
    | "no_pending_plans"
    | "phase_missing"
    | "blocked_dependencies"
    | "cyclic_dependencies",
  log: (message: string) => void,
  details?: string,
): Promise<number> {
  if (reason === "no_pending_plans") {
    log(`Phase ${formatPhaseLabel(options.phase)}: no pending plans; drained.`);
    await writeDispatchState(
      options.cwd,
      createDispatchState({
        phase: options.phase,
        planRelativePaths: [],
        status: "drained",
        agentIds: [],
        runIds: [],
        message: "no pending plans",
      }),
    );
    return EXIT_OK;
  }

  if (reason === "phase_missing") {
    log(`Phase folder missing: ${formatPhaseLabel(options.phase)}`);
    return EXIT_STARTUP;
  }

  const message =
    reason === "cyclic_dependencies"
      ? "Blocked: cyclic dependencies detected in plan frontmatter"
      : "Blocked: no runnable plans; unsatisfied dependencies";

  log(message);
  if (details) {
    log(details);
  }
  await writeDispatchState(
    options.cwd,
    createDispatchState({
      phase: options.phase,
      planRelativePaths: [],
      status: "blocked",
      agentIds: [],
      runIds: [],
      message: reason,
    }),
  );
  return EXIT_STARTUP;
}

async function runBatch(
  options: PhaseDrainOptions,
  plans: PendingPlan[],
  baseHead: string,
  batchStartedClean: boolean,
  deps: DrainDeps,
  log: (message: string) => void,
): Promise<number> {
  await writeDispatchState(
    options.cwd,
    createDispatchState({
      phase: options.phase,
      planRelativePaths: plans.map((p) => p.relativePath),
      status: "running",
      agentIds: [],
      runIds: [],
      message: "batch started",
    }),
  );

  const agentResults = await Promise.all(
    plans.map(async (plan) => {
      const handoff = await buildHandoff({
        repoRoot: options.cwd,
        phase: options.phase,
        plan,
      });
      return runOneAgent(options, plan, handoff, deps, log);
    }),
  );

  const agentFailed = agentResults.find((result) => {
    return !result.ok;
  });

  if (agentFailed && !agentFailed.ok) {
    return agentFailed.exitCode;
  }

  for (const result of agentResults) {
    if (!result.ok) {
      continue;
    }

    syncRepoFromRemote(options.cwd, log);

    const acceptanceOk = await runAcceptanceWithRepair(
      {
        repoRoot: options.cwd,
        phase: options.phase,
        plan: result.plan,
        baseHead,
        batchStartedClean,
        skipAcceptance: options.skipAcceptance,
        maxAcceptanceRetries: options.maxAcceptanceRetries,
        apiKey: options.apiKey as string,
        model: options.model,
        agentId: result.agentId,
        runId: result.runId,
      },
      async (repairHandoff) => {
        const repairRun = await runOneAgent(
          options,
          result.plan,
          repairHandoff,
          deps,
          log,
        );
        if (!repairRun.ok) {
          return { ok: false };
        }
        return {
          ok: true,
          agentId: repairRun.agentId,
          runId: repairRun.runId,
        };
      },
      log,
    );

    if (!acceptanceOk) {
      return EXIT_ACCEPTANCE;
    }

    log(`Advanced past ${result.plan.relativePath}`);
  }

  await writeDispatchState(
    options.cwd,
    createDispatchState({
      phase: options.phase,
      planRelativePaths: plans.map((p) => p.relativePath),
      status: "advanced",
      agentIds: agentResults
        .filter((r): r is Extract<AgentRunResult, { ok: true }> => r.ok)
        .map((r) => r.agentId)
        .filter(Boolean) as string[],
      runIds: agentResults
        .filter((r): r is Extract<AgentRunResult, { ok: true }> => r.ok)
        .map((r) => r.runId)
        .filter(Boolean) as string[],
      message: `advanced past ${plans.map((p) => p.relativePath).join(", ")}`,
    }),
  );

  return EXIT_OK;
}

type AgentRunResult =
  | { ok: true; plan: PendingPlan; agentId: string | null; runId: string | null }
  | { ok: false; exitCode: number };

async function runOneAgent(
  options: PhaseDrainOptions,
  plan: PendingPlan,
  handoff: string,
  deps: DrainDeps,
  log: (message: string) => void,
): Promise<AgentRunResult> {
  log(`Next plan: ${plan.relativePath}`);

  let result: AgentPromptResult;
  try {
    result = await deps.agentPrompt(handoff, {
      apiKey: options.apiKey as string,
      model: { id: options.model },
      local: { cwd: options.cwd },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Agent startup failed for ${plan.relativePath}: ${message}`);
    await writeDispatchState(
      options.cwd,
      createDispatchState({
        phase: options.phase,
        planRelativePaths: [plan.relativePath],
        status: "blocked",
        agentIds: [],
        runIds: [],
        message: `startup: ${message}`,
      }),
    );
    return { ok: false, exitCode: EXIT_STARTUP };
  }

  const agentId = result.agentId ?? null;
  const runId = result.id ?? null;
  log(`agentId=${agentId ?? "unknown"} runId=${runId ?? "unknown"} status=${result.status}`);

  if (result.status !== "finished") {
    await writeDispatchState(
      options.cwd,
      createDispatchState({
        phase: options.phase,
        planRelativePaths: [plan.relativePath],
        status: "blocked",
        agentIds: agentId ? [agentId] : [],
        runIds: runId ? [runId] : [],
        message: `run status: ${result.status}`,
      }),
    );
    return { ok: false, exitCode: EXIT_RUN_FAILED };
  }

  return { ok: true, plan, agentId, runId };
}
