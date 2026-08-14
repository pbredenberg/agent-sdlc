import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { InstallMode, InstallOptions } from "./types.js";

export type ParsedInstallArgs = InstallOptions & {
  sourceUrl: string | null;
  help: boolean;
};

export function defaultSourceRoot(): string {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

export function printInstallUsage(): void {
  console.error(`Usage: agent-sdlc-install --mode <mode> [options]
       npm run install:plugin -- --mode <mode> [options]

Install agent-sdlc for Desktop, Cloud Agents, or application repositories.

Modes:
  dev              Copy skills/commands into this repo + Desktop local plugin link
  cloud            Copy skills/commands only (Cloud Agents / environment builds)
  desktop          Link ~/.cursor/plugins/local/agent-sdlc only
  vendor-full      Copy full skills + commands into --target repo
  vendor-minimal   Copy only /sdlc skill + command into --target repo
  global-cli       npm install + npm link in the agent-sdlc checkout (drain CLI)

Options:
  --source <path>  agent-sdlc checkout (default: this repository)
  --target <path>  Target repo root (default: --source; required for vendor-*)
  --source-url <url>
                   Clone upstream for vendor-* when --source is omitted
                   (default: https://github.com/pbredenberg/agent-sdlc.git)
  --dry-run        Print actions without writing files
  --help           Show this help

Examples:
  npm run install:plugin -- --mode dev
  npm run install:plugin -- --mode cloud
  npm run install:plugin -- --mode vendor-full --target /path/to/app
  npm run install:plugin -- --mode vendor-minimal --target /path/to/app
  npm run install:plugin -- --mode global-cli
`);
}

export function parseInstallArgs(argv: string[]): ParsedInstallArgs {
  let mode: InstallMode | null = null;
  let sourceRoot = defaultSourceRoot();
  let targetRoot = sourceRoot;
  let sourceUrl: string | null = null;
  let dryRun = false;
  let help = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--mode") {
      mode = parseMode(requireValue(arg, argv[++i]));
      continue;
    }

    if (arg === "--source") {
      sourceRoot = resolve(requireValue(arg, argv[++i]));
      continue;
    }

    if (arg === "--target") {
      targetRoot = resolve(requireValue(arg, argv[++i]));
      continue;
    }

    if (arg === "--source-url") {
      sourceUrl = requireValue(arg, argv[++i]);
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (help) {
    return {
      mode: "dev",
      sourceRoot,
      targetRoot,
      sourceUrl,
      dryRun,
      help: true,
    };
  }

  if (!mode) {
    throw new Error("missing required --mode <mode>");
  }

  validateModeTargets(mode, sourceRoot, targetRoot);

  return {
    mode,
    sourceRoot,
    targetRoot,
    sourceUrl,
    dryRun,
    help: false,
  };
}

function parseMode(value: string): InstallMode {
  const modes: InstallMode[] = [
    "dev",
    "cloud",
    "desktop",
    "vendor-full",
    "vendor-minimal",
    "global-cli",
  ];

  if (modes.includes(value as InstallMode)) {
    return value as InstallMode;
  }

  throw new Error(`invalid --mode ${value}`);
}

function validateModeTargets(
  mode: InstallMode,
  sourceRoot: string,
  targetRoot: string,
): void {
  const vendorModes: InstallMode[] = ["vendor-full", "vendor-minimal"];
  const needsDistinctTarget = vendorModes.includes(mode);
  const sameTarget = sourceRoot === targetRoot;

  if (needsDistinctTarget && sameTarget) {
    throw new Error(`${mode} requires --target <app-repo-root>`);
  }
}

function requireValue(flag: string, value: string | undefined): string {
  if (value) {
    return value;
  }

  throw new Error(`${flag} requires a value`);
}
