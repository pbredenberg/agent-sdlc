import { buildAcceptanceRepairHandoff } from "./build-acceptance-repair-handoff.js";
import {
  classifyAcceptanceFailure,
  isRepairableAcceptanceFailure,
  shouldSkipCommitOnRetry,
} from "./classify-acceptance-failure.js";
import { runAcceptanceGate } from "./acceptance-gate.js";
import { syncRepoFromRemote } from "./commit-gate.js";
import { createDispatchState, writeDispatchState } from "./dispatch-state.js";
import type { AcceptanceGateResult, PendingPlan } from "./types.js";

export type AcceptanceRepairInput = {
  repoRoot: string;
  phase: string;
  plan: PendingPlan;
  baseHead: string;
  batchStartedClean: boolean;
  skipAcceptance: boolean;
  maxAcceptanceRetries: number;
  apiKey: string;
  model: string;
  agentId: string | null;
  runId: string | null;
};

export type AgentRunOutcome =
  | { ok: true; agentId: string | null; runId: string | null }
  | { ok: false };

export type RunAgentFn = (
  prompt: string,
) => Promise<AgentRunOutcome>;

export async function runAcceptanceWithRepair(
  input: AcceptanceRepairInput,
  runAgent: RunAgentFn,
  log: (message: string) => void,
): Promise<boolean> {
  let acceptance = runInitialAcceptance(input, log);

  if (acceptance.ok) {
    return true;
  }

  let repairAttempts = 0;

  while (
    !acceptance.ok
    && isRepairableAcceptanceFailure(acceptance)
    && repairAttempts < input.maxAcceptanceRetries
  ) {
    repairAttempts += 1;
    logAcceptanceFailure(input.plan, acceptance, log);
    log(
      `Dispatching acceptance repair agent (${repairAttempts}/${input.maxAcceptanceRetries})...`,
    );

    const repairHandoff = buildAcceptanceRepairHandoff({
      phase: input.phase,
      plan: input.plan,
      reason: acceptance.reason,
      details: acceptance.details,
      attempt: repairAttempts,
      maxAttempts: input.maxAcceptanceRetries,
    });

    const repairResult = await runAgent(repairHandoff);
    if (!repairResult.ok) {
      return false;
    }

    syncRepoFromRemote(input.repoRoot, log);
    const failureKind = classifyAcceptanceFailure(acceptance);
    acceptance = runRetryAcceptance(input, failureKind, log);
  }

  if (acceptance.ok) {
    if (repairAttempts > 0) {
      log(
        `Acceptance repair succeeded for ${input.plan.relativePath} after ${repairAttempts} attempt(s).`,
      );
    }
    return true;
  }

  await blockOnAcceptanceFailure(input, acceptance, log);
  return false;
}

function runInitialAcceptance(
  input: AcceptanceRepairInput,
  log: (message: string) => void,
): AcceptanceGateResult {
  return runAcceptanceGate({
    repoRoot: input.repoRoot,
    phase: input.phase,
    plan: input.plan,
    baseHead: input.baseHead,
    batchStartedClean: input.batchStartedClean,
    skipScripts: input.skipAcceptance,
    skipCommit: input.skipAcceptance,
    log,
  });
}

function runRetryAcceptance(
  input: AcceptanceRepairInput,
  failureKind: ReturnType<typeof classifyAcceptanceFailure>,
  log: (message: string) => void,
): AcceptanceGateResult {
  return runAcceptanceGate({
    repoRoot: input.repoRoot,
    phase: input.phase,
    plan: input.plan,
    baseHead: input.baseHead,
    batchStartedClean: input.batchStartedClean,
    skipScripts: input.skipAcceptance,
    skipCommit: shouldSkipCommitOnRetry(failureKind),
    log,
  });
}

function logAcceptanceFailure(
  plan: PendingPlan,
  acceptance: Extract<AcceptanceGateResult, { ok: false }>,
  log: (message: string) => void,
): void {
  log(`Acceptance failed for ${plan.relativePath}: ${acceptance.reason}`);
  if (acceptance.details) {
    log(acceptance.details);
  }
}

async function blockOnAcceptanceFailure(
  input: AcceptanceRepairInput,
  acceptance: Extract<AcceptanceGateResult, { ok: false }>,
  log: (message: string) => void,
): Promise<void> {
  logAcceptanceFailure(input.plan, acceptance, log);
  await writeDispatchState(
    input.repoRoot,
    createDispatchState({
      phase: input.phase,
      planRelativePaths: [input.plan.relativePath],
      status: "blocked",
      agentIds: input.agentId ? [input.agentId] : [],
      runIds: input.runId ? [input.runId] : [],
      message: acceptance.reason,
    }),
  );
}
