import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { installModeHelpLines, resolveInstallMode } from "./mode-aliases.js";
import type { InstallMode, InstallOptions } from "./types.js";

export type ParsedInstallArgs = InstallOptions & {
  sourceUrl: string | null;
  help: boolean;
};

export function defaultSourceRoot(): string {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

export function printInstallUsage(): void {
  const modeLines = installModeHelpLines();
  console.error(`Usage: agent-sdlc-install [mode] [target] [options]
       npm run install:plugin -- [mode] [target] [options]
       npm run setup | install:dev | install:cloud | vendor -- <target>

Install agent-sdlc for Desktop, Cloud Agents, or application repositories.

${modeLines.join("\n")}

Options:
  --mode <mode>    Same as the first positional argument
  --source <path>  agent-sdlc checkout (default: this repository)
  --target <path>  Target repo root (default: --source; required for vendor-*)
  --source-url <url>
                   Clone upstream for vendor-* when --source is omitted
                   (default: https://github.com/pbredenberg/agent-sdlc.git)
  --dry-run        Print actions without writing files
  --help           Show this help

Examples:
  npm run setup
  agent-sdlc-install dev
  npm run install:cloud
  agent-sdlc-install vendor /path/to/app
  agent-sdlc-install vendor . --source-url https://github.com/pbredenberg/agent-sdlc.git
  npm run install:global-cli
`);
}

type SplitArgv = {
  flagTokens: string[];
  positionals: string[];
};

export function parseInstallArgs(argv: string[]): ParsedInstallArgs {
  const split = splitArgv(argv);
  let mode: InstallMode | null = null;
  let sourceRoot = defaultSourceRoot();
  let targetRoot = sourceRoot;
  let sourceUrl: string | null = null;
  let dryRun = false;
  let help = false;

  for (let i = 0; i < split.flagTokens.length; i++) {
    const arg = split.flagTokens[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--mode") {
      mode = resolveInstallMode(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--source") {
      sourceRoot = resolve(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--target") {
      targetRoot = resolve(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--source-url") {
      sourceUrl = requireValue(arg, split.flagTokens[++i]);
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (split.positionals[0]) {
    mode = resolveInstallMode(split.positionals[0]);
  }

  if (split.positionals[1]) {
    targetRoot = resolve(split.positionals[1]);
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

  const resolvedMode = mode ?? "dev";
  validateModeTargets(resolvedMode, sourceRoot, targetRoot);

  return {
    mode: resolvedMode,
    sourceRoot,
    targetRoot,
    sourceUrl,
    dryRun,
    help: false,
  };
}

function splitArgv(argv: string[]): SplitArgv {
  const flagTokens: string[] = [];
  const positionals: string[] = [];
  const valueFlags = new Set([
    "--mode",
    "--source",
    "--target",
    "--source-url",
  ]);

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const isFlag = arg.startsWith("-");

    if (!isFlag) {
      positionals.push(arg);
      continue;
    }

    flagTokens.push(arg);

    if (!valueFlags.has(arg)) {
      continue;
    }

    const next = argv[i + 1];
    const hasValue = Boolean(next) && !next.startsWith("-");
    if (!hasValue) {
      continue;
    }

    flagTokens.push(next);
    i++;
  }

  return { flagTokens, positionals };
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
    throw new Error(`${mode} requires a target path (second argument or --target)`);
  }
}

function requireValue(flag: string, value: string | undefined): string {
  if (value) {
    return value;
  }

  throw new Error(`${flag} requires a value`);
}
