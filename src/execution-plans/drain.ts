import { buildHandoff } from "./build-handoff.js";
import { createDispatchState, writeDispatchState } from "./dispatch-state.js";
import { runAcceptanceGate } from "./acceptance-gate.js";
import { getHeadSha } from "./commit-gate.js";
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

export async function drainExecutionPlans(
  options: DrainCliOptions,
  deps: DrainDeps,
): Promise<number> {
  const log = deps.log ?? ((message: string) => {
    console.log(message);
  });

  if (options.dryRun) {
    return await dryRunHandoffs(options, log);
  }

  if (options.apiKey === null) {
    log("CURSOR_API_KEY is required unless --dry-run");
    return EXIT_STARTUP;
  }

  let completed = 0;

  while (true) {
    if (options.maxPlans !== null && completed >= options.maxPlans) {
      log(`Reached --max-plans ${options.maxPlans}; stopping.`);
      return EXIT_OK;
    }

    const next = await selectRunnableBatch({
      repoRoot: options.cwd,
      phase: options.phase,
      maxParallel: options.maxParallel,
    });

    if (!next.ok) {
      return await handleSelectFailure(options, next.reason, log);
    }

    const batch = next.batch;
    const remaining = options.maxPlans !== null
      ? Math.min(batch.length, options.maxPlans - completed)
      : batch.length;
    const plansToRun = batch.slice(0, remaining);

    const baseHead = getHeadSha(options.cwd);
    if (baseHead === null && !options.skipAcceptance) {
      log("Could not read git HEAD. Use --skip-acceptance for non-git repos.");
      return EXIT_STARTUP;
    }

    log(`Running batch of ${plansToRun.length} plan(s): ${plansToRun.map((p) => p.relativePath).join(", ")}`);

    const runExit = await runBatch(options, plansToRun, baseHead ?? "", deps, log);
    if (runExit !== EXIT_OK) {
      return runExit;
    }

    completed += plansToRun.length;
  }
}

async function dryRunHandoffs(
  options: DrainCliOptions,
  log: (message: string) => void,
): Promise<number> {
  const batches = await listDryRunBatches({
    repoRoot: options.cwd,
    phase: options.phase,
    maxParallel: options.maxParallel,
  });

  if (batches.length === 0) {
    return EXIT_STARTUP;
  }

  const first = batches[0];
  if (!first.ok) {
    return await handleSelectFailure(options, first.reason, log);
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
  return EXIT_OK;
}

async function handleSelectFailure(
  options: DrainCliOptions,
  reason:
    | "no_pending_plans"
    | "phase_missing"
    | "blocked_dependencies"
    | "cyclic_dependencies",
  log: (message: string) => void,
): Promise<number> {
  if (reason === "no_pending_plans") {
    log(`Phase ${options.phase}: no pending plans; drained.`);
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
    log(`Phase folder missing: docs/execution-plans/${options.phase}`);
    return EXIT_STARTUP;
  }

  const message =
    reason === "cyclic_dependencies"
      ? "Blocked: cyclic dependencies detected in plan frontmatter"
      : "Blocked: no runnable plans; unsatisfied dependencies";

  log(message);
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
  options: DrainCliOptions,
  plans: PendingPlan[],
  baseHead: string,
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
    const acceptance = runAcceptanceGate({
      repoRoot: options.cwd,
      phase: options.phase,
      plan: result.plan,
      baseHead,
      skipScripts: options.skipAcceptance,
      skipCommit: options.skipAcceptance,
    });

    if (!acceptance.ok) {
      log(`Acceptance failed for ${result.plan.relativePath}: ${acceptance.reason}`);
      if (acceptance.details) {
        log(acceptance.details);
      }
      await writeDispatchState(
        options.cwd,
        createDispatchState({
          phase: options.phase,
          planRelativePaths: [result.plan.relativePath],
          status: "blocked",
          agentIds: result.agentId ? [result.agentId] : [],
          runIds: result.runId ? [result.runId] : [],
          message: acceptance.reason,
        }),
      );
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
      agentIds: agentResults.map((r) => r.agentId).filter(Boolean) as string[],
      runIds: agentResults.map((r) => r.runId).filter(Boolean) as string[],
      message: `advanced past ${plans.map((p) => p.relativePath).join(", ")}`,
    }),
  );

  return EXIT_OK;
}

type AgentRunResult =
  | { ok: true; plan: PendingPlan; agentId: string | null; runId: string | null }
  | { ok: false; exitCode: number };

async function runOneAgent(
  options: DrainCliOptions,
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
