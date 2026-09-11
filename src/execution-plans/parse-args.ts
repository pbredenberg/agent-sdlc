import { resolve } from "node:path";
import type { DrainBackend, DrainCliOptions } from "./types.js";
import { ROOT_PHASE } from "./paths.js";
import { requireValue } from "../shared/argv-utils.js";

export const DEFAULT_MODEL = "composer-2.5";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";
export const DEFAULT_BACKEND: DrainBackend = "cursor";

function defaultModelForBackend(backend: DrainBackend): string {
  return backend === "claude" ? DEFAULT_CLAUDE_MODEL : DEFAULT_MODEL;
}

export function printDrainUsage(): void {
  console.error(`Usage: agent-sdlc-drain --phase <name> [options]
       agent-sdlc-drain --all-phases [options]
       npm run execution-plans:drain -- --phase <name> [options]

Drain numbered execution plans under docs/execution-plans/ with one
fresh agent per plan (Cursor Cloud Agent or Claude Agent SDK, see --backend).
Supports parallel batches when dependencies allow.

Required (one of):
  --phase <name>     Phase folder name (e.g. example-phase).
                     Use "." for plans directly under docs/execution-plans/
                     (no phase folder).
  --all-phases       Drain every phase folder (and root plans if present),
                     in sort order. Completes one phase before the next.

Options:
  --cwd <path>       Target repo root (default: process.cwd())
  --backend <name>   cursor | claude (default: cursor)
  --model <id>       Model id (default: ${DEFAULT_MODEL} for cursor,
                     ${DEFAULT_CLAUDE_MODEL} for claude)
  --max-plans <n>    Stop after N successful plans (across phases when --all-phases)
  --max-parallel <n> Max concurrent agents per batch (default: 1)
  --max-acceptance-retries <n>
                     Repair agents to dispatch when test/typecheck/lint or
                     commit/plan acceptance checks fail after a plan agent
                     finishes (default: 2; use 0 to disable)
  --dry-run          Print handoff(s) only; no SDK calls
  --skip-acceptance  Skip npm test/typecheck/lint and commit gate

Acceptance gates auto-repair common environment failures (missing deps,
stale Next.js .next/types) once, then dispatch repair agents for script or
commit/plan failures up to --max-acceptance-retries before exiting.
  --help             Show this help

Environment:
  CURSOR_API_KEY     Required for --backend cursor, unless --dry-run
  ANTHROPIC_API_KEY  Required for --backend claude, unless --dry-run

Exit codes:
  0  phase(s) drained (or --max-plans reached with all successes)
  1  startup / agent SDK error (auth, config, gate)
  2  agent run failed
  3  acceptance gate failed
`);
}

export function parseDrainArgs(argv: string[]): DrainCliOptions {
  let phase: string | null = null;
  let allPhases = false;
  let cwd = process.cwd();
  let backend: DrainBackend = DEFAULT_BACKEND;
  let model: string | null = null;
  let maxPlans: number | null = null;
  let maxParallel = 1;
  let maxAcceptanceRetries = 2;
  let dryRun = false;
  let skipAcceptance = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return {
        phase: null,
        allPhases: false,
        cwd,
        backend: DEFAULT_BACKEND,
        model: defaultModelForBackend(DEFAULT_BACKEND),
        maxPlans: null,
        maxParallel: 1,
        maxAcceptanceRetries: 2,
        dryRun: false,
        skipAcceptance: false,
        apiKey: null,
        help: true,
      };
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
    if (arg === "--backend") {
      const raw = requireValue(arg, argv[++i]);
      if (raw !== "cursor" && raw !== "claude") {
        throw new Error(`--backend must be "cursor" or "claude", got: ${raw}`);
      }
      backend = raw;
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
    if (arg === "--max-acceptance-retries") {
      const raw = requireValue(arg, argv[++i]);
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`--max-acceptance-retries must be a non-negative integer, got: ${raw}`);
      }
      maxAcceptanceRetries = parsed;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return finalizeDrainArgs({
    phase,
    allPhases,
    cwd,
    backend,
    model,
    maxPlans,
    maxParallel,
    maxAcceptanceRetries,
    dryRun,
    skipAcceptance,
  });
}

export function finalizeDrainArgs(input: {
  phase: string | null;
  allPhases: boolean;
  cwd: string;
  backend: DrainBackend;
  /** Explicit --model value, or null to use the backend's default. */
  model: string | null;
  maxPlans: number | null;
  maxParallel: number;
  maxAcceptanceRetries: number;
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

  const apiKeyEnvVar = input.backend === "claude" ? "ANTHROPIC_API_KEY" : "CURSOR_API_KEY";

  return {
    phase: input.allPhases ? null : (trimmedPhase as string),
    allPhases: input.allPhases,
    cwd: input.cwd,
    backend: input.backend,
    model: input.model ?? defaultModelForBackend(input.backend),
    maxPlans: input.maxPlans,
    maxParallel: input.maxParallel,
    maxAcceptanceRetries: input.maxAcceptanceRetries,
    dryRun: input.dryRun,
    skipAcceptance: input.skipAcceptance,
    apiKey: process.env[apiKeyEnvVar]?.trim() || null,
    help: false,
  };
}
