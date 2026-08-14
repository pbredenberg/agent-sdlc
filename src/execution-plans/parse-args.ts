import { resolve } from "node:path";
import type { DrainCliOptions } from "./types.js";
import { ROOT_PHASE } from "./paths.js";

export const DEFAULT_MODEL = "composer-2.5";

export function printDrainUsage(): void {
  console.error(`Usage: agent-sdlc-drain --phase <name> [options]
       agent-sdlc-drain --all-phases [options]
       npm run execution-plans:drain -- --phase <name> [options]

Drain numbered execution plans under docs/execution-plans/ with one
fresh Cursor SDK Agent per plan. Supports parallel batches when dependencies allow.

Required (one of):
  --phase <name>     Phase folder name (e.g. example-phase).
                     Use "." for plans directly under docs/execution-plans/
                     (no phase folder).
  --all-phases       Drain every phase folder (and root plans if present),
                     in sort order. Completes one phase before the next.

Options:
  --cwd <path>       Target repo root (default: process.cwd())
  --model <id>       Model id (default: ${DEFAULT_MODEL})
  --max-plans <n>    Stop after N successful plans (across phases when --all-phases)
  --max-parallel <n> Max concurrent agents per batch (default: 1)
  --dry-run          Print handoff(s) only; no SDK calls
  --skip-acceptance  Skip npm test/typecheck/lint and commit gate

Acceptance gates auto-repair common environment failures (missing deps,
stale Next.js .next/types) once before failing a plan.
  --help             Show this help

Environment:
  CURSOR_API_KEY     Required unless --dry-run

Exit codes:
  0  phase(s) drained (or --max-plans reached with all successes)
  1  startup / CursorAgentError (auth, config, gate)
  2  agent run failed
  3  acceptance gate failed
`);
}

export function parseDrainArgs(argv: string[]): DrainCliOptions {
  let phase: string | null = null;
  let allPhases = false;
  let cwd = process.cwd();
  let model = DEFAULT_MODEL;
  let maxPlans: number | null = null;
  let maxParallel = 1;
  let dryRun = false;
  let skipAcceptance = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printDrainUsage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--skip-acceptance") {
      skipAcceptance = true;
      continue;
    }
    if (arg === "--all-phases") {
      allPhases = true;
      continue;
    }
    if (arg === "--phase") {
      phase = requireValue(arg, argv[++i]);
      continue;
    }
    if (arg === "--cwd") {
      cwd = resolve(requireValue(arg, argv[++i]));
      continue;
    }
    if (arg === "--model") {
      model = requireValue(arg, argv[++i]);
      continue;
    }
    if (arg === "--max-plans") {
      const raw = requireValue(arg, argv[++i]);
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`--max-plans must be a positive integer, got: ${raw}`);
      }
      maxPlans = parsed;
      continue;
    }
    if (arg === "--max-parallel") {
      const raw = requireValue(arg, argv[++i]);
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`--max-parallel must be a positive integer, got: ${raw}`);
      }
      maxParallel = parsed;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return finalizeDrainArgs({
    phase,
    allPhases,
    cwd,
    model,
    maxPlans,
    maxParallel,
    dryRun,
    skipAcceptance,
  });
}

export function finalizeDrainArgs(input: {
  phase: string | null;
  allPhases: boolean;
  cwd: string;
  model: string;
  maxPlans: number | null;
  maxParallel: number;
  dryRun: boolean;
  skipAcceptance: boolean;
}): DrainCliOptions {
  const trimmedPhase = input.phase?.trim() ?? null;

  if (input.allPhases && trimmedPhase !== null) {
    throw new Error("Use either --phase or --all-phases, not both");
  }

  if (!input.allPhases && (trimmedPhase === null || trimmedPhase === "")) {
    throw new Error("Provide --phase <name> or --all-phases");
  }

  if (trimmedPhase !== null && trimmedPhase !== ROOT_PHASE && trimmedPhase.includes("/")) {
    throw new Error(`Invalid --phase "${trimmedPhase}": use a single folder name or "."`);
  }

  return {
    phase: input.allPhases ? null : (trimmedPhase as string),
    allPhases: input.allPhases,
    cwd: input.cwd,
    model: input.model,
    maxPlans: input.maxPlans,
    maxParallel: input.maxParallel,
    dryRun: input.dryRun,
    skipAcceptance: input.skipAcceptance,
    apiKey: process.env.CURSOR_API_KEY?.trim() || null,
  };
}

function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
