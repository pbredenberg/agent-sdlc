import { resolve } from "node:path";
import type { DrainCliOptions } from "./types.js";

export const DEFAULT_MODEL = "composer-2.5";

export function printDrainUsage(): void {
  console.error(`Usage: npm run execution-plans:drain -- --phase <name> [options]

Drain numbered execution plans under docs/execution-plans/<phase>/ with one
fresh Cursor SDK Agent per plan. Supports parallel batches when dependencies allow.

Required:
  --phase <name>     Phase folder name (e.g. example-phase)

Options:
  --cwd <path>       Target repo root (default: process.cwd())
  --model <id>       Model id (default: ${DEFAULT_MODEL})
  --max-plans <n>    Stop after N successful plans
  --max-parallel <n> Max concurrent agents per batch (default: 1)
  --dry-run          Print handoff(s) only; no SDK calls
  --skip-acceptance  Skip npm test/typecheck/lint and commit gate
  --help             Show this help

Environment:
  CURSOR_API_KEY     Required unless --dry-run

Exit codes:
  0  phase drained (or --max-plans reached with all successes)
  1  startup / CursorAgentError (auth, config, gate)
  2  agent run failed
  3  acceptance gate failed
`);
}

export function parseDrainArgs(argv: string[]): DrainCliOptions {
  let phase: string | null = null;
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

  if (phase === null || phase.trim() === "") {
    throw new Error("--phase is required");
  }

  return {
    phase: phase.trim(),
    cwd,
    model,
    maxPlans,
    maxParallel,
    dryRun,
    skipAcceptance,
    apiKey: process.env.CURSOR_API_KEY?.trim() || null,
  };
}

function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
